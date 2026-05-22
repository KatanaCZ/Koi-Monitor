import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../store';

export const StatusToast: React.FC = () => {
  const statusToast = useAppStore((s) => s.statusToast);
  const clearStatusToast = useAppStore((s) => s.clearStatusToast);

  useEffect(() => {
    if (!statusToast) return;
    const durationMs = statusToast.type === 'warning' ? 5_500 : 3_000;
    const timer = setTimeout(() => clearStatusToast(), durationMs);
    return () => clearTimeout(timer);
  }, [statusToast, clearStatusToast]);

  return (
    <AnimatePresence>
      {statusToast && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25 }}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl border text-sm font-medium shadow-lg backdrop-blur-md ${
            statusToast.type === 'warning'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
              : statusToast.type === 'error'
                ? 'bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-300'
                : 'bg-[var(--neon-green)]/15 border-[var(--neon-green)]/40 text-[var(--neon-green-text)]'
          }`}
        >
          {statusToast.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
