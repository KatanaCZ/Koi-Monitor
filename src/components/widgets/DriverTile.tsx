import { memo } from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import type { DriverInfo } from '../../types';
import { DriverVersionCompare } from '../common/DriverVersionDisplay';
import { DriverCategoryIcon } from '../common/DriverCategoryIcon';
import {
  formatInstalledDriverLabel,
  getDriverStatusLabel,
  hasDriverUpdate,
} from '../../utils/driverFormat';
import { normalizeDriverName } from '../../utils/driverCopy';

export type DriverTileDensity = 'default' | 'compact' | 'ultra';

interface DriverTileProps {
  driver: DriverInfo;
  density: DriverTileDensity;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  index?: number;
  /** Pas d'animation d'entrée (zoom overlay) */
  instant?: boolean;
  /** Mode pilotes essentiels : nom + statut seulement */
  essentialOnly?: boolean;
}

function getStatusColorClass(status: string, hasUpdate: boolean): string {
  if (hasUpdate) {
    return 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20';
  }
  switch (status.toLowerCase()) {
    case 'installed':
      return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
    case 'update available':
      return 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20';
    case 'verify online':
      return 'text-[var(--warning-text)] bg-[color-mix(in_srgb,var(--warning)_12%,var(--surface-inset))] border-[color-mix(in_srgb,var(--warning)_28%,var(--border))]';
    default:
      return 'text-[var(--text-muted)] bg-[var(--surface-inset)] border-[var(--border-strong)]';
  }
}

function getTileWidthClass(
  density: DriverTileDensity,
  useDenseGrid: boolean,
  useUltraDense: boolean,
): string {
  if (density === 'default') {
    return 'w-full sm:w-[calc(50%-0.25rem)] lg:w-[calc(33.333%-0.34rem)] min-w-[140px] max-w-[220px] flex-1';
  }
  if (useUltraDense) {
    return 'w-full sm:w-[calc(50%-0.25rem)] lg:w-[calc(25%-0.375rem)]';
  }
  if (useDenseGrid) {
    return 'w-full sm:w-[calc(50%-0.25rem)] lg:w-[calc(33.333%-0.34rem)]';
  }
  return 'w-full sm:w-[calc(50%-0.25rem)]';
}

