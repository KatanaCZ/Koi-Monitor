use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, Networks, RefreshKind, System};

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
mod drivers;

pub use dns::*;
pub use drivers::*;


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub gpu: Vec<GpuInfo>,
    pub network: NetworkInfo,
    pub uptime: u64,
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
        }
    }
}

type MonitorState = Arc<Mutex<SharedMonitorState>>;

#[tauri::command]
async fn get_system_info(state: tauri::State<'_, MonitorState>) -> Result<SystemInfo, String> {
    let monitor = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    let cpu_info = CpuInfo {
        name: monitor.cpu_name.clone(),
        cores: monitor.cpu_cores,
        usage: monitor.cpu_usage,
        per_core_usage: monitor.per_core_usage.clone(),
        frequency: monitor.cpu_frequency,
    };

    let memory_info = monitor.memory.clone();

    let network_info = NetworkInfo {
        download_speed: monitor.download_speed,
        upload_speed: monitor.upload_speed,
        total_received: monitor.total_received,
        total_transmitted: monitor.total_transmitted,
        interfaces: monitor.interfaces.clone(),
    };

    let gpu_info = monitor.gpus.clone();
    let uptime = monitor.uptime;

    drop(monitor);

    Ok(SystemInfo {
        cpu: cpu_info,
        memory: memory_info,
        gpu: gpu_info,
        network: network_info,
        uptime,
    })
}


#[tauri::command]
async fn ping_all_dns() -> Result<Vec<DnsResult>, String> {
    dns::ping_all_dns_servers().await
}

#[tauri::command]
async fn get_drivers() -> Result<Vec<DriverInfo>, String> {
    drivers::get_driver_list(false)
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
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            ping_all_dns,
            get_drivers
        ])
        .setup(move |_app| {
            log::info!("Application setup complete");

            let state = bg_state;

            std::thread::spawn(move || {
                #[cfg(target_os = "windows")]
                let com_con = COMLibrary::new().ok();
                #[cfg(target_os = "windows")]
                let wmi_con = com_con.as_ref().and_then(|com| WMIConnection::new(*com).ok());

                let mut sys = System::new_with_specifics(
                    RefreshKind::nothing()
                        .with_cpu(CpuRefreshKind::everything())
                        .with_memory(MemoryRefreshKind::everything())
                );

                // Initial refresh + sleep so CPU usage reads are accurate
                sys.refresh_cpu_all();
                std::thread::sleep(std::time::Duration::from_millis(500));

                let mut networks = Networks::new_with_refreshed_list();
                let mut last_net_received: u64 = 0;
                let mut last_net_transmitted: u64 = 0;
                let mut last_check = std::time::Instant::now();

                // Get initial totals
                for data in networks.list().values() {
                    last_net_received += data.total_received();
                    last_net_transmitted += data.total_transmitted();
                }

                loop {
                    sys.refresh_cpu_all();
                    sys.refresh_memory();
                    networks.refresh(true);

                    let cpu_usage = sys.global_cpu_usage();
                    let per_core: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();
                    let cpu_name = sys.cpus().first().map(|c| c.brand().to_string()).unwrap_or_else(|| "Unknown".to_string());
                    let cpu_cores = sys.cpus().len();
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
                        total_received += data.total_received();
                        total_transmitted += data.total_transmitted();
                        ifaces.push(NetworkInterface {
                            name: name.clone(),
                            received: data.total_received(),
                            transmitted: data.total_transmitted(),
                        });
                    }

                    let elapsed = last_check.elapsed().as_secs_f64();
                    let (dl_speed, ul_speed) = if elapsed > 0.0 && last_net_received > 0 {
                        let dl = ((total_received.saturating_sub(last_net_received)) as f64 / elapsed) / 1024.0 / 1024.0;
                        let ul = ((total_transmitted.saturating_sub(last_net_transmitted)) as f64 / elapsed) / 1024.0 / 1024.0;
                        (dl, ul)
                    } else {
                        (0.0, 0.0)
                    };

                    last_net_received = total_received;
                    last_net_transmitted = total_transmitted;
                    last_check = std::time::Instant::now();

                    let mut current_gpus = Vec::new();
                    
                    #[cfg(target_os = "windows")]
                    {
                        let mut gpu_name = "Unknown GPU".to_string();
                        let mut vram_total = 0;
                        
                        unsafe {
                            if let Ok(factory) = CreateDXGIFactory1::<IDXGIFactory4>() {
                                if let Ok(adapter) = factory.EnumAdapters1(0) {
                                    if let Ok(adapter3) = adapter.cast::<IDXGIAdapter3>() {
                                        if let Ok(desc) = adapter3.GetDesc1() {
                                            gpu_name = String::from_utf16_lossy(&desc.Description).trim_end_matches('\0').to_string();
                                            vram_total = desc.DedicatedVideoMemory as u64;
                                        }
                                    }
                                }
                            }
                        }
                        
                        let mut gpu_usage = 0.0;
                        let mut vram_used = 0;
                        
                        if let Some(wmi) = &wmi_con {
                            if let Ok(results) = wmi.query::<GpuEngine>() {
                                let mut total_util = 0;
                                for res in results {
                                    if res.name.contains("engtype_3D") {
                                        total_util += res.utilization_percentage;
                                    }
                                }
                                gpu_usage = (total_util as f32).min(100.0);
                            }
                            
                            if let Ok(results) = wmi.query::<GpuMemory>() {
                                let mut total_mem = 0;
                                for res in results {
                                    total_mem += res.dedicated_usage;
                                }
                                vram_used = total_mem;
                            }
                        }
                        
                        if vram_total > 0 {
                            current_gpus.push(GpuInfo {
                                name: gpu_name,
                                usage: gpu_usage,
                                memory_used: vram_used,
                                memory_total: vram_total,
                                temperature: None,
                            });
                        }
                    }
                    
                    if current_gpus.is_empty() {
                        current_gpus.push(GpuInfo {
                            name: "GPU Info Unavailable".to_string(),
                            usage: 0.0,
                            memory_used: 0,
                            memory_total: 0,
                            temperature: None,
                        });
                    }

                    // Update shared state
                    if let Ok(mut s) = state.lock() {
                        s.cpu_usage = cpu_usage;
                        s.per_core_usage = per_core;
                        s.cpu_name = cpu_name;
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
                    }

                    std::thread::sleep(std::time::Duration::from_secs(2));
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}