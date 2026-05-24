use std::time::{Duration, Instant};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
use std::process::{Command, Output, Stdio};

/// Exécute PowerShell avec fenêtre masquée et timeout wall-clock.
#[cfg(target_os = "windows")]
pub fn run_powershell_with_timeout(script: &str, timeout_secs: u64) -> Result<Output, String> {
    let mut child = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ])
        .creation_flags(0x08000000)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to start PowerShell: {error}"))?;

    let deadline = Instant::now() + Duration::from_secs(timeout_secs);
    loop {
        match child.try_wait() {
            Ok(Some(_)) => {
                return child
                    .wait_with_output()
                    .map_err(|error| format!("Failed to read PowerShell output: {error}"));
            }
            Ok(None) => {
                if Instant::now() >= deadline {
                    let _ = child.kill();
                    return Err(format!("PowerShell timed out after {timeout_secs}s"));
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            Err(error) => return Err(format!("PowerShell wait failed: {error}")),
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn run_powershell_with_timeout(_script: &str, _timeout_secs: u64) -> Result<std::process::Output, String> {
    Err("PowerShell is only available on Windows".to_string())
}
