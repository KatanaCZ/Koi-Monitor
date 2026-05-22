import { useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../store';
import { systemService, gamingLatencyService, GAMING_LATENCY_EVENT } from '../services/api';
import { pingDnsChecklist } from '../utils/dnsPing';
import type { SystemInfo, GamingLatencySnapshot } from '../types';

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
  const applyTelemetrySnapshot = useAppStore((s) => s.applyTelemetrySnapshot);
  const setDnsResults = useAppStore((s) => s.setDnsResults);
  const setGamingLatency = useAppStore((s) => s.setGamingLatency);
  const setDnsFetchAttempted = useAppStore((s) => s.setDnsFetchAttempted);
  const pushStatusToast = useAppStore((s) => s.pushStatusToast);

  const pollGen = useRef(0);
  const zenModeRef = useRef(zenMode);
  const lastTelemetryApplyRef = useRef(0);
  zenModeRef.current = zenMode;

  const runDnsPing = useCallback(
    async (checklist: string[], gen: number) => {
      if (zenModeRef.current) return;
      try {
        const results = await pingDnsChecklist(checklist);
        if (gen === pollGen.current) {
          setDnsResults(results);
        }
      } catch (error) {
        console.error('Failed to fetch DNS info:', error);
        if (gen === pollGen.current) {
          setDnsFetchAttempted(true);
          pushStatusToast('Test DNS indisponible — réessayez dans quelques secondes', 'warning');
        }
      }
    },
    [setDnsResults, setDnsFetchAttempted, pushStatusToast],
  );

  useEffect(() => {
    const gen = ++pollGen.current;
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    let unlistenGaming: (() => void) | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let gamingPollTimer: ReturnType<typeof setInterval> | undefined;

    const applyInfo = (info: SystemInfo) => {
      if (cancelled || gen !== pollGen.current) return;
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
        pushStatusToast('Télémétrie système indisponible', 'error');
      }
    };

    const applyGaming = (snapshot: GamingLatencySnapshot) => {
      if (!cancelled && gen === pollGen.current) {
        setGamingLatency(snapshot);
      }
    };

    const fetchGamingFallback = async () => {
      try {
        const snapshot = await gamingLatencyService.getSnapshot();
        applyGaming(snapshot);
      } catch (error) {
        console.error('Failed to fetch gaming latency:', error);
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
      runDnsPing(dnsChecklist, gen);
    }

    const dnsTimer = zenMode
      ? undefined
      : setInterval(() => runDnsPing(dnsChecklist, gen), dnsInterval);

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
    applyTelemetrySnapshot,
    runDnsPing,
    setGamingLatency,
    pushStatusToast,
  ]);
}
