//! Settings dialog: Essential, Atmosphere, Connection, Watch, About.

use iced::widget::{button, canvas, column, container, row, rule, scrollable, text, text_input, Column, Space};
use iced::{gradient, Background, Border, Color, Element, Fill, FillPortion, Padding, Radians, Shadow};

use super::icons::{icon, Icon};
use super::kit::Ctx;
use super::overlays::toast_style;
use super::title_bar::Wordmark;
use crate::alerts::Severity;
use crate::app::{App, Change, Message, SettingsTab};
use crate::gfx::glass::glass;
use crate::gfx::Surface;
use crate::settings::{
    is_valid_custom_dns_ipv4, BackgroundAura, Language, NeonGlow, SakuraColor, SakuraIntensity, Sensitivity, Settings,
    ThemeMode, WidgetMode, DNS_INTERVALS_MS, POPULAR_DNS_SERVERS, REFRESH_INTERVALS_MS,
};
use crate::theme::{alpha, mix, rgb, GEIST_MEDIUM, GEIST_SEMIBOLD, MONO, MONO_BOLD};

/// State of the dialog while it is open.
#[derive(Debug, Clone)]
pub struct Dialog {
    pub tab: SettingsTab,
    /// Confirmation shown in the footer.
    pub toast: Option<(String, Severity)>,
    pub toast_seq: u32,
    /// "Reset everything" was clicked once and awaits a second click.
    pub confirm_reset: bool,
    pub reset_seq: u32,
    pub ip_draft: String,
    pub label_draft: String,
}

impl Dialog {
    pub fn new(tab: SettingsTab, settings: &Settings) -> Self {
        let custom = settings.custom_dns.as_ref();
        Self {
            tab,
            toast: None,
            toast_seq: 0,
            confirm_reset: false,
            reset_seq: 0,
            ip_draft: custom.map(|dns| dns.ip.clone()).unwrap_or_default(),
            label_draft: custom.map(|dns| dns.label.clone()).unwrap_or_default(),
        }
    }
}

/// One-gesture ambience presets (`atmospherePresets.ts`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Preset {
    Zen,
    Doux,
    Aura,
}

impl Preset {
    fn values(self) -> (SakuraIntensity, bool, BackgroundAura, NeonGlow, bool) {
        match self {
            Preset::Zen => (SakuraIntensity::Low, false, BackgroundAura::Soft, NeonGlow::Soft, true),
            Preset::Doux => (SakuraIntensity::Medium, true, BackgroundAura::Full, NeonGlow::Balanced, false),
            Preset::Aura => (SakuraIntensity::High, true, BackgroundAura::Full, NeonGlow::Vivid, false),
        }
    }

    pub fn apply(self, settings: &mut Settings) {
        let (sakura, glass, aura, neon, calm) = self.values();
        settings.sakura_intensity = sakura;
        settings.enable_glassmorphic_blur = glass;
        settings.background_aura = aura;
        settings.neon_glow = neon;
        settings.calm_motion = calm;
    }

    /// The preset matching the current mix, if the user has not customised it.
    pub fn infer(settings: &Settings) -> Option<Self> {
        let current = (
            settings.sakura_intensity,
            settings.enable_glassmorphic_blur,
            settings.background_aura,
            settings.neon_glow,
            settings.calm_motion,
        );
        [Preset::Zen, Preset::Doux, Preset::Aura].into_iter().find(|preset| preset.values() == current)
    }
}

/// Every effect at its maximum: worth a gentle warning.
pub fn is_max_atmosphere(settings: &Settings) -> bool {
    Preset::infer(settings) == Some(Preset::Aura)
}

// --- controls ---------------------------------------------------------------

