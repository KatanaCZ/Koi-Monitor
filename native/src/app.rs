//! Application state, messages and the update loop.

use iced::keyboard::{self, key};
use iced::widget::canvas::Cache;
use iced::widget::{center, column, container, mouse_area, opaque, shader, stack};
use iced::window::settings::PlatformSpecific;
use iced::{window, Element, Fill, Padding, Size, Subscription, Task};
use std::time::{Duration, Instant};

use crate::alerts::{self, Severity};
use crate::audio::{Music, Track};
use crate::backend::dns::{self, DnsResult};
use crate::backend::drivers::{self, DriverInfo};
use crate::backend::gaming_latency::GamingLatencySnapshot;
use crate::backend::system::{self, SystemInfo};
use crate::backend::{autostart, driver_updates, open};
use crate::gfx::{Atmosphere, Backdrop};
use crate::i18n::Tr;
use crate::notify::{self, Source};
use crate::splash::{self, Splash};
use crate::settings::{
    self, default_dns_checklist, is_valid_custom_dns_ipv4, AlertThresholds, BackgroundAura, CustomDns, DesktopAlerts,
    GamingAlerts, Language, NeonGlow, SakuraColor, SakuraIntensity, Sensitivity, Settings, ThemeMode, WidgetMode,
};
use crate::theme::Palette;
use crate::tray::{self, Tray};
use crate::ui::charts::History;
use crate::ui::kit::Ctx;
use crate::ui::settings::{is_max_atmosphere, Dialog, Preset};
use crate::ui::{dashboard, overlays, pill, title_bar, zen};
use crate::zen_state::LoadTracker;

const KOFI_URL: &str = "https://ko-fi.com/katanacz";

/// Tabs of the Settings dialog.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SettingsTab {
    General,
    Visual,
    Network,
    Alerts,
    About,
}

/// A dashboard card shown enlarged over the rest.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Expanded {
    Dns,
    Drivers,
}

/// A preference changed from the Settings dialog.
#[derive(Debug, Clone)]
pub enum Change {
    RefreshInterval(u32),
    Language(Language),
    SimplifiedMode(bool),
    LaunchAtStartup(bool),
    MinimizeToTray(bool),
    ShowDesktopWidget(bool),
    WidgetMode(WidgetMode),
    Preset(Preset),
    Theme(ThemeMode),
    SakuraIntensity(SakuraIntensity),
    SakuraColor(SakuraColor),
    Glass(bool),
    Aura(BackgroundAura),
    Neon(NeonGlow),
    CalmMotion(bool),
    DnsInterval(u32),
    /// A preset DNS server ticked or unticked.
    DnsServer(&'static str, bool),
    AlertsEnabled(bool),
    Sensitivity(Sensitivity),
    GamingAlerts(bool),
}

#[derive(Debug, Clone)]
pub enum Message {
    Backend(system::Event),
    /// Once a second: refreshes the uptime chip and the Zen clock.
    Tick,
    /// Animation frame of the opening screen.
    SplashTick,
    EscapePressed,

    ToggleMute,
    ToggleNotifications,
    ClearNotifications,
    ToastExpired(u32),
    AlertOnboarding(bool),
    ToggleZen,
    ToggleZenMetrics,
    /// The pointer entered (true) or left (false) the Zen title bar area.
    ZenBar(bool),
    /// Hides the Zen title bar, unless the pointer came back since this was scheduled.
    ZenBarHide(u32),
    ToggleTheme,
    Expand(Option<Expanded>),

    OpenSettings(Option<SettingsTab>),
    CloseSettings,
    SettingsTab(SettingsTab),
    Setting(Change),
    SettingsToastExpired(u32),
    CustomDnsIp(String),
    CustomDnsLabel(String),
    CustomDnsCommit,
    CustomDnsClear,
    ResetSettings,
    ResetExpired(u32),
    Donate,
    /// A click on the "Koi" wordmark (five quick ones play the secret melody).
    SecretTap,

    DnsTick,
    DnsAutoTest,
    DnsResults(Result<Vec<DnsResult>, String>),
    ToggleGamingDetails,

    DriversRefresh,
    DriversLoaded { simplified: bool, enriched: bool, manual: bool, result: Result<Vec<DriverInfo>, String> },
    DriverSelect(String),
    OpenWindowsUpdate,
    OpenUrl(String),

    DragWindow,
    MinimizeWindow,
    ToggleMaximize,
    CloseWindow,
    WindowResized(window::Id, Size),
    Maximized(bool),
    /// The user asked a window to close (title bar, Alt+F4, taskbar).
    CloseRequested(window::Id),
    WindowClosed(window::Id),

    Tray(tray::Event),
    ShowMainWindow,
    DragWidget,
    CloseWidget,
    /// The easter-egg click streak lapsed.
    SecretTapExpired(u32),
}

/// A dialog over a dimmed page: clicking outside closes it, clicks inside stay in it.
fn modal<'a>(dialog: Element<'a, Message>, on_dismiss: Message, overlay: iced::Color) -> Element<'a, Message> {
    opaque(
        mouse_area(
            center(opaque(dialog))
                .padding(32)
                .style(move |_| container::Style { background: Some(overlay.into()), ..container::Style::default() }),
        )
        .on_press(on_dismiss),
    )
}

pub struct App {
    pub settings: Settings,
    pub system: Option<Box<SystemInfo>>,
    pub gaming: GamingLatencySnapshot,

