import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Trash2, X } from 'lucide-react';
import { useAppStore } from '../../store';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { formatNotificationTime } from '../../utils/notificationLog';
import { useTranslation } from '../../hooks/useTranslation';

function entryToneClass(type: 'success' | 'warning' | 'error'): string {
  switch (type) {
    case 'error':
      return 'border-[color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color-mix(in_srgb,var(--error)_10%,transparent)] text-[var(--error-text)]';
    case 'warning':
      return 'border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning-text)]';
    default:
      return 'border-[color-mix(in_srgb,var(--neon-green)_35%,transparent)] bg-[color-mix(in_srgb,var(--neon-green)_12%,transparent)] text-[var(--neon-green-text)]';
  }
}

function dotToneClass(type: 'success' | 'warning' | 'error'): string {
  switch (type) {
    case 'error':
      return 'bg-[var(--error)]';
    case 'warning':
      return 'bg-[var(--warning)]';
    default:
      return 'bg-[var(--neon-green)]';
  }
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const panelRef = useFocusTrap(isOpen);
  const notificationLog = useAppStore((s) => s.notificationLog);
  const markNotificationsRead = useAppStore((s) => s.markNotificationsRead);
  const clearNotificationLog = useAppStore((s) => s.clearNotificationLog);
  const markedRef = useRef(false);
  const { t, language } = useTranslation();

  useEffect(() => {
    if (!isOpen) {
      markedRef.current = false;
      return;
    }
    if (markedRef.current) return;
    markedRef.current = true;
    markNotificationsRead();
  }, [isOpen, markNotificationsRead]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label={t('notif_close_aria')}
            className="fixed inset-0 cursor-default bg-transparent pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-panel-title"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[5.5rem] right-4 sm:right-6 md:right-8 w-[min(20rem,calc(100vw-2rem))] max-h-[min(22rem,50vh)] flex flex-col rounded-2xl border border-[var(--border-strong)] bg-[var(--card-solid)] shadow-2xl overflow-hidden pointer-events-auto"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[color-mix(in_srgb,var(--neon-green)_14%,transparent)] border border-[color-mix(in_srgb,var(--neon-green)_28%,transparent)] flex items-center justify-center shrink-0">
                  <Bell size={14} className="text-[var(--neon-green-text)]" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="notification-panel-title"
                    className="text-sm font-semibold text-[var(--foreground)] truncate"
                  >
                    {t('notif_panel_title')}
                  </h2>
                  <p className="text-[10px] text-[var(--text-subtle)]">
                    {t('notif_panel_subtitle')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {notificationLog.length > 0 && (
                  <button
                    type="button"
                    onClick={clearNotificationLog}
                    className="w-11 h-11 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
                    title={t('notif_clear_tooltip')}
                    aria-label={t('notif_clear_tooltip')}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
                  aria-label={t('notif_close_aria')}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-2 space-y-2">
              {notificationLog.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm text-[var(--text-muted)]">{t('notif_empty_title')}</p>
                  <p className="text-xs text-[var(--text-subtle)] mt-1">
                    {t('notif_empty_desc')}
                  </p>
                </div>
              ) : (
                notificationLog.map((entry) => (
                  <article
                    key={entry.id}
                    className={`rounded-xl border px-3 py-2.5 ${entryToneClass(entry.type)} ${
                      entry.read ? 'opacity-80' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotToneClass(entry.type)}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {entry.source === 'alert' && (
                            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--neon-green-text)]">
                              {t('notif_source_alert')}
                            </span>
                          )}
                          <time
                            className="text-[10px] text-[var(--text-subtle)]"
                            dateTime={new Date(entry.createdAt).toISOString()}
                          >
                            {formatNotificationTime(entry.createdAt, t, language)}
                          </time>
                        </div>
                        <p className="text-sm font-medium leading-snug break-words">
                          {entry.message}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
