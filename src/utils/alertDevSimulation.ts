import { useAppStore } from '../store';
import {
  DEFAULT_ALERT_THRESHOLDS,
  type CustomDnsServer,
  type DnsResult,
  type SystemInfo,
} from '../types';
import { applyDesktopSensitivity, applyGamingNetworkAlerts } from './alertPresets';
import { buildActiveDnsServers, pingActiveDns } from './dnsPing';

declare global {
  interface Window {
    koiSimulateLoad?: () => void;
    koiSimulateGaming?: () => void;
    koiSimulateLatency200?: () => void;
    koiSimulateZen?: () => void;
    koiSimulateFlow?: () => void;
    koiSimulateBoost?: () => void;
    koiSimulateFocus?: (lostFocus?: boolean) => void;
    __koiForceGamingProfile?: boolean;
    __koiDevSimActive?: boolean;
  }
}

/** Bloque télémétrie / latence jeu / DNS réels pendant une simulation dev. */
export function isDevTelemetryBlocked(): boolean {
  return import.meta.env.DEV && Boolean(window.__koiDevSimActive);
}

export function isDevForceGamingProfile(): boolean {
  return import.meta.env.DEV && Boolean(window.__koiForceGamingProfile);
}

/** @deprecated Préférer isDevTelemetryBlocked — alias conservé pour les imports existants. */
export function isDevGamingSimActive(): boolean {
  return isDevTelemetryBlocked();
}

function setDevSimActive(on: boolean): void {
  if (!import.meta.env.DEV) return;
  window.__koiDevSimActive = on;
}

function setDevForceGamingProfile(on: boolean): void {
  if (!import.meta.env.DEV) return;
  window.__koiForceGamingProfile = on;
}

function mockSystemInfo(): SystemInfo {
  return {
    cpu: {
      name: 'Dev CPU',
      cores: 8,
      usage: 12,
      per_core_usage: [12, 10, 8, 6],
      frequency: 3600,
      temperature: 42,
    },
    memory: {
      total: 16_000_000_000,
      used: 8_000_000_000,
      available: 8_000_000_000,
      usage_percent: 50,
      modules: [],
    },
    gpu: [
      {
        name: 'Dev GPU',
        usage: 10,
        memory_used: 1_000_000_000,
        memory_total: 8_000_000_000,
        temperature: 55,
      },
    ],
    network: {
      download_speed: 0,
      upload_speed: 0,
      total_received: 0,
      total_transmitted: 0,
      interfaces: [],
    },
    uptime: 3600,
    security: { is_protected: true, product_name: 'Dev AV' },
  };
}

const GAMING_SIM = {
  cpuPercent: 87,
  gpuPercent: 99,
  ramPercent: 70,
  latencyMs: 78,
  durationSec: 30,
  /** Latences DNS mockées (ms) — alignées sur latence jeu ~78 ms, plus « bonne » que « excellente ». */
  dnsLatencies: {
    'Cloudflare DNS': 72,
    'Google DNS': 85,
    'Quad9': 91,
    'OpenDNS': 118,
    'AdGuard DNS': 88,
    'CleanBrowsing': 105,
  },
} as const;

function buildSimulatedDnsResults(
  checklist: string[],
  customDns: CustomDnsServer | null,
): DnsResult[] {
  const servers = buildActiveDnsServers(checklist, customDns);

  const results: DnsResult[] = servers.map((s) => {
    const latency =
      GAMING_SIM.dnsLatencies[s.name as keyof typeof GAMING_SIM.dnsLatencies] ??
      GAMING_SIM.latencyMs + 12;
    return {
      server_name: s.name,
      ip: s.ip,
      latency_ms: latency,
      is_best: false,
    };
  });

  let bestIndex = -1;
  let minLatency = Number.POSITIVE_INFINITY;
  results.forEach((r, i) => {
    if (r.latency_ms >= 0 && r.latency_ms < minLatency) {
      minLatency = r.latency_ms;
      bestIndex = i;
    }
  });
  if (bestIndex >= 0) results[bestIndex]!.is_best = true;

  return results;
}

