const DEV_BOOT_KEY = 'koi_dev_session_boot';

export function shouldSkipDevSplash(): boolean {
  return import.meta.env.DEV && sessionStorage.getItem(DEV_BOOT_KEY) === '1';
}

export function markDevSessionBooted(): void {
  if (!import.meta.env.DEV) return;
  sessionStorage.setItem(DEV_BOOT_KEY, '1');
}

export function isDevSessionReload(): boolean {
  return shouldSkipDevSplash();
}
