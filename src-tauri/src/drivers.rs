use serde::{Deserialize, Serialize};
use crate::subprocess::run_powershell_with_timeout;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriverInfo {
    pub name: String,
    pub version: String,
    pub latest_version: String,
    pub date: String,
    pub provider: String,
    pub status: String,
    pub category: String,
    pub hardware_id: String,
    #[serde(default)]
    pub hardware_ids: Vec<String>,
    pub update_url: String,
    #[serde(default)]
    pub update_source: String,
}

const BLACKLIST: &[&str] = &[
    // Virtual & VPN
    "virtual", "vbox", "vmware", "hyper-v", "wan miniport", "teredo",
    "isatap", "6to4", "debug", "loopback", "root enumerator", "vpn",
    "tap-windows", "wireguard", "zerotier", "cisco", "fortinet", "sonicwall",
    "ndis", "miniport", "wan ", "ras async", "pptp", "l2tp", "sstp", "ikev2",
    "mac bridge", "wi-fi direct", "virtual adapter", "pci-e virtual",

    // Peripherals
    "mouse", "keyboard", "hid-compliant", "hid ", "touchpad", "trackpad",
    "webcam", "printer", "scanner", "fax", "usb hub",
    "gamepad", "joystick", "game controller", "xbox",

    // Audio endpoints (casques, micros simples, hd audio)
    "headset", "headphone", "hands-free", "handsfree", "earphone", "bluetooth audio",
    "streaming audio", "usb audio", "lightspeed",
    "stereo mix", "line in", "line out", "digital output", "speakers (",
    "microphone (", "hands free", "ag audio", "wave mapper", "legacy audio",
    "nvidia virtual audio", "nvidia high definition audio",

    // Generic Bluetooth & Network
    "a2dp", "personal area network", "avrcp", "identification service", "rfcomm",
    "bthhfenum", "bthenum", "bluetooth low energy",

    // Generic / software / bus
    "generic software", "microsoft basic", "remote desktop", "system timer",
    "software component", "software device", "root enumerator", "bus enumerator",
    "usb root hub", "usb4 root", "usb composite device", "generic volume", "volume shadow",
    "standard pci",
    "microsoft device", "microsoft streaming", "monitor ", " edid",
    "amdpsp", "amdgpio", "amdappcompat", "amd3dvcache", "amdfdans", "amdvlk",
    "amdwin-", "amdppkg", "amdxe", "amdfendr", "amdsdw", "amdpcidev", "amdafd",
    "amdi2c", "smbusamd", "amdpcibridge",
];

const SIMPLIFIED_CATEGORIES: &[&str] = &["Graphics", "Network", "Bluetooth"];
const FULL_MODE_CATEGORIES: &[&str] =
    &["Graphics", "Network", "Bluetooth", "Audio", "Storage", "Firmware"];

const WMI_DEVICE_CLASSES_FULL: &[&str] = &[
    "Display", "Net", "Media", "MEDIA", "Bluetooth", "SCSIAdapter", "HDC", "FIRMWARE",
];

fn build_driver_scan_script(classes: &[&str]) -> String {
    let class_filter = classes
        .iter()
        .map(|class_name| format!("DeviceClass='{class_name}'"))
        .collect::<Vec<_>>()
        .join(" OR ");

    format!(
        r#"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$query = "SELECT DeviceName, DriverVersion, DriverDate, DriverProviderName, DeviceClass, HardwareID FROM Win32_PnPSignedDriver WHERE {class_filter}"
Get-CimInstance -Query $query | Where-Object {{
    $_.DeviceName -ne $null -and $_.DriverVersion -ne $null
}} | Select-Object DeviceName, DriverVersion,
    @{{N='Date';E={{if($_.DriverDate){{$_.DriverDate.ToString('yyyy-MM-dd')}}else{{'N/A'}}}}}},
    DriverProviderName, DeviceClass, HardwareID | ConvertTo-Json -Depth 3
"#
    )
}

fn is_blacklisted(name: &str) -> bool {
    let name_lower = name.to_lowercase();
    BLACKLIST.iter().any(|pattern| name_lower.contains(pattern))
}

fn is_physical_driver(hw_ids: &[String]) -> bool {
    hw_ids.iter().any(|id| {
        let upper = id.to_uppercase();
        upper.starts_with("PCI\\")
            || upper.starts_with("USB\\")
            || upper.starts_with("ACPI\\")
            || upper.starts_with("SCSI\\")
            || upper.starts_with("HDAUDIO\\")
    })
}

