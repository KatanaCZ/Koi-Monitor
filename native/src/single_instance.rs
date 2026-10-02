//! One Koi per session: a second launch wakes the first one and leaves.
//!
//! A named event serves as both the lock (it exists while Koi runs) and the doorbell
//! (a second launch signals it).

use windows::core::HSTRING;
use windows::Win32::Foundation::{CloseHandle, GetLastError, ERROR_ALREADY_EXISTS, HANDLE, WAIT_OBJECT_0};
use windows::Win32::System::Threading::{CreateEventW, SetEvent, WaitForSingleObject, INFINITE};

/// The event of the real application, local to the user's session.
pub const NAME: &str = "Local\\com.koi.monitor.instance";

pub enum Claim {
    First(Instance),
    /// Another Koi holds the name; it has been asked to show itself.
    AlreadyRunning,
}

/// The running application's hold on the name; released when dropped.
pub struct Instance {
    event: HANDLE,
}

// SAFETY: an event handle may be waited on and closed from any thread.
unsafe impl Send for Instance {}

/// Takes `name` for this process, or rings the process that already has it.
/// When the event cannot be created at all, Koi starts anyway.
pub fn claim(name: &str) -> Claim {
    // SAFETY: plain Win32 calls; the handle is owned by the returned `Instance` or closed here.
    unsafe {
        let Ok(event) = CreateEventW(None, false, false, &HSTRING::from(name)) else {
            return Claim::First(Instance { event: HANDLE::default() });
        };
        if GetLastError() == ERROR_ALREADY_EXISTS {
            let _ = SetEvent(event);
            let _ = CloseHandle(event);
            return Claim::AlreadyRunning;
        }
        Claim::First(Instance { event })
    }
}

impl Instance {
    /// Calls `wake` each time another launch rings, for as long as the application runs.
    pub fn on_second_launch(self, wake: impl Fn() + Send + 'static) {
        if self.event.is_invalid() {
            return;
        }
        std::thread::spawn(move || {
            // The whole `Instance` moves in, not just its handle: it is what is `Send`.
            let instance = self;
            // SAFETY: `instance` keeps the handle open for the whole loop.
            while unsafe { WaitForSingleObject(instance.event, INFINITE) } == WAIT_OBJECT_0 {
                wake();
            }
        });
    }
}

impl Drop for Instance {
    fn drop(&mut self) {
        if !self.event.is_invalid() {
            // SAFETY: the handle came from `CreateEventW` and is closed once.
            unsafe {
                let _ = CloseHandle(self.event);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;
    use std::time::Duration;

    fn unique(test: &str) -> String {
        format!("Local\\koi-monitor-test-{}-{test}", std::process::id())
    }

    #[test]
    fn second_claim_finds_the_first() {
        let name = unique("claim");
        let first = claim(&name);

        assert!(matches!(first, Claim::First(_)));
        assert!(matches!(claim(&name), Claim::AlreadyRunning));
    }

    #[test]
    fn name_is_free_again_once_the_first_is_gone() {
        let name = unique("release");
        drop(claim(&name));

        assert!(matches!(claim(&name), Claim::First(_)));
    }

    #[test]
    fn second_launch_wakes_the_first() {
        let name = unique("wake");
        let Claim::First(instance) = claim(&name) else { panic!("the name is free") };
        let (woken, wake) = mpsc::channel();
        instance.on_second_launch(move || {
            let _ = woken.send(());
        });

        assert!(matches!(claim(&name), Claim::AlreadyRunning));
        wake.recv_timeout(Duration::from_secs(5)).expect("the first instance is told");
    }
}
