//! Warnings and errors, written to `%LOCALAPPDATA%\com.koi.monitor\koi.log`.
//!
//! Koi has no console: without this file a failed driver scan or a refused setting
//! would leave no trace.

use log::{Level, LevelFilter, Log, Metadata, Record};
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use windows::Win32::System::SystemInformation::GetLocalTime;

/// A log this large starts afresh at launch, and a session never writes more than this.
const MAX_BYTES: u64 = 256 * 1024;

pub struct FileLogger {
    file: Mutex<File>,
    written: AtomicU64,
}

impl FileLogger {
    fn open(path: &Path) -> std::io::Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let oversized = std::fs::metadata(path).is_ok_and(|metadata| metadata.len() > MAX_BYTES);
        let file = OpenOptions::new().create(true).append(!oversized).write(true).truncate(oversized).open(path)?;
        Ok(Self { file: Mutex::new(file), written: AtomicU64::new(0) })
    }
}

impl Log for FileLogger {
    /// Koi's own messages from `info` up; the libraries only when something is wrong.
    fn enabled(&self, metadata: &Metadata) -> bool {
        let own = metadata.target().starts_with("koi_monitor");
        metadata.level() <= if own { Level::Info } else { Level::Warn }
    }

    fn log(&self, record: &Record) {
        if !self.enabled(record.metadata()) || self.written.load(Ordering::Relaxed) > MAX_BYTES {
            return;
        }
        // SAFETY: `GetLocalTime` only returns a value.
        let now = unsafe { GetLocalTime() };
        let line = format!(
            "{:04}-{:02}-{:02} {:02}:{:02}:{:02} {} {}: {}\n",
            now.wYear,
            now.wMonth,
            now.wDay,
            now.wHour,
            now.wMinute,
            now.wSecond,
            record.level(),
            record.target(),
            record.args()
        );
        if let Ok(mut file) = self.file.lock() {
            if file.write_all(line.as_bytes()).is_ok() {
                self.written.fetch_add(line.len() as u64, Ordering::Relaxed);
            }
        }
    }

    fn flush(&self) {
        if let Ok(mut file) = self.file.lock() {
            let _ = file.flush();
        }
    }
}

/// Routes the `log` macros to the file. Without a writable data directory, nothing is logged.
pub fn init() {
    let Some(path) = crate::settings::data_dir().map(|dir| dir.join("koi.log")) else {
        return;
    };
    if let Ok(logger) = FileLogger::open(&path) {
        if log::set_boxed_logger(Box::new(logger)).is_ok() {
            log::set_max_level(LevelFilter::Info);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch_file(test: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("koi-logger-{}-{test}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        dir.join("koi.log")
    }

    fn metadata(level: Level, target: &str) -> Metadata<'_> {
        Metadata::builder().level(level).target(target).build()
    }

    #[test]
    fn records_are_appended_to_the_file() {
        let path = scratch_file("append");
        let logger = FileLogger::open(&path).expect("log file opens");

        logger.log(
            &Record::builder()
                .level(Level::Warn)
                .target("koi_monitor::backend::drivers")
                .args(format_args!("driver scan failed"))
                .build(),
        );

        let text = std::fs::read_to_string(&path).unwrap();
        assert!(text.contains("WARN koi_monitor::backend::drivers: driver scan failed"), "{text}");
    }

    #[test]
    fn dependencies_are_heard_only_when_something_is_wrong() {
        let logger = FileLogger::open(&scratch_file("levels")).unwrap();

        assert!(logger.enabled(&metadata(Level::Info, "koi_monitor::backend::driver_updates")));
        assert!(!logger.enabled(&metadata(Level::Debug, "koi_monitor::app")));
        assert!(logger.enabled(&metadata(Level::Warn, "wgpu_core::device")));
        assert!(!logger.enabled(&metadata(Level::Info, "wgpu_core::device")));
    }

    #[test]
    fn oversized_log_starts_afresh() {
        let path = scratch_file("rotate");
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, vec![b'x'; MAX_BYTES as usize + 1]).unwrap();

        let _logger = FileLogger::open(&path).unwrap();

        assert_eq!(std::fs::metadata(&path).unwrap().len(), 0);
    }
}
