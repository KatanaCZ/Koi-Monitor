import { create } from 'zustand';
import { SystemInfo, DnsResult, DriverInfo, ThemeMode, AppSettings, DEFAULT_DNS_CHECKLIST, DEFAULT_ALERT_THRESHOLDS, GamingLatencySnapshot, DEFAULT_GAMING_LATENCY, ActivityProfile } from '../types';
import { sanitizeAppSettings } from '../utils/settingsOptions';
import {
  createNotificationEntry,
  prependNotificationLog,
  shouldSkipNotificationLog,
  type NotificationLogEntry,
  type NotificationSource,
} from '../utils/notificationLog';
import {
  createHistoryRing,
  pushHistoryRing,
  type HistoryRing,
  type HistoryPoint,
} from './historyRing';

export type { HistoryPoint, NotificationLogEntry, NotificationSource };

export interface PushStatusToastOptions {
  source?: NotificationSource;
  skipLog?: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
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

const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem('koi_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      const sanitized = sanitizeAppSettings({ ...DEFAULT_SETTINGS, ...parsed });
      if (JSON.stringify(sanitized) !== JSON.stringify({ ...DEFAULT_SETTINGS, ...parsed })) {
        localStorage.setItem('koi_settings', JSON.stringify(sanitized));
      }
      return sanitized;
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
};

export type StatusToastType = 'success' | 'warning' | 'error';

export interface StatusToastState {
  message: string;
  type: StatusToastType;
  source: NotificationSource;
}

interface AppState {
  theme: ThemeMode;
  settings: AppSettings;
  systemInfo: SystemInfo | null;
  dnsResults: DnsResult[];
  gamingLatency: GamingLatencySnapshot;
  drivers: DriverInfo[];
  isLoading: boolean;
  dnsFetchAttempted: boolean;
  cpuHistoryRing: HistoryRing;
  ramHistoryRing: HistoryRing;
  gpuHistoryRing: HistoryRing;
  networkDownloadRing: HistoryRing;
  networkUploadRing: HistoryRing;
  zenMode: boolean;
  activityProfile: ActivityProfile;
  statusToast: StatusToastState | null;
  notificationLog: NotificationLogEntry[];
  notificationPanelOpen: boolean;
  easterMusicActive: boolean;
  /** Incrémenté pour reset le tracker Zen (sim dev, entrée mode Zen). */
  zenTrackerResetSeq: number;
  setTheme: (theme: ThemeMode) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setSystemInfo: (info: SystemInfo) => void;
  applyTelemetrySnapshot: (info: SystemInfo, recordHistory: boolean) => void;
  setDnsResults: (results: DnsResult[]) => void;
  setGamingLatency: (snapshot: GamingLatencySnapshot) => void;
  setDnsFetchAttempted: (attempted: boolean) => void;
  setDrivers: (drivers: DriverInfo[]) => void;
  setLoading: (loading: boolean) => void;
  setZenMode: (zen: boolean) => void;
  setActivityProfile: (profile: ActivityProfile) => void;
  pushStatusToast: (
    message: string,
    type?: StatusToastType,
    options?: PushStatusToastOptions,
  ) => void;
  clearStatusToast: () => void;
  setNotificationPanelOpen: (open: boolean) => void;
  setEasterMusicActive: (active: boolean) => void;
  bumpZenTrackerReset: () => void;
  markNotificationsRead: () => void;
  clearNotificationLog: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: (localStorage.getItem('koi_theme') as ThemeMode) || 'dark',
  settings: loadSettings(),
  systemInfo: null,
  dnsResults: [],
  gamingLatency: DEFAULT_GAMING_LATENCY,
  drivers: [],
  isLoading: false,
  dnsFetchAttempted: false,
  cpuHistoryRing: createHistoryRing(),
  ramHistoryRing: createHistoryRing(),
  gpuHistoryRing: createHistoryRing(),
  networkDownloadRing: createHistoryRing(),
  networkUploadRing: createHistoryRing(),
  zenMode: false,
  activityProfile: 'desktop',
  statusToast: null,
  notificationLog: [],
  notificationPanelOpen: false,
  easterMusicActive: false,
  zenTrackerResetSeq: 0,

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

  setSystemInfo: (info) => set({ systemInfo: info }),

  applyTelemetrySnapshot: (info, recordHistory) =>
    set((state) => {
      if (!recordHistory) {
        return { systemInfo: info };
      }

      const next: Partial<AppState> = {
        systemInfo: info,
        networkDownloadRing: pushHistoryRing(
          state.networkDownloadRing,
          info.network.download_speed,
        ),
        networkUploadRing: pushHistoryRing(
          state.networkUploadRing,
          info.network.upload_speed,
        ),
      };

      if (info.cpu) {
        next.cpuHistoryRing = pushHistoryRing(state.cpuHistoryRing, info.cpu.usage);
      }
      if (info.memory) {
        next.ramHistoryRing = pushHistoryRing(
          state.ramHistoryRing,
          info.memory.usage_percent,
        );
      }
      if (info.gpu && info.gpu.length > 0) {
        next.gpuHistoryRing = pushHistoryRing(state.gpuHistoryRing, info.gpu[0].usage);
      }

      return next;
    }),

  setDnsResults: (results) => set({ dnsResults: results, dnsFetchAttempted: true }),

  setGamingLatency: (gamingLatency) => set({ gamingLatency }),

  setDnsFetchAttempted: (dnsFetchAttempted) => set({ dnsFetchAttempted }),

  setDrivers: (drivers) => set({ drivers }),

  setLoading: (loading) => set({ isLoading: loading }),

  setZenMode: (zenMode) => set({ zenMode }),

  setActivityProfile: (activityProfile) => set({ activityProfile }),

  pushStatusToast: (message, type = 'warning', options) =>
    set((state) => {
      const source = options?.source ?? 'system';
      const now = Date.now();
      const isDuplicate = shouldSkipNotificationLog(state.notificationLog, message, now);
      let notificationLog = state.notificationLog;

      if (!options?.skipLog && !isDuplicate) {
        notificationLog = prependNotificationLog(
          notificationLog,
          createNotificationEntry(message, type, source, now),
        );
      }

      if (isDuplicate) {
        return { notificationLog };
      }

      return {
        statusToast: { message, type, source },
        notificationLog,
      };
    }),

  clearStatusToast: () => set({ statusToast: null }),

  setNotificationPanelOpen: (notificationPanelOpen) => set({ notificationPanelOpen }),

  setEasterMusicActive: (easterMusicActive) => set({ easterMusicActive }),

  bumpZenTrackerReset: () =>
    set((state) => ({ zenTrackerResetSeq: state.zenTrackerResetSeq + 1 })),

  markNotificationsRead: () =>
    set((state) => ({
      notificationLog: state.notificationLog.map((entry) =>
        entry.read ? entry : { ...entry, read: true },
      ),
    })),

  clearNotificationLog: () => set({ notificationLog: [] }),
}));
