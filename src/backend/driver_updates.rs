use super::driver_status::{CHECK_FAILED, NO_UPDATE_FOUND, UPDATE_AVAILABLE, UPDATE_SOURCE_WINDOWS, VERIFY_ONLINE};
use super::driver_version::{compare_versions, extract_version_from_text, is_update_available, version_parts};
use super::drivers::DriverInfo;
use super::subprocess::run_powershell_with_timeout;
use serde::Deserialize;
use std::os::windows::process::CommandExt;
use std::process::Command;

#[derive(Debug, Deserialize)]
struct PendingDriverUpdate {
    #[serde(rename = "Title")]
    title: String,
    #[serde(rename = "HardwareIDs")]
    hardware_ids: Vec<String>,
}

const WU_DRIVER_SEARCH_PS: &str = r#"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
try {
    $Session = New-Object -ComObject Microsoft.Update.Session
    $Searcher = $Session.CreateUpdateSearcher()
    $Result = $Searcher.Search("IsInstalled=0 and Type='Driver' and IsHidden=0")
    if ([int]$Result.ResultCode -ne 2) {
        throw "Windows Update search did not complete successfully (result $($Result.ResultCode))"
    }
    $updates = @(
        foreach ($Update in $Result.Updates) {
            [PSCustomObject]@{
                Title = [string]$Update.Title
                HardwareIDs = @($Update.DriverHardwareID | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
            }
        }
    )
    ConvertTo-Json -InputObject $updates -Depth 4 -Compress
} catch {
    [Console]::Error.WriteLine(("HRESULT 0x{0:X8}: {1}" -f $_.Exception.HResult, $_.Exception.Message))
    exit 1
}
"#;

pub fn enrich_drivers_with_updates(drivers: &mut [DriverInfo]) {
    let pending = fetch_pending_driver_updates();
    if let Err(error) = &pending {
        log::warn!("Windows Update driver search failed: {error}");
    }
    let checked_at = local_check_time();
    apply_search_result(drivers, pending.as_deref().map_err(|_| ()), &checked_at);
    for driver in drivers {
        driver.search_error = pending.as_ref().err().cloned();
    }
}

fn local_check_time() -> String {
    // GetLocalTime writes no system state.
    let time = unsafe { windows::Win32::System::SystemInformation::GetLocalTime() };
    format!(
        "{:04}-{:02}-{:02} {:02}:{:02}:{:02}",
        time.wYear, time.wMonth, time.wDay, time.wHour, time.wMinute, time.wSecond
    )
}

fn apply_search_result(drivers: &mut [DriverInfo], result: Result<&[PendingDriverUpdate], ()>, checked_at: &str) {
    for driver in drivers {
        if driver.category == "System" {
            continue;
        }
        // Every scan replaces its predecessor, including failures.
        driver.latest_version.clear();
        driver.update_source = UPDATE_SOURCE_WINDOWS.into();
        driver.checked_at = Some(checked_at.into());
        let Ok(updates) = result else {
            driver.status = CHECK_FAILED.into();
            continue;
        };
        let identified =
            !driver.hardware_id.trim().is_empty() || driver.hardware_ids.iter().any(|id| !id.trim().is_empty());
        let mut uncertain = !identified || version_parts(&driver.version).is_empty();
        for update in updates {
            if update.hardware_ids.iter().all(|id| id.trim().is_empty()) {
                uncertain = true;
                continue;
            }
            if !driver_matches_update(driver, update) {
                continue;
            }
            let Some(version) = extract_version_from_text(&update.title) else {
                uncertain = true;
                continue;
            };
            if compare_versions(&driver.version, &version).is_none() {
                uncertain = true;
                continue;
            }
            if is_update_available(&driver.version, &version)
                && (driver.latest_version.is_empty() || is_update_available(&driver.latest_version, &version))
            {
                driver.latest_version = version;
            }
        }
        driver.status = if !driver.latest_version.is_empty() {
            UPDATE_AVAILABLE
        } else if uncertain {
            VERIFY_ONLINE
        } else {
            NO_UPDATE_FOUND
        }
        .into();
    }
}

pub fn open_windows_update_settings() -> Result<(), String> {
    Command::new("cmd")
        .args(["/C", "start", "", "ms-settings:windowsupdate"])
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|error| format!("Failed to open Windows Update: {error}"))?;
    Ok(())
}

