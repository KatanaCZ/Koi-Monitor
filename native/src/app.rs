//! Application state, messages and the update loop.

use iced::keyboard::{self, key};
use iced::widget::canvas::Cache;
use iced::widget::{center, column, container, mouse_area, opaque, shader, stack};
use iced::{window, Element, Fill, Padding, Subscription, Task};
use std::time::{Duration, Instant};

use crate::backend::dns::{self, DnsResult};
use crate::backend::driver_updates;
use crate::backend::drivers::{self, DriverInfo};
use crate::backend::gaming_latency::GamingLatencySnapshot;
use crate::backend::open;
use crate::backend::system::{self, SystemInfo};
use crate::gfx::{Atmosphere, Backdrop};
use crate::i18n::Tr;
use crate::settings::{self, default_dns_checklist, Settings, ThemeMode};
use crate::theme::Palette;
use crate::ui::charts::History;
use crate::ui::kit::Ctx;
use crate::ui::{dashboard, title_bar};

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

#[derive(Debug, Clone)]
pub enum Message {
    Backend(system::Event),
    /// Once a second: refreshes the uptime chip and the Zen clock.
    Tick,
    EscapePressed,

    ToggleMute,
    ToggleNotifications,
    OpenSettings(Option<SettingsTab>),
    ToggleZen,
    ToggleTheme,
    Expand(Option<Expanded>),

    DnsTick,
    DnsAutoTest,
    DnsResults(Result<Vec<DnsResult>, String>),
    ToggleGamingDetails,

    DriversRefresh,
    DriversLoaded { simplified: bool, enriched: bool, result: Result<Vec<DriverInfo>, String> },
    DriverSelect(String),
    OpenWindowsUpdate,
    OpenUrl(String),

    DragWindow,
    MinimizeWindow,
    ToggleMaximize,
    CloseWindow,
    WindowResized,
    Maximized(bool),
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
    /// Key of the driver picked in the expanded drivers view.
    pub driver_selected: Option<String>,

    pub cpu_history: History,
    pub ram_history: History,
    pub gpu_history: History,
    pub download_history: History,
    pub upload_history: History,
    pub cores_cache: Cache,
    pub wordmark_cache: Cache,

    pub expanded: Option<Expanded>,
    pub maximized: bool,
    pub notification_panel_open: bool,
    /// When `system.uptime` was last received, to count seconds in between samples.
    uptime_synced: Instant,
}

impl App {
    pub fn boot() -> (Self, Task<Message>) {
        let settings = settings::load();
        system::set_interval(Duration::from_millis(settings.refresh_interval as u64));

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
            driver_selected: None,
            cpu_history: History::new(),
            ram_history: History::new(),
            gpu_history: History::new(),
            download_history: History::new(),
            upload_history: History::new(),
            cores_cache: Cache::new(),
            wordmark_cache: Cache::new(),
            expanded: None,
            maximized: false,
            notification_panel_open: false,
            uptime_synced: Instant::now(),
        };

