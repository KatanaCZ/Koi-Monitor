//! Koi Monitor — native Windows UI (iced + wgpu), no WebView.

#![windows_subsystem = "windows"]

mod alerts;
mod app;
mod backend;
mod clock;
mod gfx;
mod i18n;
mod notify;
mod settings;
mod theme;
mod ui;
mod zen_state;

use iced::window::settings::PlatformSpecific;
use iced::{window, Size};

use app::App;
use theme::Palette;

fn main() -> iced::Result {
    // wgpu probes every backend by default, which loads the Vulkan and OpenGL drivers
    // next to Direct3D 12 and doubles the committed memory. Koi is Windows-only: use DX12.
    if std::env::var_os("WGPU_BACKEND").is_none() {
        std::env::set_var("WGPU_BACKEND", "dx12");
    }

    let mut application = iced::application(App::boot, App::update, App::view)
        .title("Koi Monitor")
        .subscription(App::subscription)
        .theme(|app: &App| match app.settings.theme {
            settings::ThemeMode::Dark => iced::Theme::Dark,
            settings::ThemeMode::Light => iced::Theme::Light,
        })
        .style(|app, _| {
            let palette = Palette::of(app.settings.theme);
            iced::theme::Style { background_color: palette.background, text_color: palette.foreground }
        })
        .default_font(theme::GEIST)
        .antialiasing(true)
        .window(window::Settings {
            size: Size::new(1400.0, 900.0),
            min_size: Some(Size::new(1024.0, 768.0)),
            decorations: false,
            platform_specific: PlatformSpecific {
                undecorated_shadow: true,
                corner_preference: window::settings::platform::CornerPreference::Round,
                ..PlatformSpecific::default()
            },
            ..window::Settings::default()
        });

    for font in theme::FONT_FILES {
        application = application.font(font);
    }

    application.run()
}
