import { useMemo, memo } from "react";
import { Download, Upload } from "lucide-react";
import { useAppStore } from "../../store";
import { ringToArray } from "../../store/historyRing";
import { NeonBentoCard, ChartSrTable } from "../common";
import { DualAreaChart } from "../charts";
import {
  getActiveConnection,
  formatNetworkWidgetSubtitle,
  getActiveNetworkAdapterName,
} from "../../utils/networkInterface";
import { DNS_WIDGET_BASE_HEIGHT } from "../../utils/dnsWidgetLayout";
import { useTranslation } from "../../hooks/useTranslation";

const parseSpeed = (speed: number, language: string = "fr") => {
  const isFr = language === "fr";
  if (speed < 1) {
    return { value: (speed * 1024).toFixed(1), unit: isFr ? "Ko/s" : "KB/s" };
  }
  return { value: speed.toFixed(2), unit: isFr ? "Mo/s" : "MB/s" };
};

export const NetworkWidget = memo(function NetworkWidget({
  layoutHeight = null,
}: {
  layoutHeight?: number | null;
}) {
  const { t, language } = useTranslation();
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
    const { value, unit } = parseSpeed(speed, language);
    return `${value} ${unit}`;
  };

  const downloadSpeed = parseSpeed(network.download_speed, language);
  const uploadSpeed = parseSpeed(network.upload_speed, language);
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

  const networkSubtitle = formatNetworkWidgetSubtitle(
    activeConnection,
    activeAdapterName,
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
    new Date(ts).toLocaleTimeString(language === "fr" ? "fr-FR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const formatMbps = (v: number) =>
    v < 1
      ? `${(v * 1024).toFixed(1)} ${language === "fr" ? "Ko/s" : "KB/s"}`
      : `${v.toFixed(2)} ${language === "fr" ? "Mo/s" : "MB/s"}`;

  const isDark = theme === "dark";
  const themeColorDown = "var(--neon-turquoise)";
  const themeColorUp = "var(--neon-green)";

  const resolvedHeight = layoutHeight ?? DNS_WIDGET_BASE_HEIGHT;
  const cardStyle = {
    height: resolvedHeight,
    minHeight: resolvedHeight,
    maxHeight: `min(${resolvedHeight}px, 90dvh)`,
  };

  return (
    <NeonBentoCard
      className="h-full w-full min-h-0"
      style={cardStyle}
      themeColor={themeColorDown}
      delay={0.4}
    >
      {/* Header */}
      <div className="flex items-start gap-2 shrink-0 min-w-0 w-full">
        <div
          className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${themeColorDown}, color-mix(in srgb, ${themeColorDown} 50%, transparent))`,
          }}
        >
          {HeaderIcon ? <HeaderIcon size={20} aria-hidden="true" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-1">
            {t("net_title")}
          </h3>
          <p
            className="text-xs text-[var(--text-muted)] leading-snug line-clamp-2"
            title={networkSubtitle}
          >
            {networkSubtitle}
          </p>
        </div>
      </div>

      {/* Chart — flex-1 pour remplir si la carte s'étire avec le DNS voisin */}
      <div className="flex-1 min-h-32 shrink-0" aria-hidden="true">
        <DualAreaChart
          data={chartData}
          themeColorDown={themeColorDown}
          themeColorUp={themeColorUp}
          isDark={isDark}
          formatSpeed={formatSpeed}
        />
      </div>
      <ChartSrTable
        caption={t("net_history_caption", {
          download: formatSpeed(network.download_speed),
          upload: formatSpeed(network.upload_speed),
        })}
        columns={[
          { key: "time", label: t("cpu_sr_hour"), format: formatTime },
          { key: "download", label: language === "fr" ? "Téléchargement" : "Download", format: formatMbps },
          { key: "upload", label: language === "fr" ? "Envoi" : "Upload", format: formatMbps },
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
              {t("net_reception")}
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
            {t("net_total")}{" "}
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
              {t("net_emission")}
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
            {t("net_total")}{" "}
            <span className="mono-text font-semibold text-[var(--foreground)]">
              {formatTotal(network.total_transmitted)}
            </span>
          </p>
        </div>
      </div>
    </NeonBentoCard>
  );
});
