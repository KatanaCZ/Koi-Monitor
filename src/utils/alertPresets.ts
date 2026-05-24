import type { AlertDesktopSensitivity, AlertThresholdSettings } from '../types';

export const DESKTOP_SENSITIVITY_PRESETS: Record<
  AlertDesktopSensitivity,
  AlertThresholdSettings['desktop']
> = {
  low: {
    sensitivity: 'low',
    cpuPercent: 95,
    ramPercent: 95,
    gpuPercent: 95,
    cooldownSeconds: 90,
  },
  medium: {
    sensitivity: 'medium',
    cpuPercent: 90,
    ramPercent: 90,
    gpuPercent: 95,
    cooldownSeconds: 60,
  },
  high: {
    sensitivity: 'high',
    cpuPercent: 85,
    ramPercent: 85,
    gpuPercent: 90,
    cooldownSeconds: 45,
  },
};

export const GAMING_NETWORK_ALERT_BUNDLE: Pick<
  AlertThresholdSettings['gaming'],
  'internetLatencyMs' | 'cooldownSeconds'
> = {
  internetLatencyMs: 80,
  cooldownSeconds: 90,
};

export const ALERT_SENSITIVITY_SEGMENT: Array<{
  value: AlertDesktopSensitivity;
  label: string;
}> = [
  { value: 'low', label: 'Discrète' },
  { value: 'medium', label: 'Équilibrée' },
  { value: 'high', label: 'Attentive' },
];

export function applyDesktopSensitivity(
  sensitivity: AlertDesktopSensitivity,
): AlertThresholdSettings['desktop'] {
  return { ...DESKTOP_SENSITIVITY_PRESETS[sensitivity] };
}

export function inferDesktopSensitivity(
  desktop: AlertThresholdSettings['desktop'],
): AlertDesktopSensitivity {
  if (desktop.sensitivity) {
    return desktop.sensitivity;
  }

  for (const key of ['low', 'medium', 'high'] as const) {
    const preset = DESKTOP_SENSITIVITY_PRESETS[key];
    if (
      desktop.cpuPercent === preset.cpuPercent &&
      desktop.ramPercent === preset.ramPercent &&
      desktop.gpuPercent === preset.gpuPercent &&
      desktop.cooldownSeconds === preset.cooldownSeconds
    ) {
      return key;
    }
  }

  return 'medium';
}

export function applyGamingNetworkAlerts(enabled: boolean): AlertThresholdSettings['gaming'] {
  if (!enabled) {
    return {
      networkAlerts: false,
      internetLatencyMs: 80,
      cooldownSeconds: 90,
    };
  }

  return {
    networkAlerts: true,
    ...GAMING_NETWORK_ALERT_BUNDLE,
  };
}

export function isGamingNetworkAlertsEnabled(gaming: AlertThresholdSettings['gaming']): boolean {
  return gaming.networkAlerts === true;
}
