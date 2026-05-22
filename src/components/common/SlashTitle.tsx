import React, { useId } from "react";
import { motion } from "framer-motion";

const SLICE_EASE = [0.4, 0, 0.85, 1] as const;
const SPLIT_EASE = [0.16, 1, 0.3, 1] as const;

export type SlashTitleSize = "lg" | "md" | "sm";

const SIZE = {
  lg: {
    text: "text-4xl sm:text-[2.75rem] font-bold",
    katana: "h-[5.25rem] sm:h-[5.75rem]",
    katanaFrom: -88,
    katanaTo: 32,
    flashTop: "3.5rem",
    flashH: "3.25rem",
    titleMt: "mt-8 sm:mt-9",
    padTop: "pt-6 pb-2",
    split: 10,
    katanaDelay: 0.38,
    sliceAt: 0.52,
    splitAt: 0.54,
    katanaDur: 0.58,
  },
  md: {
    text: "text-xl font-bold",
    katana: "h-14",
    katanaFrom: -58,
    katanaTo: 20,
    flashTop: "2.25rem",
    flashH: "2.35rem",
    titleMt: "mt-6",
    padTop: "pt-4 pb-2",
    split: 7,
    katanaDelay: 0.22,
    sliceAt: 0.44,
    splitAt: 0.46,
    katanaDur: 0.52,
  },
  sm: {
    text: "text-sm font-semibold",
    katana: "h-[2.35rem]",
    katanaFrom: -40,
    katanaTo: 6,
    flashTop: "0.1rem",
    flashH: "1.35rem",
    titleMt: "mt-3",
    padTop: "pt-2",
    split: 4,
    katanaDelay: 0.12,
    sliceAt: 0.38,
    splitAt: 0.4,
    katanaDur: 0.48,
  },
} as const;

export const KatanaIcon: React.FC<{ className?: string }> = ({ className = "" }) => {
  const uid = useId().replace(/:/g, "");
  const gold = `kt-gold-${uid}`;
  const blade = `kt-blade-${uid}`;

  return (
    <svg
      viewBox="0 0 28 72"
      fill="none"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gold} x1="14" y1="0" x2="14" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--neon-pink)" />
          <stop offset="1" stopColor="#ffb347" />
        </linearGradient>
        <linearGradient id={blade} x1="14" y1="14" x2="14" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffb347" />
          <stop offset="0.4" stopColor="var(--neon-cyan)" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--neon-cyan) 70%, white)" />
        </linearGradient>
      </defs>
      <rect x="10" y="4" width="8" height="11" rx="1.5" fill={`url(#${gold})`} />
      <ellipse cx="14" cy="15" rx="6" ry="2" fill="#ffb347" opacity="0.9" />
      <line
        x1="14"
        y1="17"
        x2="14"
        y2="66"
        stroke={`url(#${blade})`}
        strokeWidth="3"
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 4px var(--neon-cyan))" }}
      />
    </svg>
  );
};

interface SlashTitleProps {
  size?: SlashTitleSize;
  reducedMotion?: boolean;
  className?: string;
  gradient?: boolean;
}

const TitleLayer: React.FC<{
  reducedMotion: boolean;
  textClass: string;
  gradient: boolean;
}> = ({ reducedMotion, textClass, gradient }) => (
  <motion.span
    initial={
      reducedMotion
        ? { opacity: 1 }
        : { opacity: 0, letterSpacing: sizeLetterSpacing(textClass), filter: "blur(6px)" }
    }
    animate={{ opacity: 1, letterSpacing: "-0.02em", filter: "blur(0px)" }}
    transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
    className={`block whitespace-nowrap ${textClass} ${gradient ? "splash-title-gradient" : "text-[var(--foreground)]"}`}
  >
    Koi Monitor
  </motion.span>
);

function sizeLetterSpacing(textClass: string) {
  if (textClass.includes("text-sm")) return "0.12em";
  if (textClass.includes("text-xl")) return "0.15em";
  return "0.18em";
}

export const SlashTitle: React.FC<SlashTitleProps> = ({
  size = "lg",
  reducedMotion = false,
  className = "",
  gradient = true,
}) => {
  const cfg = SIZE[size];
  const splitStart = reducedMotion ? cfg.split : 0;

  return (
    <div
      className={`relative flex flex-col items-center w-full ${cfg.padTop} ${className}`}
    >
      <motion.div
        className="absolute left-1/2 z-30 -translate-x-1/2 pointer-events-none"
        initial={{
          y: reducedMotion ? cfg.katanaTo : cfg.katanaFrom,
          opacity: reducedMotion ? 1 : 0.5,
        }}
        animate={{ y: cfg.katanaTo, opacity: 1 }}
        transition={{
          delay: reducedMotion ? 0 : cfg.katanaDelay,
          duration: reducedMotion ? 0 : cfg.katanaDur,
          ease: SLICE_EASE,
        }}
      >
        <KatanaIcon className={`${cfg.katana} w-auto`} />
      </motion.div>

      {!reducedMotion && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 z-20 w-0.5 rounded-full pointer-events-none"
          style={{
            top: cfg.flashTop,
            height: cfg.flashH,
            background: "var(--neon-cyan)",
            boxShadow:
              "0 0 12px var(--neon-cyan), 0 0 24px color-mix(in srgb, var(--neon-cyan) 35%, transparent)",
          }}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: [0, 0, 1, 0], scaleY: [0, 0, 1, 1] }}
          transition={{ delay: cfg.sliceAt, duration: 0.28, ease: "easeOut" }}
        />
      )}

      <div className={`relative ${cfg.titleMt}`}>
        <div
          className={`${cfg.text} whitespace-nowrap opacity-0 pointer-events-none select-none px-0.5`}
          aria-hidden="true"
        >
          Koi Monitor
        </div>

        {gradient && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none blur-md opacity-45"
            aria-hidden="true"
          >
            <span className={`${cfg.text} whitespace-nowrap splash-title-gradient px-0.5`}>
              Koi Monitor
            </span>
          </div>
        )}

        <motion.div
          className="absolute inset-0 overflow-hidden select-none"
          style={{ clipPath: "inset(0 50% 0 0)" }}
          initial={{ x: reducedMotion ? -cfg.split : splitStart }}
          animate={{ x: -cfg.split }}
          transition={{
            delay: reducedMotion ? 0 : cfg.splitAt,
            duration: reducedMotion ? 0 : 0.42,
            ease: SPLIT_EASE,
          }}
        >
          <TitleLayer
            reducedMotion={reducedMotion}
            textClass={cfg.text}
            gradient={gradient}
          />
        </motion.div>

        <motion.div
          className="absolute inset-0 overflow-hidden select-none"
          style={{ clipPath: "inset(0 0 0 50%)" }}
          initial={{ x: reducedMotion ? cfg.split : -splitStart }}
          animate={{ x: cfg.split }}
          transition={{
            delay: reducedMotion ? 0 : cfg.splitAt,
            duration: reducedMotion ? 0 : 0.42,
            ease: SPLIT_EASE,
          }}
        >
          <TitleLayer
            reducedMotion={reducedMotion}
            textClass={cfg.text}
            gradient={gradient}
          />
        </motion.div>
      </div>
    </div>
  );
};
