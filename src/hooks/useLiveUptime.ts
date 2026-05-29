import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store";

export function formatUptimeShort(totalSeconds: number): string {
  if (totalSeconds <= 0) return "Calcul…";
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const dStr = days > 0 ? `${days} j ` : "";
  const hStr = hours > 0 || days > 0 ? `${hours} h ` : "";
  const mStr = days > 0 ? "" : `${minutes} m`;

  return `${dStr}${hStr}${mStr}`.trim() || "0 m";
}

/** Uptime système interpolé à la seconde (chip TitleBar + ZenMetricsDock). */
export function useLiveUptime(): number {
  const baseUptime = useAppStore((s) => s.systemInfo?.uptime ?? 0);
  const syncedAt = useRef(Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    syncedAt.current = Date.now();
  }, [baseUptime]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return baseUptime > 0
    ? baseUptime + Math.floor((now - syncedAt.current) / 1000)
    : 0;
}
