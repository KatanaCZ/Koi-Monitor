import { memo, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { getNeonTextShadow } from "../../utils/neonEffects";

interface MetricPercentBadgeProps {
  value: string;
  themeColor: string;
  textColor: string;
  isDark: boolean;
}

export const MetricPercentBadge = memo(function MetricPercentBadge({
  value,
  themeColor,
  textColor,
  isDark,
}: MetricPercentBadgeProps) {
  return (
    <motion.div
      className="px-4 py-2 rounded-full border min-w-[5rem] text-center shrink-0"
      style={{
        backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)`,
        borderColor: `color-mix(in srgb, ${themeColor} 30%, transparent)`,
      }}
    >
      <span
        className="text-lg font-bold mono-text tracking-tight tabular-nums"
        style={{
          color: textColor,
          textShadow: getNeonTextShadow(themeColor, isDark),
        }}
      >
        {value}
      </span>
    </motion.div>
  );
});

interface WidgetMetricHeaderProps {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  subtitleTitle?: string;
  themeColor: string;
  badge?: ReactNode;
}

export const WidgetMetricHeader = memo(function WidgetMetricHeader({
  icon: Icon,
  label,
  subtitle,
  subtitleTitle,
  themeColor,
  badge,
}: WidgetMetricHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 shrink-0 min-w-0 w-full">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${themeColor}, color-mix(in srgb, ${themeColor} 50%, transparent))`,
          }}
        >
          <Icon size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-1">
            {label}
          </h3>
          {subtitle ? (
            <p
              className="text-xs text-[var(--text-muted)] leading-snug line-clamp-2"
              title={subtitleTitle ?? subtitle}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>
  );
});
