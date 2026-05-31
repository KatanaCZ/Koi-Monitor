import { METRIC_SUSTAIN_MS } from './thresholdAlerts';

export type ZenLoadState = 'rest' | 'moderate' | 'intense';

export const ZEN_SMOOTH_SAMPLE_COUNT = 5;
export const ZEN_SAMPLE_RING_MAX = 8;
/** Fast-path Boost : charge instantanée très haute, sustain long — après warmup. */
export const ZEN_FAST_INTENSE_RAW = 88;
export const ZEN_FAST_INTENSE_MS = 3_000;
/** Montée d'état (Zen→Flow, Flow→Boost) : plus prudent que la descente. */
export const ZEN_SUSTAIN_ENTER_MS = 5_000;
/** Descente (Boost→Flow, Flow→Zen) : METRIC_SUSTAIN_MS (3 s). */

export const ZEN_LOAD_THRESHOLDS = {
  flowEnter: 26,
  zenExit: 13,
  boostEnter: 76,
  flowExit: 58,
} as const;

/** Écart brut vs médiane récente au-delà duquel on ignore un pic isolé. */
const SPIKE_DELTA = 28;

const STATE_RANK: Record<ZenLoadState, number> = {
  rest: 0,
  moderate: 1,
  intense: 2,
};

export interface ZenLoadTracker {
  samples: number[];
  displayed: ZenLoadState;
  candidate: ZenLoadState | null;
  candidateSince: number | null;
  fastIntenseSince: number | null;
}

export interface ZenLoadStateStyle {
  color: string;
  textColor: string;
  badgeBg: string;
  badgeBorder: string;
  iconClass: string;
}

export interface ZenLoadStatePresentation {
  labelFr: string;
  labelAria: string;
  quote: string;
  breathDuration: number;
}

/** max(CPU, GPU) clampé 0–100 — sysinfo peut renvoyer des valeurs négatives au 1er tick. */
export function computeActiveLoad(cpu: number, gpu: number): number {
  const load = Math.max(cpu, gpu);
  if (!Number.isFinite(load)) return 0;
  return Math.min(100, Math.max(0, load));
}

