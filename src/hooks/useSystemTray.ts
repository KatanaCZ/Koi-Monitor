import { useEffect, useRef } from 'react';
import { TrayIcon } from '@tauri-apps/api/tray';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppStore } from '../store';
import {
  createTrayIcon,
  destroyTrayIcon,
  hideToTray,
  isTauriRuntime,
  showMainWindow,
  quitApp,
} from '../utils/systemTray';

export function useSystemTray(): void {
  const minimizeToTray = useAppStore((s) => s.settings.minimizeToTray);
  const trayRef = useRef<TrayIcon | null>(null);
  const quittingRef = useRef(false);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    let unlistenClose: (() => void) | undefined;
    let cancelled = false;

    const teardownTray = async () => {
      unlistenClose?.();
      unlistenClose = undefined;
      await destroyTrayIcon(trayRef.current);
      trayRef.current = null;
      await getCurrentWindow().setSkipTaskbar(false);
    };

    const setup = async () => {
      await teardownTray();
      quittingRef.current = false;

      if (!minimizeToTray || cancelled) {
        if (!cancelled && !minimizeToTray) {
          await showMainWindow();
          unlistenClose = await getCurrentWindow().onCloseRequested(async (event) => {
            if (quittingRef.current) return;
            event.preventDefault();
            quittingRef.current = true;
            await quitApp();
          });
        }
        return;
      }

      const tray = await createTrayIcon(async () => {
        quittingRef.current = true;
        await destroyTrayIcon(trayRef.current);
        trayRef.current = null;
        // Menu item will call quitApp() automatically
      });

      if (cancelled) {
        await tray.close();
        return;
      }

      trayRef.current = tray;

      unlistenClose = await getCurrentWindow().onCloseRequested(async (event) => {
        if (quittingRef.current) return;
        event.preventDefault();
        await hideToTray();
      });
    };

    void setup();

    return () => {
      cancelled = true;
      quittingRef.current = false;
      void teardownTray();
    };
  }, [minimizeToTray]);
}
