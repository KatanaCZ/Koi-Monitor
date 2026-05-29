import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store';
import { driverService } from '../services/api';
import { isDevSessionReload } from '../utils/devSession';

export const useDriversData = () => {
  const [driversFetchSettled, setDriversFetchSettled] = useState(() => isDevSessionReload());
  const simplifiedMode = useAppStore((s) => s.settings.simplifiedMode);
  const setDrivers = useAppStore((s) => s.setDrivers);
  const setLoading = useAppStore((s) => s.setLoading);
  const pushStatusToast = useAppStore((s) => s.pushStatusToast);

  const fetchDrivers = useCallback(
    async (force = false, enrich = false) => {
      const requestedMode = simplifiedMode;
      setDriversFetchSettled(false);
      try {
        setLoading(true);
        const driverList = await driverService.getDrivers(requestedMode, force, enrich);
        if (useAppStore.getState().settings.simplifiedMode !== requestedMode) {
          return;
        }
        setDrivers(driverList);
      } catch (error) {
        console.error('Failed to fetch drivers:', error);
        pushStatusToast('Analyse des pilotes impossible', 'error');
      } finally {
        if (useAppStore.getState().settings.simplifiedMode === requestedMode) {
          setDriversFetchSettled(true);
          setLoading(false);
        }
      }
    },
    [setLoading, setDrivers, simplifiedMode, pushStatusToast],
  );

  const enrichDriversInBackground = useCallback(async () => {
    const requestedMode = simplifiedMode;
    try {
      const driverList = await driverService.getDrivers(requestedMode, false, true);
      if (useAppStore.getState().settings.simplifiedMode !== requestedMode) {
        return;
      }
      setDrivers(driverList);
    } catch (error) {
      console.error('Failed to enrich driver updates:', error);
    }
  }, [simplifiedMode, setDrivers]);

  useEffect(() => {
    const devReload = isDevSessionReload();

    void (async () => {
      if (devReload) {
        setDriversFetchSettled(true);
      }
      await fetchDrivers(false, false);
      if (!devReload) {
        void enrichDriversInBackground();
      }
    })();
  }, [simplifiedMode, fetchDrivers, enrichDriversInBackground]);

  return {
    driversFetchSettled,
    fetchDrivers,
  };
};
