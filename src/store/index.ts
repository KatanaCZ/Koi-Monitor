import { create } from 'zustand';
import { SystemInfo, DnsResult, DriverInfo, ThemeMode, AppSettings, DEFAULT_DNS_CHECKLIST, GamingLatencySnapshot, DEFAULT_GAMING_LATENCY } from '../types';
import { sanitizeAppSettings } from '../utils/settingsOptions';
import {
  createHistoryRing,
  pushHistoryRing,
  ringToArray,
  type HistoryRing,
  type HistoryPoint,
} from './historyRing';

export type { HistoryPoint };

const DEFAULT_SETTINGS: AppSettings = {
  refreshInterval: 2000,
  dnsInterval: 15000,
  sakuraIntensity: 'medium',
  sakuraColor: 'pink',
  enableGlassmorphicBlur: true,
  dnsChecklist: [...DEFAULT_DNS_CHECKLIST],
  simplifiedMode: true,
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
  statusToast: { message: string; type: StatusToastType } | null;
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
  pushStatusToast: (message: string, type?: StatusToastType) => void;
  clearStatusToast: () => void;
}

export const selectCpuHistory = (s: AppState): HistoryPoint[] =>
  ringToArray(s.cpuHistoryRing);

export const selectRamHistory = (s: AppState): HistoryPoint[] =>
  ringToArray(s.ramHistoryRing);

export const selectGpuHistory = (s: AppState): HistoryPoint[] =>
  ringToArray(s.gpuHistoryRing);

export const selectNetworkDownloadHistory = (s: AppState): HistoryPoint[] =>
  ringToArray(s.networkDownloadRing);

export const selectNetworkUploadHistory = (s: AppState): HistoryPoint[] =>
  ringToArray(s.networkUploadRing);

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
  statusToast: null,

  setTheme: (theme) => {
    localStorage.setItem('koi_theme', theme);
    set({ theme });
  },

  updateSettings: (newSettings) =>
    set((state) => {
      const updated = sanitizeAppSettings({ ...state.settings, ...newSettings });
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

  pushStatusToast: (message, type = 'warning') => set({ statusToast: { message, type } }),

  clearStatusToast: () => set({ statusToast: null }),
}));