async function restoreRealDnsResults(): Promise<void> {
  const { settings, setDnsResults } = useAppStore.getState();
  try {
    const results = await pingActiveDns(settings.dnsChecklist, settings.customDns);
    setDnsResults(results);
    logDnsSnapshot('Fin · DNS réels restaurés');
  } catch {
    console.warn('[Koi Dev] Impossible de restaurer les pings DNS réels.');
  }
}

function applySimulatedSystemLoad(
  systemInfo: SystemInfo,
  cpuPercent: number,
  gpuPercent: number,
  ramPercent: number,
): SystemInfo {
  const used = Math.round((systemInfo.memory.total * ramPercent) / 100);
  return {
    ...systemInfo,
    cpu: { ...systemInfo.cpu, usage: cpuPercent },
    memory: {
      ...systemInfo.memory,
      usage_percent: ramPercent,
      used,
      available: Math.max(0, systemInfo.memory.total - used),
    },
    gpu: systemInfo.gpu.map((g, i) =>
      i === 0 ? { ...g, usage: gpuPercent } : g,
    ),
  };
}

function logDnsSnapshot(label: string): void {
  const { dnsResults } = useAppStore.getState();
  if (dnsResults.length === 0) {
    console.info(`[Koi Dev] ${label} · DNS — (pas encore de résultats, prochain poll…)`);
    return;
  }
  const summary = dnsResults
    .map((d) => `${d.server_name} ${d.latency_ms >= 0 ? `${d.latency_ms.toFixed(0)} ms` : '—'}`)
    .join(' · ');
  console.info(`[Koi Dev] ${label} · DNS — ${summary}`);
}

function requireSystemInfo(): SystemInfo | null {
  const state = useAppStore.getState();
  if (state.systemInfo) return state.systemInfo;

  if (import.meta.env.DEV) {
    const mock = mockSystemInfo();
    state.setSystemInfo(mock);
    return mock;
  }

  console.warn('[Koi Dev] Attendez le chargement télémétrie (après splash).');
  return null;
}

/** Simule CPU élevé en mode Bureau → toast après 3 s de dépassement. */
export function simulateDesktopLoad(): void {
  const base = requireSystemInfo();
  if (!base) return;

  setDevSimActive(true);

  useAppStore.getState().updateSettings({
    alertThresholds: {
      ...DEFAULT_ALERT_THRESHOLDS,
      enabled: true,
      desktop: {
        ...DEFAULT_ALERT_THRESHOLDS.desktop,
        cpuPercent: 85,
        cooldownSeconds: 15,
      },
    },
  });

  console.info('[Koi Dev] Simulation Bureau — CPU 96 % pendant 6 s (télémétrie réelle bloquée)…');

  let ticks = 0;
  const applyTick = () => {
    const s = useAppStore.getState();
    if (!s.systemInfo) return;

    s.applyTelemetrySnapshot(
      {
        ...s.systemInfo,
        cpu: { ...s.systemInfo.cpu, usage: 96 },
        memory: { ...s.systemInfo.memory, usage_percent: 20 },
        gpu: s.systemInfo.gpu.map((g, i) =>
          i === 0 ? { ...g, usage: 15 } : g,
        ),
      },
      false,
    );
  };

  applyTick();

  const timer = setInterval(() => {
    applyTick();

    ticks += 1;
    if (ticks >= 6) {
      clearInterval(timer);
      setDevSimActive(false);
      const toast = useAppStore.getState().statusToast;
      console.info('[Koi Dev] Fin simulation Bureau.', toast ?? 'aucun toast visible');
    }
  }, 1000);
}

/**
 * Simule session jeu lourde + latence 78 ms + DNS dégradés pendant 30 s.
 * Pings DNS mockés (UI) — restaurés en vrais à la fin.
 */
