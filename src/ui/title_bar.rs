//! Custom title bar: wordmark, uptime and battery chips, actions and window controls.

use iced::mouse;
use iced::widget::canvas::{self, gradient, Cache, Geometry, Text};
use iced::widget::{canvas as canvas_widget, container, mouse_area, row, text, Space};
use iced::{alignment, Element, Fill, Padding, Pixels, Point, Rectangle, Renderer, Theme};

use super::icons::{icon, Icon};
use super::kit::{caption, icon_button, inset_style, panel, Ctx, Emphasis};
use crate::app::{App, Message};
use crate::settings::ThemeMode;
use crate::theme::{mix, GEIST_BOLD, GEIST_SEMIBOLD, MONO_BOLD};

pub const HEIGHT: f32 = 48.0;
/// Space above the bar, gutters on its sides and widest it gets: those of the dashboard.
pub const TOP: f32 = 24.0;
pub const GUTTER: f32 = 32.0;
pub const MAX_WIDTH: f32 = 1280.0;
const PADDING: f32 = 16.0;

/// Size of the wordmark in the bar, and the width its gradient runs over.
pub const WORDMARK_SIZE: f32 = 15.0;
const WORDMARK_WIDTH: f32 = 108.0;
pub const WORDMARK_GRADIENT: f32 = WORDMARK_WIDTH * 0.92;

/// Left edge and vertical centre of the wordmark in a window `window_width` wide:
/// where the opening screen brings its own.
pub fn wordmark_slot(window_width: f32) -> Point {
    let bar_width = (window_width - 2.0 * GUTTER).min(MAX_WIDTH);
    Point::new((window_width - bar_width) / 2.0 + PADDING, TOP + HEIGHT / 2.0)
}

/// "Koi Monitor" with the brand gradient (`.slash-title-static`).
pub struct Wordmark<'a> {
    pub cache: &'a Cache,
    pub ctx: Ctx,
    pub size: f32,
    pub bold: bool,
}

impl<Message> canvas::Program<Message> for Wordmark<'_> {
    type State = ();

    fn draw(
        &self,
        _state: &Self::State,
        renderer: &Renderer,
        _theme: &Theme,
        bounds: Rectangle,
        _cursor: mouse::Cursor,
    ) -> Vec<Geometry> {
        vec![self.cache.draw(renderer, bounds.size(), |frame| {
            let p = &self.ctx.p;
            let width = frame.width();

            // "Koi" runs pink → purple → cyan, " Monitor" cyan → pale cyan.
            let fill = gradient::Linear::new(Point::new(0.0, 0.0), Point::new(width * WORDMARK_GRADIENT / WORDMARK_WIDTH, 0.0))
                .add_stop(0.0, p.pink.fill)
                .add_stop(0.20, p.purple.fill)
                .add_stop(0.30, p.cyan.fill)
                .add_stop(1.0, mix(p.cyan.fill, iced::Color::WHITE, 0.70));

            let wordmark = Text {
                content: "Koi Monitor".to_string(),
                position: Point::new(0.0, frame.height() / 2.0),
                size: Pixels(self.size),
                font: if self.bold { GEIST_BOLD } else { GEIST_SEMIBOLD },
                align_y: alignment::Vertical::Center,
                ..Text::default()
            };
            wordmark.draw_with(|glyph, _color| frame.fill(&glyph, fill));
        })]
    }
}

pub fn format_uptime_short(total_seconds: u64, french: bool) -> String {
    if total_seconds == 0 {
        return if french { "Calcul…" } else { "Measuring…" }.to_string();
    }
    let days = total_seconds / 86_400;
    let hours = (total_seconds % 86_400) / 3600;
    let minutes = (total_seconds % 3600) / 60;

    let mut parts = Vec::new();
    if days > 0 {
        parts.push(if french { format!("{days} j") } else { format!("{days}d") });
    }
    if hours > 0 || days > 0 {
        parts.push(format!("{hours}h"));
    }
    if days == 0 {
        parts.push(format!("{minutes}m"));
    }
    parts.join(" ")
}

fn chip<'a>(
    glyph: Icon,
    glyph_color: iced::Color,
    label: &str,
    value: String,
    value_color: iced::Color,
    ctx: &Ctx,
) -> Element<'a, Message> {
    let p = ctx.p;
    container(
        row![
            icon(glyph, 14.0, glyph_color),
            caption(label, ctx),
            text(value).size(12).font(MONO_BOLD).color(value_color),
        ]
        .spacing(8)
        .align_y(iced::Center),
    )
    .padding(Padding::from([6, 12]))
    .style(move |_| inset_style(&p, 12.0))
    .into()
}

fn uptime_chip<'a>(app: &App, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    chip(
        Icon::Clock,
        p.green.fill,
        ctx.tr.t("uptime_label"),
        format_uptime_short(app.live_uptime(), ctx.tr.is_french()),
        p.green.text,
        ctx,
    )
}

