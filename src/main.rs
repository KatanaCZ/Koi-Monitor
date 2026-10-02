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
mod logger;
mod notify;
mod settings;
mod single_instance;
mod splash;
mod theme;
mod tray;
mod ui;
mod zen_state;

use app::App;
use theme::Palette;

fn main() -> iced::Result {
    logger::init();

    // A session opened with `KOI_DEV_STATE` is a throwaway one that may run next to the real Koi.
    if std::env::var_os("KOI_DEV_STATE").is_none() {
        match single_instance::claim(single_instance::NAME) {
            single_instance::Claim::First(instance) => instance.on_second_launch(|| tray::emit(tray::Event::Show)),
            single_instance::Claim::AlreadyRunning => return Ok(()),
        }
    }

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
