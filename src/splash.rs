//! Opening sequence: title intro, then hardware / connection / drivers / ready.
//!
//! Port of the phase logic of `SplashScreen.tsx`. Each phase lasts at least long enough
//! to be read, waits for the backend it stands for, and the bar never moves backwards.

use std::time::{Duration, Instant};

/// Title intro before the steps appear.
pub const INTRO: Duration = Duration::from_millis(1800);
/// The splash gives up waiting after this long (a driver scan can hang).
const SAFETY_TIMEOUT: Duration = Duration::from_secs(90);
/// Pause on a step's "done" message before moving on.
const STEP_DONE_DWELL: Duration = Duration::from_millis(650);
/// Pause on "everything is ready" before the dashboard appears.
const READ_PAUSE: Duration = Duration::from_millis(950);

/// What the backend has delivered so far.
#[derive(Debug, Clone, Copy, Default)]
pub struct Flags {
    pub system: bool,
    pub dns: bool,
    pub drivers: bool,
    pub dashboard: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Step {
    Pending,
    Active,
    Done,
}

#[derive(Debug, Clone)]
pub struct Splash {
    /// 0 = intro, 1 = hardware, 2 = connection, 3 = drivers, 4 = ready.
    phase: u8,
    pub started: Instant,
    phase_started: Instant,
    /// When the backend of the current phase was first seen ready.
    ready_since: Option<Instant>,
    pub percent: f32,
    /// Set once everything is ready: the moment the splash closes.
    closes_at: Option<Instant>,
}

fn min_duration(phase: u8) -> Duration {
    match phase {
        0 => INTRO,
        1 => Duration::from_millis(1300),
        2 => Duration::from_millis(1550),
        3 => Duration::from_millis(1300),
        _ => Duration::from_millis(1900),
    }
}

/// Progress range covered by each phase.
fn progress_range(phase: u8) -> (f32, f32) {
    match phase {
        0 => (0.0, 10.0),
        1 => (10.0, 32.0),
        2 => (33.0, 64.0),
        3 => (66.0, 94.0),
        _ => (95.0, 100.0),
    }
}

fn ease_out_quad(t: f32) -> f32 {
    1.0 - (1.0 - t).powi(2)
}

impl Splash {
    pub fn new(now: Instant) -> Self {
        Self { phase: 0, started: now, phase_started: now, ready_since: None, percent: 0.0, closes_at: None }
    }

    fn backend_ready(&self, flags: Flags) -> bool {
        match self.phase {
            0 => true,
            1 => flags.system,
            2 => flags.dns,
            3 => flags.drivers,
            _ => flags.dashboard,
        }
    }

    /// Where the bar is heading in the current phase.
    fn target_percent(&self, flags: Flags, now: Instant) -> f32 {
        let in_phase = now.duration_since(self.phase_started).as_secs_f32();
        let min = min_duration(self.phase).as_secs_f32();
        let (floor, ceiling) = progress_range(self.phase);

        match self.phase {
            0 => floor + (ceiling - floor) * ease_out_quad((in_phase / min).min(1.0)),
            1..=3 if self.backend_ready(flags) => ceiling,
            // Still waiting: creep towards the ceiling without ever reaching it.
            1..=3 => floor + (ceiling - floor - 3.0) * (1.0 - (-in_phase / (min * 0.95).max(1.0)).exp()),
            _ if !flags.dashboard => floor + (ceiling - floor - 3.0) * (1.0 - (-in_phase / (min * 0.85).max(1.4)).exp()),
            _ => floor + (ceiling - floor) * ease_out_quad((in_phase / 0.75).min(1.0)),
        }
    }

