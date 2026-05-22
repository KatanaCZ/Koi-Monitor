import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, MemoryStick, Monitor, Clock, Gamepad2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "../../store";
import { getNeonTextShadow } from "../../utils/neonEffects";
import {
  buildGamingAriaLabel,
  formatGamingLatencyValue,
  getGamingLatencyRingPercent,
  getGamingVerdictStyle,
} from "../../utils/gamingLatency";
import type { GamingVerdict } from "../../types";
import { TIER_LAYOUT, useViewportTier } from "../../hooks/useViewportTier";
import { GamingLatencyBreakdown } from "./GamingLatencyBreakdown";
import {
  GamingSignalVisual,
  RingVisual,
  UptimeTimelineVisual,
} from "./StatVisuals";

type StatVisual = "ring" | "gaming-signal" | "uptime-timeline";

interface StatItem {
  id: string;
  icon: LucideIcon;
  label: string;
  ariaLabel: string;
  value: string;
  detail?: string;
  badgeBg?: string;
  badgeBorder?: string;
  percent: number;
  color: string;
  textColor: string;
  minRingFill?: boolean;
  highlight?: boolean;
  measuring?: boolean;
  detailInteractive?: boolean;
  detailExpanded?: boolean;
  onDetailClick?: () => void;
  visual?: StatVisual;
  uptimeSeconds?: number;
  kind: "metric" | "uptime";
}

interface StatCellProps {
  stat: StatItem;
  index: number;
  layout: (typeof TIER_LAYOUT)[keyof typeof TIER_LAYOUT];
  isDark: boolean;
}

