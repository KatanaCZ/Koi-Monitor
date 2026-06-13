import React from 'react';
import { useAppStore } from '../../store';
import { getNeonTextShadow } from '../../utils/neonEffects';

export const ZenPill: React.FC = () => {
  const cpuUsage = useAppStore((s) => s.systemInfo?.cpu.usage ?? 0);
  const ramUsage = useAppStore((s) => s.systemInfo?.memory.usage_percent ?? 0);
  const gpuUsage = useAppStore((s) =>
    s.systemInfo?.gpu && s.systemInfo.gpu.length > 0
      ? Math.max(...s.systemInfo.gpu.map((g) => g.usage))
      : 0
  );
  const ping = useAppStore((s) => s.gamingLatency.internet_ms);
  
  const isDark = useAppStore((s) => s.theme === 'dark');

  const cpuColor = 'var(--neon-pink)';
  const ramColor = 'var(--neon-cyan)';
  const gpuColor = 'var(--neon-purple)';
  const pingColor = 'var(--neon-green)';

  return (
    <div className="flex items-center gap-3 text-[15px] font-bold tabular-nums tracking-tight px-1">
      <span style={{ color: cpuColor, textShadow: getNeonTextShadow(cpuColor, isDark) }}>
        {cpuUsage.toFixed(0)}%
      </span>
      <span className="text-[var(--border-strong)]">|</span>
      <span style={{ color: ramColor, textShadow: getNeonTextShadow(ramColor, isDark) }}>
        {ramUsage.toFixed(0)}%
      </span>
      <span className="text-[var(--border-strong)]">|</span>
      <span style={{ color: gpuColor, textShadow: getNeonTextShadow(gpuColor, isDark) }}>
        {gpuUsage.toFixed(0)}%
      </span>
      <span className="text-[var(--border-strong)]">|</span>
      <span style={{ color: pingColor, textShadow: getNeonTextShadow(pingColor, isDark) }}>
        {ping >= 0 ? `${ping.toFixed(0)}ms` : '---'}
      </span>
    </div>
  );
};