fn segment<'a, T: Copy + PartialEq + 'a>(
    options: Vec<(T, String)>,
    value: Option<T>,
    on_change: impl Fn(T) -> Message + 'a,
    wrap: bool,
    ctx: &Ctx,
) -> Element<'a, Message> {
    let p = ctx.p;
    let accent = ctx.accent.fill;

    let buttons = options.into_iter().map(|(option, label)| {
        let selected = value == Some(option);
        let label = text(label).size(11).font(GEIST_MEDIUM).color(if selected { Color::WHITE } else { p.text_muted });
        let content: Element<'a, Message> = if wrap { container(label).center_x(Fill).into() } else { label.into() };

        button(content)
            .padding(Padding::from([6, 10]))
            .width(if wrap { Fill } else { iced::Shrink })
            .on_press(on_change(option))
            .style(move |_, status| button::Style {
                background: if selected {
                    Some(accent.into())
                } else if matches!(status, button::Status::Hovered) {
                    Some(p.surface_muted.into())
                } else {
                    None
                },
                border: iced::border::rounded(8),
                shadow: if selected { Shadow { color: alpha(accent, 0.30), offset: [0.0, 4.0].into(), blur_radius: 10.0 } } else { Shadow::default() },
                ..button::Style::default()
            })
            .into()
    });

    container(row(buttons).spacing(4))
        .padding(4)
        .width(if wrap { Fill } else { iced::Shrink })
        .style(move |_| container::Style {
            background: Some(p.surface_inset.into()),
            border: iced::border::rounded(12),
            ..container::Style::default()
        })
        .into()
}

fn switch<'a>(checked: bool, message: Message, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let accent = ctx.accent.fill;
    let knob = container(Space::new()).width(16).height(16).style(|_| container::Style {
        background: Some(Color::WHITE.into()),
        border: iced::border::rounded(8),
        shadow: Shadow { color: Color { a: 0.25, ..Color::BLACK }, offset: [0.0, 1.0].into(), blur_radius: 3.0 },
        ..container::Style::default()
    });
    let track = if checked { row![Space::new().width(Fill), knob] } else { row![knob, Space::new().width(Fill)] };

    button(track.align_y(iced::Center))
        .width(44)
        .height(24)
        .padding(4)
        .on_press(message)
        .style(move |_, _| button::Style {
            background: Some(if checked { accent } else { p.surface_muted }.into()),
            border: iced::border::rounded(12),
            ..button::Style::default()
        })
        .into()
}

fn divider<'a>(ctx: &Ctx) -> Element<'a, Message> {
    let color = ctx.p.border;
    rule::horizontal(1).style(move |_| rule::Style { color, radius: 0.0.into(), fill_mode: rule::FillMode::Full, snap: true }).into()
}

/// Label and hint on the left, control on the right.
fn setting_row<'a>(label: &'a str, hint: &'a str, control: Element<'a, Message>, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let mut labels = column![text(label).size(14).font(GEIST_MEDIUM).color(p.foreground)].spacing(2).width(Fill);
    if !hint.is_empty() {
        labels = labels.push(text(hint).size(11).color(p.text_muted));
    }
    row![labels, control].spacing(16).align_y(iced::Center).padding(Padding::from([8, 0])).into()
}

/// Rows separated by hairlines, as `border-b ... last:border-b-0`.
fn rows<'a>(items: Vec<Element<'a, Message>>, ctx: &Ctx) -> Column<'a, Message> {
    let mut list = column![];
    let count = items.len();
    for (index, item) in items.into_iter().enumerate() {
        list = list.push(item);
        if index + 1 < count {
            list = list.push(divider(ctx));
        }
    }
    list
}

fn section<'a>(title: &'a str, items: Vec<Element<'a, Message>>, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    column![
        text(title.to_uppercase()).size(10).font(GEIST_MEDIUM).color(p.text_subtle),
        container(rows(items, ctx)).padding(Padding::from([0, 12])).width(Fill).style(move |_| container::Style {
            background: Some(alpha(p.surface_inset, p.surface_inset.a * 0.3).into()),
            border: Border { color: alpha(p.border, p.border.a * 0.6), width: 1.0, radius: 12.0.into() },
            ..container::Style::default()
        }),
    ]
    .spacing(4)
    .into()
}

fn duration_label(ms: u32) -> String {
    if ms >= 60_000 { "1 min".to_string() } else { format!("{} s", ms / 1000) }
}

// --- tabs -------------------------------------------------------------------

