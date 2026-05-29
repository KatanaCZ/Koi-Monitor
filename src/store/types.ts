import { SystemInfo, DnsResult, DriverInfo, ThemeMode, AppSettings, GamingLatencySnapshot, ActivityProfile } from '../types';
import { NotificationLogEntry, NotificationSource } from '../utils/notificationLog';
import { HistoryRing } from './historyRing';

export type StatusToastType = 'success' | 'warning' | 'error';

export interface StatusToastState {
  message: string;
  type: StatusToastType;
  source: NotificationSource;
}

export interface PushStatusToastOptions {
  source?: NotificationSource;
  skipLog?: boolean;
}

export interface AppState {
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
