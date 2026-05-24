import React, { useId, useMemo } from "react";
import { motion } from "framer-motion";

const SLICE_EASE = [0.4, 0, 0.85, 1] as const;
const SPLIT_OPEN_EASE = [0.33, 0, 0.18, 1] as const;
const SPLIT_HOLD_EASE = [0.42, 0, 0.58, 1] as const;
const SPLIT_REJOIN_EASE = [0.16, 1, 0.3, 1] as const;
const KATANA_HORIZONTAL_R = 90;

export type SlashTitleSize = "lg" | "md" | "sm";
export type SlashTitleVariant = "full" | "static";

type MotionPoint = { x: number; y: number; r: number };

const HORIZONTAL_CLIPS = {
  top: "inset(0 0 50% 0)",
  bottom: "inset(50% 0 0 0)",
} as const;

const SIZE = {
  lg: {
    text: "text-4xl sm:text-[2.75rem] font-bold",
    katana: "h-11 sm:h-12",
    enter: { x: -62, y: 0, r: KATANA_HORIZONTAL_R - 8 },
    slice: { x: 0, y: 0, r: KATANA_HORIZONTAL_R },
    exit: { x: 54, y: -10, r: KATANA_HORIZONTAL_R + 6 },
    split: 10,
    flashLen: "min(92vw, 18rem)",
    trailSpan: 132,
    particles: 10,
    katanaDelay: 0.22,
    katanaDur: 0.96,
    sliceAt: 0.44,
    splitAt: 0.48,
    padBottom: "pb-1",
  },
  md: {
    text: "text-xl font-bold",
    katana: "h-9",
    enter: { x: -44, y: 0, r: KATANA_HORIZONTAL_R - 7 },
    slice: { x: 0, y: 0, r: KATANA_HORIZONTAL_R },
    exit: { x: 40, y: -8, r: KATANA_HORIZONTAL_R + 5 },
    split: 7,
    flashLen: "min(88vw, 13rem)",
    trailSpan: 96,
    particles: 8,
    katanaDelay: 0.14,
    katanaDur: 0.82,
    sliceAt: 0.42,
    splitAt: 0.46,
    padBottom: "pb-0",
  },
  sm: {
    text: "text-sm font-semibold tracking-tight",
    katana: "h-7",
    enter: { x: -32, y: 0, r: KATANA_HORIZONTAL_R - 6 },
    slice: { x: 0, y: 0, r: KATANA_HORIZONTAL_R },
    exit: { x: 28, y: -6, r: KATANA_HORIZONTAL_R + 4 },
    split: 4,
    flashLen: "9rem",
    trailSpan: 72,
    particles: 6,
    katanaDelay: 0.08,
    katanaDur: 0.72,
    sliceAt: 0.4,
    splitAt: 0.44,
    padBottom: "pb-0",
  },
} as const;

/** Durée jusqu'à la fin du recollage (orchestration splash). */
export function getSlashTitleIntroDurationMs(
  size: SlashTitleSize = "lg",
  reducedMotion = false,
): number {
  if (reducedMotion) return 380;
  const cfg = SIZE[size];
  const splitEndMs = (cfg.katanaDelay + cfg.splitAt + 1.12) * 1000;
  const katanaEndMs = (cfg.katanaDelay + cfg.katanaDur) * 1000;
  return Math.ceil(Math.max(splitEndMs, katanaEndMs) + 160);
}

/** Instant du slash (ligne / éclair) en ms. */
export function getSlashTitleSliceDelayMs(
  size: SlashTitleSize = "lg",
  reducedMotion = false,
): number {
  if (reducedMotion) return 0;
  const cfg = SIZE[size];
  return Math.round((cfg.katanaDelay + cfg.sliceAt) * 1000);
}

function horizontalSplitOffset(splitPx: number) {
  return {
    top: { x: 0, y: -splitPx },
    bottom: { x: 0, y: splitPx },
  };
}

