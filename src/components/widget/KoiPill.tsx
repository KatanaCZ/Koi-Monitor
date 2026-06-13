import React from 'react';
import { Cpu, MemoryStick, MonitorPlay, Gamepad2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { getNeonTextShadow } from '../../utils/neonEffects';

export const KoiPill: React.FC = () => {
  const cpuUsage = useAppStore((s) => s.systemInfo?.cpu.usage ?? 0);
  const ramUsage = useAppStore((s) => s.systemInfo?.memory.usage_percent ?? 0);
  const gpuUsage = useAppStore((s) =>
    s.systemInfo?.gpu && s.systemInfo.gpu.length > 0
      ? Math.max(...s.systemInfo.gpu.map((g) => g.usage))
      : 0
  );
  const ping = useAppStore((s) => s.gamingLatency.internet_ms);
  
  const isDark = useAppStore((s) => s.theme === 'dark');

  const MetricItem = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => (
    <div className="flex flex-col items-center justify-center gap-1.5 min-w-[50px]">
      <Icon size={18} style={{ color, filter: getNeonTextShadow(color, isDark) }} />
      <span className="text-[9px] uppercase font-bold text-[var(--text-subtle)] tracking-wider">{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-5 sm:gap-6">
      <MetricItem icon={Cpu} label="CPU" value={`${cpuUsage.toFixed(0)}%`} color="var(--neon-pink)" />
      <MetricItem icon={MemoryStick} label="RAM" value={`${ramUsage.toFixed(0)}%`} color="var(--neon-cyan)" />
      <MetricItem icon={MonitorPlay} label="GPU" value={`${gpuUsage.toFixed(0)}%`} color="var(--neon-purple)" />
      <div className="w-[1px] h-10 bg-[var(--border)] mx-1" aria-hidden="true" />
      <MetricItem icon={Gamepad2} label="Ping" value={ping >= 0 ? `${ping.toFixed(0)}` : '---'} color="var(--neon-green)" />
    </div>
  );
};