    pub dns_results: Vec<DnsResult>,
    pub dns_pinging: bool,
    /// A DNS test has completed at least once, successfully or not.
    pub dns_attempted: bool,
    pub gaming_details_open: bool,

    pub drivers: Vec<DriverInfo>,
    pub drivers_loading: bool,
    /// The first driver scan has finished, whatever its outcome.
    drivers_settled: bool,
    /// Telemetry samples received since launch.
    samples_received: u32,
    /// The opening screen, until it has played.
    splash: Option<Splash>,
    /// Key of the driver picked in the expanded drivers view.
    pub driver_selected: Option<String>,

    pub cpu_history: History,
    pub ram_history: History,
    pub gpu_history: History,
    pub download_history: History,
    pub upload_history: History,
    pub cores_cache: Cache,
    pub wordmark_cache: Cache,
    pub about_wordmark_cache: Cache,

    pub zen_tracker: LoadTracker,
    /// In Zen mode the title bar hides until the pointer reaches the top edge.
    pub zen_bar_revealed: bool,
    zen_bar_seq: u32,

    pub notifications: notify::Center,
    pub notification_panel_open: bool,
    watcher: alerts::Watcher,
    onboarding_open: bool,

    pub settings_dialog: Option<Dialog>,
    pub expanded: Option<Expanded>,

    /// The dashboard window; None while Koi sits in the notification area.
    main_window: Option<window::Id>,
    /// The desktop widget window, when shown.
    widget_window: Option<window::Id>,
    tray: Option<Tray>,
    music: Music,
    /// The secret track is playing instead of the ambient one.
    easter_active: bool,
    /// Windows has animation effects turned off: no petals, no ripples, no music on its own.
    reduced_motion: bool,
    /// Quick clicks on the wordmark so far, and the streak they belong to.
    secret_taps: u8,
    secret_seq: u32,
    pub window_size: Size,
    pub maximized: bool,
    /// When `system.uptime` was last received, to count seconds in between samples.
    uptime_synced: Instant,
}

impl App {
    pub fn boot() -> (Self, Task<Message>) {
        let settings = settings::load();
        system::set_interval(Duration::from_millis(settings.refresh_interval as u64));
        let onboarding_open = !settings.alerts_onboarding_done;

        let mut app = Self {
            settings,
            system: None,
            gaming: GamingLatencySnapshot {
                gateway_ms: -1.0,
                internet_ms: -1.0,
                verdict: "measuring".into(),
                internet_host: "1.1.1.1".into(),
                ..Default::default()
            },
            dns_results: Vec::new(),
            dns_pinging: false,
            dns_attempted: false,
            gaming_details_open: false,
            drivers: Vec::new(),
            drivers_loading: false,
            drivers_settled: false,
            samples_received: 0,
            splash: Some(Splash::new(Instant::now())),
            driver_selected: None,
            cpu_history: History::new(),
            ram_history: History::new(),
            gpu_history: History::new(),
            download_history: History::new(),
            upload_history: History::new(),
            cores_cache: Cache::new(),
            wordmark_cache: Cache::new(),
            about_wordmark_cache: Cache::new(),
            zen_tracker: LoadTracker::new(),
            zen_bar_revealed: false,
            zen_bar_seq: 0,
            notifications: notify::Center::default(),
            notification_panel_open: false,
            watcher: alerts::Watcher::new(),
            onboarding_open,
            settings_dialog: None,
            expanded: None,
            main_window: None,
            widget_window: None,
            tray: None,
            music: Music::default(),
            easter_active: false,
            reduced_motion: crate::backend::prefs::reduced_motion(),
            secret_taps: 0,
            secret_seq: 0,
            window_size: Size::new(1400.0, 900.0),
            maximized: false,
            uptime_synced: Instant::now(),
        };

        let dev_state = app.apply_dev_state();
        app.sync_tray();
        // The music waits for the opening screen to finish.
        if app.splash.is_none() {
            app.sync_music();
        }
        let startup = Task::batch([
            app.show_main_window(),
            app.sync_widget(),
            app.ping_dns(),
            app.scan_drivers(false, false),
            dev_state,
        ]);
        (app, startup)
    }

    /// Opens the app in a given state, for screenshots and manual checks:
    /// `KOI_DEV_STATE=expand-drivers,gaming-details,scroll-end` (comma separated).
    fn apply_dev_state(&mut self) -> Task<Message> {
        let Ok(state) = std::env::var("KOI_DEV_STATE") else {
            return Task::none();
        };

        let mut task = Task::none();
        for token in state.split(',').map(str::trim) {
            let settings_tab = |tab| Some(Dialog::new(tab, &self.settings));
            match token {
                "expand-dns" => self.expanded = Some(Expanded::Dns),
                "expand-drivers" => self.expanded = Some(Expanded::Drivers),
                "gaming-details" => self.gaming_details_open = true,
                "zen" => self.settings.zen_mode = true,
                "zen-bar" => self.zen_bar_revealed = true,
                "dashboard" => self.settings.zen_mode = false,
                "light" => self.settings.theme = ThemeMode::Light,
                "dark" => self.settings.theme = ThemeMode::Dark,
                "settings-general" => self.settings_dialog = settings_tab(SettingsTab::General),
                "settings-visual" => self.settings_dialog = settings_tab(SettingsTab::Visual),
                "settings-network" => self.settings_dialog = settings_tab(SettingsTab::Network),
                "settings-alerts" => self.settings_dialog = settings_tab(SettingsTab::Alerts),
                "settings-about" => self.settings_dialog = settings_tab(SettingsTab::About),
                "onboarding" => self.onboarding_open = true,
                "no-onboarding" => self.onboarding_open = false,
                "mute" => self.settings.ambient_music_muted = true,
                "no-splash" => self.splash = None,
                "widget-koi" | "widget-zen" => {
                    self.settings.show_desktop_widget = true;
                    self.settings.desktop_widget_mode = if token == "widget-koi" { WidgetMode::Koi } else { WidgetMode::Zen };
                }
                "tray" => self.settings.minimize_to_tray = true,
                "notifications" => self.notification_panel_open = true,
                "toast" => {
                    let now = Instant::now();
                    let message = self.tr().tf("alert_desktop_load", &[("metric", &"CPU"), ("value", &92)]);
                    self.notifications.push(message, Severity::Warning, Source::Alert, true, now);
                }
                "scroll-end" => {
                    // Once the first layout exists.
                    task = Task::future(tokio::time::sleep(Duration::from_secs(2)))
                        .then(|_| iced::widget::operation::snap_to_end(dashboard::SCROLL_ID));
                }
                _ => {}
            }
        }
        task
    }

