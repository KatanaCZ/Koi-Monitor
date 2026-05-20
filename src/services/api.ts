import { invoke } from '@tauri-apps/api/core';
import { SystemInfo, DnsResult, DriverInfo } from '../types';

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
  async pingAllDns(): Promise<DnsResult[]> {
    try {
      return await invoke<DnsResult[]>('ping_all_dns');
    } catch (error) {
      console.error('Failed to ping all DNS servers:', error);
      throw error;
    }
  },
};

export const driverService = {
  async getDrivers(simplified: boolean): Promise<DriverInfo[]> {
    try {
      return await invoke<DriverInfo[]>('get_drivers', { simplified });
    } catch (error) {
      console.error('Failed to get drivers:', error);
      throw error;
    }
  },
};