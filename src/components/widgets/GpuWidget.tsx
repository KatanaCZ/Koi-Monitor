import { useMemo, memo } from "react";
import { Monitor } from "lucide-react";
import { useAppStore } from "../../store";
import { ringToArray } from "../../store/historyRing";
import { NeonBentoCard, ChartSrTable, WidgetMetricHeader, MetricPercentBadge } from "../common";
import { SingleAreaChart } from "../charts";

export const GpuWidget = memo(function GpuWidget() {
  const gpuRing = useAppStore((s) => s.gpuHistoryRing);
  const gpuHistory = useMemo(() => ringToArray(gpuRing), [gpuRing.seq]);
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
  const gpu = useAppStore((s) => s.systemInfo?.gpu?.[activeGpuIndex]) ?? {
    name: "GPU Info Unavailable",
    usage: 0,
    memory_used: 0,
    memory_total: 0,
    temperature: null as number | null,
  };
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

  const vramAvailable = Math.max(0, gpu.memory_total - gpu.memory_used);

  const gpuUsageLabel =
    gpu.usage === 0 ? "- %" : `${gpu.usage.toFixed(1)}%`;

  return (
    <NeonBentoCard className="h-[380px]" themeColor={themeColor} delay={0.3}>
      <WidgetMetricHeader
        icon={Monitor}
        label="GPU"
        subtitle={gpu.name}
        subtitleTitle={gpu.name}
        themeColor={themeColor}
        badge={
          <div className="flex gap-2 items-center">
            <MetricPercentBadge
              value={gpuUsageLabel}
              themeColor={themeColor}
              textColor="var(--neon-purple-text)"
              isDark={isDark}
            />
            {gpu.temperature !== null ? (
              <MetricPercentBadge
                value={`${gpu.temperature.toFixed(0)}°C`}
                themeColor={themeColor}
                textColor="var(--neon-purple-text)"
                isDark={isDark}
              />
            ) : null}
          </div>
        }
      />

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
        caption={`Historique charge GPU — actuel ${gpu.usage.toFixed(0)} %`}
        columns={[
          { key: "time", label: "Heure", format: formatTime },
          { key: "value", label: "Charge", format: (v) => `${v.toFixed(1)} %` },
        ]}
        rows={srChartRows}
      />

      {/* GPU Details */}
      <div className="grid grid-cols-2 gap-4 mt-auto shrink-0 z-10 relative">
        <div className="p-4 rounded-2xl bg-[var(--surface-inset)] border border-[var(--border)] backdrop-blur-sm">
          <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)] mb-2">
            VRAM disponible
          </p>
          <p
            className="text-sm font-semibold mono-text"
            style={{ color: "var(--neon-purple-text)" }}
          >
            {formatBytes(vramAvailable)}
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
    </NeonBentoCard>
  );
});
