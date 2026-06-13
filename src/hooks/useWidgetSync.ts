import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store';

export function useWidgetSync() {
  const showDesktopWidget = useAppStore((s) => s.settings.showDesktopWidget);

  useEffect(() => {
    const syncWidget = async () => {
      try {
        if (showDesktopWidget) {
          await invoke('open_widget_view');
        } else {
          await invoke('close_widget_view');
        }
      } catch (err) {
        console.error('Failed to sync widget state', err);
      }
    };
    
    void syncWidget();
  }, [showDesktopWidget]);
}
