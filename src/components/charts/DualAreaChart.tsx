import React from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from './rechartsImports';
import { formatChartTooltipLabel, getChartTooltipStyle } from '../common';

export interface DualAreaChartProps {
  data: Array<{ index: number; timestamp: number; download: number; upload: number }>;
  themeColorDown: string;
  themeColorUp: string;
  isDark: boolean;
  formatSpeed: (value: number) => string;
}

const DualAreaChart: React.FC<DualAreaChartProps> = ({
  data,
  themeColorDown,
  themeColorUp,
  isDark,
  formatSpeed,
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="colorDownload" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={themeColorDown} stopOpacity={0.6} />
          <stop offset="95%" stopColor={themeColorDown} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={themeColorUp} stopOpacity={0.6} />
          <stop offset="95%" stopColor={themeColorUp} stopOpacity={0} />
        </linearGradient>
      </defs>
      <XAxis dataKey="index" hide />
      <Tooltip
        contentStyle={getChartTooltipStyle(isDark, themeColorDown)}
        labelFormatter={formatChartTooltipLabel}
        formatter={(value: number, name: string) => [
          formatSpeed(value),
          name === 'download' ? 'Réception' : 'Émission',
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
);

export default DualAreaChart;