    /// Advances the sequence. Returns `true` once the splash should close.
    pub fn tick(&mut self, flags: Flags, now: Instant) -> bool {
        if now.duration_since(self.started) >= SAFETY_TIMEOUT {
            self.percent = 100.0;
            return true;
        }

        let ready = self.backend_ready(flags);
        if ready && self.phase >= 1 && self.ready_since.is_none() {
            self.ready_since = Some(now);
        }

        let dwelled = self.phase == 0 || self.ready_since.is_some_and(|since| now.duration_since(since) >= STEP_DONE_DWELL);
        let in_phase = now.duration_since(self.phase_started);
        if self.phase < 4 && ready && dwelled && in_phase >= min_duration(self.phase) {
            self.phase += 1;
            self.phase_started = now;
            self.ready_since = None;
        }

        // Ease towards the target, faster once the step's backend has answered.
        let target = self.target_percent(flags, now);
        let factor = if (1..=3).contains(&self.phase) && self.backend_ready(flags) { 0.18 } else { 0.11 };
        let next = if (target - self.percent).abs() < 0.15 { target } else { self.percent + (target - self.percent) * factor };
        self.percent = next.max(self.percent).min(100.0);

        if self.phase == 4 && flags.dashboard && self.percent >= 99.5 {
            let in_phase = now.duration_since(self.phase_started);
            let remaining = min_duration(4).saturating_sub(in_phase);
            let closes_at = *self.closes_at.get_or_insert(now + remaining + READ_PAUSE);
            return now >= closes_at;
        }
        false
    }

    pub fn step(&self, index: u8, flags: Flags) -> Step {
        let step_phase = index + 1;
        let ready = match index {
            0 => flags.system,
            1 => flags.dns,
            _ => flags.drivers,
        };
        if self.phase > step_phase || (self.phase == step_phase && ready) {
            Step::Done
        } else if self.phase == step_phase {
            Step::Active
        } else {
            Step::Pending
        }
    }

    /// Translation key of the status line under the steps.
    pub fn message_key(&self, flags: Flags) -> &'static str {
        match (self.phase, self.backend_ready(flags)) {
            (0, _) => "splash_init",
            (1, false) => "splash_status_system_loading",
            (1, true) => "splash_status_system_done",
            (2, false) => "splash_status_dns_loading",
            (2, true) => "splash_status_dns_done",
            (3, false) => "splash_status_drivers_loading",
            (3, true) => "splash_status_drivers_done",
            (_, false) => "splash_dashboard_loading",
            (_, true) => "splash_dashboard_done",
        }
    }

    /// The steps and the bar appear once the title intro has played.
    pub fn intro_done(&self, now: Instant) -> bool {
        now.duration_since(self.started) >= INTRO
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TICK: Duration = Duration::from_millis(33);
    const ALL_READY: Flags = Flags { system: true, dns: true, drivers: true, dashboard: true };

    /// Ticks until the splash closes or `limit` elapses; returns the elapsed time.
    fn run(splash: &mut Splash, flags: Flags, start: Instant, from: Duration, limit: Duration) -> (Duration, bool) {
        let mut elapsed = from;
        while elapsed < limit {
            if splash.tick(flags, start + elapsed) {
                return (elapsed, true);
            }
            elapsed += TICK;
        }
        (elapsed, false)
    }

    #[test]
    fn a_ready_backend_still_gets_a_readable_sequence() {
        let start = Instant::now();
        let mut splash = Splash::new(start);
        let (elapsed, closed) = run(&mut splash, ALL_READY, start, Duration::ZERO, Duration::from_secs(30));

        assert!(closed);
        // Intro + three steps + ready, each with its minimum time: about 8 to 10 s.
        assert!(elapsed > Duration::from_secs(7) && elapsed < Duration::from_secs(12), "closed after {elapsed:?}");
        assert_eq!(splash.percent, 100.0);
    }

    #[test]
    fn waits_for_the_driver_scan_and_never_goes_backwards() {
        let start = Instant::now();
        let mut splash = Splash::new(start);
        let waiting = Flags { system: true, dns: true, drivers: false, dashboard: true };

        let mut previous = 0.0;
        let mut elapsed = Duration::ZERO;
        while elapsed < Duration::from_secs(20) {
            assert!(!splash.tick(waiting, start + elapsed));
            assert!(splash.percent >= previous);
            previous = splash.percent;
            elapsed += TICK;
        }
        assert_eq!(splash.step(1, waiting), Step::Done);
        assert_eq!(splash.step(2, waiting), Step::Active);
        assert!(splash.percent < 94.0);
        assert_eq!(splash.message_key(waiting), "splash_status_drivers_loading");

        let (_, closed) = run(&mut splash, ALL_READY, start, elapsed, Duration::from_secs(40));
        assert!(closed);
    }

    #[test]
    fn gives_up_after_the_safety_timeout() {
        let start = Instant::now();
        let mut splash = Splash::new(start);
        assert!(!splash.tick(Flags::default(), start + Duration::from_secs(89)));
        assert!(splash.tick(Flags::default(), start + Duration::from_secs(91)));
    }
}
