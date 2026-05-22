import React, { useMemo, memo } from "react";
import { motion } from "framer-motion";
import { MemoryStick } from "lucide-react";
import { useAppStore } from "../../store";
import { ringToArray } from "../../store/historyRing";
import { NeonBentoCard, ChartSrTable } from "../common";
import { SingleAreaChart } from "../charts";
import { getNeonTextShadow } from "../../utils/neonEffects";

export const RamWidget = memo(function RamWidget() {
  const ramRing = useAppStore((s) => s.ramHistoryRing);
  const ramHistory = useMemo(() => ringToArray(ramRing), [ramRing.seq]);
  const usage = useAppStore((s) => s.systemInfo?.memory.usage_percent ?? 0);
  const total = useAppStore((s) => s.systemInfo?.memory.total ?? 0);
  const used = useAppStore((s) => s.systemInfo?.memory.used ?? 0);
  const available = useAppStore((s) => s.systemInfo?.memory.available ?? 0);
  const theme = useAppStore((s) => s.theme);

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(1) + " GB";
  };

  const chartData = useMemo(
    () =>
      ramHistory.map((item, index) => ({
        index,
        timestamp: item.timestamp,
        value: item.value,
      })),
    [ramHistory],
  );

  const srChartRows = useMemo(
    () =>
      ramHistory.map((item) => ({
        time: item.timestamp,
        value: item.value,
      })),
    [ramHistory],
  );

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const isDark = theme === "dark";
  const themeColor = "var(--neon-cyan)";

  return (
    <NeonBentoCard className="h-[380px]" themeColor={themeColor} delay={0.2}>
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${themeColor}, color-mix(in srgb, ${themeColor} 50%, transparent))`,
            }}
          >
            <MemoryStick size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-1">
              RAM
            </h3>
            <p className="text-xs text-[var(--text-muted)] mono-text">
              {formatBytes(used)} / {formatBytes(total)}
            </p>
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
              color: "var(--neon-cyan-text)",
              textShadow: getNeonTextShadow(themeColor, isDark),
            }}
          >
            {usage.toFixed(1)}%
          </span>
        </motion.div>
      </div>

      {/* Chart */}
      <div className="h-32 shrink-0" aria-hidden="true">
        <SingleAreaChart
          data={chartData}
          themeColor={themeColor}
          isDark={isDark}
          gradientId="ramGradient"
        />
      </div>
      <ChartSrTable
        caption={`Historique d'utilisation RAM — actuel ${usage.toFixed(1)} pour cent`}
        columns={[
          { key: "time", label: "Heure", format: formatTime },
          { key: "value", label: "Usage", format: (v) => `${v.toFixed(1)} %` },
        ]}
        rows={srChartRows}
      />

      {/* Memory Details */}
      <div className="grid grid-cols-2 gap-4 mt-auto shrink-0 z-10 relative">
        <div className="p-4 rounded-2xl bg-[var(--surface-inset)] border border-[var(--border)] backdrop-blur-sm">
          <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)] mb-2">
            Utilisée
          </p>
          <p
            className="text-sm font-semibold mono-text"
            style={{ color: "var(--neon-cyan-text)" }}
          >
            {formatBytes(used)}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--surface-inset)] border border-[var(--border)] backdrop-blur-sm">
          <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)] mb-2">
            Disponible
          </p>
          <p
            className="text-sm font-semibold mono-text"
            style={{ color: "var(--neon-cyan-text)" }}
          >
            {formatBytes(available)}
          </p>
        </div>
      </div>
    </NeonBentoCard>
  );
});
