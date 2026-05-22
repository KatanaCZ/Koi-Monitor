import { AppSettings, normalizeDnsChecklist } from '../types';

export const REFRESH_INTERVAL_MS = [1000, 2000, 5000, 10000] as const;
export const DNS_INTERVAL_MS = [10000, 15000, 30000, 60000] as const;

export const REFRESH_OPTIONS = REFRESH_INTERVAL_MS.map((value) => ({
  value,
  label: value >= 1000 ? `${value / 1000}s` : `${value}ms`,
}));

export const DNS_OPTIONS = DNS_INTERVAL_MS.map((value) => ({
  value,
  label: value >= 60000 ? '1min' : `${value / 1000}s`,
}));

function clampToAllowed(
  value: number,
  allowed: readonly number[],
  fallback: number,
): number {
  return allowed.includes(value) ? value : fallback;
}

export function sanitizeAppSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    refreshInterval: clampToAllowed(
      settings.refreshInterval,
      REFRESH_INTERVAL_MS,
      2000,
    ),
    dnsInterval: clampToAllowed(settings.dnsInterval, DNS_INTERVAL_MS, 15000),
    dnsChecklist: normalizeDnsChecklist(settings.dnsChecklist),
  };
}
