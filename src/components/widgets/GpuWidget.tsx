import React, { useMemo, memo } from "react";
import { motion } from "framer-motion";
import { Monitor } from "lucide-react";
import { useAppStore } from "../../store";
import { ringToArray } from "../../store/historyRing";
import { NeonBentoCard, ChartSrTable } from "../common";
import { SingleAreaChart } from "../charts";
import { getNeonTextShadow } from "../../utils/neonEffects";
import { getWidgetDriverLine } from "../../utils/driverFormat";

export const GpuWidget = memo(function GpuWidget() {
  const gpuRing = useAppStore((s) => s.gpuHistoryRing);
  const gpuHistory = useMemo(() => ringToArray(gpuRing), [gpuRing.seq]);
  const gpu = useAppStore((s) => s.systemInfo?.gpu?.[0]) ?? {
    name: "GPU Info Unavailable",
    usage: 0,
    memory_used: 0,
    memory_total: 0,
    temperature: null as number | null,
  };
  const drivers = useAppStore((s) => s.drivers);
  const theme = useAppStore((s) => s.theme);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0.0 GB";
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(1) + " GB";
  };

  const chartData = useMemo(
    () =>
      gpuHistory.map((item, index) => ({
        index,
        timestamp: item.timestamp,
        value: item.value,
      })),
    [gpuHistory],
  );

  const srChartRows = useMemo(
    () =>
      gpuHistory.map((item) => ({
        time: item.timestamp,
        value: item.value,
      })),
    [gpuHistory],
  );

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const isDark = theme === "dark";
  const themeColor = "var(--neon-purple)";
  const gpuDriverLine = getWidgetDriverLine(drivers, "Graphics");

  return (
    <NeonBentoCard className="h-[380px]" themeColor={themeColor} delay={0.3}>
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${themeColor}, color-mix(in srgb, ${themeColor} 50%, transparent))`,
            }}
          >
            <Monitor size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-1">
              GPU
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {gpu.name.length > 25
                ? gpu.name.substring(0, 25) + "..."
                : gpu.name}
            </p>
            {gpuDriverLine ? (
              <p className="text-[10px] mono-text text-[var(--neon-purple-text)] mt-0.5">
                {gpuDriverLine}
              </p>
            ) : null}
          </div>
        </div>
        <motion.div
          className="px-4 py-2 rounded-full border"
          style={{
            backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)`,
            borderColor: `color-mix(in srgb, ${themeColor} 30%, transparent)`,
          }}
        >
          <span
            className="text-lg font-bold mono-text tracking-tight"
            style={{
              color: "var(--neon-purple-text)",
              textShadow: getNeonTextShadow(themeColor, isDark),
            }}
          >
            {gpu.usage === 0 ? "- %" : `${gpu.usage.toFixed(0)}%`}
          </span>
        </motion.div>
      </div>

      {/* Chart */}
      <div className="h-32 relative shrink-0" aria-hidden="true">
        <SingleAreaChart
          data={chartData}
          themeColor={themeColor}
          isDark={isDark}
          gradientId="gpuGradient"
        />
      </div>
      <ChartSrTable
        caption={`Historique d'utilisation GPU — actuel ${gpu.usage.toFixed(0)} pour cent`}
        columns={[
          { key: "time", label: "Heure", format: formatTime },
          { key: "value", label: "Usage", format: (v) => `${v.toFixed(1)} %` },
        ]}
        rows={srChartRows}
      />

      {/* GPU Details */}
      <div className="grid grid-cols-2 gap-4 mt-auto shrink-0 z-10 relative">
        <div className="p-4 rounded-2xl bg-[var(--surface-inset)] border border-[var(--border)] backdrop-blur-sm">
          <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)] mb-2">
            VRAM totale
          </p>
          <p
            className="text-sm font-semibold mono-text"
            style={{ color: "var(--neon-purple-text)" }}
          >
            {formatBytes(gpu.memory_total)}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--surface-inset)] border border-[var(--border)] backdrop-blur-sm">
          <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)] mb-2">
            VRAM utilisée
          </p>
          <p
            className="text-sm font-semibold mono-text"
            style={{ color: "var(--neon-purple-text)" }}
          >
            {formatBytes(gpu.memory_used)}
          </p>
        </div>
      </div>

      {/* Hardware Acceleration Badge */}
      <div className="flex justify-center mt-2 shrink-0 z-10 relative">
        <p
          className="text-[9px] uppercase font-bold tracking-[0.2em] px-4 py-1 rounded-full border"
          style={{
            color: "var(--neon-purple-text)",
            backgroundColor: `color-mix(in srgb, ${themeColor} 10%, transparent)`,
            borderColor: `color-mix(in srgb, ${themeColor} 30%, transparent)`,
            textShadow: getNeonTextShadow(themeColor, isDark),
          }}
        >
          Hardware Acceleration Active
        </p>
      </div>
    </NeonBentoCard>
  );
});