export function simulateGamingLoad(): void {
  const base = requireSystemInfo();
  if (!base) return;

  setDevForceGamingProfile(true);
  setDevSimActive(true);

  useAppStore.getState().updateSettings({
    alertThresholds: {
      ...DEFAULT_ALERT_THRESHOLDS,
      enabled: true,
      gaming: applyGamingNetworkAlerts(true),
    },
  });

  const { cpuPercent, gpuPercent, ramPercent, latencyMs, durationSec } = GAMING_SIM;
  const baselineMs = 12;
  const baselinePhaseSec = 8;
  const checklist = useAppStore.getState().settings.dnsChecklist;
  const customDns = useAppStore.getState().settings.customDns;
  useAppStore.getState().setDnsResults(buildSimulatedDnsResults(checklist, customDns));

  console.info(
    `[Koi Dev] Simulation Jeu — ${durationSec} s · charge simulée · baseline ~${baselineMs} ms puis pic ${latencyMs} ms`,
  );
  console.info('[Koi Dev] DNS simulés (mock UI) — restaurés en réels à la fin.');
  logDnsSnapshot('Début · DNS simulés');

  let ticks = 0;
  const timer = setInterval(() => {
    const s = useAppStore.getState();
    if (!s.systemInfo) return;

    s.applyTelemetrySnapshot(
      applySimulatedSystemLoad(s.systemInfo, cpuPercent, gpuPercent, ramPercent),
      false,
    );

    const internetMs = ticks < baselinePhaseSec ? baselineMs : latencyMs;
    const isSpike = internetMs >= 60;

    s.setGamingLatency({
      gateway_ms: 12,
      internet_ms: internetMs,
      internet_host: '1.1.1.1',
      gateway_ip: s.gamingLatency.gateway_ip || '192.168.1.1',
      jitter_ms: 8,
      sample_count: 15,
      verdict: isSpike ? 'marginal' : 'ready',
      verdict_label: isSpike ? 'marginal' : 'ready',
    });

    s.setDnsResults(buildSimulatedDnsResults(s.settings.dnsChecklist, s.settings.customDns));

    if (ticks === baselinePhaseSec) {
      console.info(`[Koi Dev] Pic latence ${latencyMs} ms (baseline ~${baselineMs} ms) — toast alerte ~3 s…`);
    }

    if (ticks > 0 && ticks % 5 === 0) {
      console.info(
        `[Koi Dev] Jeu +${ticks}s · profil=${s.activityProfile} · latence jeu=${internetMs} ms · DNS simulés`,
      );
      logDnsSnapshot(`Jeu +${ticks}s`);
    }

    ticks += 1;
    if (ticks >= durationSec) {
      clearInterval(timer);
      setDevForceGamingProfile(false);
      setDevSimActive(false);
      void restoreRealDnsResults();
      const toast = useAppStore.getState().statusToast;
      console.info('[Koi Dev] Fin simulation Jeu.', toast ?? 'aucun toast visible');
    }
  }, 1000);
}

/** Simule 200 ms en session jeu → toast réseau après ~4 s. */
export function simulateLatency200(): void {
  if (!requireSystemInfo()) return;

  setDevForceGamingProfile(true);
  setDevSimActive(true);

  useAppStore.getState().updateSettings({
    alertThresholds: {
      ...DEFAULT_ALERT_THRESHOLDS,
      enabled: true,
      desktop: applyDesktopSensitivity('medium'),
      gaming: applyGamingNetworkAlerts(true),
    },
  });

  const durationSec = 8;

  console.info('[Koi Dev] Simulation 200 ms — activez les alertes si besoin ; toast ~4 s…');

  let ticks = 0;
  const applyTick = () => {
    const s = useAppStore.getState();
    if (!s.systemInfo) return;

    s.applyTelemetrySnapshot(
      applySimulatedSystemLoad(s.systemInfo, 55, 55, 50),
      false,
    );

    const latencyMs = ticks === 0 ? 28 : 200;
    s.setGamingLatency({
      gateway_ms: 12,
      internet_ms: latencyMs,
      internet_host: '1.1.1.1',
      gateway_ip: s.gamingLatency.gateway_ip || '192.168.1.1',
      jitter_ms: 10,
      sample_count: 15,
      verdict: latencyMs >= 200 ? 'high_latency' : 'ready',
      verdict_label: latencyMs >= 200 ? 'high_latency' : 'ready',
    });
  };

  applyTick();

  const timer = setInterval(() => {
    ticks += 1;
    applyTick();

    if (ticks >= durationSec) {
      clearInterval(timer);
      setDevForceGamingProfile(false);
      setDevSimActive(false);
      const toast = useAppStore.getState().statusToast;
      console.info('[Koi Dev] Fin simulation 200 ms.', toast ?? 'aucun toast visible');
    }
  }, 1000);
}

