import React, { memo } from 'react';
import { ArrowDown } from 'lucide-react';
import type { DriverInfo } from '../../types';
import {
  formatInstalledDriverLabel,
  formatDriverVersion,
  getEssentialDriverSummary,
  getVersionDiffIndexes,
  hasDriverUpdate,
  parseVersionDisplaySegments,
} from '../../utils/driverFormat';

interface VersionHighlightProps {
  version: string;
  diffIndexes: Set<number>;
  emphasis?: 'installed' | 'available';
  size?: 'compact' | 'default';
}

const VersionHighlight = memo(function VersionHighlight({
  version,
  diffIndexes,
  emphasis = 'installed',
  size = 'default',
}: VersionHighlightProps) {
  const segments = parseVersionDisplaySegments(version);
  const textSize = size === 'compact' ? 'text-[10px]' : 'text-sm';

  if (segments.length === 0) {
    return (
      <span className={`mono-text ${textSize} text-[var(--text-muted)]`}>
        Non détectée
      </span>
    );
  }

  const baseTone =
    emphasis === 'available'
      ? 'text-sky-600 dark:text-sky-300'
      : 'text-[var(--neon-purple-text)]';

  const diffTone =
    emphasis === 'available'
      ? 'text-sky-700 dark:text-sky-200 font-bold bg-sky-500/20 ring-1 ring-sky-500/35'
      : 'text-[var(--neon-purple-text)] font-bold bg-[color-mix(in_srgb,var(--neon-purple)_18%,transparent)] ring-1 ring-[var(--neon-purple)]/35';

  return (
    <span className={`mono-text tabular-nums ${textSize} ${baseTone} ${emphasis === 'installed' ? 'font-bold' : 'font-semibold'}`}>
      v
      {segments.map((segment, index) => (
        <React.Fragment key={`${segment}-${index}`}>
          {index > 0 ? (
            <span className={emphasis === 'available' ? 'opacity-70' : 'opacity-50'}>
              .
            </span>
          ) : null}
          <span
            className={
              diffIndexes.has(index)
                ? `${diffTone} rounded px-0.5`
                : emphasis === 'available'
                  ? 'font-bold'
                  : undefined
            }
          >
            {segment}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
});

interface DriverVersionCompareProps {
  installed: string;
  latest: string;
  size?: 'compact' | 'default';
  layout?: 'stack' | 'inline';
  className?: string;
}

export const DriverVersionCompare = memo(function DriverVersionCompare({
  installed,
  latest,
  size = 'default',
  layout = 'stack',
  className = '',
}: DriverVersionCompareProps) {
  const diffIndexes = getVersionDiffIndexes(installed, latest);
  const labelClass =
    size === 'compact'
      ? 'text-[8px] tracking-[0.14em]'
      : 'text-[10px] tracking-widest';
  const gapClass = size === 'compact' ? 'gap-1.5' : 'gap-2';
  const padClass = size === 'compact' ? 'px-2 py-1' : 'px-3 py-2';

  const installedBlock = (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/70 ${padClass} min-w-0`}
    >
      <p
        className={`${labelClass} uppercase font-bold text-[var(--text-subtle)] mb-1`}
      >
        Installée
      </p>
      <VersionHighlight
        version={installed}
        diffIndexes={diffIndexes}
        emphasis="installed"
        size={size}
      />
    </div>
  );

  const availableBlock = (
    <div
      className={`rounded-xl border border-sky-500/35 bg-sky-500/10 ${padClass} min-w-0 shadow-[0_0_16px_rgba(14,165,233,0.12)]`}
    >
      <p
        className={`${labelClass} uppercase font-bold text-sky-600 dark:text-sky-400 mb-1`}
      >
        Disponible
      </p>
      <VersionHighlight
        version={latest}
        diffIndexes={diffIndexes}
        emphasis="available"
        size={size}
      />
    </div>
  );

  if (layout === 'inline') {
    return (
      <div
        className={`flex flex-wrap items-center justify-end gap-2 min-w-0 ${className}`}
        title={`Installée ${formatDriverVersion(installed)} · Disponible ${formatDriverVersion(latest)}`}
      >
        {installedBlock}
        <span className="text-[var(--text-subtle)] text-xs shrink-0" aria-hidden="true">
          →
        </span>
        {availableBlock}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-stretch ${gapClass} min-w-0 ${className}`}
      title={`Installée ${formatDriverVersion(installed)} · Disponible ${formatDriverVersion(latest)}`}
    >
      {installedBlock}
      <div
        className="flex items-center justify-center text-sky-500/80 shrink-0"
        aria-hidden="true"
      >
        <ArrowDown size={size === 'compact' ? 12 : 14} strokeWidth={2.5} />
      </div>
      {availableBlock}
    </div>
  );
});

interface EssentialVersionsSummaryProps {
  drivers: DriverInfo[];
  compact?: boolean;
}

export const EssentialVersionsSummary = memo(function EssentialVersionsSummary({
  drivers,
  compact = false,
}: EssentialVersionsSummaryProps) {
  const rows = getEssentialDriverSummary(drivers);

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 shrink-0 gap-4"
      role="region"
      aria-label="Versions de pilotes essentiels installées"
    >
      {rows.map(({ category, label, driver }) => (
        <div
          key={category}
          className={`rounded-2xl border bg-[var(--surface-inset)] p-3 sm:p-4 flex flex-col gap-2 min-w-0 ${
            driver && hasDriverUpdate(driver)
              ? 'border-sky-500/30 ring-1 ring-sky-500/15'
              : 'border-[var(--border)]'
          }`}
        >
          <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)]">
            {label}
          </p>
          <p
            className={`font-medium text-[var(--foreground)] truncate leading-snug ${
              compact ? 'text-[10px]' : 'text-xs'
            }`}
            title={driver?.name}
          >
            {driver?.name ? driver.name : 'Non détecté'}
          </p>
          {driver && hasDriverUpdate(driver) ? (
            <DriverVersionCompare
              installed={driver.version}
              latest={driver.latest_version}
              size={compact ? 'compact' : 'default'}
              layout="stack"
            />
          ) : (
            <p
              className={`mono-text font-bold text-[var(--neon-purple-text)] ${
                compact ? 'text-xs' : 'text-sm'
              }`}
            >
              {driver ? formatInstalledDriverLabel(driver.version) : 'Non détectée'}
            </p>
          )}
          {driver?.date && driver.date !== 'N/A' ? (
            <p className="text-[9px] text-[var(--text-muted)]">{driver.date}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
});
