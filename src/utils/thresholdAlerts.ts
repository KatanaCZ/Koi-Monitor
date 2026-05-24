import type {
  ActivityProfile,
  AlertDesktopSensitivity,
  AlertThresholdSettings,
  GamingLatencySnapshot,
  SystemInfo,
} from '../types';

export const PROFILE_ENTER_LOAD = 45;
export const PROFILE_ENTER_MS = 25_000;
export const PROFILE_EXIT_LOAD = 30;
export const PROFILE_EXIT_MS = 60_000;
export const METRIC_SUSTAIN_MS = 3_000;
export const BASELINE_MIN_SAMPLES = 5;
export const BASELINE_SAMPLE_MAX = 20;

/** Marge au-dessus du ping habituel avant alerte (ms). Sensibilité bureau = même curseur en jeu. */
export const GAMING_SPIKE_DELTA_MS: Record<AlertDesktopSensitivity, number> = {
  low: 55,
  medium: 50,
  high: 35,
};

export type AlertKind = 'desktop-load' | 'gaming-latency';

export interface LatencyBaselineState {
  samples: number[];
  sessionMinMs: number | null;
}

export interface ProfileDetectorState {
  mode: ActivityProfile;
  highLoadSince: number | null;
  lowLoadSince: number | null;
}

export interface ThresholdAlertState {
  profile: ProfileDetectorState;
  latencyBaseline: LatencyBaselineState;
  breachSince: Partial<Record<AlertKind, number>>;
  cooldownUntil: Partial<Record<AlertKind, number>>;
}

export function createThresholdAlertState(): ThresholdAlertState {
  return {
    profile: {
      mode: 'desktop',
      highLoadSince: null,
      lowLoadSince: null,
    },
    latencyBaseline: { samples: [], sessionMinMs: null },
    breachSince: {},
    cooldownUntil: {},
  };
}

export function updateLatencyBaseline(
  state: LatencyBaselineState,
  internetMs: number,
  profileMode: ActivityProfile,
): LatencyBaselineState {
  if (internetMs < 0) return state;

  if (profileMode === 'desktop') {
    return { samples: [], sessionMinMs: null };
  }

  const samples = [...state.samples, internetMs].slice(-BASELINE_SAMPLE_MAX);
  const sessionMinMs =
    state.sessionMinMs === null ? internetMs : Math.min(state.sessionMinMs, internetMs);

  return { samples, sessionMinMs };
}

export function resolveLatencyBaseline(state: LatencyBaselineState): number | null {
  if (state.samples.length < BASELINE_MIN_SAMPLES || state.sessionMinMs === null) {
    return null;
  }
  return state.sessionMinMs;
}

export function isGamingLatencySpike(
  currentMs: number,
  baselineMs: number | null,
  sensitivity: AlertDesktopSensitivity,
  absoluteThresholdMs: number,
): boolean {
  if (currentMs >= absoluteThresholdMs) return true;
  if (baselineMs === null) return false;
  return currentMs >= baselineMs + GAMING_SPIKE_DELTA_MS[sensitivity];
}

export function formatSpikeDuration(durationMs: number): string {
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  if (seconds < 60) return `~${seconds} s`;
  const minutes = Math.round(seconds / 60);
  return minutes <= 1 ? '~1 min' : `~${minutes} min`;
}

export function formatGamingLatencyAlert(
  currentMs: number,
  baselineMs: number | null,
  spikeDurationMs: number,
): string {
  const duration = formatSpikeDuration(spikeDurationMs);
  if (baselineMs !== null) {
    return `Jeu · Ping qui monte · ${currentMs.toFixed(0)} ms · ${duration} · d'habitude ~${baselineMs.toFixed(0)} ms`;
  }
  return `Jeu · Ping qui monte · ${currentMs.toFixed(0)} ms · ${duration}`;
}

export function updateActivityProfile(
  state: ProfileDetectorState,
  cpuUsage: number,
  gpuUsage: number,
  now: number,
): ProfileDetectorState {
  const load = Math.max(cpuUsage, gpuUsage);

  if (state.mode === 'desktop') {
    if (load >= PROFILE_ENTER_LOAD) {
      const highLoadSince = state.highLoadSince ?? now;
      if (now - highLoadSince >= PROFILE_ENTER_MS) {
        return { mode: 'gaming', highLoadSince: null, lowLoadSince: null };
      }
      return { ...state, highLoadSince };
    }
    return { ...state, highLoadSince: null, lowLoadSince: null };
  }

  if (load < PROFILE_EXIT_LOAD) {
    const lowLoadSince = state.lowLoadSince ?? now;
    if (now - lowLoadSince >= PROFILE_EXIT_MS) {
      return { mode: 'desktop', highLoadSince: null, lowLoadSince: null };
    }
    return { ...state, lowLoadSince };
  }

  return { ...state, lowLoadSince: null, highLoadSince: null };
}

function isCooldownActive(
  kind: AlertKind,
  cooldownUntil: Partial<Record<AlertKind, number>>,
  now: number,
): boolean {
  const until = cooldownUntil[kind];
  return until !== undefined && now < until;
}

function markCooldown(
  state: ThresholdAlertState,
  kind: AlertKind,
  cooldownSeconds: number,
  now: number,
): ThresholdAlertState {
  return {
    ...state,
    cooldownUntil: {
      ...state.cooldownUntil,
      [kind]: now + cooldownSeconds * 1000,
    },
    breachSince: {
      ...state.breachSince,
      [kind]: undefined,
    },
  };
}

