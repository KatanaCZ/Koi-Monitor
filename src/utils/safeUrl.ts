const ALLOWED_DONATION_URL_HOSTS = new Set(['ko-fi.com', 'www.ko-fi.com']);

const ALLOWED_DRIVER_URL_HOSTS = new Set([
  'www.nvidia.com',
  'www.amd.com',
  'www.intel.com',
  'www.realtek.com',
  'www.broadcom.com',
  'www.qualcomm.com',
  'www.mediatek.com',
  'semiconductor.samsung.com',
  'www.catalog.update.microsoft.com',
  'www.google.com',
]);

/** Only open HTTPS links to Ko-fi (donation page). */
export function isSafeDonationUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      ALLOWED_DONATION_URL_HOSTS.has(parsed.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

/** Only open HTTPS links to known vendor / search hosts (blocks file:, javascript:, etc.). */
export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      ALLOWED_DRIVER_URL_HOSTS.has(parsed.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}
