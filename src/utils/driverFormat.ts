import type { DriverInfo } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  Graphics: 'Graphique (GPU)',
  Network: 'Réseau',
  Bluetooth: 'Bluetooth',
  Audio: 'Audio',
  Storage: 'Stockage',
  Firmware: 'Firmware',
};

export function getDriverCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

/** Affichage lisible d'une version pilote WMI. */
export function formatDriverVersion(raw: string | undefined | null): string {
  if (!raw || raw === 'N/A' || raw.trim() === '') {
    return 'Non détectée';
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
  const formatted = formatDriverVersion(version);
  return formatted === 'Non détectée' ? formatted : `v${formatted}`;
}

export function formatDriverVersionRange(
  installed: string,
  latest: string,
): string {
  return `${formatInstalledDriverLabel(installed)} → ${formatInstalledDriverLabel(latest)}`;
}

export function parseVersionDisplaySegments(raw: string | undefined | null): string[] {
  const formatted = formatDriverVersion(raw);
  if (formatted === 'Non détectée') return [];
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
  return driver.update_source === 'windows_update';
}

export function isDriverStoreOnlySource(driver: DriverInfo): boolean {
  return driver.update_source === 'driver_store';
}

export function getVendorUpdateLinkLabel(driver: DriverInfo): string {
  if (driver.update_url.includes('catalog.update.microsoft.com')) {
    return 'Catalogue Microsoft Update';
  }
  if (driver.category === 'Graphics') {
    return 'Site constructeur (GPU)';
  }
  return 'Site constructeur';
}

export function getDriverStatusLabel(status: string, driver?: DriverInfo): string {
  if (driver && hasDriverUpdate(driver)) {
    return 'MàJ dispo';
  }
  switch (status) {
    case 'Installed':
      return 'Installé';
    case 'Update Available':
      return 'MàJ dispo';
    case 'Verify Online':
      return 'Vérifier';
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
): { category: string; label: string; driver: DriverInfo | undefined }[] {
  return (['Graphics', 'Network', 'Bluetooth'] as const).map((category) => ({
    category,
    label: getDriverCategoryLabel(category),
    driver: getPrimaryDriver(drivers, category),
  }));
}

export function getWidgetDriverLine(
  drivers: DriverInfo[],
  category: string,
): string | null {
  const driver = drivers.find((d) => d.category === category);
  if (!driver) return null;
  const version = formatInstalledDriverLabel(driver.version);
  if (version === 'Non détectée') return null;
  const shortLabel =
    category === 'Graphics' ? 'GPU' : category === 'Network' ? 'Réseau' : 'BT';
  return `Pilote ${shortLabel} · ${version}`;
}