function splitLayerKeyframes(
  targetY: number,
  reducedMotion: boolean,
  delay: number,
) {
  if (reducedMotion) {
    return {
      initial: { x: 0, y: 0 },
      animate: { x: 0, y: 0 },
      transition: { duration: 0 },
    };
  }

  const overshoot = -targetY * 0.16;

  return {
    initial: { x: 0, y: 0, filter: "blur(0px)" },
    animate: {
      x: 0,
      y: [0, targetY, targetY, overshoot, 0],
      filter: ["blur(0px)", "blur(0px)", "blur(0.35px)", "blur(0px)", "blur(0px)"],
    },
    transition: {
      delay,
      duration: 1.12,
      times: [0, 0.18, 0.32, 0.72, 1],
      ease: [
        SPLIT_OPEN_EASE,
        SPLIT_OPEN_EASE,
        SPLIT_HOLD_EASE,
        SPLIT_REJOIN_EASE,
        SPLIT_REJOIN_EASE,
      ],
    },
  };
}

function sizeLetterSpacing(textClass: string) {
  if (textClass.includes("text-sm")) return "0.1em";
  if (textClass.includes("text-xl")) return "0.14em";
  return "0.18em";
}

function particlePositions(count: number, spanPx: number) {
  return Array.from({ length: count }, (_, index) => {
    const t = count <= 1 ? 0 : index / (count - 1) - 0.5;
    return {
      x: spanPx * t * 2,
      y: (index % 2 === 0 ? -1 : 1) * (1 + (index % 3)),
      delay: index * 0.024,
    };
  });
}

function motionKeyframes(
  enter: MotionPoint,
  slice: MotionPoint,
  exit: MotionPoint,
  reducedMotion: boolean,
) {
  if (reducedMotion) {
    return {
      x: slice.x,
      y: slice.y,
      rotate: slice.r,
      opacity: 1,
    };
  }
  return {
    x: [enter.x, slice.x, exit.x],
    y: [enter.y, slice.y, exit.y],
    rotate: [enter.r, slice.r, exit.r],
    opacity: [0, 1, 0],
  };
}

export const KatanaIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = "",
  style,
}) => {
  const uid = useId().replace(/:/g, "");
  const gold = `kt-gold-${uid}`;
  const blade = `kt-blade-${uid}`;
  const edge = `kt-edge-${uid}`;

  return (
    <svg
      viewBox="0 0 32 80"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gold} x1="16" y1="0" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--neon-pink)" />
          <stop offset="1" stopColor="#ffb347" />
        </linearGradient>
        <linearGradient id={blade} x1="16" y1="16" x2="16" y2="74" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffb347" />
          <stop offset="0.35" stopColor="var(--neon-cyan)" />
          <stop offset="1" stopColor="color-mix(in srgb, white 75%, var(--neon-cyan))" />
        </linearGradient>
        <linearGradient id={edge} x1="12" y1="18" x2="20" y2="74" gradientUnits="userSpaceOnUse">
          <stop stopColor="color-mix(in srgb, white 70%, var(--neon-cyan))" stopOpacity="0.9" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
      </defs>
      <rect x="11" y="4" width="10" height="13" rx="2" fill={`url(#${gold})`} />
      <ellipse cx="16" cy="17.5" rx="7.5" ry="2.5" fill="#ffb347" opacity="0.92" />
      <path
        d="M8 19.5C11 18.5 21 18.5 24 19.5"
        stroke="color-mix(in srgb, var(--neon-pink) 55%, white)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <line
        x1="16"
        y1="20"
        x2="16"
        y2="72"
        stroke={`url(#${blade})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        style={{
          filter:
            "drop-shadow(0 0 5px var(--neon-cyan)) drop-shadow(0 0 10px color-mix(in srgb, var(--neon-cyan) 35%, transparent))",
        }}
      />
      <line
        x1="13.5"
        y1="22"
        x2="13.5"
        y2="68"
        stroke={`url(#${edge})`}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
};

interface SlashTitleProps {
  size?: SlashTitleSize;
  variant?: SlashTitleVariant;
  reducedMotion?: boolean;
  className?: string;
  gradient?: boolean;
  onSecretTap?: () => void;
}

const SecretKoiLabel: React.FC<{
  onSecretTap?: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ onSecretTap, className, children }) => {
  if (!onSecretTap) {
    return <span className={className}>{children}</span>;
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSecretTap();
    }
  };

  return (
    <span
      role="button"
      tabIndex={0}
      data-tauri-drag-region={false}
      className={`cursor-pointer pointer-events-auto select-none ${className ?? ''}`}
      onClick={(event) => {
        event.stopPropagation();
        onSecretTap();
      }}
      onKeyDown={handleKeyDown}
    >
      {children}
    </span>
  );
};

