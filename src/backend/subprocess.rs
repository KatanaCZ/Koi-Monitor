//! Helper processes (PowerShell, pnputil), run hidden and under a wall-clock timeout.

use std::time::{Duration, Instant};

#[cfg(target_os = "windows")]
use std::io::Read;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
use std::process::{Command, Output, Stdio};
#[cfg(target_os = "windows")]
use std::thread::JoinHandle;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Runs `command` without a console window and returns its output, or an error once
/// `timeout_secs` have passed (the process is then killed).
#[cfg(target_os = "windows")]
pub fn run_with_timeout(mut command: Command, name: &str, timeout_secs: u64) -> Result<Output, String> {
    let mut child = command
        .creation_flags(CREATE_NO_WINDOW)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to start {name}: {error}"))?;

    // A child blocks as soon as a pipe is full (64 KB): read both while it runs.
    let stdout = drain(child.stdout.take());
    let stderr = drain(child.stderr.take());

    let deadline = Instant::now() + Duration::from_secs(timeout_secs);
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if Instant::now() >= deadline => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!("{name} timed out after {timeout_secs}s"));
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(50)),
            Err(error) => return Err(format!("{name} wait failed: {error}")),
        }
    };

    Ok(Output { status, stdout: stdout.join().unwrap_or_default(), stderr: stderr.join().unwrap_or_default() })
}

/// Reads a pipe to its end on its own thread.
#[cfg(target_os = "windows")]
fn drain<R: Read + Send + 'static>(pipe: Option<R>) -> JoinHandle<Vec<u8>> {
    std::thread::spawn(move || {
        let mut bytes = Vec::new();
        if let Some(mut pipe) = pipe {
            let _ = pipe.read_to_end(&mut bytes);
        }
        bytes
    })
}

/// Runs a PowerShell script, hidden, under a wall-clock timeout.
#[cfg(target_os = "windows")]
pub fn run_powershell_with_timeout(script: &str, timeout_secs: u64) -> Result<Output, String> {
    let mut command = Command::new("powershell");
    command.args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script]);
    run_with_timeout(command, "PowerShell", timeout_secs)
}

#[cfg(not(target_os = "windows"))]
pub fn run_powershell_with_timeout(_script: &str, _timeout_secs: u64) -> Result<std::process::Output, String> {
    Err("PowerShell is only available on Windows".to_string())
}

#[cfg(all(test, target_os = "windows"))]
mod tests {
    use super::*;

    #[test]
    fn output_larger_than_the_pipe_buffer_is_read() {
        let output = run_powershell_with_timeout("'x' * 300000", 30).expect("PowerShell finishes");
        assert!(output.stdout.len() >= 300_000, "read {} bytes", output.stdout.len());
    }

    #[test]
    fn hanging_script_times_out() {
        let started = Instant::now();
        let error = run_powershell_with_timeout("Start-Sleep -Seconds 30", 2).unwrap_err();
        assert!(error.contains("timed out"), "{error}");
        assert!(started.elapsed() < Duration::from_secs(10));
    }
}
