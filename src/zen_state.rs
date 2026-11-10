//! Zen / Flow / Boost: the machine's mood, from `max(CPU, GPU)`.
//!
//! Port of `zenLoadState.ts`: a 5-sample median, isolated spikes ignored, and a
//! state only changes once the new level has held (5 s going up, 3 s going down).

use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum LoadState {
    /// Zen
    Rest,
    /// Flow
    Moderate,
    /// Boost
    Intense,
}

const SMOOTH_SAMPLE_COUNT: usize = 5;
const SAMPLE_RING_MAX: usize = 8;

/// Fast path to Boost: a very high raw load held this long, once warmed up.
const FAST_INTENSE_RAW: f32 = 88.0;
const FAST_INTENSE_HOLD: Duration = Duration::from_secs(3);

/// Going up a state is more cautious than coming down.
const SUSTAIN_ENTER: Duration = Duration::from_secs(5);
const SUSTAIN_EXIT: Duration = Duration::from_secs(3);

const FLOW_ENTER: f32 = 26.0;
const ZEN_EXIT: f32 = 13.0;
const BOOST_ENTER: f32 = 76.0;
const FLOW_EXIT: f32 = 58.0;

/// A raw sample this far above the recent median is treated as a blip (AV scan, indexing…).
const SPIKE_DELTA: f32 = 28.0;
/// …unless it lasts: after this many samples in a row, the jump is real load.
///
/// The web version damped such jumps forever (the damped value fed its own baseline),
/// so going straight from idle to a game never left Zen.
const SPIKE_MAX_SAMPLES: u8 = 2;

#[derive(Debug, Clone)]
pub struct LoadTracker {
    samples: Vec<f32>,
    displayed: LoadState,
    candidate: Option<(LoadState, Instant)>,
    fast_intense_since: Option<Instant>,
    /// Consecutive samples far above the baseline (the first few are damped as a spike).
    damped_run: u8,
}

fn median(values: &[f32]) -> f32 {
    if values.is_empty() {
        return 0.0;
    }
    let mut sorted = values.to_vec();
    sorted.sort_by(f32::total_cmp);
    let mid = sorted.len() / 2;
    if sorted.len().is_multiple_of(2) {
        (sorted[mid - 1] + sorted[mid]) / 2.0
    } else {
        sorted[mid]
    }
}

impl LoadTracker {
    pub fn new() -> Self {
        Self { samples: Vec::new(), displayed: LoadState::Rest, candidate: None, fast_intense_since: None, damped_run: 0 }
    }

    pub fn state(&self) -> LoadState {
        self.displayed
    }

    /// Feeds one telemetry sample and returns the state to display.
    pub fn update(&mut self, cpu: f32, gpu: f32, now: Instant) -> LoadState {
        // sysinfo can report garbage on its first tick.
        let raw = cpu.max(gpu);
        let raw = if raw.is_finite() { raw.clamp(0.0, 100.0) } else { 0.0 };

        // Count how long the load has been far above the baseline; only the start of such a
        // run is damped, so the baseline can catch up with a jump that lasts.
        let mut damped = raw;
        let mut damped_run = 0;
        if self.samples.len() >= 3 {
            let baseline = median(&self.samples[self.samples.len() - 3..]);
            if raw - baseline >= SPIKE_DELTA {
                damped_run = self.damped_run.saturating_add(1);
                if damped_run <= SPIKE_MAX_SAMPLES {
                    damped = baseline;
                }
            }
        }
        self.damped_run = damped_run;

        self.samples.push(damped);
        if self.samples.len() > SAMPLE_RING_MAX {
            self.samples.remove(0);
        }

        if self.samples.len() < SMOOTH_SAMPLE_COUNT {
            *self = Self { samples: std::mem::take(&mut self.samples), damped_run, ..Self::new() };
            return self.displayed;
        }

        let smoothed = median(&self.samples[self.samples.len() - SMOOTH_SAMPLE_COUNT..]);

        if raw >= FAST_INTENSE_RAW {
            let since = *self.fast_intense_since.get_or_insert(now);
            if now.duration_since(since) >= FAST_INTENSE_HOLD {
                self.displayed = LoadState::Intense;
                self.candidate = None;
                return self.displayed;
            }
        } else {
            self.fast_intense_since = None;
        }

        let target = match self.displayed {
            LoadState::Rest if smoothed >= FLOW_ENTER => LoadState::Moderate,
            LoadState::Moderate if smoothed >= BOOST_ENTER => LoadState::Intense,
            LoadState::Moderate if smoothed <= ZEN_EXIT => LoadState::Rest,
            LoadState::Intense if smoothed <= FLOW_EXIT => LoadState::Moderate,
            current => current,
        };

        if target == self.displayed {
            self.candidate = None;
        } else {
            match self.candidate {
                Some((candidate, since)) if candidate == target => {
                    let sustain = if target > self.displayed { SUSTAIN_ENTER } else { SUSTAIN_EXIT };
                    if now.duration_since(since) >= sustain {
                        self.displayed = target;
                        self.candidate = None;
                    }
                }
                _ => self.candidate = Some((target, now)),
            }
        }

        self.displayed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Feeds `load` once a second for `seconds`, returning the final state.
    fn run(tracker: &mut LoadTracker, start: Instant, from: u64, seconds: u64, load: f32) -> LoadState {
        let mut state = tracker.state();
        for second in from..from + seconds {
            state = tracker.update(load, 0.0, start + Duration::from_secs(second));
        }
        state
    }

    #[test]
    fn stays_at_rest_while_warming_up() {
        let mut tracker = LoadTracker::new();
        assert_eq!(run(&mut tracker, Instant::now(), 0, 4, 95.0), LoadState::Rest);
    }

    #[test]
    fn sustained_load_climbs_to_flow_then_boost() {
        let mut tracker = LoadTracker::new();
        let start = Instant::now();
        assert_eq!(run(&mut tracker, start, 0, 6, 5.0), LoadState::Rest);
        // The first two samples of the jump are damped as a spike; the level must then hold for 5 s.
        assert_eq!(run(&mut tracker, start, 6, 6, 40.0), LoadState::Rest);
        assert_eq!(run(&mut tracker, start, 12, 8, 40.0), LoadState::Moderate);
        assert_eq!(run(&mut tracker, start, 20, 14, 80.0), LoadState::Intense);
    }

    #[test]
    fn isolated_spike_does_not_change_state() {
        let mut tracker = LoadTracker::new();
        let start = Instant::now();
        run(&mut tracker, start, 0, 8, 5.0);
        assert_eq!(run(&mut tracker, start, 8, 1, 100.0), LoadState::Rest);
        assert_eq!(run(&mut tracker, start, 9, 8, 5.0), LoadState::Rest);
    }

    #[test]
    fn comes_back_down_when_the_load_drops() {
        let mut tracker = LoadTracker::new();
        let start = Instant::now();
        run(&mut tracker, start, 0, 6, 5.0);
        assert_eq!(run(&mut tracker, start, 6, 14, 40.0), LoadState::Moderate);
        assert_eq!(run(&mut tracker, start, 20, 12, 5.0), LoadState::Rest);
    }
}