fn general_tab<'a>(settings: &Settings, ctx: &Ctx) -> Element<'a, Message> {
    let tr = ctx.tr;
    let set = Message::Setting;

    let mut items = vec![
        setting_row(
            tr.t("settings_cadence"),
            tr.t("settings_cadence_hint"),
            segment(
                REFRESH_INTERVALS_MS.iter().map(|&ms| (ms, duration_label(ms))).collect(),
                Some(settings.refresh_interval),
                |ms| Message::Setting(Change::RefreshInterval(ms)),
                false,
                ctx,
            ),
            ctx,
        ),
        setting_row(
            tr.t("settings_lang_label"),
            tr.t("settings_lang_hint"),
            segment(
                vec![(Language::Fr, "Français".to_string()), (Language::En, "English".to_string())],
                Some(settings.language),
                |language| Message::Setting(Change::Language(language)),
                false,
                ctx,
            ),
            ctx,
        ),
        setting_row(
            tr.t("settings_drivers_essential"),
            tr.t("settings_drivers_essential_hint"),
            switch(settings.simplified_mode, set(Change::SimplifiedMode(!settings.simplified_mode)), ctx),
            ctx,
        ),
        setting_row(
            tr.t("settings_startup"),
            tr.t("settings_startup_hint"),
            switch(settings.launch_at_startup, set(Change::LaunchAtStartup(!settings.launch_at_startup)), ctx),
            ctx,
        ),
        setting_row(
            tr.t("settings_tray"),
            tr.t("settings_tray_hint"),
            switch(settings.minimize_to_tray, set(Change::MinimizeToTray(!settings.minimize_to_tray)), ctx),
            ctx,
        ),
        setting_row(
            tr.t("settings_desktop_widget"),
            tr.t("settings_desktop_widget_hint"),
            switch(settings.show_desktop_widget, set(Change::ShowDesktopWidget(!settings.show_desktop_widget)), ctx),
            ctx,
        ),
    ];

    if settings.show_desktop_widget {
        items.push(setting_row(
            tr.t("settings_widget_mode"),
            tr.t("settings_widget_mode_hint"),
            segment(
                vec![(WidgetMode::Koi, tr.t("widget_mode_koi").to_string()), (WidgetMode::Zen, tr.t("widget_mode_zen").to_string())],
                Some(settings.desktop_widget_mode),
                |mode| Message::Setting(Change::WidgetMode(mode)),
                false,
                ctx,
            ),
            ctx,
        ));
    }

    rows(items, ctx).into()
}

fn visual_tab<'a>(settings: &Settings, ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let set = Message::Setting;
    let label = |key: &'static str| tr.t(key).to_string();

    let preset = column![
        text(tr.t("settings_preset").to_uppercase()).size(10).font(GEIST_MEDIUM).color(p.text_subtle),
        segment(
            vec![(Preset::Zen, "Zen".to_string()), (Preset::Doux, label("atmosphere_preset_doux")), (Preset::Aura, "Aura".to_string())],
            Preset::infer(settings),
            |preset| Message::Setting(Change::Preset(preset)),
            true,
            ctx,
        ),
        text(tr.t("settings_preset_hint")).size(11).color(p.text_muted),
    ]
    .spacing(6);

    let light = section(
        tr.t("settings_section_light"),
        vec![setting_row(
            tr.t("settings_theme"),
            tr.t("settings_theme_hint"),
            segment(
                vec![(ThemeMode::Dark, label("theme_dark")), (ThemeMode::Light, label("theme_light"))],
                Some(settings.theme),
                |theme| Message::Setting(Change::Theme(theme)),
                false,
                ctx,
            ),
            ctx,
        )],
        ctx,
    );

    let mut nature = vec![setting_row(
        tr.t("settings_sakura"),
        tr.t("settings_sakura_hint"),
        segment(
            vec![
                (SakuraIntensity::Off, label("sakura_intensity_off")),
                (SakuraIntensity::Low, label("sakura_intensity_low")),
                (SakuraIntensity::Medium, label("sakura_intensity_medium")),
                (SakuraIntensity::High, label("sakura_intensity_high")),
            ],
            Some(settings.sakura_intensity),
            |intensity| Message::Setting(Change::SakuraIntensity(intensity)),
            false,
            ctx,
        ),
        ctx,
    )];
    if settings.sakura_intensity != SakuraIntensity::Off {
        nature.push(setting_row(
            tr.t("settings_sakura_tint"),
            tr.t("settings_sakura_tint_hint"),
            segment(
                vec![
                    (SakuraColor::Pink, label("sakura_color_pink")),
                    (SakuraColor::Purple, label("sakura_color_purple")),
                    (SakuraColor::Blue, label("sakura_color_blue")),
                    (SakuraColor::Green, label("sakura_color_green")),
                ],
                Some(settings.sakura_color),
                |color| Message::Setting(Change::SakuraColor(color)),
                false,
                ctx,
            ),
            ctx,
        ));
    }

    let ambiance = section(
        tr.t("settings_section_ambiance"),
        vec![
            setting_row(
                tr.t("settings_glass"),
                tr.t("settings_glass_hint"),
                switch(settings.enable_glassmorphic_blur, set(Change::Glass(!settings.enable_glassmorphic_blur)), ctx),
                ctx,
            ),
            setting_row(
                tr.t("settings_aura"),
                tr.t("settings_aura_hint"),
                segment(
                    vec![
                        (BackgroundAura::Off, label("aura_off")),
                        (BackgroundAura::Soft, label("aura_soft")),
                        (BackgroundAura::Full, label("aura_full")),
                    ],
                    Some(settings.background_aura),
                    |aura| Message::Setting(Change::Aura(aura)),
                    false,
                    ctx,
                ),
                ctx,
            ),
            setting_row(
                tr.t("settings_neon"),
                tr.t("settings_neon_hint"),
                segment(
                    vec![
                        (NeonGlow::Soft, label("neon_soft")),
                        (NeonGlow::Balanced, label("neon_balanced")),
                        (NeonGlow::Vivid, label("neon_vivid")),
                    ],
                    Some(settings.neon_glow),
                    |glow| Message::Setting(Change::Neon(glow)),
                    false,
                    ctx,
                ),
                ctx,
            ),
            setting_row(
                tr.t("settings_calm"),
                tr.t("settings_calm_hint"),
                switch(settings.calm_motion, set(Change::CalmMotion(!settings.calm_motion)), ctx),
                ctx,
            ),
        ],
        ctx,
    );

    column![preset, light, section(tr.t("settings_section_nature"), nature, ctx), ambiance].spacing(12).into()
}