fn is_relevant_for_full_mode(driver: &DriverInfo) -> bool {
    if !FULL_MODE_CATEGORIES.contains(&driver.category.as_str()) {
        return false;
    }

    if !driver.hardware_ids.is_empty() && !is_physical_driver(&driver.hardware_ids) {
        return false;
    }

    let name = driver.name.to_lowercase();
    let provider = driver.provider.to_lowercase();

    if provider.contains("microsoft") && driver.category == "Storage" {
        return false;
    }

    if driver.category == "Firmware" && provider.contains("microsoft") {
        return false;
    }

    if driver.category == "Audio" {
        const SKIP: &[&str] = &[
            "nvidia virtual audio",
            "usb audio",
            "realtek audio effects",
            "intel smart sound technology for usb",
            "audio endpoint",
        ];
        if SKIP.iter().any(|pattern| name.contains(pattern)) {
            return false;
        }
    }

    if driver.category == "Storage" {
        if name.contains("disk drive") || name.contains("generic") {
            return false;
        }
        if name.contains("storage spaces") {
            return false;
        }
    }

    true
}

fn is_integrated_gpu(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.contains("tm) graphics")
        || lower.contains("integrated graphics")
        || (lower.contains("radeon") && lower.contains("graphics") && !lower.contains("rx "))
}

fn is_ethernet_adapter(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.contains("ethernet")
        || lower.contains("gbe")
        || lower.contains("2.5g")
        || lower.contains("gigabit")
}

fn is_wifi_adapter(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.contains("wi-fi") || lower.contains("wifi") || lower.contains("wlan") || lower.contains("802.11")
}

fn pick_primary_in_category(drivers: &[DriverInfo], category: &str) -> Option<DriverInfo> {
    let matches: Vec<&DriverInfo> = drivers
        .iter()
        .filter(|d| d.category == category)
        .collect();

    if matches.is_empty() {
        return None;
    }

    let picked = match category {
        "Graphics" => matches
            .iter()
            .find(|d| !is_integrated_gpu(&d.name))
            .copied(),
        "Network" => matches
            .iter()
            .find(|d| is_ethernet_adapter(&d.name))
            .or_else(|| matches.iter().find(|d| is_wifi_adapter(&d.name)))
            .copied(),
        _ => matches.first().copied(),
    };

    picked.cloned()
}

fn collapse_simplified_primary(drivers: &[DriverInfo]) -> Vec<DriverInfo> {
    ["Graphics", "Network", "Bluetooth"]
        .iter()
        .filter_map(|category| pick_primary_in_category(drivers, category))
        .collect()
}

pub fn get_driver_list(simplified: bool) -> Result<Vec<DriverInfo>, String> {
    let mut drivers = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let ps_script = build_driver_scan_script(WMI_DEVICE_CLASSES_FULL);

        let output = run_powershell_with_timeout(&ps_script, 90);

        match output {
            Ok(result) => {
                if !result.status.success() {
                    let stderr = String::from_utf8_lossy(&result.stderr);
                    log::warn!("PowerShell driver scan failed: {}", stderr.trim());
                    return Err(format!(
                        "Driver scan failed (exit {}): {}",
                        result.status.code().unwrap_or(-1),
                        stderr.trim()
                    ));
                }

                if let Ok(stdout) = String::from_utf8(result.stdout) {
                    if stdout.trim().is_empty() {
                        log::warn!("PowerShell driver scan returned empty output");
                        return Err("Driver scan returned empty output".to_string());
                    }
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
                        let items: Vec<&serde_json::Value> = if let Some(arr) = json.as_array() {
                            arr.iter().collect()
                        } else {
                            vec![&json]
                        };

                        for d in items {
                            let name = d["DeviceName"].as_str().unwrap_or("Unknown").to_string();

                            if is_blacklisted(&name) {
                                continue;
                            }

                            let version = d["DriverVersion"].as_str().unwrap_or("N/A").to_string();
                            let date = d["Date"].as_str().unwrap_or("N/A").to_string();
                            let provider = d["DriverProviderName"].as_str().unwrap_or("Unknown").to_string();
                            let class = d["DeviceClass"].as_str().unwrap_or("Other");
                            let hw_ids = extract_hardware_ids(&d["HardwareID"]);
                            let hw_id = hw_ids.first().cloned().unwrap_or_default();

                            let status = eval_status(&version, &date);
                            let update_url = make_update_url(&provider, &name, &hw_id);
                            
                            let class_upper = class.to_uppercase();
                            let category = match class_upper.as_str() {
                                "DISPLAY" => "Graphics",
                                "NET" => "Network",
                                "HDC" | "SCSIADAPTER" => "Storage",
                                "MEDIA" => "Audio",
                                "BLUETOOTH" => "Bluetooth",
                                "FIRMWARE" => "Firmware",
                                _ => class,
                            };

                            drivers.push(DriverInfo {
                                name,
                                version,
                                latest_version: String::new(),
                                date,
                                provider,
                                status,
                                category: category.to_string(),
                                hardware_id: hw_id,
                                hardware_ids: hw_ids.clone(),
                                update_url,
                                update_source: String::new(),
                            });
                        }
                    } else {
                        log::warn!("PowerShell driver scan returned invalid JSON");
                        return Err("Driver scan returned invalid JSON".to_string());
                    }
                } else {
                    return Err("Driver scan returned invalid UTF-8 output".to_string());
                }
            }
            Err(e) => return Err(format!("Failed to get drivers: {e}")),
        }
    }

    if simplified {
        drivers.retain(|d| {
            SIMPLIFIED_CATEGORIES.contains(&d.category.as_str())
                && (d.hardware_ids.is_empty() || is_physical_driver(&d.hardware_ids))
        });
        drivers = collapse_simplified_primary(&drivers);
    } else {
        drivers.retain(is_relevant_for_full_mode);
    }

    drivers.sort_by(|a, b| a.category.cmp(&b.category).then(a.name.cmp(&b.name)));
    drivers.dedup_by(|a, b| a.name == b.name);

    if drivers.is_empty() {
        drivers.push(DriverInfo {
            name: "No hardware drivers detected".to_string(),
            version: "N/A".to_string(),
            latest_version: String::new(),
            date: "N/A".to_string(),
            provider: "System".to_string(),
            status: "Unknown".to_string(),
            category: "System".to_string(),
            hardware_id: String::new(),
            hardware_ids: Vec::new(),
            update_url: String::new(),
            update_source: String::new(),
        });
    }

    Ok(drivers)
}

