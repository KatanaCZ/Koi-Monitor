//! "Wake with Windows": a per-user startup entry pointing at this executable.
//!
//! Same registry value as the Tauri autostart plugin used, so upgrading keeps the choice.

use std::os::windows::process::CommandExt;
use std::process::Command;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;
const RUN_KEY: &str = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run";
const VALUE_NAME: &str = "Koi Monitor";

fn reg(args: &[&str]) -> Result<(), String> {
    let status = Command::new("reg")
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|error| format!("Failed to run reg.exe: {error}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("reg.exe exited with {status}"))
    }
}

/// Adds or removes the startup entry.
pub fn set_enabled(enabled: bool) -> Result<(), String> {
    if enabled {
        let exe = std::env::current_exe().map_err(|error| format!("Cannot locate the executable: {error}"))?;
        let command = format!("\"{}\"", exe.display());
        reg(&["add", RUN_KEY, "/v", VALUE_NAME, "/t", "REG_SZ", "/d", &command, "/f"])
    } else if is_enabled() {
        reg(&["delete", RUN_KEY, "/v", VALUE_NAME, "/f"])
    } else {
        Ok(())
    }
}

pub fn is_enabled() -> bool {
    reg(&["query", RUN_KEY, "/v", VALUE_NAME]).is_ok()
}
