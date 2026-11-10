//! System telemetry loop: CPU, memory, GPU, network, battery, security.
//!
//! One thread samples the machine, another measures gaming latency; both push
//! into a single stream consumed by the UI.

use iced::futures::channel::mpsc;
use iced::futures::Stream;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::time::{Duration, Instant};
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, Networks, RefreshKind, System};

use windows::core::Interface;
use windows::Win32::Graphics::Dxgi::*;
use wmi::{COMLibrary, WMIConnection};

use super::gaming_latency::{GamingLatencySnapshot, GamingLatencyTracker};
use super::memory::{query_ram_modules, RamModuleInfo};
use super::security::{self, SecurityInfo};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatteryInfo {
    pub percentage: u8,
    pub is_charging: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub gpu: Vec<GpuInfo>,
    pub network: NetworkInfo,
    pub uptime: u64,
    pub security: SecurityInfo,
    pub battery: Option<BatteryInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuInfo {
    pub name: String,
    pub cores: usize,
    pub usage: f32,
    pub per_core_usage: Vec<f32>,
    pub frequency: u64,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryInfo {
    pub total: u64,
    pub used: u64,
    pub available: u64,
    pub usage_percent: f32,
    pub modules: Vec<RamModuleInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuInfo {
    pub name: String,
    pub usage: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInfo {
    /// MB/s
    pub download_speed: f64,
    /// MB/s
    pub upload_speed: f64,
    pub total_received: u64,
    pub total_transmitted: u64,
    pub interfaces: Vec<NetworkInterface>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum InterfaceKind {
    Wifi,
    Ethernet,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInterface {
    pub name: String,
    pub received: u64,
    pub transmitted: u64,
    pub kind: InterfaceKind,
}

/// What the backend pushes to the UI.
#[derive(Debug, Clone)]
pub enum Event {
    System(Box<SystemInfo>),
    GamingLatency(GamingLatencySnapshot),
}

// --- controls set by the UI -------------------------------------------------

static ACTIVE: AtomicBool = AtomicBool::new(true);
static INTERVAL_MS: AtomicU64 = AtomicU64::new(2000);

/// Pauses sampling entirely (window hidden and no alert to watch for).
pub fn set_active(active: bool) {
    ACTIVE.store(active, Ordering::Relaxed);
}

/// Sampling cadence, the "Cadence" setting (1 s to 10 s).
pub fn set_interval(interval: Duration) {
    INTERVAL_MS.store(interval.as_millis().clamp(500, 60_000) as u64, Ordering::Relaxed);
}

// --- GPU --------------------------------------------------------------------

#[derive(Deserialize, Debug)]
#[serde(rename = "Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine")]
#[serde(rename_all = "PascalCase")]
struct GpuEngine {
    name: String,
    utilization_percentage: u32,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory")]
#[serde(rename_all = "PascalCase")]
struct GpuMemory {
    name: String,
    dedicated_usage: u64,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "MSAcpi_ThermalZoneTemperature")]
#[serde(rename_all = "PascalCase")]
struct ThermalZoneTemperature {
    instance_name: String,
    current_temperature: u32,
}

/// Tenths of kelvin, as reported by ACPI, to °C. Rejects readings outside 0–150 °C.
fn zone_celsius(zone: &ThermalZoneTemperature) -> Option<f32> {
    let kelvin_tenths = zone.current_temperature;
    (kelvin_tenths > 2732 && kelvin_tenths < 4232).then(|| kelvin_tenths as f32 / 10.0 - 273.15)
}

/// (CPU, GPU) temperatures from the ACPI thermal zones, when the firmware exposes them.
fn query_temperatures(wmi: &WMIConnection) -> (Option<f32>, Option<f32>) {
    let Ok(zones) = wmi.query::<ThermalZoneTemperature>() else {
        return (None, None);
    };

    let cpu = zones.iter().filter_map(zone_celsius).reduce(f32::max);
    let gpu = zones
        .iter()
        .filter(|zone| {
            let name = zone.instance_name.to_lowercase();
            name.contains("gpu") || name.contains("gfx") || name.contains("video") || name.contains("peg")
        })
        .find_map(zone_celsius);

    (cpu, gpu)
}

#[derive(Debug, Clone)]
struct SelectedGpuAdapter {
    name: String,
    vram_total: u64,
    /// Matches WMI `GPUEngine` / `GPUAdapterMemory` instance names (`luid_0xHIGH_0xLOW`).
    luid_fragment: String,
}

fn format_luid_wmi_fragment(high: u32, low: u32) -> String {
    format!("luid_0x{high:08x}_0x{low:08x}")
}

fn engine_contributes_to_gpu_load(name: &str) -> bool {
    let n = name.to_ascii_lowercase();
    n.contains("engtype_3d") || n.contains("engtype_compute") || n.contains("engtype_copy")
}

/// Adapter-level GPU busy % — max engine load on the selected adapter (not a sum of processes).
fn aggregate_adapter_gpu_utilization(engines: &[(String, u32)], luid_fragment: &str) -> f32 {
    let luid = luid_fragment.to_ascii_lowercase();
    let filter_by_luid = !luid.is_empty();
    let mut max_util = 0u32;

    for (name, util) in engines {
        if !engine_contributes_to_gpu_load(name) {
            continue;
        }
        if filter_by_luid && !name.to_ascii_lowercase().contains(&luid) {
            continue;
        }
        max_util = max_util.max(*util);
    }

    if max_util == 0 && filter_by_luid {
        for (name, util) in engines {
            if name.to_ascii_lowercase().contains("engtype_3d") {
                max_util = max_util.max(*util);
            }
        }
    }

    max_util.min(100) as f32
}

fn vram_used_for_adapter(memories: &[(String, u64)], luid_fragment: &str) -> u64 {
    let luid = luid_fragment.to_ascii_lowercase();
    if !luid.is_empty() {
        let matched: u64 = memories
            .iter()
            .filter(|(name, _)| name.to_ascii_lowercase().contains(&luid))
            .map(|(_, usage)| *usage)
            .sum();
        if matched > 0 {
            return matched;
        }
    }
    memories.iter().map(|(_, usage)| *usage).sum()
}

fn is_software_gpu_name(name: &str) -> bool {
    let n = name.to_lowercase();
    n.contains("microsoft basic") || n.contains("remote") || n.contains("virtual") || n.contains("parsec")
}

fn is_discrete_gpu_name(name: &str) -> bool {
    let n = name.to_lowercase();
    n.contains("nvidia") || n.contains("amd") || n.contains("radeon") || n.contains("arc ") || n.ends_with(" arc")
}

fn read_selected_gpu_adapter() -> SelectedGpuAdapter {
    let mut best_discrete: Option<SelectedGpuAdapter> = None;
    let mut best_any: Option<SelectedGpuAdapter> = None;

    unsafe {
        if let Ok(factory) = CreateDXGIFactory1::<IDXGIFactory4>() {
            for index in 0u32.. {
                let adapter = match factory.EnumAdapters1(index) {
                    Ok(adapter) => adapter,
                    Err(_) => break,
                };
                let adapter3 = match adapter.cast::<IDXGIAdapter3>() {
                    Ok(adapter3) => adapter3,
                    Err(_) => continue,
                };
                let desc = match adapter3.GetDesc1() {
                    Ok(desc) => desc,
                    Err(_) => continue,
                };
                let name = String::from_utf16_lossy(&desc.Description)
                    .trim_end_matches('\0')
                    .to_string();
                let vram = desc.DedicatedVideoMemory as u64;
                if vram == 0 || is_software_gpu_name(&name) {
                    continue;
                }
                let luid = desc.AdapterLuid;
                let candidate = SelectedGpuAdapter {
                    name: name.clone(),
                    vram_total: vram,
                    luid_fragment: format_luid_wmi_fragment(luid.HighPart as u32, luid.LowPart),
                };
                let slot = if is_discrete_gpu_name(&name) { &mut best_discrete } else { &mut best_any };
                if slot.as_ref().map(|best| vram > best.vram_total).unwrap_or(true) {
                    *slot = Some(candidate);
                }
            }
        }
    }

    best_discrete.or(best_any).unwrap_or(SelectedGpuAdapter {
        name: "Unknown GPU".to_string(),
        vram_total: 0,
        luid_fragment: String::new(),
    })
}

fn read_gpu_wmi_metrics(wmi: &WMIConnection, adapter: &SelectedGpuAdapter) -> (f32, u64) {
    let engines: Vec<(String, u32)> = wmi
        .query::<GpuEngine>()
        .map(|results| results.into_iter().map(|r| (r.name, r.utilization_percentage)).collect())
        .unwrap_or_default();
    let memories: Vec<(String, u64)> = wmi
        .query::<GpuMemory>()
        .map(|results| results.into_iter().map(|r| (r.name, r.dedicated_usage)).collect())
        .unwrap_or_default();

    (
        aggregate_adapter_gpu_utilization(&engines, &adapter.luid_fragment),
        vram_used_for_adapter(&memories, &adapter.luid_fragment),
    )
}

// --- network ----------------------------------------------------------------

fn is_virtual_interface(name: &str) -> bool {
    let n = name.to_lowercase();
    n == "lo"
        || [
            "loopback", "virtual", "vethernet", "vmware", "virtualbox", "hyper-v", "docker", "veth", "npcap",
            "bluetooth", "tunnel", "pseudo", "wan miniport", "teredo", "isatap", "hamachi", "zerotier",
            "tailscale", "wireguard",
        ]
        .iter()
        .any(|needle| n.contains(needle))
}

fn classify_interface(name: &str) -> InterfaceKind {
    let n = name.to_lowercase();
    if ["wi-fi", "wifi", "wlan", "wireless", "802.11"].iter().any(|needle| n.contains(needle)) {
        InterfaceKind::Wifi
    } else if ["ethernet", "gigabit", "connexion au réseau local", "local area connection", " 2.5g", "gbe"]
        .iter()
        .any(|needle| n.contains(needle))
    {
        InterfaceKind::Ethernet
    } else {
        InterfaceKind::Other
    }
}

fn read_battery() -> Option<BatteryInfo> {
    use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

    let mut status = SYSTEM_POWER_STATUS::default();
    unsafe { GetSystemPowerStatus(&mut status).ok()? };

    // Flag 128 = no system battery, 255 = unknown percentage.
    (status.BatteryFlag != 128 && status.BatteryLifePercent != 255).then_some(BatteryInfo {
        percentage: status.BatteryLifePercent,
        is_charging: (status.BatteryFlag & 8) != 0,
    })
}

// --- loops ------------------------------------------------------------------

fn system_loop(mut output: mpsc::Sender<Event>) {
    let com = COMLibrary::new().ok();
    let wmi = com.and_then(|com| WMIConnection::new(com).ok());
    let security_wmi = com.and_then(|com| WMIConnection::with_namespace_path("ROOT\\SecurityCenter2", com).ok());
    let thermal_wmi = com.and_then(|com| WMIConnection::with_namespace_path("ROOT\\WMI", com).ok());

    let gpu = read_selected_gpu_adapter();
    let ram_modules = wmi.as_ref().map(query_ram_modules).unwrap_or_default();

    let mut sys = System::new_with_specifics(
        RefreshKind::nothing()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );
    sys.refresh_cpu_all();
    std::thread::sleep(Duration::from_millis(500));

    let cpu_name = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());
    let cpu_cores = sys.cpus().len();

    let mut networks = Networks::new_with_refreshed_list();
    let mut interface_kinds: HashMap<String, InterfaceKind> = HashMap::new();
    let mut last_received = 0u64;
    let mut last_transmitted = 0u64;
    for (name, data) in networks.list() {
        if !is_virtual_interface(name) {
            last_received += data.total_received();
            last_transmitted += data.total_transmitted();
        }
    }
    let mut last_check = Instant::now();

    let long_ago = |secs| Instant::now().checked_sub(Duration::from_secs(secs)).unwrap_or_else(Instant::now);
    let mut last_security_check = long_ago(120);
    let mut last_gpu_check = long_ago(10);
    let mut last_thermal_check = long_ago(10);

    let mut security = SecurityInfo::default();
    let mut gpu_usage = 0.0f32;
    let mut vram_used = 0u64;
    let mut temperatures = (None, None);
    let mut tick: u32 = 0;

    loop {
        if !ACTIVE.load(Ordering::Relaxed) {
            std::thread::sleep(Duration::from_secs(2));
            continue;
        }

        tick = tick.wrapping_add(1);
        sys.refresh_cpu_usage();
        sys.refresh_memory();
        // Re-enumerate adapters now and then to catch a new connection.
        networks.refresh(tick == 1 || tick.is_multiple_of(30));

        let cpu_usage = sys.global_cpu_usage();

        let mut total_received = 0u64;
        let mut total_transmitted = 0u64;
        let mut interfaces = Vec::new();
        for (name, data) in networks.list() {
            if is_virtual_interface(name) {
                continue;
            }
            total_received += data.total_received();
            total_transmitted += data.total_transmitted();
            interfaces.push(NetworkInterface {
                name: name.clone(),
                received: data.total_received(),
                transmitted: data.total_transmitted(),
                kind: *interface_kinds.entry(name.clone()).or_insert_with(|| classify_interface(name)),
            });
        }

        let elapsed = last_check.elapsed().as_secs_f64();
        let megabytes_per_second = |now: u64, before: u64| {
            if elapsed > 0.0 && last_received > 0 {
                now.saturating_sub(before) as f64 / elapsed / 1024.0 / 1024.0
            } else {
                0.0
            }
        };
        let download_speed = megabytes_per_second(total_received, last_received);
        let upload_speed = megabytes_per_second(total_transmitted, last_transmitted);
        last_received = total_received;
        last_transmitted = total_transmitted;
        last_check = Instant::now();

        // The GPU counters are the expensive WMI query: back off when the machine is idle.
        let gpu_interval = if cpu_usage < 15.0 && gpu_usage < 5.0 { 6 } else { 2 };
        if last_gpu_check.elapsed() >= Duration::from_secs(gpu_interval) {
            if let Some(wmi) = &wmi {
                (gpu_usage, vram_used) = read_gpu_wmi_metrics(wmi, &gpu);
            }
            last_gpu_check = Instant::now();
        }

        // Thermal zones move slowly; one query serves both the CPU and GPU badges.
        if last_thermal_check.elapsed() >= Duration::from_secs(5) {
            temperatures = thermal_wmi.as_ref().map(query_temperatures).unwrap_or((None, None));
            last_thermal_check = Instant::now();
        }

        if last_security_check.elapsed() >= Duration::from_secs(60) {
            security = security::fetch_antivirus_status_with_wmi(security_wmi.as_ref());
            last_security_check = Instant::now();
        }

        let has_gpu = gpu.vram_total > 0;
        let info = SystemInfo {
            cpu: CpuInfo {
                name: cpu_name.clone(),
                cores: cpu_cores,
                usage: cpu_usage,
                per_core_usage: sys.cpus().iter().map(|c| c.cpu_usage()).collect(),
                frequency: sys.cpus().first().map(|c| c.frequency()).unwrap_or(0),
                temperature: temperatures.0,
            },
            memory: MemoryInfo {
                total: sys.total_memory(),
                used: sys.used_memory(),
                available: sys.available_memory(),
                usage_percent: if sys.total_memory() > 0 {
                    sys.used_memory() as f32 / sys.total_memory() as f32 * 100.0
                } else {
                    0.0
                },
                modules: ram_modules.clone(),
            },
            gpu: vec![GpuInfo {
                name: gpu.name.clone(),
                usage: if has_gpu { gpu_usage } else { 0.0 },
                memory_used: if has_gpu { vram_used } else { 0 },
                memory_total: gpu.vram_total,
                temperature: if has_gpu { temperatures.1 } else { None },
            }],
            network: NetworkInfo {
                download_speed,
                upload_speed,
                total_received,
                total_transmitted,
                interfaces,
            },
            uptime: System::uptime(),
            security: security.clone(),
            battery: read_battery(),
        };

        match output.try_send(Event::System(Box::new(info))) {
            Err(error) if error.is_disconnected() => return,
            _ => {}
        }

        std::thread::sleep(Duration::from_millis(INTERVAL_MS.load(Ordering::Relaxed)));
    }
}

fn gaming_latency_loop(mut output: mpsc::Sender<Event>) {
    let mut tracker = GamingLatencyTracker::new();

    loop {
        if ACTIVE.load(Ordering::Relaxed) {
            match output.try_send(Event::GamingLatency(tracker.sample())) {
                Err(error) if error.is_disconnected() => return,
                _ => {}
            }
        }
        std::thread::sleep(Duration::from_secs(2));
    }
}

/// Telemetry and gaming-latency events, each sampled on its own thread.
pub fn stream() -> impl Stream<Item = Event> {
    let (sender, receiver) = mpsc::channel(16);

    let system_sender = sender.clone();
    std::thread::spawn(move || system_loop(system_sender));
    std::thread::spawn(move || gaming_latency_loop(sender));

    receiver
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn luid_fragment_matches_wmi_engine_names() {
        let frag = format_luid_wmi_fragment(0, 0x1234);
        assert_eq!(frag, "luid_0x00000000_0x00001234");
        let name = "pid_1234_luid_0x00000000_0x00001234_phys_0_engtype_3D";
        assert!(name.to_ascii_lowercase().contains(&frag));
    }

    #[test]
    fn utilization_uses_max_not_sum_on_adapter() {
        let luid = format_luid_wmi_fragment(0, 0xabcd);
        let engines = vec![
            (format!("pid_1_{luid}_phys_0_engtype_3D"), 40),
            (format!("pid_2_{luid}_phys_0_engtype_3D"), 25),
            (format!("pid_3_{luid}_phys_0_engtype_Compute"), 55),
        ];
        assert_eq!(aggregate_adapter_gpu_utilization(&engines, &luid), 55.0);
    }

    #[test]
    fn utilization_filters_other_adapters() {
        let luid = format_luid_wmi_fragment(0, 0x0001);
        let other = format_luid_wmi_fragment(0, 0x0002);
        let engines = vec![
            (format!("pid_1_{other}_phys_1_engtype_3D"), 90),
            (format!("pid_2_{luid}_phys_0_engtype_3D"), 12),
        ];
        assert_eq!(aggregate_adapter_gpu_utilization(&engines, &luid), 12.0);
    }

    #[test]
    fn vram_prefers_selected_adapter() {
        let luid = format_luid_wmi_fragment(0, 0x00aa);
        let other = format_luid_wmi_fragment(0, 0x00bb);
        let memories = vec![
            (format!("adapter_{other}"), 8_000_000_000),
            (format!("adapter_{luid}"), 2_000_000_000),
        ];
        assert_eq!(vram_used_for_adapter(&memories, &luid), 2_000_000_000);
    }

    #[test]
    fn thermal_zone_rejects_out_of_range_readings() {
        let zone = |kelvin_tenths| ThermalZoneTemperature { instance_name: String::new(), current_temperature: kelvin_tenths };
        assert!(zone_celsius(&zone(2000)).is_none());
        assert!((zone_celsius(&zone(3232)).unwrap() - 50.05).abs() < 0.01);
    }
}
