import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { useAppStore } from '../store';
import { isDevTelemetryBlocked } from '../utils/alertDevSimulation';
import {
  createZenLoadTracker,
  updateZenLoadTracker,
  type ZenLoadState,
} from '../utils/zenLoadState';

function resetTrackerUi(
  trackerRef: MutableRefObject<ReturnType<typeof createZenLoadTracker>>,
  setState: Dispatch<SetStateAction<ZenLoadState>>,
  setSmoothedLoad: Dispatch<SetStateAction<number>>,
  setRawLoad: Dispatch<SetStateAction<number>>,
): void {
  trackerRef.current = createZenLoadTracker();
  setState('rest');
  setSmoothedLoad(0);
  setRawLoad(0);
}

export function useZenLoadState(): {
  state: ZenLoadState;
  smoothedLoad: number;
  rawLoad: number;
} {
  const zenMode = useAppStore((s) => s.zenMode);
  const zenTrackerResetSeq = useAppStore((s) => s.zenTrackerResetSeq);
  const cpuUsage = useAppStore((s) => s.systemInfo?.cpu.usage ?? 0);
  const gpuUsage = useAppStore((s) => s.systemInfo?.gpu?.[0]?.usage ?? 0);

  const trackerRef = useRef(createZenLoadTracker());
  const wasZenRef = useRef(false);

  const [state, setState] = useState<ZenLoadState>('rest');
  const [smoothedLoad, setSmoothedLoad] = useState(0);
  const [rawLoad, setRawLoad] = useState(0);

  useEffect(() => {
    resetTrackerUi(trackerRef, setState, setSmoothedLoad, setRawLoad);
  }, [zenTrackerResetSeq]);

  useEffect(() => {
    if (zenMode !== wasZenRef.current) {
      resetTrackerUi(trackerRef, setState, setSmoothedLoad, setRawLoad);
    }
    wasZenRef.current = zenMode;
  }, [zenMode]);

  useEffect(() => {
    if (!zenMode) return;

    const devSim = isDevTelemetryBlocked();
    const result = updateZenLoadTracker(
      trackerRef.current,
      cpuUsage,
      gpuUsage,
      Date.now(),
      { skipSpikeDamp: devSim, devSimFast: devSim },
    );
    trackerRef.current = result.tracker;

    setRawLoad(result.rawLoad);
    setSmoothedLoad(result.smoothedLoad);
    setState((prev) => (prev === result.state ? prev : result.state));
  }, [zenMode, cpuUsage, gpuUsage, zenTrackerResetSeq]);

  return { state, smoothedLoad, rawLoad };
}