/** Active Zen + reset tracker (anti-pics ignoré pendant la sim). */
function prepareZenDevSim(): void {
  const s = useAppStore.getState();
  if (!s.zenMode) {
    s.setZenMode(true);
    console.info('[Koi Dev] Mode Zen activé pour la simulation.');
  }
  s.bumpZenTrackerReset();
}

/**
 * Maintient une charge simulée 1 Hz — nécessaire car la télémétrie Rust écrase sinon.
 * Durées calibrées sur warmup Zen (5 échantillons) + sustain (3–5 s).
 */
function runZenLoadSim(
  cpuPercent: number,
  gpuPercent: number,
  label: string,
  durationSec: number,
): void {
  if (!import.meta.env.DEV) return;
  const base = requireSystemInfo();
  if (!base) return;

  const wasZen = useAppStore.getState().zenMode;
  prepareZenDevSim();
  setDevSimActive(true);

  console.info(
    `[Koi Dev] Zen · ${label} — CPU ${cpuPercent} % · GPU ${gpuPercent} % · ${durationSec} s`,
  );

  let ticks = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const applyTick = () => {
    const s = useAppStore.getState();
    const info = s.systemInfo ?? base;
    s.applyTelemetrySnapshot(
      applySimulatedSystemLoad(info, cpuPercent, gpuPercent, info.memory.usage_percent),
      false,
    );
  };

  const startTicks = () => {
    applyTick();
    timer = setInterval(() => {
      ticks += 1;
      applyTick();

      if (ticks >= durationSec) {
        clearInterval(timer);
        setDevSimActive(false);
        console.info(`[Koi Dev] Fin simulation Zen · ${label}.`);
      }
    }, 1000);
  };

  // Laisse ZenClockWidget (lazy) monter useZenLoadState avant le 1er tick.
  if (wasZen) {
    startTicks();
  } else {
    requestAnimationFrame(startTicks);
  }
}

function simulateZenRest(): void {
  runZenLoadSim(6, 4, 'Zen', 8);
}

function simulateZenFlow(): void {
  runZenLoadSim(32, 22, 'Flow', 14);
}

function simulateZenBoost(): void {
  runZenLoadSim(92, 88, 'Boost', 12);
}

function simulateFocusState(lostFocus: boolean = true): void {
  if (lostFocus) {
    window.dispatchEvent(new Event('blur'));
    console.info("[Koi Dev] Simulation : Fenêtre hors-focus (Pétales à 24 FPS) 🎬");
  } else {
    window.dispatchEvent(new Event('focus'));
    console.info("[Koi Dev] Simulation : Fenêtre active (Pétales à 30 FPS) 🚀");
  }
}

export function mountAlertDevSimulation(): void {
  if (!import.meta.env.DEV) return;

  window.koiSimulateLoad = simulateDesktopLoad;
  window.koiSimulateGaming = simulateGamingLoad;
  window.koiSimulateLatency200 = simulateLatency200;
  window.koiSimulateZen = simulateZenRest;
  window.koiSimulateFlow = simulateZenFlow;
  window.koiSimulateBoost = simulateZenBoost;
  window.koiSimulateFocus = simulateFocusState;
  (window as Window & { __koiStore?: typeof useAppStore }).__koiStore = useAppStore;
  console.info(
    '[Koi Dev] koiSimulateLoad() · koiSimulateGaming() · koiSimulateLatency200() · koiSimulateZen() · koiSimulateFlow() · koiSimulateBoost() · koiSimulateFocus(lostFocus?: boolean)',
  );
}
