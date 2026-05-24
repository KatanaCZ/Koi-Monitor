import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface AlertOnboardingModalProps {
  isOpen: boolean;
  onEnable: () => void;
  onDecline: () => void;
}

export const AlertOnboardingModal: React.FC<AlertOnboardingModalProps> = ({
  isOpen,
  onEnable,
  onDecline,
}) => {
  const dialogRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onDecline();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDecline]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
            onClick={onDecline}
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-onboarding-title"
            aria-describedby="alert-onboarding-desc"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative w-full max-w-lg bento-card p-8 shadow-2xl"
          >
            <button
              type="button"
              onClick={onDecline}
              className="absolute top-4 right-4 w-11 h-11 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[color-mix(in_srgb,var(--neon-green)_18%,transparent)] border border-[color-mix(in_srgb,var(--neon-green)_35%,transparent)] flex items-center justify-center">
                <Bell size={22} className="text-[var(--neon-green-text)]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--neon-green-text)]">
                  Optionnel
                </p>
                <h2
                  id="alert-onboarding-title"
                  className="text-xl font-semibold text-[var(--foreground)]"
                >
                  Koi peut veiller pour vous
                </h2>
              </div>
            </div>

            <p
              id="alert-onboarding-desc"
              className="text-sm leading-relaxed text-[var(--text-muted)] mb-8"
            >
              Comme une brise sur l&apos;eau, au bureau un mot si la machine force, en session un
              murmure si le ping s&apos;éloigne de son rythme. Discret en bas de l&apos;écran,
              jamais de popup Windows. La veille s&apos;active ou se repose dans Paramètres, onglet
              Veille, vous gardez la main.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onEnable}
                className="flex-1 rounded-2xl bg-[var(--neon-green)] px-5 py-3 text-sm font-semibold text-[#04140e] shadow-lg shadow-[var(--neon-green)]/25 hover:opacity-95 transition-opacity"
              >
                Activer la veille
              </button>
              <button
                type="button"
                onClick={onDecline}
                className="flex-1 rounded-2xl border border-[var(--border-strong)] px-5 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                Pas maintenant
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
