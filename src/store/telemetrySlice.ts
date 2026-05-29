import { StateCreator } from 'zustand';
import { AppState } from './types';
import { SystemInfo, DnsResult, DriverInfo, GamingLatencySnapshot, DEFAULT_GAMING_LATENCY } from '../types';
import { createHistoryRing, pushHistoryRing, HistoryRing } from './historyRing';

export interface TelemetrySlice {
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
  setSystemInfo: (info: SystemInfo) => void;
  applyTelemetrySnapshot: (info: SystemInfo, recordHistory: boolean) => void;
  setDnsResults: (results: DnsResult[]) => void;
  setGamingLatency: (snapshot: GamingLatencySnapshot) => void;
  setDnsFetchAttempted: (attempted: boolean) => void;
  setDrivers: (drivers: DriverInfo[]) => void;
  setLoading: (loading: boolean) => void;
}

export const createTelemetrySlice: StateCreator<
  AppState,
  [],
  [],
  TelemetrySlice
> = (set) => ({
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

  setSystemInfo: (info) =>
    set((state) => {
      let filtered = info;
      if (state.zenMode) {
        filtered = {
          ...info,
          cpu: { ...info.cpu, per_core_usage: [] },
          memory: { ...info.memory, modules: [] },
          network: { ...info.network, interfaces: [] },
        };
      }
      return { systemInfo: filtered };
    }),

  applyTelemetrySnapshot: (info, recordHistory) =>
    set((state) => {
      let filtered = info;
      if (state.zenMode) {
        filtered = {
          ...info,
          cpu: { ...info.cpu, per_core_usage: [] },
          memory: { ...info.memory, modules: [] },
          network: { ...info.network, interfaces: [] },
        };
      }

      if (!recordHistory) {
        return { systemInfo: filtered };
      }

      const next: Partial<AppState> = {
        systemInfo: filtered,
        networkDownloadRing: pushHistoryRing(
          state.networkDownloadRing,
          filtered.network.download_speed,
        ),
        networkUploadRing: pushHistoryRing(
          state.networkUploadRing,
          filtered.network.upload_speed,
        ),
      };

      if (filtered.cpu) {
        next.cpuHistoryRing = pushHistoryRing(state.cpuHistoryRing, filtered.cpu.usage);
      }
      if (filtered.memory) {
        next.ramHistoryRing = pushHistoryRing(
          state.ramHistoryRing,
          filtered.memory.usage_percent,
        );
      }
      if (filtered.gpu && filtered.gpu.length > 0) {
        const maxGpuUsage = Math.max(...filtered.gpu.map((g) => g.usage));
        next.gpuHistoryRing = pushHistoryRing(state.gpuHistoryRing, maxGpuUsage);
      }

      return next;
    }),

  setDnsResults: (results) => set({ dnsResults: results, dnsFetchAttempted: true }),

  setGamingLatency: (gamingLatency) => set({ gamingLatency }),

  setDnsFetchAttempted: (dnsFetchAttempted) => set({ dnsFetchAttempted }),

  setDrivers: (drivers) => set({ drivers }),

  setLoading: (loading) => set({ isLoading: loading }),
});
