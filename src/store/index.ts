import { create } from 'zustand';
import { SystemInfo, DnsResult, DriverInfo, ThemeMode, AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  refreshInterval: 2000,
  dnsInterval: 15000,
  sakuraIntensity: 'medium',
  enableGlassmorphicBlur: true,
  dnsChecklist: ['Google', 'Cloudflare', 'Quad9', 'OpenDNS'],
  simplifiedMode: false,
};

const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem('koi_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
};

interface AppState {
  theme: ThemeMode;
  settings: AppSettings;
  systemInfo: SystemInfo | null;
  dnsResults: DnsResult[];
  drivers: DriverInfo[];
  isLoading: boolean;
  cpuHistory: { timestamp: number; value: number }[];
  ramHistory: { timestamp: number; value: number }[];
  gpuHistory: { timestamp: number; value: number }[];
  networkDownloadHistory: { timestamp: number; value: number }[];
  networkUploadHistory: { timestamp: number; value: number }[];
  setTheme: (theme: ThemeMode) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setSystemInfo: (info: SystemInfo) => void;
  setDnsResults: (results: DnsResult[]) => void;
  setDrivers: (drivers: DriverInfo[]) => void;
  setLoading: (loading: boolean) => void;
  addCpuHistory: (value: number) => void;
  addRamHistory: (value: number) => void;
  addGpuHistory: (value: number) => void;
  addNetworkHistory: (download: number, upload: number) => void;
}

const MAX_HISTORY_POINTS = 288;

export const useAppStore = create<AppState>((set) => ({
  theme: (localStorage.getItem('koi_theme') as ThemeMode) || 'dark',
  settings: loadSettings(),
  systemInfo: null,
  dnsResults: [],
  drivers: [],
  isLoading: false,
  cpuHistory: [],
  ramHistory: [],
  gpuHistory: [],
  networkDownloadHistory: [],
  networkUploadHistory: [],

  setTheme: (theme) => {
    localStorage.setItem('koi_theme', theme);
    set({ theme });
  },

  updateSettings: (newSettings) =>
    set((state) => {
      const updated = { ...state.settings, ...newSettings };
      try {
        localStorage.setItem('koi_settings', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save settings:', e);
      }
      return { settings: updated };
    }),

  setSystemInfo: (info) => set({ systemInfo: info }),

  setDnsResults: (results) => set({ dnsResults: results }),

  setDrivers: (drivers) => set({ drivers }),

  setLoading: (loading) => set({ isLoading: loading }),

  addCpuHistory: (value) =>
    set((state) => ({
      cpuHistory: [
        ...state.cpuHistory.slice(-(MAX_HISTORY_POINTS - 1)),
        { timestamp: Date.now(), value },
      ],
    })),

  addRamHistory: (value) =>
    set((state) => ({
      ramHistory: [
        ...state.ramHistory.slice(-(MAX_HISTORY_POINTS - 1)),
        { timestamp: Date.now(), value },
      ],
    })),

  addGpuHistory: (value) =>
    set((state) => ({
      gpuHistory: [
        ...state.gpuHistory.slice(-(MAX_HISTORY_POINTS - 1)),
        { timestamp: Date.now(), value },
      ],
    })),

  addNetworkHistory: (download, upload) =>
    set((state) => ({
      networkDownloadHistory: [
        ...state.networkDownloadHistory.slice(-(MAX_HISTORY_POINTS - 1)),
        { timestamp: Date.now(), value: download },
      ],
      networkUploadHistory: [
        ...state.networkUploadHistory.slice(-(MAX_HISTORY_POINTS - 1)),
        { timestamp: Date.now(), value: upload },
      ],
    })),
}));