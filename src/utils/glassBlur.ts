const SETTINGS_KEY = 'koi_settings';

export function syncGlassBlurClass(enabled: boolean): void {
  document.documentElement.classList.toggle('no-blur', !enabled);
}

/** Apply persisted preference before first paint (call from main.tsx). */
export function initGlassBlurFromStorage(): void {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { enableGlassmorphicBlur?: boolean };
      syncGlassBlurClass(parsed.enableGlassmorphicBlur !== false);
      return;
    }
  } catch {
    /* use default */
  }
  syncGlassBlurClass(true);
}
