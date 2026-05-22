use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, Networks, RefreshKind, System};
use tauri::Emitter;
use tauri::Manager;

#[cfg(target_os = "windows")]
use windows::core::Interface;
#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Dxgi::*;
#[cfg(target_os = "windows")]
use wmi::{COMLibrary, WMIConnection};

#[cfg(target_os = "windows")]
#[derive(serde::Deserialize, Debug)]
#[serde(rename = "Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine")]
#[serde(rename_all = "PascalCase")]
struct GpuEngine {
    name: String,
    utilization_percentage: u32,
}

#[cfg(target_os = "windows")]
#[derive(serde::Deserialize, Debug)]
#[serde(rename = "Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory")]
#[serde(rename_all = "PascalCase")]
struct GpuMemory {
    dedicated_usage: u64,
}

mod dns;
mod driver_version;
#[cfg(target_os = "windows")]
mod driver_store;
#[cfg(target_os = "windows")]
mod driver_updates;
mod drivers;
mod gaming_latency;
mod security;

pub use dns::*;
pub use drivers::*;
pub use gaming_latency::*;
pub use security::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub gpu: Vec<GpuInfo>,
    pub network: NetworkInfo,
    pub uptime: u64,
    pub security: SecurityInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuInfo {
    pub name: String,
    pub cores: usize,
    pub usage: f32,
    pub per_core_usage: Vec<f32>,
    pub frequency: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryInfo {
    pub total: u64,
    pub used: u64,
    pub available: u64,
    pub usage_percent: f32,
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
    pub download_speed: f64,
    pub upload_speed: f64,
    pub total_received: u64,
    pub total_transmitted: u64,
    pub interfaces: Vec<NetworkInterface>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInterface {
    pub name: String,
    pub received: u64,
    pub transmitted: u64,
    pub kind: String,
}

fn is_virtual_interface(name: &str) -> bool {
    let n = name.to_lowercase();
    n.contains("loopback")
        || n == "lo"
        || n.contains("virtual")
        || n.contains("vethernet")
        || n.contains("vmware")
        || n.contains("virtualbox")
        || n.contains("hyper-v")
        || n.contains("docker")
        || n.contains("veth")
        || n.contains("npcap")
        || n.contains("bluetooth")
        || n.contains("tunnel")
        || n.contains("pseudo")
        || n.contains("wan miniport")
        || n.contains("teredo")
        || n.contains("isatap")
        || n.contains("hamachi")
        || n.contains("zerotier")
        || n.contains("tailscale")
        || n.contains("wireguard")
}

fn classify_interface(name: &str) -> &'static str {
    let n = name.to_lowercase();
    if n.contains("wi-fi")
        || n.contains("wifi")
        || n.contains("wlan")
        || n.contains("wireless")
        || n.contains("802.11")
    {
        "wifi"
    } else if n.contains("ethernet")
        || n.contains("gigabit")
        || n.contains("connexion au réseau local")
        || n.contains("local area connection")
        || n.contains(" 2.5g")
        || n.contains("gbe")
    {
        "ethernet"
    } else {
        "other"
    }
}

#[cfg(target_os = "windows")]
fn read_dxgi_gpu_static() -> (String, u64) {
    let mut gpu_name = "Unknown GPU".to_string();
    let mut vram_total = 0u64;

    unsafe {
        if let Ok(factory) = CreateDXGIFactory1::<IDXGIFactory4>() {
            if let Ok(adapter) = factory.EnumAdapters1(0) {
                if let Ok(adapter3) = adapter.cast::<IDXGIAdapter3>() {
                    if let Ok(desc) = adapter3.GetDesc1() {
                        gpu_name = String::from_utf16_lossy(&desc.Description)
                            .trim_end_matches('\0')
                            .to_string();
                        vram_total = desc.DedicatedVideoMemory as u64;
                    }
                }
            }
        }
    }

    (gpu_name, vram_total)
}

#[cfg(not(target_os = "windows"))]
fn read_dxgi_gpu_static() -> (String, u64) {
    ("GPU Info Unavailable".to_string(), 0)
}

#[cfg(target_os = "windows")]
fn read_gpu_wmi_metrics(wmi: &WMIConnection) -> (f32, u64) {
    let mut gpu_usage = 0.0f32;
    let mut vram_used = 0u64;

    if let Ok(results) = wmi.query::<GpuEngine>() {
        let mut total_util = 0u32;
        for res in results {
            if res.name.contains("engtype_3D") {
                total_util += res.utilization_percentage;
            }
        }
        gpu_usage = (total_util as f32).min(100.0);
    }

    if let Ok(results) = wmi.query::<GpuMemory>() {
        let mut total_mem = 0u64;
        for res in results {
            total_mem += res.dedicated_usage;
        }
        vram_used = total_mem;
    }

    (gpu_usage, vram_used)
}

/// Shared state between background thread and tauri commands
#[derive(Debug, Clone)]
struct SharedMonitorState {
    cpu_usage: f32,
    per_core_usage: Vec<f32>,
    cpu_name: String,
    cpu_cores: usize,
    cpu_frequency: u64,
    memory: MemoryInfo,
    download_speed: f64,
    upload_speed: f64,
    total_received: u64,
    total_transmitted: u64,
    interfaces: Vec<NetworkInterface>,
    gpus: Vec<GpuInfo>,
    uptime: u64,
    security: SecurityInfo,
}

impl Default for SharedMonitorState {
    fn default() -> Self {
        Self {
            cpu_usage: 0.0,
            per_core_usage: Vec::new(),
            cpu_name: "Loading...".to_string(),
            cpu_cores: 0,
            cpu_frequency: 0,
            memory: MemoryInfo {
                total: 0,
                used: 0,
                available: 0,
                usage_percent: 0.0,
            },
            download_speed: 0.0,
            upload_speed: 0.0,
            total_received: 0,
            total_transmitted: 0,
            interfaces: Vec::new(),
            gpus: Vec::new(),
            uptime: 0,
            security: SecurityInfo::default(),
        }
    }
}

type MonitorState = Arc<Mutex<SharedMonitorState>>;

struct CachedDrivers {
    drivers: Vec<DriverInfo>,
    fetched_at: std::time::Instant,
}

struct DriverCacheState {
    inner: Mutex<HashMap<bool, CachedDrivers>>,
}

#[derive(Clone)]
pub struct GamingLatencyState {
    inner: Arc<Mutex<GamingLatencySnapshot>>,
}

impl Default for GamingLatencyState {
    fn default() -> Self {
        Self {
            inner: Arc::new(Mutex::new(GamingLatencySnapshot::default())),
        }
    }
}

const DRIVER_CACHE_TTL: std::time::Duration = std::time::Duration::from_secs(300);

const TELEMETRY_EVENT: &str = "telemetry-update";

fn system_info_from_state(m: &SharedMonitorState) -> SystemInfo {
    SystemInfo {
        cpu: CpuInfo {
            name: m.cpu_name.clone(),
            cores: m.cpu_cores,
            usage: m.cpu_usage,
            per_core_usage: m.per_core_usage.clone(),
            frequency: m.cpu_frequency,
        },
        memory: m.memory.clone(),
        network: NetworkInfo {
            download_speed: m.download_speed,
            upload_speed: m.upload_speed,
            total_received: m.total_received,
            total_transmitted: m.total_transmitted,
            interfaces: m.interfaces.clone(),
        },
        gpu: m.gpus.clone(),
        uptime: m.uptime,
        security: m.security.clone(),
    }
}

#[tauri::command]
fn get_gaming_latency(
    state: tauri::State<'_, GamingLatencyState>,
) -> Result<GamingLatencySnapshot, String> {
    state
        .inner
        .lock()
        .map(|snapshot| snapshot.clone())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_system_info(state: tauri::State<'_, MonitorState>) -> Result<SystemInfo, String> {
    let monitor = {
        let guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;
        guard.clone()
    };

    Ok(system_info_from_state(&monitor))
}

#[tauri::command]
async fn ping_all_dns(servers: Option<Vec<DnsServer>>) -> Result<Vec<DnsResult>, String> {
    dns::ping_all_dns_servers(servers).await
}

#[tauri::command]
async fn get_drivers(
    simplified: bool,
    force: Option<bool>,
    cache: tauri::State<'_, DriverCacheState>,
) -> Result<Vec<DriverInfo>, String> {
    if force != Some(true) {
        if let Ok(guard) = cache.inner.lock() {
            if let Some(entry) = guard.get(&simplified) {
                if entry.fetched_at.elapsed() < DRIVER_CACHE_TTL {
                    return Ok(entry.drivers.clone());
                }
            }
        }
    }

    let drivers = tauri::async_runtime::spawn_blocking(move || drivers::get_driver_list(simplified))
        .await
        .map_err(|e| format!("Driver scan task failed: {}", e))??;

    if let Ok(mut guard) = cache.inner.lock() {
        guard.insert(
            simplified,
            CachedDrivers {
                drivers: drivers.clone(),
                fetched_at: std::time::Instant::now(),
            },
        );
    }

    Ok(drivers)
}

#[tauri::command]
async fn open_windows_update() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(driver_updates::open_windows_update_settings)
        .await
        .map_err(|error| format!("Windows Update task failed: {}", error))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    log::info!("Starting Koi Monitor");

    let shared_state: MonitorState = Arc::new(Mutex::new(SharedMonitorState::default()));
    let bg_state = shared_state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(shared_state)
        .manage(DriverCacheState {
            inner: Mutex::new(HashMap::new()),
        })
        .manage(GamingLatencyState::default())
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            ping_all_dns,
            get_gaming_latency,
            get_drivers,
            open_windows_update
        ])
        .setup(move |app| {
            log::info!("Application setup complete");

            let app_handle = app.handle().clone();
            let state = bg_state;

            let gaming_latency_state = app.state::<GamingLatencyState>().inner.clone();
            let gaming_app_handle = app.handle().clone();

            std::thread::spawn(move || {
                let mut gaming_tracker = GamingLatencyTracker::new();

                loop {
                    let snapshot = gaming_tracker.sample();
                    if let Ok(mut cached) = gaming_latency_state.lock() {
                        *cached = snapshot.clone();
                    }
                    let _ = gaming_app_handle.emit(GAMING_LATENCY_EVENT, &snapshot);
                    std::thread::sleep(std::time::Duration::from_secs(2));
                }
            });

            std::thread::spawn(move || {
                #[cfg(target_os = "windows")]
                let com_con = COMLibrary::new().ok();
                #[cfg(target_os = "windows")]
                let wmi_con = com_con.as_ref().and_then(|com| WMIConnection::new(*com).ok());
                #[cfg(target_os = "windows")]
                let security_wmi = com_con.as_ref().and_then(|com| {
                    WMIConnection::with_namespace_path("ROOT\\SecurityCenter2", *com).ok()
                });

                let (cached_gpu_name, cached_vram_total) = read_dxgi_gpu_static();

                let mut sys = System::new_with_specifics(
                    RefreshKind::nothing()
                        .with_cpu(CpuRefreshKind::everything())
                        .with_memory(MemoryRefreshKind::everything()),
                );

                sys.refresh_cpu_all();
                std::thread::sleep(std::time::Duration::from_millis(500));

                let cpu_name = sys
                    .cpus()
                    .first()
                    .map(|c| c.brand().to_string())
                    .unwrap_or_else(|| "Unknown".to_string());
                let cpu_cores = sys.cpus().len();

                let mut networks = Networks::new_with_refreshed_list();
                let mut last_net_received: u64 = 0;
                let mut last_net_transmitted: u64 = 0;
                let mut last_check = std::time::Instant::now();
                let mut last_security_check = std::time::Instant::now()
                    .checked_sub(std::time::Duration::from_secs(120))
                    .unwrap_or_else(std::time::Instant::now);
                let mut last_gpu_wmi = std::time::Instant::now()
                    .checked_sub(std::time::Duration::from_secs(10))
                    .unwrap_or_else(std::time::Instant::now);
                let gpu_wmi_interval = std::time::Duration::from_secs(2);

                let mut gpu_usage = 0.0f32;
                let mut vram_used = 0u64;
                let mut interface_kinds: HashMap<String, String> = HashMap::new();
                let mut tick: u32 = 0;

                for (name, data) in networks.list() {
                    if is_virtual_interface(name) {
                        continue;
                    }
                    last_net_received += data.total_received();
                    last_net_transmitted += data.total_transmitted();
                }

                loop {
                    tick = tick.wrapping_add(1);
                    sys.refresh_cpu_usage();
                    sys.refresh_memory();

                    if tick == 1 || tick.is_multiple_of(30) {
                        networks.refresh(true);
                    } else {
                        networks.refresh(false);
                    }

                    let cpu_usage = sys.global_cpu_usage();
                    let per_core: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();
                    let cpu_freq = sys.cpus().first().map(|c| c.frequency()).unwrap_or(0);

                    let memory = MemoryInfo {
                        total: sys.total_memory(),
                        used: sys.used_memory(),
                        available: sys.available_memory(),
                        usage_percent: if sys.total_memory() > 0 {
                            (sys.used_memory() as f32 / sys.total_memory() as f32) * 100.0
                        } else {
                            0.0
                        },
                    };

                    let mut total_received: u64 = 0;
                    let mut total_transmitted: u64 = 0;
                    let mut ifaces = Vec::new();

                    for (name, data) in networks.list() {
                        if is_virtual_interface(name) {
                            continue;
                        }
                        total_received += data.total_received();
                        total_transmitted += data.total_transmitted();

                        let kind = interface_kinds
                            .entry(name.to_string())
                            .or_insert_with(|| classify_interface(name).to_string())
                            .clone();

                        ifaces.push(NetworkInterface {
                            name: name.clone(),
                            received: data.total_received(),
                            transmitted: data.total_transmitted(),
                            kind,
                        });
                    }

                    let elapsed = last_check.elapsed().as_secs_f64();
                    let (dl_speed, ul_speed) = if elapsed > 0.0 && last_net_received > 0 {
                        let dl = ((total_received.saturating_sub(last_net_received)) as f64
                            / elapsed)
                            / 1024.0
                            / 1024.0;
                        let ul = ((total_transmitted.saturating_sub(last_net_transmitted)) as f64
                            / elapsed)
                            / 1024.0
                            / 1024.0;
                        (dl, ul)
                    } else {
                        (0.0, 0.0)
                    };

                    last_net_received = total_received;
                    last_net_transmitted = total_transmitted;
                    last_check = std::time::Instant::now();

                    #[cfg(target_os = "windows")]
                    if last_gpu_wmi.elapsed() >= gpu_wmi_interval {
                        if let Some(wmi) = &wmi_con {
                            let (usage, mem) = read_gpu_wmi_metrics(wmi);
                            gpu_usage = usage;
                            vram_used = mem;
                        }
                        last_gpu_wmi = std::time::Instant::now();
                    }

                    let mut current_gpus = Vec::new();
                    if cached_vram_total > 0 {
                        current_gpus.push(GpuInfo {
                            name: cached_gpu_name.clone(),
                            usage: gpu_usage,
                            memory_used: vram_used,
                            memory_total: cached_vram_total,
                            temperature: None,
                        });
                    } else {
                        current_gpus.push(GpuInfo {
                            name: "GPU Info Unavailable".to_string(),
                            usage: 0.0,
                            memory_used: 0,
                            memory_total: 0,
                            temperature: None,
                        });
                    }

                    let security_update =
                        if last_security_check.elapsed() >= std::time::Duration::from_secs(60) {
                            last_security_check = std::time::Instant::now();
                            Some(security::fetch_antivirus_status_with_wmi(
                                security_wmi.as_ref(),
                            ))
                        } else {
                            None
                        };

                    let telemetry_payload = if let Ok(mut s) = state.lock() {
                        s.cpu_usage = cpu_usage;
                        s.per_core_usage = per_core;
                        s.cpu_name = cpu_name.clone();
                        s.cpu_cores = cpu_cores;
                        s.cpu_frequency = cpu_freq;
                        s.memory = memory;
                        s.download_speed = dl_speed;
                        s.upload_speed = ul_speed;
                        s.total_received = total_received;
                        s.total_transmitted = total_transmitted;
                        s.interfaces = ifaces;
                        s.gpus = current_gpus;
                        s.uptime = sysinfo::System::uptime();

                        if let Some(security) = security_update {
                            s.security = security;
                        }

                        Some(system_info_from_state(&s))
                    } else {
                        None
                    };

                    if let Some(payload) = telemetry_payload {
                        let _ = app_handle.emit(TELEMETRY_EVENT, &payload);
                    }

                    std::thread::sleep(std::time::Duration::from_secs(1));
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
