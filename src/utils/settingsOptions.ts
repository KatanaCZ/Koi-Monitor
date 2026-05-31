import {
  AppSettings,
  normalizeDnsChecklist,
  DEFAULT_ALERT_THRESHOLDS,
  AlertDesktopSensitivity,
  CustomDnsServer,
} from '../types';
import { inferDesktopSensitivity } from './alertPresets';
import { isValidCustomDnsIpv4 } from './dnsPing';

export const REFRESH_INTERVAL_MS = [1000, 2000, 5000, 10000] as const;
export const DNS_INTERVAL_MS = [10000, 15000, 30000, 60000] as const;
export const ALERT_PERCENT_OPTIONS = [80, 85, 90, 95] as const;
export const ALERT_LATENCY_MS_OPTIONS = [60, 80, 100] as const;
export const ALERT_DESKTOP_COOLDOWN_OPTIONS = [45, 60, 90] as const;
export const ALERT_GAMING_COOLDOWN_OPTIONS = [60, 90, 120] as const;

export const ALERT_PERCENT_SEGMENT = ALERT_PERCENT_OPTIONS.map((value) => ({
  value,
  label: `${value} %`,
}));

export const ALERT_LATENCY_SEGMENT = ALERT_LATENCY_MS_OPTIONS.map((value) => ({
  value,
  label: `${value} ms`,
}));

export const ALERT_DESKTOP_COOLDOWN_SEGMENT = ALERT_DESKTOP_COOLDOWN_OPTIONS.map(
  (value) => ({
    value,
    label: value === 45 ? '45 s' : value === 60 ? '1 min' : '1 min 30',
  }),
);

export const ALERT_GAMING_COOLDOWN_SEGMENT = ALERT_GAMING_COOLDOWN_OPTIONS.map(
  (value) => ({
    value,
    label: value === 60 ? '1 min' : value === 90 ? '1 min 30' : '2 min',
  }),
);

export const REFRESH_OPTIONS = REFRESH_INTERVAL_MS.map((value) => ({
  value,
  label: value >= 1000 ? `${value / 1000} s` : `${value} ms`,
}));

export const DNS_OPTIONS = DNS_INTERVAL_MS.map((value) => ({
  value,
  label: value >= 60000 ? '1 min' : `${value / 1000} s`,
}));

export const BACKGROUND_AURA_SEGMENT = [
  { value: 'off' as const, label: 'Aucune' },
  { value: 'soft' as const, label: 'Légère' },
  { value: 'full' as const, label: 'Pleine' },
];

export const NEON_GLOW_SEGMENT = [
  { value: 'soft' as const, label: 'Douce' },
  { value: 'balanced' as const, label: 'Équilibrée' },
  { value: 'vivid' as const, label: 'Vive' },
];

function clampToAllowed(
  value: number,
  allowed: readonly number[],
  fallback: number,
): number {
  return allowed.includes(value) ? value : fallback;
}

function sanitizeAlertThresholds(
  thresholds: AppSettings['alertThresholds'],
): AppSettings['alertThresholds'] {
  const base = {
    ...DEFAULT_ALERT_THRESHOLDS,
    ...thresholds,
    desktop: {
      ...DEFAULT_ALERT_THRESHOLDS.desktop,
      ...thresholds?.desktop,
    },
    gaming: {
      ...DEFAULT_ALERT_THRESHOLDS.gaming,
      ...thresholds?.gaming,
    },
  };

  const networkAlerts = base.gaming.networkAlerts === true;

  const sensitivity: AlertDesktopSensitivity =
    base.desktop.sensitivity === 'low' ||
    base.desktop.sensitivity === 'medium' ||
    base.desktop.sensitivity === 'high'
      ? base.desktop.sensitivity
      : inferDesktopSensitivity({
          ...base.desktop,
          sensitivity: 'medium',
        });

  return {
    enabled: Boolean(base.enabled),
    desktop: {
      sensitivity,
      cpuPercent: clampToAllowed(
        base.desktop.cpuPercent,
        ALERT_PERCENT_OPTIONS,
        DEFAULT_ALERT_THRESHOLDS.desktop.cpuPercent,
      ),
      ramPercent: clampToAllowed(
        base.desktop.ramPercent,
        ALERT_PERCENT_OPTIONS,
        DEFAULT_ALERT_THRESHOLDS.desktop.ramPercent,
      ),
      gpuPercent: clampToAllowed(
        base.desktop.gpuPercent,
        ALERT_PERCENT_OPTIONS,
        DEFAULT_ALERT_THRESHOLDS.desktop.gpuPercent,
      ),
      cooldownSeconds: clampToAllowed(
        base.desktop.cooldownSeconds,
        ALERT_DESKTOP_COOLDOWN_OPTIONS,
        DEFAULT_ALERT_THRESHOLDS.desktop.cooldownSeconds,
      ),
    },
    gaming: {
      networkAlerts,
      internetLatencyMs: clampToAllowed(
        base.gaming.internetLatencyMs,
        ALERT_LATENCY_MS_OPTIONS,
        DEFAULT_ALERT_THRESHOLDS.gaming.internetLatencyMs,
      ),
      cooldownSeconds: clampToAllowed(
        base.gaming.cooldownSeconds,
        ALERT_GAMING_COOLDOWN_OPTIONS,
        DEFAULT_ALERT_THRESHOLDS.gaming.cooldownSeconds,
      ),
    },
  };
}

function sanitizeLanguage(value: unknown): AppSettings['language'] {
  return value === 'fr' || value === 'en' ? value : 'en';
}

function sanitizeBackgroundAura(value: unknown): AppSettings['backgroundAura'] {
  return value === 'off' || value === 'soft' || value === 'full' ? value : 'full';
}

function sanitizeNeonGlow(value: unknown): AppSettings['neonGlow'] {
  return value === 'soft' || value === 'balanced' || value === 'vivid' ? value : 'balanced';
}

function sanitizeCustomDns(value: unknown): CustomDnsServer | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as { ip?: unknown; label?: unknown };
  const ip = typeof raw.ip === 'string' ? raw.ip.trim() : '';
  if (!ip || !isValidCustomDnsIpv4(ip)) return null;
  const label = typeof raw.label === 'string' ? raw.label.trim().slice(0, 24) : '';
  return { ip, label };
}

export function sanitizeAppSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    language: sanitizeLanguage(settings.language),
    refreshInterval: clampToAllowed(
      settings.refreshInterval,
      REFRESH_INTERVAL_MS,
      2000,
    ),
    dnsInterval: clampToAllowed(settings.dnsInterval, DNS_INTERVAL_MS, 15000),
    backgroundAura: sanitizeBackgroundAura(settings.backgroundAura),
    neonGlow: sanitizeNeonGlow(settings.neonGlow),
    calmMotion: Boolean(settings.calmMotion),
    ambientMusicMuted: Boolean(settings.ambientMusicMuted),
    zenMetricsVisible: settings.zenMetricsVisible !== false,
    dnsChecklist: normalizeDnsChecklist(settings.dnsChecklist),
    customDns: sanitizeCustomDns(settings.customDns),
    alertThresholds: sanitizeAlertThresholds(settings.alertThresholds),
  };
}
