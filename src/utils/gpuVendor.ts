import type { DriverInfo } from '../types';

export type GpuVendor = 'amd' | 'nvidia' | 'intel';

export interface GpuVendorStyle {
  vendor: GpuVendor;
  label: string;
  shortLabel: string;
  containerClass: string;
  textClass: string;
}

/** Détecte le constructeur GPU depuis le nom ou le fournisseur WMI. */
export function detectGpuVendor(name: string, provider: string): GpuVendor | null {
  const hay = `${name} ${provider}`.toLowerCase();

  if (/\bnvidia\b|geforce|quadro|\brtx\b|\bgtx\b/.test(hay)) {
    return 'nvidia';
  }
  if (/\bamd\b|radeon|advanced micro devices/.test(hay)) {
    return 'amd';
  }
  if (/\bintel\b/.test(hay)) {
    return 'intel';
  }

  return null;
}

export function detectGpuVendorFromDriver(driver: DriverInfo): GpuVendor | null {
  if (driver.category !== 'Graphics') return null;
  return detectGpuVendor(driver.name, driver.provider);
}

export function getGpuVendorStyle(vendor: GpuVendor): GpuVendorStyle {
  switch (vendor) {
    case 'amd':
      return {
        vendor: 'amd',
        label: 'AMD',
        shortLabel: 'AMD',
        containerClass: 'bg-[#ed1c24]/12 border-[#ed1c24]/40',
        textClass: 'text-[#e8323c] dark:text-[#ff5c5c]',
      };
    case 'nvidia':
      return {
        vendor: 'nvidia',
        label: 'NVIDIA',
        shortLabel: 'NV',
        containerClass: 'bg-[#76b900]/12 border-[#76b900]/40',
        textClass: 'text-[#5a9200] dark:text-[#9ad926]',
      };
    case 'intel':
      return {
        vendor: 'intel',
        label: 'Intel',
        shortLabel: 'IN',
        containerClass: 'bg-[#0071c5]/12 border-[#0071c5]/40',
        textClass: 'text-[#0068b5] dark:text-[#4da3e8]',
      };
  }
}
