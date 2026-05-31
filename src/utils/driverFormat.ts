import type { DriverInfo } from '../types';
import { DRIVER_STATUS, DRIVER_UPDATE_SOURCE } from '../constants/driverStatus';
import type { TranslationKey, TranslateFn } from './translations';
import { createTranslator } from './translations';
import { useAppStore } from '../store';

const CATEGORY_KEYS: Record<string, TranslationKey> = {
  Graphics: 'drivers_category_graphics',
  Network: 'drivers_category_network',
  Bluetooth: 'drivers_category_bluetooth',
  Audio: 'drivers_category_audio',
  Storage: 'drivers_category_storage',
  Firmware: 'drivers_category_firmware',
};

function appTranslate(): TranslateFn {
  return createTranslator(useAppStore.getState().settings.language || 'en');
}

export function getDriverCategoryLabel(category: string, t?: TranslateFn): string {
  const translate = t ?? appTranslate();
  const key = CATEGORY_KEYS[category];
  return key ? translate(key) : category;
}

/** Human-readable display for a WMI driver version string. */
export function formatDriverVersion(raw: string | undefined | null): string {
  const t = appTranslate();
  if (!raw || raw === 'N/A' || raw.trim() === '') {
    return t('drivers_version_not_detected');
  }

  const trimmed = raw.trim();

  if (/^\d+$/.test(trimmed) && trimmed.length >= 8) {
    const major = parseInt(trimmed.slice(0, trimmed.length - 8), 10);
    const rest = trimmed.slice(-8);
    const a = parseInt(rest.slice(0, 2), 10);
    const b = parseInt(rest.slice(2, 4), 10);
    const c = parseInt(rest.slice(4, 6), 10);
    const d = parseInt(rest.slice(6, 8), 10);
    if ([major, a, b, c, d].every((n) => !Number.isNaN(n))) {
      return `${major}.${a}.${b}.${c}`;
    }
  }

  return trimmed;
}

export function formatInstalledDriverLabel(version: string | undefined | null): string {
  const t = appTranslate();
  const formatted = formatDriverVersion(version);
  const notDet = t('drivers_version_not_detected');
  return formatted === notDet ? formatted : `v${formatted}`;
}

export function formatDriverVersionRange(
  installed: string,
  latest: string,
): string {
  return `${formatInstalledDriverLabel(installed)} → ${formatInstalledDriverLabel(latest)}`;
}

export function parseVersionDisplaySegments(raw: string | undefined | null): string[] {
  const t = appTranslate();
  const formatted = formatDriverVersion(raw);
  const notDet = t('drivers_version_not_detected');
  if (formatted === notDet) return [];
  return formatted.split('.');
}

export function getVersionDiffIndexes(
  installed: string,
  latest: string,
): Set<number> {
  const left = parseVersionDisplaySegments(installed);
  const right = parseVersionDisplaySegments(latest);
  const indexes = new Set<number>();
  const max = Math.max(left.length, right.length);

  for (let index = 0; index < max; index += 1) {
    if ((left[index] ?? '') !== (right[index] ?? '')) {
      indexes.add(index);
    }
  }

  return indexes;
}

export function shouldShowDriverVersionCompare(driver: DriverInfo): boolean {
  const latest = driver.latest_version?.trim();
  if (!latest) return false;
  return formatDriverVersion(latest) !== formatDriverVersion(driver.version);
}

export function hasDriverUpdate(driver: DriverInfo): boolean {
  return shouldShowDriverVersionCompare(driver);
}

export function isWindowsUpdateSource(driver: DriverInfo): boolean {
  return driver.update_source === DRIVER_UPDATE_SOURCE.WINDOWS_UPDATE;
}

export function isDriverStoreOnlySource(driver: DriverInfo): boolean {
  return driver.update_source === DRIVER_UPDATE_SOURCE.DRIVER_STORE;
}

export function getVendorUpdateLinkLabel(driver: DriverInfo, t: TranslateFn): string {
  if (driver.update_url.includes('catalog.update.microsoft.com')) {
    return t('drivers_vendor_catalog');
  }
  return t('drivers_vendor_manufacturer');
}

export function getDriverStatusLabel(
  status: string,
  t: TranslateFn,
  driver?: DriverInfo,
): string {
  if (driver && hasDriverUpdate(driver)) {
    return t('drivers_status_update');
  }
  switch (status) {
    case DRIVER_STATUS.INSTALLED:
      return t('drivers_status_installed');
    case DRIVER_STATUS.UPDATE_AVAILABLE:
      return t('drivers_status_update');
    case DRIVER_STATUS.VERIFY_ONLINE:
      return t('drivers_status_verify');
    case DRIVER_STATUS.UNKNOWN:
      return t('drivers_status_unknown');
    default:
      return status;
  }
}

export function getPrimaryDriver(
  drivers: DriverInfo[],
  category: string,
): DriverInfo | undefined {
  const matches = drivers.filter((d) => d.category === category);
  if (matches.length === 0) return undefined;

  switch (category) {
    case 'Graphics':
      return matches.find((d) => !isIntegratedGpu(d.name)) ?? matches[0];
    case 'Network':
      return (
        matches.find((d) => isEthernetAdapter(d.name)) ??
        matches.find((d) => isWifiAdapter(d.name)) ??
        matches[0]
      );
    default:
      return matches[0];
  }
}

export function collapseEssentialDrivers(drivers: DriverInfo[]): DriverInfo[] {
  return (['Graphics', 'Network', 'Bluetooth'] as const)
    .map((category) => getPrimaryDriver(drivers, category))
    .filter((driver): driver is DriverInfo => driver !== undefined);
}

function isIntegratedGpu(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('tm) graphics') ||
    lower.includes('integrated graphics') ||
    (lower.includes('radeon') && lower.includes('graphics') && !lower.includes('rx '))
  );
}

function isEthernetAdapter(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('ethernet') ||
    lower.includes('gbe') ||
    lower.includes('2.5g') ||
    lower.includes('gigabit')
  );
}

function isWifiAdapter(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('wi-fi') ||
    lower.includes('wifi') ||
    lower.includes('wlan') ||
    lower.includes('802.11')
  );
}

export function getEssentialDriverSummary(
  drivers: DriverInfo[],
  t: TranslateFn,
): { category: string; label: string; driver: DriverInfo | undefined }[] {
  return (['Graphics', 'Network', 'Bluetooth'] as const).map((category) => ({
    category,
    label: getDriverCategoryLabel(category, t),
    driver: getPrimaryDriver(drivers, category),
  }));
}

export function getWidgetDriverLine(
  drivers: DriverInfo[],
  category: string,
  t: TranslateFn,
): string | null {
  const driver = drivers.find((d) => d.category === category);
  if (!driver) return null;
  const version = formatInstalledDriverLabel(driver.version);
  const notDet = t('drivers_version_not_detected');
  if (version === notDet || version === `v${notDet}`) return null;
  if (category === 'Graphics') {
    return t('drivers_widget_line_gpu', { version });
  }
  if (category === 'Network') {
    return t('drivers_widget_line_net', { version });
  }
  return t('drivers_widget_line_bt', { version });
}
