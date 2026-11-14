use std::cmp::Ordering;

/// Only dotted numeric versions are comparable. A bare integer has no known encoding.
pub fn version_parts(raw: &str) -> Vec<u64> {
    let version = raw.trim().trim_start_matches(['v', 'V']);
    let segments: Vec<_> = version.split('.').collect();
    if !(2..=4).contains(&segments.len()) {
        return Vec::new();
    }
    segments
        .into_iter()
        .map(|part| {
            if part.is_empty() || !part.bytes().all(|c| c.is_ascii_digit()) {
                return None;
            }
            part.parse::<u16>().ok().map(u64::from)
        })
        .collect::<Option<Vec<_>>>()
        .unwrap_or_default()
}

/// Preserve the reported version; formatting must never invent a different number.
pub fn display_version(raw: &str) -> Option<String> {
    let value = raw.trim();
    (!value.is_empty() && !value.eq_ignore_ascii_case("n/a")).then(|| value.to_string())
}

pub fn compare_versions(installed: &str, candidate: &str) -> Option<Ordering> {
    let left = version_parts(installed);
    let right = version_parts(candidate);
    if left.is_empty() || right.is_empty() {
        return None;
    }
    for index in 0..left.len().max(right.len()) {
        let order = left.get(index).unwrap_or(&0).cmp(right.get(index).unwrap_or(&0));
        if order != Ordering::Equal {
            return Some(order);
        }
    }
    Some(Ordering::Equal)
}

pub fn is_update_available(installed: &str, candidate: &str) -> bool {
    compare_versions(installed, candidate) == Some(Ordering::Less)
}

/// Windows Update titles normally end with the driver version. Ignore other numbers.
pub fn extract_version_from_text(text: &str) -> Option<String> {
    let tail = text.split_whitespace().last()?.trim_start_matches(['v', 'V']);
    (!version_parts(tail).is_empty()).then(|| tail.to_string())
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ambiguous_versions_are_not_compared() {
        assert_eq!(compare_versions("3202151234", "32.2.15.12"), None);
        assert_eq!(compare_versions("driver 1.2 beta 3", "1.2.4"), None);
    }

    #[test]
    fn compares_dotted_versions() {
        assert_eq!(compare_versions("32.0.31007.5012", "32.0.31008.5012"), Some(Ordering::Less));
        assert_eq!(compare_versions("10.0.22631.51234", "10.0.22631.51234"), Some(Ordering::Equal));
        assert_eq!(compare_versions("551.86", "552.12"), Some(Ordering::Less));
    }

    #[test]
    fn compares_different_segment_counts() {
        assert_eq!(compare_versions("1.2.3", "1.2.3.1"), Some(Ordering::Less));
        assert_eq!(compare_versions("2.10", "2.9"), Some(Ordering::Greater));
    }

    #[test]
    fn preserves_unknown_numeric_versions() {
        assert!(version_parts("310075012").is_empty());
        assert_eq!(version_parts("32.0.31007.5012"), vec![32, 0, 31007, 5012]);
    }

    #[test]
    fn extracts_version_from_title() {
        assert_eq!(extract_version_from_text("Realtek Net Driver v3.5.0.1383"), Some("3.5.0.1383".into()));
    }
}