    // --- windows, tray, widget ------------------------------------------------

    fn main_window_settings() -> window::Settings {
        window::Settings {
            size: Size::new(1400.0, 900.0),
            min_size: Some(Size::new(1024.0, 768.0)),
            decorations: false,
            icon: crate::icon::window(),
            // Closing is decided in `close_main_window` (quit, or hide to the tray).
            exit_on_close_request: false,
            platform_specific: PlatformSpecific {
                undecorated_shadow: true,
                corner_preference: window::settings::platform::CornerPreference::Round,
                ..PlatformSpecific::default()
            },
            ..window::Settings::default()
        }
    }

    /// Opens the dashboard window, or brings it back to the front.
    fn show_main_window(&mut self) -> Task<Message> {
        if let Some(id) = self.main_window {
            return Task::batch([window::minimize(id, false), window::gain_focus(id)]);
        }
        let (id, open) = window::open(Self::main_window_settings());
        self.main_window = Some(id);
        self.window_size = Size::new(1400.0, 900.0);
        self.maximized = false;
        self.sync_sampling();
        open.discard()
    }

    /// Closes the dashboard window but keeps Koi running behind its tray icon,
    /// with the desktop widget in sight. Without a window, Koi holds no GPU surface.
    fn hide_to_tray(&mut self) -> Task<Message> {
        let Some(id) = self.main_window else {
            return Task::none();
        };
        self.settings.show_desktop_widget = true;
        self.save_settings();
        Task::batch([window::close(id), self.sync_widget()])
    }

    /// The close button: hide to the tray when "Discrete presence" is on, quit otherwise.
    fn close_main_window(&mut self) -> Task<Message> {
        if self.settings.minimize_to_tray {
            self.hide_to_tray()
        } else {
            iced::exit()
        }
    }

    /// Opens, closes or resizes the desktop widget window to match the settings.
    fn sync_widget(&mut self) -> Task<Message> {
        let size = pill::window_size(self.settings.desktop_widget_mode);
        match (self.settings.show_desktop_widget, self.widget_window) {
            (true, None) => {
                let (id, open) = window::open(window::Settings {
                    size,
                    resizable: false,
                    decorations: false,
                    level: window::Level::AlwaysOnTop,
                    icon: crate::icon::window(),
                    exit_on_close_request: false,
                    platform_specific: PlatformSpecific {
                        skip_taskbar: true,
                        undecorated_shadow: true,
                        corner_preference: window::settings::platform::CornerPreference::Round,
                        ..PlatformSpecific::default()
                    },
                    ..window::Settings::default()
                });
                self.widget_window = Some(id);
                self.sync_sampling();
                open.discard()
            }
            (true, Some(id)) => window::resize(id, size),
            (false, Some(id)) => window::close(id),
            (false, None) => Task::none(),
        }
    }

    /// The tray icon exists only while "Discrete presence" is on.
    fn sync_tray(&mut self) {
        if !self.settings.minimize_to_tray {
            self.tray = None;
            return;
        }
        if self.tray.is_none() {
            let french = self.tr().is_french();
            self.tray = Some(Tray::spawn(tray::Labels {
                show: if french { "Afficher Koi Monitor" } else { "Show Koi Monitor" }.to_string(),
                toggle_widget: if french { "Afficher / Masquer le widget" } else { "Show / Hide the widget" }.to_string(),
                quit: if french { "Quitter" } else { "Quit" }.to_string(),
            }));
        }
    }

    /// Telemetry runs while something displays it, or while Koi watch needs it.
    fn sync_sampling(&self) {
        let visible = self.main_window.is_some() || self.widget_window.is_some();
        system::set_active(visible || self.settings.alert_thresholds.enabled);
    }

    // --- music ------------------------------------------------------------------

    /// Plays or pauses according to the mute setting. With reduced motion, Koi stays silent.
    fn sync_music(&mut self) {
        if self.settings.ambient_music_muted || self.reduced_motion {
            self.music.pause();
        } else {
            self.music.play(if self.easter_active { Track::Easter } else { Track::Ambient });
        }
    }

