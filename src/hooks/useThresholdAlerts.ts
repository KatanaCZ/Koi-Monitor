import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import {
  createThresholdAlertState,
  evaluateThresholdAlerts,
} from '../utils/thresholdAlerts';
import { isDevForceGamingProfile } from '../utils/alertDevSimulation';

export function useThresholdAlerts(): void {
  const enabled = useAppStore((s) => s.settings.alertThresholds.enabled);
  const alertThresholds = useAppStore((s) => s.settings.alertThresholds);
  const systemInfo = useAppStore((s) => s.systemInfo);
  const gamingLatency = useAppStore((s) => s.gamingLatency);
  const pushStatusToast = useAppStore((s) => s.pushStatusToast);
  const setActivityProfile = useAppStore((s) => s.setActivityProfile);

  const stateRef = useRef(createThresholdAlertState());

  useEffect(() => {
    if (!enabled) {
      stateRef.current = createThresholdAlertState();
      setActivityProfile('desktop');
      return;
    }

    if (!systemInfo) return;

    if (isDevForceGamingProfile()) {
      stateRef.current = {
        ...stateRef.current,
        profile: { mode: 'gaming', highLoadSince: null, lowLoadSince: null },
      };
    }

    const now = Date.now();
    const result = evaluateThresholdAlerts(
      stateRef.current,
      systemInfo,
      gamingLatency,
      alertThresholds,
      now,
    );

    stateRef.current = result.state;
    setActivityProfile(result.state.profile.mode);

    for (const alert of result.alerts) {
      pushStatusToast(alert.message, alert.type, { source: 'alert' });
      break;
    }
  }, [
    enabled,
    alertThresholds,
    systemInfo,
    gamingLatency,
    pushStatusToast,
    setActivityProfile,
  ]);
}
