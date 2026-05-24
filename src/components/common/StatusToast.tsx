import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../store';

const toastToneClass = (type: 'success' | 'warning' | 'error'): string => {
  if (type === 'warning') {
    return 'bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] border-[color-mix(in_srgb,var(--warning)_40%,transparent)] text-[var(--warning-text)]';
  }
  if (type === 'error') {
    return 'bg-[color-mix(in_srgb,var(--error)_15%,transparent)] border-[color-mix(in_srgb,var(--error)_40%,transparent)] text-[var(--error-text)]';
  }
  return 'bg-[var(--neon-green)]/15 border-[var(--neon-green)]/40 text-[var(--neon-green-text)]';
};

export { toastToneClass };

export const StatusToast: React.FC = () => {
  const statusToast = useAppStore((s) => s.statusToast);
  const clearStatusToast = useAppStore((s) => s.clearStatusToast);
  const setNotificationPanelOpen = useAppStore((s) => s.setNotificationPanelOpen);

  useEffect(() => {
    if (!statusToast) return;
    const durationMs = statusToast.type === 'warning' ? 5_500 : 3_000;
    const timer = setTimeout(() => clearStatusToast(), durationMs);
    return () => clearTimeout(timer);
  }, [statusToast, clearStatusToast]);

  const toneClass = statusToast ? toastToneClass(statusToast.type) : '';
  const isAlert = statusToast?.source === 'alert';

  return (
    <AnimatePresence>
      {statusToast && (
        isAlert ? (
          <motion.button
            type="button"
            onClick={() => setNotificationPanelOpen(true)}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            title="Voir le journal de veille"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto px-5 py-3 rounded-xl border text-sm font-medium shadow-lg backdrop-blur-md cursor-pointer hover:brightness-110 transition-[filter] ${toneClass}`}
          >
            {statusToast.message}
          </motion.button>
        ) : (
          <motion.div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none px-5 py-3 rounded-xl border text-sm font-medium shadow-lg backdrop-blur-md ${toneClass}`}
          >
            {statusToast.message}
          </motion.div>
        )
      )}
    </AnimatePresence>
  );
};
