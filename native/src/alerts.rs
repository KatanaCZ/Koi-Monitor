//! Koi watch: quiet alerts when the machine strains at the desk, or when ping drifts in game.
//!
//! Port of `thresholdAlerts.ts`. The profile (desktop / gaming) is detected from the load;
//! each alert needs its condition to hold for 3 s and then observes a cooldown.

use std::time::{Duration, Instant};

use crate::backend::gaming_latency::GamingLatencySnapshot;
use crate::backend::system::SystemInfo;
use crate::i18n::Tr;
use crate::settings::{AlertThresholds, DesktopAlerts, GamingAlerts, Sensitivity};

/// `max(CPU, GPU)` at or above this for 25 s means a game is running.
const PROFILE_ENTER_LOAD: f32 = 45.0;
const PROFILE_ENTER: Duration = Duration::from_secs(25);
/// Below this for 60 s, the session is over.
const PROFILE_EXIT_LOAD: f32 = 30.0;
const PROFILE_EXIT: Duration = Duration::from_secs(60);
/// A threshold must stay crossed this long before Koi speaks up.
const METRIC_SUSTAIN: Duration = Duration::from_secs(3);
const BASELINE_MIN_SAMPLES: usize = 5;
const BASELINE_SAMPLE_MAX: usize = 20;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Profile {
    Desktop,
    Gaming,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    Success,
    Warning,
    Error,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Alert {
    pub message: String,
    pub severity: Severity,
}

impl DesktopAlerts {
    /// Quiet / Balanced / Attentive.
    pub fn preset(sensitivity: Sensitivity) -> Self {
        match sensitivity {
            Sensitivity::Low => Self { sensitivity, cpu_percent: 95, ram_percent: 95, gpu_percent: 95, cooldown_seconds: 90 },
            Sensitivity::Medium => Self { sensitivity, cpu_percent: 90, ram_percent: 90, gpu_percent: 95, cooldown_seconds: 60 },
            Sensitivity::High => Self { sensitivity, cpu_percent: 85, ram_percent: 85, gpu_percent: 90, cooldown_seconds: 45 },
        }
    }
}

impl GamingAlerts {
    pub fn preset(network_alerts: bool) -> Self {
        Self { network_alerts, internet_latency_ms: 80, cooldown_seconds: 90 }
    }
}

/// How far above the usual ping before alerting, in ms.
fn spike_delta(sensitivity: Sensitivity) -> f64 {
    match sensitivity {
        Sensitivity::Low => 55.0,
        Sensitivity::Medium => 50.0,
        Sensitivity::High => 35.0,
    }
}

/// A condition being watched: when it started holding, and until when it stays quiet after firing.
#[derive(Debug, Clone, Copy, Default)]
struct Watch {
    breach_since: Option<Instant>,
    cooldown_until: Option<Instant>,
}

impl Watch {
    /// Tracks `breached`; returns how long it has held once past the sustain time.
    fn sustained(&mut self, breached: bool, now: Instant) -> Option<Duration> {
        if !breached {
            self.breach_since = None;
            return None;
        }
        let held = now.duration_since(*self.breach_since.get_or_insert(now));
        (held >= METRIC_SUSTAIN).then_some(held)
    }

    fn cooling_down(&self, now: Instant) -> bool {
        self.cooldown_until.is_some_and(|until| now < until)
    }

    fn fired(&mut self, cooldown_seconds: u32, now: Instant) {
        self.cooldown_until = Some(now + Duration::from_secs(cooldown_seconds as u64));
        self.breach_since = None;
    }
}

#[derive(Debug, Clone)]
pub struct Watcher {
    profile: Profile,
    high_load_since: Option<Instant>,
    low_load_since: Option<Instant>,
    /// Internet latency during the current gaming session.
    latency_samples: Vec<f64>,
    session_min_ms: Option<f64>,
    desktop_load: Watch,
    gaming_latency: Watch,
}

fn spike_duration(held: Duration) -> String {
    let seconds = held.as_secs_f64().round().max(1.0) as u64;
    if seconds < 60 {
        return format!("~{seconds}s");
    }
    let minutes = (seconds as f64 / 60.0).round() as u64;
    if minutes <= 1 { "~1 min".to_string() } else { format!("~{minutes} min") }
}

impl Watcher {
    pub fn new() -> Self {
        Self {
            profile: Profile::Desktop,
            high_load_since: None,
            low_load_since: None,
            latency_samples: Vec::new(),
            session_min_ms: None,
            desktop_load: Watch::default(),
            gaming_latency: Watch::default(),
        }
    }

    pub fn profile(&self) -> Profile {
        self.profile
    }

    fn update_profile(&mut self, load: f32, now: Instant) {
        match self.profile {
            Profile::Desktop => {
                self.low_load_since = None;
                if load >= PROFILE_ENTER_LOAD {
                    let since = *self.high_load_since.get_or_insert(now);
                    if now.duration_since(since) >= PROFILE_ENTER {
                        self.profile = Profile::Gaming;
                        self.high_load_since = None;
                    }
                } else {
                    self.high_load_since = None;
                }
            }
            Profile::Gaming => {
                self.high_load_since = None;
                if load < PROFILE_EXIT_LOAD {
                    let since = *self.low_load_since.get_or_insert(now);
                    if now.duration_since(since) >= PROFILE_EXIT {
                        self.profile = Profile::Desktop;
                        self.low_load_since = None;
                    }
                } else {
                    self.low_load_since = None;
                }
            }
        }
    }

    /// The session's best ping, once enough samples make it meaningful.
    fn baseline(&self) -> Option<f64> {
        if self.latency_samples.len() < BASELINE_MIN_SAMPLES {
            return None;
        }
        self.session_min_ms
    }

    /// Feeds the latest telemetry; returns at most one alert to show.
    pub fn evaluate(
        &mut self,
        system: &SystemInfo,
        gaming: &GamingLatencySnapshot,
        settings: &AlertThresholds,
        now: Instant,
        tr: Tr,
    ) -> Option<Alert> {
        if !settings.enabled {
            *self = Self::new();
            return None;
        }

        let gpu_usage = system.gpu.iter().map(|g| g.usage).fold(0.0, f32::max);
        let load = system.cpu.usage.max(gpu_usage);
        self.update_profile(load, now);

        if gaming.internet_ms >= 0.0 {
            match self.profile {
                Profile::Desktop => {
                    self.latency_samples.clear();
                    self.session_min_ms = None;
                }
                Profile::Gaming => {
                    self.latency_samples.push(gaming.internet_ms);
                    if self.latency_samples.len() > BASELINE_SAMPLE_MAX {
                        self.latency_samples.remove(0);
                    }
                    self.session_min_ms = Some(self.session_min_ms.map_or(gaming.internet_ms, |min| min.min(gaming.internet_ms)));
                }
            }
        }

        match self.profile {
            Profile::Desktop => {
                self.gaming_latency.breach_since = None;

                // While the load is ramping up to a gaming session, do not call it "under pressure".
                let pending_gaming = self.high_load_since.is_some() && load >= PROFILE_ENTER_LOAD;
                let metrics = [
                    ("CPU", system.cpu.usage, settings.desktop.cpu_percent as f32),
                    ("RAM", system.memory.usage_percent, settings.desktop.ram_percent as f32),
                    ("GPU", gpu_usage, settings.desktop.gpu_percent as f32),
                ];
                let worst = metrics
                    .iter()
                    .filter(|(_, value, threshold)| value > threshold)
                    .max_by(|a, b| (a.1 - a.2).total_cmp(&(b.1 - b.2)))
                    .copied();

                let held = self.desktop_load.sustained(!pending_gaming && worst.is_some(), now);
                let (label, value, threshold) = worst?;
                if held.is_none() || self.desktop_load.cooling_down(now) {
                    return None;
                }

                self.desktop_load.fired(settings.desktop.cooldown_seconds, now);
                Some(Alert {
                    message: tr.tf("alert_desktop_load", &[("metric", &label), ("value", &format!("{value:.0}"))]),
                    severity: if value > threshold + 5.0 { Severity::Error } else { Severity::Warning },
                })
            }
            Profile::Gaming => {
                self.desktop_load.breach_since = None;

                if !settings.gaming.network_alerts || gaming.internet_ms < 0.0 || self.gaming_latency.cooling_down(now) {
                    return None;
                }

                let baseline = self.baseline();
                let sensitivity = settings.desktop.sensitivity;
                let ceiling = settings.gaming.internet_latency_ms as f64;
                let over_baseline = baseline.map(|baseline| gaming.internet_ms - baseline - spike_delta(sensitivity));
                let breached = gaming.internet_ms >= ceiling || over_baseline.is_some_and(|over| over >= 0.0);

                let held = self.gaming_latency.sustained(breached, now)?;
                self.gaming_latency.fired(settings.gaming.cooldown_seconds, now);

                let ms = format!("{:.0}", gaming.internet_ms);
                let duration = spike_duration(held);
                let message = match baseline {
                    Some(baseline) => tr.tf(
                        "alert_gaming_ping_baseline",
                        &[("ms", &ms), ("duration", &duration), ("baseline", &format!("{baseline:.0}"))],
                    ),
                    None => tr.tf("alert_gaming_ping", &[("ms", &ms), ("duration", &duration)]),
                };
                let severe = over_baseline.is_some_and(|over| over >= 25.0) || gaming.internet_ms >= ceiling + 20.0;
                Some(Alert { message, severity: if severe { Severity::Error } else { Severity::Warning } })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::backend::security::SecurityInfo;
    use crate::backend::system::{CpuInfo, GpuInfo, MemoryInfo, NetworkInfo};
    use crate::settings::Language;

    fn system(cpu: f32, ram: f32, gpu: f32) -> SystemInfo {
        SystemInfo {
            cpu: CpuInfo { name: String::new(), cores: 8, usage: cpu, per_core_usage: Vec::new(), frequency: 0, temperature: None },
            memory: MemoryInfo { total: 100, used: ram as u64, available: 0, usage_percent: ram, modules: Vec::new() },
            gpu: vec![GpuInfo { name: String::new(), usage: gpu, memory_used: 0, memory_total: 0, temperature: None }],
            network: NetworkInfo { download_speed: 0.0, upload_speed: 0.0, total_received: 0, total_transmitted: 0, interfaces: Vec::new() },
            uptime: 0,
            security: SecurityInfo::default(),
            battery: None,
        }
    }

    fn ping(internet_ms: f64) -> GamingLatencySnapshot {
        GamingLatencySnapshot { internet_ms, ..Default::default() }
    }

    fn enabled() -> AlertThresholds {
        AlertThresholds { enabled: true, ..Default::default() }
    }

    const TR: Tr = Tr(Language::En);

    #[test]
    fn disabled_watch_never_alerts() {
        let mut watcher = Watcher::new();
        let start = Instant::now();
        for second in 0..10 {
            let alert = watcher.evaluate(&system(99.0, 99.0, 0.0), &ping(10.0), &AlertThresholds::default(), start + Duration::from_secs(second), TR);
            assert!(alert.is_none());
        }
    }

    #[test]
    fn desktop_pressure_alerts_once_after_three_seconds_then_cools_down() {
        let mut watcher = Watcher::new();
        let start = Instant::now();
        let settings = enabled();
        // RAM is the only metric over its threshold, so the load does not look like a game starting.
        let alerts: Vec<Option<Alert>> = (0..10)
            .map(|second| watcher.evaluate(&system(10.0, 97.0, 0.0), &ping(10.0), &settings, start + Duration::from_secs(second), TR))
            .collect();

        assert!(alerts[..3].iter().all(Option::is_none));
        let alert = alerts[3].as_ref().expect("alert after 3 s");
        assert!(alert.message.contains("RAM 97"));
        assert_eq!(alert.severity, Severity::Error);
        assert!(alerts[4..].iter().all(Option::is_none));
    }

    #[test]
    fn sustained_load_switches_to_gaming_profile_without_a_desktop_alert() {
        let mut watcher = Watcher::new();
        let start = Instant::now();
        let settings = enabled();
        for second in 0..=26 {
            let alert = watcher.evaluate(&system(96.0, 20.0, 96.0), &ping(10.0), &settings, start + Duration::from_secs(second), TR);
            assert!(alert.is_none());
        }
        assert_eq!(watcher.profile(), Profile::Gaming);
    }

    #[test]
    fn ping_drifting_from_the_session_baseline_alerts_in_game() {
        let mut watcher = Watcher::new();
        let start = Instant::now();
        let settings = enabled();
        let at = |second: u64| start + Duration::from_secs(second);

        for second in 0..=40 {
            watcher.evaluate(&system(60.0, 20.0, 80.0), &ping(10.0), &settings, at(second), TR);
        }
        assert_eq!(watcher.profile(), Profile::Gaming);

        // 65 ms is under the 80 ms ceiling but 55 ms over the usual 10 ms.
        let alerts: Vec<Option<Alert>> =
            (41..46).map(|second| watcher.evaluate(&system(60.0, 20.0, 80.0), &ping(65.0), &settings, at(second), TR)).collect();
        let alert = alerts.iter().flatten().next().expect("latency alert");
        assert!(alert.message.contains("65 ms"));
        assert!(alert.message.contains("~10 ms"));
        assert_eq!(alerts.iter().flatten().count(), 1);
    }
}
