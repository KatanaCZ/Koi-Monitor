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

export interface SystemInfo {
  cpu: CpuInfo;
  memory: MemoryInfo;
  gpu: GpuInfo[];
  network: NetworkInfo;
  uptime: number;
  security: SecurityInfo;
}

export interface DnsResult {
  server_name: string;
  ip: string;
  latency_ms: number;
  status: string;
  is_best: boolean;
}

export type GamingVerdict =
  | 'ready'
  | 'marginal'
  | 'poor'
  | 'local_issue'
  | 'measuring';

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
  verdict_label: 'Mesure…',
  internet_host: '1.1.1.1',
};

export interface DriverInfo {
  name: string;
  version: string;
  latest_version: string;
  date: string;
  provider: string;
  status: string;
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

export const getDnsTestModeLabel = (checklist: string[]): string => {
  const active = normalizeDnsChecklist(checklist);

  if (isAutoDnsChecklist(checklist)) return "Test auto";

  if (active.length === POPULAR_DNS_SERVERS.length) {
    return "Tous les serveurs";
  }

  if (active.length === 1) return "1 serveur";

  return `${active.length} serveurs`;
};

export interface AppSettings {
  refreshInterval: number;
  dnsInterval: number;
  sakuraIntensity: 'off' | 'low' | 'medium' | 'high';
  sakuraColor: 'pink' | 'purple' | 'blue' | 'green';
  enableGlassmorphicBlur: boolean;
  dnsChecklist: string[]; // List of DNS server names
  simplifiedMode: boolean;
}