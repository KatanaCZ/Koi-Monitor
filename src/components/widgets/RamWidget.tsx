import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MemoryStick } from 'lucide-react';
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

export const RamWidget: React.FC = () => {
  const { systemInfo, ramHistory, addRamHistory, theme } = useAppStore();

  useEffect(() => {
    if (systemInfo?.memory) {
      addRamHistory(systemInfo.memory.usage_percent);
    }
  }, [systemInfo, addRamHistory]);

  const usage = systemInfo?.memory.usage_percent ?? 0;
  const total = systemInfo?.memory.total ?? 0;
  const used = systemInfo?.memory.used ?? 0;
  const available = systemInfo?.memory.available ?? 0;

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(1) + ' GB';
  };

  const chartData = useMemo(() => ramHistory.map((item, index) => ({
    time: index,
    value: item.value,
  })), [ramHistory]);


  const isDark = theme === 'dark';
  const themeColor = 'var(--neon-cyan)';

  return (
    <NeonBentoCard className="h-[380px]" themeColor={themeColor} delay={0.2}>
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}>
            <MemoryStick size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-0.5">RAM</h3>
            <p className="text-xs text-slate-500 mono-text">
              {formatBytes(used)} / {formatBytes(total)}
            </p>
          </div>
        </div>
        <motion.div
          className="px-3 py-1.5 rounded-full border"
          style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}30` }}
        >
          <span 
            className="text-lg font-bold mono-text tracking-tight"
            style={{ color: 'var(--neon-cyan-text)', textShadow: `0 0 10px ${themeColor}40` }}
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
              <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#ramGradient)"
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Memory Details */}
      <div className="grid grid-cols-2 gap-3 mt-auto shrink-0 z-10 relative">
        <div className="p-3 rounded-xl bg-[var(--background-accent)]/40 border border-[var(--border)] backdrop-blur-sm">
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-60 mb-1">Used</p>
          <p className="text-sm font-semibold mono-text" style={{ color: 'var(--neon-cyan-text)' }}>
            {formatBytes(used)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--background-accent)]/40 border border-[var(--border)] backdrop-blur-sm">
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-60 mb-1">Available</p>
          <p className="text-sm font-semibold mono-text" style={{ color: 'var(--neon-cyan-text)' }}>
            {formatBytes(available)}
          </p>
        </div>
      </div>
    </NeonBentoCard>
  );
};