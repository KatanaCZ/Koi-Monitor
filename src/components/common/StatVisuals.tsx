import React, { memo } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface VisualBaseProps {
  size: number;
  color: string;
  icon: LucideIcon;
  iconSize: number;
}

interface GamingSignalVisualProps extends VisualBaseProps {
  percent: number;
  measuring?: boolean;
}

/** Barres verticales + icône au-dessus (sans chevauchement). */
export const GamingSignalVisual = memo(function GamingSignalVisual({
  size,
  color,
  icon: Icon,
  iconSize,
  percent,
  measuring = false,
}: GamingSignalVisualProps) {
  const barCount = 5;
  const activeBars = measuring
    ? 0
    : percent <= 0
      ? 0
      : Math.max(1, Math.ceil((percent / 100) * barCount));

  const barHeights = [0.42, 0.58, 0.72, 0.86, 1];
  const barAreaH = Math.round(size * 0.38);
  const barWidth = Math.max(4, Math.round(size * 0.075));

  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] shrink-0"
      style={{ width: size, height: size, padding: size * 0.12 }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-center shrink-0" style={{ color }}>
        <Icon size={Math.max(iconSize - 1, 11)} strokeWidth={2.25} />
      </div>

      <div
        className="flex items-end justify-center gap-1"
        style={{ height: barAreaH, minWidth: Math.round(size * 0.62) }}
      >
        {barHeights.map((ratio, index) => {
          const barH = Math.round(barAreaH * ratio);
          const isActive = measuring ? false : index < activeBars;

          return (
            <motion.div
              key={index}
              className="rounded-sm origin-bottom"
              style={{
                width: barWidth,
                height: barH,
                background: isActive
                  ? color
                  : "var(--ring-track)",
                boxShadow: isActive
                  ? `0 0 6px color-mix(in srgb, ${color} 45%, transparent)`
                  : undefined,
              }}
              animate={
                measuring
                  ? { opacity: [0.3, 1, 0.3], scaleY: [0.5, 1, 0.5] }
                  : { opacity: isActive ? 1 : 0.55, scaleY: 1 }
              }
              transition={
                measuring
                  ? {
                      repeat: Infinity,
                      duration: 1,
                      delay: index * 0.1,
                      ease: "easeInOut",
                    }
                  : { duration: 0.3, ease: "easeOut" }
              }
            />
          );
        })}
      </div>
    </div>
  );
});

interface UptimeTimelineVisualProps extends VisualBaseProps {
  uptimeSeconds: number;
}

/** Bandeau horizontal + pulse — remplace l'anneau pour l'uptime. */
export const UptimeTimelineVisual = memo(function UptimeTimelineVisual({
  size,
  color,
  icon: Icon,
  iconSize,
  uptimeSeconds,
}: UptimeTimelineVisualProps) {
  const hourProgress =
    uptimeSeconds > 0 ? ((uptimeSeconds % 3600) / 3600) * 100 : 0;
  const trackWidth = Math.round(size * 0.72);

  return (
    <div
      className="relative flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)]"
      style={{ width: size, height: size, padding: size * 0.12 }}
      aria-hidden="true"
    >
      <div style={{ color }}>
        <Icon size={iconSize + 1} />
      </div>
      <div
        className="relative h-1.5 rounded-full overflow-hidden bg-[var(--ring-track)]"
        style={{ width: trackWidth }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.max(8, hourProgress)}%`,
            background: `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, transparent), ${color})`,
            boxShadow: `0 0 10px color-mix(in srgb, ${color} 50%, transparent)`,
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-y-0 w-6 rounded-full opacity-70"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          }}
          animate={{ x: [-trackWidth * 0.2, trackWidth * 0.85] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
        />
      </div>
    </div>
  );
});

interface RingVisualProps extends VisualBaseProps {
  percent: number;
  stroke: number;
  ring: number;
  minRingFill?: boolean;
  measuring?: boolean;
  isUptime?: boolean;
}

/** Anneau SVG — CPU, RAM, GPU. */
export const RingVisual = memo(function RingVisual({
  size,
  color,
  icon: Icon,
  iconSize,
  percent,
  stroke,
  ring,
  minRingFill,
  measuring,
  isUptime,
}: RingVisualProps) {
  const center = size / 2;
  const circumference = 2 * Math.PI * ring;
  const percentValue =
    minRingFill && percent > 0 ? Math.max(25, percent) : percent;
  const strokeDashoffset =
    circumference - (percentValue / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        className="-rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={center}
          cy={center}
          r={ring}
          stroke="var(--ring-track)"
          strokeWidth={stroke}
          fill="transparent"
        />
        {isUptime ? (
          <motion.circle
            cx={center}
            cy={center}
            r={ring}
            stroke={color}
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={circumference}
            animate={{
              strokeDashoffset: [0, circumference],
              opacity: [0.35, 0.85, 0.35],
            }}
            transition={{
              repeat: Infinity,
              duration: 4,
              ease: "linear",
            }}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 4px color-mix(in srgb, ${color} 60%, transparent))`,
            }}
          />
        ) : measuring ? (
          <motion.circle
            cx={center}
            cy={center}
            r={ring}
            stroke={color}
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={circumference}
            animate={{
              strokeDashoffset: [
                circumference,
                circumference * 0.25,
                circumference,
              ],
              opacity: [0.35, 0.9, 0.35],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.2,
              ease: "easeInOut",
            }}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 4px color-mix(in srgb, ${color} 60%, transparent))`,
            }}
          />
        ) : (
          <circle
            cx={center}
            cy={center}
            r={ring}
            stroke={color}
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.45s ease-out",
              filter: `drop-shadow(0 0 4px color-mix(in srgb, ${color} 50%, transparent))`,
            }}
          />
        )}
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ color }}
      >
        <Icon size={iconSize} />
      </div>
    </div>
  );
});
