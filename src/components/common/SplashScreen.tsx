import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import { Cpu, Globe, Disc, Check } from "lucide-react";
import { SplashSlashTitle } from "./SplashSlashTitle";
import { getNeonTextShadow } from "../../utils/neonEffects";
import { useAppStore } from "../../store";

interface SplashScreenProps {
  isSystemReady: boolean;
  isDnsReady: boolean;
  isDriversReady: boolean;
  onComplete: () => void;
}

const STEPS = [
  {
    id: "system",
    icon: Cpu,
    label: "Matériel",
    detail: "CPU, RAM & GPU",
    color: "var(--neon-pink)",
    textColor: "var(--neon-pink-text)",
  },
  {
    id: "dns",
    icon: Globe,
    label: "Réseau & DNS",
    detail: "Latence & connectivité",
    color: "var(--neon-cyan)",
    textColor: "var(--neon-cyan-text)",
  },
  {
    id: "drivers",
    icon: Disc,
    label: "Pilotes",
    detail: "Matériel physique",
    color: "var(--neon-green)",
    textColor: "var(--neon-green-text)",
  },
] as const;

const STATUS_MESSAGES = [
  "Initialisation du noyau Koi…",
  "Synchronisation matérielle…",
  "Analyse réseau & DNS…",
  "Inventaire des pilotes…",
  "Tableau de bord prêt.",
] as const;

/** 0 = init · 1 = matériel · 2 = DNS · 3 = pilotes · 4 = prêt */
type SplashPhase = 0 | 1 | 2 | 3 | 4;

const SPLASH_SAFETY_TIMEOUT_MS = 90_000;

const TIMING = {
  init: 900,
  system: 1_800,
  dns: 1_800,
  drivers: 1_400,
  ready: 1_100,
} as const;

const TIMING_REDUCED = {
  init: 450,
  system: 900,
  dns: 900,
  drivers: 700,
  ready: 550,
} as const;

/** Planchers / plafonds de progression par phase visuelle. */
const PHASE_PROGRESS: Record<SplashPhase, { floor: number; ceiling: number }> = {
  0: { floor: 0, ceiling: 10 },
  1: { floor: 10, ceiling: 32 },
  2: { floor: 33, ceiling: 64 },
  3: { floor: 66, ceiling: 94 },
  4: { floor: 95, ceiling: 100 },
};

function easeOutQuad(t: number): number {
  return 1 - (1 - t) ** 2;
}

function lerp(current: number, target: number, factor: number): number {
  if (Math.abs(target - current) < 0.15) return target;
  return current + (target - current) * factor;
}

function phaseMinDuration(phase: SplashPhase, reduced: boolean): number {
  const t = reduced ? TIMING_REDUCED : TIMING;
  switch (phase) {
    case 0:
      return t.init;
    case 1:
      return t.system;
    case 2:
      return t.dns;
    case 3:
      return t.drivers;
    case 4:
      return t.ready;
    default:
      return 0;
  }
}

function backendReadyForPhase(
  phase: SplashPhase,
  flags: { system: boolean; dns: boolean; drivers: boolean },
): boolean {
  switch (phase) {
    case 0:
      return true;
    case 1:
      return flags.system;
    case 2:
      return flags.dns;
    case 3:
      return flags.drivers;
    case 4:
      return true;
    default:
      return true;
  }
}

function computePhaseTargetPercent(
  phase: SplashPhase,
  inPhaseMs: number,
  minMs: number,
  driversReady: boolean,
): number {
  const { floor, ceiling } = PHASE_PROGRESS[phase];
  const duration = Math.max(minMs, 1);
  const linear = easeOutQuad(Math.min(1, inPhaseMs / duration));

  if (phase === 3 && !driversReady) {
    const waitProgress = 1 - Math.exp(-inPhaseMs / 18_000);
    return floor + (ceiling - floor - 4) * waitProgress;
  }

  return floor + (ceiling - floor) * linear;
}

