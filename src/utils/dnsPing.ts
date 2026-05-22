import { dnsService } from '../services/api';
import { POPULAR_DNS_SERVERS, normalizeDnsChecklist } from '../types';
import type { DnsResult } from '../types';

export async function pingDnsChecklist(checklist: string[]): Promise<DnsResult[]> {
  const active = normalizeDnsChecklist(checklist);
  const activeServers = POPULAR_DNS_SERVERS.filter((srv) => active.includes(srv.name));
  return dnsService.pingAllDns(activeServers);
}
