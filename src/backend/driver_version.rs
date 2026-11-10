use std::cmp::Ordering;

/// Extrait des segments numériques comparables depuis toute notation WMI / constructeur.
pub fn version_parts(raw: &str) -> Vec<u64> {
    let trimmed = raw.trim().trim_start_matches(['v', 'V']);

    if trimmed.is_empty() || trimmed.eq_ignore_ascii_case("n/a") {
        return Vec::new();
    }

    if trimmed.chars().all(|c| c.is_ascii_digit()) {
        let len = trimmed.len();
        if (8..=12).contains(&len) {
            if let Some(parts) = unpack_wmi_numeric(trimmed) {
                return parts;
            }
        }
        if let Ok(value) = trimmed.parse::<u64>() {
            return vec![value];
        }
    }

    let mut parts = Vec::new();
    for segment in trimmed.split(|c: char| !c.is_ascii_digit()) {
        if segment.is_empty() {
            continue;
        }
        if let Ok(value) = segment.parse::<u64>() {
            parts.push(value);
        }
    }

    if parts.len() >= 2 {
        return parts;
    }

    parts
}

fn unpack_wmi_numeric(trimmed: &str) -> Option<Vec<u64>> {
    if trimmed.len() < 8 || trimmed.len() > 12 {
        return None;
    }

    let (major, rest) = trimmed.split_at(trimmed.len() - 8);
    let major = if major.is_empty() {
        0
    } else {
        major.parse::<u64>().ok()?
    };

    if rest.len() != 8 || !rest.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }

    let a = rest[0..2].parse::<u64>().ok()?;
    let b = rest[2..4].parse::<u64>().ok()?;
    let c = rest[4..6].parse::<u64>().ok()?;
    let d = rest[6..8].parse::<u64>().ok()?;

    Some(vec![major, a, b, c, d])
}

pub fn compare_versions(installed: &str, candidate: &str) -> Option<Ordering> {
    let left = version_parts(installed);
    let right = version_parts(candidate);

    if left.is_empty() || right.is_empty() {
        return None;
    }

    let max_len = left.len().max(right.len());
    for index in 0..max_len {
        let lv = *left.get(index).unwrap_or(&0);
        let rv = *right.get(index).unwrap_or(&0);
        match lv.cmp(&rv) {
            Ordering::Equal => continue,
            other => return Some(other),
        }
    }

    Some(Ordering::Equal)
}

pub fn is_update_available(installed: &str, candidate: &str) -> bool {
    matches!(
        compare_versions(installed, candidate),
        Some(Ordering::Less)
    )
}

pub fn extract_version_from_text(text: &str) -> Option<String> {
    let lower = text.to_lowercase();
    let markers = ["version ", "version:", " v", " driver "];
    for marker in markers {
        if let Some(pos) = lower.find(marker) {
            let slice = &text[pos + marker.len()..];
            if let Some(version) = take_leading_version(slice.trim()) {
                return Some(version);
            }
        }
    }

    take_trailing_dotted_version(text)
}

fn take_leading_version(input: &str) -> Option<String> {
    let mut end = 0usize;
    let mut saw_digit = false;
    for (index, ch) in input.char_indices() {
        if ch.is_ascii_digit() {
            saw_digit = true;
            end = index + 1;
            continue;
        }
        if saw_digit && (ch == '.' || ch == ',') {
            end = index + 1;
            continue;
        }
        if saw_digit {
            break;
        }
    }

    if saw_digit {
        Some(input[..end].replace(',', "."))
    } else {
        None
    }
}

fn take_trailing_dotted_version(text: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let mut end = bytes.len();
    while end > 0 && bytes[end - 1].is_ascii_whitespace() {
        end -= 1;
    }

    let mut start = end;
    let mut saw_digit = false;
    while start > 0 {
        let ch = bytes[start - 1] as char;
        if ch.is_ascii_digit() {
            saw_digit = true;
            start -= 1;
            continue;
        }
        if saw_digit && (ch == '.' || ch == ',') {
            start -= 1;
            continue;
        }
        break;
    }

    if saw_digit && end - start >= 3 {
        Some(text[start..end].replace(',', "."))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compares_dotted_versions() {
        assert_eq!(
            compare_versions("32.0.31007.5012", "32.0.31008.5012"),
            Some(Ordering::Less)
        );
        assert_eq!(
            compare_versions("10.0.22631.51234", "10.0.22631.51234"),
            Some(Ordering::Equal)
        );
        assert_eq!(compare_versions("551.86", "552.12"), Some(Ordering::Less));
    }

    #[test]
    fn compares_different_segment_counts() {
        assert_eq!(compare_versions("1.2.3", "1.2.3.1"), Some(Ordering::Less));
        assert_eq!(compare_versions("2.10", "2.9"), Some(Ordering::Greater));
    }

    #[test]
    fn unpacks_wmi_numeric_versions() {
        assert_eq!(version_parts("310075012"), vec![3, 10, 7, 50, 12]);
        assert_eq!(version_parts("32.0.31007.5012"), vec![32, 0, 31007, 5012]);
    }

    #[test]
    fn extracts_version_from_title() {
        assert_eq!(
            extract_version_from_text("Realtek Net Driver v3.5.0.1383"),
            Some("3.5.0.1383".into())
        );
    }
}
