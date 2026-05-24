use serde::{Deserialize, Serialize};
#[cfg(target_os = "windows")]
use wmi::WMIConnection;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RamModuleInfo {
    pub name: String,
    pub manufacturer: String,
    pub part_number: String,
    pub capacity_bytes: u64,
    pub speed_mhz: u32,
}

#[cfg(target_os = "windows")]
#[derive(Debug, Deserialize)]
#[serde(rename = "Win32_PhysicalMemory")]
#[serde(rename_all = "PascalCase")]
struct Win32PhysicalMemory {
    manufacturer: Option<String>,
    part_number: Option<String>,
    capacity: Option<u64>,
    speed: Option<u32>,
    configured_clock_speed: Option<u32>,
}

fn clean_wmi_string(raw: &str) -> String {
    raw.trim().trim_matches('\0').to_string()
}

fn is_unknown(value: &str) -> bool {
    let v = value.trim();
    v.is_empty() || v.eq_ignore_ascii_case("unknown") || v == "N/A"
}

fn is_jedec_manufacturer_code(value: &str) -> bool {
    let v = value.trim();
    !v.is_empty() && v.len() <= 4 && v.chars().all(|c| c.is_ascii_hexdigit())
}

fn normalize_brand_name(raw: &str) -> String {
    let cleaned = clean_wmi_string(raw);
    let lower = cleaned.to_lowercase();

    match lower.as_str() {
        "" => String::new(),
        "g.skill" | "gskill" | "g skill" => "G.Skill".to_string(),
        "sk hynix" | "hynix" | "hyundai" => "SK Hynix".to_string(),
        "micron technology" | "micron" => "Crucial".to_string(),
        "kingston technology" | "kingston" => "Kingston".to_string(),
        "corsair" => "Corsair".to_string(),
        "samsung" => "Samsung".to_string(),
        "crucial" | "crucial technology" => "Crucial".to_string(),
        "adata technology" | "adata" => "ADATA".to_string(),
        "team group" | "teamgroup" => "TeamGroup".to_string(),
        "patriot memory" | "patriot" => "Patriot".to_string(),
        "hyperx" => "HyperX".to_string(),
        "lexar" => "Lexar".to_string(),
        "pny" => "PNY".to_string(),
        "silicon power" => "Silicon Power".to_string(),
        _ if lower.contains("kingston") => "Kingston".to_string(),
        _ if lower.contains("corsair") => "Corsair".to_string(),
        _ if lower.contains("crucial") => "Crucial".to_string(),
        _ if lower.contains("samsung") => "Samsung".to_string(),
        _ if lower.contains("g.skill") || lower.contains("gskill") => "G.Skill".to_string(),
        _ if lower.contains("hynix") => "SK Hynix".to_string(),
        _ => cleaned
            .split_whitespace()
            .map(|word| {
                let mut chars = word.chars();
                match chars.next() {
                    None => String::new(),
                    Some(first) => {
                        first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase()
                    }
                }
            })
            .collect::<Vec<_>>()
            .join(" "),
    }
}

fn jedec_brand(code: &str) -> Option<&'static str> {
    match code.trim().to_uppercase().as_str() {
        "029E" => Some("Corsair"),
        "0198" | "9801" | "80AD" | "0098" => Some("Kingston"),
        "80CE" | "5105" => Some("Samsung"),
        "002C" | "014F" | "0575" | "2C00" => Some("Crucial"),
        "859B" | "04CB" | "04CD" => Some("ADATA"),
        "0165" | "CD04" => Some("G.Skill"),
        "8300" | "802C" => Some("Micron"),
        "0000" | "FFFF" => None,
        _ => None,
    }
}

