import { useState, useEffect, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, RefreshCw, Maximize2, Minimize2, Signal, Settings2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { NeonBentoCard } from '../common';
import { collapseEssentialDrivers, hasDriverUpdate } from '../../utils/driverFormat';
import {
  getDriversHeaderSubtitle,
  getSummaryBandTitle,
  getSummaryBandSubtitle,
  getSummaryBandBadge,
  isEmptyDriversList,
  getEmptyDriversToast,
  getScanButtonIdle,
  getScanButtonLoading,
} from '../../utils/driverCopy';
import { driverService } from '../../services/api';
import { isSafeExternalUrl } from '../../utils/safeUrl';
import { DriverTile, getDriverTileDensity } from './DriverTile';
import { DriverDetailPanel } from './DriverDetailPanel';
import type { DriverInfo } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface DriversWidgetProps {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onCustomize?: () => void;
}

export const DriversWidget = memo(function DriversWidget({
  isExpanded = false,
  onToggleExpand,
  onCustomize,
}: DriversWidgetProps) {
  const { t, language } = useTranslation();
  const drivers = useAppStore((s) => s.drivers);
  const isLoading = useAppStore((s) => s.isLoading);
  const setDrivers = useAppStore((s) => s.setDrivers);
  const setLoading = useAppStore((s) => s.setLoading);
  const pushStatusToast = useAppStore((s) => s.pushStatusToast);
  const simplifiedMode = useAppStore((s) => s.settings.simplifiedMode);
  const [manualSelectedKey, setManualSelectedKey] = useState<string | null>(null);

  const themeColor = 'var(--neon-purple)';

  const filteredDrivers = useMemo(() => {
    if (isEmptyDriversList(drivers)) {
      return drivers;
    }
    if (!simplifiedMode) {
      return drivers;
    }
    const collapsed = collapseEssentialDrivers(drivers);
    return collapsed.length > 0 ? collapsed : drivers;
  }, [drivers, simplifiedMode]);

  const driverKey = (driver: DriverInfo) => `${driver.name}-${driver.version}`;

  const tileDensity = getDriverTileDensity(filteredDrivers.length, isExpanded);
  const useCompact = filteredDrivers.length > 3;

  const listClassName =
    simplifiedMode && filteredDrivers.length <= 3
      ? 'flex flex-col gap-2 w-full shrink-0'
      : useCompact
        ? 'flex flex-wrap justify-center gap-2 w-full shrink-0'
        : 'flex flex-wrap justify-center gap-4 w-full shrink-0';

  const cardSizeClass = isExpanded
    ? 'w-full max-w-5xl h-auto shadow-2xl'
    : 'h-[380px]';

  const bodyClassName = isExpanded
    ? 'flex flex-col gap-3 w-full shrink-0'
    : 'flex flex-1 flex-col min-h-0 w-full gap-2';

  const listZoneClassName = isExpanded
    ? 'flex flex-wrap justify-center gap-2 w-full shrink-0'
    : 'flex-1 flex flex-col justify-center min-h-0 w-full py-1';

  const installedCount = filteredDrivers.filter((d) => d.status === 'Installed').length;
  const updateCount = filteredDrivers.filter((d) => hasDriverUpdate(d)).length;
  const verifyCount = filteredDrivers.filter((d) => d.status === 'Verify Online').length;

  const selectedDriverKey = useMemo(() => {
    if (!isExpanded) return null;
    if (
      manualSelectedKey &&
      filteredDrivers.some((d) => driverKey(d) === manualSelectedKey)
    ) {
      return manualSelectedKey;
    }
    const withUpdate = filteredDrivers.find((d) => hasDriverUpdate(d));
    const pick = withUpdate ?? filteredDrivers[0];
    return pick ? driverKey(pick) : null;
  }, [isExpanded, manualSelectedKey, filteredDrivers]);

  const selectedDriver = useMemo(() => {
    if (!selectedDriverKey) return null;
    return filteredDrivers.find((d) => driverKey(d) === selectedDriverKey) ?? null;
  }, [filteredDrivers, selectedDriverKey]);

  useEffect(() => {
    if (!isExpanded) setManualSelectedKey(null);
  }, [isExpanded]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const result = await driverService.getDrivers(simplifiedMode, true, true);
      setDrivers(result);
      if (isEmptyDriversList(result)) {
        pushStatusToast(getEmptyDriversToast(), 'warning');
      }
    } catch (error) {
      console.error('Failed to refresh drivers:', error);
      pushStatusToast(t('drivers_scan_toast_error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWindowsUpdate = async () => {
    try {
      await driverService.openWindowsUpdate();
    } catch (error) {
      console.error('Failed to open Windows Update:', error);
      pushStatusToast(t('drivers_windows_update_error'), 'error');
    }
  };

  const handleOpenUrl = async (url: string) => {
    if (!url || !isSafeExternalUrl(url)) {
      console.warn('Blocked unsafe external URL:', url);
      return;
    }
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  const renderDriverTiles = (selectable: boolean) => (
    <div className={listClassName}>
      {filteredDrivers.map((driver, index) => {
        const key = driverKey(driver);
        return (
          <DriverTile
            key={key}
            driver={driver}
            density={tileDensity}
            selectable={selectable}
            selected={selectable && selectedDriverKey === key}
            onSelect={selectable ? () => setManualSelectedKey(key) : undefined}
            index={index}
            instant={selectable}
            essentialOnly={simplifiedMode}
          />
        );
      })}
    </div>
  );

  const renderSummaryBand = () => {
    if (isEmptyDriversList(filteredDrivers)) return null;

    const badge = getSummaryBandBadge(updateCount, verifyCount);
    const badgeColor =
      badge.tone === 'update'
        ? 'var(--neon-purple-text)'
        : badge.tone === 'verify'
          ? '#f59e0b'
          : 'var(--neon-green-text)';

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`${
          useCompact ? 'px-3 py-2 rounded-xl' : 'p-4 rounded-2xl'
        } border flex items-center justify-between shrink-0 backdrop-blur-sm w-full`}
        style={{
          backgroundColor: `color-mix(in srgb, ${themeColor} 10%, transparent)`,
          borderColor: `color-mix(in srgb, ${themeColor} 30%, transparent)`,
          boxShadow: `inset 0 0 20px color-mix(in srgb, ${themeColor} 5%, transparent)`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`${
              useCompact ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'
            } flex items-center justify-center shrink-0`}
            style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)` }}
          >
            <Signal size={useCompact ? 16 : 20} style={{ color: badgeColor }} />
          </div>
          <div className="min-w-0">
            <p
              className={`${
                useCompact ? 'text-[10px] mb-0.5' : 'text-xs mb-1'
              } uppercase font-bold tracking-widest text-[var(--text-subtle)] truncate`}
            >
              {getSummaryBandTitle(filteredDrivers.length)}
            </p>
            <p
              className={`${useCompact ? 'text-xs' : 'text-sm'} font-semibold leading-tight`}
              style={{ color: badgeColor }}
            >
              {getSummaryBandSubtitle(installedCount, updateCount, verifyCount)}
            </p>
          </div>
        </div>
        <div
          className={`${
            useCompact ? 'px-3 py-1 rounded-lg' : 'px-4 py-2 rounded-xl'
          } border shrink-0`}
          style={{
            backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)`,
            borderColor: `color-mix(in srgb, ${themeColor} 30%, transparent)`,
          }}
        >
          <span
            className={`${useCompact ? 'text-sm' : 'text-base'} font-bold`}
            style={{ color: badgeColor }}
          >
            {badge.label}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <NeonBentoCard
      className={cardSizeClass}
      themeColor={themeColor}
      delay={0.6}
    >
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${themeColor}, color-mix(in srgb, ${themeColor} 50%, transparent))`,
            }}
          >
            <HardDrive size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-1">
              {t('drivers_widget_title')}
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-snug">
              {getDriversHeaderSubtitle(filteredDrivers, simplifiedMode)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-busy={isLoading}
            aria-label={isLoading ? (language === 'fr' ? 'Scan des pilotes en cours' : 'Scanning drivers...') : getScanButtonIdle()}
            className={`px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] hover:border-[var(--neon-purple)]/30 text-[var(--foreground)] text-sm font-semibold flex items-center gap-2 transition-colors min-h-[44px] ${
              isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <motion.div
              animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: 'linear' }}
            >
              <RefreshCw size={16} className="text-[var(--text-muted)]" aria-hidden="true" />
            </motion.div>
            {isLoading ? getScanButtonLoading() : getScanButtonIdle()}
          </motion.button>

          {onCustomize && (
            <button
              type="button"
              onClick={onCustomize}
              className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] hover:border-[var(--neon-purple)]/30 text-[var(--foreground)] text-xs font-semibold flex items-center gap-2 min-h-[44px] transition-colors cursor-pointer"
              aria-label={t('drivers_btn_customize_aria')}
              title={t('drivers_btn_customize_title')}
            >
              <Settings2 size={14} aria-hidden="true" />
              <span className="hidden sm:inline">{t('dns_customize')}</span>
            </button>
          )}

          {onToggleExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="w-11 h-11 rounded-xl border flex items-center justify-center cursor-pointer transition-colors bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] border-[var(--border)] hover:border-[var(--neon-purple)]/30 text-[var(--foreground)]"
              aria-label={isExpanded ? t('dns_widget_minimize') : t('dns_widget_maximize')}
            >
              {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
        </div>
      </div>

      <div className={bodyClassName}>
        {isExpanded ? (
          <>
            <div className={listZoneClassName}>{renderDriverTiles(true)}</div>
            {selectedDriver ? (
              <DriverDetailPanel
                driver={selectedDriver}
                onOpenWindowsUpdate={() => void handleOpenWindowsUpdate()}
                onOpenUrl={(url) => void handleOpenUrl(url)}
              />
            ) : null}
          </>
        ) : (
          <>
            <div className={listZoneClassName}>{renderDriverTiles(false)}</div>
            {renderSummaryBand()}
          </>
        )}
      </div>
    </NeonBentoCard>
  );
});
