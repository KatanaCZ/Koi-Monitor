export interface CpuInfo {
  name: string;
  cores: number;
  usage: number;
  per_core_usage: number[];
  frequency: number;
}

export interface MemoryInfo {
  total: number;
  used: number;
  available: number;
  usage_percent: number;
}

export interface GpuInfo {
  name: string;
  usage: number;
  memory_used: number;
  memory_total: number;
  temperature: number | null;
}

export interface NetworkInterface {
  name: string;
  received: number;
  transmitted: number;
}

export interface NetworkInfo {
  download_speed: number;
  upload_speed: number;
  total_received: number;
  total_transmitted: number;
  interfaces: NetworkInterface[];
}

export interface SystemInfo {
  cpu: CpuInfo;
  memory: MemoryInfo;
  gpu: GpuInfo[];
  network: NetworkInfo;
  uptime: number;
}

export interface DnsResult {
  server_name: string;
  ip: string;
  latency_ms: number;
  status: string;
  is_best: boolean;
}

export interface DriverInfo {
  name: string;
  version: string;
  date: string;
  provider: string;
  status: string;
  category: string;
  hardware_id: string;
  update_url: string;
}

export interface MetricHistory {
  timestamp: number;
  value: number;
}

export type ThemeMode = 'dark' | 'light';

export interface AppSettings {
  refreshInterval: number;
  dnsInterval: number;
  sakuraIntensity: 'off' | 'low' | 'medium' | 'high';
  enableGlassmorphicBlur: boolean;
  dnsChecklist: string[];
  simplifiedMode: boolean;
}