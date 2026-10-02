//! Opening external links in the default browser, restricted to known hosts.

use std::os::windows::process::CommandExt;
use std::process::Command;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

const DRIVER_HOSTS: &[&str] = &[
    "www.nvidia.com",
    "www.amd.com",
    "www.intel.com",
    "www.realtek.com",
    "www.broadcom.com",
    "www.qualcomm.com",
    "www.mediatek.com",
    "semiconductor.samsung.com",
    "www.catalog.update.microsoft.com",
    "www.google.com",
];

const DONATION_HOSTS: &[&str] = &["ko-fi.com", "www.ko-fi.com"];

/// Host of an `https://host/...` URL; `None` for any other scheme or an authority
/// carrying credentials or a port.
fn https_host(url: &str) -> Option<String> {
    let rest = url.strip_prefix("https://")?;
    let authority = rest.split(['/', '?', '#']).next()?;
    if authority.is_empty() || authority.contains(['@', ':']) || authority.chars().any(char::is_whitespace) {
        return None;
    }
    Some(authority.to_ascii_lowercase())
}

/// Only HTTPS links to vendor, catalogue and search hosts (blocks `file:`, `javascript:`…).
pub fn is_safe_driver_url(url: &str) -> bool {
    https_host(url).is_some_and(|host| DRIVER_HOSTS.contains(&host.as_str()))
}

pub fn is_safe_donation_url(url: &str) -> bool {
    https_host(url).is_some_and(|host| DONATION_HOSTS.contains(&host.as_str()))
}

/// Hands an already validated URL to the shell. The URL is a single argument:
/// nothing in it is interpreted by a command processor.
fn launch(url: &str) -> Result<(), String> {
    Command::new("rundll32")
        .args(["url.dll,FileProtocolHandler", url])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Failed to open {url}: {error}"))
}

pub fn open_driver_url(url: &str) -> Result<(), String> {
    if !is_safe_driver_url(url) {
        return Err(format!("Blocked unsafe external URL: {url}"));
    }
    launch(url)
}

pub fn open_donation_url(url: &str) -> Result<(), String> {
    if !is_safe_donation_url(url) {
        return Err(format!("Blocked unsafe donation URL: {url}"));
    }
    launch(url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_known_https_hosts_only() {
        assert!(is_safe_driver_url("https://www.nvidia.com/Download/index.aspx"));
        assert!(is_safe_driver_url("https://www.catalog.update.microsoft.com/Search.aspx?q=PCI%5CVEN_10DE&x=1"));
        assert!(!is_safe_driver_url("http://www.nvidia.com/"));
        assert!(!is_safe_driver_url("https://evil.example/www.nvidia.com"));
        assert!(!is_safe_driver_url("https://www.nvidia.com@evil.example/"));
        assert!(!is_safe_driver_url("https://www.nvidia.com:8443/"));
        assert!(!is_safe_driver_url("file:///C:/Windows/System32/calc.exe"));
        assert!(!is_safe_driver_url("javascript:alert(1)"));
    }

    #[test]
    fn donation_links_go_to_ko_fi_only() {
        assert!(is_safe_donation_url("https://ko-fi.com/katanacz"));
        assert!(!is_safe_donation_url("https://www.nvidia.com/"));
    }
}