export const DriverTile = memo(function DriverTile({
  driver,
  density,
  selectable = false,
  selected = false,
  onSelect,
  index = 0,
  instant = false,
  essentialOnly = false,
}: DriverTileProps) {
  const hasUpdate = hasDriverUpdate(driver);
  const isCompact = density !== 'default';
  const isUltra = density === 'ultra';
  const minimal = essentialOnly || isCompact;
  const useDenseGrid = density === 'compact' || density === 'ultra';
  const useUltraDense = density === 'ultra';

  const iconSizeKey = isUltra ? 'sm' : minimal ? 'md' : 'lg';
  const displayName = normalizeDriverName(driver.name);

  const widthClass = essentialOnly
    ? 'w-full'
    : isCompact
      ? getTileWidthClass(density, useDenseGrid, useUltraDense)
      : getTileWidthClass('default', false, false);

  const borderClass = selected
    ? 'border-[var(--neon-purple)]/50 ring-1 ring-[var(--neon-purple)]/20'
    : hasUpdate
      ? 'border-sky-500/35 shadow-[0_0_10px_rgba(14,165,233,0.1)]'
      : 'border-[var(--border)] hover:border-[var(--neon-purple)]/30';

  const inner = (
    <>
      <div className={`flex items-center gap-2 min-w-0 flex-1 ${isUltra ? 'gap-1.5' : ''}`}>
        {hasUpdate && (
          <Crown
            size={isUltra ? 10 : 12}
            className="text-[var(--warning-text)] shrink-0"
            aria-hidden="true"
          />
        )}
        <DriverCategoryIcon driver={driver} size={iconSizeKey} />
        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold text-[var(--foreground)] ${
              essentialOnly
                ? 'text-sm leading-snug'
                : isUltra
                  ? 'text-[10px] truncate leading-none'
                  : minimal
                    ? 'text-xs truncate leading-none'
                    : 'text-sm truncate leading-none mb-1'
            }`}
            title={displayName}
          >
            {displayName}
          </p>
          {!minimal ? (
            <p
              className={`text-[var(--text-subtle)] truncate leading-none ${
                isUltra ? 'text-[8px]' : isCompact ? 'text-[9px]' : 'text-[10px]'
              }`}
              title={driver.provider}
            >
              {driver.provider}
            </p>
          ) : null}
        </div>
      </div>

      <div className={`flex items-center gap-2 shrink-0 ${isUltra ? 'gap-1' : ''}`}>
        {!minimal && hasUpdate && isCompact ? (
          <span
            className={`mono-text font-bold tracking-tight text-sky-600 dark:text-sky-300 ${
              isUltra ? 'text-[10px]' : 'text-xs'
            }`}
          >
            {formatInstalledDriverLabel(driver.latest_version)}
          </span>
        ) : !minimal && !hasUpdate ? (
          <span
            className={`mono-text font-bold text-[var(--neon-purple-text)] ${
              isUltra ? 'text-[10px]' : isCompact ? 'text-xs' : 'text-sm'
            }`}
          >
            {formatInstalledDriverLabel(driver.version)}
          </span>
        ) : null}

        <div
          className={`rounded border border-transparent whitespace-nowrap ${
            isUltra ? 'px-1.5 py-0.5' : 'px-2 py-1'
          }`}
          style={{ backgroundColor: 'transparent' }}
        >
          <span
            className={`font-bold uppercase tracking-wider ${getStatusColorClass(driver.status, hasUpdate)} rounded px-1.5 py-0.5 border ${
              isUltra ? 'text-[7px]' : 'text-[8px]'
            }`}
          >
            {getDriverStatusLabel(driver.status, driver)}
          </span>
        </div>
      </div>
    </>
  );

  const paddingClass = isUltra
    ? 'px-2 py-1 rounded-lg'
    : minimal
      ? 'px-3 py-1.5 rounded-xl'
      : 'p-4 rounded-2xl';

  const layoutClass = minimal
    ? 'flex items-center justify-between gap-2'
    : 'flex flex-col gap-3';

  const className = `${paddingClass} border relative transition-all backdrop-blur-sm ${widthClass} ${borderClass} ${
    selectable ? 'cursor-pointer hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--neon-purple)] focus-visible:outline-none' : 'cursor-default'
  } bg-[var(--surface-inset)]`;

  const ariaLabel = hasUpdate
    ? `${displayName}, version installée, nouveauté disponible`
    : `${displayName}, ${getDriverStatusLabel(driver.status, driver)}`;

  if (selectable) {
    if (instant) {
      return (
        <button
          type="button"
          className={`${className} ${layoutClass} text-left`}
          onClick={onSelect}
          aria-label={ariaLabel}
          aria-pressed={selected}
        >
          {inner}
        </button>
      );
    }

    return (
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.04, stiffness: 100, damping: 20, type: 'spring' }}
        className={`${className} ${layoutClass} text-left`}
        onClick={onSelect}
        aria-label={ariaLabel}
        aria-pressed={selected}
      >
        {inner}
      </motion.button>
    );
  }

  if (instant) {
    return (
      <div className={`${className} ${layoutClass}`} aria-label={ariaLabel}>
        {!minimal && !isCompact && hasUpdate ? (
          <>
            <div className="flex items-start gap-3 w-full">
              <DriverCategoryIcon driver={driver} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{displayName}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{driver.provider}</p>
              </div>
              {hasUpdate && <Crown size={14} className="text-[var(--warning-text)] shrink-0" aria-hidden="true" />}
            </div>
            <DriverVersionCompare
              installed={driver.version}
              latest={driver.latest_version}
              size="compact"
              layout="stack"
              className="w-full"
            />
            <div className={`rounded-full border inline-flex self-start ${getStatusColorClass(driver.status, hasUpdate)} px-2.5 py-1`}>
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {getDriverStatusLabel(driver.status, driver)}
              </span>
            </div>
          </>
        ) : (
          inner
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, stiffness: 100, damping: 20, type: 'spring' }}
      className={`${className} ${layoutClass}`}
      aria-label={ariaLabel}
    >
      {!minimal && !isCompact && hasUpdate ? (
        <>
          <div className="flex items-start gap-3 w-full">
            <DriverCategoryIcon driver={driver} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--foreground)] truncate">{displayName}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{driver.provider}</p>
            </div>
            {hasUpdate && <Crown size={14} className="text-[var(--warning-text)] shrink-0" aria-hidden="true" />}
          </div>
          <DriverVersionCompare
            installed={driver.version}
            latest={driver.latest_version}
            size="compact"
            layout="stack"
            className="w-full"
          />
          <div className={`rounded-full border inline-flex self-start ${getStatusColorClass(driver.status, hasUpdate)} px-2.5 py-1`}>
            <span className="text-[9px] font-bold uppercase tracking-wider">
              {getDriverStatusLabel(driver.status, driver)}
            </span>
          </div>
        </>
      ) : (
        inner
      )}
    </motion.div>
  );
});

export function getDriverTileDensity(
  count: number,
  isExpanded: boolean,
): DriverTileDensity {
  if (isExpanded) {
    if (count >= 9) return 'ultra';
    if (count > 3) return 'compact';
    return 'default';
  }
  if (count >= 9) return 'ultra';
  if (count > 3) return 'compact';
  return 'default';
}
