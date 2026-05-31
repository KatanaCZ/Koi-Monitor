import { memo } from 'react';
import { Gamepad2, Signal } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DnsResult, GamingLatencySnapshot, GamingVerdict, ThemeMode } from '../../types';
import {
  buildGamingAriaLabel,
  formatGamingLatencyValue,
  getGamingLatencyRingPercent,
  getGamingVerdictStyle,
  translateVerdictLabel,
} from '../../utils/gamingLatency';
import { getNeonTextShadow } from '../../utils/neonEffects';
import { useTranslation } from '../../hooks/useTranslation';

interface DnsViaBandProps {
  useCompact: boolean;
  bestDns: DnsResult | null;
  gamingLatency: GamingLatencySnapshot;
  gamingDetailsOpen: boolean;
  onToggleGamingDetails: () => void;
  theme: ThemeMode;
}

function getDnsLatencyMetrics(latency: number, isDark: boolean, t: any) {
  if (latency < 0) {
    return {
      text: t('dns_status_expired'),
      color: 'var(--text-muted)',
      bg: isDark ? 'rgba(100, 116, 139, 0.15)' : 'rgba(100, 116, 139, 0.1)',
    };
  }
  if (latency < 50) {
    return {
      text: t('dns_status_excellent'),
      color: 'var(--neon-green-text)',
      bg: isDark ? 'rgba(0, 255, 157, 0.15)' : 'rgba(0, 128, 76, 0.1)',
    };
  }
  if (latency < 100) {
    return {
      text: t('dns_status_good'),
      color: isDark ? '#d4ff66' : '#5f7000',
      bg: isDark ? 'rgba(191, 255, 0, 0.15)' : 'rgba(95, 112, 0, 0.1)',
    };
  }
  if (latency < 200) {
    return {
      text: t('dns_status_fair'),
      color: isDark ? '#ff9a76' : '#c2410c',
      bg: isDark ? 'rgba(255, 107, 53, 0.15)' : 'rgba(194, 65, 12, 0.1)',
    };
  }
  return {
    text: t('dns_status_critical'),
    color: isDark ? '#ff6b6b' : '#dc2626',
    bg: isDark ? 'rgba(255, 51, 51, 0.15)' : 'rgba(220, 38, 38, 0.1)',
  };
}

function getDnsStatusTitle(latency: number, t: any): string {
  if (latency < 0) return t('dns_status_lost');
  if (latency < 50) return t('dns_status_excellent_title');
  if (latency < 100) return t('dns_status_good_title');
  if (latency < 200) return t('dns_status_fair_title');
  return t('dns_status_critical_title');
}

interface InlineSignalBarsProps {
  color: string;
  percent: number;
  measuring: boolean;
  compact: boolean;
}

function InlineSignalBars({ color, percent, measuring, compact }: InlineSignalBarsProps) {
  const barCount = 5;
  const activeBars = measuring
    ? 0
    : percent <= 0
      ? 0
      : Math.max(1, Math.ceil((percent / 100) * barCount));
  const barHeights = [0.45, 0.6, 0.75, 0.88, 1];
  const barH = compact ? 10 : 12;
  const barW = compact ? 2 : 2.5;

  return (
    <div
      className="flex items-end gap-0.5 shrink-0"
      style={{ height: barH }}
      aria-hidden="true"
    >
      {barHeights.map((ratio, index) => {
        const isActive = !measuring && index < activeBars;
        return (
          <div
            key={index}
            className="rounded-sm origin-bottom"
            style={{
              width: barW,
              height: Math.max(2, Math.round(barH * ratio)),
              background: isActive ? color : 'var(--ring-track)',
              boxShadow: isActive
                ? `0 0 4px color-mix(in srgb, ${color} 40%, transparent)`
                : undefined,
              opacity: measuring ? 0.45 : isActive ? 1 : 0.55,
            }}
          />
        );
      })}
    </div>
  );
}