function trackSustainedBreach(
  state: ThresholdAlertState,
  kind: AlertKind,
  breached: boolean,
  now: number,
): { state: ThresholdAlertState; ready: boolean } {
  if (!breached) {
    if (state.breachSince[kind] === undefined) {
      return { state, ready: false };
    }
    const next = { ...state.breachSince };
    delete next[kind];
    return {
      state: { ...state, breachSince: next },
      ready: false,
    };
  }

  const since = state.breachSince[kind] ?? now;
  const nextState = {
    ...state,
    breachSince: { ...state.breachSince, [kind]: since },
  };

  return {
    state: nextState,
    ready: now - since >= METRIC_SUSTAIN_MS,
  };
}

function primaryGpuUsage(systemInfo: SystemInfo): number {
  return systemInfo.gpu[0]?.usage ?? 0;
}

export interface ThresholdAlertResult {
  state: ThresholdAlertState;
  alerts: Array<{ kind: AlertKind; message: string; type: 'warning' | 'error' }>;
}

export function evaluateThresholdAlerts(
  state: ThresholdAlertState,
  systemInfo: SystemInfo | null,
  gamingLatency: GamingLatencySnapshot,
  settings: AlertThresholdSettings,
  now: number,
): ThresholdAlertResult {
  if (!settings.enabled || !systemInfo) {
    return { state, alerts: [] };
  }

  let nextState = { ...state };
  const alerts: ThresholdAlertResult['alerts'] = [];

  nextState.profile = updateActivityProfile(
    nextState.profile,
    systemInfo.cpu.usage,
    primaryGpuUsage(systemInfo),
    now,
  );

  nextState.latencyBaseline = updateLatencyBaseline(
    nextState.latencyBaseline,
    gamingLatency.internet_ms,
    nextState.profile.mode,
  );

  if (nextState.profile.mode === 'desktop') {
    nextState = {
      ...nextState,
      breachSince: (() => {
        const breachSince = { ...nextState.breachSince };
        delete breachSince['gaming-latency'];
        return breachSince;
      })(),
    };

    const gpuUsage = primaryGpuUsage(systemInfo);
    const load = Math.max(systemInfo.cpu.usage, gpuUsage);
    const pendingGaming =
      nextState.profile.highLoadSince !== null && load >= PROFILE_ENTER_LOAD;

    const metrics = [
      {
        value: systemInfo.cpu.usage,
        threshold: settings.desktop.cpuPercent,
        label: 'CPU',
      },
      {
        value: systemInfo.memory.usage_percent,
        threshold: settings.desktop.ramPercent,
        label: 'RAM',
      },
      {
        value: gpuUsage,
        threshold: settings.desktop.gpuPercent,
        label: 'GPU',
      },
    ];

    const overloaded = metrics.filter((metric) => metric.value > metric.threshold);
    const tracked = trackSustainedBreach(
      nextState,
      'desktop-load',
      !pendingGaming && overloaded.length > 0,
      now,
    );
    nextState = tracked.state;

    if (
      tracked.ready &&
      !isCooldownActive('desktop-load', nextState.cooldownUntil, now)
    ) {
      const worst = overloaded.reduce((best, metric) => {
        const margin = metric.value - metric.threshold;
        const bestMargin = best.value - best.threshold;
        return margin > bestMargin ? metric : best;
      });

      alerts.push({
        kind: 'desktop-load',
        message: `Bureau · La machine force · ${worst.label} ${worst.value.toFixed(0)} %`,
        type: worst.value > worst.threshold + 5 ? 'error' : 'warning',
      });
      nextState = markCooldown(
        nextState,
        'desktop-load',
        settings.desktop.cooldownSeconds,
        now,
      );
    }
  } else {
    nextState = {
      ...nextState,
      breachSince: (() => {
        const breachSince = { ...nextState.breachSince };
        delete breachSince['desktop-load'];
        return breachSince;
      })(),
    };

    if (!settings.gaming.networkAlerts) {
      return { state: nextState, alerts };
    }

    if (
      gamingLatency.internet_ms >= 0 &&
      !isCooldownActive('gaming-latency', nextState.cooldownUntil, now)
    ) {
      const baselineMs = resolveLatencyBaseline(nextState.latencyBaseline);
      const sensitivity = settings.desktop.sensitivity;
      const absoluteThresholdMs = settings.gaming.internetLatencyMs;
      const breached = isGamingLatencySpike(
        gamingLatency.internet_ms,
        baselineMs,
        sensitivity,
        absoluteThresholdMs,
      );

      const tracked = trackSustainedBreach(
        nextState,
        'gaming-latency',
        breached,
        now,
      );
      nextState = tracked.state;

      if (tracked.ready) {
        const breachSince = nextState.breachSince['gaming-latency'] ?? now;
        const spikeDurationMs = now - breachSince;
        const spikeOverBaseline =
          baselineMs !== null
            ? gamingLatency.internet_ms - baselineMs - GAMING_SPIKE_DELTA_MS[sensitivity]
            : 0;
        alerts.push({
          kind: 'gaming-latency',
          message: formatGamingLatencyAlert(
            gamingLatency.internet_ms,
            baselineMs,
            spikeDurationMs,
          ),
          type:
            spikeOverBaseline >= 25 ||
            gamingLatency.internet_ms >= absoluteThresholdMs + 20
              ? 'error'
              : 'warning',
        });
        nextState = markCooldown(
          nextState,
          'gaming-latency',
          settings.gaming.cooldownSeconds,
          now,
        );
      }
    }
  }

  return { state: nextState, alerts };
}

export function getActivityProfileLabel(mode: ActivityProfile): string {
  return mode === 'gaming' ? 'Session de jeu' : 'Sur le bureau';
}