const TitleLayer: React.FC<{
  reducedMotion: boolean;
  textClass: string;
  gradient: boolean;
  onSecretTap?: () => void;
}> = ({ reducedMotion, textClass, gradient, onSecretTap }) => (
  <motion.span
    initial={
      reducedMotion
        ? { opacity: 1 }
        : { opacity: 0, letterSpacing: sizeLetterSpacing(textClass), filter: "blur(5px)" }
    }
    animate={{ opacity: 1, letterSpacing: "-0.02em", filter: "blur(0px)" }}
    transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
    className={`block whitespace-nowrap px-0.5 pointer-events-auto ${textClass} ${
      gradient ? "splash-title-gradient" : "text-[var(--foreground)]"
    }`}
  >
    <SecretKoiLabel onSecretTap={onSecretTap}>Koi</SecretKoiLabel>
    <span> Monitor</span>
  </motion.span>
);

const SlashTitleStatic: React.FC<{
  size: SlashTitleSize;
  className: string;
  onSecretTap?: () => void;
}> = ({ size, className, onSecretTap }) => {
  const cfg = SIZE[size];
  return (
    <span className={`slash-title-static ${cfg.text} ${className}`} aria-label="Koi Monitor">
      <SecretKoiLabel onSecretTap={onSecretTap} className="slash-title-static-koi">
        Koi
      </SecretKoiLabel>
      <span className="slash-title-static-monitor"> Monitor</span>
    </span>
  );
};

