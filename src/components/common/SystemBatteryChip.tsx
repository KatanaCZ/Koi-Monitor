import { memo } from 'react';
import { Battery, BatteryCharging, BatteryLow } from 'lucide-react';
import { useAppStore } from '../../store';
import { getNeonTextShadow } from '../../utils/neonEffects';
import { useTranslation } from '../../hooks/useTranslation';

/** Moniteur de batterie — dashboard TitleBar (uniquement si présent). */
export const SystemBatteryChip = memo(function SystemBatteryChip() {
  const theme = useAppStore((s) => s.theme);
  const isDark = theme === 'dark';
  const battery = useAppStore((s) => s.systemInfo?.battery);
  const { t } = useTranslation();

  if (!battery) return null;

  const { percentage, is_charging } = battery;
  const isLow = percentage <= 20;
  const isFull = percentage === 100;

  const chargingText = is_charging ? t('battery_charging') : t('battery_discharging');
  const ariaLabel = t('battery_aria', { percentage, charging: chargingText });

  let iconColor = 'var(--text-muted)';
  let textColor = 'var(--foreground)';
  let textShadow = undefined;
  let BatteryIcon = Battery;
  let iconClass = 'shrink-0';

  if (is_charging) {
    iconColor = 'var(--neon-green)';
    textColor = 'var(--neon-green-text)';
    textShadow = getNeonTextShadow('var(--neon-green)', isDark);
    BatteryIcon = BatteryCharging;
    iconClass += ' animate-pulse';
  } else if (isLow) {
    iconColor = 'var(--error)';
    textColor = 'var(--error-text)';
    textShadow = getNeonTextShadow('var(--error)', isDark);
    BatteryIcon = BatteryLow;
    iconClass += ' animate-pulse';
  } else if (isFull) {
    iconColor = 'var(--neon-green)';
    textColor = 'var(--neon-green-text)';
    textShadow = getNeonTextShadow('var(--neon-green)', isDark);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] shrink-0 max-w-full min-w-0"
    >
      <BatteryIcon
        size={14}
        className={iconClass}
        style={{ color: iconColor }}
        aria-hidden="true"
      />
      <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-subtle)] shrink-0">
        {t('battery_label')}
      </span>
      <span
        className="text-xs font-bold mono-text tabular-nums truncate transition-colors duration-300"
        style={{
          color: textColor,
          textShadow,
        }}
      >
        {percentage}%
      </span>
    </div>
  );
});
