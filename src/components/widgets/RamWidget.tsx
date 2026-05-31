import { useMemo, memo } from "react";
import { MemoryStick } from "lucide-react";
import { useAppStore } from "../../store";
import { ringToArray } from "../../store/historyRing";
import { NeonBentoCard, ChartSrTable, WidgetMetricHeader, MetricPercentBadge } from "../common";
import { SingleAreaChart } from "../charts";
import { formatRamModulesSubtitle } from "../../utils/ramFormat";
import { useTranslation } from "../../hooks/useTranslation";

export const RamWidget = memo(function RamWidget() {
  const { t, language } = useTranslation();
  const ramRing = useAppStore((s) => s.ramHistoryRing);
  const ramHistory = useMemo(() => ringToArray(ramRing), [ramRing.seq]);
  const usage = useAppStore((s) => s.systemInfo?.memory.usage_percent ?? 0);
  const used = useAppStore((s) => s.systemInfo?.memory.used ?? 0);
  const available = useAppStore((s) => s.systemInfo?.memory.available ?? 0);
  const ramModules = useAppStore((s) => s.systemInfo?.memory.modules ?? []);
  const theme = useAppStore((s) => s.theme);
  const ramSubtitle = formatRamModulesSubtitle(ramModules);

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
    new Date(ts).toLocaleTimeString(language === "fr" ? "fr-FR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const isDark = theme === "dark";
  const themeColor = "var(--neon-cyan)";

  return (
    <NeonBentoCard className="h-[380px]" themeColor={themeColor} delay={0.2}>
      <WidgetMetricHeader
        icon={MemoryStick}
        label="RAM"
        subtitle={ramSubtitle || undefined}
        subtitleTitle={ramSubtitle || undefined}
        themeColor={themeColor}
        badge={
          <MetricPercentBadge
            value={`${usage.toFixed(1)}%`}
            themeColor={themeColor}
            textColor="var(--neon-cyan-text)"
            isDark={isDark}
          />
        }
      />

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
        caption={t("ram_sr_caption", { usage: usage.toFixed(1) })}
        columns={[
          { key: "time", label: t("cpu_sr_hour"), format: formatTime },
          { key: "value", label: t("cpu_sr_usage"), format: (v) => `${v.toFixed(1)} %` },
        ]}
        rows={srChartRows}
      />

      {/* Memory Details */}
      <div className="grid grid-cols-2 gap-4 mt-auto shrink-0 z-10 relative">
        <div className="p-4 rounded-2xl bg-[var(--surface-inset)] border border-[var(--border)] backdrop-blur-sm">
          <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)] mb-2">
            {t("ram_used")}
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
            {t("ram_available")}
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