    /// A click on the wordmark. Five within 2.5 s toggle the secret track.
    fn secret_tap(&mut self) -> Task<Message> {
        self.secret_taps += 1;
        self.secret_seq = self.secret_seq.wrapping_add(1);

        if self.secret_taps < 5 {
            let seq = self.secret_seq;
            let lapse = Task::future(tokio::time::sleep(Duration::from_millis(2500))).map(move |_| Message::SecretTapExpired(seq));

            // Playful hints, until the secret has been found once.
            let hint = if self.easter_active || self.settings.easter_music_seen {
                Task::none()
            } else {
                let key = ["easter_hint_1", "easter_hint_2", "easter_hint_3", "easter_hint_4"][self.secret_taps as usize - 1];
                let message = self.tr().t(key).to_string();
                self.toast(message, Severity::Success, Source::System, false)
            };
            return Task::batch([lapse, hint]);
        }

        self.secret_taps = 0;
        if self.easter_active {
            self.easter_active = false;
            if self.settings.ambient_music_muted {
                self.music.pause();
            } else {
                self.music.crossfade(Track::Ambient);
            }
            return Task::none();
        }

        if self.settings.ambient_music_muted {
            let message = self.tr().t("easter_mute_warning").to_string();
            return self.toast(message, Severity::Warning, Source::System, true);
        }
        self.easter_active = true;
        self.music.crossfade(Track::Easter);
        self.settings.easter_music_seen = true;
        self.save_settings();
        let message = self.tr().t("easter_reward").to_string();
        self.toast(message, Severity::Success, Source::System, false)
    }

    /// System uptime in seconds, interpolated between telemetry samples.
    pub fn live_uptime(&self) -> u64 {
        match &self.system {
            Some(system) if system.uptime > 0 => system.uptime + self.uptime_synced.elapsed().as_secs(),
            _ => 0,
        }
    }

    pub fn unread_alerts(&self) -> usize {
        self.notifications.unread_alerts()
    }

    fn splash_flags(&self) -> splash::Flags {
        splash::Flags {
            system: self.system.is_some(),
            dns: self.dns_attempted,
            drivers: self.drivers_settled,
            // A few samples, so the charts are not empty when the dashboard appears.
            dashboard: self.samples_received >= 3,
        }
    }

    fn tr(&self) -> Tr {
        Tr(self.settings.language)
    }

    fn ctx(&self) -> Ctx {
        let p = Palette::of(self.settings.theme);
        Ctx {
            p,
            tr: self.tr(),
            atmosphere: Atmosphere::new(&self.settings, self.reduced_motion, self.zen_tracker.state()),
            accent: p.accent(self.settings.sakura_color),
            glow: self.settings.neon_glow,
        }
    }

    fn save_settings(&self) {
        // A session opened with `KOI_DEV_STATE` plays with the settings: never persist it.
        if std::env::var_os("KOI_DEV_STATE").is_none() {
            settings::save(&self.settings);
        }
    }

    fn set_zen(&mut self, zen: bool) {
        self.settings.zen_mode = zen;
        // The mood is read afresh each time Zen opens.
        self.zen_tracker = LoadTracker::new();
        self.zen_bar_revealed = false;
        self.gaming_details_open = false;
        self.expanded = None;
        self.save_settings();
    }

    /// Colours are baked into cached geometry: redraw everything after a theme change.
    fn clear_caches(&mut self) {
        for history in [
            &self.cpu_history,
            &self.ram_history,
            &self.gpu_history,
            &self.download_history,
            &self.upload_history,
        ] {
            history.cache.clear();
        }
        self.cores_cache.clear();
        self.wordmark_cache.clear();
        self.about_wordmark_cache.clear();
    }

    /// Shows a message at the bottom of the window and schedules its dismissal.
    fn toast(&mut self, message: String, severity: Severity, source: Source, log: bool) -> Task<Message> {
        match self.notifications.push(message, severity, source, log, Instant::now()) {
            Some((seq, duration)) => Task::future(tokio::time::sleep(duration)).map(move |_| Message::ToastExpired(seq)),
            None => Task::none(),
        }
    }

    /// Confirmation in the footer of the Settings dialog.
    fn settings_toast(&mut self, key: &'static str, severity: Severity) -> Task<Message> {
        let message = self.tr().t(key).to_string();
        self.settings_toast_text(message, severity)
    }

    fn settings_toast_text(&mut self, message: String, severity: Severity) -> Task<Message> {
        let Some(dialog) = &mut self.settings_dialog else {
            return Task::none();
        };
        dialog.toast_seq = dialog.toast_seq.wrapping_add(1);
        dialog.toast = Some((message, severity));
        let seq = dialog.toast_seq;
        let duration = Duration::from_millis(if severity == Severity::Warning { 5500 } else { 2500 });
        Task::future(tokio::time::sleep(duration)).map(move |_| Message::SettingsToastExpired(seq))
    }

    /// Compares the servers ticked in Settings. One test at a time.
    fn ping_dns(&mut self) -> Task<Message> {
        if self.dns_pinging {
            return Task::none();
        }
        self.dns_pinging = true;

        let default_label = if self.tr().is_french() { "Serveur personnel" } else { "Personal server" };
        let servers = self.settings.active_dns_servers(default_label);
        Task::perform(dns::ping_all_dns_servers(Some(servers)), Message::DnsResults)
    }