export function createZenLoadTracker(): ZenLoadTracker {
  return {
    samples: [],
    displayed: 'rest',
    candidate: null,
    candidateSince: null,
    fastIntenseSince: null,
  };
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function pushSample(samples: number[], value: number): number[] {
  const next = [...samples, value];
  if (next.length > ZEN_SAMPLE_RING_MAX) {
    return next.slice(next.length - ZEN_SAMPLE_RING_MAX);
  }
  return next;
}

function smoothedLoadFromSamples(samples: number[]): number {
  if (samples.length === 0) return 0;
  const window = samples.slice(-ZEN_SMOOTH_SAMPLE_COUNT);
  return medianOf(window);
}

/** Filtre les pics isolés (scan AV, indexation Windows…) avant lissage. */
function dampSpike(raw: number, samples: number[]): number {
  if (samples.length < 3) return raw;
  const baseline = medianOf(samples.slice(-3));
  if (raw - baseline >= SPIKE_DELTA) return baseline;
  return raw;
}

function isWarmedUp(samples: number[]): boolean {
  return samples.length >= ZEN_SMOOTH_SAMPLE_COUNT;
}

function candidateFromSmoothed(smoothed: number, current: ZenLoadState): ZenLoadState {
  const { flowEnter, zenExit, boostEnter, flowExit } = ZEN_LOAD_THRESHOLDS;

  if (current === 'rest') {
    if (smoothed >= flowEnter) return 'moderate';
    return 'rest';
  }

  if (current === 'moderate') {
    if (smoothed >= boostEnter) return 'intense';
    if (smoothed <= zenExit) return 'rest';
    return 'moderate';
  }

  if (smoothed <= flowExit) return 'moderate';
  return 'intense';
}

function sustainMsForTransition(from: ZenLoadState, to: ZenLoadState): number {
  return STATE_RANK[to] > STATE_RANK[from]
    ? ZEN_SUSTAIN_ENTER_MS
    : METRIC_SUSTAIN_MS;
}

function applySustain(
  tracker: ZenLoadTracker,
  nextCandidate: ZenLoadState,
  now: number,
): ZenLoadTracker {
  if (nextCandidate === tracker.displayed) {
    return {
      ...tracker,
      candidate: null,
      candidateSince: null,
    };
  }

  if (tracker.candidate !== nextCandidate) {
    return {
      ...tracker,
      candidate: nextCandidate,
      candidateSince: now,
    };
  }

  const since = tracker.candidateSince ?? now;
  const sustainMs = sustainMsForTransition(tracker.displayed, nextCandidate);
  if (now - since >= sustainMs) {
    return {
      ...tracker,
      displayed: nextCandidate,
      candidate: null,
      candidateSince: null,
    };
  }

  return tracker;
}

export interface ZenLoadTrackerOptions {
  /** Sim dev : charge injectée d'un coup — ne pas traiter comme pic AV/indexation. */
  skipSpikeDamp?: boolean;
  /** Sim dev : état badge immédiat (sans warmup / sustain). */
  devSimFast?: boolean;
}

function resolveDevSimState(rawLoad: number, smoothedLoad: number): ZenLoadState {
  const { flowEnter, boostEnter } = ZEN_LOAD_THRESHOLDS;
  if (rawLoad >= boostEnter || smoothedLoad >= boostEnter) return 'intense';
  if (rawLoad >= flowEnter || smoothedLoad >= flowEnter) return 'moderate';
  return 'rest';
}

export function updateZenLoadTracker(
  tracker: ZenLoadTracker,
  cpu: number,
  gpu: number,
  now: number,
  options?: ZenLoadTrackerOptions,
): { tracker: ZenLoadTracker; state: ZenLoadState; smoothedLoad: number; rawLoad: number } {
  const rawLoad = computeActiveLoad(cpu, gpu);
  const damped = options?.skipSpikeDamp ? rawLoad : dampSpike(rawLoad, tracker.samples);
  const samples = pushSample(tracker.samples, damped);
  const smoothedLoad = smoothedLoadFromSamples(samples);

  if (options?.devSimFast) {
    const displayed = resolveDevSimState(rawLoad, smoothedLoad);
    return {
      tracker: {
        samples,
        displayed,
        candidate: null,
        candidateSince: null,
        fastIntenseSince: null,
      },
      state: displayed,
      smoothedLoad,
      rawLoad,
    };
  }

  let next: ZenLoadTracker = { ...tracker, samples };

  if (!isWarmedUp(samples)) {
    return {
      tracker: {
        ...next,
        displayed: 'rest',
        candidate: null,
        candidateSince: null,
        fastIntenseSince: null,
      },
      state: 'rest',
      smoothedLoad,
      rawLoad,
    };
  }

  if (rawLoad >= ZEN_FAST_INTENSE_RAW) {
    const fastSince = next.fastIntenseSince ?? now;
    next = { ...next, fastIntenseSince: fastSince };
    if (now - fastSince >= ZEN_FAST_INTENSE_MS) {
      return {
        tracker: {
          ...next,
          displayed: 'intense',
          candidate: null,
          candidateSince: null,
        },
        state: 'intense',
        smoothedLoad,
        rawLoad,
      };
    }
  } else {
    next = { ...next, fastIntenseSince: null };
  }

  const instantCandidate = candidateFromSmoothed(smoothedLoad, next.displayed);

  next = applySustain(next, instantCandidate, now);

  return {
    tracker: next,
    state: next.displayed,
    smoothedLoad,
    rawLoad,
  };
}

export function getZenLoadStateStyle(state: ZenLoadState): ZenLoadStateStyle {
  switch (state) {
    case 'intense':
      return {
        color: 'var(--warning)',
        textColor: 'var(--warning-text)',
        badgeBg: 'color-mix(in srgb, var(--warning) 20%, transparent)',
        badgeBorder: 'color-mix(in srgb, var(--warning) 50%, transparent)',
        iconClass: 'shrink-0',
      };
    case 'moderate':
      return {
        color: 'var(--neon-cyan)',
        textColor: 'var(--neon-cyan-text)',
        badgeBg: 'color-mix(in srgb, var(--neon-cyan) 20%, transparent)',
        badgeBorder: 'color-mix(in srgb, var(--neon-cyan) 50%, transparent)',
        iconClass: 'shrink-0',
      };
    case 'rest':
    default:
      return {
        color: 'var(--neon-green)',
        textColor: 'var(--neon-green-text)',
        badgeBg: 'color-mix(in srgb, var(--neon-green) 20%, transparent)',
        badgeBorder: 'color-mix(in srgb, var(--neon-green) 50%, transparent)',
        iconClass: 'fill-current shrink-0',
      };
  }
}

export function getZenStateChipStyle(state: ZenLoadState): {
  color: string;
  background: string;
  border: string;
} {
  const style = getZenLoadStateStyle(state);
  return {
    color: style.textColor,
    background: style.badgeBg,
    border: `1px solid ${style.badgeBorder}`,
  };
}

export function getZenLoadStatePresentation(state: ZenLoadState, t?: any): ZenLoadStatePresentation {
  const safeT = typeof t === "function" ? t : (k: string) => k;
  switch (state) {
    case 'intense':
      return {
        labelFr: safeT('zen_mode_boost'),
        labelAria: safeT('zen_mode_boost_aria'),
        quote: safeT('zen_mode_boost_quote'),
        breathDuration: 1.4,
      };
    case 'moderate':
      return {
        labelFr: safeT('zen_mode_flow'),
        labelAria: safeT('zen_mode_flow_aria'),
        quote: safeT('zen_mode_flow_quote'),
        breathDuration: 2.5,
      };
    case 'rest':
    default:
      return {
        labelFr: safeT('zen_mode_zen'),
        labelAria: safeT('zen_mode_zen_aria'),
        quote: safeT('zen_mode_zen_quote'),
        breathDuration: 4.0,
      };
  }
}
