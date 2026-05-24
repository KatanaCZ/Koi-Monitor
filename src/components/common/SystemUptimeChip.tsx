import { memo } from 'react';
import { Clock } from 'lucide-react';
import { useAppStore } from '../../store';
import { formatUptimeShort, useLiveUptime } from '../../hooks/useLiveUptime';
import { getNeonTextShadow } from '../../utils/neonEffects';

/** Uptime système — dashboard TitleBar (mode Zen = ZenMetricsDock). */
export const SystemUptimeChip = memo(function SystemUptimeChip() {
  const theme = useAppStore((s) => s.theme);
  const isDark = theme === 'dark';
  const liveUptime = useLiveUptime();
  const label = formatUptimeShort(liveUptime);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Système actif depuis ${label}`}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] shrink-0 max-w-full min-w-0"
    >
      <Clock
        size={14}
        className="shrink-0"
        style={{ color: 'var(--neon-green)' }}
        aria-hidden="true"
      />
      <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)] shrink-0">
        Actif
      </span>
      <span
        className="text-xs font-bold mono-text tabular-nums truncate"
        style={{
          color: 'var(--neon-green-text)',
          textShadow: getNeonTextShadow('var(--neon-green)', isDark),
        }}
      >
        {label}
      </span>
    </div>
  );
});
