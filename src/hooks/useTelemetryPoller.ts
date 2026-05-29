import { useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store';
import { systemService, gamingLatencyService, GAMING_LATENCY_EVENT } from '../services/api';
import { runDnsPingSession } from '../utils/dnsPing';
import { isDevTelemetryBlocked } from '../utils/alertDevSimulation';
import type { SystemInfo, GamingLatencySnapshot, CustomDnsServer } from '../types';

const TELEMETRY_EVENT = 'telemetry-update';
const GAMING_FALLBACK_MS = 2000;

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function useTelemetryPoller() {
  const zenMode = useAppStore((s) => s.zenMode);
  const dnsInterval = useAppStore((s) => s.settings.dnsInterval);
  const refreshInterval = useAppStore((s) => s.settings.refreshInterval);
  const dnsChecklist = useAppStore((s) => s.settings.dnsChecklist);
  const customDns = useAppStore((s) => s.settings.customDns);
  const applyTelemetrySnapshot = useAppStore((s) => s.applyTelemetrySnapshot);
  const setDnsResults = useAppStore((s) => s.setDnsResults);
  const setGamingLatency = useAppStore((s) => s.setGamingLatency);
  const setDnsFetchAttempted = useAppStore((s) => s.setDnsFetchAttempted);
  const pushStatusToast = useAppStore((s) => s.pushStatusToast);
  const alertsEnabled = useAppStore((s) => s.settings.alertThresholds.enabled);

  const pollGen = useRef(0);
  const zenModeRef = useRef(zenMode);
  const lastTelemetryApplyRef = useRef(0);
  zenModeRef.current = zenMode;

  const lastActiveRef = useRef<boolean | null>(null);
  const lastThrottledRef = useRef<boolean | null>(null);

  const runDnsPing = useCallback(
    async (checklist: string[], custom: CustomDnsServer | null, gen: number) => {
      if (zenModeRef.current) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (import.meta.env.DEV && isDevTelemetryBlocked()) return;
      await runDnsPingSession(
        checklist,
        custom,
        {
          onSuccess: (results) => {
            if (gen === pollGen.current) {
              setDnsResults(results);
            }
          },
          onError: () => {
            if (gen === pollGen.current) {
              setDnsFetchAttempted(true);
            }
          },
          toast: (message) => {
            if (gen === pollGen.current) {
              pushStatusToast(message, 'warning');
            }
          },
        },
      );
    },
    [setDnsResults, setDnsFetchAttempted, pushStatusToast],
  );

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;

      // Toggle CPU/GPU bypass styles on the HTML element
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('document-hidden', isHidden);
      }

      const targetActive = isHidden ? alertsEnabled : true;
      const targetThrottled = isHidden ? alertsEnabled : false;

      if (targetActive !== lastActiveRef.current) {
        lastActiveRef.current = targetActive;
        invoke('set_telemetry_active', { active: targetActive }).catch(console.error);
      }
      if (targetThrottled !== lastThrottledRef.current) {
        lastThrottledRef.current = targetThrottled;
        invoke('set_telemetry_throttled', { throttled: targetThrottled }).catch(console.error);
      }

      // Instant refresh on restore
      if (!isHidden && !zenModeRef.current) {
        runDnsPing(dnsChecklist, customDns, pollGen.current).catch(console.error);
      }
    };

    handleVisibilityChange();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('document-hidden');
      }
      lastActiveRef.current = null;
      lastThrottledRef.current = null;
      invoke('set_telemetry_active', { active: true }).catch(console.error);
      invoke('set_telemetry_throttled', { throttled: false }).catch(console.error);
    };
  }, [alertsEnabled, dnsChecklist, customDns, runDnsPing]);

  useEffect(() => {
    const gen = ++pollGen.current;
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    let unlistenGaming: (() => void) | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let gamingPollTimer: ReturnType<typeof setInterval> | undefined;

    const applyInfo = (info: SystemInfo) => {
      if (cancelled || gen !== pollGen.current) return;
      if (import.meta.env.DEV && isDevTelemetryBlocked()) return;
      const now = Date.now();
      if (now - lastTelemetryApplyRef.current < refreshInterval) return;
      lastTelemetryApplyRef.current = now;
      applyTelemetrySnapshot(info, !zenModeRef.current);
    };

    const fetchFallback = async () => {
      try {
        const info = await systemService.getSystemInfo();
        applyInfo(info);
      } catch (error) {
        console.error('Failed to fetch system info:', error);
        if (import.meta.env.DEV && (!isTauriRuntime() || isDevTelemetryBlocked())) {
          return;
        }
        pushStatusToast('Télémétrie système indisponible', 'error');
      }
    };

    const applyGaming = (snapshot: GamingLatencySnapshot) => {
      if (cancelled || gen !== pollGen.current) return;
      if (import.meta.env.DEV && isDevTelemetryBlocked()) return;
      setGamingLatency(snapshot);
    };

    const fetchGamingFallback = async () => {
      try {
        const snapshot = await gamingLatencyService.getSnapshot();
        applyGaming(snapshot);
      } catch (error) {
        console.error('Failed to fetch gaming latency:', error);
        if (import.meta.env.DEV && (!isTauriRuntime() || isDevTelemetryBlocked())) {
          return;
        }
        pushStatusToast('Latence jeu indisponible', 'warning');
      }
    };

    const startGamingStream = async () => {
      if (!isTauriRuntime()) {
        return;
      }

      try {
        const stop = await listen<GamingLatencySnapshot>(
          GAMING_LATENCY_EVENT,
          (event) => {
            applyGaming(event.payload);
          },
        );
        unlistenGaming = stop;
        await fetchGamingFallback();
      } catch (error) {
        console.error('Gaming latency event listen failed:', error);
        await fetchGamingFallback();
        gamingPollTimer = setInterval(fetchGamingFallback, GAMING_FALLBACK_MS);
      }
    };

    void startGamingStream();

    const startEventStream = async () => {
      if (!isTauriRuntime()) {
        if (import.meta.env.DEV) return;
        await fetchFallback();
        pollTimer = setInterval(fetchFallback, refreshInterval);
        return;
      }

      try {
        const stop = await listen<SystemInfo>(TELEMETRY_EVENT, (event) => {
          applyInfo(event.payload);
        });
        unlisten = stop;
      } catch (error) {
        console.error('Telemetry event listen failed, falling back to polling:', error);
        await fetchFallback();
        pollTimer = setInterval(fetchFallback, refreshInterval);
      }
    };

    void startEventStream();

    if (!zenMode) {
      runDnsPing(dnsChecklist, customDns, gen);
    }

    const dnsTimer = zenMode
      ? undefined
      : setInterval(() => runDnsPing(dnsChecklist, customDns, gen), dnsInterval);

    return () => {
      cancelled = true;
      pollGen.current += 1;
      unlisten?.();
      unlistenGaming?.();
      if (pollTimer) clearInterval(pollTimer);
      if (gamingPollTimer) clearInterval(gamingPollTimer);
      if (dnsTimer) clearInterval(dnsTimer);
    };
  }, [
    zenMode,
    dnsInterval,
    refreshInterval,
    dnsChecklist,
    customDns,
    applyTelemetrySnapshot,
    runDnsPing,
    setGamingLatency,
    pushStatusToast,
  ]);
}