fn brand_from_part_number(part: &str) -> Option<&'static str> {
    let upper = part.trim().to_uppercase();

    if upper.starts_with("CMK")
        || upper.starts_with("CML")
        || upper.starts_with("DOM")
        || upper.contains("CORSAIR")
    {
        return Some("Corsair");
    }
    if upper.starts_with("KHX")
        || upper.starts_with("KF")
        || upper.starts_with("KVR")
        || upper.starts_with("HX")
    {
        return Some("Kingston");
    }
    if upper.starts_with("F4-") || upper.starts_with("F5-") || upper.starts_with("F3-") {
        return Some("G.Skill");
    }
    if upper.starts_with("BL") || upper.starts_with("CT") || upper.starts_with("BLS") {
        return Some("Crucial");
    }
    if upper.starts_with("PVS") || upper.starts_with("PDP") || upper.starts_with("VIPER") {
        return Some("Patriot");
    }
    if upper.starts_with("M378A") || upper.starts_with("M471A") || upper.starts_with("M393A") {
        return Some("Samsung");
    }
    if upper.starts_with("HMA") || upper.starts_with("HMC") || upper.starts_with("HMT") {
        return Some("SK Hynix");
    }
    if upper.starts_with("AX4U") || upper.starts_with("AX5U") {
        return Some("ADATA");
    }
    if upper.starts_with("TM") || upper.starts_with("TP") {
        return Some("TeamGroup");
    }

    None
}

fn resolve_ram_brand(manufacturer: &str, part_number: &str) -> String {
    let mfr = clean_wmi_string(manufacturer);
    let part = clean_wmi_string(part_number);

    if !is_unknown(&mfr) && !is_jedec_manufacturer_code(&mfr) {
        return normalize_brand_name(&mfr);
    }

    if !is_unknown(&part) {
        if let Some(brand) = brand_from_part_number(&part) {
            return brand.to_string();
        }
    }

    if is_jedec_manufacturer_code(&mfr) {
        if let Some(brand) = jedec_brand(&mfr) {
            return brand.to_string();
        }
    }

    if !is_unknown(&mfr) {
        return normalize_brand_name(&mfr);
    }

    String::new()
}

fn format_module_name(manufacturer: &str, part_number: &str, capacity_bytes: u64) -> String {
    let brand = resolve_ram_brand(manufacturer, part_number);
    if !brand.is_empty() {
        return brand;
    }

    let gb = capacity_bytes / (1024 * 1024 * 1024);
    if gb > 0 {
        format!("{gb} GB")
    } else {
        "RAM".to_string()
    }
}

#[cfg(target_os = "windows")]
pub fn query_ram_modules(wmi: &WMIConnection) -> Vec<RamModuleInfo> {
    let rows: Vec<Win32PhysicalMemory> = match wmi.query() {
        Ok(rows) => rows,
        Err(err) => {
            log::warn!("Win32_PhysicalMemory query failed: {err}");
            return Vec::new();
        }
    };

    rows.into_iter()
        .map(|row| {
            let manufacturer = row.manufacturer.unwrap_or_default();
            let part_number = row.part_number.unwrap_or_default();
            let capacity_bytes = row.capacity.unwrap_or(0);
            let speed_mhz = row
                .configured_clock_speed
                .or(row.speed)
                .unwrap_or(0);

            let brand = resolve_ram_brand(&manufacturer, &part_number);
            let name = format_module_name(&manufacturer, &part_number, capacity_bytes);

            RamModuleInfo {
                name,
                manufacturer: brand,
                part_number: clean_wmi_string(&part_number),
                capacity_bytes,
                speed_mhz,
            }
        })
        .filter(|module| module.capacity_bytes > 0 || !is_unknown(&module.name))
        .collect()
}

#[cfg(not(target_os = "windows"))]
pub fn query_ram_modules() -> Vec<RamModuleInfo> {
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prefers_brand_over_part_number() {
        assert_eq!(
            format_module_name("Corsair", "CMK32GX5M2E6000C36", 16 * 1024 * 1024 * 1024),
            "Corsair"
        );
    }

    #[test]
    fn resolves_jedec_code_to_brand() {
        assert_eq!(
            resolve_ram_brand("029E", "00000000"),
            "Corsair"
        );
    }

    #[test]
    fn infers_brand_from_part_prefix() {
        assert_eq!(
            resolve_ram_brand("859B", "F4-3200C16-16GTZR"),
            "G.Skill"
        );
    }
}
