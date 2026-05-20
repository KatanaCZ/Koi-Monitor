import React, { useMemo } from 'react';
import { Globe, Download, Upload } from 'lucide-react';
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAppStore } from '../../store';
import { NeonBentoCard } from '../common';

export const NetworkWidget: React.FC = () => {
  const { systemInfo, networkDownloadHistory, networkUploadHistory, theme } = useAppStore();

  const network = systemInfo?.network ?? {
    download_speed: 0,
    upload_speed: 0,
    total_received: 0,
    total_transmitted: 0,
  };

  const formatSpeed = (speed: number) => {
    if (speed < 1) return (speed * 1024).toFixed(1) + ' KB/s';
    return speed.toFixed(2) + ' MB/s';
  };

  const formatTotal = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const chartData = useMemo(() => networkDownloadHistory.map((item, index) => ({
    time: index,
    download: item.value,
    upload: networkUploadHistory[index]?.value ?? 0,
  })), [networkDownloadHistory, networkUploadHistory]);


  const isDark = theme === 'dark';
  const themeColorDown = 'var(--neon-turquoise)';
  const themeColorUp = 'var(--neon-green)';

  return (
    <NeonBentoCard className="h-[380px]" themeColor={themeColorDown} delay={0.4}>
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${themeColorDown}, ${themeColorDown}88)` }}>
          <Globe size={20} />
        </div>
        <div>
          <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-0.5">Network</h3>
          <p className="text-xs text-slate-500">
            Active Interfaces: {systemInfo?.network.interfaces.length ?? 0}
          </p>
        </div>
      </div>

      {/* Speed Display */}
      <div className="grid grid-cols-2 gap-3 shrink-0 z-10 relative">
        <div
          className="p-3.5 rounded-2xl border flex flex-col justify-center gap-1 backdrop-blur-sm"
          style={{ backgroundColor: `color-mix(in srgb, ${themeColorDown} 10%, transparent)`, borderColor: `color-mix(in srgb, ${themeColorDown} 30%, transparent)` }}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <Download size={14} style={{ color: themeColorDown }} />
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Download</span>
          </div>
          <span className="text-[22px] font-bold mono-text tracking-tight" style={{ color: 'var(--neon-turquoise-text)', textShadow: `0 0 10px color-mix(in srgb, ${themeColorDown} 60%, transparent)` }}>
            {formatSpeed(network.download_speed)}
          </span>
          <span className="text-[10px]" style={{ color: `color-mix(in srgb, ${themeColorDown} 80%, transparent)` }}>
            Total: {formatTotal(network.total_received)}
          </span>
        </div>
        
        <div
          className="p-3.5 rounded-2xl border flex flex-col justify-center gap-1 backdrop-blur-sm"
          style={{ backgroundColor: `color-mix(in srgb, ${themeColorUp} 10%, transparent)`, borderColor: `color-mix(in srgb, ${themeColorUp} 30%, transparent)` }}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <Upload size={14} style={{ color: themeColorUp }} />
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Upload</span>
          </div>
          <span className="text-[22px] font-bold mono-text tracking-tight" style={{ color: 'var(--neon-green-text)', textShadow: `0 0 10px color-mix(in srgb, ${themeColorUp} 60%, transparent)` }}>
            {formatSpeed(network.upload_speed)}
          </span>
          <span className="text-[10px]" style={{ color: `color-mix(in srgb, ${themeColorUp} 80%, transparent)` }}>
            Total: {formatTotal(network.total_transmitted)}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-32 mt-auto shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDownload" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={themeColorDown} stopOpacity={0.6}/>
                <stop offset="95%" stopColor={themeColorDown} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={themeColorUp} stopOpacity={0.6}/>
                <stop offset="95%" stopColor={themeColorUp} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{
                background: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                border: `1px solid ${themeColorDown}40`,
                borderRadius: '8px',
                color: isDark ? '#f8fafc' : '#0f172a',
                backdropFilter: 'blur(10px)',
              }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(2)} MB/s`,
                name === 'download' ? 'Download' : 'Upload',
              ]}
            />
            <Area
              type="monotone"
              dataKey="download"
              stroke={themeColorDown}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorDownload)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="upload"
              stroke={themeColorUp}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorUpload)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </NeonBentoCard>
  );
};