    /// Scans the installed drivers; `enrich` also looks for newer versions
    /// (Windows Update and the driver store), which takes much longer.
    fn scan_drivers(&mut self, enrich: bool, manual: bool) -> Task<Message> {
        let simplified = self.settings.simplified_mode;
        self.drivers_loading = true;

        Task::perform(
            async move {
                tokio::task::spawn_blocking(move || {
                    let mut list = drivers::get_driver_list(simplified)?;
                    if enrich {
                        driver_updates::enrich_drivers_with_updates(&mut list);
                    }
                    Ok(list)
                })
                .await
                .map_err(|error| format!("Driver scan task failed: {error}"))?
            },
            move |result| Message::DriversLoaded { simplified, enriched: enrich, manual, result },
        )
    }

    /// Looks for updates to the drivers already listed, without blocking the card.
    fn enrich_drivers(&self) -> Task<Message> {
        let simplified = self.settings.simplified_mode;
        let mut list = self.drivers.clone();

        Task::perform(
            async move {
                tokio::task::spawn_blocking(move || {
                    driver_updates::enrich_drivers_with_updates(&mut list);
                    list
                })
                .await
                .map_err(|error| format!("Driver enrich task failed: {error}"))
            },
            move |result| Message::DriversLoaded { simplified, enriched: true, manual: false, result },
        )
    }

    fn apply_setting(&mut self, change: Change) -> Task<Message> {
        let was_max_atmosphere = is_max_atmosphere(&self.settings);
        let mut toast = ("toast_pref_saved", Severity::Success);
        let mut follow_up = Task::none();

        match change {
            Change::RefreshInterval(ms) => {
                self.settings.refresh_interval = ms;
                system::set_interval(Duration::from_millis(ms as u64));
            }
            Change::Language(language) => {
                self.settings.language = language;
                // The tray menu is built once: rebuild it in the new language.
                self.tray = None;
                self.sync_tray();
            }
            Change::SimplifiedMode(simplified) => {
                self.settings.simplified_mode = simplified;
                toast = if simplified {
                    ("toast_simplified_active", Severity::Success)
                } else {
                    ("toast_simplified_inactive", Severity::Warning)
                };
                follow_up = self.scan_drivers(false, false);
            }
            Change::LaunchAtStartup(enabled) => match autostart::set_enabled(enabled) {
                Ok(()) => self.settings.launch_at_startup = enabled,
                Err(error) => log::warn!("{error}"),
            },
            Change::MinimizeToTray(enabled) => {
                self.settings.minimize_to_tray = enabled;
                self.sync_tray();
            }
            Change::ShowDesktopWidget(show) => {
                self.settings.show_desktop_widget = show;
                follow_up = self.sync_widget();
            }
            Change::WidgetMode(mode) => {
                self.settings.desktop_widget_mode = mode;
                follow_up = self.sync_widget();
            }
            Change::Preset(preset) => preset.apply(&mut self.settings),
            Change::Theme(theme) => {
                self.settings.theme = theme;
                self.clear_caches();
            }
            Change::SakuraIntensity(intensity) => self.settings.sakura_intensity = intensity,
            Change::SakuraColor(color) => self.settings.sakura_color = color,
            Change::Glass(enabled) => self.settings.enable_glassmorphic_blur = enabled,
            Change::Aura(aura) => self.settings.background_aura = aura,
            Change::Neon(glow) => self.settings.neon_glow = glow,
            Change::CalmMotion(calm) => self.settings.calm_motion = calm,
            Change::DnsInterval(ms) => self.settings.dns_interval = ms,
            Change::DnsServer(name, checked) => {
                let mut checklist = self.settings.dns_checklist.clone();
                checklist.retain(|server| server != name);
                if checked {
                    checklist.push(name.to_string());
                }
                if checklist.is_empty() {
                    return self.settings_toast("toast_dns_keep_one", Severity::Warning);
                }
                self.settings.dns_checklist = checklist;
                self.save_settings();
                let key = if checked { "toast_dns_added" } else { "toast_dns_removed" };
                let message = self.tr().tf(key, &[("name", &name)]);
                return Task::batch([self.settings_toast_text(message, Severity::Success), self.ping_dns()]);
            }
            Change::AlertsEnabled(enabled) => {
                self.settings.alert_thresholds.enabled = enabled;
                self.sync_sampling();
            }
            Change::Sensitivity(sensitivity) => {
                self.settings.alert_thresholds.desktop = DesktopAlerts::preset(sensitivity);
                toast = ("toast_alert_saved", Severity::Success);
            }
            Change::GamingAlerts(enabled) => self.settings.alert_thresholds.gaming = GamingAlerts::preset(enabled),
        }

        self.save_settings();

        if is_max_atmosphere(&self.settings) && !was_max_atmosphere {
            toast = ("toast_max_atmosphere", Severity::Warning);
        }
        Task::batch([self.settings_toast(toast.0, toast.1), follow_up])
    }

