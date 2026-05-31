import type { TranslateFn } from './translations';

export const EMPTY_DRIVERS_BACKEND_NAME = 'No hardware drivers detected';

export function getEmptyDriversUserLabel(t: TranslateFn): string {
  return t('drivers_empty_label');
}

export function getEmptyDriversToast(t: TranslateFn): string {
  return t('drivers_empty_toast');
}

export function normalizeDriverName(name: string, t: TranslateFn): string {
  if (name === EMPTY_DRIVERS_BACKEND_NAME) return getEmptyDriversUserLabel(t);
  return name;
}

export function isEmptyDriversList(drivers: { name: string }[]): boolean {
  return (
    drivers.length === 0 ||
    (drivers.length === 1 && drivers[0]?.name === EMPTY_DRIVERS_BACKEND_NAME)
  );
}

export function getDriversHeaderSubtitle(
  drivers: { name: string }[],
  simplified: boolean,
  t: TranslateFn,
): string {
  if (isEmptyDriversList(drivers)) {
    return t('drivers_header_empty');
  }
  const count = drivers.length;
  if (count === 0) {
    return t('drivers_header_scan_hint');
  }
  if (count === 1 && simplified) {
    return t('drivers_header_one_essential');
  }
  if (simplified) {
    return t('drivers_header_essentials', { count });
  }
  return t('drivers_header_full', { count });
}

export function getSummaryBandTitle(count: number, t: TranslateFn): string {
  if (count <= 0) return t('drivers_summary_pending');
  if (count === 1) return t('drivers_summary_one_observing');
  return t('drivers_summary_many_observing', { count });
}

export function getSummaryBandSubtitle(
  installedCount: number,
  updateCount: number,
  verifyCount: number,
  t: TranslateFn,
): string {
  const parts: string[] = [];
  if (installedCount > 0) {
    parts.push(
      installedCount === 1
        ? t('drivers_summary_stable_one')
        : t('drivers_summary_stable_many', { count: installedCount }),
    );
  }
  if (updateCount > 0) {
    parts.push(
      updateCount === 1
        ? t('drivers_summary_update_one')
        : t('drivers_summary_update_many', { count: updateCount }),
    );
  }
  if (verifyCount > 0) {
    parts.push(
      verifyCount === 1
        ? t('drivers_summary_verify_one')
        : t('drivers_summary_verify_many', { count: verifyCount }),
    );
  }
  if (parts.length === 0) return t('drivers_summary_scan_start');
  return parts.join(', ');
}

export function getSummaryBandBadge(
  updateCount: number,
  verifyCount: number,
  t: TranslateFn,
): { label: string; tone: 'ok' | 'update' | 'verify' } {
  if (updateCount > 0) {
    return {
      label:
        updateCount === 1
          ? t('drivers_badge_update_one')
          : t('drivers_badge_update_many', { count: updateCount }),
      tone: 'update',
    };
  }
  if (verifyCount > 0) {
    return {
      label:
        verifyCount === 1
          ? t('drivers_badge_verify_one')
          : t('drivers_badge_verify_many', { count: verifyCount }),
      tone: 'verify',
    };
  }
  return {
    label: t('drivers_badge_all_ok'),
    tone: 'ok',
  };
}

export function getDriverStoreWarningLines(t: TranslateFn): string[] {
  return [t('drivers_store_warning_1'), t('drivers_store_warning_2')];
}

export function getScanButtonIdle(t: TranslateFn): string {
  return t('drivers_scan_idle');
}

export function getScanButtonLoading(t: TranslateFn): string {
  return t('drivers_scan_loading');
}
