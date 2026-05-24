import { memo, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAppStore } from "../../store";
import { useZenLoadState } from "../../hooks/useZenLoadState";
import {
  getZenLoadStatePresentation,
  getZenLoadStateStyle,
} from "../../utils/zenLoadState";

/** Fond wallpaper Zen — dégradé + surface d'étang et ondulations SVG. */
export const ZenPondBackground = memo(function ZenPondBackground() {
  const backgroundAura = useAppStore((s) => s.settings.backgroundAura);
  const calmMotion = useAppStore((s) => s.settings.calmMotion);
  const { state: loadState } = useZenLoadState();
  const prefersReducedMotion = useReducedMotion();
  const presentation = getZenLoadStatePresentation(loadState);
  const style = getZenLoadStateStyle(loadState);

  const staticPond =
    prefersReducedMotion || calmMotion || backgroundAura === "off";

  if (backgroundAura === "off") return null;

  const rippleClass =
    loadState === "intense"
      ? "zen-pond-ripple zen-pond-ripple-boost"
      : loadState === "moderate"
        ? "zen-pond-ripple zen-pond-ripple-flow"
        : "zen-pond-ripple";

  return (
    <motion.div
      className="zen-pond zen-pond-wallpaper fixed inset-0 pointer-events-none z-[1]"
      aria-hidden="true"
      data-zen-state={loadState}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={
        {
          "--zen-halo-color": style.color,
          "--zen-breath-duration": `${presentation.breathDuration}s`,
        } as CSSProperties
      }
    >
      <div className="zen-pond-depth absolute inset-0" />
      <div className="zen-pond-surface absolute inset-x-0 bottom-0 h-[46%]" />

      {!staticPond && (
        <svg
          className="zen-pond-svg absolute inset-0 w-full h-full"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse
            className={rippleClass}
            cx="600"
            cy="540"
            rx="440"
            ry="52"
            style={{ animationDelay: "0s" }}
          />
          <ellipse
            className={rippleClass}
            cx="470"
            cy="580"
            rx="340"
            ry="38"
            style={{ animationDelay: "1.1s" }}
          />
          <ellipse
            className={rippleClass}
            cx="730"
            cy="600"
            rx="300"
            ry="32"
            style={{ animationDelay: "2.3s" }}
          />
        </svg>
      )}
    </motion.div>
  );
});
