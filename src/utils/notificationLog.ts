import type { StatusToastType } from '../store';
import type { LanguageMode } from '../types';
import type { TranslateFn } from './translations';

export type NotificationSource = 'alert' | 'system';

export interface NotificationLogEntry {
  id: string;
  message: string;
  type: StatusToastType;
  source: NotificationSource;
  createdAt: number;
  read: boolean;
}

export const NOTIFICATION_LOG_MAX = 24;
const DEDUP_MS = 60_000;

export function createNotificationEntry(
  message: string,
  type: StatusToastType,
  source: NotificationSource,
  now = Date.now(),
): NotificationLogEntry {
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    type,
    source,
    createdAt: now,
    read: false,
  };
}

export function shouldSkipNotificationLog(
  log: NotificationLogEntry[],
  message: string,
  now = Date.now(),
): boolean {
  return log.some(
    (entry) => entry.message === message && now - entry.createdAt < DEDUP_MS,
  );
}

export function prependNotificationLog(
  log: NotificationLogEntry[],
  entry: NotificationLogEntry,
): NotificationLogEntry[] {
  return [entry, ...log].slice(0, NOTIFICATION_LOG_MAX);
}

export function formatNotificationTime(
  timestamp: number,
  t: TranslateFn,
  language: LanguageMode,
  now = Date.now(),
): string {
  const deltaSec = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (deltaSec < 10) return t('time_just_now');
  if (deltaSec < 60) return t('time_seconds_ago', { seconds: deltaSec });
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return t('time_minutes_ago', { minutes: deltaMin });
  const deltaHour = Math.floor(deltaMin / 60);
  if (deltaHour < 24) return t('time_hours_ago', { hours: deltaHour });
  return new Date(timestamp).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function selectUnreadNotificationCount(log: NotificationLogEntry[]): number {
  return log.filter((entry) => !entry.read).length;
}

export function selectUnreadAlertCount(log: NotificationLogEntry[]): number {
  return log.filter((entry) => !entry.read && entry.source === 'alert').length;
}
