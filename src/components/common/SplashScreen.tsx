import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import { Cpu, Globe, Disc, Check } from "lucide-react";
import { SplashSlashTitle, getSlashTitleIntroDurationMs } from "./SplashSlashTitle";
import { getNeonTextShadow } from "../../utils/neonEffects";
import { useAppStore } from "../../store";
import { useTranslation } from "../../hooks/useTranslation";

interface SplashScreenProps {
  isSystemReady: boolean;
  isDnsReady: boolean;
  isDriversReady: boolean;
  isDashboardReady: boolean;
  onComplete: () => void;
}

const STEPS = [
  {
    id: "system",
    icon: Cpu,
    label: "Matériel",
    detail: "Processeur, mémoire et carte graphique",
    color: "var(--neon-pink)",
    textColor: "var(--neon-pink-text)",
    accentRgb: "255, 45, 149",
  },
  {
    id: "dns",
    icon: Globe,
    label: "Connexion",
    detail: "Réseau, DNS et latence",
    color: "var(--neon-cyan)",
    textColor: "var(--neon-cyan-text)",
    accentRgb: "0, 212, 255",
  },
  {
    id: "drivers",
    icon: Disc,
    label: "Pilotes",
    detail: "Les essentiels sous les yeux",
    color: "var(--neon-green)",
    textColor: "var(--neon-green-text)",
    accentRgb: "0, 255, 157",
  },
] as const;

function isScanStepReady(
  stepIndex: number,
  flags: { system: boolean; dns: boolean; drivers: boolean },
): boolean {
  if (stepIndex === 0) return flags.system;
  if (stepIndex === 1) return flags.dns;
  return flags.drivers;
}

/** Message + cible barre — même logique que les lignes (spinner / coche). */
function resolveSplashUi(
  phase: SplashPhase,
  inPhaseMs: number,
  minMs: number,
  flags: { system: boolean; dns: boolean; drivers: boolean; dashboard: boolean },
  t: (key: any) => string,
): { message: string; targetPercent: number } {
  if (phase === 0) {
    const intro = easeOutQuad(Math.min(1, inPhaseMs / Math.max(minMs, 1)));
    const { floor, ceiling } = PHASE_PROGRESS[0];
    return {
      message: t('splash_init'),
      targetPercent: floor + (ceiling - floor) * intro,
    };
  }

  if (phase >= 1 && phase <= 3) {
    const stepIndex = phase - 1;
    const { floor, ceiling } = PHASE_PROGRESS[phase];
    const stepReady = isScanStepReady(stepIndex, flags);
    
    const loadingKey = stepIndex === 0 ? 'splash_status_system_loading' : stepIndex === 1 ? 'splash_status_dns_loading' : 'splash_status_drivers_loading';
    const doneKey = stepIndex === 0 ? 'splash_status_system_done' : stepIndex === 1 ? 'splash_status_dns_done' : 'splash_status_drivers_done';

    if (stepReady) {
      return { message: t(doneKey), targetPercent: ceiling };
    }

    const crawlTau = Math.max(minMs * 0.95, 1_000);
    const crawl = 1 - Math.exp(-inPhaseMs / crawlTau);
    return {
      message: t(loadingKey),
      targetPercent: floor + (ceiling - floor - 3) * crawl,
    };
  }

  const { floor, ceiling } = PHASE_PROGRESS[4];
  if (!flags.dashboard) {
    const waitTau = Math.max(minMs * 0.85, 1_400);
    const waitProgress = 1 - Math.exp(-inPhaseMs / waitTau);
    return {
      message: t('splash_dashboard_loading'),
      targetPercent: floor + (ceiling - floor - 3) * waitProgress,
    };
  }

  const settle = easeOutQuad(Math.min(1, inPhaseMs / 750));
  return {
    message: t('splash_dashboard_done'),
    targetPercent: floor + (ceiling - floor) * settle,
  };
}

function splashAccentBorder(rgb: string): string {
  return `rgba(${rgb}, 0.35)`;
}

function splashAccentBg(rgb: string): string {
  return `rgba(${rgb}, 0.10)`;
}

function splashAccentGlow(rgb: string): string {
  return `0 0 12px rgba(${rgb}, 0.50)`;
}

/** 0 = init · 1 = matériel · 2 = DNS · 3 = pilotes · 4 = prêt */
type SplashPhase = 0 | 1 | 2 | 3 | 4;

const SPLASH_SAFETY_TIMEOUT_MS = 90_000;

const TIMING = {
  init: 900,
  /** Temps minimum par étape — laisse lire le statut avant de passer à la suivante. */
  system: 1_300,
  dns: 1_550,
  drivers: 1_300,
  ready: 1_900,
} as const;

