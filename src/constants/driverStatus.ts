export const DRIVER_STATUS = {
  INSTALLED: 'Installed',
  VERIFY_ONLINE: 'Verify Online',
  UPDATE_AVAILABLE: 'Update Available',
  UNKNOWN: 'Unknown',
} as const;

export type DriverStatus = (typeof DRIVER_STATUS)[keyof typeof DRIVER_STATUS];

export const DRIVER_UPDATE_SOURCE = {
  WINDOWS_UPDATE: 'windows_update',
  DRIVER_STORE: 'driver_store',
} as const;

export type DriverUpdateSource =
  (typeof DRIVER_UPDATE_SOURCE)[keyof typeof DRIVER_UPDATE_SOURCE];
