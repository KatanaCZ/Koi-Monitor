import { useMemo, useState, useCallback, useEffect, memo } from 'react';
import { Wifi, Crown, Signal, Maximize2, Minimize2, Settings2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store';
import { NeonBentoCard } from '../common';
import { GamingLatencyBreakdown } from '../common/GamingLatencyBreakdown';
import { getDnsTestModeLabel } from '../../utils/dnsPing';
import { isAutoDnsChecklist } from '../../types';
import { DnsViaBand } from './DnsViaBand';
import {
  getDnsWidgetCardHeight,
  getDnsWidgetCardStyle,
} from '../../utils/dnsWidgetLayout';
import { useTranslation } from '../../hooks/useTranslation';

interface DnsWidgetProps {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onAutoTest?: () => void | Promise<void>;
  onCustomize?: () => void;
  onLayoutHeightChange?: (height: number | null) => void;
}

export const DnsWidget = memo(function DnsWidget({
  isExpanded = false,
  onToggleExpand,
  onAutoTest,
  onCustomize,
  onLayoutHeightChange,
}: DnsWidgetProps) {
  const { t } = useTranslation();
  const dnsResults = useAppStore((s) => s.dnsResults);
  const gamingLatency = useAppStore((s) => s.gamingLatency);
  const theme = useAppStore((s) => s.theme);
  const dnsChecklist = useAppStore((s) => s.settings.dnsChecklist);
  const [isPinging, setIsPinging] = useState(false);
  const [gamingDetailsOpen, setGamingDetailsOpen] = useState(false);

  const themeColor = 'var(--neon-green)';
  const isDark = theme === 'dark';
  const useCompact = !isExpanded && dnsResults.length > 3;
  const useDenseGrid = useCompact && dnsResults.length >= 5;
  const isAutoTest = useMemo(
    () => isAutoDnsChecklist(dnsChecklist),
    [dnsChecklist],
  );
  const testModeLabel = useMemo(
    () => getDnsTestModeLabel(dnsChecklist, t),
    [dnsChecklist, t],
  );

  const bestDns = useMemo(
    () => (dnsResults.length > 0 ? dnsResults.find((d) => d.is_best) ?? dnsResults[0] : null),
    [dnsResults],
  );

  const closeGamingDetails = useCallback(() => {
    setGamingDetailsOpen(false);
  }, []);

  const toggleGamingDetails = useCallback(() => {
    setGamingDetailsOpen((open) => !open);
  }, []);

  useEffect(() => {
    if (!gamingDetailsOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeGamingDetails();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [gamingDetailsOpen, closeGamingDetails]);

  const handleAutoTest = async () => {
    if (!onAutoTest || isPinging) return;
    setIsPinging(true);
    try {
      await onAutoTest();
    } finally {
      setIsPinging(false);
    }
  };

  const getLatencyMetrics = (latency: number) => {
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
  };

  const getLatencyStatus = (latency: number) => getLatencyMetrics(latency);

  const dnsCount = dnsResults.length;

  const cardHeight = useMemo(
    () => getDnsWidgetCardHeight(dnsCount, gamingDetailsOpen, isExpanded),
    [dnsCount, gamingDetailsOpen, isExpanded],
  );

  const cardSizeClass = isExpanded
    ? 'w-full max-w-5xl h-auto shadow-2xl'
    : 'h-full w-full min-h-0';

  const cardStyle = getDnsWidgetCardStyle(cardHeight);

  useEffect(() => {
    onLayoutHeightChange?.(cardHeight);
  }, [cardHeight, onLayoutHeightChange]);

  const listClassName = useCompact
    ? 'flex flex-wrap justify-center gap-2 w-full min-h-0'
    : 'flex flex-wrap justify-center gap-4 w-full min-h-0';

  const compactCardWidth = useDenseGrid
    ? 'w-full sm:w-[calc(50%-0.25rem)] lg:w-[calc(33.333%-0.34rem)]'
    : 'w-full sm:w-[calc(50%-0.25rem)]';

  const bodyClassName = isExpanded
    ? 'flex flex-col gap-1.5 w-full shrink-0'
    : 'flex flex-1 flex-col min-h-0 w-full gap-2 overflow-hidden';

  const listZoneClassName =
    'flex flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-contain';

  const listZoneInnerClassName =
    'min-h-full w-full flex flex-col justify-center py-0.5';

  const headerSubtitle = isAutoTest
    ? t('dns_widget_subtitle_auto')
    : t('dns_widget_subtitle_custom', { label: testModeLabel });

  const renderDnsList = () => (
    <div className={listClassName}>
      {dnsResults.map((dns, index) => {
        const status = getLatencyStatus(dns.latency_ms);

        if (useCompact) {
          return (
            <motion.div
              key={dns.ip}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, stiffness: 100, damping: 20, type: 'spring' }}
              className={`${compactCardWidth} px-3 py-1.5 rounded-xl border relative flex items-center justify-between gap-2 transition-all backdrop-blur-sm ${
                dns.is_best
                  ? 'bg-emerald-100 dark:bg-[#00ff9d]/5 border-emerald-300 dark:border-[#00ff9d]/30 shadow-[0_0_10px_rgba(0,255,157,0.1)]'
                  : 'bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] border-[var(--border)] hover:border-[var(--neon-green)]/30'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {dns.is_best && (
                  <Crown size={12} className="text-[var(--warning-text)] shrink-0" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--foreground)] truncate leading-none mb-1">
                    {dns.server_name}
                  </p>
                  <p className="text-[9px] text-[var(--text-subtle)] leading-none mono-text truncate">
                    {dns.ip}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-sm font-bold mono-text tracking-tight" style={{ color: status.color }}>
                  {dns.latency_ms < 0 ? '---' : dns.latency_ms.toFixed(0)}
                  <span className="text-[10px] ml-1">ms</span>
                </div>

                <div className="px-2 py-1 rounded border border-transparent" style={{ backgroundColor: status.bg }}>
                  <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: status.color }}>
                    {status.text}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        }

        return (
          <motion.div
            key={dns.ip}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, stiffness: 100, damping: 20, type: 'spring' }}
            className={`p-4 rounded-2xl border relative overflow-hidden transition-all backdrop-blur-sm min-w-[140px] max-w-[180px] flex-1 ${
              dns.is_best
                ? 'bg-emerald-100 dark:bg-[#00ff9d]/5 border-emerald-300 dark:border-[#00ff9d]/30 shadow-[0_0_15px_rgba(0,255,157,0.15)]'
                : 'bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] border-[var(--border)] hover:border-[var(--neon-green)]/30'
            }`}
          >
            {dns.is_best && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
                <Crown size={12} className="text-amber-600 dark:text-amber-400" />
              </div>
            )}

            <p className={`text-sm font-semibold text-[var(--foreground)] mb-1 truncate ${dns.is_best ? 'pr-8' : ''}`} title={dns.server_name}>
              {dns.server_name}
            </p>
            <p className={`text-[10px] text-[var(--text-muted)] mb-4 mono-text truncate ${dns.is_best ? 'pr-8' : ''}`} title={dns.ip}>
              {dns.ip}
            </p>

            <div className="text-2xl font-bold mono-text tracking-tight" style={{ color: status.color }}>
              {dns.latency_ms < 0 ? '---' : dns.latency_ms.toFixed(0)}
              <span className="text-xs ml-1">ms</span>
            </div>

            <div className="mt-2 px-2 py-1 rounded-lg border border-transparent inline-block" style={{ backgroundColor: status.bg }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: status.color }}>
                {status.text}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <NeonBentoCard
      className={cardSizeClass}
      style={cardStyle}
      themeColor={themeColor}
      delay={0.5}
      layoutId="dns-widget-card"
    >
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${themeColor}, color-mix(in srgb, ${themeColor} 50%, transparent))` }}>
            <Wifi size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-1">{t('dns_widget_title')}</h3>
            <p className="text-xs text-[var(--text-muted)] leading-snug">{headerSubtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAutoTest}
            disabled={isPinging}
            aria-pressed={isAutoTest}
            aria-busy={isPinging}
            title={
              isAutoTest
                ? t('dns_btn_auto_test_title_auto')
                : t('dns_btn_auto_test_title_custom')
            }
            className={`px-4 py-2 rounded-xl border flex items-center gap-2 min-h-[44px] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${
              isAutoTest
                ? 'border-[var(--neon-green)]/40 bg-[var(--neon-green)]/15 text-[var(--neon-green-text)] shadow-[0_0_12px_rgba(0,255,157,0.12)]'
                : 'border-[var(--border)] bg-[var(--surface-inset)] text-[var(--text-muted)] hover:border-[var(--neon-green)]/30 hover:text-[var(--foreground)]'
            }`}
          >
            {isPinging ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Signal size={16} aria-hidden="true" />
            )}
            {t('dns_btn_auto_test')}
          </button>
          <button
            type="button"
            onClick={onCustomize}
            className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] hover:border-[var(--neon-green)]/30 text-[var(--foreground)] text-xs font-semibold flex items-center gap-2 min-h-[44px] transition-colors cursor-pointer"
            aria-label={t('dns_btn_customize_aria')}
            title={t('dns_btn_customize_title')}
          >
            <Settings2 size={14} aria-hidden="true" />
            <span className="hidden sm:inline">{t('dns_customize')}</span>
          </button>
          {onToggleExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="w-11 h-11 rounded-xl border flex items-center justify-center cursor-pointer transition-colors bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] border-[var(--border)] hover:border-[var(--neon-green)]/30 text-[var(--foreground)]"
              aria-label={isExpanded ? t('dns_widget_minimize') : t('dns_widget_maximize')}
            >
              {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
        </div>
      </div>

      <div className={bodyClassName}>
        {isExpanded ? (
          renderDnsList()
        ) : (
          <div className={listZoneClassName}>
            <div className={listZoneInnerClassName}>{renderDnsList()}</div>
          </div>
        )}
        <div className="shrink-0 flex flex-col gap-3 w-full pt-3 mt-1 border-t border-[var(--border)]">
          <DnsViaBand
            useCompact={useCompact}
            bestDns={bestDns}
            gamingLatency={gamingLatency}
            gamingDetailsOpen={gamingDetailsOpen}
            onToggleGamingDetails={toggleGamingDetails}
            theme={theme}
          />
          <AnimatePresence initial={false}>
            {gamingDetailsOpen ? (
              <motion.div
                key="gaming-latency-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="overflow-hidden w-full shrink-0"
              >
                <GamingLatencyBreakdown
                  snapshot={gamingLatency}
                  compact={useCompact}
                  isDark={isDark}
                  onClose={closeGamingDetails}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </NeonBentoCard>
  );
});
