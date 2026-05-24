import type { AppSettings } from '../types';
import type { AtmospherePerformanceProfile } from './atmosphereSettings';

export type AtmospherePresetId = 'zen' | 'doux' | 'aura';

export type AtmospherePresetSettings = AtmospherePerformanceProfile &
  Pick<AppSettings, 'sakuraIntensity'>;

export const ATMOSPHERE_PRESET_SEGMENT: Array<{
  value: AtmospherePresetId;
  label: string;
}> = [
  { value: 'zen', label: 'Zen' },
  { value: 'doux', label: 'Doux' },
  { value: 'aura', label: 'Aura' },
];

export const ATMOSPHERE_PRESETS: Record<AtmospherePresetId, AtmospherePresetSettings> = {
  zen: {
    sakuraIntensity: 'low',
    enableGlassmorphicBlur: false,
    backgroundAura: 'soft',
    neonGlow: 'soft',
    calmMotion: true,
  },
  doux: {
    sakuraIntensity: 'medium',
    enableGlassmorphicBlur: true,
    backgroundAura: 'full',
    neonGlow: 'balanced',
    calmMotion: false,
  },
  aura: {
    sakuraIntensity: 'high',
    enableGlassmorphicBlur: true,
    backgroundAura: 'full',
    neonGlow: 'vivid',
    calmMotion: false,
  },
};

export function applyAtmospherePreset(id: AtmospherePresetId): Partial<AppSettings> {
  return { ...ATMOSPHERE_PRESETS[id] };
}

function matchesPreset(
  settings: AtmospherePresetSettings,
  preset: AtmospherePresetSettings,
): boolean {
  return (
    settings.sakuraIntensity === preset.sakuraIntensity &&
    settings.enableGlassmorphicBlur === preset.enableGlassmorphicBlur &&
    settings.backgroundAura === preset.backgroundAura &&
    settings.neonGlow === preset.neonGlow &&
    settings.calmMotion === preset.calmMotion
  );
}

export function inferAtmospherePreset(
  settings: AtmospherePresetSettings,
): AtmospherePresetId | null {
  for (const id of ['zen', 'doux', 'aura'] as const) {
    if (matchesPreset(settings, ATMOSPHERE_PRESETS[id])) {
      return id;
    }
  }
  return null;
}
