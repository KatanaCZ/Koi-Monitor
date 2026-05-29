import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ErrorBoundary } from '../common/ErrorBoundary';

const CpuWidget = lazy(() =>
  import('../widgets/CpuWidget').then((m) => ({ default: m.CpuWidget })),
);
const RamWidget = lazy(() =>
  import('../widgets/RamWidget').then((m) => ({ default: m.RamWidget })),
);
const GpuWidget = lazy(() =>
  import('../widgets/GpuWidget').then((m) => ({ default: m.GpuWidget })),
);
const NetworkWidget = lazy(() =>
  import('../widgets/NetworkWidget').then((m) => ({ default: m.NetworkWidget })),
);
const DnsWidget = lazy(() =>
  import('../widgets/DnsWidget').then((m) => ({ default: m.DnsWidget })),
);
const DriversWidget = lazy(() =>
  import('../widgets/DriversWidget').then((m) => ({ default: m.DriversWidget })),
);

const WidgetFallback = () => (
  <div className="bento-card h-[380px] animate-pulse bg-[var(--surface-inset)]" aria-hidden="true" />
);

const LocalWidgetError = ({ name }: { name: string }) => (
  <div className="bento-card h-[380px] flex flex-col items-center justify-center gap-2 bg-[var(--surface-inset)] border border-red-500/20 text-center p-6">
    <p className="text-sm font-semibold text-red-400">Erreur dans le widget {name}</p>
    <p className="text-xs text-[var(--text-muted)]">Impossible de charger les données.</p>
  </div>
);

interface DashboardViewProps {
  expandedWidget: 'dns' | 'drivers' | null;
  dnsRowHeight: number | null;
  onToggleDnsExpand: () => void;
  onAutoDnsTest: () => void;
  onCustomizeDns: () => void;
  onDnsLayoutHeight: (height: number | null) => void;
  onToggleDriversExpand: () => void;
  onCustomizeDrivers: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  expandedWidget,
  dnsRowHeight,
  onToggleDnsExpand,
  onAutoDnsTest,
  onCustomizeDns,
  onDnsLayoutHeight,
  onToggleDriversExpand,
  onCustomizeDrivers,
}) => {
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 flex-1 flex flex-col"
    >
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <WidgetFallback />
              <WidgetFallback />
              <WidgetFallback />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <WidgetFallback />
              <WidgetFallback />
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ErrorBoundary fallback={<LocalWidgetError name="CPU" />}>
              <CpuWidget />
            </ErrorBoundary>
            <ErrorBoundary fallback={<LocalWidgetError name="RAM" />}>
              <RamWidget />
            </ErrorBoundary>
            <ErrorBoundary fallback={<LocalWidgetError name="GPU" />}>
              <GpuWidget />
            </ErrorBoundary>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="flex flex-col min-h-0 h-full">
              <ErrorBoundary fallback={<LocalWidgetError name="Réseau" />}>
                <NetworkWidget layoutHeight={dnsRowHeight} />
              </ErrorBoundary>
            </div>
            <div className="lg:col-span-2 flex flex-col min-h-0 h-full">
              {expandedWidget === 'dns' ? (
                <WidgetFallback />
              ) : (
                <ErrorBoundary fallback={<LocalWidgetError name="DNS" />}>
                  <DnsWidget
                    onToggleExpand={onToggleDnsExpand}
                    onAutoTest={onAutoDnsTest}
                    onCustomize={onCustomizeDns}
                    onLayoutHeightChange={onDnsLayoutHeight}
                  />
                </ErrorBoundary>
              )}
            </div>
          </div>
        </div>

        <div className="w-full min-h-[380px]">
          {expandedWidget === 'drivers' ? (
            <WidgetFallback />
          ) : (
            <ErrorBoundary fallback={<LocalWidgetError name="Pilotes" />}>
              <DriversWidget
                onToggleExpand={onToggleDriversExpand}
                onCustomize={onCustomizeDrivers}
              />
            </ErrorBoundary>
          )}
        </div>
      </Suspense>
    </motion.div>
  );
};

export default DashboardView;
