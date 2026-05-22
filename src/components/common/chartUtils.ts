import type { CSSProperties } from "react";

export const formatChartTooltipTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const formatChartTooltipRelativeTime = (
  timestamp: number,
  now = Date.now(),
) => {
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffSec < 5) return "À l'instant";
  if (diffSec < 60) return `Il y a ${diffSec} s`;
  if (diffSec < 3600) {
    const min = Math.floor(diffSec / 60);
    return min === 1 ? "Il y a 1 min" : `Il y a ${min} min`;
  }

  const hours = Math.floor(diffSec / 3600);
  return hours === 1 ? "Il y a 1 h" : `Il y a ${hours} h`;
};

type ChartTooltipPayload = {
  payload?: { timestamp?: number; time?: number };
};

export const formatChartTooltipLabel = (
  _label: unknown,
  payload?: readonly ChartTooltipPayload[],
): string => {
  const point = payload?.[0]?.payload;
  const timestamp = point?.timestamp ?? point?.time;

  if (typeof timestamp === "number" && timestamp >= 1_000_000_000_000) {
    return formatChartTooltipRelativeTime(timestamp);
  }

  return "Mesure historique";
};

export const getChartTooltipStyle = (
  isDark: boolean,
  themeColor: string,
): CSSProperties => ({
  background: isDark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.95)",
  border: `1px solid color-mix(in srgb, ${themeColor} 40%, transparent)`,
  borderRadius: "8px",
  color: isDark ? "#f8fafc" : "#0f172a",
  backdropFilter: "blur(10px)",
});
