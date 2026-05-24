/** Seuils splash — historiques graphiques + chunks Recharts + warmup UI. */

export const MIN_SPLASH_HISTORY_TICKS = 3;
export const SPLASH_DASHBOARD_WARMUP_MS = 900;

export function isSplashDashboardReady(input: {
  cpuHistorySeq: number;
  chartsPreloaded: boolean;
  warmupElapsed: boolean;
}): boolean {
  return (
    input.cpuHistorySeq >= MIN_SPLASH_HISTORY_TICKS &&
    input.chartsPreloaded &&
    input.warmupElapsed
  );
}

/** Précharge les chunks graphiques pendant le splash. */
export function preloadSplashCharts(): Promise<void> {
  return Promise.all([
    import('../components/charts/SingleAreaChart'),
    import('../components/charts/DualAreaChart'),
  ]).then(() => undefined);
}