fn fetch_pending_driver_updates() -> Result<Vec<PendingDriverUpdate>, String> {
    let output = run_powershell_with_timeout(WU_DRIVER_SEARCH_PS, 60)?;
    if !output.status.success() {
        return Err(format!(
            "Search exited with {}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    parse_search_output(&output.stdout)
}

fn parse_search_output(output: &[u8]) -> Result<Vec<PendingDriverUpdate>, String> {
    serde_json::from_slice(output).map_err(|error| format!("Invalid Windows Update response: {error}"))
}

fn driver_matches_update(driver: &DriverInfo, update: &PendingDriverUpdate) -> bool {
    hardware_ids_match(&driver.hardware_ids, &update.hardware_ids)
        || hardware_ids_match(std::slice::from_ref(&driver.hardware_id), &update.hardware_ids)
}

/// Match an ID actually reported by Windows, never a shortened prefix or vendor name.
fn hardware_ids_match(driver_ids: &[String], update_ids: &[String]) -> bool {
    driver_ids.iter().any(|left| {
        let left = left.trim();
        !left.is_empty() && update_ids.iter().any(|right| left.eq_ignore_ascii_case(right.trim()))
    })
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn update_script_is_valid_powershell() {
        let validation = format!("[void][scriptblock]::Create(@'\n{WU_DRIVER_SEARCH_PS}\n'@)");
        let output = run_powershell_with_timeout(&validation, 15).expect("PowerShell starts");
        assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    }

    fn device(id: &str, version: &str) -> DriverInfo {
        DriverInfo {
            name: "Test device".into(),
            device_id: id.into(),
            checked_at: None,
            machine: String::new(),
            search_error: None,
            drivers_excluded: false,
            version: version.into(),
            latest_version: String::new(),
            date: "2006-06-21".into(),
            provider: "Any vendor".into(),
            status: super::super::driver_status::INSTALLED.into(),
            category: "Network".into(),
            hardware_id: id.into(),
            hardware_ids: vec![id.into()],
            update_url: String::new(),
            update_source: String::new(),
        }
    }

    fn offer(id: &str, version: &str) -> PendingDriverUpdate {
        PendingDriverUpdate { title: format!("Vendor - Device - {version}"), hardware_ids: vec![id.into()] }
    }

    #[test]
    fn empty_success_is_different_from_invalid_or_missing_output() {
        assert!(parse_search_output(b"[]").unwrap().is_empty());
        for invalid in [b"".as_slice(), b"null", b"{}", b"[{\"Title\":\"missing IDs\"}]", b"access denied"] {
            assert!(parse_search_output(invalid).is_err());
        }
    }

    #[test]
    fn updates_are_matched_for_different_vendors_and_buses() {
        let ids =
            [r"PCI\VEN_10DE&DEV_2684", r"PCI\VEN_8086&DEV_2725", r"USB\VID_0BDA&PID_8771", r"ACPI\VEN_TEST&DEV_0001"];
        let mut devices: Vec<_> = ids.iter().map(|id| device(id, "1.2.3.4")).collect();
        let offers: Vec<_> = ids.iter().map(|id| offer(id, "1.2.3.5")).collect();
        apply_search_result(&mut devices, Ok(&offers), "2026-11-13 12:00:00");
        assert!(devices.iter().all(|driver| driver.status == UPDATE_AVAILABLE && driver.latest_version == "1.2.3.5"));
    }

    #[test]
    fn unrelated_device_never_inherits_an_update() {
        let mut devices = [device(r"USB\VID_1234&PID_0001", "1.0")];
        apply_search_result(&mut devices, Ok(&[offer(r"USB\VID_1234&PID_0002", "2.0")]), "now");
        assert_eq!(devices[0].status, NO_UPDATE_FOUND);
        assert!(devices[0].latest_version.is_empty());
    }

    #[test]
    fn failed_search_clears_stale_update_and_records_attempt() {
        let mut devices = [device("exact-id", "1.0")];
        apply_search_result(&mut devices, Ok(&[offer("exact-id", "2.0")]), "first");
        assert_eq!(devices[0].status, UPDATE_AVAILABLE);
        apply_search_result(&mut devices, Err(()), "second");
        assert_eq!(devices[0].status, CHECK_FAILED);
        assert!(devices[0].latest_version.is_empty());
        assert_eq!(devices[0].checked_at.as_deref(), Some("second"));
    }

    #[test]
    fn unknown_versions_and_missing_identifiers_are_inconclusive() {
        for (id, version, offers) in [
            ("", "1.0", vec![]),
            ("device", "3202151234", vec![offer("device", "2.0")]),
            ("device", "1.0", vec![offer("device", "unknown")]),
            ("device", "1.0", vec![offer("", "2.0")]),
        ] {
            let mut devices = [device(id, version)];
            apply_search_result(&mut devices, Ok(&offers), "now");
            assert_eq!(devices[0].status, VERIFY_ONLINE);
        }
    }

    #[test]
    fn old_dates_and_equal_or_lower_versions_do_not_raise_an_alert() {
        let mut devices = [device("device", "2.0.0")];
        apply_search_result(&mut devices, Ok(&[offer("device", "2.0"), offer("device", "1.9")]), "now");
        assert_eq!(devices[0].status, NO_UPDATE_FOUND);
    }

    #[test]
    fn newest_matched_version_wins_independently_of_offer_order() {
        let mut devices = [device("device", "1.0")];
        let mut offers = vec![offer("device", "2.0"), offer("device", "3.0"), offer("other", "99.0")];
        for _ in 0..2 {
            apply_search_result(&mut devices, Ok(&offers), "now");
            assert_eq!(devices[0].latest_version, "3.0");
            offers.reverse();
        }
    }

    #[test]
    fn matching_does_not_ignore_subsystem_or_accept_partial_ids() {
        let installed = vec![r"PCI\VEN_1002&DEV_744C&SUBSYS_12341002".into()];
        assert!(!hardware_ids_match(&installed, &[r"PCI\VEN_1002&DEV_744C&SUBSYS_99991002".into()]));
        assert!(!hardware_ids_match(&installed, &[r"PCI\VEN_1002&DEV_744".into()]));
        assert!(!hardware_ids_match(&installed, &[r"PCI\VEN_1002&DEV_744C".into()]));
        assert!(hardware_ids_match(&installed, &[r" pci\ven_1002&dev_744c&subsys_12341002 ".into()]));
    }
}
