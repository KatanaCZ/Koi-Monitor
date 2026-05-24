import type { AppSettings, BackgroundAura, NeonGlow } from '../types';

const SETTINGS_KEY = 'koi_settings';

export type AtmospherePerformanceProfile = Pick<
  AppSettings,
  'sakuraIntensity' | 'enableGlassmorphicBlur' | 'backgroundAura' | 'neonGlow' | 'calmMotion'
>;

/** Sakura dense, verre dépoli, aura pleine, néon vivid, animations non calmes. */
export function isMaxAtmosphereProfile(settings: AtmospherePerformanceProfile): boolean {
  return (
    settings.sakuraIntensity === 'high' &&
    settings.enableGlassmorphicBlur &&
    settings.backgroundAura === 'full' &&
    settings.neonGlow === 'vivid' &&
    !settings.calmMotion
  );
}

export const MAX_ATMOSPHERE_TOAST =
  'Si ta machine le permet profite, sinon baisse l\'atmosphère';

function sanitizeSakuraColor(value: unknown): AppSettings['sakuraColor'] {
  return value === 'purple' || value === 'blue' || value === 'green' ? value : 'pink';
}

export function syncBackgroundAura(aura: BackgroundAura): void {
  document.documentElement.setAttribute('data-background-aura', aura);
}

export function syncNeonGlow(glow: NeonGlow): void {
  document.documentElement.setAttribute('data-neon-glow', glow);
}

export function syncCalmMotion(enabled: boolean): void {
  document.documentElement.classList.toggle('calm-motion', enabled);
}

export function syncAccentFromSakura(color: AppSettings['sakuraColor']): void {
  document.documentElement.setAttribute('data-accent', color);
}

export function syncAtmosphereFromSettings(
  settings: Pick<AppSettings, 'backgroundAura' | 'neonGlow' | 'calmMotion' | 'sakuraColor'>,
): void {
  syncBackgroundAura(settings.backgroundAura);
  syncNeonGlow(settings.neonGlow);
  syncCalmMotion(settings.calmMotion);
  syncAccentFromSakura(settings.sakuraColor);
}

/** Apply persisted atmosphere prefs before first paint (call from main.tsx). */
export function initAtmosphereFromStorage(): void {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AppSettings>;
      syncAtmosphereFromSettings({
        backgroundAura:
          parsed.backgroundAura === 'off' ||
          parsed.backgroundAura === 'soft' ||
          parsed.backgroundAura === 'full'
            ? parsed.backgroundAura
            : 'full',
        neonGlow:
          parsed.neonGlow === 'soft' ||
          parsed.neonGlow === 'balanced' ||
          parsed.neonGlow === 'vivid'
            ? parsed.neonGlow
            : 'balanced',
        calmMotion: Boolean(parsed.calmMotion),
        sakuraColor: sanitizeSakuraColor(parsed.sakuraColor),
      });
      return;
    }
  } catch {
    /* use default */
  }
  syncAtmosphereFromSettings({
    backgroundAura: 'full',
    neonGlow: 'balanced',
    calmMotion: false,
    sakuraColor: 'pink',
  });
}
