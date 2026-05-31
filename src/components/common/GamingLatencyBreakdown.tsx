import React, { memo } from "react";
import { Router, Globe, Activity, X } from "lucide-react";
import type { GamingLatencySnapshot } from "../../types";
import {
  formatJitterReading,
  formatLatencyReading,
  getGamingMetricTone,
  getVerdictLabel,
} from "../../utils/gamingLatency";
import type { GamingVerdict } from "../../types";
import { getNeonTextShadow } from "../../utils/neonEffects";
import { useTranslation } from "../../hooks/useTranslation";

interface GamingLatencyBreakdownProps {
  snapshot: GamingLatencySnapshot;
  compact?: boolean;
  isDark: boolean;
  onClose: () => void;
}

interface MetricColumnProps {
  icon: React.ReactNode;
  label: string;
  target: string;
  value: string;
  tone: string;
  compact?: boolean;
  isDark: boolean;
}

const MetricColumn = memo(function MetricColumn({
  icon,
  label,
  target,
  value,
  tone,
  compact,
  isDark,
}: MetricColumnProps) {
  return (
    <div className="flex flex-col items-center text-center gap-1 min-w-0">
      <div
        className="flex items-center gap-1.5 text-[var(--text-subtle)]"
        style={{ color: tone }}
      >
        {icon}
        <span
          className={`uppercase font-black tracking-widest ${
            compact ? "text-[8px]" : "text-[10px]"
          }`}
        >
          {label}
        </span>
      </div>
      <span
        className={`mono-text truncate max-w-full text-[var(--text-muted)] ${
          compact ? "text-[9px]" : "text-[10px] sm:text-xs"
        }`}
        title={target}
      >
        {target}
      </span>
      <span
        className={`font-bold mono-text tracking-tight ${
          compact ? "text-sm" : "text-base sm:text-lg"
        }`}
        style={{
          color: tone,
          textShadow: value !== "—" ? getNeonTextShadow(tone, isDark) : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
});

export const GamingLatencyBreakdown = memo(function GamingLatencyBreakdown({
  snapshot,
  compact = false,
  isDark,
  onClose,
}: GamingLatencyBreakdownProps) {
  const { t } = useTranslation();
  const localizedVerdict = getVerdictLabel(snapshot.verdict as GamingVerdict, t);
  const gatewayTarget =
    snapshot.gateway_ip.trim().length > 0 ? snapshot.gateway_ip : t("gaming_auto_detect");
  const internetTarget = snapshot.internet_host || "1.1.1.1";
  const gatewayValue = formatLatencyReading(snapshot.gateway_ms);
  const internetValue = formatLatencyReading(snapshot.internet_ms);
  const jitterValue = formatJitterReading(
    snapshot.jitter_ms,
    snapshot.sample_count,
  );

  const iconSize = compact ? 11 : 13;

  return (
    <div
      id="gaming-latency-details"
      role="region"
      aria-label={t("gaming_breakdown_aria", { label: localizedVerdict })}
      className={`w-full rounded-2xl border bg-[var(--surface-inset)] overflow-hidden ${
        compact ? "p-2" : "p-3 sm:p-4"
      }`}
      style={{
        borderColor: "color-mix(in srgb, var(--neon-green) 35%, var(--border))",
        boxShadow:
          "inset 0 1px 0 color-mix(in srgb, var(--neon-green) 12%, transparent)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 text-left">
          <p
            className={`uppercase font-black tracking-widest text-[var(--text-subtle)] ${
              compact ? "text-[8px]" : "text-[10px]"
            }`}
          >
            {t("gaming_test_title")}
          </p>
          <p
            className={`font-semibold text-[var(--foreground)] truncate ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            {localizedVerdict}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("gaming_close_aria")}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] sm:text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] hover:border-[var(--neon-green)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-green)] transition-colors"
        >
          <X size={compact ? 12 : 14} aria-hidden="true" />
          {t("gaming_close")}
        </button>
      </div>

      <div
        className={`grid grid-cols-3 divide-x divide-[var(--border)] rounded-xl border border-[var(--border)] ${
          compact ? "p-2 gap-1" : "p-3 sm:p-4 gap-2 sm:gap-4"
        }`}
      >
        <MetricColumn
          icon={<Router size={iconSize} aria-hidden="true" />}
          label={t("gaming_gateway")}
          target={gatewayTarget}
          value={gatewayValue}
          tone={getGamingMetricTone(snapshot.gateway_ms, "gateway")}
          compact={compact}
          isDark={isDark}
        />
        <MetricColumn
          icon={<Globe size={iconSize} aria-hidden="true" />}
          label={t("gaming_internet")}
          target={internetTarget}
          value={internetValue}
          tone={getGamingMetricTone(snapshot.internet_ms, "internet")}
          compact={compact}
          isDark={isDark}
        />
        <MetricColumn
          icon={<Activity size={iconSize} aria-hidden="true" />}
          label={t("gaming_jitter")}
          target={t("gaming_samples", { count: 15 })}
          value={jitterValue}
          tone={getGamingMetricTone(snapshot.jitter_ms, "jitter", snapshot.sample_count)}
          compact={compact}
          isDark={isDark}
        />
      </div>
    </div>
  );
});
