import { defaultWindowIcon } from '@tauri-apps/api/app';
import { Image } from '@tauri-apps/api/image';
import { Menu, MenuItem } from '@tauri-apps/api/menu';
import { TrayIcon } from '@tauri-apps/api/tray';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { appService } from '../services/api';

export const TRAY_ICON_ID = 'koi-monitor-tray';

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** KM monogram embedded in the Rust binary (`icons/32x32.png`). */
export async function loadAppIcon(): Promise<Image | null> {
  try {
    const bytes = await appService.getIconPng();
    return Image.fromBytes(new Uint8Array(bytes));
  } catch {
    return defaultWindowIcon();
  }
}

export async function showMainWindow(): Promise<void> {
  const window = getCurrentWindow();
  await window.show();
  await window.unminimize();
  await window.setSkipTaskbar(false);
  await window.setFocus();
}

export async function hideToTray(): Promise<void> {
  const window = getCurrentWindow();
  await window.hide();
  await window.setSkipTaskbar(true);
}

export async function destroyTrayIcon(tray: TrayIcon | null): Promise<void> {
  if (tray) {
    await tray.close();
    return;
  }
  await TrayIcon.removeById(TRAY_ICON_ID).catch(() => undefined);
}

export async function createTrayIcon(onQuit: () => void): Promise<TrayIcon> {
  await TrayIcon.removeById(TRAY_ICON_ID).catch(() => undefined);

  const showItem = await MenuItem.new({
    id: 'tray-show',
    text: 'Afficher Koi Monitor',
    action: () => {
      void showMainWindow();
    },
  });

  const quitItem = await MenuItem.new({
    id: 'tray-quit',
    text: 'Quitter',
    action: onQuit,
  });

  const menu = await Menu.new({ items: [showItem, quitItem] });
  const icon = await loadAppIcon();

  return TrayIcon.new({
    id: TRAY_ICON_ID,
    icon: icon ?? undefined,
    tooltip: 'Koi Monitor',
    menu,
    showMenuOnLeftClick: false,
    action: (event) => {
      if (
        event.type === 'Click' &&
        event.button === 'Left' &&
        event.buttonState === 'Up'
      ) {
        void showMainWindow();
      }
    },
  });
}
