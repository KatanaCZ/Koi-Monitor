//! Koi Monitor — native Windows UI (iced + wgpu), no WebView.

#![windows_subsystem = "windows"]

mod alerts;
mod app;
mod audio;
mod backend;
mod clock;
mod gfx;
mod i18n;
mod icon;
mod notify;
mod settings;
mod splash;
mod theme;
mod tray;
mod ui;
mod zen_state;

use app::App;
use theme::Palette;

fn main() -> iced::Result {
    // wgpu probes every backend by default, which loads the Vulkan and OpenGL drivers
    // next to Direct3D 12 and doubles the committed memory. Koi is Windows-only: use DX12.
    if std::env::var_os("WGPU_BACKEND").is_none() {
        std::env::set_var("WGPU_BACKEND", "dx12");
    }

    // A daemon keeps running without any window: that is Koi in the notification area.
    let mut application = iced::daemon(App::boot, App::update, App::view)
        .title(App::title)
        .subscription(App::subscription)
        .theme(|app: &App, _window| match app.settings.theme {
            settings::ThemeMode::Dark => iced::Theme::Dark,
            settings::ThemeMode::Light => iced::Theme::Light,
        })
        .style(|app, _| {
            let palette = Palette::of(app.settings.theme);
            iced::theme::Style { background_color: palette.background, text_color: palette.foreground }
        })
        .default_font(theme::GEIST)
        .antialiasing(true);

    for font in theme::FONT_FILES {
        application = application.font(font);
    }

    application.run()
}
