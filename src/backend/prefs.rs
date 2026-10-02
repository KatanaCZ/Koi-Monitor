//! Windows accessibility preferences Koi follows.

use windows::Win32::Foundation::BOOL;
use windows::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPI_GETCLIENTAREAANIMATION, SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS};

/// "Animation effects" is turned off in Windows settings (`prefers-reduced-motion`).
pub fn reduced_motion() -> bool {
    let mut animations = BOOL(1);
    let read = unsafe {
        SystemParametersInfoW(
            SPI_GETCLIENTAREAANIMATION,
            0,
            Some(&mut animations as *mut BOOL as *mut _),
            SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
        )
    };
    read.is_ok() && !animations.as_bool()
}
