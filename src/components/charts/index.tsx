import React, { lazy, Suspense } from 'react';
import type { SingleAreaChartProps } from './SingleAreaChart';
import type { DualAreaChartProps } from './DualAreaChart';

const LazySingleAreaChart = lazy(() => import('./SingleAreaChart'));
const LazyDualAreaChart = lazy(() => import('./DualAreaChart'));

const ChartFallback = () => (
  <div className="h-full w-full animate-pulse rounded-2xl bg-[var(--surface-inset)]" aria-hidden="true" />
);

export const SingleAreaChart: React.FC<SingleAreaChartProps> = (props) => (
  <Suspense fallback={<ChartFallback />}>
    <LazySingleAreaChart {...props} />
  </Suspense>
);

export const DualAreaChart: React.FC<DualAreaChartProps> = (props) => (
  <Suspense fallback={<ChartFallback />}>
    <LazyDualAreaChart {...props} />
  </Suspense>
);