    pub fn update(&mut self, message: Message) -> Task<Message> {
        match message {
            Message::Backend(system::Event::System(info)) => {
                let now = Instant::now();
                // Zen mode shows no charts: skip the history, as the web UI did.
                if self.settings.zen_mode {
                    let gpu = info.gpu.iter().map(|g| g.usage).fold(0.0, f32::max);
                    self.zen_tracker.update(info.cpu.usage, gpu, now);
                } else {
                    self.cpu_history.push(info.cpu.usage);
                    self.ram_history.push(info.memory.usage_percent);
                    self.gpu_history.push(info.gpu.iter().map(|g| g.usage).fold(0.0, f32::max));
                    self.download_history.push(info.network.download_speed as f32);
                    self.upload_history.push(info.network.upload_speed as f32);
                    self.cores_cache.clear();
                }

                let alert = self.watcher.evaluate(&info, &self.gaming, &self.settings.alert_thresholds, now, self.tr());
                self.uptime_synced = now;
                self.system = Some(info);
                self.samples_received = self.samples_received.saturating_add(1);

                if let Some(alert) = alert {
                    return self.toast(alert.message, alert.severity, Source::Alert, true);
                }
            }
            Message::Backend(system::Event::GamingLatency(snapshot)) => self.gaming = snapshot,
            Message::Tick => {}
            Message::SplashTick => {
                let flags = self.splash_flags();
                if self.splash.as_mut().is_some_and(|splash| splash.tick(flags, Instant::now())) {
                    self.splash = None;
                    self.sync_music();
                }
            }
            Message::EscapePressed => {
                // Innermost layer first, as each handler did in the web UI.
                if self.onboarding_open && self.splash.is_none() {
                    return self.update(Message::AlertOnboarding(false));
                } else if self.settings_dialog.is_some() {
                    self.settings_dialog = None;
                } else if self.notification_panel_open {
                    self.notification_panel_open = false;
                } else if self.gaming_details_open {
                    self.gaming_details_open = false;
                } else if self.expanded.is_some() {
                    self.expanded = None;
                } else if self.settings.zen_mode {
                    self.set_zen(false);
                }
            }

            Message::ToggleMute => {
                self.settings.ambient_music_muted = !self.settings.ambient_music_muted;
                self.save_settings();
                self.sync_music();
            }
            Message::ToggleNotifications => {
                self.notification_panel_open = !self.notification_panel_open;
                if self.notification_panel_open {
                    self.notifications.mark_read();
                    if self.settings.zen_mode {
                        self.zen_bar_revealed = true;
                    }
                }
            }
            Message::ClearNotifications => self.notifications.clear(),
            Message::ToastExpired(seq) => self.notifications.expire(seq),
            Message::AlertOnboarding(enable) => {
                self.onboarding_open = false;
                self.settings.alerts_onboarding_done = true;
                self.settings.alert_thresholds = AlertThresholds { enabled: enable, ..AlertThresholds::default() };
                self.save_settings();
                if enable {
                    let message = self.tr().t("alerts_enabled_toast").to_string();
                    return self.toast(message, Severity::Success, Source::System, true);
                }
            }
            Message::ToggleZen => self.set_zen(!self.settings.zen_mode),
            Message::ToggleZenMetrics => {
                self.settings.zen_metrics_visible = !self.settings.zen_metrics_visible;
                self.save_settings();
            }
            Message::ZenBar(true) => {
                self.zen_bar_seq = self.zen_bar_seq.wrapping_add(1);
                self.zen_bar_revealed = true;
            }
            Message::ZenBar(false) => {
                // Leave it up for a moment: the pointer often comes straight back.
                self.zen_bar_seq = self.zen_bar_seq.wrapping_add(1);
                let seq = self.zen_bar_seq;
                let delay = Duration::from_millis(if self.settings.calm_motion { 200 } else { 500 });
                return Task::future(tokio::time::sleep(delay)).map(move |_| Message::ZenBarHide(seq));
            }
            Message::ZenBarHide(seq) => {
                if seq == self.zen_bar_seq && !self.notification_panel_open {
                    self.zen_bar_revealed = false;
                }
            }
            Message::ToggleTheme => {
                self.settings.theme = match self.settings.theme {
                    ThemeMode::Dark => ThemeMode::Light,
                    ThemeMode::Light => ThemeMode::Dark,
                };
                self.clear_caches();
                self.save_settings();
            }
            Message::Expand(expanded) => {
                self.expanded = expanded;
                if expanded != Some(Expanded::Drivers) {
                    self.driver_selected = None;
                }
            }

            Message::OpenSettings(tab) => {
                self.settings_dialog = Some(Dialog::new(tab.unwrap_or(SettingsTab::General), &self.settings));
                self.notification_panel_open = false;
            }
            Message::CloseSettings => self.settings_dialog = None,
            Message::SettingsTab(tab) => {
                if let Some(dialog) = &mut self.settings_dialog {
                    dialog.tab = tab;
                }
            }
            Message::Setting(change) => return self.apply_setting(change),
            Message::SettingsToastExpired(seq) => {
                if let Some(dialog) = &mut self.settings_dialog {
                    if dialog.toast_seq == seq {
                        dialog.toast = None;
                    }
                }
            }
            Message::CustomDnsIp(value) => {
                if let Some(dialog) = &mut self.settings_dialog {
                    dialog.ip_draft = value;
                }
            }
            Message::CustomDnsLabel(value) => {
                if let Some(dialog) = &mut self.settings_dialog {
                    dialog.label_draft = value.chars().take(24).collect();
                }
            }
            Message::CustomDnsCommit => {
                let Some(dialog) = &self.settings_dialog else {
                    return Task::none();
                };
                let ip = dialog.ip_draft.trim().to_string();
                let label: String = dialog.label_draft.trim().chars().take(24).collect();

                if ip.is_empty() {
                    if self.settings.custom_dns.take().is_some() {
                        self.save_settings();
                        return self.ping_dns();
                    }
                    return Task::none();
                }
                let custom = CustomDns { ip, label };
                if !is_valid_custom_dns_ipv4(&custom.ip) || self.settings.custom_dns.as_ref() == Some(&custom) {
                    return Task::none();
                }
                self.settings.custom_dns = Some(custom);
                self.save_settings();
                return Task::batch([self.settings_toast("toast_dns_personal_saved", Severity::Success), self.ping_dns()]);
            }
            Message::CustomDnsClear => {
                if let Some(dialog) = &mut self.settings_dialog {
                    dialog.ip_draft.clear();
                    dialog.label_draft.clear();
                }
                self.settings.custom_dns = None;
                self.save_settings();
                return Task::batch([self.settings_toast("toast_dns_personal_removed", Severity::Success), self.ping_dns()]);
            }
            Message::ResetSettings => {
                let Some(dialog) = &mut self.settings_dialog else {
                    return Task::none();
                };
                if !dialog.confirm_reset {
                    // Ask once more; the request lapses after four seconds.
                    dialog.confirm_reset = true;
                    dialog.reset_seq = dialog.reset_seq.wrapping_add(1);
                    let seq = dialog.reset_seq;
                    return Task::batch([
                        self.settings_toast("toast_reset_confirm_message", Severity::Warning),
                        Task::future(tokio::time::sleep(Duration::from_secs(4))).map(move |_| Message::ResetExpired(seq)),
                    ]);
                }

                dialog.confirm_reset = false;
                dialog.ip_draft.clear();
                dialog.label_draft.clear();

                // Language, theme, Zen and the one-time flags are not preferences to "reset".
                let previous = self.settings.clone();
                self.settings = Settings {
                    language: previous.language,
                    theme: previous.theme,
                    zen_mode: previous.zen_mode,
                    alerts_onboarding_done: previous.alerts_onboarding_done,
                    easter_music_seen: previous.easter_music_seen,
                    desktop_widget_mode: WidgetMode::Koi,
                    ..Settings::default()
                };
                if previous.launch_at_startup {
                    if let Err(error) = autostart::set_enabled(false) {
                        log::warn!("{error}");
                    }
                }
                system::set_interval(Duration::from_millis(self.settings.refresh_interval as u64));
                self.save_settings();

                let rescan = if previous.simplified_mode { Task::none() } else { self.scan_drivers(false, false) };
                return Task::batch([self.settings_toast("toast_reset_success", Severity::Success), self.ping_dns(), rescan]);
            }
            Message::ResetExpired(seq) => {
                if let Some(dialog) = &mut self.settings_dialog {
                    if dialog.reset_seq == seq {
                        dialog.confirm_reset = false;
                    }
                }
            }
            Message::Donate => {
                return match open::open_donation_url(KOFI_URL) {
                    Ok(()) => self.settings_toast("settings_about_donate_toast", Severity::Success),
                    Err(error) => {
                        log::warn!("{error}");
                        self.settings_toast("settings_about_donate_error", Severity::Warning)
                    }
                };
            }
            Message::SecretTap => return self.secret_tap(),

            Message::DnsTick => return self.ping_dns(),
            Message::DnsAutoTest => {
                self.settings.dns_checklist = default_dns_checklist();
                self.save_settings();
                return self.ping_dns();
            }
            Message::DnsResults(result) => {
                self.dns_pinging = false;
                self.dns_attempted = true;
                match result {
                    Ok(results) => self.dns_results = results,
                    Err(error) => {
                        log::warn!("DNS test failed: {error}");
                        let message = self.tr().t("dns_toast_error").to_string();
                        return self.toast(message, Severity::Warning, Source::System, true);
                    }
                }
            }
            Message::ToggleGamingDetails => self.gaming_details_open = !self.gaming_details_open,

            Message::DriversRefresh => return self.scan_drivers(true, true),
            Message::DriversLoaded { simplified, enriched, manual, result } => {
                // A scan started before the mode was switched in Settings is stale.
                if simplified != self.settings.simplified_mode {
                    return Task::none();
                }
                self.drivers_loading = false;
                self.drivers_settled = true;
                match result {
                    Ok(list) => {
                        let empty = crate::ui::drivers::is_empty_list(&list);
                        self.drivers = list;
                        if !enriched {
                            return self.enrich_drivers();
                        }
                        if manual && empty {
                            let message = self.tr().t("drivers_empty_toast").to_string();
                            return self.toast(message, Severity::Warning, Source::System, true);
                        }
                    }
                    Err(error) => {
                        log::warn!("Driver scan failed: {error}");
                        let message = self.tr().t("drivers_scan_toast_error").to_string();
                        return self.toast(message, Severity::Error, Source::System, true);
                    }
                }
            }
            Message::DriverSelect(key) => self.driver_selected = Some(key),
            Message::OpenWindowsUpdate => {
                return Task::future(async {
                    let _ = tokio::task::spawn_blocking(driver_updates::open_windows_update_settings).await;
                })
                .discard();
            }
            Message::OpenUrl(url) => {
                if let Err(error) = open::open_driver_url(&url) {
                    log::warn!("{error}");
                }
            }

            Message::DragWindow => return self.main_window.map(window::drag).unwrap_or_else(Task::none),
            Message::MinimizeWindow => {
                if self.settings.minimize_to_tray {
                    return self.hide_to_tray();
                }
                return self.main_window.map(|id| window::minimize(id, true)).unwrap_or_else(Task::none);
            }
            Message::ToggleMaximize => return self.main_window.map(window::toggle_maximize).unwrap_or_else(Task::none),
            Message::CloseWindow => return self.close_main_window(),
            Message::WindowResized(id, size) => {
                if self.main_window == Some(id) {
                    self.window_size = size;
                    return window::is_maximized(id).map(Message::Maximized);
                }
            }
            Message::Maximized(maximized) => self.maximized = maximized,
            Message::CloseRequested(id) => {
                if self.main_window == Some(id) {
                    return self.close_main_window();
                }
                if self.widget_window == Some(id) {
                    return self.update(Message::CloseWidget);
                }
            }
            Message::WindowClosed(id) => {
                if self.main_window == Some(id) {
                    self.main_window = None;
                    self.settings_dialog = None;
                    self.expanded = None;
                    self.notification_panel_open = false;
                }
                if self.widget_window == Some(id) {
                    self.widget_window = None;
                }
                self.sync_sampling();
            }

            Message::Tray(tray::Event::Show) | Message::ShowMainWindow => return self.show_main_window(),
            Message::Tray(tray::Event::ToggleWidget) => {
                self.settings.show_desktop_widget = !self.settings.show_desktop_widget;
                self.save_settings();
                return self.sync_widget();
            }
            Message::Tray(tray::Event::Quit) => return iced::exit(),
            Message::DragWidget => return self.widget_window.map(window::drag).unwrap_or_else(Task::none),
            Message::CloseWidget => {
                self.settings.show_desktop_widget = false;
                self.save_settings();
                return self.sync_widget();
            }
            Message::SecretTapExpired(seq) => {
                if seq == self.secret_seq {
                    self.secret_taps = 0;
                }
            }
        }
        Task::none()
    }

