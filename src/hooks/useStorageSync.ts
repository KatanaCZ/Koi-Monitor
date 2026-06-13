import { useEffect } from 'react';
import { useAppStore } from '../store';
import { loadSettings } from '../store/settingsSlice';
import { ThemeMode } from '../types';

export function useStorageSync() {
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'koi_settings') {
        const newSettings = loadSettings();
        updateSettings(newSettings);
      }
      if (e.key === 'koi_theme' && e.newValue) {
        setTheme(e.newValue as ThemeMode);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [updateSettings, setTheme]);
}
