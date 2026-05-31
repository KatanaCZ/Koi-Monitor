import { invoke } from '@tauri-apps/api/core';
import { SystemInfo, DnsResult, DriverInfo, GamingLatencySnapshot } from '../types';
import { KOI_KOFI_URL } from '../utils/koiLinks';
import { isSafeDonationUrl } from '../utils/safeUrl';

export const GAMING_LATENCY_EVENT = 'gaming-latency-update';

export const systemService = {
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      return await invoke<SystemInfo>('get_system_info');
    } catch (error) {
      console.error('Failed to get system info:', error);
      throw error;
    }
  },
};

export const dnsService = {
  async pingAllDns(servers?: { name: string; ip: string }[]): Promise<DnsResult[]> {
    try {
      return await invoke<DnsResult[]>('ping_all_dns', { servers });
    } catch (error) {
      console.error('Failed to ping all DNS servers:', error);
      throw error;
    }
  },
};

export const driverService = {
  async getDrivers(
    simplified: boolean,
    force = false,
    enrich = false,
  ): Promise<DriverInfo[]> {
    try {
      return await invoke<DriverInfo[]>('get_drivers', { simplified, force, enrich });
    } catch (error) {
      console.error('Failed to get drivers:', error);
      throw error;
    }
  },

  async openWindowsUpdate(): Promise<void> {
    try {
      await invoke('open_windows_update');
    } catch (error) {
      console.error('Failed to open Windows Update:', error);
      throw error;
    }
  },
};

export const gamingLatencyService = {
  async getSnapshot(): Promise<GamingLatencySnapshot> {
    try {
      return await invoke<GamingLatencySnapshot>('get_gaming_latency');
    } catch (error) {
      console.error('Failed to get gaming latency:', error);
      throw error;
    }
  },
};

export const appService = {
  async getIconPng(): Promise<number[]> {
    return invoke<number[]>('get_app_icon_png');
  },

  async openDonationPage(): Promise<void> {
    if (!isSafeDonationUrl(KOI_KOFI_URL)) {
      throw new Error('Unsafe donation URL');
    }
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(KOI_KOFI_URL);
    } catch (error) {
      console.error('Failed to open donation page:', error);
      throw error;
    }
  },
};