export const DnsViaBand = memo(function DnsViaBand({
  useCompact,
  bestDns,
  gamingLatency,
  gamingDetailsOpen,
  onToggleGamingDetails,
  theme,
}: DnsViaBandProps) {
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  const gamingVerdict = gamingLatency.verdict as GamingVerdict;
  const gamingStyle = getGamingVerdictStyle(gamingVerdict);
  const gamingValue = formatGamingLatencyValue(
    gamingLatency.internet_ms,
    gamingVerdict,
  );
  const gamingRingPercent = getGamingLatencyRingPercent(gamingLatency.internet_ms);
  const gamingAriaLabel = buildGamingAriaLabel(gamingLatency);
  const isMeasuring = gamingVerdict === 'measuring';
  const gamingSubtitle = isMeasuring ? t('gaming_listening_line') : t('gaming_ping_direct');

  const panelClass = `${
    useCompact ? 'px-3 py-2.5 rounded-xl' : 'p-4 rounded-2xl'
  } border flex items-center justify-between gap-2 min-w-0 w-full bg-[var(--surface-inset)] backdrop-blur-sm transition-colors`;

  const labelClass = useCompact
    ? 'text-[10px] mb-0.5'
    : 'text-xs mb-1';
  const subtitleClass = useCompact ? 'text-[11px] leading-tight' : 'text-sm leading-tight';
  const msTextClass = useCompact ? 'text-sm' : 'text-2xl';
  const msUnitClass = useCompact ? 'text-[10px]' : 'text-xs';
  const badgeClass = useCompact
    ? 'px-1.5 py-0.5 text-[8px] max-w-[7.5rem]'
    : 'px-2 py-0.5 text-[10px] max-w-[9rem]';
  const iconSize = useCompact ? 16 : 20;

  const dnsMetrics = bestDns
    ? getDnsLatencyMetrics(bestDns.latency_ms, isDark, t)
    : {
        text: t('dns_status_pending'),
        color: 'var(--text-muted)',
        bg: isDark ? 'rgba(100, 116, 139, 0.15)' : 'rgba(100, 116, 139, 0.1)',
      };

  const dnsStatusTitle = bestDns
    ? getDnsStatusTitle(bestDns.latency_ms, t)
    : t('dns_status_waiting');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full shrink-0"
      aria-label={t('dns_via_band_title')}
    >
      <div
        className={panelClass}
        style={{
          borderColor: bestDns
            ? 'color-mix(in srgb, var(--neon-green) 30%, var(--border))'
            : 'var(--border)',
        }}
      >
        <div className="flex items-center min-w-0 gap-2 flex-1">
          <Signal size={iconSize} className="shrink-0" style={{ color: dnsMetrics.color }} />
          <div className="min-w-0">
            <p
              className={`${labelClass} uppercase font-bold tracking-widest text-[var(--text-subtle)] truncate`}
            >
              {bestDns ? `Via ${bestDns.server_name}` : t('dns_resolver_label')}
            </p>
            <p
              className={`${subtitleClass} font-semibold leading-tight truncate`}
              style={{ color: dnsMetrics.color }}
            >
              {dnsStatusTitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`${msTextClass} font-bold mono-text tracking-tight tabular-nums`}
            style={{ color: dnsMetrics.color }}
          >
            {bestDns && bestDns.latency_ms >= 0 ? bestDns.latency_ms.toFixed(0) : '---'}
            <span className={`${msUnitClass} ml-1 font-semibold`}>ms</span>
          </div>
          <div
            className="px-2 py-1 rounded border border-transparent shrink-0"
            style={{ backgroundColor: dnsMetrics.bg }}
          >
            <span
              className={`${useCompact ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase tracking-wider`}
              style={{ color: dnsMetrics.color }}
            >
              {dnsMetrics.text}
            </span>
          </div>
        </div>
      </div>

      <div
        className={panelClass}
        style={{
          borderColor: `color-mix(in srgb, ${gamingStyle.color} 30%, var(--border))`,
        }}
      >
        <div
          className="flex items-center min-w-0 gap-2 flex-1 overflow-hidden"
          role="group"
          aria-label={`${gamingAriaLabel} : ${gamingValue}`}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <Gamepad2 size={iconSize} style={{ color: gamingStyle.color }} />
            <InlineSignalBars
              color={gamingStyle.color}
              percent={gamingRingPercent}
              measuring={isMeasuring}
              compact={useCompact}
            />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p
              className={`${labelClass} uppercase font-bold tracking-widest text-[var(--text-subtle)] truncate`}
            >
              {t('gaming_label')}
            </p>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
              <p
                className={`${subtitleClass} font-semibold truncate shrink-0`}
                style={{ color: gamingStyle.textColor }}
              >
                {gamingSubtitle}
              </p>
              <button
                type="button"
                onClick={onToggleGamingDetails}
                aria-expanded={gamingDetailsOpen}
                aria-controls="gaming-latency-details"
                className={`inline-flex items-center ${badgeClass} rounded-lg font-bold tracking-wide uppercase cursor-pointer transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-green)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-inset)] truncate shrink min-w-0`}
                style={{
                  color: gamingStyle.color,
                  background: gamingStyle.badgeBg,
                  border: `1px solid ${gamingStyle.badgeBorder}`,
                  boxShadow: gamingDetailsOpen
                    ? `0 0 12px color-mix(in srgb, ${gamingStyle.color} 35%, transparent)`
                    : undefined,
                }}
              >
                {translateVerdictLabel(gamingLatency.verdict_label, t)}
              </button>
            </div>
          </div>
        </div>
        <div
          className={`${msTextClass} font-bold mono-text tracking-tight shrink-0 tabular-nums`}
          style={{
            color: gamingStyle.textColor,
            textShadow: getNeonTextShadow(gamingStyle.color, isDark),
          }}
        >
          {gamingLatency.internet_ms >= 0
            ? gamingLatency.internet_ms.toFixed(0)
            : '---'}
          <span className={`${msUnitClass} ml-1 font-semibold`}>ms</span>
        </div>
      </div>
    </motion.div>
  );
});
