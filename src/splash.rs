//! Opening sequence: the title intro, a short wait for the first data when it is
//! not there yet, then the hand-over to the dashboard.
//!
//! This module only keeps time; `ui::splash` draws it.

use std::time::{Duration, Instant};

/// The title intro: letters, blade, cut, rejoin, underline.
pub const INTRO: Duration = Duration::from_millis(3000);
/// The wordmark travels to the title bar while the dashboard comes in.
pub const OUTRO: Duration = Duration::from_millis(1100);
/// With calm motion the title only fades in, then hands over.
const CALM_INTRO: Duration = Duration::from_millis(900);
const CALM_OUTRO: Duration = Duration::from_millis(450);
/// Past the intro, the progress line appears only if the data still takes this long.
pub const LINE_DELAY: Duration = Duration::from_millis(250);
/// Longest wait for the first data once the intro has played.
const WAIT_CAP: Duration = Duration::from_secs(8);

/// What the backend has delivered so far. The driver scan is not waited for:
/// its card shows its own progress.
#[derive(Debug, Clone, Copy, Default)]
pub struct Flags {
    pub system: bool,
    pub dns: bool,
}

impl Flags {
    pub fn ready(self) -> bool {
        self.system && self.dns
    }
}

#[derive(Debug, Clone)]
pub struct Splash {
    started: Instant,
    outro_started: Option<Instant>,
    last_tick: Instant,
    /// Progress of the wait, 0 to 100; it never moves backwards.
    pub percent: f32,
    /// The progress line has been on screen, so it gets to finish before the hand-over.
    line_shown: bool,
    calm: bool,
    /// A dev session can hold the sequence at one instant.
    frozen: Option<Instant>,
}

impl Splash {
    pub fn new(now: Instant, calm: bool) -> Self {
        Self { started: now, outro_started: None, last_tick: now, percent: 0.0, line_shown: false, calm, frozen: None }
    }

    /// The sequence held `seconds` after its start, for screenshots.
    pub fn frozen_at(now: Instant, seconds: f32, calm: bool) -> Self {
        let mut splash = Self::new(now, calm);
        let at = now + Duration::from_secs_f32(seconds.max(0.0));
        if at >= now + splash.intro() {
            splash.outro_started = Some(now + splash.intro());
            splash.percent = 100.0;
        }
        splash.frozen = Some(at);
        splash
    }

    fn clock(&self, now: Instant) -> Instant {
        self.frozen.unwrap_or(now)
    }

    pub fn calm(&self) -> bool {
        self.calm
    }

    /// False for a sequence held at one instant.
    pub fn live(&self) -> bool {
        self.frozen.is_none()
    }

    fn intro(&self) -> Duration {
        if self.calm { CALM_INTRO } else { INTRO }
    }

    fn outro_duration(&self) -> Duration {
        if self.calm { CALM_OUTRO } else { OUTRO }
    }

    /// Seconds since the splash opened.
    pub fn time(&self, now: Instant) -> f32 {
        self.clock(now).duration_since(self.started).as_secs_f32()
    }

    /// Seconds spent waiting for data past the intro; `None` during the intro and the outro.
    pub fn waiting(&self, now: Instant) -> Option<f32> {
        if self.outro_started.is_some() {
            return None;
        }
        self.clock(now).checked_duration_since(self.started + self.intro()).map(|waited| waited.as_secs_f32())
    }

    /// Whether the progress line was drawn at some point.
    pub fn line_shown(&self) -> bool {
        self.line_shown
    }

    /// Progress of the hand-over to the dashboard, 0 to 1; `None` before it starts.
    pub fn outro(&self, now: Instant) -> Option<f32> {
        let started = self.outro_started?;
        let elapsed = self.clock(now).saturating_duration_since(started).as_secs_f32();
        Some((elapsed / self.outro_duration().as_secs_f32()).clamp(0.0, 1.0))
    }

    /// Advances the sequence. Returns `true` once the splash is over.
    pub fn tick(&mut self, flags: Flags, now: Instant) -> bool {
        if self.frozen.is_some() {
            return false;
        }
        let step = now.saturating_duration_since(self.last_tick).as_secs_f32().min(0.1);
        self.last_tick = now;
        let waited = now.checked_duration_since(self.started + self.intro());

        // Ease towards a target that depends on what has answered; time-based, so the
        // pace is the same at 60 Hz and at 165 Hz.
        let seconds = waited.map(|waited| waited.as_secs_f32()).unwrap_or(0.0);
        let target = match (flags.system, flags.dns) {
            (true, true) => 100.0,
            (true, false) => 55.0 + 35.0 * (1.0 - (-seconds / 2.5).exp()),
            (false, _) => 45.0 * (1.0 - (-seconds / 2.0).exp()),
        };
        let eased = self.percent + (target - self.percent) * (1.0 - (-step * 9.0).exp());
        self.percent = if target - eased < 0.2 { target } else { eased }.max(self.percent).min(100.0);

        let Some(outro_started) = self.outro_started else {
            if let Some(waited) = waited {
                if waited >= LINE_DELAY && !flags.ready() {
                    self.line_shown = true;
                }
                let line_done = !self.line_shown || self.percent >= 99.5;
                if (flags.ready() && line_done) || waited >= WAIT_CAP {
                    self.outro_started = Some(now);
                }
            }
            return false;
        };
        now.saturating_duration_since(outro_started) >= self.outro_duration()
    }

