import type { GamingVerdict } from '../types';

export function getGamingVerdictStyle(verdict: GamingVerdict): {
  color: string;
  textColor: string;
  badgeBg: string;
  badgeBorder: string;
} {
  switch (verdict) {
    case 'ready':
      return {
        color: 'var(--neon-green)',
        textColor: 'var(--neon-green-text)',
        badgeBg: 'color-mix(in srgb, var(--neon-green) 20%, transparent)',
        badgeBorder: 'color-mix(in srgb, var(--neon-green) 50%, transparent)',
      };
    case 'marginal':
      return {
        color: '#fbbf24',
        textColor: '#fde68a',
        badgeBg: 'color-mix(in srgb, #fbbf24 20%, transparent)',
        badgeBorder: 'color-mix(in srgb, #fbbf24 50%, transparent)',
      };
    case 'local_issue':
      return {
        color: '#fb923c',
        textColor: '#fdba74',
        badgeBg: 'color-mix(in srgb, #fb923c 20%, transparent)',
        badgeBorder: 'color-mix(in srgb, #fb923c 50%, transparent)',
      };
    case 'poor':
      return {
        color: '#f87171',
        textColor: '#fca5a5',
        badgeBg: 'color-mix(in srgb, #f87171 20%, transparent)',
        badgeBorder: 'color-mix(in srgb, #f87171 50%, transparent)',
      };
    default:
      return {
        color: 'var(--neon-green)',
        textColor: 'var(--text-muted)',
        badgeBg: 'color-mix(in srgb, var(--neon-green) 12%, transparent)',
        badgeBorder: 'color-mix(in srgb, var(--neon-green) 30%, transparent)',
      };
  }
}

export function getGamingLatencyRingPercent(latencyMs: number): number {
  if (latencyMs < 0) return 0;
  return Math.min(100, Math.max(8, 100 - (latencyMs / 120) * 100));
}

export function formatLatencyReading(ms: number): string {
  if (ms < 0) return '—';
  return `${ms.toFixed(0)} ms`;
}

export function formatJitterReading(jitterMs: number, sampleCount: number): string {
  if (sampleCount < 2) return '—';
  return `${jitterMs.toFixed(1)} ms`;
}

export function getGamingMetricTone(
  ms: number,
  kind: 'gateway' | 'internet' | 'jitter',
  sampleCount = 0,
): string {
  if (ms < 0) return 'var(--text-muted)';
  if (kind === 'jitter' && sampleCount < 2) return 'var(--text-muted)';
  if (kind === 'gateway' && ms > 25) return '#fb923c';
  if (kind === 'internet' && ms > 100) return '#f87171';
  if (kind === 'internet' && ms > 60) return '#fbbf24';
  if (kind === 'jitter' && ms > 20) return '#fbbf24';
  return 'var(--neon-green)';
}

export function formatGamingLatencyValue(
  internetMs: number,
  verdict: GamingVerdict,
): string {
  if (internetMs >= 0) {
    return `${internetMs.toFixed(0)} ms`;
  }
  if (verdict === 'measuring') {
    return '---';
  }
  return 'N/A';
}

export function buildGamingAriaLabel(
  snapshot: {
    internet_ms: number;
    jitter_ms: number;
    gateway_ms: number;
    verdict_label: string;
  },
): string {
  const parts = [`Latence jeu : ${snapshot.verdict_label}`];
  if (snapshot.internet_ms >= 0) {
    parts.push(`Internet ${snapshot.internet_ms.toFixed(0)} ms`);
  }
  if (snapshot.jitter_ms > 0) {
    parts.push(`jitter ${snapshot.jitter_ms.toFixed(1)} ms`);
  }
  if (snapshot.gateway_ms >= 0) {
    parts.push(`passerelle ${snapshot.gateway_ms.toFixed(0)} ms`);
  }
  return parts.join(', ');
}

export function translateVerdictLabel(label: string, t: any): string {
  if (!label) return label;
  const cleanLabel = label.trim();
  if (cleanLabel.startsWith('Mesure')) return t('verdict_measuring');
  if (cleanLabel === 'Hors ligne') return t('verdict_offline');
  if (cleanLabel.includes('Wi-Fi') || cleanLabel.includes('Wi\u2011Fi') || cleanLabel.includes('box')) return t('verdict_local_issue');
  if (cleanLabel === 'Réseau local') return t('verdict_local_network');
  if (cleanLabel.startsWith('Internet')) return t('verdict_internet_unreachable');
  if (cleanLabel === 'Latence élevée') return t('verdict_high_latency');
  if (cleanLabel === 'Limite ranked') return t('verdict_marginal');
  if (cleanLabel === 'Prêt pour le jeu') return t('verdict_ready');
  return label;
}
