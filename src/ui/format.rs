//! Display units shared by metric cards and chart inspection.

/// (value, unit) for a throughput in MB/s.
pub fn format_speed(megabytes_per_second: f64, french: bool) -> (String, &'static str) {
    if megabytes_per_second < 1.0 {
        (format!("{:.1}", megabytes_per_second * 1024.0), if french { "Ko/s" } else { "KB/s" })
    } else {
        (format!("{megabytes_per_second:.2}"), if french { "Mo/s" } else { "MB/s" })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn speeds_switch_unit_at_one_megabyte() {
        assert_eq!(format_speed(0.5, true), ("512.0".to_string(), "Ko/s"));
        assert_eq!(format_speed(2.345, false), ("2.35".to_string(), "MB/s"));
    }
}
