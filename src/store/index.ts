import { create } from 'zustand';
import { AppState } from './types';
import { createSettingsSlice } from './settingsSlice';
import { createTelemetrySlice } from './telemetrySlice';
import { createUiSlice } from './uiSlice';

export type { AppState, StatusToastState, StatusToastType, PushStatusToastOptions } from './types';
export type { HistoryPoint } from './historyRing';
export type { NotificationLogEntry, NotificationSource } from '../utils/notificationLog';

export const useAppStore = create<AppState>((...a) => ({
  ...createSettingsSlice(...a),
  ...createTelemetrySlice(...a),
  ...createUiSlice(...a),
}));
