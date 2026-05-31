import { memo } from 'react';
import type { DriverInfo } from '../../types';
import { DriverVersionCompare } from '../common/DriverVersionDisplay';
import {
  formatInstalledDriverLabel,
  getDriverCategoryLabel,
  hasDriverUpdate,
  isDriverStoreOnlySource,
  isWindowsUpdateSource,
  getVendorUpdateLinkLabel,
} from '../../utils/driverFormat';
import {
  getDriverStoreWarningLines,
  normalizeDriverName,
} from '../../utils/driverCopy';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface DriverDetailPanelProps {
  driver: DriverInfo;
  onOpenWindowsUpdate: () => void;
  onOpenUrl: (url: string) => void;
}

export const DriverDetailPanel = memo(function DriverDetailPanel({
  driver,
  onOpenWindowsUpdate,
  onOpenUrl,
}: DriverDetailPanelProps) {
  const { t, language } = useTranslation();
  const displayName = normalizeDriverName(driver.name);
  const warningLines = getDriverStoreWarningLines();

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-inset)] p-4 space-y-4 shrink-0">
      <div>
        <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)] mb-1">
          {language === 'fr' ? 'Détail pilote' : 'Driver Detail'}
        </p>
        <h4 className="text-base font-semibold text-[var(--foreground)] truncate" title={displayName}>
          {displayName}
        </h4>
        <p className="text-xs text-[var(--text-muted)] truncate" title={driver.provider}>
          {driver.provider}
        </p>
      </div>

      {hasDriverUpdate(driver) ? (
        <DriverVersionCompare
          installed={driver.version}
          latest={driver.latest_version}
          size="default"
          layout="inline"
          className="w-full justify-start"
        />
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        {!hasDriverUpdate(driver) ? (
          <div>
            <p className="text-[10px] text-[var(--text-subtle)] uppercase font-semibold tracking-wider mb-2">
              {language === 'fr' ? 'Version installée' : 'Installed Version'}
            </p>
            <p className="text-sm font-bold mono-text text-[var(--neon-purple-text)]">
              {formatInstalledDriverLabel(driver.version)}
            </p>
          </div>
        ) : null}
        <div>
          <p className="text-[10px] text-[var(--text-subtle)] uppercase font-semibold tracking-wider mb-2">
            {language === 'fr' ? 'Date installée' : 'Installed Date'}
          </p>
          <p className="text-sm font-medium mono-text text-[var(--foreground)]">
            {driver.date !== 'N/A' ? driver.date : (language === 'fr' ? 'Non renseignée' : 'Not specified')}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-subtle)] uppercase font-semibold tracking-wider mb-2">
            {t('drivers_category')}
          </p>
          <p className="text-sm font-medium text-[var(--foreground)]">
            {getDriverCategoryLabel(driver.category)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-subtle)] uppercase font-semibold tracking-wider mb-2">
            {t('drivers_provider')}
          </p>
          <p className="text-sm font-medium text-[var(--foreground)] break-words" title={driver.provider}>
            {driver.provider}
          </p>
        </div>
        {driver.hardware_id ? (
          <div className="col-span-2">
            <p className="text-[10px] text-[var(--text-subtle)] uppercase font-semibold tracking-wider mb-2">
              {t('drivers_hwid')}
            </p>
            <p
              className="text-[11px] font-medium mono-text text-[var(--text-muted)] bg-[var(--surface-raised)] p-2 rounded-lg border border-[var(--border)] break-all"
              title={driver.hardware_id}
            >
              {driver.hardware_id}
            </p>
          </div>
        ) : null}
      </div>

      {hasDriverUpdate(driver) ? (
        <div className="space-y-3">
          {isDriverStoreOnlySource(driver) ? (
            <div className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug space-y-1">
              <p>{warningLines[0]}</p>
              <p>{warningLines[1]}</p>
            </div>
          ) : null}
          {isWindowsUpdateSource(driver) ? (
            <button
              type="button"
              onClick={() => onOpenWindowsUpdate()}
              className="w-full min-h-[44px] py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer bg-sky-100 hover:bg-sky-200 text-sky-700 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 dark:text-sky-400"
            >
              <ExternalLink size={16} aria-hidden="true" />
              {language === 'fr' ? 'Ouvrir Windows Update' : 'Open Windows Update'}
            </button>
          ) : null}
          {driver.update_url &&
          (isDriverStoreOnlySource(driver) || isWindowsUpdateSource(driver)) ? (
            <button
              type="button"
              onClick={() => onOpenUrl(driver.update_url)}
              className={`w-full min-h-[44px] py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isWindowsUpdateSource(driver)
                  ? 'bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] text-[var(--foreground)] border border-[var(--border)]'
                  : 'bg-sky-100 hover:bg-sky-200 text-sky-700 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 dark:text-sky-400'
              }`}
            >
              <ExternalLink size={16} aria-hidden="true" />
              {getVendorUpdateLinkLabel(driver)}
            </button>
          ) : null}
          {isDriverStoreOnlySource(driver) ? (
            <button
              type="button"
              onClick={() => onOpenWindowsUpdate()}
              className="w-full min-h-[44px] py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] text-[var(--foreground)] border border-[var(--border)]"
            >
              {language === 'fr' ? 'Vérifier Windows Update' : 'Check Windows Update'}
            </button>
          ) : null}
        </div>
      ) : driver.update_url ? (
        <button
          type="button"
          onClick={() => onOpenUrl(driver.update_url)}
          className={`w-full min-h-[44px] py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            driver.status === 'Verify Online'
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-400'
              : 'bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] text-[var(--foreground)]'
          }`}
        >
          <ExternalLink size={16} aria-hidden="true" />
          {driver.status === 'Verify Online'
            ? (language === 'fr' ? 'Confirmer en ligne' : 'Confirm Online')
            : (language === 'fr' ? 'Page constructeur' : 'Manufacturer Page')}
        </button>
      ) : null}
    </div>
  );
});