    /// Translation key of the status line shown while waiting.
    pub fn message_key(&self, flags: Flags) -> &'static str {
        match (flags.system, flags.dns) {
            (false, _) => "splash_status_system_loading",
            (true, false) => "splash_status_dns_loading",
            (true, true) => "splash_dashboard_done",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A 120 Hz display.
    const TICK: Duration = Duration::from_millis(8);
    const READY: Flags = Flags { system: true, dns: true };

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
    fn ready_backend_gets_the_intro_then_the_dashboard() {
        let start = Instant::now();
        let mut splash = Splash::new(start, false);
        let (elapsed, closed) = run(&mut splash, READY, start, Duration::ZERO, Duration::from_secs(30));

        assert!(closed);
        let expected = INTRO + OUTRO;
        assert!(elapsed >= expected && elapsed < expected + Duration::from_millis(200), "closed after {elapsed:?}");
        assert!(!splash.line_shown(), "nothing to wait for: no progress line");
    }

    #[test]
    fn waits_for_the_first_data_and_never_goes_backwards() {
        let start = Instant::now();
        let mut splash = Splash::new(start, false);
        let waiting = Flags { system: true, dns: false };

        let mut previous = 0.0;
        let mut elapsed = Duration::ZERO;
        while elapsed < Duration::from_secs(6) {
            assert!(!splash.tick(waiting, start + elapsed));
            assert!(splash.percent >= previous);
            previous = splash.percent;
            elapsed += TICK;
        }
        assert!(splash.outro(start + elapsed).is_none());
        assert!(splash.waiting(start + elapsed).is_some());
        assert!(splash.line_shown());
        assert!(splash.percent > 55.0 && splash.percent < 95.0, "{}", splash.percent);
        assert_eq!(splash.message_key(waiting), "splash_status_dns_loading");

        let ready_at = elapsed;
        let (closed_at, closed) = run(&mut splash, READY, start, elapsed, Duration::from_secs(20));
        assert!(closed);
        assert_eq!(splash.percent, 100.0);
        // The line finishes, then the hand-over plays.
        let after_ready = closed_at - ready_at;
        assert!(after_ready >= OUTRO && after_ready < OUTRO + Duration::from_secs(1), "{after_ready:?}");
    }

    #[test]
    fn gives_up_waiting_after_the_cap() {
        let start = Instant::now();
        let mut splash = Splash::new(start, false);
        let (elapsed, closed) = run(&mut splash, Flags::default(), start, Duration::ZERO, Duration::from_secs(60));

        assert!(closed);
        let expected = INTRO + WAIT_CAP + OUTRO;
        assert!(elapsed >= expected && elapsed < expected + Duration::from_millis(200), "closed after {elapsed:?}");
    }

    #[test]
    fn calm_motion_keeps_it_short() {
        let start = Instant::now();
        let mut splash = Splash::new(start, true);
        let (elapsed, closed) = run(&mut splash, READY, start, Duration::ZERO, Duration::from_secs(30));

        assert!(closed);
        assert!(elapsed < Duration::from_millis(1600), "closed after {elapsed:?}");
    }

    #[test]
    fn hand_over_runs_from_zero_to_one() {
        let start = Instant::now();
        let mut splash = Splash::new(start, false);
        assert!(splash.outro(start).is_none());
        assert!(splash.waiting(start + Duration::from_secs(1)).is_none(), "still in the intro");

        let mut elapsed = Duration::ZERO;
        let mut previous = 0.0;
        while !splash.tick(READY, start + elapsed) {
            if let Some(progress) = splash.outro(start + elapsed) {
                assert!(progress >= previous && progress <= 1.0);
                previous = progress;
            }
            elapsed += TICK;
        }
        assert!(previous > 0.97, "last progress seen: {previous}");
    }

    #[test]
    fn frozen_sequence_stays_where_it_was_put() {
        let start = Instant::now();
        let mut splash = Splash::frozen_at(start, 1.4, false);
        for seconds in [0, 5, 500] {
            let now = start + Duration::from_secs(seconds);
            assert!(!splash.tick(READY, now));
            assert!((splash.time(now) - 1.4).abs() < 0.001);
            assert!(splash.outro(now).is_none());
        }

        let late = Splash::frozen_at(start, 3.55, false);
        let progress = late.outro(start + Duration::from_secs(9)).expect("past the intro");
        assert!((progress - 0.5).abs() < 0.01, "{progress}");
    }
}