fn battery_chip<'a>(app: &App, ctx: &Ctx) -> Option<Element<'a, Message>> {
    let battery = app.system.as_ref()?.battery.as_ref()?;
    let p = ctx.p;

    let (glyph, glyph_color, value_color) = if battery.is_charging {
        (Icon::BatteryCharging, p.green.fill, p.green.text)
    } else if battery.percentage <= 20 {
        (Icon::BatteryLow, p.error.fill, p.error.text)
    } else if battery.percentage == 100 {
        (Icon::Battery, p.green.fill, p.green.text)
    } else {
        (Icon::Battery, p.text_muted, p.foreground)
    };

    Some(chip(
        glyph,
        glyph_color,
        ctx.tr.t("battery_label"),
        format!("{}%", battery.percentage),
        value_color,
        ctx,
    ))
}

pub fn view<'a>(app: &'a App, ctx: &Ctx) -> Element<'a, Message> {
    let tr = ctx.tr;
    let p = ctx.p;
    let settings = &app.settings;
    let zen = settings.zen_mode;
    let to_tray = settings.minimize_to_tray;

    // Five quick clicks on the wordmark: the secret melody.
    // While the opening screen brings its wordmark here, the place stays empty.
    let wordmark: Element<'a, Message> = if app.opening() {
        Space::new().width(WORDMARK_WIDTH).height(24).into()
    } else {
        mouse_area(
            canvas_widget(Wordmark { cache: &app.wordmark_cache, ctx: *ctx, size: WORDMARK_SIZE, bold: false })
                .width(WORDMARK_WIDTH)
                .height(24),
        )
        .on_press(Message::SecretTap)
        .into()
    };

    // Everything that is not a button drags the window; a double click maximizes it.
    let mut center = row![].spacing(8).align_y(iced::Center);
    if !zen {
        center = center.push(uptime_chip(app, ctx));
        if let Some(battery) = battery_chip(app, ctx) {
            center = center.push(battery);
        }
    }
    let drag_area = mouse_area(
        row![wordmark, container(center).center_x(Fill).center_y(Fill)]
            .align_y(iced::Center)
            .height(Fill),
    )
    .on_press(Message::DragWindow)
    .on_double_click(Message::ToggleMaximize);

    let muted = settings.ambient_music_muted;
    let unread = app.unread_alerts();
    let actions = row![
        icon_button(
            if muted { Icon::VolumeX } else { Icon::Volume },
            16.0,
            if muted { Emphasis::Quiet } else { Emphasis::Tinted(ctx.accent) },
            Message::ToggleMute,
            tr.t(if muted { "unmute_music_tooltip" } else { "mute_music_tooltip" }),
            ctx,
        ),
        icon_button(
            Icon::Bell,
            16.0,
            if app.notification_panel_open || unread > 0 { Emphasis::Tinted(p.green) } else { Emphasis::Quiet },
            Message::ToggleNotifications,
            tr.t("notifications_tooltip"),
            ctx,
        ),
        icon_button(Icon::Settings, 16.0, Emphasis::Quiet, Message::OpenSettings(None), tr.t("settings_tooltip"), ctx),
        icon_button(
            Icon::Flower,
            16.0,
            if zen { Emphasis::Filled(ctx.accent.fill) } else { Emphasis::Quiet },
            Message::ToggleZen,
            tr.t(if zen { "zen_disable_tooltip" } else { "zen_enable_tooltip" }),
            ctx,
        ),
        Space::new().width(4),
        icon_button(
            if settings.theme == ThemeMode::Dark { Icon::Sun } else { Icon::Moon },
            16.0,
            Emphasis::Quiet,
            Message::ToggleTheme,
            tr.t("theme_toggle_tooltip"),
            ctx,
        ),
        icon_button(
            Icon::Minus,
            16.0,
            Emphasis::Quiet,
            Message::MinimizeWindow,
            tr.t(if to_tray { "window_minimize_tray" } else { "window_minimize" }),
            ctx,
        ),
        icon_button(
            if app.maximized { Icon::Square } else { Icon::Maximize },
            14.0,
            Emphasis::Quiet,
            Message::ToggleMaximize,
            tr.t(if app.maximized { "window_restore" } else { "window_maximize" }),
            ctx,
        ),
        Space::new().width(4),
        icon_button(
            Icon::X,
            16.0,
            Emphasis::Danger,
            Message::CloseWindow,
            tr.t(if to_tray { "window_close_tray" } else { "window_close" }),
            ctx,
        ),
    ]
    .spacing(4)
    .align_y(iced::Center);

    panel(row![drag_area, actions].align_y(iced::Center), ctx)
        .width(Fill)
        .height(HEIGHT)
        .padding(Padding::from([0.0, PADDING]))
        .into()
}