const StatCell = memo(function StatCell({
  stat,
  index,
  layout,
  isDark,
}: StatCellProps) {
  const { ring, stroke, icon, valueClass, labelClass, cellPadding, cellGap } =
    layout;
  const size = ring * 2 + stroke * 2;
  const visual = stat.visual ?? "ring";

  const isGamingHighlight = stat.highlight === true;

  const renderVisual = () => {
    const base = {
      size,
      color: stat.color,
      icon: stat.icon,
      iconSize: icon,
    };

    if (visual === "gaming-signal") {
      return (
        <GamingSignalVisual
          {...base}
          percent={stat.percent}
          measuring={stat.measuring}
        />
      );
    }

    if (visual === "uptime-timeline") {
      return (
        <UptimeTimelineVisual
          {...base}
          uptimeSeconds={stat.uptimeSeconds ?? 0}
        />
      );
    }

    return (
      <RingVisual
        {...base}
        ring={ring}
        stroke={stroke}
        percent={stat.percent}
        minRingFill={stat.minRingFill}
        measuring={stat.measuring}
        isUptime={stat.kind === "uptime"}
      />
    );
  };

  return (
    <motion.div
      role="group"
      aria-label={`${stat.ariaLabel} : ${stat.value}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        stiffness: 120,
        damping: 22,
        type: "spring",
        delay: 0.15 + index * 0.06,
      }}
      whileHover={{ scale: 1.03 }}
      className={`relative flex items-center ${cellGap} ${cellPadding} rounded-2xl overflow-hidden transition-colors duration-300 bg-[var(--surface-inset)] shadow-md group shrink-0 ${
        isGamingHighlight ? "border-2" : "border border-[var(--border)]"
      }`}
      style={
        isGamingHighlight
          ? {
              borderColor: stat.color,
              boxShadow: `0 0 24px color-mix(in srgb, ${stat.color} 28%, transparent), inset 0 1px 0 color-mix(in srgb, ${stat.color} 15%, transparent)`,
            }
          : undefined
      }
    >
      {renderVisual()}

      <div className="z-10 relative text-left">
        <p
          className={`${labelClass} uppercase font-black tracking-widest text-[var(--text-subtle)] mb-0.5 whitespace-nowrap`}
        >
          {stat.label}
        </p>
        <p
          className={`${valueClass} font-bold mono-text tracking-tight whitespace-nowrap`}
          style={{
            color: stat.textColor,
            textShadow: getNeonTextShadow(stat.color, isDark),
          }}
        >
          {stat.value}
        </p>
        {stat.detail ? (
          stat.detailInteractive ? (
            <button
              type="button"
              onClick={stat.onDetailClick}
              aria-expanded={stat.detailExpanded ?? false}
              aria-controls="gaming-latency-details"
              className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-wide whitespace-nowrap mt-1.5 uppercase cursor-pointer transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-green)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-inset)]"
              style={{
                color: stat.color,
                background:
                  stat.badgeBg ??
                  `color-mix(in srgb, ${stat.color} 18%, transparent)`,
                border: `1px solid ${stat.badgeBorder ?? `color-mix(in srgb, ${stat.color} 45%, transparent)`}`,
                boxShadow: stat.detailExpanded
                  ? `0 0 12px color-mix(in srgb, ${stat.color} 35%, transparent)`
                  : undefined,
              }}
            >
              {stat.detail}
            </button>
          ) : (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-wide whitespace-nowrap mt-1.5 uppercase"
              style={{
                color: stat.color,
                background:
                  stat.badgeBg ??
                  `color-mix(in srgb, ${stat.color} 18%, transparent)`,
                border: `1px solid ${stat.badgeBorder ?? `color-mix(in srgb, ${stat.color} 45%, transparent)`}`,
              }}
            >
              {stat.detail}
            </span>
          )
        ) : null}
      </div>
    </motion.div>
  );
});

interface TelemetryGridProps {
  variant?: "dashboard" | "embedded";
  className?: string;
}

export const TelemetryGrid: React.FC<TelemetryGridProps> = ({
  variant = "dashboard",
  className = "",
}) => {
  const baseUptime = useAppStore((s) => s.systemInfo?.uptime ?? 0);
  const cpu = useAppStore((s) => s.systemInfo?.cpu.usage ?? 0);
  const ram = useAppStore((s) => s.systemInfo?.memory.usage_percent ?? 0);
  const gpu = useAppStore((s) => s.systemInfo?.gpu?.[0]?.usage ?? 0);
  const gamingLatency = useAppStore((s) => s.gamingLatency);
  const theme = useAppStore((s) => s.theme);
  const isDark = theme === "dark";
  const tier = useViewportTier();
  const layout = TIER_LAYOUT[tier];

  const syncedAt = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const [gamingDetailsOpen, setGamingDetailsOpen] = useState(false);

  const closeGamingDetails = useCallback(() => {
    setGamingDetailsOpen(false);
  }, []);

  const toggleGamingDetails = useCallback(() => {
    setGamingDetailsOpen((open) => !open);
  }, []);

  useEffect(() => {
    if (!gamingDetailsOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeGamingDetails();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gamingDetailsOpen, closeGamingDetails]);

  useEffect(() => {
    syncedAt.current = Date.now();
  }, [baseUptime]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const liveUptime =
    baseUptime > 0
      ? baseUptime + Math.floor((now - syncedAt.current) / 1000)
      : 0;

  const formatUptime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "Calcul...";
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const dStr = days > 0 ? `${days}j ` : "";
    const hStr = hours > 0 || days > 0 ? `${hours}h ` : "";
    const mStr = `${minutes}m`;

    return `${dStr}${hStr}${mStr}`.trim() || "0m";
  };

  const gamingVerdict = gamingLatency.verdict as GamingVerdict;
  const gamingStyle = getGamingVerdictStyle(gamingVerdict);
  const gamingValue = formatGamingLatencyValue(
    gamingLatency.internet_ms,
    gamingVerdict,
  );
  const gamingRingPercent = getGamingLatencyRingPercent(gamingLatency.internet_ms);
  const gamingAriaLabel = buildGamingAriaLabel(gamingLatency);

  const stats: StatItem[] = useMemo(
    () => [
      {
        id: "cpu",
        icon: Cpu,
        label: "CPU",
        ariaLabel: "Processeur",
        value: `${cpu.toFixed(0)}%`,
        percent: cpu,
        color: "var(--neon-pink)",
        textColor: "var(--neon-pink-text)",
        kind: "metric",
      },
      {
        id: "ram",
        icon: MemoryStick,
        label: "RAM",
        ariaLabel: "Mémoire",
        value: `${ram.toFixed(0)}%`,
        percent: ram,
        color: "var(--neon-cyan)",
        textColor: "var(--neon-cyan-text)",
        kind: "metric",
      },
      {
        id: "gpu",
        icon: Monitor,
        label: "GPU",
        ariaLabel: "Carte graphique",
        value: `${gpu.toFixed(0)}%`,
        percent: gpu,
        color: "var(--neon-purple)",
        textColor: "var(--neon-purple-text)",
        kind: "metric",
      },
      {
        id: "gaming",
        icon: Gamepad2,
        label: "Jeu",
        ariaLabel: gamingAriaLabel,
        value: gamingValue,
        detail: gamingLatency.verdict_label,
        badgeBg: gamingStyle.badgeBg,
        badgeBorder: gamingStyle.badgeBorder,
        percent: gamingRingPercent,
        minRingFill: gamingLatency.internet_ms >= 0,
        highlight: true,
        measuring: gamingVerdict === "measuring",
        detailInteractive: true,
        detailExpanded: gamingDetailsOpen,
        onDetailClick: toggleGamingDetails,
        visual: "gaming-signal",
        color: gamingStyle.color,
        textColor: gamingStyle.textColor,
        kind: "metric",
      },
      {
        id: "uptime",
        icon: Clock,
        label: "Actif",
        ariaLabel: "Uptime système",
        value: formatUptime(liveUptime),
        percent: 0,
        visual: "uptime-timeline",
        uptimeSeconds: liveUptime,
        color: "var(--neon-green)",
        textColor: "var(--neon-green-text)",
        kind: "uptime",
      },
    ],
    [cpu, ram, gpu, gamingValue, gamingRingPercent, gamingStyle, gamingAriaLabel, gamingLatency, gamingVerdict, gamingDetailsOpen, toggleGamingDetails, liveUptime],
  );

  return (
    <section
      aria-label={
        variant === "embedded"
          ? "Télémétrie système intégrée"
          : "Statistiques système en temps réel"
      }
      className={`flex flex-col gap-3 sm:gap-4 w-full ${className}`}
    >
      <div className="flex flex-wrap justify-center items-stretch gap-3 sm:gap-4 w-full">
        {stats.map((stat, index) => (
          <StatCell
            key={stat.id}
            stat={stat}
            index={index}
            layout={layout}
            isDark={isDark}
          />
        ))}
      </div>
      <AnimatePresence initial={false}>
        {gamingDetailsOpen ? (
          <motion.div
            key="gaming-latency-panel"
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden w-full"
          >
            <GamingLatencyBreakdown
              snapshot={gamingLatency}
              compact={variant === "embedded"}
              isDark={isDark}
              verdictLabel={gamingLatency.verdict_label}
              onClose={closeGamingDetails}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
};
