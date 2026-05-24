import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { autostartService } from '../services/autostart';
import { isTauriRuntime } from '../utils/systemTray';

export function useAutostart(): void {
  const launchAtStartup = useAppStore((s) => s.settings.launchAtStartup);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const pushStatusToast = useAppStore((s) => s.pushStatusToast);
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!isTauriRuntime() || syncingRef.current) return;

    let cancelled = false;
    syncingRef.current = true;

    const sync = async () => {
      try {
        await autostartService.syncWithPreference(launchAtStartup);
      } catch (error) {
        console.error('Autostart sync failed:', error);
        if (cancelled) return;

        try {
          const osEnabled = await autostartService.isEnabled();
          if (osEnabled !== launchAtStartup) {
            updateSettings({ launchAtStartup: osEnabled });
          }
          pushStatusToast(
            'Démarrage automatique indisponible — vérifiez les permissions Windows',
            'warning',
          );
        } catch {
          pushStatusToast('Démarrage automatique indisponible', 'warning');
        }
      } finally {
        syncingRef.current = false;
      }
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [launchAtStartup, updateSettings, pushStatusToast]);
}