    pub fn subscription(&self) -> Subscription<Message> {
        let mut subscriptions = vec![
            Subscription::run(system::stream).map(Message::Backend),
            iced::time::every(Duration::from_secs(1)).map(|_| Message::Tick),
            window::resize_events().map(|(id, size)| Message::WindowResized(id, size)),
            window::close_requests().map(Message::CloseRequested),
            window::close_events().map(Message::WindowClosed),
            Subscription::run(tray::events).map(Message::Tray),
            keyboard::listen().filter_map(|event| match event {
                keyboard::Event::KeyPressed { key: keyboard::Key::Named(key::Named::Escape), .. } => {
                    Some(Message::EscapePressed)
                }
                _ => None,
            }),
        ];

        // The DNS comparison is a dashboard feature: Zen mode and the tray leave the network alone.
        if !self.settings.zen_mode && self.main_window.is_some() {
            subscriptions.push(
                iced::time::every(Duration::from_millis(self.settings.dns_interval as u64)).map(|_| Message::DnsTick),
            );
        }

        if self.splash.is_some() {
            subscriptions.push(iced::time::every(Duration::from_millis(33)).map(|_| Message::SplashTick));
        }

        Subscription::batch(subscriptions)
    }

    pub fn title(&self, window: window::Id) -> String {
        if self.widget_window == Some(window) { "Koi Widget" } else { "Koi Monitor" }.to_string()
    }

