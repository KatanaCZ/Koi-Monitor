use crate::driver_version::is_update_available;
use crate::drivers::DriverInfo;
use std::os::windows::process::CommandExt;
use std::process::Command;

#[derive(Debug, Clone)]
pub struct DriverStorePackage {
    pub provider: String,
    pub class_name: String,
    pub version: String,
}

pub fn fetch_driver_store_packages() -> Vec<DriverStorePackage> {
    let output = Command::new("pnputil")
        .args(["/enum-drivers"])
        .creation_flags(0x08000000)
        .output();

    let Ok(result) = output else {
        log::warn!("pnputil /enum-drivers failed to start");
        return Vec::new();
    };

    if !result.status.success() {
        log::warn!(
            "pnputil /enum-drivers exited with {}",
            result.status.code().unwrap_or(-1)
        );
        return Vec::new();
    }

    let stdout = String::from_utf8_lossy(&result.stdout);
    parse_pnputil_output(&stdout)
}

pub fn find_latest_store_version_for_driver(
    driver: &DriverInfo,
    packages: &[DriverStorePackage],
) -> Option<String> {
    let mut best: Option<String> = None;

    for package in packages {
        if !category_matches_class(&driver.category, &package.class_name) {
            continue;
        }

        if !providers_match(&driver.provider, &package.provider)
            && !providers_match(&driver.name, &package.provider)
        {
            continue;
        }

        let candidate = package.version.trim();
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

fn parse_pnputil_output(output: &str) -> Vec<DriverStorePackage> {
    let mut packages = Vec::new();
    let mut provider = String::new();
    let mut class_name = String::new();
    let mut version = String::new();

    let mut flush = |provider: &str, class_name: &str, version: &str| {
        if provider.is_empty() || class_name.is_empty() || version.is_empty() {
            return;
        }
        packages.push(DriverStorePackage {
            provider: provider.to_string(),
            class_name: class_name.to_string(),
            version: version.to_string(),
        });
    };

    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            flush(&provider, &class_name, &version);
            provider.clear();
            class_name.clear();
            version.clear();
            continue;
        }

        if is_block_start(trimmed) {
            flush(&provider, &class_name, &version);
            provider.clear();
            class_name.clear();
            version.clear();
        }

        if let Some(value) = extract_labeled_value(trimmed, &["fournisseur", "provider name"]) {
            provider = value;
            continue;
        }

        if let Some(value) = extract_labeled_value(trimmed, &["classe", "class name"]) {
            class_name = value;
            continue;
        }

        if let Some(value) = extract_labeled_value(trimmed, &["version du pilote", "driver version"])
        {
            version = extract_driver_version_value(&value);
        }
    }

    flush(&provider, &class_name, &version);
    packages
}

fn is_block_start(line: &str) -> bool {
    let lower = line.to_lowercase();
    lower.starts_with("nom publi") || lower.starts_with("published name")
}

fn extract_labeled_value(line: &str, keywords: &[&str]) -> Option<String> {
    let (label, value) = line.split_once(':')?;
    let label_norm = label
        .to_lowercase()
        .replace(['?', '�'], " ")
        .replace("  ", " ");
    if keywords
        .iter()
        .any(|keyword| label_norm.contains(keyword))
    {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    } else {
        None
    }
}

fn extract_driver_version_value(raw: &str) -> String {
    let trimmed = raw.trim();
    let mut parts = trimmed.split_whitespace();
    let _date = parts.next();
    parts.collect::<Vec<_>>().join(" ").trim().to_string()
}

fn category_matches_class(category: &str, class_name: &str) -> bool {
    let class = class_name.trim().to_ascii_lowercase();
    match category {
        "Graphics" => class == "display",
        "Network" => class == "net",
        "Bluetooth" => class == "bluetooth",
        "Audio" => class == "media",
        "Storage" => class == "hdc" || class.contains("scsi"),
        _ => false,
    }
}

fn providers_match(left: &str, right: &str) -> bool {
    let left_key = provider_key(left);
    let right_key = provider_key(right);

    if left_key.is_empty() || right_key.is_empty() {
        return false;
    }

    for token in &left_key {
        if right_key.iter().any(|other| other == token || other.contains(token) || token.contains(other.as_str())) {
            return true;
        }
    }

    false
}

fn provider_key(value: &str) -> Vec<String> {
    const STOP_WORDS: &[&str] = &["inc", "ltd", "corp", "corporation", "limited", "company"];

    value
        .to_lowercase()
        .split(|c: char| !c.is_ascii_alphanumeric())
        .filter(|token| token.len() >= 3)
        .filter(|token| !STOP_WORDS.contains(token))
        .map(str::to_string)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_pnputil_block() {
        let sample = r#"
Nom du fournisseur :      Advanced Micro Devices, Inc.
Nom de la classe :         Display
Version du pilote :     05/12/2026 32.0.31007.5012
"#;
        let parsed = parse_pnputil_output(sample);
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0].version, "32.0.31007.5012");
        assert_eq!(parsed[0].class_name, "Display");
    }

    #[test]
    fn extracts_version_after_date() {
        assert_eq!(
            extract_driver_version_value("03/02/2026 3.5.0.1383"),
            "3.5.0.1383"
        );
    }
}
