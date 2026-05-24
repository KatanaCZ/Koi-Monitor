import {
  memo,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAppStore } from "../../store";

/** Zone de déclenchement en haut quand la barre est masquée */
const HOVER_PEEK_PX = 14;
const BAR_HEIGHT_PX = 48;

interface ZenTitleBarDockProps {
  children: ReactNode;
}

export const ZenTitleBarDock = memo(function ZenTitleBarDock({
  children,
}: ZenTitleBarDockProps) {
  const [revealed, setRevealed] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationPanelOpen = useAppStore((s) => s.notificationPanelOpen);
  const calmMotion = useAppStore((s) => s.settings.calmMotion);
  const prefersReducedMotion = useReducedMotion();

  const fast = prefersReducedMotion || calmMotion;
  const hideDelayMs = fast ? 200 : 500;
  const transition = fast
    ? { duration: 0.14, ease: "easeOut" as const }
    : { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const };

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const reveal = useCallback(() => {
    clearHideTimer();
    setRevealed(true);
  }, [clearHideTimer]);

  const scheduleHide = useCallback(() => {
    if (notificationPanelOpen) return;
    clearHideTimer();
    hideTimer.current = setTimeout(() => setRevealed(false), hideDelayMs);
  }, [clearHideTimer, hideDelayMs, notificationPanelOpen]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  useEffect(() => {
    if (notificationPanelOpen) reveal();
  }, [notificationPanelOpen, reveal]);

  /* Souris déjà en haut au passage en Zen */
  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (event.clientY <= HOVER_PEEK_PX + 10) reveal();
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [reveal]);

  return (
    <motion.div
      className="zen-titlebar-dock relative shrink-0 z-50 overflow-visible"
      animate={{ height: revealed ? BAR_HEIGHT_PX : HOVER_PEEK_PX }}
      transition={transition}
      onMouseEnter={reveal}
      onMouseLeave={scheduleHide}
    >
      <motion.div
        className="absolute inset-x-0 top-0"
        animate={{
          y: revealed ? 0 : -(BAR_HEIGHT_PX + 6),
          opacity: revealed ? 1 : 0,
        }}
        transition={transition}
        style={{ pointerEvents: revealed ? "auto" : "none" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
});
