//! User preferences, persisted as JSON in `%LOCALAPPDATA%\com.koi.monitor\settings.json`.
//!
//! Field names and defaults follow `AppSettings` from the web UI (`koi_settings`).

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::backend::dns::DnsServer;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    Fr,
    En,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    Dark,
    Light,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SakuraIntensity {
    Off,
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SakuraColor {
    Pink,
    Purple,
    Blue,
    Green,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BackgroundAura {
    Off,
    Soft,
    Full,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NeonGlow {
    Soft,
    Balanced,
    Vivid,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WidgetMode {
    Koi,
    Zen,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Sensitivity {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CustomDns {
    pub ip: String,
    pub label: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DesktopAlerts {
    pub sensitivity: Sensitivity,
    pub cpu_percent: u32,
    pub ram_percent: u32,
    pub gpu_percent: u32,
    pub cooldown_seconds: u32,
}

impl Default for DesktopAlerts {
    fn default() -> Self {
        Self { sensitivity: Sensitivity::Medium, cpu_percent: 90, ram_percent: 90, gpu_percent: 95, cooldown_seconds: 60 }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct GamingAlerts {
    pub network_alerts: bool,
    pub internet_latency_ms: u32,
    pub cooldown_seconds: u32,
}

impl Default for GamingAlerts {
    fn default() -> Self {
        Self { network_alerts: true, internet_latency_ms: 80, cooldown_seconds: 90 }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct AlertThresholds {
    pub enabled: bool,
    pub desktop: DesktopAlerts,
    pub gaming: GamingAlerts,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Settings {
    pub language: Language,
    pub theme: ThemeMode,
    pub zen_mode: bool,
    /// Telemetry cadence in milliseconds.
    pub refresh_interval: u32,
    /// DNS comparison cadence in milliseconds.
    pub dns_interval: u32,
    pub sakura_intensity: SakuraIntensity,
    pub sakura_color: SakuraColor,
    pub enable_glassmorphic_blur: bool,
    pub background_aura: BackgroundAura,
    pub neon_glow: NeonGlow,
    pub calm_motion: bool,
    /// Names of the preset DNS servers to compare.
    pub dns_checklist: Vec<String>,
    pub custom_dns: Option<CustomDns>,
    pub simplified_mode: bool,
    pub minimize_to_tray: bool,
    pub launch_at_startup: bool,
    pub ambient_music_muted: bool,
    pub zen_metrics_visible: bool,
    pub alert_thresholds: AlertThresholds,
    pub show_desktop_widget: bool,
    pub desktop_widget_mode: WidgetMode,
    pub alerts_onboarding_done: bool,
    pub easter_music_seen: bool,
}

pub const POPULAR_DNS_SERVERS: [(&str, &str); 6] = [
    ("Google DNS", "8.8.8.8"),
    ("Cloudflare DNS", "1.1.1.1"),
    ("Quad9", "9.9.9.9"),
    ("OpenDNS", "208.67.222.222"),
    ("AdGuard DNS", "94.140.14.14"),
    ("CleanBrowsing", "185.228.168.9"),
];

pub const REFRESH_INTERVALS_MS: [u32; 4] = [1000, 2000, 5000, 10000];
pub const DNS_INTERVALS_MS: [u32; 4] = [10000, 15000, 30000, 60000];
const ALERT_PERCENTS: [u32; 4] = [80, 85, 90, 95];
const ALERT_LATENCIES_MS: [u32; 3] = [60, 80, 100];
const DESKTOP_COOLDOWNS: [u32; 3] = [45, 60, 90];
const GAMING_COOLDOWNS: [u32; 3] = [60, 90, 120];

pub fn default_dns_checklist() -> Vec<String> {
    POPULAR_DNS_SERVERS[..4].iter().map(|(name, _)| name.to_string()).collect()
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: detect_system_language(),
            theme: ThemeMode::Dark,
            zen_mode: false,
            refresh_interval: 2000,
            dns_interval: 15000,
            sakura_intensity: SakuraIntensity::Medium,
            sakura_color: SakuraColor::Pink,
            enable_glassmorphic_blur: true,
            background_aura: BackgroundAura::Full,
            neon_glow: NeonGlow::Balanced,
            calm_motion: false,
            dns_checklist: default_dns_checklist(),
            custom_dns: None,
            simplified_mode: true,
            minimize_to_tray: false,
            launch_at_startup: false,
            ambient_music_muted: false,
            zen_metrics_visible: true,
            alert_thresholds: AlertThresholds::default(),
            show_desktop_widget: false,
            desktop_widget_mode: WidgetMode::Zen,
            alerts_onboarding_done: false,
            easter_music_seen: false,
        }
    }
}

fn detect_system_language() -> Language {
    use windows::Win32::Globalization::GetUserDefaultLocaleName;

    let mut buffer = [0u16; 85];
    let length = unsafe { GetUserDefaultLocaleName(&mut buffer) };
    let locale = String::from_utf16_lossy(&buffer[..length.max(1) as usize - 1]).to_lowercase();

    if locale.starts_with("fr") {
        Language::Fr
    } else {
        Language::En
    }
}

/// Same rule as the DNS probe itself, so Settings never stores a server it would refuse to ping.
pub fn is_valid_custom_dns_ipv4(ip: &str) -> bool {
    crate::backend::dns::is_allowed_custom_dns_ip(ip.trim())
}

fn clamp_to_allowed(value: u32, allowed: &[u32], fallback: u32) -> u32 {
    if allowed.contains(&value) {
        value
    } else {
        fallback
    }
}

impl Settings {
    /// Drops values an older or hand-edited file may contain.
    pub fn sanitized(mut self) -> Self {
        self.refresh_interval = clamp_to_allowed(self.refresh_interval, &REFRESH_INTERVALS_MS, 2000);
        self.dns_interval = clamp_to_allowed(self.dns_interval, &DNS_INTERVALS_MS, 15000);

        let mut checklist: Vec<String> = Vec::new();
        for name in &self.dns_checklist {
            let known = POPULAR_DNS_SERVERS.iter().any(|(preset, _)| preset == name);
            if known && !checklist.contains(name) {
                checklist.push(name.clone());
            }
        }
        self.dns_checklist = if checklist.is_empty() { default_dns_checklist() } else { checklist };

        self.custom_dns = self.custom_dns.take().and_then(|custom| {
            let ip = custom.ip.trim().to_string();
            is_valid_custom_dns_ipv4(&ip).then(|| CustomDns { ip, label: custom.label.trim().chars().take(24).collect() })
        });

        let alerts = &mut self.alert_thresholds;
        alerts.desktop.cpu_percent = clamp_to_allowed(alerts.desktop.cpu_percent, &ALERT_PERCENTS, 90);
        alerts.desktop.ram_percent = clamp_to_allowed(alerts.desktop.ram_percent, &ALERT_PERCENTS, 90);
        alerts.desktop.gpu_percent = clamp_to_allowed(alerts.desktop.gpu_percent, &ALERT_PERCENTS, 95);
        alerts.desktop.cooldown_seconds = clamp_to_allowed(alerts.desktop.cooldown_seconds, &DESKTOP_COOLDOWNS, 60);
        alerts.gaming.internet_latency_ms = clamp_to_allowed(alerts.gaming.internet_latency_ms, &ALERT_LATENCIES_MS, 80);
        alerts.gaming.cooldown_seconds = clamp_to_allowed(alerts.gaming.cooldown_seconds, &GAMING_COOLDOWNS, 90);

        self
    }

    /// Preset servers ticked in Settings, followed by the personal server if any.
    pub fn active_dns_servers(&self, custom_default_label: &str) -> Vec<DnsServer> {
        let mut servers: Vec<DnsServer> = POPULAR_DNS_SERVERS
            .iter()
            .filter(|(name, _)| self.dns_checklist.iter().any(|checked| checked == name))
            .map(|(name, ip)| DnsServer { name: name.to_string(), ip: ip.to_string() })
            .collect();

        if let Some(custom) = &self.custom_dns {
            let name = if custom.label.is_empty() { custom_default_label.to_string() } else { custom.label.clone() };
            servers.push(DnsServer { name, ip: custom.ip.clone() });
        }

        servers
    }
}

fn path() -> Option<PathBuf> {
    let base = std::env::var_os("LOCALAPPDATA")?;
    Some(PathBuf::from(base).join("com.koi.monitor").join("settings.json"))
}

pub fn load() -> Settings {
    path()
        .and_then(|path| std::fs::read_to_string(path).ok())
        .and_then(|json| serde_json::from_str::<Settings>(&json).ok())
        .unwrap_or_default()
        .sanitized()
}

pub fn save(settings: &Settings) {
    let Some(path) = path() else { return };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    match serde_json::to_string_pretty(settings) {
        Ok(json) => {
            if let Err(error) = std::fs::write(&path, json) {
                log::warn!("Failed to save settings: {error}");
            }
        }
        Err(error) => log::warn!("Failed to serialize settings: {error}"),
    }
}
