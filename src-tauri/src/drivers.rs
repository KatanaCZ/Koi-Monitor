use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriverInfo {
    pub name: String,
    pub version: String,
    pub date: String,
    pub provider: String,
    pub status: String,
    pub category: String,
    pub hardware_id: String,
    pub update_url: String,
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
    "webcam", "camera", "printer", "scanner", "fax", "composite", "usb hub",
    "gamepad", "joystick", "game controller", "xbox",
    
    // Audio endpoints (casques, micros simples, hd audio)
    "headset", "headphone", "hands-free", "handsfree", "earphone", "bluetooth audio",
    "high definition audio", "streaming audio", "usb audio", "lightspeed",
    
    // Generic Bluetooth & Network
    "a2dp", "personal area network", "bth", "avrcp",
    
    // Generic
    "generic software", "microsoft basic", "remote desktop", "system timer",
];

pub fn get_driver_list(simplified: bool) -> Result<Vec<DriverInfo>, String> {
    let mut drivers = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let ps_script = r#"
$classes = @('Display','Net','Media','MEDIA')
Get-CimInstance Win32_PnPSignedDriver | Where-Object {
    $_.DeviceName -ne $null -and
    $_.DriverVersion -ne $null -and
    $_.DeviceClass -in $classes
} | Select-Object DeviceName, DriverVersion,
    @{N='Date';E={if($_.DriverDate){$_.DriverDate.ToString('yyyy-MM-dd')}else{'N/A'}}},
    DriverProviderName, DeviceClass, HardwareID | ConvertTo-Json -Depth 3
"#;

        let output = Command::new("powershell")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_script])
            .creation_flags(0x08000000)
            .output();

        match output {
            Ok(result) => {
                if let Ok(stdout) = String::from_utf8(result.stdout) {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
                        let items: Vec<&serde_json::Value> = if json.is_array() {
                            json.as_array().unwrap().iter().collect()
                        } else {
                            vec![&json]
                        };

                        for d in items {
                            let name = d["DeviceName"].as_str().unwrap_or("Unknown").to_string();
                            let name_lower = name.to_lowercase();

                            if BLACKLIST.iter().any(|b| name_lower.contains(b)) {
                                continue;
                            }

                            let version = d["DriverVersion"].as_str().unwrap_or("N/A").to_string();
                            let date = d["Date"].as_str().unwrap_or("N/A").to_string();
                            let provider = d["DriverProviderName"].as_str().unwrap_or("Unknown").to_string();
                            let class = d["DeviceClass"].as_str().unwrap_or("Other");
                            let hw_id = d["HardwareID"].as_str().unwrap_or("").to_string();

                            let status = eval_status(&version, &date);
                            let update_url = make_update_url(&provider, &name, &hw_id);
                            let category = match class {
                                "Display" => "Graphics",
                                "Net" => "Network",
                                "HDC" | "SCSIAdapter" => "Storage",
                                "Media" | "MEDIA" => "Audio",
                                "Bluetooth" => "Bluetooth",
                                "Firmware" => "Firmware",
                                _ => class,
                            };

                            drivers.push(DriverInfo {
                                name,
                                version,
                                date,
                                provider,
                                status,
                                category: category.to_string(),
                                hardware_id: hw_id,
                                update_url,
                            });
                        }
                    }
                }
            }
            Err(e) => return Err(format!("Failed to get drivers: {}", e)),
        }
    }

    if simplified {
        drivers.retain(|d| {
            matches!(d.category.as_str(), "Graphics" | "Network" | "Bluetooth")
        });
    }

    drivers.sort_by(|a, b| a.category.cmp(&b.category).then(a.name.cmp(&b.name)));
    drivers.dedup_by(|a, b| a.name == b.name);

    if drivers.is_empty() {
        drivers.push(DriverInfo {
            name: "No hardware drivers detected".to_string(),
            version: "N/A".to_string(),
            date: "N/A".to_string(),
            provider: "System".to_string(),
            status: "Unknown".to_string(),
            category: "System".to_string(),
            hardware_id: String::new(),
            update_url: String::new(),
        });
    }

    Ok(drivers)
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