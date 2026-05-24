import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  SlashTitle,
  getSlashTitleIntroDurationMs,
  getSlashTitleSliceDelayMs,
} from "./SlashTitle";

interface SplashSlashTitleProps {
  reducedMotion?: boolean;
  onIntroComplete?: () => void;
}

export const SplashSlashTitle: React.FC<SplashSlashTitleProps> = ({
  reducedMotion: reducedMotionProp,
  onIntroComplete,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionProp ?? prefersReducedMotion ?? false;
  const sliceDelayMs = getSlashTitleSliceDelayMs("lg", reducedMotion);
  const introMs = getSlashTitleIntroDurationMs("lg", reducedMotion);
  const onIntroCompleteRef = useRef(onIntroComplete);
  onIntroCompleteRef.current = onIntroComplete;

  useEffect(() => {
    const timer = setTimeout(() => {
      onIntroCompleteRef.current?.();
    }, introMs);
    return () => clearTimeout(timer);
  }, [introMs, reducedMotion]);

  return (
    <div className="relative flex flex-col items-center w-full shrink-0 overflow-visible px-1">
      <div
        className="pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 h-14 w-[min(100%,19rem)] rounded-full opacity-35 blur-2xl"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--neon-pink) 40%, transparent), color-mix(in srgb, var(--neon-cyan) 45%, transparent))",
        }}
        aria-hidden="true"
      />

      <SlashTitle
        key="splash-slash-title"
        size="lg"
        reducedMotion={reducedMotion}
        className="relative z-10 mb-0 pb-0 w-full"
      />

      {!reducedMotion && (
        <motion.div
          className="relative z-10 mt-5 h-px w-[min(76%,13.5rem)] origin-center"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--neon-cyan), color-mix(in srgb, var(--neon-pink) 55%, var(--neon-cyan)), transparent)",
            boxShadow: "0 0 14px color-mix(in srgb, var(--neon-cyan) 35%, transparent)",
          }}
          initial={{ opacity: 0, scaleX: 0.2 }}
          animate={{ opacity: [0, 0, 0.85, 0.45], scaleX: [0.2, 0.2, 1, 1] }}
          transition={{
            delay: sliceDelayMs / 1000,
            duration: 0.72,
            times: [0, 0.12, 0.45, 1],
            ease: [0.16, 1, 0.3, 1],
          }}
          aria-hidden="true"
        />
      )}

      {reducedMotion && (
        <div
          className="relative z-10 mt-5 h-px w-[min(76%,13.5rem)] opacity-35"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--neon-cyan), transparent)",
          }}
          aria-hidden="true"
        />
      )}

      <h2 id="splash-title" className="sr-only">
        Koi Monitor
      </h2>
    </div>
  );
};

export { getSlashTitleIntroDurationMs };