fn dns_checkbox<'a>(name: &'static str, ip: &'static str, checked: bool, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let accent = ctx.accent.fill;

    let mark: Element<'a, Message> = if checked { icon(Icon::Check, 10.0, Color::WHITE).into() } else { Space::new().into() };
    let tick = container(mark).center_x(14).center_y(14).style(move |_| container::Style {
        background: checked.then_some(accent.into()),
        border: Border { color: if checked { accent } else { p.border_strong }, width: 2.0, radius: 5.0.into() },
        ..container::Style::default()
    });

    button(
        row![
            tick,
            column![
                text(name).size(12).font(GEIST_MEDIUM).color(p.foreground),
                text(ip).size(10).font(MONO).color(p.text_muted),
            ]
            .spacing(2),
        ]
        .spacing(8)
        .align_y(iced::Center),
    )
    .padding(Padding::from([8, 10]))
    .width(Fill)
    .on_press(Message::Setting(Change::DnsServer(name, !checked)))
    .style(move |_, status| button::Style {
        background: Some(if checked { alpha(accent, 0.08) } else { p.surface_inset }.into()),
        border: Border {
            color: if checked {
                alpha(accent, 0.40)
            } else if matches!(status, button::Status::Hovered) {
                p.border_strong
            } else {
                p.border
            },
            width: 1.0,
            radius: 12.0.into(),
        },
        ..button::Style::default()
    })
    .into()
}

fn input_style(p: crate::theme::Palette, accent: Color) -> impl Fn(&iced::Theme, text_input::Status) -> text_input::Style {
    move |_, status| text_input::Style {
        background: p.background.into(),
        border: Border {
            color: if matches!(status, text_input::Status::Focused { .. }) { accent } else { p.border },
            width: if matches!(status, text_input::Status::Focused { .. }) { 2.0 } else { 1.0 },
            radius: 12.0.into(),
        },
        icon: p.text_muted,
        placeholder: alpha(p.text_subtle, 0.5),
        value: p.foreground,
        selection: alpha(accent, 0.35),
    }
}

