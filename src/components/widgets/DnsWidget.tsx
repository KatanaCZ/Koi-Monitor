import React from 'react';
import { Wifi, Crown, Signal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store';
import { NeonBentoCard } from '../common';

export const DnsWidget: React.FC = () => {
  const { dnsResults, theme } = useAppStore();

  const themeColor = 'var(--neon-green)';

  const getLatencyMetrics = (latency: number) => {
    const isDark = theme === 'dark';
    if (latency < 0) {
      return {
        text: 'Timeout',
        color: '#64748b',
        bg: isDark ? 'rgba(100, 116, 139, 0.15)' : 'rgba(100, 116, 139, 0.1)'
      };
    }
    if (latency < 50) {
      return {
        text: 'Excellent',
        color: isDark ? 'var(--neon-green)' : 'var(--neon-green-text)',
        bg: isDark ? 'rgba(0, 255, 157, 0.15)' : 'rgba(0, 128, 76, 0.1)'
      };
    }
    if (latency < 100) {
      return {
        text: 'Good',
        color: isDark ? '#bfff00' : '#5f7000',
        bg: isDark ? 'rgba(191, 255, 0, 0.15)' : 'rgba(95, 112, 0, 0.1)'
      };
    }
    if (latency < 200) {
      return {
        text: 'Fair',
        color: isDark ? '#ff6b35' : '#c2410c',
        bg: isDark ? 'rgba(255, 107, 53, 0.15)' : 'rgba(194, 65, 12, 0.1)'
      };
    }
    return {
      text: 'Poor',
      color: isDark ? '#ff3333' : '#dc2626',
      bg: isDark ? 'rgba(255, 51, 51, 0.15)' : 'rgba(220, 38, 38, 0.1)'
    };
  };

  const getLatencyStatus = (latency: number) => getLatencyMetrics(latency);

  return (
    <NeonBentoCard className="h-[380px]" themeColor={themeColor} delay={0.5}>
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}>
            <Wifi size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-0.5">DNS & Ping Monitor</h3>
            <p className="text-xs text-slate-500">
              Multi-server latency test
            </p>
          </div>
        </div>
        <div className="px-4 py-2 rounded-full border flex items-center gap-2" style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}30` }}>
          <Signal size={16} style={{ color: themeColor }} />
          <span className="text-sm font-semibold" style={{ color: themeColor, textShadow: `0 0 5px ${themeColor}40` }}>
            Auto Test
          </span>
        </div>
      </div>

      {/* DNS Servers Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 overflow-y-auto pr-1 shrink-0">
        {dnsResults.map((dns, index) => {
          const status = getLatencyStatus(dns.latency_ms);
          return (
            <motion.div
              key={dns.ip}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, stiffness: 100, damping: 20, type: 'spring' }}
              className={`p-4 rounded-2xl border relative overflow-hidden transition-all backdrop-blur-sm ${
                dns.is_best
                  ? 'bg-emerald-50/50 dark:bg-[#00ff9d]/5 border-[#00ff9d]/30 shadow-[0_0_15px_rgba(0,255,157,0.15)]'
                  : 'bg-[var(--background-accent)]/30 border-[var(--border)] hover:border-[var(--neon-green)]/30'
              }`}
            >
              {dns.is_best && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
                  <Crown size={12} className="text-amber-600 dark:text-amber-400" />
                </div>
              )}

              <p className="text-sm font-semibold text-[var(--foreground)] mb-1">
                {dns.server_name}
              </p>
              <p className="text-[10px] text-slate-500 mb-3 mono-text">
                {dns.ip}
              </p>

              <div className="text-2xl font-bold mono-text tracking-tight" style={{ color: status.color }}>
                {dns.latency_ms < 0 ? '---' : dns.latency_ms.toFixed(0)}
                <span className="text-xs ml-0.5">ms</span>
              </div>

              <div className="mt-2 px-2.5 py-1 rounded-lg border border-transparent inline-block" style={{ backgroundColor: status.bg }}>
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
        
        let statusTitle = "Unknown Latency";
        if (latency < 0) statusTitle = "Connection Lost";
        else if (latency < 50) statusTitle = "Excellent Latency";
        else if (latency < 100) statusTitle = "Good Latency";
        else if (latency < 200) statusTitle = "Fair Latency";
        else statusTitle = "Poor Latency";

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-auto p-4 rounded-2xl border flex items-center justify-between shrink-0 backdrop-blur-sm z-10 relative"
            style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 10%, transparent)`, borderColor: `color-mix(in srgb, ${themeColor} 30%, transparent)`, boxShadow: `inset 0 0 20px color-mix(in srgb, ${themeColor} 5%, transparent)` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)` }}>
                <Signal size={20} style={{ color: bestDnsMetrics.color }} />
              </div>
              <div>
                <p className="text-xs uppercase font-bold tracking-widest opacity-60 mb-0.5">
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
                <span className="text-xs ml-0.5">ms</span>
              </span>
            </div>
          </motion.div>
        );
      })()}
    </NeonBentoCard>
  );
};