    pub fn view(&self, window: window::Id) -> Element<'_, Message> {
        let ctx = self.ctx();
        if self.widget_window == Some(window) {
            return pill::view(self, &ctx);
        }
        if let Some(splash) = &self.splash {
            return stack![
                shader(Backdrop(ctx.atmosphere)).width(Fill).height(Fill),
                mouse_area(crate::ui::splash::view(splash, self.splash_flags(), &ctx)).on_press(Message::DragWindow),
            ]
            .into();
        }
        let overlay = ctx.p.overlay;

        // Same width and gutters as the dashboard (`max-w-7xl` + `px-8`).
        let title_bar = || {
            container(container(title_bar::view(self, &ctx)).max_width(1280))
                .center_x(Fill)
                .padding(Padding { top: 24.0, right: 32.0, bottom: 0.0, left: 32.0 })
        };

        let page: Element<'_, Message> = if self.settings.zen_mode {
            let top: Element<'_, Message> = if self.zen_bar_revealed {
                mouse_area(title_bar()).on_exit(Message::ZenBar(false)).into()
            } else {
                zen::title_bar_peek(&ctx)
            };
            column![top, zen::view(self, &ctx)].into()
        } else {
            column![title_bar(), dashboard::view(self, &ctx)].spacing(24).into()
        };

        let mut layers = stack![shader(Backdrop(ctx.atmosphere)).width(Fill).height(Fill), page];

        if let Some(expanded) = self.expanded {
            let card = match expanded {
                Expanded::Dns => crate::ui::dns::card(self, &ctx, true),
                Expanded::Drivers => crate::ui::drivers::card(self, &ctx, true),
            };
            layers = layers.push(modal(container(card).max_width(1024).into(), Message::Expand(None), overlay));
        }

        if let Some(dialog) = &self.settings_dialog {
            layers = layers.push(modal(crate::ui::settings::view(self, dialog, &ctx), Message::CloseSettings, overlay));
        }

        if self.notification_panel_open {
            // No dimming: a click anywhere else simply closes the log.
            layers = layers.push(opaque(
                mouse_area(overlays::notification_panel(self, &ctx)).on_press(Message::ToggleNotifications),
            ));
        }

        if self.onboarding_open && self.splash.is_none() {
            layers = layers.push(modal(overlays::alert_onboarding(&ctx), Message::AlertOnboarding(false), overlay));
        }

        if let Some(toast) = &self.notifications.toast {
            layers = layers.push(overlays::status_toast(toast, &ctx));
        }

        layers.into()
    }
}
