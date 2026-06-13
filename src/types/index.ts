import type { DriverStatus } from '../constants/driverStatus';

export type { DriverStatus };

export interface CpuInfo {
  name: string;
  cores: number;
  usage: number;
  per_core_usage: number[];
  frequency: number;
  temperature: number | null;
}

export interface RamModuleInfo {
  name: string;
  manufacturer: string;
  part_number: string;
  capacity_bytes: number;
  speed_mhz: number;
}

export interface MemoryInfo {
  total: number;
  used: number;
  available: number;
  usage_percent: number;
  modules: RamModuleInfo[];
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
  kind: "wifi" | "ethernet" | "other";
}

export interface NetworkInfo {
  download_speed: number;
  upload_speed: number;
  total_received: number;
  total_transmitted: number;
  interfaces: NetworkInterface[];
}

export interface SecurityInfo {
  is_protected: boolean;
  product_name: string;
}

export interface BatteryInfo {
  percentage: number;
  is_charging: boolean;
}

export interface SystemInfo {
  cpu: CpuInfo;
  memory: MemoryInfo;
  gpu: GpuInfo[];
  network: NetworkInfo;
  uptime: number;
  security: SecurityInfo;
  battery?: BatteryInfo | null;
}

export interface DnsResult {
  server_name: string;
  ip: string;
  latency_ms: number;
  is_best: boolean;
}

export type GamingVerdict =
  | 'ready'
  | 'marginal'
  | 'measuring'
  | 'local_issue'
  | 'local_network'
  | 'offline'
  | 'internet_unreachable'
  | 'high_latency';

export interface GamingLatencySnapshot {
  gateway_ip: string;
  gateway_ms: number;
  internet_ms: number;
  jitter_ms: number;
  sample_count: number;
  verdict: GamingVerdict;
  verdict_label: string;
  internet_host: string;
}

export const DEFAULT_GAMING_LATENCY: GamingLatencySnapshot = {
  gateway_ip: '',
  gateway_ms: -1,
  internet_ms: -1,
  jitter_ms: 0,
  sample_count: 0,
  verdict: 'measuring',
  verdict_label: 'measuring',
  internet_host: '1.1.1.1',
};

export interface DriverInfo {
  name: string;
  version: string;
  latest_version: string;
  date: string;
  provider: string;
  status: DriverStatus;
  category: string;
  hardware_id: string;
  hardware_ids?: string[];
  update_url: string;
  /** `windows_update` | `driver_store` | empty */
  update_source?: string;
}

export interface MetricHistory {
  timestamp: number;
  value: number;
}

export type ThemeMode = 'dark' | 'light';

export interface DnsServerItem {
  name: string;
  ip: string;
}

export interface CustomDnsServer {
  ip: string;
  label: string;
}

export const CUSTOM_DNS_DEFAULT_LABEL = 'Serveur personnel';

export const POPULAR_DNS_SERVERS: DnsServerItem[] = [
  { name: 'Google DNS', ip: '8.8.8.8' },
  { name: 'Cloudflare DNS', ip: '1.1.1.1' },
  { name: 'Quad9', ip: '9.9.9.9' },
  { name: 'OpenDNS', ip: '208.67.222.222' },
  { name: 'AdGuard DNS', ip: '94.140.14.14' },
  { name: 'CleanBrowsing', ip: '185.228.168.9' },
];

export const DEFAULT_DNS_CHECKLIST = POPULAR_DNS_SERVERS.slice(0, 4).map((s) => s.name);

const LEGACY_DNS_NAMES: Record<string, string> = {
  Google: 'Google DNS',
  Cloudflare: 'Cloudflare DNS',
};

const VALID_DNS_NAMES = new Set(POPULAR_DNS_SERVERS.map((s) => s.name));

/** Normalize legacy names, drop unknown entries, dedupe. */
export const normalizeDnsChecklist = (checklist: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const name of checklist) {
    const normalized = LEGACY_DNS_NAMES[name] ?? name;
    if (!VALID_DNS_NAMES.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result.length > 0 ? result : [...DEFAULT_DNS_CHECKLIST];
};

export const isAutoDnsChecklist = (checklist: string[]): boolean => {
  const active = normalizeDnsChecklist(checklist);
  return (
    active.length === DEFAULT_DNS_CHECKLIST.length &&
    DEFAULT_DNS_CHECKLIST.every((name) => active.includes(name))
  );
};

export type LanguageMode = 'fr' | 'en';

export type ActivityProfile = 'desktop' | 'gaming';

export type AlertDesktopSensitivity = 'low' | 'medium' | 'high';

export interface AlertThresholdSettings {
  enabled: boolean;
  desktop: {
    sensitivity: AlertDesktopSensitivity;
    cpuPercent: number;
    ramPercent: number;
    gpuPercent: number;
    cooldownSeconds: number;
  };
  gaming: {
    networkAlerts: boolean;
    internetLatencyMs: number;
    cooldownSeconds: number;
  };
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholdSettings = {
  enabled: false,
  desktop: {
    sensitivity: 'medium',
    cpuPercent: 90,
    ramPercent: 90,
    gpuPercent: 95,
    cooldownSeconds: 60,
  },
  gaming: {
    networkAlerts: true,
    internetLatencyMs: 80,
    cooldownSeconds: 90,
  },
};

export type BackgroundAura = 'off' | 'soft' | 'full';
export type NeonGlow = 'soft' | 'balanced' | 'vivid';

export interface AppSettings {
  language: LanguageMode;
  refreshInterval: number;
  dnsInterval: number;
  sakuraIntensity: 'off' | 'low' | 'medium' | 'high';
  sakuraColor: 'pink' | 'purple' | 'blue' | 'green';
  enableGlassmorphicBlur: boolean;
  backgroundAura: BackgroundAura;
  neonGlow: NeonGlow;
  calmMotion: boolean;
  dnsChecklist: string[]; // List of DNS server names
  customDns: CustomDnsServer | null;
  simplifiedMode: boolean;
  minimizeToTray: boolean;
  launchAtStartup: boolean;
  ambientMusicMuted: boolean;
  /** Afficher la rangée compacte CPU/GPU/Jeu/RAM/Actif en mode Zen */
  zenMetricsVisible: boolean;
  alertThresholds: AlertThresholdSettings;
  showDesktopWidget: boolean;
  desktopWidgetMode: 'koi' | 'zen';
}