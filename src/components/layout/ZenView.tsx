import React, { lazy, Suspense } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ErrorBoundary } from '../common/ErrorBoundary';

const ZenClockWidget = lazy(() =>
  import('../widgets/ZenClockWidget').then((m) => ({ default: m.ZenClockWidget })),
);

const WidgetFallback = () => (
  <div className="bento-card h-[380px] animate-pulse bg-[var(--surface-inset)]" aria-hidden="true" />
);

const LocalWidgetError = ({ name }: { name: string }) => (
  <div className="bento-card h-full flex flex-col items-center justify-center gap-2 bg-[var(--surface-inset)] border border-red-500/20 text-center p-6">
    <p className="text-sm font-semibold text-red-400">Erreur dans le widget {name}</p>
    <p className="text-xs text-[var(--text-muted)]">Impossible de charger l&apos;horloge Zen.</p>
  </div>
);

export const ZenView: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      key="zen"
      initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.98 }}
      transition={{
        duration: prefersReducedMotion ? 0.15 : 0.6,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="flex-1 flex flex-col min-h-0 w-full h-full relative z-[2]"
    >
      <Suspense fallback={<WidgetFallback />}>
        <div className="flex-1 flex flex-col min-h-0 w-full h-full">
          <ErrorBoundary fallback={<LocalWidgetError name="Horloge Zen" />}>
            <ZenClockWidget />
          </ErrorBoundary>
        </div>
      </Suspense>
    </motion.div>
  );
};

export default ZenView;