fn network_tab<'a>(settings: &'a Settings, dialog: &'a Dialog, ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let accent = ctx.accent.fill;

    let interval = setting_row(
        tr.t("settings_dns_interval"),
        tr.t("settings_dns_interval_hint"),
        segment(
            DNS_INTERVALS_MS.iter().map(|&ms| (ms, duration_label(ms))).collect(),
            Some(settings.dns_interval),
            |ms| Message::Setting(Change::DnsInterval(ms)),
            false,
            ctx,
        ),
        ctx,
    );

    let mut servers = column![].spacing(8);
    for pair in POPULAR_DNS_SERVERS.chunks(2) {
        let mut line = row![].spacing(8);
        for (name, ip) in pair {
            line = line.push(dns_checkbox(name, ip, settings.dns_checklist.iter().any(|checked| checked == name), ctx));
        }
        servers = servers.push(line);
    }

    // Personal server
    let ip = dialog.ip_draft.trim();
    let label: String = dialog.label_draft.trim().chars().take(24).collect();
    let invalid = !ip.is_empty() && !is_valid_custom_dns_ipv4(ip);
    let saved = settings.custom_dns.as_ref();
    let dirty = ip != saved.map(|dns| dns.ip.as_str()).unwrap_or("") || label != saved.map(|dns| dns.label.as_str()).unwrap_or("");
    let can_validate = !ip.is_empty() && !invalid && dirty;

    let mut heading = row![column![
        text(tr.t("settings_custom_dns")).size(14).font(GEIST_MEDIUM).color(p.foreground),
        text(tr.t("settings_custom_dns_hint")).size(11).color(p.text_muted),
    ]
    .spacing(2)
    .width(Fill)]
    .spacing(12);
    if saved.is_some() {
        heading = heading.push(
            button(text(tr.t("settings_custom_dns_clear")).size(11).font(GEIST_SEMIBOLD).color(p.text_muted))
                .padding(Padding::from([4, 8]))
                .on_press(Message::CustomDnsClear)
                .style(|_, _| button::Style::default()),
        );
    }

    let field_label = |label: String| text(label).size(11).font(GEIST_MEDIUM).color(p.text_muted);
    let mut ip_field = column![text_input(tr.t("settings_custom_dns_ip_placeholder"), &dialog.ip_draft)
        .on_input(Message::CustomDnsIp)
        .on_submit(Message::CustomDnsCommit)
        .size(14)
        .font(MONO)
        .padding(Padding::from([10, 12]))
        .style(input_style(p, accent))]
    .spacing(4)
    .width(Fill);
    if invalid {
        ip_field = ip_field.push(text(tr.t("settings_custom_dns_invalid_ip")).size(11).color(if p.is_dark() { rgb(0xfbbf24) } else { rgb(0xd97706) }));
    }

    let validate = button(container(text(tr.t("settings_custom_dns_validate")).size(12).font(GEIST_SEMIBOLD).color(Color::WHITE)).center_y(Fill))
        .height(40)
        .padding(Padding::from([0, 16]))
        .on_press_maybe(can_validate.then_some(Message::CustomDnsCommit))
        .style(move |_, status| button::Style {
            background: Some(
                match status {
                    button::Status::Disabled => alpha(accent, 0.4),
                    button::Status::Hovered | button::Status::Pressed => alpha(accent, 0.9),
                    button::Status::Active => accent,
                }
                .into(),
            ),
            border: iced::border::rounded(12),
            ..button::Style::default()
        });

    let personal = container(
        column![
            heading,
            column![field_label(tr.t("settings_custom_dns_ip").to_string()), row![ip_field, validate].spacing(8)].spacing(6),
            column![
                field_label(format!("{}{}", tr.t("settings_custom_dns_nickname"), tr.t("settings_custom_dns_nickname_optional"))),
                text_input(tr.t("settings_custom_dns_nickname_placeholder"), &dialog.label_draft)
                    .on_input(Message::CustomDnsLabel)
                    .on_submit(Message::CustomDnsCommit)
                    .size(14)
                    .padding(Padding::from([10, 12]))
                    .style(input_style(p, accent)),
            ]
            .spacing(6),
        ]
        .spacing(10),
    )
    .padding(12)
    .style(move |_| container::Style {
        background: Some(p.surface_inset.into()),
        border: Border { color: p.border, width: 1.0, radius: 16.0.into() },
        ..container::Style::default()
    });

    column![
        interval,
        column![text(tr.t("settings_dns_servers")).size(14).font(GEIST_MEDIUM).color(p.foreground), servers].spacing(8),
        personal,
    ]
    .spacing(12)
    .into()
}

