import { useMemo, memo } from "react";
import { Cpu } from "lucide-react";
import { useAppStore } from "../../store";
import { ringToArray } from "../../store/historyRing";
import { NeonBentoCard, ChartSrTable, WidgetMetricHeader, MetricPercentBadge } from "../common";
import { SingleAreaChart } from "../charts";
import { normalizeCpuDisplayName } from "../../utils/cpuFormat";
import { useTranslation } from "../../hooks/useTranslation";

export const CpuWidget = memo(function CpuWidget() {
  const { t, language } = useTranslation();
  const cpuRing = useAppStore((s) => s.cpuHistoryRing);
  const cpuHistory = useMemo(() => ringToArray(cpuRing), [cpuRing.seq]);
  const cpuUsage = useAppStore((s) => s.systemInfo?.cpu.usage ?? 0);
  const cpuTemp = useAppStore((s) => s.systemInfo?.cpu.temperature ?? null);
  const cores = useAppStore((s) => s.systemInfo?.cpu.cores ?? 0);
  const perCoreUsage = useAppStore((s) => s.systemInfo?.cpu.per_core_usage ?? []);
  const name = useAppStore((s) => s.systemInfo?.cpu.name ?? (language === "fr" ? "Chargement..." : "Loading..."));
  const displayName = normalizeCpuDisplayName(name);
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
    new Date(ts).toLocaleTimeString(language === "fr" ? "fr-FR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const isDark = theme === "dark";
  const themeColor = "var(--neon-pink)";

  return (
    <NeonBentoCard className="h-[380px]" themeColor={themeColor} delay={0.1}>
      <WidgetMetricHeader
        icon={Cpu}
        label="CPU"
        subtitle={displayName}
        subtitleTitle={displayName}
        themeColor={themeColor}
        badge={
          <div className="flex gap-2 items-center">
            <MetricPercentBadge
              value={`${usage.toFixed(1)}%`}
              themeColor={themeColor}
              textColor="var(--neon-pink-text)"
              isDark={isDark}
            />
            {cpuTemp !== null ? (
              <MetricPercentBadge
                value={`${cpuTemp.toFixed(0)}°C`}
                themeColor={themeColor}
                textColor="var(--neon-pink-text)"
                isDark={isDark}
              />
            ) : null}
          </div>
        }
      />

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
        caption={t("cpu_sr_caption", { usage: usage.toFixed(1) })}
        columns={[
          { key: "time", label: t("cpu_sr_hour"), format: formatTime },
          { key: "value", label: t("cpu_sr_usage"), format: (v) => `${v.toFixed(1)} %` },
        ]}
        rows={srChartRows}
      />

      {/* Core Usage */}
      <div className="mt-auto shrink-0 z-10 relative">
        <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)] mb-2">
          {t("cpu_cores", { count: cores })}
        </p>
        <div className="flex items-end gap-1 h-20 px-3 py-2 rounded-2xl border border-[var(--border)] overflow-hidden w-full bg-[var(--spectrum-trough)]">
          {perCoreUsage.slice(0, 32).map((coreUsage, index) => {
            const barHeight = Math.max((coreUsage / 100) * 64, 4);
            return (
              <div
                key={index}
                title={t("cpu_core_title", { index: index + 1, value: coreUsage.toFixed(0) })}
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
