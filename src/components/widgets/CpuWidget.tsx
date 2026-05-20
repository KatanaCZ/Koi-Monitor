import React, { useEffect, useMemo } from 'react';
import { Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAppStore } from '../../store';
import { NeonBentoCard } from '../common';

export const CpuWidget: React.FC = () => {
  const { systemInfo, cpuHistory, addCpuHistory, theme } = useAppStore();

  useEffect(() => {
    if (systemInfo?.cpu) {
      addCpuHistory(systemInfo.cpu.usage);
    }
  }, [systemInfo, addCpuHistory]);

  const usage = systemInfo?.cpu.usage ?? 0;
  const cores = systemInfo?.cpu.cores ?? 0;
  const perCoreUsage = systemInfo?.cpu.per_core_usage ?? [];
  const name = systemInfo?.cpu.name ?? 'Loading...';

  const chartData = useMemo(() => cpuHistory.map((item, index) => ({
    time: index,
    value: item.value,
  })), [cpuHistory]);

  const isDark = theme === 'dark';
  const themeColor = 'var(--neon-pink)';

  return (
    <NeonBentoCard className="h-[380px]" themeColor={themeColor} delay={0.1}>
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}>
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-0.5">CPU</h3>
            <p className="text-xs text-slate-500">
              {name.length > 25 ? name.substring(0, 25) + '...' : name}
            </p>
          </div>
        </div>
        <motion.div
          className="px-3 py-1.5 rounded-full border"
          style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}30` }}
        >
          <span 
            className="text-lg font-bold mono-text tracking-tight"
            style={{ color: 'var(--neon-pink-text)', textShadow: `0 0 10px ${themeColor}40` }}
          >
            {usage.toFixed(1)}%
          </span>
        </motion.div>
      </div>

      {/* Chart */}
      <div className="h-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={themeColor} stopOpacity={0.5} />
                <stop offset="95%" stopColor={themeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              contentStyle={{
                background: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                border: `1px solid ${themeColor}40`,
                borderRadius: '8px',
                color: isDark ? '#f8fafc' : '#0f172a',
                backdropFilter: 'blur(10px)',
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Usage']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={themeColor}
              strokeWidth={2}
              fill="url(#cpuGradient)"
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Core Usage */}
      <div className="mt-auto shrink-0 z-10 relative">
        <p className="text-[10px] uppercase font-bold tracking-widest opacity-60 mb-2">
          Core Usage ({cores} Cores)
        </p>
        <div
          className="flex items-end gap-[3px] h-20 px-3 py-2 rounded-xl border border-pink-500/20 overflow-x-auto bg-slate-900/60"
        >
          {perCoreUsage.slice(0, 32).map((coreUsage, index) => {
            const barHeight = Math.max((coreUsage / 100) * 64, 4);
            return (
              <div
                key={index}
                title={`Core ${index}: ${coreUsage.toFixed(0)}%`}
                style={{
                  height: barHeight,
                  width: 17,
                  background: 'linear-gradient(to top, rgba(255,45,149,0.3), rgba(255,45,149,1))',
                  borderRadius: 3,
                  flexShrink: 0,
                  boxShadow: '0 0 6px rgba(255,45,149,0.4)',
                }}
              />
            );
          })}
        </div>
      </div>
    </NeonBentoCard>
  );
};