fn alerts_tab<'a>(settings: &Settings, ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let alerts = &settings.alert_thresholds;
    let set = Message::Setting;

    let mut items = vec![setting_row(
        tr.t("settings_alerts_title"),
        tr.t("settings_alerts_hint"),
        switch(alerts.enabled, set(Change::AlertsEnabled(!alerts.enabled)), ctx),
        ctx,
    )];

    if alerts.enabled {
        items.push(
            column![
                text(tr.t("settings_alerts_sensitivity")).size(14).font(GEIST_MEDIUM).color(p.foreground),
                segment(
                    vec![
                        (Sensitivity::Low, tr.t("sensitivity_low").to_string()),
                        (Sensitivity::Medium, tr.t("sensitivity_medium").to_string()),
                        (Sensitivity::High, tr.t("sensitivity_high").to_string()),
                    ],
                    Some(alerts.desktop.sensitivity),
                    |sensitivity| Message::Setting(Change::Sensitivity(sensitivity)),
                    true,
                    ctx,
                ),
                text(tr.t("settings_alerts_sensitivity_hint")).size(11).color(p.text_muted),
            ]
            .spacing(8)
            .padding(Padding::from([12, 0]))
            .into(),
        );
        items.push(setting_row(
            tr.t("settings_alerts_gaming"),
            tr.t("settings_alerts_gaming_hint"),
            switch(alerts.gaming.network_alerts, set(Change::GamingAlerts(!alerts.gaming.network_alerts)), ctx),
            ctx,
        ));
    }

    rows(items, ctx).into()
}

fn about_tab<'a>(app: &'a App, ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let fill = gradient::Linear::new(Radians(std::f32::consts::FRAC_PI_2))
        .add_stop(0.0, p.pink.fill)
        .add_stop(1.0, mix(p.purple.fill, p.pink.fill, 0.75));
    let glow = p.pink.fill;

    let donate = button(
        row![
            icon(Icon::Heart, 14.0, Color::WHITE),
            text(tr.t("settings_about_donate")).size(12).font(GEIST_SEMIBOLD).color(Color::WHITE),
        ]
        .spacing(8)
        .align_y(iced::Center),
    )
    .padding(Padding::from([10, 20]))
    .on_press(Message::Donate)
    .style(move |_, status| button::Style {
        background: Some(Background::Gradient(fill.into())),
        border: iced::border::rounded(999),
        shadow: Shadow {
            color: alpha(glow, if matches!(status, button::Status::Hovered) { 0.55 } else { 0.35 }),
            offset: [0.0, 4.0].into(),
            blur_radius: 18.0,
        },
        ..button::Style::default()
    });

    // Five quick clicks on the wordmark: the secret melody.
    let wordmark = iced::widget::mouse_area(
        canvas(Wordmark { cache: &app.about_wordmark_cache, ctx: *ctx, size: 26.0, bold: true }).width(188).height(40),
    )
    .on_press(Message::SecretTap);

    container(
        column![
            wordmark,
            Space::new().height(12),
            text(tr.t("settings_about_thanks").to_uppercase()).size(10).font(GEIST_MEDIUM).color(ctx.accent.text),
            container(text(tr.t("settings_about_desc")).size(12).color(p.text_muted).center()).max_width(288),
            Space::new().height(2),
            donate,
            Space::new().height(2),
            text("RUST · ICED · WGPU").size(10).color(p.text_subtle),
            text(format!("v{}", env!("CARGO_PKG_VERSION"))).size(10).font(MONO_BOLD).color(p.text_subtle),
        ]
        .spacing(8)
        .align_x(iced::Center),
    )
    .center_x(Fill)
    .center_y(Fill)
    .into()
}

// --- dialog -----------------------------------------------------------------

fn tab_button<'a>(tab: SettingsTab, glyph: Icon, label: &'a str, active: bool, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let accent = ctx.accent.fill;
    let color = if active { Color::WHITE } else { p.text_muted };

    button(
        container(column![icon(glyph, 15.0, color), text(label).size(11).font(GEIST_MEDIUM).color(color)].spacing(4).align_x(iced::Center))
            .center_x(Fill)
            .center_y(Fill),
    )
    .width(Fill)
    .height(52)
    .padding(Padding::from([0, 8]))
    .on_press(Message::SettingsTab(tab))
    .style(move |_, status| button::Style {
        background: if active {
            Some(accent.into())
        } else if matches!(status, button::Status::Hovered) {
            Some(p.surface_muted.into())
        } else {
            None
        },
        border: iced::border::rounded(12),
        shadow: if active { Shadow { color: alpha(accent, 0.25), offset: [0.0, 4.0].into(), blur_radius: 12.0 } } else { Shadow::default() },
        ..button::Style::default()
    })
    .into()
}

