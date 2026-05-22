import React, { useMemo, useState } from 'react';
import { Wifi, Crown, Signal, Maximize2, Minimize2, Settings2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store';
import { NeonBentoCard } from '../common';
import { getDnsTestModeLabel, isAutoDnsChecklist } from '../../types';

interface DnsWidgetProps {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onAutoTest?: () => void | Promise<void>;
  onCustomize?: () => void;
}

export const DnsWidget: React.FC<DnsWidgetProps> = ({
  isExpanded = false,
  onToggleExpand,
  onAutoTest,
  onCustomize,
}) => {
  const dnsResults = useAppStore((s) => s.dnsResults);
  const theme = useAppStore((s) => s.theme);
  const dnsChecklist = useAppStore((s) => s.settings.dnsChecklist);
  const [isPinging, setIsPinging] = useState(false);

  const themeColor = 'var(--neon-green)';
  const useCompact = !isExpanded && dnsResults.length > 3;
  const isAutoTest = useMemo(
    () => isAutoDnsChecklist(dnsChecklist),
    [dnsChecklist],
  );
  const testModeLabel = useMemo(
    () => getDnsTestModeLabel(dnsChecklist),
    [dnsChecklist],
  );

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
    const isDark = theme === 'dark';
    if (latency < 0) {
      return {
        text: 'Expiré',
        color: 'var(--text-muted)',
        bg: isDark ? 'rgba(100, 116, 139, 0.15)' : 'rgba(100, 116, 139, 0.1)'
      };
    }
    if (latency < 50) {
      return {
        text: 'Excellente',
        color: 'var(--neon-green-text)',
        bg: isDark ? 'rgba(0, 255, 157, 0.15)' : 'rgba(0, 128, 76, 0.1)'
      };
    }
    if (latency < 100) {
      return {
        text: 'Bonne',
        color: isDark ? '#d4ff66' : '#5f7000',
        bg: isDark ? 'rgba(191, 255, 0, 0.15)' : 'rgba(95, 112, 0, 0.1)'
      };
    }
    if (latency < 200) {
      return {
        text: 'Moyenne',
        color: isDark ? '#ff9a76' : '#c2410c',
        bg: isDark ? 'rgba(255, 107, 53, 0.15)' : 'rgba(194, 65, 12, 0.1)'
      };
    }
    return {
      text: 'Critique',
      color: isDark ? '#ff6b6b' : '#dc2626',
      bg: isDark ? 'rgba(255, 51, 51, 0.15)' : 'rgba(220, 38, 38, 0.1)'
    };
  };

  const getLatencyStatus = (latency: number) => getLatencyMetrics(latency);

  return (
    <NeonBentoCard
      className={isExpanded ? "w-full max-w-5xl h-auto max-h-[85vh] md:max-h-[90vh] shadow-2xl" : "h-[380px]"}
      themeColor={themeColor}
      delay={0.5}
      layoutId="dns-widget-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${themeColor}, color-mix(in srgb, ${themeColor} 50%, transparent))` }}>
            <Wifi size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-1">Moniteur DNS & Ping</h3>
            <p className="text-xs text-[var(--text-muted)] leading-snug">
              {isAutoTest
                ? "4 serveurs recommandés · test automatique"
                : `${testModeLabel} actif · Test auto pour revenir au défaut`}
            </p>
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
                ? "Relancer le test sur les 4 serveurs recommandés"
                : "Revenir aux 4 serveurs recommandés et lancer un test"
            }
            className={`px-4 py-2 rounded-xl border flex items-center gap-2 min-h-[44px] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${
              isAutoTest
                ? "border-[var(--neon-green)]/40 bg-[var(--neon-green)]/15 text-[var(--neon-green-text)] shadow-[0_0_12px_rgba(0,255,157,0.12)]"
                : "border-[var(--border)] bg-[var(--surface-inset)] text-[var(--text-muted)] hover:border-[var(--neon-green)]/30 hover:text-[var(--foreground)]"
            }`}
          >
            {isPinging ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Signal size={16} aria-hidden="true" />
            )}
            Test auto
          </button>
          <button
            type="button"
            onClick={onCustomize}
            className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] hover:border-[var(--neon-green)]/30 text-[var(--foreground)] text-xs font-semibold flex items-center gap-2 min-h-[44px] transition-colors cursor-pointer"
            aria-label="Personnaliser les serveurs DNS dans les paramètres"
            title="Choisir manuellement les serveurs à tester"
          >
            <Settings2 size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Personnaliser</span>
          </button>
          {onToggleExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-colors bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] border-[var(--border)] hover:border-[var(--neon-green)]/30 text-[var(--foreground)]"
              aria-label={isExpanded ? "Réduire le widget" : "Agrandir le widget"}
            >
              {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* DNS Servers Grid */}
      <div className={useCompact ? "grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 overflow-hidden min-h-0 pr-1 pt-1 pb-1 mt-2 mb-2" : "flex flex-wrap justify-center gap-4 flex-1 overflow-y-auto min-h-0 pr-1 pt-1 pb-1 mt-2 mb-2"}>
        {dnsResults.map((dns, index) => {
          const status = getLatencyStatus(dns.latency_ms);
          
          if (useCompact) {
            return (
              <motion.div
                key={dns.ip}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, stiffness: 100, damping: 20, type: 'spring' }}
                className={`px-4 py-2 rounded-xl border relative flex items-center justify-between gap-2 transition-all backdrop-blur-sm ${
                  dns.is_best
                    ? 'bg-emerald-100 dark:bg-[#00ff9d]/5 border-emerald-300 dark:border-[#00ff9d]/30 shadow-[0_0_10px_rgba(0,255,157,0.1)]'
                    : 'bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] border-[var(--border)] hover:border-[var(--neon-green)]/30'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {dns.is_best && (
                    <Crown size={12} className="text-amber-500 shrink-0" />
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

          // Large vertical card (default layout)
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

      {/* Dynamic Overall Latency Status */}
      {dnsResults.length > 0 && (() => {
        const bestDns = dnsResults.find(d => d.is_best) || dnsResults[0];
        const latency = bestDns.latency_ms;
        const bestDnsMetrics = getLatencyMetrics(latency);
        
        let statusTitle = "Latence inconnue";
        if (latency < 0) statusTitle = "Connexion perdue";
        else if (latency < 50) statusTitle = "Latence excellente";
        else if (latency < 100) statusTitle = "Latence bonne";
        else if (latency < 200) statusTitle = "Latence moyenne";
        else statusTitle = "Latence critique";

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-auto p-4 rounded-2xl border flex items-center justify-between shrink-0 backdrop-blur-sm z-10 relative"
            style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 10%, transparent)`, borderColor: `color-mix(in srgb, ${themeColor} 30%, transparent)`, boxShadow: `inset 0 0 20px color-mix(in srgb, ${themeColor} 5%, transparent)` }}
          >
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)` }}>
                <Signal size={20} style={{ color: bestDnsMetrics.color }} />
              </div>
              <div>
                <p className="text-xs uppercase font-bold tracking-widest text-[var(--text-subtle)] mb-1">
                  Via {bestDns.server_name}
                </p>
                <p className="text-sm font-semibold" style={{ color: bestDnsMetrics.color }}>
                  {statusTitle}
                </p>
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl border" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)`, borderColor: `color-mix(in srgb, ${themeColor} 30%, transparent)` }}>
              <span className="text-lg font-bold mono-text" style={{ color: bestDnsMetrics.color }}>
                {latency < 0 ? '---' : latency.toFixed(0)}
                <span className="text-xs ml-1">ms</span>
              </span>
            </div>
          </motion.div>
        );
      })()}
    </NeonBentoCard>
  );
};