const SplashPetal: React.FC<{
  delay: number;
  x: string;
  size: number;
  duration: number;
}> = ({ delay, x, size, duration }) => (
  <motion.div
    className="absolute pointer-events-none opacity-40"
    style={{ left: x, top: "-5%", width: size, height: size }}
    initial={{ y: 0, rotate: 0, opacity: 0 }}
    animate={{
      y: "110vh",
      rotate: 360,
      opacity: [0, 0.5, 0.35, 0],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "linear",
    }}
    aria-hidden="true"
  >
    <svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15,4 C19,-1 28,1 28,10 C28,18 20,26 15,30 C10,26 2,18 2,10 C2,1 11,-1 15,4 Z"
        fill="var(--neon-pink)"
      />
    </svg>
  </motion.div>
);

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isSystemReady,
  isDnsReady,
  isDriversReady,
  onComplete,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const reduced = prefersReducedMotion ?? false;
  const theme = useAppStore((s) => s.theme);
  const isDark = theme === "dark";

  const [phase, setPhase] = useState<SplashPhase>(0);
  const [percent, setPercent] = useState(0);
  const phaseStartRef = useRef(Date.now());
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);
  onCompleteRef.current = onComplete;

  const backendFlags = useMemo(
    () => ({ system: isSystemReady, dns: isDnsReady, drivers: isDriversReady }),
    [isSystemReady, isDnsReady, isDriversReady],
  );

  const showSystemReady = phase >= 2;
  const showDnsReady = phase >= 3;
  const showDriversReady = phase >= 4;
  const readyFlags = [showSystemReady, showDnsReady, showDriversReady];

  const statusIndex = phase;

  const advancePhase = useCallback(() => {
    setPhase((current) => {
      if (current >= 4) return current;
      phaseStartRef.current = Date.now();
      return (current + 1) as SplashPhase;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const inPhaseMs = Date.now() - phaseStartRef.current;
      const minMs = phaseMinDuration(phase, reduced);
      const canLeave =
        inPhaseMs >= minMs && backendReadyForPhase(phase, backendFlags);

      if (canLeave && phase < 4) {
        advancePhase();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [phase, reduced, backendFlags, advancePhase]);

  useEffect(() => {
    const interval = setInterval(() => {
      const inPhaseMs = Date.now() - phaseStartRef.current;
      const minMs = phaseMinDuration(phase, reduced);
      const target = computePhaseTargetPercent(
        phase,
        inPhaseMs,
        minMs,
        isDriversReady,
      );

      setPercent((prev) => {
        const next = lerp(prev, target, reduced ? 0.22 : 0.14);
        return Math.min(100, Math.max(prev, next));
      });
    }, 32);

    return () => clearInterval(interval);
  }, [phase, reduced, isDriversReady]);

  useEffect(() => {
    if (phase === 4) {
      setPercent((prev) => lerp(prev, 100, 0.12));
    }
  }, [phase]);

  const finishSplash = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    if (phase !== 4 || percent < 99.5) return;
    const timer = setTimeout(finishSplash, reduced ? 280 : 600);
    return () => clearTimeout(timer);
  }, [phase, percent, reduced, finishSplash]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase(4);
      setPercent(100);
      finishSplash();
    }, SPLASH_SAFETY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [finishSplash]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.04,
        filter: "blur(16px)",
        transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--background)] select-none overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="splash-title"
      aria-describedby="splash-progress"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute top-1/3 left-1/4 w-[min(90vw,520px)] h-[min(90vw,520px)] rounded-full blur-[100px] splash-aurora ${reduced ? "opacity-30" : ""}`}
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--neon-pink) 22%, transparent), transparent 70%)",
          }}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 w-[min(80vw,440px)] h-[min(80vw,440px)] rounded-full blur-[90px] splash-aurora-delayed ${reduced ? "opacity-25" : ""}`}
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--neon-purple) 20%, transparent), transparent 70%)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(70vw,360px)] h-[min(70vw,360px)] rounded-full blur-[80px] opacity-30"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--neon-cyan) 15%, transparent), transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(color-mix(in srgb, var(--foreground) 40%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--foreground) 40%, transparent) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {!reduced &&
        [
          { delay: 0, x: "12%", size: 14, duration: 14 },
          { delay: 2.5, x: "28%", size: 10, duration: 18 },
          { delay: 1, x: "62%", size: 12, duration: 16 },
          { delay: 4, x: "78%", size: 9, duration: 20 },
          { delay: 3, x: "88%", size: 11, duration: 17 },
        ].map((p, i) => (
          <SplashPetal key={i} {...p} />
        ))}

      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-[min(92vw,28rem)] sm:w-[min(90vw,32rem)] mx-4"
      >
        <div className="bento-card liquid-glass p-8 sm:p-10 flex flex-col items-center relative overflow-visible">
          <div
            className="absolute inset-x-0 top-0 h-px pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--neon-pink), var(--neon-purple), var(--neon-cyan), transparent)",
            }}
          />

          <SplashSlashTitle reducedMotion={reduced} />

          <div className="w-full space-y-3 mb-8 mt-2">
            {STEPS.map((step, index) => (
              <LoadingRow
                key={step.id}
                step={step}
                index={index}
                isReady={readyFlags[index]}
                isActive={phase === index + 1}
                reducedMotion={reduced}
              />
            ))}
          </div>

          <div className="w-full" id="splash-progress">
            <div className="flex justify-between items-end mb-3 px-1 gap-4">
              <AnimatePresence mode="wait">
                <motion.span
                  key={statusIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                  className="text-xs font-medium text-[var(--text-muted)] mono-text tracking-wide"
                >
                  {STATUS_MESSAGES[statusIndex]}
                </motion.span>
              </AnimatePresence>
              <span
                className="text-sm font-bold mono-text tabular-nums shrink-0"
                style={{
                  color: "var(--neon-pink-text)",
                  textShadow: getNeonTextShadow("var(--neon-pink)", isDark),
                }}
              >
                {Math.round(percent)}%
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuenow={Math.round(percent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progression du diagnostic système"
              className="h-2 w-full rounded-full overflow-hidden border border-[var(--border)] bg-[var(--surface-inset)] relative"
            >
              <motion.div
                className="h-full rounded-full splash-progress-glow relative overflow-hidden"
                animate={{ width: `${percent}%` }}
                transition={{
                  duration: reduced ? 0.15 : 0.45,
                  ease: [0.25, 1, 0.5, 1],
                }}
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, var(--neon-pink), var(--neon-purple), var(--neon-cyan), var(--neon-purple), var(--neon-pink))",
                  boxShadow: "0 0 16px color-mix(in srgb, var(--neon-cyan) 40%, transparent)",
                }}
              />
            </div>

            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {STATUS_MESSAGES[statusIndex]} {Math.round(percent)} pour cent
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface LoadingRowProps {
  step: (typeof STEPS)[number];
  index: number;
  isReady: boolean;
  isActive: boolean;
  reducedMotion: boolean;
}

