use crate::driver_store::{fetch_driver_store_packages, find_latest_store_version_for_driver};
use crate::driver_version::{extract_version_from_text, is_update_available};
use crate::drivers::DriverInfo;
use serde::Deserialize;
use std::os::windows::process::CommandExt;
use std::process::Command;

#[derive(Debug, Clone, Deserialize)]
struct PendingDriverUpdate {
    title: String,
    version: String,
    hardware_ids: Vec<String>,
    manufacturer: String,
    model: String,
}

const WU_DRIVER_SEARCH_PS: &str = r#"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Continue'
try {
    (New-Object -ComObject Microsoft.Update.AutoUpdate).DetectNow() | Out-Null
} catch {}
Start-Sleep -Seconds 8
try {
    $Session = New-Object -ComObject Microsoft.Update.Session
    $Searcher = $Session.CreateUpdateSearcher()
    $Result = $null
    foreach ($criteria in @(
        "IsInstalled=0 and Type='Driver' and IsHidden=0",
        "IsInstalled=0 and IsHidden=0 and CategoryIDs contains 'E0789628-CE08-4437-8135-8283DC2E3C09'"
    )) {
        try {
            $SearchResult = $Searcher.Search($criteria)
            if ($SearchResult.Updates.Count -gt 0) {
                $Result = $SearchResult
                break
            }
        } catch {}
    }
    if ($null -eq $Result) {
        $Result = $Searcher.Search("IsInstalled=0 and Type='Driver' and IsHidden=0")
    }
    $updates = @()
    foreach ($Update in $Result.Updates) {
        $hwids = @()
        if ($null -ne $Update.DriverHardwareID) {
            foreach ($id in @($Update.DriverHardwareID)) {
                if ($null -ne $id -and "$id".Trim().Length -gt 0) {
                    $hwids += "$id".Trim()
                }
            }
        }
        $updates += [PSCustomObject]@{
            Title = [string]$Update.Title
            Version = [string]$Update.DriverVer
            HardwareIDs = $hwids
            Manufacturer = [string]$Update.DriverManufacturer
            Model = [string]$Update.DriverModel
        }
    }
    if ($updates.Count -eq 0) { '[]' } else { $updates | ConvertTo-Json -Depth 4 -Compress }
} catch {
    '[]'
}
"#;

pub fn enrich_drivers_with_updates(drivers: &mut [DriverInfo]) {
    let pending = fetch_pending_driver_updates();
    let store = fetch_driver_store_packages();

    log::info!(
        "Driver update sources: {} pending WU, {} store packages",
        pending.len(),
        store.len()
    );

    for driver in drivers.iter_mut() {
        if driver.category == "System" {
            continue;
        }

        driver.update_source.clear();

        let wu_latest = find_latest_update_for_driver(driver, &pending);
        let store_latest = find_latest_store_version_for_driver(driver, &store);

        let Some((latest, source)) =
            resolve_update_candidate(&driver.version, wu_latest, store_latest)
        else {
            continue;
        };

        driver.latest_version = latest;
        driver.status = "Update Available".to_string();
        driver.update_source = source.to_string();
    }
}

fn resolve_update_candidate(
    installed: &str,
    wu: Option<String>,
    store: Option<String>,
) -> Option<(String, &'static str)> {
    let wu_newer = wu.filter(|version| is_update_available(installed, version));
    let store_newer = store.filter(|version| is_update_available(installed, version));

    match (wu_newer, store_newer) {
        (Some(wu_version), Some(store_version)) => {
            if is_update_available(&wu_version, &store_version) {
                Some((store_version, "driver_store"))
            } else {
                Some((wu_version, "windows_update"))
            }
        }
        (Some(wu_version), None) => Some((wu_version, "windows_update")),
        (None, Some(store_version)) => Some((store_version, "driver_store")),
        (None, None) => None,
    }
}

pub fn trigger_wu_driver_detect() {
    let _ = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            "try { (New-Object -ComObject Microsoft.Update.AutoUpdate).DetectNow() | Out-Null } catch {}",
        ])
        .creation_flags(0x08000000)
        .output();
}

pub fn open_windows_update_settings() -> Result<(), String> {
    trigger_wu_driver_detect();
    Command::new("cmd")
        .args(["/C", "start", "", "ms-settings:windowsupdate"])
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|error| format!("Failed to open Windows Update: {}", error))?;
    Ok(())
}

