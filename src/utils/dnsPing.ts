import { dnsService } from '../services/api';
import {
  POPULAR_DNS_SERVERS,
  normalizeDnsChecklist,
  CUSTOM_DNS_DEFAULT_LABEL,
  isAutoDnsChecklist,
} from '../types';
import type { CustomDnsServer, DnsResult, DnsServerItem } from '../types';
import type { TranslateFn } from './translations';

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/;

/** IPv4 valide pour un serveur DNS personnalisé (aligné sur la validation Rust). */
export function isValidCustomDnsIpv4(ip: string): boolean {
  const trimmed = ip.trim();
  if (!IPV4_RE.test(trimmed)) return false;

  const [a, b] = trimmed.split('.').map((part) => Number(part));
  if (a === 0 || a === 127) return false;
  if (a >= 224) return false;
  if (a === 169 && b === 254) return false;
  return true;
}

export function getDnsTestModeLabel(checklist: string[], t: TranslateFn): string {
  const active = normalizeDnsChecklist(checklist);

  if (isAutoDnsChecklist(checklist)) return t('dns_mode_auto');

  if (active.length === POPULAR_DNS_SERVERS.length) {
    return t('dns_mode_all');
  }

  if (active.length === 1) return t('dns_mode_one');

  return t('dns_mode_count', { count: active.length });
}

export function buildActiveDnsServers(
  checklist: string[],
  customDns: CustomDnsServer | null,
): DnsServerItem[] {
  const active = normalizeDnsChecklist(checklist);
  const presets = POPULAR_DNS_SERVERS.filter((srv) => active.includes(srv.name));
  const ip = customDns?.ip?.trim() ?? '';
  if (!ip || !isValidCustomDnsIpv4(ip)) return presets;

  const label = customDns?.label?.trim() || CUSTOM_DNS_DEFAULT_LABEL;
  return [...presets, { name: label, ip }];
}

export async function pingActiveDns(
  checklist: string[],
  customDns: CustomDnsServer | null,
): Promise<DnsResult[]> {
  const activeServers = buildActiveDnsServers(checklist, customDns);
  return dnsService.pingAllDns(activeServers);
}

export interface DnsPingSessionCallbacks {
  onSuccess: (results: DnsResult[]) => void;
  onError?: () => void;
  toast?: (message: string) => void;
}

/** Ping DNS actif avec gestion d'erreur partagée (App + poller). */
export async function runDnsPingSession(
  checklist: string[],
  customDns: CustomDnsServer | null,
  callbacks: DnsPingSessionCallbacks,
  options?: { errorMessage?: string },
): Promise<void> {
  try {
    const results = await pingActiveDns(checklist, customDns);
    callbacks.onSuccess(results);
  } catch (error) {
    console.error('Failed to fetch DNS info:', error);
    callbacks.onError?.();
    callbacks.toast?.(
      options?.errorMessage ?? 'Test DNS indisponible — réessayez dans quelques secondes',
    );
  }
}

/** @deprecated Préférer pingActiveDns avec customDns */
export async function pingDnsChecklist(checklist: string[]): Promise<DnsResult[]> {
  return pingActiveDns(checklist, null);
}
