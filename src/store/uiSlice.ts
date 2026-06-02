import { StateCreator } from 'zustand';
import { AppState, StatusToastState, StatusToastType, PushStatusToastOptions } from './types';
import { ActivityProfile } from '../types';
import { NotificationLogEntry, createNotificationEntry, prependNotificationLog, shouldSkipNotificationLog } from '../utils/notificationLog';

export interface UiSlice {
  zenMode: boolean;
  activityProfile: ActivityProfile;
  statusToast: StatusToastState | null;
  notificationLog: NotificationLogEntry[];
  notificationPanelOpen: boolean;
  easterMusicActive: boolean;
  zenTrackerResetSeq: number;
  setZenMode: (zen: boolean) => void;
  setActivityProfile: (profile: ActivityProfile) => void;
  pushStatusToast: (
    message: string,
    type?: StatusToastType,
    options?: PushStatusToastOptions,
  ) => void;
  clearStatusToast: () => void;
  setNotificationPanelOpen: (open: boolean) => void;
  setEasterMusicActive: (active: boolean) => void;
  bumpZenTrackerReset: () => void;
  markNotificationsRead: () => void;
  clearNotificationLog: () => void;
}

export const createUiSlice: StateCreator<
  AppState,
  [],
  [],
  UiSlice
> = (set) => ({
  zenMode: typeof localStorage !== 'undefined' ? localStorage.getItem('koi_zenMode') === 'true' : false,
  activityProfile: 'desktop',
  statusToast: null,
  notificationLog: [],
  notificationPanelOpen: false,
  easterMusicActive: false,
  zenTrackerResetSeq: 0,

  setZenMode: (zenMode) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('koi_zenMode', String(zenMode));
    }
    set({ zenMode });
  },

  setActivityProfile: (activityProfile) => set({ activityProfile }),

  pushStatusToast: (message, type = 'warning', options) =>
    set((state) => {
      const source = options?.source ?? 'system';
      const now = Date.now();
      const isDuplicate = shouldSkipNotificationLog(state.notificationLog, message, now);
      let notificationLog = state.notificationLog;

      if (!options?.skipLog && !isDuplicate) {
        notificationLog = prependNotificationLog(
          notificationLog,
          createNotificationEntry(message, type, source, now),
        );
      }

      if (isDuplicate) {
        return { notificationLog };
      }

      return {
        statusToast: { message, type, source },
        notificationLog,
      };
    }),

  clearStatusToast: () => set({ statusToast: null }),

  setNotificationPanelOpen: (notificationPanelOpen) => set({ notificationPanelOpen }),

  setEasterMusicActive: (easterMusicActive) => set({ easterMusicActive }),

  bumpZenTrackerReset: () =>
    set((state) => ({ zenTrackerResetSeq: state.zenTrackerResetSeq + 1 })),

  markNotificationsRead: () =>
    set((state) => ({
      notificationLog: state.notificationLog.map((entry) =>
        entry.read ? entry : { ...entry, read: true },
      ),
    })),

  clearNotificationLog: () => set({ notificationLog: [] }),
});
