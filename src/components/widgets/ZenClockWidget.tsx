import { useEffect, useState, memo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Bell, Eye, EyeOff } from "lucide-react";
import { useAppStore } from "../../store";
import { selectUnreadAlertCount } from "../../utils/notificationLog";
import { useZenLoadState } from "../../hooks/useZenLoadState";
import { ZenMetricsDock } from "./ZenMetricsDock";
import {
  getZenLoadStatePresentation,
  getZenStateChipStyle,
} from "../../utils/zenLoadState";

export const ZenClockWidget = memo(function ZenClockWidget() {
  const sakuraColor = useAppStore((s) => s.settings.sakuraColor);
  const zenMetricsVisible = useAppStore((s) => s.settings.zenMetricsVisible);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setNotificationPanelOpen = useAppStore((s) => s.setNotificationPanelOpen);
  const unreadAlertCount = useAppStore((s) =>
    selectUnreadAlertCount(s.notificationLog),
  );
  const { state: loadState } = useZenLoadState();
  const prefersReducedMotion = useReducedMotion();

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getSakuraColorClass = (color: string) => {
    switch (color) {
      case "purple":
        return "text-[var(--neon-purple-text)]";
      case "blue":
        return "text-[var(--neon-cyan-text)]";
      case "green":
        return "text-[var(--neon-green-text)]";
      case "pink":
      default:
        return "text-[var(--neon-pink-text)]";
    }
  };

  const colorClass = getSakuraColorClass(sakuraColor || "pink");
  const loadPresentation = getZenLoadStatePresentation(loadState);
  const stateChipStyle = getZenStateChipStyle(loadState);

  const formattedDate = time.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const hours = time.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    hour12: false,
  });
  const minutes = time.toLocaleTimeString("fr-FR", {
    minute: "2-digit",
    hour12: false,
  });
  const seconds = time.toLocaleTimeString("fr-FR", {
    second: "2-digit",
    hour12: false,
  });

  const fade = prefersReducedMotion ? 0 : 0.55;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="zen-wallpaper flex-1 flex flex-col w-full min-h-0 h-full"
    >
      {/* Bloc principal — centré au milieu de l'écran */}
      <div className="zen-wallpaper-core flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-4 sm:px-8 gap-8 sm:gap-12 lg:gap-14 min-h-0">
        <motion.header
          aria-label="Horloge mode Zen"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: fade, ease: [0.16, 1, 0.3, 1] }}
          className="zen-wallpaper-clock w-full text-center"
        >
          <h1
            className={`zen-hero-time zen-hero-glow font-extralight mono-text leading-none tracking-tight flex flex-wrap items-start justify-center gap-x-2 sm:gap-x-3 ${colorClass}`}
            aria-live="off"
          >
            <span className="text-[clamp(4.5rem,18vw,11rem)] tabular-nums">
              {hours}:{minutes}
            </span>
            <span className="text-[clamp(1.25rem,4vw,2.75rem)] font-light opacity-50 tabular-nums pt-[0.35em] sm:pt-[0.4em]">
              {seconds}
            </span>
          </h1>

          <p className="zen-hero-date mt-5 sm:mt-7 text-xl sm:text-2xl lg:text-3xl font-medium tracking-wide text-[var(--foreground)]">
            {capitalizedDate}
          </p>

          <AnimatePresence mode="wait">
            <motion.p
              key={loadState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
              role="status"
              aria-live="polite"
              aria-label={loadPresentation.labelAria}
              className="mt-3 sm:mt-4 text-sm sm:text-base font-bold uppercase tracking-[0.28em]"
              style={{ color: stateChipStyle.color }}
            >
              {loadPresentation.labelFr}
            </motion.p>
          </AnimatePresence>
        </motion.header>

        <AnimatePresence initial={false}>
          {zenMetricsVisible ? (
            <motion.div
              key="zen-metrics"
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
              transition={{ duration: fade, delay: prefersReducedMotion ? 0 : 0.06 }}
              className="w-full flex justify-center"
            >
              <ZenMetricsDock />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.blockquote
            key={loadState}
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -6 }}
            transition={{ duration: fade, delay: prefersReducedMotion ? 0 : 0.1 }}
            className="zen-wallpaper-quote w-full max-w-3xl text-center px-2 mx-auto"
            data-zen-state={loadState}
          >
            <p className="zen-hero-quote text-xl sm:text-2xl lg:text-3xl xl:text-4xl leading-relaxed italic text-[var(--foreground)] opacity-[0.82]">
              {loadPresentation.quote}
            </p>
          </motion.blockquote>
        </AnimatePresence>
      </div>

      {/* Footer — ancré en bas, hors du bloc centré */}
      <footer className="zen-wallpaper-footer shrink-0 w-full max-w-lg mx-auto text-center space-y-3 pb-5 sm:pb-6 px-4">
        {unreadAlertCount > 0 && (
          <button
            type="button"
            onClick={() => setNotificationPanelOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-[var(--neon-green-text)] opacity-80 hover:opacity-100 transition-opacity min-h-[44px]"
            aria-label={`${unreadAlertCount} signaux manqués, ouvrir le journal de veille`}
          >
            <Bell size={14} aria-hidden="true" />
            {unreadAlertCount} signaux manqués
          </button>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4 text-[var(--text-subtle)]">
          <button
            type="button"
            onClick={() => updateSettings({ zenMetricsVisible: !zenMetricsVisible })}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-2 opacity-60 hover:opacity-100 transition-opacity text-xs sm:text-sm"
            aria-pressed={zenMetricsVisible}
            aria-label={
              zenMetricsVisible
                ? "Masquer les métriques en mode Zen"
                : "Afficher les métriques en mode Zen"
            }
          >
            {zenMetricsVisible ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
          </button>
          <span className="text-xs sm:text-sm tracking-wide opacity-60">Échap · Tableau de bord</span>
        </div>
      </footer>
    </motion.div>
  );
});
