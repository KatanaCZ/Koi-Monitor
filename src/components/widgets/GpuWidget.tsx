import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Monitor } from 'lucide-react';
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

export const GpuWidget: React.FC = () => {
  const { systemInfo, gpuHistory, addGpuHistory, theme } = useAppStore();

  useEffect(() => {
    if (systemInfo?.gpu) {
      addGpuHistory(systemInfo.gpu[0]?.usage || 0);
    }
  }, [systemInfo, addGpuHistory]);

  const gpu = systemInfo?.gpu?.[0] ?? {
    name: 'GPU Info Unavailable',
    usage: 0,
    memory_used: 0,
    memory_total: 0,
    temperature: null,
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0.0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(1) + ' GB';
  };

  const chartData = useMemo(() => gpuHistory.map((item, index) => ({
    time: index,
    value: item.value,
  })), [gpuHistory]);


  const isDark = theme === 'dark';
  const themeColor = 'var(--neon-purple)';

  return (
    <NeonBentoCard className="h-[380px]" themeColor={themeColor} delay={0.3}>
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}>
            <Monitor size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-0.5">GPU</h3>
            <p className="text-xs text-slate-500">
              {gpu.name.length > 25 ? gpu.name.substring(0, 25) + '...' : gpu.name}
            </p>
          </div>
        </div>
        <motion.div
          className="px-3 py-1.5 rounded-full border"
          style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}30` }}
        >
          <span 
            className="text-lg font-bold mono-text tracking-tight"
            style={{ color: 'var(--neon-purple-text)', textShadow: `0 0 10px ${themeColor}40` }}
          >
            {gpu.usage === 0 ? '- %' : `${gpu.usage.toFixed(0)}%`}
          </span>
        </motion.div>
      </div>

      {/* Chart */}
      <div className="h-32 relative shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gpuGradient" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#gpuGradient)"
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* GPU Details */}
      <div className="grid grid-cols-2 gap-3 mt-auto shrink-0 z-10 relative">
        <div className="p-3 rounded-xl bg-[var(--background-accent)]/40 border border-[var(--border)] backdrop-blur-sm">
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-60 mb-1">Total VRAM</p>
          <p className="text-sm font-semibold mono-text" style={{ color: 'var(--neon-purple-text)' }}>
            {formatBytes(gpu.memory_total)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--background-accent)]/40 border border-[var(--border)] backdrop-blur-sm">
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-60 mb-1">Used VRAM</p>
          <p className="text-sm font-semibold mono-text" style={{ color: 'var(--neon-purple-text)' }}>
            {formatBytes(gpu.memory_used)}
          </p>
        </div>
      </div>

      {/* Hardware Acceleration Badge */}
      <div className="flex justify-center mt-1 shrink-0 z-10 relative">
        <p 
          className="text-[9px] uppercase font-bold tracking-[0.2em] px-3 py-1 rounded-full border"
          style={{ color: 'var(--neon-purple-text)', backgroundColor: `color-mix(in srgb, ${themeColor} 10%, transparent)`, borderColor: `color-mix(in srgb, ${themeColor} 30%, transparent)`, textShadow: `0 0 5px color-mix(in srgb, ${themeColor} 40%, transparent)` }}
        >
          Hardware Acceleration Active
        </p>
      </div>
    </NeonBentoCard>
  );
};