//! Windows telemetry and diagnostics. No UI types in here.
//!
//! `system` runs the telemetry loop and pushes its samples to the UI through a channel;
//! the other modules are queried on demand.

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
