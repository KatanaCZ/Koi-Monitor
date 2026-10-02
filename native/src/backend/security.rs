use serde::{Deserialize, Serialize};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
use std::process::Command;
#[cfg(target_os = "windows")]
use wmi::{COMLibrary, WMIConnection};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityInfo {
    pub is_protected: bool,
    pub product_name: String,
}

impl Default for SecurityInfo {
    fn default() -> Self {
        Self {
            is_protected: false,
            product_name: "Analyse en cours...".to_string(),
        }
    }
}

#[cfg(target_os = "windows")]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct AntiVirusProduct {
    display_name: Option<String>,
    product_state: Option<u32>,
}

#[cfg(target_os = "windows")]
fn is_av_enabled(product_state: u32) -> bool {
    (product_state & 0x1000) != 0
}

#[cfg(target_os = "windows")]
fn clean_display_name(raw: &str) -> String {
    let trimmed = raw.trim();
    if let Some(idx) = trimmed.find('}') {
        if trimmed.starts_with('{') {
            return trimmed[idx + 1..].trim().to_string();
        }
    }
    trimmed.to_string()
}

#[cfg(target_os = "windows")]
fn normalize_product_name(name: &str) -> String {
    let cleaned = clean_display_name(name);
    let lower = cleaned.to_lowercase();

    if lower.contains("windows defender") || lower.contains("microsoft defender") {
        return "Microsoft Defender".to_string();
    }

    cleaned
}

#[cfg(target_os = "windows")]
fn is_defender_name(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.contains("windows defender") || lower.contains("microsoft defender")
}

#[cfg(target_os = "windows")]
fn query_security_center_products_wmi(wmi: &WMIConnection) -> Vec<(String, u32)> {
    let products: Vec<AntiVirusProduct> = match wmi.query() {
        Ok(products) => products,
        Err(err) => {
            log::warn!("AntiVirusProduct query failed: {err}");
            return Vec::new();
        }
    };

    products
        .into_iter()
        .filter_map(|product| {
            let name = product.display_name?;
            let state = product.product_state.unwrap_or(0);
            if name.trim().is_empty() {
                return None;
            }
            Some((name, state))
        })
        .collect()
}

#[cfg(target_os = "windows")]
fn query_security_center_products() -> Vec<(String, u32)> {
    let com = match COMLibrary::new() {
        Ok(com) => com,
        Err(err) => {
            log::warn!("Security COM init failed: {err}");
            return Vec::new();
        }
    };

    let wmi = match WMIConnection::with_namespace_path("ROOT\\SecurityCenter2", com) {
        Ok(wmi) => wmi,
        Err(err) => {
            log::warn!("SecurityCenter2 WMI failed: {err}");
            return Vec::new();
        }
    };

    query_security_center_products_wmi(&wmi)
}

#[cfg(target_os = "windows")]
fn defender_realtime_enabled() -> Option<bool> {
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let output = Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\Windows Defender\Real-Time Protection",
            "/v",
            "DisableRealtimeMonitoring",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        if line.contains("DisableRealtimeMonitoring") {
            let disabled = line.contains("0x1");
            return Some(!disabled);
        }
    }

    None
}

#[cfg(target_os = "windows")]
fn build_security_info(products: Vec<(String, u32)>) -> SecurityInfo {
    let enabled: Vec<(String, u32)> = products
        .iter()
        .filter(|(_, state)| is_av_enabled(*state))
        .cloned()
        .collect();

    if let Some((name, _)) = enabled
        .iter()
        .find(|(name, _)| !is_defender_name(name))
        .or_else(|| enabled.first())
    {
        return SecurityInfo {
            is_protected: true,
            product_name: normalize_product_name(name),
        };
    }

    if let Some(installed) = products.first() {
        return SecurityInfo {
            is_protected: false,
            product_name: normalize_product_name(&installed.0),
        };
    }

    if let Some(defender_on) = defender_realtime_enabled() {
        return SecurityInfo {
            is_protected: defender_on,
            product_name: "Microsoft Defender".to_string(),
        };
    }

    SecurityInfo {
        is_protected: false,
        product_name: "Antivirus introuvable".to_string(),
    }
}

#[cfg(target_os = "windows")]
pub fn fetch_antivirus_status_with_wmi(
    security_wmi: Option<&WMIConnection>,
) -> SecurityInfo {
    let products = if let Some(wmi) = security_wmi {
        query_security_center_products_wmi(wmi)
    } else {
        query_security_center_products()
    };

    build_security_info(products)
}

#[cfg(target_os = "windows")]
pub fn fetch_antivirus_status() -> SecurityInfo {
    fetch_antivirus_status_with_wmi(None)
}

#[cfg(not(target_os = "windows"))]
pub fn fetch_antivirus_status_with_wmi(_security_wmi: Option<&()>) -> SecurityInfo {
    SecurityInfo {
        is_protected: false,
        product_name: "Non disponible".to_string(),
    }
}

#[cfg(not(target_os = "windows"))]
pub fn fetch_antivirus_status() -> SecurityInfo {
    fetch_antivirus_status_with_wmi(None)
}
