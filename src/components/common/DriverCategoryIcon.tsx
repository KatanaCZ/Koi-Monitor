import { memo } from 'react';
import {
  HardDrive,
  Monitor,
  Wifi,
  Volume2,
  Bluetooth,
  Cpu,
  Box,
} from 'lucide-react';
import type { DriverInfo } from '../../types';
import {
  detectGpuVendorFromDriver,
  getGpuVendorStyle,
} from '../../utils/gpuVendor';

export type DriverCategoryIconSize = 'sm' | 'md' | 'lg';

const SIZE_CONFIG: Record<
  DriverCategoryIconSize,
  { dim: string; lucide: number; label: string }
> = {
  sm: { dim: 'w-7 h-7', lucide: 14, label: 'text-[8px]' },
  md: { dim: 'w-8 h-8', lucide: 16, label: 'text-[9px]' },
  lg: { dim: 'w-10 h-10', lucide: 20, label: 'text-[10px]' },
};

function getCategoryLucideIcon(category: string, size: number) {
  switch (category) {
    case 'Graphics':
      return <Monitor size={size} className="text-blue-500" />;
    case 'Network':
      return <Wifi size={size} className="text-emerald-500" />;
    case 'Storage':
      return <HardDrive size={size} className="text-amber-500" />;
    case 'Audio':
      return <Volume2 size={size} className="text-purple-500" />;
    case 'Bluetooth':
      return <Bluetooth size={size} className="text-cyan-500" />;
    case 'Firmware':
      return <Cpu size={size} className="text-[var(--text-muted)]" />;
    default:
      return <Box size={size} className="text-[var(--text-subtle)]" />;
  }
}

interface DriverCategoryIconProps {
  driver: DriverInfo;
  size: DriverCategoryIconSize;
}

export const DriverCategoryIcon = memo(function DriverCategoryIcon({
  driver,
  size,
}: DriverCategoryIconProps) {
  const config = SIZE_CONFIG[size];
  const vendor = detectGpuVendorFromDriver(driver);

  if (vendor) {
    const style = getGpuVendorStyle(vendor);
    const text = style.shortLabel;

    return (
      <div
        className={`rounded-lg border flex items-center justify-center shrink-0 ${config.dim} ${style.containerClass}`}
        aria-label={style.label}
        title={style.label}
      >
        <span
          className={`font-bold uppercase tracking-tighter mono-text leading-none ${config.label} ${style.textClass}`}
        >
          {text}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center shrink-0 ${config.dim}`}
    >
      {getCategoryLucideIcon(driver.category, config.lucide)}
    </div>
  );
});
