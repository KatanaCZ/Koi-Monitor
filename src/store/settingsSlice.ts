import { StateCreator } from 'zustand';
import { AppState } from './types';
import { ThemeMode, AppSettings, DEFAULT_DNS_CHECKLIST, DEFAULT_ALERT_THRESHOLDS, LanguageMode } from '../types';
import { sanitizeAppSettings } from '../utils/settingsOptions';

export interface SettingsSlice {
  theme: ThemeMode;
  settings: AppSettings;
  setTheme: (theme: ThemeMode) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

export const detectSystemLanguage = (): LanguageMode => {
  if (typeof navigator === 'undefined') return 'en';
  const lang = (navigator.language || '').toLowerCase();
  return lang.startsWith('fr') ? 'fr' : 'en';
};

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en', // Will be overridden dynamically on load if no saved settings
  refreshInterval: 2000,
  dnsInterval: 15000,
  sakuraIntensity: 'medium',
  sakuraColor: 'pink',
  enableGlassmorphicBlur: true,
  backgroundAura: 'full',
  neonGlow: 'balanced',
  calmMotion: false,
  dnsChecklist: [...DEFAULT_DNS_CHECKLIST],
  customDns: null,
  simplifiedMode: true,
  minimizeToTray: false,
  launchAtStartup: false,
  ambientMusicMuted: false,
  zenMetricsVisible: true,
  alertThresholds: { ...DEFAULT_ALERT_THRESHOLDS },
};

export const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem('koi_settings');
    const detectedLang = detectSystemLanguage();
    const defaultWithDetected: AppSettings = {
      ...DEFAULT_SETTINGS,
      language: detectedLang,
    };
    if (saved) {
      const parsed = JSON.parse(saved);
      const sanitized = sanitizeAppSettings({ ...defaultWithDetected, ...parsed });
      if (JSON.stringify(sanitized) !== JSON.stringify({ ...defaultWithDetected, ...parsed })) {
        localStorage.setItem('koi_settings', JSON.stringify(sanitized));
      }
      return sanitized;
    } else {
      localStorage.setItem('koi_settings', JSON.stringify(defaultWithDetected));
      return defaultWithDetected;
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { ...DEFAULT_SETTINGS, language: detectSystemLanguage() };
};

export const createSettingsSlice: StateCreator<
  AppState,
  [],
  [],
  SettingsSlice
> = (set) => ({
  theme: (localStorage.getItem('koi_theme') as ThemeMode) || 'dark',
  settings: loadSettings(),

  setTheme: (theme) => {
    localStorage.setItem('koi_theme', theme);
    set({ theme });
  },

  updateSettings: (newSettings) =>
    set((state) => {
      const updated = sanitizeAppSettings({
        ...state.settings,
        ...newSettings,
        alertThresholds: {
          ...state.settings.alertThresholds,
          ...newSettings.alertThresholds,
          desktop: {
            ...state.settings.alertThresholds.desktop,
            ...newSettings.alertThresholds?.desktop,
          },
          gaming: {
            ...state.settings.alertThresholds.gaming,
            ...newSettings.alertThresholds?.gaming,
          },
        },
      });
      try {
        localStorage.setItem('koi_settings', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save settings:', e);
      }
      return { settings: updated };
    }),
});
