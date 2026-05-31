import { memo, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "../../store";
import { getNeonTextShadow } from "../../utils/neonEffects";
import {
  buildGamingAriaLabel,
  formatGamingLatencyValue,
  getGamingLatencyRingPercent,
  getGamingVerdictStyle,
  getVerdictLabel,
} from "../../utils/gamingLatency";
import type { GamingVerdict } from "../../types";
import { GamingLatencyBreakdown } from "../common/GamingLatencyBreakdown";
import { formatUptimeShort, useLiveUptime } from "../../hooks/useLiveUptime";
import { useTranslation } from "../../hooks/useTranslation";

interface LargeMetricProps {
  label: string;
  value: string;
  color: string;
  textColor: string;
  percent: number;
  isDark: boolean;
  ariaLabel: string;
  onClick?: () => void;
  ariaExpanded?: boolean;
  ariaControls?: string;
  detail?: React.ReactNode;
  temp?: number | null;
}

function LargeMetric({
  label,
  value,
  color,
  textColor,
  percent,
  isDark,
  ariaLabel,
  onClick,
  ariaExpanded,
  ariaControls,
  detail,
  temp,
}: LargeMetricProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const body = (
    <>
      <p className="text-xs sm:text-sm uppercase font-black tracking-[0.22em] text-[var(--text-subtle)] mb-2 sm:mb-3">
        {label}
      </p>
      <p
        className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mono-text tracking-tight tabular-nums leading-none"
        style={{
          color: textColor,
          textShadow: getNeonTextShadow(color, isDark),
        }}
      >
        {value}
      </p>
      {temp !== undefined && temp !== null ? (
        <p
          className="text-xs sm:text-sm font-bold tracking-wider mt-2 opacity-80"
          style={{
            color: textColor,
            textShadow: getNeonTextShadow(color, isDark),
          }}
        >
          {temp.toFixed(0)} °C
        </p>
      ) : null}
      <div
        className="h-1 sm:h-1.5 w-full max-w-[6rem] sm:max-w-[8rem] mx-auto rounded-full bg-[var(--ring-track)] overflow-hidden mt-3 sm:mt-4"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${clamped}%`,
            background: color,
            boxShadow: `0 0 12px color-mix(in srgb, ${color} 50%, transparent)`,
          }}
        />
      </div>
      {detail}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        className="flex flex-col items-center text-center min-w-0 bg-transparent border-0 p-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--background)] rounded-xl"
      >
        {body}
      </button>
    );
  }

  return (
    <div role="group" aria-label={`${ariaLabel} : ${value}`} className="flex flex-col items-center text-center min-w-0">
      {body}
    </div>
  );
}

export const ZenMetricsDock = memo(function ZenMetricsDock() {
  const { t, language } = useTranslation();
  const cpu = useAppStore((s) => s.systemInfo?.cpu.usage ?? 0);
  const cpuTemp = useAppStore((s) => s.systemInfo?.cpu.temperature ?? null);
  const activeGpuIndex = useAppStore((s) => {
    if (!s.systemInfo?.gpu || s.systemInfo.gpu.length === 0) return 0;
    let maxIdx = 0;
    let maxUsage = -1;
    s.systemInfo.gpu.forEach((g, idx) => {
      if (g.usage > maxUsage) {
        maxUsage = g.usage;
        maxIdx = idx;
      }
    });
    return maxIdx;
  });
  const gpu = useAppStore((s) => s.systemInfo?.gpu?.[activeGpuIndex]?.usage ?? 0);
  const gpuTemp = useAppStore((s) => s.systemInfo?.gpu?.[activeGpuIndex]?.temperature ?? null);
  const ram = useAppStore((s) => s.systemInfo?.memory.usage_percent ?? 0);
  const gamingLatency = useAppStore((s) => s.gamingLatency);
  const theme = useAppStore((s) => s.theme);
  const isDark = theme === "dark";
  const liveUptime = useLiveUptime();
  const uptimeLabel = formatUptimeShort(liveUptime, language);

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
        event.stopImmediatePropagation();
        closeGamingDetails();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [gamingDetailsOpen, closeGamingDetails]);

  const gamingVerdict = gamingLatency.verdict as GamingVerdict;
  const gamingStyle = getGamingVerdictStyle(gamingVerdict);
  const gamingValue = formatGamingLatencyValue(
    gamingLatency.internet_ms,
    gamingVerdict,
  );
  const gamingRingPercent = getGamingLatencyRingPercent(
    gamingLatency.internet_ms,
  );
  const gamingAriaLabel = buildGamingAriaLabel(gamingLatency, t);

  const gamingDetail = (
    <span
      className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide uppercase mt-3 sm:mt-4"
      style={{
        color: gamingStyle.textColor,
        background: gamingStyle.badgeBg,
        border: `1px solid ${gamingStyle.badgeBorder}`,
      }}
    >
      {getVerdictLabel(gamingVerdict, t)}
    </span>
  );

  return (
    <section
      aria-label={t("zen_metrics_dock_title")}
      className="zen-metrics-wallpaper w-full max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center"
    >
      <div className="grid grid-cols-3 gap-8 sm:gap-12 lg:gap-16 w-full max-w-3xl mx-auto justify-items-center">
        <LargeMetric
          label="CPU"
          value={`${cpu.toFixed(0)} %`}
          color="var(--neon-pink)"
          textColor="var(--neon-pink-text)"
          percent={cpu}
          isDark={isDark}
          ariaLabel={t("zen_metric_cpu_aria")}
          temp={cpuTemp}
        />
        <LargeMetric
          label="GPU"
          value={`${gpu.toFixed(0)} %`}
          color="var(--neon-purple)"
          textColor="var(--neon-purple-text)"
          percent={gpu}
          isDark={isDark}
          ariaLabel={t("zen_metric_gpu_aria")}
          temp={gpuTemp}
        />
        <LargeMetric
          label={t("zen_metric_game")}
          value={gamingValue}
          color={gamingStyle.color}
          textColor={gamingStyle.textColor}
          percent={gamingRingPercent}
          isDark={isDark}
          ariaLabel={gamingAriaLabel}
          onClick={toggleGamingDetails}
          ariaExpanded={gamingDetailsOpen}
          ariaControls="zen-gaming-latency-details"
          detail={gamingDetail}
        />
      </div>

      <p
        role="group"
        aria-label={t("zen_metrics_dock_aria", { ram: ram.toFixed(0), uptime: uptimeLabel })}
        className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-10 gap-y-2 mt-8 sm:mt-10 text-xl sm:text-2xl lg:text-3xl text-[var(--text-muted)]"
      >
        <span className="inline-flex items-baseline gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm uppercase font-bold tracking-[0.18em] text-[var(--text-subtle)]">
            RAM
          </span>
          <span className="mono-text font-semibold tabular-nums">{ram.toFixed(0)} %</span>
        </span>
        <span className="text-[var(--text-subtle)]" aria-hidden="true">
          ·
        </span>
        <span className="inline-flex items-baseline gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm uppercase font-bold tracking-[0.18em] text-[var(--text-subtle)]">
            {t("uptime_label")}
          </span>
          <span className="mono-text font-semibold tabular-nums">{uptimeLabel}</span>
        </span>
      </p>

      <AnimatePresence initial={false}>
        {gamingDetailsOpen ? (
          <motion.div
            id="zen-gaming-latency-details"
            key="zen-gaming-panel"
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden w-full mt-8 sm:mt-10 max-w-xl mx-auto"
          >
            <GamingLatencyBreakdown
              snapshot={gamingLatency}
              compact
              isDark={isDark}
              onClose={closeGamingDetails}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
});