fn fetch_pending_driver_updates() -> Vec<PendingDriverUpdate> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            WU_DRIVER_SEARCH_PS,
        ])
        .creation_flags(0x08000000)
        .output();

    let Ok(result) = output else {
        log::warn!("Windows Update driver search failed to start");
        return Vec::new();
    };

    if !result.status.success() {
        log::warn!(
            "Windows Update driver search exited with {}",
            result.status.code().unwrap_or(-1)
        );
        return Vec::new();
    }

    let Ok(stdout) = String::from_utf8(result.stdout) else {
        return Vec::new();
    };

    let trimmed = stdout.trim();
    if trimmed.is_empty() || trimmed == "[]" {
        return Vec::new();
    }

    let parsed = serde_json::from_str::<serde_json::Value>(trimmed);
    let Ok(json) = parsed else {
        log::warn!("Failed to parse Windows Update driver JSON");
        return Vec::new();
    };

    let items: Vec<serde_json::Value> = if let Some(array) = json.as_array() {
        array.clone()
    } else {
        vec![json]
    };

    items
        .into_iter()
        .filter_map(|item| {
            let title = item["Title"].as_str()?.to_string();
            let mut version = item["Version"].as_str().unwrap_or("").trim().to_string();
            if version.is_empty() {
                version = extract_version_from_text(&title).unwrap_or_default();
            }
            if version.is_empty() {
                return None;
            }

            let hardware_ids = parse_hardware_ids(&item["HardwareIDs"]);

            Some(PendingDriverUpdate {
                title,
                version,
                hardware_ids,
                manufacturer: item["Manufacturer"]
                    .as_str()
                    .unwrap_or("")
                    .trim()
                    .to_string(),
                model: item["Model"].as_str().unwrap_or("").trim().to_string(),
            })
        })
        .collect()
}

fn parse_hardware_ids(value: &serde_json::Value) -> Vec<String> {
    match value {
        serde_json::Value::Array(values) => values
            .iter()
            .filter_map(|entry| entry.as_str().map(str::trim))
            .filter(|entry| !entry.is_empty())
            .map(str::to_string)
            .collect(),
        serde_json::Value::String(text) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                Vec::new()
            } else {
                vec![trimmed.to_string()]
            }
        }
        _ => Vec::new(),
    }
}

fn find_latest_update_for_driver(
    driver: &DriverInfo,
    updates: &[PendingDriverUpdate],
) -> Option<String> {
    let mut best: Option<String> = None;

    for update in updates {
        if !driver_matches_update(driver, update) {
            continue;
        }

        let candidate = update.version.trim();
        if candidate.is_empty() || !is_update_available(&driver.version, candidate) {
            continue;
        }

        best = Some(match best {
            None => candidate.to_string(),
            Some(current) => {
                if is_update_available(&current, candidate) {
                    candidate.to_string()
                } else {
                    current
                }
            }
        });
    }

    best
}

fn driver_matches_update(driver: &DriverInfo, update: &PendingDriverUpdate) -> bool {
    if hardware_ids_match(&driver.hardware_ids, &update.hardware_ids) {
        return true;
    }

    if !driver.hardware_id.is_empty()
        && !update.hardware_ids.is_empty()
        && hardware_ids_match(std::slice::from_ref(&driver.hardware_id), &update.hardware_ids)
    {
        return true;
    }

    let driver_name = normalize_match_key(&driver.name);
    let update_model = normalize_match_key(&update.model);
    let update_title = normalize_match_key(&update.title);

    if !driver_name.is_empty() {
        if !update_model.is_empty()
            && (update_model.contains(&driver_name) || driver_name.contains(&update_model))
        {
            return true;
        }

        if update_title.contains(&driver_name) {
            return true;
        }
    }

    let provider = normalize_match_key(&driver.provider);
    let manufacturer = normalize_match_key(&update.manufacturer);
    if provider.len() >= 4
        && manufacturer.len() >= 4
        && (provider.contains(&manufacturer) || manufacturer.contains(&provider))
        && !update_model.is_empty()
        && driver_name.contains(&update_model)
    {
        return true;
    }

    false
}

fn hardware_ids_match(driver_ids: &[String], update_ids: &[String]) -> bool {
    for driver_id in driver_ids {
        let driver_key = pci_identity_key(driver_id);
        for update_id in update_ids {
            if ids_overlap(driver_id, update_id) {
                return true;
            }
            if let (Some(left), Some(right)) = (driver_key.as_ref(), pci_identity_key(update_id))
            {
                if left == &right {
                    return true;
                }
            }
        }
    }
    false
}

fn ids_overlap(left: &str, right: &str) -> bool {
    let left_norm = left.trim().to_uppercase();
    let right_norm = right.trim().to_uppercase();
    if left_norm.is_empty() || right_norm.is_empty() {
        return false;
    }
    left_norm.starts_with(&right_norm)
        || right_norm.starts_with(&left_norm)
        || left_norm == right_norm
}

fn pci_identity_key(hwid: &str) -> Option<String> {
    let upper = hwid.to_uppercase();
    let ven = extract_token(&upper, "VEN_")?;
    let dev = extract_token(&upper, "DEV_")?;
    Some(format!("VEN_{ven}&DEV_{dev}"))
}

fn extract_token(source: &str, marker: &str) -> Option<String> {
    let start = source.find(marker)? + marker.len();
    let rest = &source[start..];
    let end = rest.find('&').unwrap_or(rest.len());
    let token = &rest[..end];
    if token.is_empty() {
        None
    } else {
        Some(token.to_string())
    }
}

fn normalize_match_key(value: &str) -> String {
    value
        .to_lowercase()
        .replace(['(', ')', '[', ']', '.', ',', '-'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}