/** Pause sur le message « terminé » avant la phase suivante (backend déjà prêt). */
const STEP_DONE_DWELL_MS = 650;

const TIMING_REDUCED = {
  init: 450,
  system: 520,
  dns: 600,
  drivers: 520,
  ready: 850,
} as const;

const STEP_DONE_DWELL_REDUCED_MS = 280;

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

function phaseMinDuration(
  phase: SplashPhase,
  reduced: boolean,
  titleIntroMs: number,
): number {
  const t = reduced ? TIMING_REDUCED : TIMING;
  switch (phase) {
    case 0:
      return reduced ? t.init : Math.max(t.init, titleIntroMs);
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
  flags: { system: boolean; dns: boolean; drivers: boolean; dashboard: boolean },
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
      return flags.dashboard;
    default:
      return true;
  }
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
  isDashboardReady,
  onComplete,
}) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const reduced = prefersReducedMotion ?? false;
  const theme = useAppStore((s) => s.theme);
  const isDark = theme === "dark";
  const titleIntroMs = useMemo(
    () => getSlashTitleIntroDurationMs("lg", reduced),
    [reduced],
  );

  const [phase, setPhase] = useState<SplashPhase>(0);
  const [percent, setPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>(() => t('splash_init'));
  const [titleIntroDone, setTitleIntroDone] = useState(reduced);
  const phaseStartRef = useRef(Date.now());
  const phaseBackendReadyAtRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);
  onCompleteRef.current = onComplete;

  const handleTitleIntroComplete = useCallback(() => {
    setTitleIntroDone(true);
  }, []);

  useEffect(() => {
    if (titleIntroDone) return;
    const safetyTimer = setTimeout(() => setTitleIntroDone(true), titleIntroMs + 500);
    return () => clearTimeout(safetyTimer);
  }, [titleIntroDone, titleIntroMs]);

  const backendFlags = useMemo(
    () => ({
      system: isSystemReady,
      dns: isDnsReady,
      drivers: isDriversReady,
      dashboard: isDashboardReady,
    }),
    [isSystemReady, isDnsReady, isDriversReady, isDashboardReady],
  );

  const stepReadyFlags = useMemo(
    () => [isSystemReady, isDnsReady, isDriversReady] as const,
    [isSystemReady, isDnsReady, isDriversReady],
  );

  const advancePhase = useCallback(() => {
    setPhase((current) => {
      if (current >= 4) return current;
      phaseStartRef.current = Date.now();
      phaseBackendReadyAtRef.current = null;
      return (current + 1) as SplashPhase;
    });
  }, []);

  useEffect(() => {
    phaseBackendReadyAtRef.current = null;
  }, [phase]);

  useEffect(() => {
    const doneDwell = reduced ? STEP_DONE_DWELL_REDUCED_MS : STEP_DONE_DWELL_MS;
    const interval = setInterval(() => {
      const inPhaseMs = Date.now() - phaseStartRef.current;
      const minMs = phaseMinDuration(phase, reduced, titleIntroMs);
      const backendReady = backendReadyForPhase(phase, backendFlags);

      if (phase >= 1 && backendReady && phaseBackendReadyAtRef.current === null) {
        phaseBackendReadyAtRef.current = Date.now();
      }

      const dwellOk =
        phase === 0 ||
        !backendReady ||
        phaseBackendReadyAtRef.current === null ||
        Date.now() - phaseBackendReadyAtRef.current >= doneDwell;

      const canLeave = inPhaseMs >= minMs && backendReady && dwellOk;

      if (canLeave && phase < 4) {
        advancePhase();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [phase, reduced, backendFlags, advancePhase, titleIntroMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      const inPhaseMs = Date.now() - phaseStartRef.current;
      const minMs = phaseMinDuration(phase, reduced, titleIntroMs);
      const ui = resolveSplashUi(phase, inPhaseMs, minMs, backendFlags, t);
      const scanStepReady =
        phase >= 1 && phase <= 3 && backendReadyForPhase(phase, backendFlags);

      setStatusMessage(ui.message);
      setPercent((prev) => {
        const factor = scanStepReady
          ? reduced
             ? 0.24
            : 0.18
          : reduced
            ? 0.18
            : 0.11;
        const next = lerp(prev, ui.targetPercent, factor);
        return Math.min(100, Math.max(prev, next));
      });
    }, 32);

    return () => clearInterval(interval);
  }, [phase, reduced, backendFlags, titleIntroMs, t]);

  useEffect(() => {
    if (phase !== 4 || !isDashboardReady) return;
    const ui = resolveSplashUi(
      phase,
      Date.now() - phaseStartRef.current,
      phaseMinDuration(phase, reduced, titleIntroMs),
      backendFlags,
      t,
    );
    setStatusMessage(ui.message);
  }, [phase, isDashboardReady, reduced, backendFlags, titleIntroMs, t]);

  const finishSplash = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    if (phase !== 4 || !isDashboardReady || percent < 99.5) return;

    const inPhaseMs = Date.now() - phaseStartRef.current;
    const minMs = phaseMinDuration(phase, reduced, titleIntroMs);
    const doneDwell = reduced ? STEP_DONE_DWELL_REDUCED_MS : STEP_DONE_DWELL_MS;
    const readyAt = phaseBackendReadyAtRef.current;
    const readPause = reduced ? 380 : 950;

    const minRemaining = Math.max(0, minMs - inPhaseMs);
    const dwellRemaining =
      readyAt !== null ? Math.max(0, doneDwell - (Date.now() - readyAt)) : 0;
    const holdMs = Math.max(minRemaining, dwellRemaining) + readPause;

    const timer = setTimeout(finishSplash, holdMs);
    return () => clearTimeout(timer);
  }, [phase, percent, reduced, isDashboardReady, finishSplash, titleIntroMs]);

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
        <div className="bento-card liquid-glass px-8 pb-8 pt-9 sm:px-10 sm:pb-10 sm:pt-11 flex flex-col items-center relative overflow-visible">
          <div
            className="absolute inset-x-0 top-0 h-px pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--neon-pink), var(--neon-purple), var(--neon-cyan), transparent)",
            }}
          />

          <SplashSlashTitle
            reducedMotion={reduced}
            onIntroComplete={handleTitleIntroComplete}
          />

          <motion.div
            className="w-full space-y-3 mb-8 mt-7 sm:mt-8"
            initial={false}
            animate={{
              opacity: titleIntroDone ? 1 : 0,
              y: titleIntroDone ? 0 : 14,
              filter: titleIntroDone ? "blur(0px)" : "blur(4px)",
            }}
            transition={{
              duration: reduced ? 0.25 : 0.62,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {STEPS.map((step, index) => {
              const stepPhase = (index + 1) as SplashPhase;
              const stepReady = stepReadyFlags[index];
              const stepStarted = phase >= stepPhase;
              const stepPassed = phase > stepPhase;
              
              const localizedStep = {
                ...step,
                label: index === 0 ? t('splash_step_system') : index === 1 ? t('splash_step_dns') : t('splash_step_drivers'),
                detail: index === 0 ? t('splash_step_system_detail') : index === 1 ? t('splash_step_dns_detail') : t('splash_step_drivers_detail')
              };

              return (
              <LoadingRow
                key={step.id}
                step={localizedStep}
                index={index}
                isReady={stepPassed || (stepStarted && stepReady)}
                isActive={phase === stepPhase && !stepReady}
                reducedMotion={reduced}
              />
              );
            })}
          </motion.div>

          <motion.div
            className="w-full"
            id="splash-progress"
            initial={false}
            animate={{
              opacity: titleIntroDone ? 1 : 0,
              y: titleIntroDone ? 0 : 10,
            }}
            transition={{
              duration: reduced ? 0.25 : 0.55,
              delay: reduced ? 0 : 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div className="flex justify-between items-end mb-3 px-1 gap-4">
              <AnimatePresence mode="wait">
                <motion.span
                  key={statusMessage}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                  className="text-xs font-medium text-[var(--text-muted)] mono-text tracking-wide"
                >
                  {statusMessage}
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
              aria-label={t('splash_progress_aria')}
              className="h-2 w-full rounded-full overflow-hidden border border-[var(--border)] bg-[var(--surface-inset)] relative"
            >
              <motion.div
                className="h-full rounded-full splash-progress-glow relative overflow-hidden"
                animate={{ width: `${percent}%` }}
                transition={{
                  duration: reduced ? 0.2 : 0.55,
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
              {t('splash_progress_detail', { message: statusMessage, percent: Math.round(percent) })}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface LoadingRowProps {
  step: Omit<(typeof STEPS)[number], 'label' | 'detail'> & { label: string; detail: string };
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
          boxShadow: isActive ? splashAccentGlow(step.accentRgb) : "none",
        }}
        transition={{ duration: 0.45 }}
      />

      <motion.div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ml-1"
        animate={{
          color: isReady || isActive ? step.color : "var(--text-subtle)",
          borderColor: isReady || isActive
            ? splashAccentBorder(step.accentRgb)
            : "var(--border)",
          backgroundColor: isReady || isActive
            ? splashAccentBg(step.accentRgb)
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
                borderRightColor: `rgba(${step.accentRgb}, 0.40)`,
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
