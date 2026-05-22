import React, { useMemo, memo } from "react";
import { motion } from "framer-motion";
import { Download, Upload } from "lucide-react";
import { useAppStore } from "../../store";
import { ringToArray } from "../../store/historyRing";
import { NeonBentoCard, ChartSrTable } from "../common";
import { DualAreaChart } from "../charts";
import { getNeonTextShadow } from "../../utils/neonEffects";
import { getActiveConnection, formatConnectionSubtitle, getActiveNetworkAdapterName } from "../../utils/networkInterface";

const parseSpeed = (speed: number) => {
  if (speed < 1) {
    return { value: (speed * 1024).toFixed(1), unit: "Ko/s" };
  }
  return { value: speed.toFixed(2), unit: "Mo/s" };
};

export const NetworkWidget = memo(function NetworkWidget() {
  const downloadRing = useAppStore((s) => s.networkDownloadRing);
  const uploadRing = useAppStore((s) => s.networkUploadRing);
  const networkDownloadHistory = useMemo(
    () => ringToArray(downloadRing),
    [downloadRing.seq],
  );
  const networkUploadHistory = useMemo(
    () => ringToArray(uploadRing),
    [uploadRing.seq],
  );
  const network = useAppStore((s) => s.systemInfo?.network) ?? {
    download_speed: 0,
    upload_speed: 0,
    total_received: 0,
    total_transmitted: 0,
    interfaces: [],
  };
  const theme = useAppStore((s) => s.theme);
  const drivers = useAppStore((s) => s.drivers);

  const formatSpeed = (speed: number) => {
    const { value, unit } = parseSpeed(speed);
    return `${value} ${unit}`;
  };

  const downloadSpeed = parseSpeed(network.download_speed);
  const uploadSpeed = parseSpeed(network.upload_speed);
  const interfaces = network.interfaces ?? [];

  const interfaceKey = useMemo(
    () =>
      interfaces
        .map((i) => `${i.name}:${i.received}:${i.transmitted}`)
        .join("|"),
    [interfaces],
  );

  const activeConnection = useMemo(
    () => getActiveConnection(interfaces),
    [interfaceKey, interfaces],
  );

  const activeAdapterName = useMemo(
    () => getActiveNetworkAdapterName(drivers, activeConnection),
    [drivers, activeConnection],
  );

  const HeaderIcon = activeConnection?.Icon;

  const formatTotal = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const chartData = useMemo(
    () =>
      networkDownloadHistory.map((item, index) => ({
        index,
        timestamp: item.timestamp,
        download: item.value,
        upload: networkUploadHistory[index]?.value ?? 0,
      })),
    [networkDownloadHistory, networkUploadHistory],
  );

  const srChartRows = useMemo(
    () =>
      networkDownloadHistory.map((item, index) => ({
        time: item.timestamp,
        download: item.value,
        upload: networkUploadHistory[index]?.value ?? 0,
      })),
    [networkDownloadHistory, networkUploadHistory],
  );

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const formatMbps = (v: number) =>
    v < 1 ? `${(v * 1024).toFixed(1)} Ko/s` : `${v.toFixed(2)} Mo/s`;

  const isDark = theme === "dark";
  const themeColorDown = "var(--neon-turquoise)";
  const themeColorUp = "var(--neon-green)";

  return (
    <NeonBentoCard
      className="h-[380px]"
      themeColor={themeColorDown}
      delay={0.4}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 shrink-0 min-w-0 w-full">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div
            className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${themeColorDown}, color-mix(in srgb, ${themeColorDown} 50%, transparent))`,
            }}
          >
            {HeaderIcon ? <HeaderIcon size={20} aria-hidden="true" /> : null}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-1">
              Réseau
            </h3>
            <p
              className="text-xs text-[var(--text-muted)] truncate"
              title={activeConnection ? formatConnectionSubtitle(activeConnection) : undefined}
            >
              {activeConnection
                ? formatConnectionSubtitle(activeConnection)
                : "Aucune interface détectée"}
            </p>
            {activeAdapterName ? (
              <p
                className="text-xs text-[var(--neon-turquoise-text)] mt-0.5 truncate"
                title={activeAdapterName}
              >
                {activeAdapterName}
              </p>
            ) : null}
          </div>
        </div>
        <motion.div
          className="shrink-0 ml-auto px-3 py-1.5 rounded-full border flex items-center gap-2 whitespace-nowrap"
          style={{
            backgroundColor: `color-mix(in srgb, ${themeColorDown} 15%, transparent)`,
            borderColor: `color-mix(in srgb, ${themeColorDown} 30%, transparent)`,
          }}
        >
          <span
            className="flex items-baseline gap-0.5 mono-text text-sm font-bold tracking-tight tabular-nums"
            style={{
              color: "var(--neon-turquoise-text)",
              textShadow: getNeonTextShadow(themeColorDown, isDark),
            }}
          >
            <Download size={11} className="self-center shrink-0" aria-hidden="true" />
            <span>{downloadSpeed.value}</span>
            <span className="text-[10px] font-semibold opacity-80">
              {downloadSpeed.unit}
            </span>
          </span>
          <span className="w-px h-3.5 bg-[var(--border-strong)] shrink-0" aria-hidden="true" />
          <span
            className="flex items-baseline gap-0.5 mono-text text-sm font-bold tracking-tight tabular-nums"
            style={{
              color: "var(--neon-green-text)",
              textShadow: getNeonTextShadow(themeColorUp, isDark),
            }}
          >
            <Upload size={11} className="self-center shrink-0" aria-hidden="true" />
            <span>{uploadSpeed.value}</span>
            <span className="text-[10px] font-semibold opacity-80">
              {uploadSpeed.unit}
            </span>
          </span>
        </motion.div>
      </div>

      {/* Chart */}
      <div className="h-32 shrink-0" aria-hidden="true">
        <DualAreaChart
          data={chartData}
          themeColorDown={themeColorDown}
          themeColorUp={themeColorUp}
          isDark={isDark}
          formatSpeed={formatSpeed}
        />
      </div>
      <ChartSrTable
        caption={`Historique débit réseau — téléchargement ${formatSpeed(network.download_speed)}, envoi ${formatSpeed(network.upload_speed)}`}
        columns={[
          { key: "time", label: "Heure", format: formatTime },
          { key: "download", label: "Téléchargement", format: formatMbps },
          { key: "upload", label: "Envoi", format: formatMbps },
        ]}
        rows={srChartRows}
      />

      {/* Cumulative totals */}
      <div className="grid grid-cols-2 gap-4 mt-auto shrink-0 z-10 relative">
        <div className="p-4 rounded-2xl bg-[var(--surface-inset)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <Download
              size={12}
              style={{
                color: isDark
                  ? "var(--neon-turquoise)"
                  : "var(--neon-turquoise-text)",
              }}
              aria-hidden="true"
            />
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)]">
              Réception
            </p>
          </div>
          <p
            className="flex items-baseline gap-1 mono-text font-bold tracking-tight"
            style={{
              color: isDark
                ? "var(--neon-turquoise)"
                : "var(--neon-turquoise-text)",
            }}
          >
            <span className="text-sm">{downloadSpeed.value}</span>
            <span className="text-[10px] font-semibold text-[var(--text-muted)]">
              {downloadSpeed.unit}
            </span>
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-2">
            Total{" "}
            <span className="mono-text font-semibold text-[var(--foreground)]">
              {formatTotal(network.total_received)}
            </span>
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--surface-inset)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <Upload
              size={12}
              style={{
                color: isDark ? "var(--neon-green)" : "var(--neon-green-text)",
              }}
              aria-hidden="true"
            />
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)]">
              Émission
            </p>
          </div>
          <p
            className="flex items-baseline gap-1 mono-text font-bold tracking-tight"
            style={{
              color: isDark ? "var(--neon-green)" : "var(--neon-green-text)",
            }}
          >
            <span className="text-sm">{uploadSpeed.value}</span>
            <span className="text-[10px] font-semibold text-[var(--text-muted)]">
              {uploadSpeed.unit}
            </span>
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-2">
            Total{" "}
            <span className="mono-text font-semibold text-[var(--foreground)]">
              {formatTotal(network.total_transmitted)}
            </span>
          </p>
        </div>
      </div>
    </NeonBentoCard>
  );
});