const LoadingRow: React.FC<LoadingRowProps> = ({
  step,
  index,
  isReady,
  isActive,
  reducedMotion,
}) => {
  const Icon = step.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{
        opacity: 1,
        x: 0,
        scale: isActive ? 1.01 : 1,
      }}
      transition={{
        delay: 0.35 + index * 0.12,
        layout: { duration: 0.4, ease: [0.25, 1, 0.5, 1] },
        scale: { duration: 0.35 },
        opacity: { duration: 0.35 },
      }}
      className={`relative flex items-center gap-3 py-3 px-4 rounded-2xl border overflow-hidden ${
        isReady
          ? "bg-[var(--surface-inset)] border-[var(--border)]"
          : isActive
            ? "bg-[var(--surface-muted)]/60 border-[var(--border-strong)] splash-row-scan"
            : "bg-[var(--surface-inset)]/50 border-[var(--border)] opacity-55"
      }`}
      style={
        isActive
          ? ({ "--row-accent": step.color } as React.CSSProperties)
          : undefined
      }
    >
      <motion.div
        className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
        animate={{
          backgroundColor: isReady || isActive ? step.color : "var(--border)",
          opacity: isReady || isActive ? 1 : 0.35,
          boxShadow: isActive
            ? `0 0 12px color-mix(in srgb, ${step.color} 50%, transparent)`
            : "none",
        }}
        transition={{ duration: 0.45 }}
      />

      <motion.div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ml-1"
        animate={{
          color: isReady || isActive ? step.color : "var(--text-subtle)",
          borderColor: isReady || isActive
            ? `color-mix(in srgb, ${step.color} 35%, var(--border))`
            : "var(--border)",
          backgroundColor: isReady || isActive
            ? `color-mix(in srgb, ${step.color} 10%, transparent)`
            : "var(--surface-inset)",
        }}
        transition={{ duration: 0.45 }}
      >
        <Icon size={16} aria-hidden="true" />
      </motion.div>

      <div className="flex-1 min-w-0 text-left">
        <motion.p
          className="text-sm font-semibold leading-none mb-1"
          animate={{
            color: isReady || isActive ? step.textColor : "var(--text-muted)",
          }}
          transition={{ duration: 0.35 }}
        >
          {step.label}
        </motion.p>
        <p className="text-[10px] text-[var(--text-subtle)] truncate">{step.detail}</p>
      </div>

      <div className="flex items-center justify-center w-8 h-8 shrink-0">
        <AnimatePresence mode="wait">
          {isReady ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 20 }}
              className="w-7 h-7 rounded-full flex items-center justify-center border"
              style={{
                backgroundColor: "color-mix(in srgb, var(--neon-green) 15%, transparent)",
                borderColor: "color-mix(in srgb, var(--neon-green) 35%, transparent)",
                boxShadow: "0 0 12px color-mix(in srgb, var(--neon-green) 25%, transparent)",
              }}
            >
              <Check size={14} className="text-[var(--neon-green-text)]" strokeWidth={3} />
            </motion.div>
          ) : isActive && !reducedMotion ? (
            <motion.div
              key="spin"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{
                opacity: { duration: 0.25 },
                scale: { duration: 0.25 },
                rotate: { repeat: Infinity, duration: 1.2, ease: "linear" },
              }}
              className="w-5 h-5 rounded-full border-2 border-transparent"
              style={{
                borderTopColor: step.color,
                borderRightColor: `color-mix(in srgb, ${step.color} 40%, transparent)`,
              }}
            />
          ) : (
            <motion.div
              key="dot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-2 h-2 rounded-full bg-[var(--border-strong)]"
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
