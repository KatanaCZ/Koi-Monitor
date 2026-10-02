//! Lucide icons, the same set as the web UI (`native/tools/gen-assets.mjs`).

use iced::widget::svg::{self, Handle, Svg};
use iced::Color;
use std::sync::OnceLock;

macro_rules! icons {
    ($($variant:ident => $file:literal),* $(,)?) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq)]
        pub enum Icon {
            $($variant),*
        }

        impl Icon {
            fn handle(self) -> Handle {
                match self {
                    $(Icon::$variant => {
                        static HANDLE: OnceLock<Handle> = OnceLock::new();
                        HANDLE
                            .get_or_init(|| {
                                Handle::from_memory(
                                    include_bytes!(concat!("../../assets/icons/", $file, ".svg")).as_slice(),
                                )
                            })
                            .clone()
                    })*
                }
            }
        }
    };
}

icons! {
    Activity => "activity",
    ArrowDown => "arrow-down",
    Battery => "battery",
    BatteryCharging => "battery-charging",
    BatteryLow => "battery-low",
    Bell => "bell",
    Bluetooth => "bluetooth",
    Box => "box",
    Check => "check",
    ChevronDown => "chevron-down",
    ChevronRight => "chevron-right",
    Clock => "clock",
    Cpu => "cpu",
    Crown => "crown",
    Disc => "disc",
    Download => "download",
    EthernetPort => "ethernet-port",
    ExternalLink => "external-link",
    Eye => "eye",
    EyeOff => "eye-off",
    Flower => "flower",
    Gamepad => "gamepad-2",
    Globe => "globe",
    HardDrive => "hard-drive",
    Heart => "heart",
    Info => "info",
    Loader => "loader-circle",
    Maximize => "maximize-2",
    MemoryStick => "memory-stick",
    Minimize => "minimize-2",
    Minus => "minus",
    Monitor => "monitor",
    MonitorPlay => "monitor-play",
    Moon => "moon",
    Music => "music",
    RefreshCw => "refresh-cw",
    RotateCcw => "rotate-ccw",
    Router => "router",
    Settings => "settings",
    Settings2 => "settings-2",
    ShieldCheck => "shield-check",
    Signal => "signal",
    Square => "square",
    Sun => "sun",
    Trash => "trash-2",
    Upload => "upload",
    Volume => "volume-2",
    VolumeX => "volume-x",
    Wifi => "wifi",
    X => "x",
    Zap => "zap",
}

/// A square icon of the given size, tinted with `color`.
pub fn icon<'a>(icon: Icon, size: f32, color: Color) -> Svg<'a> {
    iced::widget::svg(icon.handle())
        .width(size)
        .height(size)
        .style(move |_theme, _status| svg::Style { color: Some(color) })
}
