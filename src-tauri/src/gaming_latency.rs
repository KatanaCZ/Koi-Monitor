use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::time::{Duration, Instant};

pub const GAMING_LATENCY_EVENT: &str = "gaming-latency-update";
const INTERNET_HOST: &str = "1.1.1.1";
const MAX_SAMPLES: usize = 15;
const GATEWAY_REFRESH_SECS: u64 = 120;
const PING_TIMEOUT_MS: u32 = 800;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GamingLatencySnapshot {
    pub gateway_ip: String,
    pub gateway_ms: f64,
    pub internet_ms: f64,
    pub jitter_ms: f64,
    pub sample_count: u32,
    pub verdict: String,
    pub verdict_label: String,
    pub internet_host: String,
}

pub struct GamingLatencyTracker {
    internet_samples: VecDeque<f64>,
    cached_gateway: Option<String>,
    last_gateway_refresh: Instant,
}

impl Default for GamingLatencyTracker {
    fn default() -> Self {
        Self {
            internet_samples: VecDeque::with_capacity(MAX_SAMPLES),
            cached_gateway: None,
            last_gateway_refresh: Instant::now()
                .checked_sub(Duration::from_secs(GATEWAY_REFRESH_SECS))
                .unwrap_or_else(Instant::now),
        }
    }
}

impl GamingLatencyTracker {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn sample(&mut self) -> GamingLatencySnapshot {
        if self.last_gateway_refresh.elapsed() >= Duration::from_secs(GATEWAY_REFRESH_SECS) {
            self.cached_gateway = detect_default_gateway();
            self.last_gateway_refresh = Instant::now();
        }

        let gateway_ip = self.cached_gateway.clone().unwrap_or_default();

        let gateway_ms = if gateway_ip.is_empty() {
            -1.0
        } else {
            measure_latency(&gateway_ip).unwrap_or(-1.0)
        };

        let internet_ms = measure_latency(INTERNET_HOST)
            .or_else(|| measure_tcp_latency(INTERNET_HOST, 443))
            .unwrap_or(-1.0);

        if internet_ms >= 0.0 {
            if self.internet_samples.len() >= MAX_SAMPLES {
                self.internet_samples.pop_front();
            }
            self.internet_samples.push_back(internet_ms);
        }

        let sample_count = self.internet_samples.len() as u32;
        let jitter_ms = std_dev(&self.internet_samples);

        let (verdict, verdict_label) = compute_verdict(gateway_ms, internet_ms, jitter_ms, sample_count);

        GamingLatencySnapshot {
            gateway_ip,
            gateway_ms,
            internet_ms,
            jitter_ms,
            sample_count,
            verdict: verdict.to_string(),
            verdict_label: verdict_label.to_string(),
            internet_host: INTERNET_HOST.to_string(),
        }
    }
}

fn compute_verdict(
    gateway_ms: f64,
    internet_ms: f64,
    jitter_ms: f64,
    sample_count: u32,
) -> (&'static str, &'static str) {
    if sample_count < 3 {
        return ("measuring", "Mesure…");
    }

    if internet_ms < 0.0 && gateway_ms < 0.0 {
        return ("poor", "Hors ligne");
    }

    if gateway_ms > 25.0 {
        return ("local_issue", "Wi‑Fi / box");
    }

    if gateway_ms >= 0.0
        && internet_ms >= 0.0
        && gateway_ms > 15.0
        && gateway_ms > internet_ms * 0.35
    {
        return ("local_issue", "Réseau local");
    }

    if internet_ms < 0.0 {
        return ("poor", "Internet inj.");
    }

    if internet_ms > 100.0 {
        return ("poor", "Latence élevée");
    }

    if internet_ms > 60.0 || jitter_ms > 20.0 {
        return ("marginal", "Limite ranked");
    }

    ("ready", "Prêt pour le jeu")
}

fn std_dev(samples: &VecDeque<f64>) -> f64 {
    if samples.len() < 2 {
        return 0.0;
    }
    let n = samples.len() as f64;
    let mean = samples.iter().sum::<f64>() / n;
    let variance = samples.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / n;
    variance.sqrt()
}

#[cfg(target_os = "windows")]
fn measure_latency(host: &str) -> Option<f64> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    let output = Command::new("ping")
        .args([
            "-n",
            "1",
            "-w",
            &PING_TIMEOUT_MS.to_string(),
            host,
        ])
        .creation_flags(0x08000000)
        .output()
        .ok()?;

    if !output.status.success() && output.stdout.is_empty() {
        return None;
    }

    parse_ping_ms(&std::str::from_utf8_lossy(&output.stdout))
}

#[cfg(not(target_os = "windows"))]
fn measure_latency(host: &str) -> Option<f64> {
    use std::process::Command;

    let timeout_sec = (PING_TIMEOUT_MS as f64 / 1000.0).max(1.0).ceil() as u32;
    let output = Command::new("ping")
        .args(["-c", "1", "-W", &timeout_sec.to_string(), host])
        .output()
        .ok()?;

    parse_ping_ms(&std::str::from_utf8_lossy(&output.stdout))
}

fn measure_tcp_latency(host: &str, port: u16) -> Option<f64> {
    use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
    use std::time::Instant;

    let start = Instant::now();
    let addrs: Vec<SocketAddr> = (host, port).to_socket_addrs().ok()?.collect();
    let addr = addrs.first()?;

    TcpStream::connect_timeout(addr, Duration::from_millis(PING_TIMEOUT_MS as u64)).ok()?;
    Some(start.elapsed().as_secs_f64() * 1000.0)
}

fn parse_ping_ms(output: &str) -> Option<f64> {
    let lower = output.to_lowercase();

    for marker in ["time=", "temps=", "time<", "temps<"] {
        if let Some(idx) = lower.find(marker) {
            if marker.ends_with('<') {
                return Some(0.5);
            }
            let rest = &output[idx + marker.len()..];
            let num: String = rest
                .chars()
                .take_while(|c| c.is_ascii_digit() || *c == '.')
                .collect();
            if let Ok(v) = num.parse::<f64>() {
                return Some(v);
            }
        }
    }

    None
}

#[cfg(target_os = "windows")]
fn detect_default_gateway() -> Option<String> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    let script = "(Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1).NextHop";

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ])
        .creation_flags(0x08000000)
        .output()
        .ok()?;

    if !output.status.success() {
        return detect_default_gateway_fallback();
    }

    let ip = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if is_valid_ipv4(&ip) {
        Some(ip)
    } else {
        detect_default_gateway_fallback()
    }
}

#[cfg(target_os = "windows")]
fn detect_default_gateway_fallback() -> Option<String> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    let output = Command::new("cmd")
        .args(["/C", "route", "print", "0.0.0.0"])
        .creation_flags(0x08000000)
        .output()
        .ok()?;

    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines() {
        let trimmed = line.trim();
        if !trimmed.starts_with("0.0.0.0") {
            continue;
        }
        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() >= 3 && is_valid_ipv4(parts[2]) {
            return Some(parts[2].to_string());
        }
    }

    None
}

#[cfg(not(target_os = "windows"))]
fn detect_default_gateway() -> Option<String> {
    None
}

fn is_valid_ipv4(ip: &str) -> bool {
    let parts: Vec<&str> = ip.split('.').collect();
    if parts.len() != 4 {
        return false;
    }
    parts.iter().all(|p| p.parse::<u8>().is_ok())
}