        let startup = Task::batch([app.ping_dns(), app.scan_drivers(false), app.apply_dev_state()]);
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
            match token {
                "expand-dns" => self.expanded = Some(Expanded::Dns),
                "expand-drivers" => self.expanded = Some(Expanded::Drivers),
                "gaming-details" => self.gaming_details_open = true,
                "zen" => self.settings.zen_mode = true,
                "dashboard" => self.settings.zen_mode = false,
                "light" => self.settings.theme = ThemeMode::Light,
                "dark" => self.settings.theme = ThemeMode::Dark,
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

    /// System uptime in seconds, interpolated between telemetry samples.
    pub fn live_uptime(&self) -> u64 {
        match &self.system {
            Some(system) if system.uptime > 0 => system.uptime + self.uptime_synced.elapsed().as_secs(),
            _ => 0,
        }
    }

    pub fn unread_alerts(&self) -> usize {
        0
    }

    fn tr(&self) -> Tr {
        Tr(self.settings.language)
    }

    fn ctx(&self) -> Ctx {
        let p = Palette::of(self.settings.theme);
        Ctx {
            p,
            tr: self.tr(),
            atmosphere: Atmosphere::new(&self.settings, false, 0.0),
            accent: p.accent(self.settings.sakura_color),
            glow: self.settings.neon_glow,
        }
    }

    fn save_settings(&self) {
        settings::save(&self.settings);
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
    fn scan_drivers(&mut self, enrich: bool) -> Task<Message> {
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
            move |result| Message::DriversLoaded { simplified, enriched: enrich, result },
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
            move |result| Message::DriversLoaded { simplified, enriched: true, result },
        )
    }

    pub fn update(&mut self, message: Message) -> Task<Message> {
        match message {
            Message::Backend(system::Event::System(info)) => {
                // Zen mode shows no charts: skip the history, as the web UI did.
                if !self.settings.zen_mode {
                    self.cpu_history.push(info.cpu.usage);
                    self.ram_history.push(info.memory.usage_percent);
                    self.gpu_history.push(info.gpu.iter().map(|g| g.usage).fold(0.0, f32::max));
                    self.download_history.push(info.network.download_speed as f32);
                    self.upload_history.push(info.network.upload_speed as f32);
                    self.cores_cache.clear();
                }
                self.uptime_synced = Instant::now();
                self.system = Some(info);
            }
            Message::Backend(system::Event::GamingLatency(snapshot)) => self.gaming = snapshot,
            Message::Tick => {}
            Message::EscapePressed => {
                // Innermost layer first, as each handler did in the web UI.
                if self.gaming_details_open {
                    self.gaming_details_open = false;
                } else if self.expanded.is_some() {
                    self.expanded = None;
                } else if self.settings.zen_mode {
                    self.settings.zen_mode = false;
                    self.save_settings();
                }
            }

            Message::ToggleMute => {
                self.settings.ambient_music_muted = !self.settings.ambient_music_muted;
                self.save_settings();
            }
            Message::ToggleNotifications => self.notification_panel_open = !self.notification_panel_open,
            Message::OpenSettings(_tab) => {}
            Message::ToggleZen => {
                self.settings.zen_mode = !self.settings.zen_mode;
                self.expanded = None;
                self.save_settings();
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
                    Err(error) => log::warn!("DNS test failed: {error}"),
                }
            }
            Message::ToggleGamingDetails => self.gaming_details_open = !self.gaming_details_open,

            Message::DriversRefresh => return self.scan_drivers(true),
            Message::DriversLoaded { simplified, enriched, result } => {
                // A scan started before the mode was switched in Settings is stale.
                if simplified != self.settings.simplified_mode {
                    return Task::none();
                }
                self.drivers_loading = false;
                match result {
                    Ok(list) => {
                        self.drivers = list;
                        if !enriched {
                            return self.enrich_drivers();
                        }
                    }
                    Err(error) => log::warn!("Driver scan failed: {error}"),
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

            Message::DragWindow => return window::latest().and_then(window::drag),
            Message::MinimizeWindow => return window::latest().and_then(|id| window::minimize(id, true)),
            Message::ToggleMaximize => return window::latest().and_then(window::toggle_maximize),
            Message::CloseWindow => return window::latest().and_then(window::close),
            Message::WindowResized => return window::latest().and_then(window::is_maximized).map(Message::Maximized),
            Message::Maximized(maximized) => self.maximized = maximized,
        }
        Task::none()
    }

    pub fn subscription(&self) -> Subscription<Message> {
        let mut subscriptions = vec![
            Subscription::run(system::stream).map(Message::Backend),
            iced::time::every(Duration::from_secs(1)).map(|_| Message::Tick),
            window::resize_events().map(|_| Message::WindowResized),
            keyboard::listen().filter_map(|event| match event {
                keyboard::Event::KeyPressed { key: keyboard::Key::Named(key::Named::Escape), .. } => {
                    Some(Message::EscapePressed)
                }
                _ => None,
            }),
        ];

        // The DNS comparison is a dashboard feature: Zen mode leaves the network alone.
        if !self.settings.zen_mode {
            subscriptions.push(
                iced::time::every(Duration::from_millis(self.settings.dns_interval as u64)).map(|_| Message::DnsTick),
            );
        }

        Subscription::batch(subscriptions)
    }

    pub fn view(&self) -> Element<'_, Message> {
        let ctx = self.ctx();

        let page = column![
            // Same width and gutters as the dashboard (`max-w-7xl` + `px-8`).
            container(container(title_bar::view(self, &ctx)).max_width(1280))
                .center_x(Fill)
                .padding(Padding { top: 24.0, right: 32.0, bottom: 0.0, left: 32.0 }),
            dashboard::view(self, &ctx),
        ]
        .spacing(24);

        let mut layers = stack![shader(Backdrop(ctx.atmosphere)).width(Fill).height(Fill), page];

        if let Some(expanded) = self.expanded {
            let dialog = match expanded {
                Expanded::Dns => crate::ui::dns::card(self, &ctx, true),
                Expanded::Drivers => crate::ui::drivers::card(self, &ctx, true),
            };
            let overlay = ctx.p.overlay;
            // Clicking the dimmed area closes the view; clicks on the card stay in it.
            layers = layers.push(opaque(
                mouse_area(
                    center(opaque(container(dialog).max_width(1024)))
                        .padding(32)
                        .style(move |_| container::Style { background: Some(overlay.into()), ..container::Style::default() }),
                )
                .on_press(Message::Expand(None)),
            ));
        }

        layers.into()
    }
}