export const SlashTitle: React.FC<SlashTitleProps> = ({
  size = "lg",
  variant = "full",
  reducedMotion = false,
  className = "",
  gradient = true,
  onSecretTap,
}) => {
  const cfg = SIZE[size];

  if (variant === "static") {
    return <SlashTitleStatic size={size} className={className} onSecretTap={onSecretTap} />;
  }

  const offsets = horizontalSplitOffset(cfg.split);
  const sliceTime = cfg.sliceAt / cfg.katanaDur;
  const particles = useMemo(
    () => particlePositions(cfg.particles, cfg.trailSpan * 0.42),
    [cfg.particles, cfg.trailSpan],
  );
  const katanaMotion = motionKeyframes(cfg.enter, cfg.slice, cfg.exit, reducedMotion);
  const splitDelay = reducedMotion ? 0 : cfg.katanaDelay + cfg.splitAt;
  const topSplit = splitLayerKeyframes(offsets.top.y, reducedMotion, splitDelay);
  const bottomSplit = splitLayerKeyframes(offsets.bottom.y, reducedMotion, splitDelay);

  return (
    <div
      className={`relative flex flex-col items-center overflow-visible w-full ${cfg.padBottom} ${className}`}
    >
      <div className="relative inline-flex flex-col items-center overflow-visible">
        <div
          className={`${cfg.text} whitespace-nowrap opacity-0 pointer-events-none select-none px-0.5`}
          aria-hidden="true"
        >
          Koi Monitor
        </div>

        <div className="absolute inset-0 overflow-visible pointer-events-none">
          {!reducedMotion && (
            <>
              <motion.div
                className="absolute left-1/2 top-1/2 z-10 h-[2px] origin-center -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: cfg.trailSpan,
                  background:
                    "linear-gradient(90deg, transparent, color-mix(in srgb, var(--neon-cyan) 20%, transparent), var(--neon-cyan), color-mix(in srgb, var(--neon-pink) 35%, transparent), transparent)",
                  boxShadow: "0 0 16px color-mix(in srgb, var(--neon-cyan) 45%, transparent)",
                }}
                initial={{ opacity: 0, scaleX: 0.15, x: cfg.enter.x - cfg.trailSpan * 0.35 }}
                animate={{
                  opacity: [0, 0.85, 0.25, 0],
                  scaleX: [0.15, 1, 0.55, 0.2],
                  x: [cfg.enter.x - cfg.trailSpan * 0.35, cfg.slice.x, cfg.exit.x, cfg.exit.x + 12],
                }}
                transition={{
                  delay: cfg.katanaDelay,
                  duration: cfg.katanaDur * 0.92,
                  times: [0, sliceTime, sliceTime + 0.18, 1],
                  ease: SLICE_EASE,
                }}
              />

              <motion.div
                className="absolute left-1/2 top-1/2 z-[15] -translate-x-1/2 -translate-y-1/2 rounded-full border pointer-events-none"
                style={{
                  borderColor: "color-mix(in srgb, var(--neon-cyan) 55%, transparent)",
                }}
                initial={{ width: 0, height: 0, opacity: 0 }}
                animate={{
                  width: [0, 56, 72],
                  height: [0, 22, 28],
                  opacity: [0, 0.55, 0],
                }}
                transition={{
                  delay: cfg.katanaDelay + cfg.sliceAt,
                  duration: 0.36,
                  ease: "easeOut",
                }}
              />
            </>
          )}

          <motion.div
            className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
            initial={
              reducedMotion
                ? { x: cfg.slice.x, y: cfg.slice.y, rotate: cfg.slice.r, opacity: 1 }
                : { x: cfg.enter.x, y: cfg.enter.y, rotate: cfg.enter.r, opacity: 0 }
            }
            animate={katanaMotion}
            transition={{
              delay: reducedMotion ? 0 : cfg.katanaDelay,
              duration: reducedMotion ? 0 : cfg.katanaDur,
              times: reducedMotion ? undefined : [0, sliceTime, 1],
              ease: SLICE_EASE,
            }}
          >
            <KatanaIcon className={`${cfg.katana} w-auto`} />
          </motion.div>

          {!reducedMotion && (
            <>
              <motion.div
                className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full origin-center"
                style={{
                  width: cfg.flashLen,
                  height: "2px",
                  background:
                    "linear-gradient(90deg, transparent, var(--neon-cyan), color-mix(in srgb, white 40%, var(--neon-cyan)), transparent)",
                  boxShadow:
                    "0 0 12px var(--neon-cyan), 0 0 22px color-mix(in srgb, var(--neon-cyan) 35%, transparent)",
                }}
                initial={{ opacity: 0, scaleX: 0, scaleY: 0.5 }}
                animate={{
                  opacity: [0, 0, 1, 0.7, 0],
                  scaleX: [0, 0, 1, 1.05, 0.35],
                  scaleY: [0.5, 0.5, 1, 1.2, 0.7],
                }}
                transition={{
                  delay: cfg.katanaDelay + cfg.sliceAt,
                  duration: 0.36,
                  ease: "easeOut",
                }}
              />

              {particles.map((particle, index) => (
                <motion.span
                  key={index}
                  className="absolute z-[22] rounded-full"
                  style={{
                    left: `calc(50% + ${particle.x}px)`,
                    top: `calc(50% + ${particle.y}px)`,
                    width: index % 3 === 0 ? 4 : 3,
                    height: index % 3 === 0 ? 4 : 3,
                    background:
                      index % 2 === 0
                        ? "var(--neon-cyan)"
                        : "color-mix(in srgb, var(--neon-pink) 70%, white)",
                    boxShadow:
                      index % 2 === 0
                        ? "0 0 8px var(--neon-cyan)"
                        : "0 0 6px var(--neon-pink)",
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1.25, 0] }}
                  transition={{
                    delay: cfg.katanaDelay + cfg.sliceAt + particle.delay,
                    duration: 0.34,
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          )}

          {gradient && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none blur-md opacity-35"
              aria-hidden="true"
            >
              <span className={`${cfg.text} whitespace-nowrap splash-title-gradient px-0.5`}>
                Koi Monitor
              </span>
            </div>
          )}

          <motion.div
            className="absolute inset-0 overflow-hidden select-none will-change-transform pointer-events-none"
            style={{ clipPath: HORIZONTAL_CLIPS.top }}
            initial={topSplit.initial}
            animate={topSplit.animate}
            transition={topSplit.transition}
          >
            <TitleLayer reducedMotion={reducedMotion} textClass={cfg.text} gradient={gradient} onSecretTap={onSecretTap} />
          </motion.div>

          <motion.div
            className="absolute inset-0 overflow-hidden select-none will-change-transform pointer-events-none"
            style={{ clipPath: HORIZONTAL_CLIPS.bottom }}
            initial={bottomSplit.initial}
            animate={bottomSplit.animate}
            transition={bottomSplit.transition}
          >
            <TitleLayer reducedMotion={reducedMotion} textClass={cfg.text} gradient={gradient} onSecretTap={onSecretTap} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};
