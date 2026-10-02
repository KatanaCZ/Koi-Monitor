//! Status toast and the session's notification log (the bell in the title bar).

use std::time::{Duration, Instant};

use crate::alerts::Severity;
use crate::i18n::Tr;

/// Entries kept for the session.
const LOG_MAX: usize = 24;
/// The same message is not repeated within this window.
const DEDUP: Duration = Duration::from_secs(60);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Source {
    /// Koi watch (threshold alerts).
    Alert,
    System,
}

#[derive(Debug, Clone)]
pub struct Entry {
    pub message: String,
    pub severity: Severity,
    pub source: Source,
    pub created: Instant,
    pub read: bool,
}

#[derive(Debug, Clone)]
pub struct Toast {
    pub message: String,
    pub severity: Severity,
    pub source: Source,
}

#[derive(Debug, Default)]
pub struct Center {
    pub log: Vec<Entry>,
    pub toast: Option<Toast>,
    /// Bumped with each toast, so a stale dismissal timer does not close a newer one.
    seq: u32,
}

impl Center {
    /// Shows a toast and records it. Returns the toast's sequence number and how long
    /// it stays up, or `None` when the message was a recent duplicate.
    pub fn push(&mut self, message: String, severity: Severity, source: Source, log: bool, now: Instant) -> Option<(u32, Duration)> {
        let duplicate = self.log.iter().any(|entry| entry.message == message && now.duration_since(entry.created) < DEDUP);
        if duplicate {
            return None;
        }

        if log {
            self.log.insert(0, Entry { message: message.clone(), severity, source, created: now, read: false });
            self.log.truncate(LOG_MAX);
        }

        self.seq = self.seq.wrapping_add(1);
        self.toast = Some(Toast { message, severity, source });
        let duration = if severity == Severity::Warning { Duration::from_millis(5500) } else { Duration::from_secs(3) };
        Some((self.seq, duration))
    }

    /// Dismisses the toast `seq` was scheduled for, if it is still the one showing.
    pub fn expire(&mut self, seq: u32) {
        if seq == self.seq {
            self.toast = None;
        }
    }

    pub fn unread_alerts(&self) -> usize {
        self.log.iter().filter(|entry| !entry.read && entry.source == Source::Alert).count()
    }

    pub fn mark_read(&mut self) {
        for entry in &mut self.log {
            entry.read = true;
        }
    }

    pub fn clear(&mut self) {
        self.log.clear();
    }
}

/// "Just now", "12s ago", "3m ago", "2h ago".
pub fn relative_time(created: Instant, now: Instant, tr: Tr) -> String {
    let seconds = now.duration_since(created).as_secs();
    if seconds < 10 {
        tr.t("time_just_now").to_string()
    } else if seconds < 60 {
        tr.tf("time_seconds_ago", &[("seconds", &seconds)])
    } else if seconds < 3600 {
        tr.tf("time_minutes_ago", &[("minutes", &(seconds / 60))])
    } else {
        tr.tf("time_hours_ago", &[("hours", &(seconds / 3600))])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn duplicate_messages_are_dropped_for_a_minute() {
        let mut center = Center::default();
        let start = Instant::now();

        assert!(center.push("ping".into(), Severity::Warning, Source::Alert, true, start).is_some());
        assert!(center.push("ping".into(), Severity::Warning, Source::Alert, true, start + Duration::from_secs(30)).is_none());
        assert!(center.push("ping".into(), Severity::Warning, Source::Alert, true, start + Duration::from_secs(61)).is_some());
        assert_eq!(center.log.len(), 2);
        assert_eq!(center.unread_alerts(), 2);

        center.mark_read();
        assert_eq!(center.unread_alerts(), 0);
    }

    #[test]
    fn stale_timer_does_not_dismiss_a_newer_toast() {
        let mut center = Center::default();
        let now = Instant::now();
        let (first, _) = center.push("a".into(), Severity::Success, Source::System, false, now).unwrap();
        let (second, _) = center.push("b".into(), Severity::Success, Source::System, false, now).unwrap();

        center.expire(first);
        assert!(center.toast.is_some());
        center.expire(second);
        assert!(center.toast.is_none());
    }
}
