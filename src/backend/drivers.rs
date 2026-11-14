use super::driver_status::{INSTALLED, UNKNOWN};
use super::subprocess::run_powershell_with_timeout;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriverInfo {
    pub name: String,
    #[serde(default)]
    pub device_id: String,
    #[serde(default)]
    pub checked_at: Option<String>,
    #[serde(default)]
    pub machine: String,
    #[serde(default)]
    pub search_error: Option<String>,
    #[serde(default)]
    pub drivers_excluded: bool,
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

const SIMPLIFIED_CATEGORIES: &[&str] = &["Graphics", "Network", "Bluetooth"];
const FULL_MODE_CATEGORIES: &[&str] = &["Graphics", "Network", "Bluetooth", "Audio", "Storage", "Firmware"];

const WMI_DEVICE_CLASSES_FULL: &[&str] =
    &["Display", "Net", "Media", "MEDIA", "Bluetooth", "SCSIAdapter", "HDC", "FIRMWARE"];

fn build_driver_scan_script(classes: &[&str]) -> String {
    let class_filter =
        classes.iter().map(|class_name| format!("DeviceClass='{class_name}'")).collect::<Vec<_>>().join(" OR ");

    format!(
        r#"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
# Metadata is optional; its failure must not hide the inventory.
$machine = ''
try {{
    $computer = Get-CimInstance Win32_ComputerSystem
    $board = Get-CimInstance Win32_BaseBoard | Select-Object -First 1
    $os = Get-CimInstance Win32_OperatingSystem
    $machine = "$($computer.Manufacturer) $($computer.Model) | $($board.Manufacturer) $($board.Product) | $($os.Caption) $($os.Version) | $($os.OSArchitecture)"
}} catch {{ }}
$policy = Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -ErrorAction SilentlyContinue
$driversExcluded = $policy.ExcludeWUDriversInQualityUpdate -eq 1
$devices = @{{}}
Get-CimInstance Win32_PnPEntity -Filter "Present=True" | ForEach-Object {{
    $devices[$_.DeviceID] = @($_.HardwareID) + @($_.CompatibleID)
}}
$query = "SELECT DeviceID, DeviceName, DriverVersion, DriverDate, DriverProviderName, DeviceClass, HardwareID FROM Win32_PnPSignedDriver WHERE {class_filter}"
$items = @(Get-CimInstance -Query $query | Where-Object {{
    $_.DeviceName -ne $null -and $devices.ContainsKey($_.DeviceID)
}} | Select-Object DeviceID, DeviceName, DriverVersion,
    @{{N='Machine';E={{$machine}}}},
    @{{N='DriversExcluded';E={{$driversExcluded}}}},
    @{{N='Date';E={{if($_.DriverDate){{$_.DriverDate.ToString('yyyy-MM-dd')}}else{{'N/A'}}}}}},
        DriverProviderName, DeviceClass,
    @{{N='HardwareID';E={{@($devices[$_.DeviceID] | Where-Object {{ -not [string]::IsNullOrWhiteSpace($_) }})}}}})
ConvertTo-Json -InputObject $items -Depth 3
"#
    )
}

fn essential_drivers(drivers: &[DriverInfo]) -> Vec<DriverInfo> {
    drivers
        .iter()
        .filter(|driver| SIMPLIFIED_CATEGORIES.contains(&driver.category.as_str()) && !is_software_component(driver))
        .cloned()
        .collect()
}

fn is_software_component(driver: &DriverInfo) -> bool {
    // Use the PnP enumerator, not translated display names. Unknown buses stay visible.
    // Bluetooth services belong to the radio; USB/PCI radios remain separate devices.
    let id = if driver.device_id.is_empty() { &driver.hardware_id } else { &driver.device_id };
    let Some((enumerator, _)) = id.split_once('\\') else { return false };
    matches!(
        enumerator.to_ascii_uppercase().as_str(),
        "BTH" | "BTHENUM" | "BTHLE" | "BTHLEDEVICE" | "BTHHFENUM" | "BTHMODEM" | "SWD" | "ROOT" | "SW"
    )
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
                        let items: Vec<&serde_json::Value> =
                            if let Some(arr) = json.as_array() { arr.iter().collect() } else { vec![&json] };

                        for d in items {
                            let name = d["DeviceName"].as_str().unwrap_or("Unknown").to_string();

                            let version = d["DriverVersion"].as_str().unwrap_or("N/A").to_string();
                            let date = d["Date"].as_str().unwrap_or("N/A").to_string();
                            let provider = d["DriverProviderName"].as_str().unwrap_or("Unknown").to_string();
                            let class = d["DeviceClass"].as_str().unwrap_or("Other");
                            let hw_ids = extract_hardware_ids(&d["HardwareID"]);
                            let hw_id = hw_ids.first().cloned().unwrap_or_default();

                            let status = initial_status(&version);
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
                                device_id: d["DeviceID"].as_str().unwrap_or_default().to_string(),
                                checked_at: None,
                                machine: d["Machine"].as_str().unwrap_or_default().to_string(),
                                search_error: None,
                                drivers_excluded: d["DriversExcluded"].as_bool().unwrap_or(false),
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
        drivers = essential_drivers(&drivers);
    } else {
        drivers.retain(|driver| FULL_MODE_CATEGORIES.contains(&driver.category.as_str()));
    }

    drivers.sort_by(|a, b| a.category.cmp(&b.category).then(a.name.cmp(&b.name)));
    let mut seen = std::collections::HashSet::new();
    drivers.retain(|driver| {
        let key = if driver.device_id.is_empty() {
            format!("{}|{}|{}|{}", driver.name, driver.provider, driver.hardware_id, driver.version)
        } else {
            driver.device_id.to_uppercase()
        };
        seen.insert(key)
    });

    if drivers.is_empty() {
        drivers.push(DriverInfo {
            name: "No hardware drivers detected".to_string(),
            device_id: String::new(),
            checked_at: None,
            machine: String::new(),
            search_error: None,
            drivers_excluded: false,
            version: "N/A".to_string(),
            latest_version: String::new(),
            date: "N/A".to_string(),
            provider: "System".to_string(),
            status: UNKNOWN.to_string(),
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

fn initial_status(version: &str) -> String {
    if super::driver_version::display_version(version).is_none() {
        UNKNOWN.into()
    } else {
        INSTALLED.into()
    }
}
fn make_update_url(provider: &str, name: &str, hw_id: &str) -> String {
    // Hardware vendor IDs also work when Windows reports a generic driver provider.
    if let Some(url) = hardware_vendor_support(hw_id) {
        return url.into();
    }
    let p = provider.to_lowercase();
    let n = name.to_lowercase();

    if p.contains("nvidia") || n.contains("nvidia") || n.contains("geforce") {
        return "https://www.nvidia.com/Download/index.aspx".into();
    }
    let vendor_word = |word: &str| p.split(|c: char| !c.is_ascii_alphanumeric()).any(|part| part == word);
    if vendor_word("amd")
        || vendor_word("ati")
        || p.contains("advanced micro devices")
        || n.contains("radeon")
        || n.contains("amd")
    {
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
        return format!("https://www.catalog.update.microsoft.com/Search.aspx?q={q}");
    }
    String::new()
}

fn hardware_vendor_support(id: &str) -> Option<&'static str> {
    let id = id.trim().to_ascii_uppercase();
    let pci = id.strip_prefix("PCI\\")?;
    let vendor = pci.split('&').find_map(|part| part.strip_prefix("VEN_"))?;
    match vendor {
        "1002" => Some("https://www.amd.com/en/support/download/drivers.html"),
        "10DE" => Some("https://www.nvidia.com/Download/index.aspx"),
        "8086" => Some("https://www.intel.com/content/www/us/en/support/detect.html"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inventory_script_is_valid_powershell() {
        let script = build_driver_scan_script(WMI_DEVICE_CLASSES_FULL);
        let validation = format!("[void][scriptblock]::Create(@'\n{script}\n'@)");
        let output = run_powershell_with_timeout(&validation, 15).expect("PowerShell starts");
        assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    }

    #[test]
    #[ignore = "requires access to the local Windows WMI service"]
    fn live_inventory() {
        let drivers = get_driver_list(false).expect("inventory query succeeds");
        assert!(drivers.iter().any(|driver| !driver.device_id.is_empty()), "no real devices returned");
        println!("{} devices inventoried", drivers.len());
    }

    fn sample(name: &str, category: &str) -> DriverInfo {
        DriverInfo {
            name: name.into(),
            device_id: name.into(),
            checked_at: None,
            machine: String::new(),
            search_error: None,
            drivers_excluded: false,
            version: "1.0".into(),
            latest_version: String::new(),
            date: "2026-01-01".into(),
            provider: "Test".into(),
            status: INSTALLED.into(),
            category: category.into(),
            hardware_id: String::new(),
            hardware_ids: vec![],
            update_url: String::new(),
            update_source: String::new(),
        }
    }

    #[test]
    fn hardware_sources_do_not_depend_on_the_driver_provider() {
        for (id, domain) in [
            (r"PCI\VEN_1002&DEV_744C", "amd.com"),
            (r"pci\ven_10de&dev_2684", "nvidia.com"),
            (r"PCI\VEN_8086&DEV_56A0", "intel.com"),
        ] {
            assert!(make_update_url("Microsoft", "Display adapter", id).contains(domain));
        }
        assert_eq!(hardware_vendor_support(r"PCI\VEN_10020&DEV_0001"), None);
        assert_eq!(hardware_vendor_support(r"USB\VID_8086"), None);
    }

    #[test]
    fn inventory_does_not_claim_updates_were_checked() {
        assert_eq!(initial_status("1.0"), INSTALLED);
    }

    #[test]
    fn eval_status_keeps_recent_drivers_installed() {
        assert_eq!(initial_status("1.0"), INSTALLED);
    }

    #[test]
    fn eval_status_unknown_when_version_missing() {
        assert_eq!(initial_status("N/A"), UNKNOWN);
    }

    #[test]
    fn simplified_keeps_all_essential_devices() {
        let input = vec![
            sample("AMD Radeon RX 7900 XTX", "Graphics"),
            sample("AMD Radeon(TM) Graphics", "Graphics"),
            sample("Realtek Gaming 2.5GbE Family Controller", "Network"),
            sample("RZ608 Wi-Fi 6E 80MHz", "Network"),
            sample("RZ608 Bluetooth(R) Adapter", "Bluetooth"),
        ];

        let collapsed = essential_drivers(&input);
        assert_eq!(collapsed.len(), 5);
        assert_eq!(collapsed[0].name, "AMD Radeon RX 7900 XTX");
        assert!(collapsed.iter().any(|d| d.name == "AMD Radeon(TM) Graphics"));
        assert!(collapsed.iter().any(|d| d.name == "RZ608 Wi-Fi 6E 80MHz"));
    }

    #[test]
    fn essential_view_hides_services_without_using_display_names() {
        let mut devices = Vec::new();
        for id in [r"BTHENUM\service", r"BTHLEDEVICE\gatt", r"BTH\MS_BTHBRB", r"SWD\WIFIDIRECT", r"ROOT\KDNIC"] {
            let mut driver = sample("Localized device name", "Network");
            driver.device_id = id.into();
            devices.push(driver);
        }
        assert!(essential_drivers(&devices).is_empty());
        // Filtering a view never removes entries from the full inventory.
        assert_eq!(devices.len(), 5);
    }

    #[test]
    fn essential_view_keeps_usb_pci_and_unrecognized_buses() {
        let mut devices = Vec::new();
        for (id, category) in [
            (r"PCI\VEN_1002&DEV_744C", "Graphics"),
            (r"PCI\VEN_8086&DEV_1234", "Graphics"),
            (r"USB\VID_0E8D&PID_0608", "Bluetooth"),
            (r"USB\VID_0BDA&PID_8153", "Network"),
            (r"SD\adapter", "Network"),
            (r"ACPI\radio", "Bluetooth"),
            ("", "Network"),
        ] {
            let mut driver = sample("Generic device", category);
            driver.device_id = id.into();
            devices.push(driver);
        }
        assert_eq!(essential_drivers(&devices).len(), devices.len());
    }

    #[test]
    fn manufacturer_links_do_not_confuse_corporation_with_ati() {
        assert!(make_update_url("Intel Corporation", "Wireless Adapter", "").contains("intel.com"));
        assert!(make_update_url("ATI Technologies", "Display", "").contains("amd.com"));
        assert!(make_update_url("Advanced Micro Devices, Inc.", "Display", "").contains("amd.com"));
        assert!(make_update_url("Unknown Corporation", "Unknown device", "").is_empty());
    }
}
