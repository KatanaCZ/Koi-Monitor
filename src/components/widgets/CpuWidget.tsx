import React, { useMemo, memo } from "react";
import { Cpu } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "../../store";
import { ringToArray } from "../../store/historyRing";
import { NeonBentoCard, ChartSrTable } from "../common";
import { SingleAreaChart } from "../charts";
import { getNeonTextShadow } from "../../utils/neonEffects";

export const CpuWidget = memo(function CpuWidget() {
  const cpuRing = useAppStore((s) => s.cpuHistoryRing);
  const cpuHistory = useMemo(() => ringToArray(cpuRing), [cpuRing.seq]);
  const cpuUsage = useAppStore((s) => s.systemInfo?.cpu.usage ?? 0);
  const cores = useAppStore((s) => s.systemInfo?.cpu.cores ?? 0);
  const perCoreUsage = useAppStore((s) => s.systemInfo?.cpu.per_core_usage ?? []);
  const name = useAppStore((s) => s.systemInfo?.cpu.name ?? "Chargement...");
  const theme = useAppStore((s) => s.theme);

  const usage = cpuUsage;

  const chartData = useMemo(
    () =>
      cpuHistory.map((item, index) => ({
        index,
        timestamp: item.timestamp,
        value: item.value,
      })),
    [cpuHistory],
  );

  const srChartRows = useMemo(
    () =>
      cpuHistory.map((item) => ({
        time: item.timestamp,
        value: item.value,
      })),
    [cpuHistory],
  );

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const isDark = theme === "dark";
  const themeColor = "var(--neon-pink)";

  return (
    <NeonBentoCard className="h-[380px]" themeColor={themeColor} delay={0.1}>
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${themeColor}, color-mix(in srgb, ${themeColor} 50%, transparent))`,
            }}
          >
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-1">
              CPU
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {name.length > 25 ? name.substring(0, 25) + "..." : name}
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
              color: "var(--neon-pink-text)",
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
          gradientId="cpuGradient"
        />
      </div>
      <ChartSrTable
        caption={`Historique d'utilisation CPU — actuel ${usage.toFixed(1)} pour cent`}
        columns={[
          { key: "time", label: "Heure", format: formatTime },
          { key: "value", label: "Usage", format: (v) => `${v.toFixed(1)} %` },
        ]}
        rows={srChartRows}
      />

      {/* Core Usage */}
      <div className="mt-auto shrink-0 z-10 relative">
        <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)] mb-2">
          Cœurs ({cores})
        </p>
        <div className="flex items-end gap-1 h-20 px-3 py-2 rounded-2xl border border-[var(--border)] overflow-hidden w-full bg-[var(--spectrum-trough)]">
          {perCoreUsage.slice(0, 32).map((coreUsage, index) => {
            const barHeight = Math.max((coreUsage / 100) * 64, 4);
            return (
              <div
                key={index}
                title={`Cœur ${index + 1} : ${coreUsage.toFixed(0)} %`}
                className="flex-1 min-w-0 rounded-sm"
                style={{
                  height: barHeight,
                  background: isDark
                    ? "linear-gradient(to top, rgba(255,45,149,0.3), rgba(255,45,149,1))"
                    : "linear-gradient(to top, color-mix(in srgb, var(--neon-pink) 35%, transparent), var(--neon-pink))",
                  boxShadow: isDark
                    ? "0 0 6px rgba(255,45,149,0.4)"
                    : "0 0 4px color-mix(in srgb, var(--neon-pink) 35%, transparent)",
                }}
              />
            );
          })}
        </div>
      </div>
    </NeonBentoCard>
  );
});
