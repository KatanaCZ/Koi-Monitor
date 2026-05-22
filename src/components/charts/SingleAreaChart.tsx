import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from './rechartsImports';
import { formatChartTooltipLabel, getChartTooltipStyle } from '../common';

export interface SingleAreaChartProps {
  data: Array<{ index: number; timestamp: number; value: number }>;
  themeColor: string;
  isDark: boolean;
  gradientId: string;
  yDomain?: [number, number];
  valueFormatter?: (value: number) => [string, string];
}

const SingleAreaChart: React.FC<SingleAreaChartProps> = ({
  data,
  themeColor,
  isDark,
  gradientId,
  yDomain = [0, 100],
  valueFormatter = (value) => [`${value.toFixed(1)} %`, 'Utilisation'],
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={themeColor} stopOpacity={0.5} />
          <stop offset="95%" stopColor={themeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <XAxis dataKey="index" hide />
      <YAxis domain={yDomain} hide />
      <Tooltip
        contentStyle={getChartTooltipStyle(isDark, themeColor)}
        labelFormatter={formatChartTooltipLabel}
        formatter={(value: number) => valueFormatter(value)}
      />
      <Area
        type="monotone"
        dataKey="value"
        stroke={themeColor}
        strokeWidth={2}
        fill={`url(#${gradientId})`}
        isAnimationActive={false}
      />
    </AreaChart>
  </ResponsiveContainer>
);

export default SingleAreaChart;