pub fn view<'a>(app: &'a App, dialog: &'a Dialog, ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let settings = &app.settings;

    let close = button(container(icon(Icon::X, 16.0, p.text_muted)).center_x(Fill).center_y(Fill))
        .width(44)
        .height(44)
        .padding(0)
        .on_press(Message::CloseSettings)
        .style(move |_, status| button::Style {
            background: matches!(status, button::Status::Hovered).then_some(p.surface_muted.into()),
            border: iced::border::rounded(8),
            ..button::Style::default()
        });

    let header = row![text(tr.t("settings_title")).size(18).font(GEIST_SEMIBOLD).color(p.foreground).width(Fill), close]
        .align_y(iced::Center)
        .padding(Padding { top: 16.0, right: 20.0, bottom: 16.0, left: 20.0 });

    let tabs = [
        (SettingsTab::General, Icon::Monitor, "tab_general"),
        (SettingsTab::Visual, Icon::Eye, "tab_visual"),
        (SettingsTab::Network, Icon::Wifi, "tab_network"),
        (SettingsTab::Alerts, Icon::Bell, "tab_alerts"),
        (SettingsTab::About, Icon::Info, "tab_about"),
    ];
    let nav = container(
        Column::with_children(tabs.map(|(tab, glyph, key)| tab_button(tab, glyph, tr.t(key), dialog.tab == tab, ctx))).spacing(4),
    )
    .padding(8)
    .width(116)
    .height(Fill)
    .style(move |_| container::Style {
        background: Some(alpha(p.surface_inset, p.surface_inset.a * 0.4).into()),
        // Follows the dialog's rounded corner.
        border: Border { radius: iced::border::Radius::default().bottom_left(31), ..Border::default() },
        ..container::Style::default()
    });

    let content: Element<'a, Message> = match dialog.tab {
        SettingsTab::General => general_tab(settings, ctx),
        SettingsTab::Visual => visual_tab(settings, ctx),
        SettingsTab::Network => network_tab(settings, dialog, ctx),
        SettingsTab::Alerts => alerts_tab(settings, ctx),
        SettingsTab::About => about_tab(app, ctx),
    };
    let panel: Element<'a, Message> = if dialog.tab == SettingsTab::About {
        container(content).padding(Padding::from([16, 20])).height(Fill).into()
    } else {
        scrollable(container(content).padding(Padding { top: 16.0, right: 24.0, bottom: 16.0, left: 20.0 }))
            .direction(scrollable::Direction::Vertical(scrollable::Scrollbar::new().width(6).scroller_width(6).margin(2)))
            .height(Fill)
            .into()
    };

    // Footer: confirmation toast, then the reset button.
    let mut footer = column![].spacing(8).padding(Padding::from([12, 20]));
    if let Some((message, severity)) = &dialog.toast {
        let style = toast_style(*severity, ctx);
        let color = style.text_color.unwrap_or(p.foreground);
        footer = footer.push(
            container(text(message.clone()).size(12).font(GEIST_SEMIBOLD).color(color))
                .center_x(Fill)
                .padding(Padding::from([8, 12]))
                .style(move |_| style),
        );
    }
    let confirm = dialog.confirm_reset;
    let red = rgb(0xef4444);
    let reset_color = if confirm { red } else { ctx.accent.text };
    let accent = ctx.accent.fill;
    footer = footer.push(
        container(
            button(
                row![
                    icon(Icon::RotateCcw, 13.0, reset_color),
                    text(tr.t(if confirm { "settings_reset_confirm" } else { "settings_reset_button" })).size(12).font(GEIST_MEDIUM).color(reset_color),
                ]
                .spacing(8)
                .align_y(iced::Center),
            )
            .padding(Padding::from([8, 12]))
            .on_press(Message::ResetSettings)
            .style(move |_, status| button::Style {
                background: if confirm {
                    Some(alpha(red, 0.20).into())
                } else if matches!(status, button::Status::Hovered) {
                    Some(alpha(accent, 0.10).into())
                } else {
                    None
                },
                border: Border { color: if confirm { alpha(red, 0.30) } else { Color::TRANSPARENT }, width: 1.0, radius: 8.0.into() },
                ..button::Style::default()
            }),
        )
        .align_right(Fill),
    );

    let vertical = rule::vertical(1).style(move |_| rule::Style { color: p.border, radius: 0.0.into(), fill_mode: rule::FillMode::Full, snap: true });

    glass(
        column![
            header,
            divider(ctx),
            row![nav, vertical, column![panel, divider(ctx), footer].width(FillPortion(1))].height(430),
        ],
        ctx.atmosphere,
    )
    .surface(Surface::Dialog)
    .radius(32.0)
    .width(704)
    .into()
}