fn extract_hardware_ids(value: &serde_json::Value) -> Vec<String> {
    match value {
        serde_json::Value::String(text) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                Vec::new()
            } else {
                vec![trimmed.to_string()]
            }
        }
        serde_json::Value::Array(values) => values
            .iter()
            .filter_map(|entry| entry.as_str())
            .map(str::trim)
            .filter(|entry| !entry.is_empty())
            .map(str::to_string)
            .collect(),
        _ => Vec::new(),
    }
}

fn eval_status(version: &str, date: &str) -> String {
    if version == "N/A" || version.is_empty() {
        return "Unknown".to_string();
    }
    if date.len() >= 4 {
        if let Ok(year) = date[..4].parse::<i32>() {
            let age = 2026 - year;
            if age > 2 { return "Verify Online".to_string(); }
        }
    }
    "Installed".to_string()
}

fn make_update_url(provider: &str, name: &str, hw_id: &str) -> String {
    let p = provider.to_lowercase();
    let n = name.to_lowercase();

    if p.contains("nvidia") || n.contains("nvidia") || n.contains("geforce") {
        return "https://www.nvidia.com/Download/index.aspx".into();
    }
    if p.contains("amd") || p.contains("ati") || n.contains("radeon") || n.contains("amd") {
        return "https://www.amd.com/en/support".into();
    }
    if p.contains("intel") || n.contains("intel") {
        return "https://www.intel.com/content/www/us/en/download-center/home.html".into();
    }
    if p.contains("realtek") || n.contains("realtek") {
        return "https://www.realtek.com/en/downloads".into();
    }
    if p.contains("broadcom") || n.contains("broadcom") {
        return "https://www.broadcom.com/support/download-search".into();
    }
    if p.contains("qualcomm") || n.contains("qualcomm") || n.contains("atheros") {
        return "https://www.qualcomm.com/support".into();
    }
    if p.contains("mediatek") || n.contains("mediatek") {
        return "https://www.mediatek.com/products/connectivity-and-networking".into();
    }
    if p.contains("samsung") || n.contains("samsung") {
        return "https://semiconductor.samsung.com/consumer-storage/support/downloads/".into();
    }
    if !hw_id.is_empty() {
        let q = hw_id.replace('&', "%26").replace('\\', "%5C");
        return format!("https://www.catalog.update.microsoft.com/Search.aspx?q={}", q);
    }
    format!("https://www.google.com/search?q={}+driver+download", name.replace(' ', "+"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample(name: &str, category: &str) -> DriverInfo {
        DriverInfo {
            name: name.into(),
            version: "1.0".into(),
            latest_version: String::new(),
            date: "2026-01-01".into(),
            provider: "Test".into(),
            status: "Installed".into(),
            category: category.into(),
            hardware_id: String::new(),
            hardware_ids: vec![],
            update_url: String::new(),
            update_source: String::new(),
        }
    }

    #[test]
    fn simplified_collapses_to_one_primary_per_category() {
        let input = vec![
            sample("AMD Radeon RX 7900 XTX", "Graphics"),
            sample("AMD Radeon(TM) Graphics", "Graphics"),
            sample("Realtek Gaming 2.5GbE Family Controller", "Network"),
            sample("RZ608 Wi-Fi 6E 80MHz", "Network"),
            sample("RZ608 Bluetooth(R) Adapter", "Bluetooth"),
        ];

        let collapsed = collapse_simplified_primary(&input);
        assert_eq!(collapsed.len(), 3);
        assert_eq!(collapsed[0].name, "AMD Radeon RX 7900 XTX");
        assert_eq!(collapsed[1].name, "Realtek Gaming 2.5GbE Family Controller");
        assert_eq!(collapsed[2].name, "RZ608 Bluetooth(R) Adapter");
    }
}