//! Windows telemetry and diagnostics. No UI types in here.
//!
//! `dns`, `drivers*`, `gaming_latency`, `memory`, `security` and `subprocess` are the
//! modules of the Tauri backend, unchanged. `system` is the telemetry loop that used
//! to live in `src-tauri/src/lib.rs`, emitting through a channel instead of Tauri events.

pub mod autostart;
pub mod dns;
pub mod driver_status;
mod driver_store;
pub mod driver_updates;
mod driver_version;
pub mod drivers;
pub mod gaming_latency;
pub mod memory;
pub mod open;
pub mod prefs;
pub mod security;
mod subprocess;
pub mod system;
