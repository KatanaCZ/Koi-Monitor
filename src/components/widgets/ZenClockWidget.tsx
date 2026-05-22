import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ShieldCheck,
  Heart,
  Activity,
  Flame,
  ArrowLeft,
} from "lucide-react";
import { useAppStore } from "../../store";
import { TelemetryGrid } from "../common/TelemetryGrid";

export const ZenClockWidget: React.FC = () => {
  const cpuUsage = useAppStore((s) => s.systemInfo?.cpu.usage ?? 0);
  const gpuUsage = useAppStore((s) => s.systemInfo?.gpu?.[0]?.usage ?? 0);
  const security = useAppStore((s) => s.systemInfo?.security);
  const sakuraColor = useAppStore((s) => s.settings.sakuraColor);
  const setZenMode = useAppStore((s) => s.setZenMode);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getSakuraColorClass = (color: string) => {
    switch (color) {
      case "purple":
        return "text-[var(--neon-purple-text)] drop-shadow-[0_0_12px_var(--neon-purple)]";
      case "blue":
        return "text-[var(--neon-cyan-text)] drop-shadow-[0_0_12px_var(--neon-cyan)]";
      case "green":
        return "text-[var(--neon-green-text)] drop-shadow-[0_0_12px_var(--neon-green)]";
      case "pink":
      default:
        return "text-[var(--neon-pink-text)] drop-shadow-[0_0_12px_var(--neon-pink)]";
    }
  };

  const colorClass = getSakuraColorClass(sakuraColor || "pink");

  const activeLoad = Math.max(cpuUsage, gpuUsage);

  let loadState: "calm" | "active" | "heavy" = "calm";
  if (activeLoad > 75) {
    loadState = "heavy";
  } else if (activeLoad > 15) {
    loadState = "active";
  }

  // Configurations based on load state
  const getLoadConfig = () => {
    switch (loadState) {
      case "heavy":
        return {
          text: "Le système déploie sa puissance. Concentration et performance maximales.",
          icon: (
            <Flame
              size={24}
              className="fill-current text-amber-500 drop-shadow-[0_0_12px_#f59e0b]"
            />
          ),
          breathDuration: 1.2,
          pulseColor: "text-amber-500 border-amber-500/30",
        };
      case "active":
        return {
          text: "Le système s'active avec harmonie. Activité modérée en cours.",
          icon: (
            <Activity
              size={24}
              className="text-[var(--neon-cyan-text)] drop-shadow-[0_0_12px_var(--neon-cyan)]"
            />
          ),
          breathDuration: 2.2,
          pulseColor:
            "text-[var(--neon-cyan-text)] border-[var(--neon-cyan)]/30",
        };
      case "calm":
      default:
        return {
          text: "Le système respire calmement. Vos ressources sont au repos.",
          icon: <Heart size={24} className="fill-current" />,
          breathDuration: 3.8,
          pulseColor: colorClass,
        };
    }
  };

  const loadConfig = getLoadConfig();

  // Format date in French
  const formattedDate = time.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Capitalize first letter
  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const formattedTime = time.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-4 sm:p-6 lg:p-8 w-full"
    >
      <div className="bento-card w-full max-w-[min(100%,64rem)] p-8 sm:p-10 lg:p-12 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden">
        {/* Soft breathing background pulse */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[var(--border)] to-transparent opacity-10 pointer-events-none" />

        {/* Breathing heart/lotus icon reacting to system load */}
        <motion.div
          key={loadState}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{
            duration: loadConfig.breathDuration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={`w-14 h-14 rounded-2xl bg-[var(--surface-inset)] flex items-center justify-center border border-[var(--border-strong)] ${loadConfig.pulseColor}`}
        >
          {loadConfig.icon}
        </motion.div>

        {/* Clock */}
        <div className="space-y-2">
          <motion.h1
            layout
            className={`text-6xl sm:text-7xl font-extralight tracking-widest mono-text transition-all duration-300 ${colorClass}`}
          >
            {formattedTime}
          </motion.h1>
          <p className="text-[var(--text-muted)] font-medium tracking-wide flex items-center justify-center gap-2 text-sm sm:text-base">
            <Calendar size={14} className="text-[var(--text-subtle)]" />
            {capitalizedDate}
          </p>
        </div>

        {/* Calming or active system health quote */}
        <div className="pt-4 border-t border-[var(--border)] w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.p
              key={loadState}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="text-xs text-[var(--text-muted)] italic"
            >
              "{loadConfig.text}"
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Télémétrie intégrée */}
        <div className="w-full pt-6 border-t border-[var(--border)]">
          <TelemetryGrid variant="embedded" />
        </div>

        {/* Protection antivirus */}
        {security && (
          <div className="flex justify-center w-full">
            <div
              className={`flex items-center gap-2 bg-[var(--surface-inset)] px-4 py-2 rounded-full border max-w-full ${
                security.is_protected
                  ? "border-emerald-500/30"
                  : security.product_name === "Analyse en cours..."
                    ? "border-[var(--border)]"
                    : "border-amber-500/30"
              }`}
              title={
                security.is_protected
                  ? `Antivirus actif détecté : ${security.product_name}`
                  : `Protection inactive ou introuvable : ${security.product_name}`
              }
            >
              <ShieldCheck
                size={12}
                className={
                  security.is_protected
                    ? "text-emerald-600 dark:text-emerald-500 shrink-0"
                    : security.product_name === "Analyse en cours..."
                      ? "text-[var(--text-subtle)] shrink-0"
                      : "text-amber-600 dark:text-amber-500 shrink-0"
                }
                aria-hidden="true"
              />
              <span
                className={`text-xs font-semibold ${
                  security.is_protected
                    ? "text-emerald-700 dark:text-emerald-400"
                    : security.product_name === "Analyse en cours..."
                      ? "text-[var(--text-muted)]"
                      : "text-amber-700 dark:text-amber-400"
                }`}
              >
                {security.is_protected
                  ? `Protégé · ${security.product_name}`
                  : security.product_name === "Analyse en cours..."
                    ? security.product_name
                    : `Non protégé · ${security.product_name}`}
              </span>
            </div>
          </div>
        )}

        {/* Back to Dashboard Button */}
        <button
          onClick={() => setZenMode(false)}
          aria-label="Retour au tableau de bord"
          className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--foreground)] hover:text-[var(--neon-pink-text)] hover:border-[var(--neon-pink)] hover:bg-[var(--neon-pink)]/5 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-[var(--neon-pink)]/15 text-xs font-semibold min-h-[44px]"
        >
          <ArrowLeft size={14} />
          <span>Retour au Tableau de Bord</span>
        </button>
      </div>
    </motion.div>
  );
};
