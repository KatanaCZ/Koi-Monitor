//! Zen mode: a wallpaper of typography — clock, date, mood, large metrics and a quote.

use iced::widget::{button, column, container, mouse_area, row, text, Space};
use iced::{gradient, Background, Border, Color, Element, Fill, FillPortion, Padding, Radians, Shadow};

use super::dns::{gaming_breakdown, verdict_label, verdict_style};
use super::icons::{icon, Icon};
use super::kit::Ctx;
use super::title_bar::format_uptime_short;
use crate::app::{App, Message};
use crate::clock;
use crate::theme::{alpha, Neon, GEIST_BOLD, GEIST_MEDIUM, MONO_BOLD, MONO_EXTRALIGHT, MONO_LIGHT, MONO_SEMIBOLD};
use crate::zen_state::LoadState;

/// Height of the strip that brings the title bar back when hovered.
pub const PEEK_HEIGHT: f32 = 14.0;

/// Text sizes follow the Tailwind breakpoints of the web UI.
struct Scale {
    clock: f32,
    seconds: f32,
    date: f32,
    quote: f32,
    metric: f32,
    label: f32,
    line: f32,
    gap: f32,
}

fn scale(width: f32) -> Scale {
    let (date, quote, metric, gap) = if width >= 1280.0 {
        (30.0, 36.0, 72.0, 56.0)
    } else if width >= 1024.0 {
        (30.0, 30.0, 60.0, 56.0)
    } else {
        (24.0, 24.0, 48.0, 48.0)
    };
    Scale {
        clock: (width * 0.18).clamp(72.0, 176.0),
        seconds: (width * 0.04).clamp(20.0, 44.0),
        date,
        quote,
        metric,
        label: 14.0,
        line: date,
        gap,
    }
}

pub fn state_neon(state: LoadState, ctx: &Ctx) -> Neon {
    match state {
        LoadState::Rest => ctx.p.green,
        LoadState::Moderate => ctx.p.cyan,
        LoadState::Intense => ctx.p.warning,
    }
}

fn state_keys(state: LoadState) -> (&'static str, &'static str) {
    match state {
        LoadState::Rest => ("zen_mode_zen", "zen_mode_zen_quote"),
        LoadState::Moderate => ("zen_mode_flow", "zen_mode_flow_quote"),
        LoadState::Intense => ("zen_mode_boost", "zen_mode_boost_quote"),
    }
}

struct Metric<'m> {
    label: &'m str,
    value: String,
    neon: Neon,
    /// Fill of the gauge, 0–100.
    percent: f32,
    temperature: Option<f32>,
}

/// Big figure with its label, optional temperature, a thin gauge and an optional detail under it.
fn large_metric<'a>(
    metric: Metric<'_>,
    detail: Option<Element<'a, Message>>,
    sizes: &Scale,
    ctx: &Ctx,
) -> iced::widget::Column<'a, Message> {
    let Metric { label, value, neon, percent, temperature } = metric;
    let p = ctx.p;
    let fill = neon.fill;
    let filled = percent.clamp(0.0, 100.0).round() as u16;

    let mut gauge = row![].height(6);
    if filled > 0 {
        gauge = gauge.push(container(Space::new()).width(FillPortion(filled)).height(Fill).style(move |_| container::Style {
            background: Some(fill.into()),
            border: iced::border::rounded(3),
            shadow: Shadow { color: alpha(fill, 0.5), offset: [0.0, 0.0].into(), blur_radius: 12.0 },
            ..container::Style::default()
        }));
    }
    if filled < 100 {
        gauge = gauge.push(Space::new().width(FillPortion(100 - filled)));
    }

    let mut metric = column![
        text(label.to_uppercase()).size(sizes.label).font(GEIST_BOLD).color(p.text_subtle),
        Space::new().height(4),
        text(value).size(sizes.metric).font(MONO_BOLD).color(neon.text),
    ]
    .spacing(4)
    .align_x(iced::Center);

    if let Some(temperature) = temperature {
        metric = metric.push(text(format!("{temperature:.0} °C")).size(sizes.label).font(GEIST_BOLD).color(alpha(neon.text, 0.8)));
    }

    metric = metric.push(Space::new().height(8)).push(container(gauge).width(128).style(move |_| container::Style {
        background: Some(p.ring_track.into()),
        border: iced::border::rounded(3),
        ..container::Style::default()
    }));

    if let Some(detail) = detail {
        metric = metric.push(Space::new().height(8)).push(detail);
    }
    metric
}

fn metrics_dock<'a>(app: &'a App, sizes: &Scale, ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let system = app.system.as_ref();
    let cpu = system.map(|s| &s.cpu);
    // On dual-GPU machines, the adapter actually under load.
    let gpu = system.and_then(|s| s.gpu.iter().max_by(|a, b| a.usage.total_cmp(&b.usage)));
    let ram = system.map(|s| s.memory.usage_percent).unwrap_or(0.0);
    let gaming = &app.gaming;

    let style = verdict_style(&gaming.verdict, ctx);
    let gaming_neon = Neon { fill: style.color, text: style.text };
    let gaming_value = if gaming.internet_ms >= 0.0 {
        format!("{:.0} ms", gaming.internet_ms)
    } else if gaming.verdict == "measuring" {
        "---".to_string()
    } else {
        "N/A".to_string()
    };
    let gaming_percent = if gaming.internet_ms < 0.0 { 0.0 } else { (100.0 - gaming.internet_ms / 120.0 * 100.0).clamp(8.0, 100.0) as f32 };

    let (badge_background, badge_border) = (style.badge_background, style.badge_border);
    let verdict = container(text(verdict_label(&gaming.verdict, ctx).to_uppercase()).size(sizes.label).font(GEIST_BOLD).color(style.text))
        .padding(Padding::from([8, 16]))
        .style(move |_| container::Style {
            background: Some(badge_background.into()),
            border: Border { color: badge_border, width: 1.0, radius: 12.0.into() },
            ..container::Style::default()
        });

    let cpu_usage = cpu.map(|c| c.usage).unwrap_or(0.0);
    let gpu_usage = gpu.map(|g| g.usage).unwrap_or(0.0);

    let game = button(large_metric(
        Metric { label: tr.t("zen_metric_game"), value: gaming_value, neon: gaming_neon, percent: gaming_percent, temperature: None },
        Some(verdict.into()),
        sizes,
        ctx,
    ))
    .padding(0)
    .on_press(Message::ToggleGamingDetails)
    .style(|_, _| button::Style::default());

    let cpu_metric = Metric {
        label: "CPU",
        value: format!("{cpu_usage:.0} %"),
        neon: p.pink,
        percent: cpu_usage,
        temperature: cpu.and_then(|c| c.temperature),
    };
    let gpu_metric = Metric {
        label: "GPU",
        value: format!("{gpu_usage:.0} %"),
        neon: p.purple,
        percent: gpu_usage,
        temperature: gpu.and_then(|g| g.temperature),
    };

    let metrics = row![
        container(large_metric(cpu_metric, None, sizes, ctx)).center_x(Fill),
        container(large_metric(gpu_metric, None, sizes, ctx)).center_x(Fill),
        container(game).center_x(Fill),
    ]
    .spacing(48)
    .align_y(iced::Top);

    // RAM · Active · Battery
    let small_label = |label: &str| text(label.to_uppercase()).size(sizes.label).font(GEIST_BOLD).color(p.text_subtle);
    let dot = || text("·").size(sizes.line).color(p.text_subtle);
    let mut line = row![
        row![small_label("RAM"), text(format!("{ram:.0} %")).size(sizes.line).font(MONO_SEMIBOLD).color(p.text_muted)]
            .spacing(12)
            .align_y(iced::Center),
        dot(),
        row![
            small_label(tr.t("uptime_label")),
            text(format_uptime_short(app.live_uptime(), tr.is_french())).size(sizes.line).font(MONO_SEMIBOLD).color(p.text_muted),
        ]
        .spacing(12)
        .align_y(iced::Center),
    ]
    .spacing(32)
    .align_y(iced::Center);

    if let Some(battery) = system.and_then(|s| s.battery.as_ref()) {
        let (glyph, glyph_color, value_color) = if battery.is_charging {
            (Icon::BatteryCharging, p.green.fill, p.green.text)
        } else if battery.percentage <= 20 {
            (Icon::BatteryLow, p.error.fill, p.error.text)
        } else if battery.percentage == 100 {
            (Icon::Battery, p.green.fill, p.green.text)
        } else {
            (Icon::Battery, p.text_muted, p.text_muted)
        };
        line = line.push(dot()).push(
            row![
                small_label(tr.t("battery_label")),
                icon(glyph, 20.0, glyph_color),
                text(format!("{} %", battery.percentage)).size(sizes.line).font(MONO_SEMIBOLD).color(value_color),
            ]
            .spacing(8)
            .align_y(iced::Center),
        );
    }

    let mut dock = column![container(metrics).max_width(768), line].spacing(36).align_x(iced::Center);
    if app.gaming_details_open {
        dock = dock.push(container(gaming_breakdown(gaming, ctx)).max_width(576));
    }
    dock.into()
}

fn footer_button<'a>(content: impl Into<Element<'a, Message>>, message: Message) -> Element<'a, Message> {
    button(container(content).center_y(Fill))
        .height(44)
        .padding(Padding::from([0, 8]))
        .on_press(message)
        .style(|_, _| button::Style::default())
        .into()
}

pub fn view<'a>(app: &'a App, ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let sizes = scale(app.window_size.width);
    let time = clock::now();
    let state = app.zen_tracker.state();
    let (label_key, quote_key) = state_keys(state);
    let accent = ctx.accent;

    // Clicking the clock goes back to the dashboard.
    let header = mouse_area(
        column![
            row![
                text(format!("{:02}:{:02}", time.hour, time.minute)).size(sizes.clock).font(MONO_EXTRALIGHT).color(accent.text),
                column![
                    Space::new().height(sizes.clock * 0.16),
                    text(format!("{:02}", time.second)).size(sizes.seconds).font(MONO_LIGHT).color(alpha(accent.text, 0.5)),
                ],
            ]
            .spacing(12)
            .align_y(iced::Top),
            Space::new().height(16),
            text(time.long_date(tr.0)).size(sizes.date).font(GEIST_MEDIUM).color(p.foreground),
            Space::new().height(8),
            text(tr.t(label_key).to_uppercase()).size(16).font(GEIST_BOLD).color(state_neon(state, ctx).text),
        ]
        .align_x(iced::Center),
    )
    .on_press(Message::ToggleZen)
    .interaction(iced::mouse::Interaction::Pointer);

    let mut core = column![header].spacing(sizes.gap).align_x(iced::Center);
    if app.settings.zen_metrics_visible {
        core = core.push(metrics_dock(app, &sizes, ctx));
    }
    // The latency breakdown takes the quote's place: both do not fit on a 900 px tall window.
    if !(app.settings.zen_metrics_visible && app.gaming_details_open) {
        core = core.push(
            container(text(tr.t(quote_key)).size(sizes.quote).color(alpha(p.foreground, 0.82)).center()).max_width(768),
        );
    }

    let mut footer = column![].spacing(4).align_x(iced::Center);
    let unread = app.unread_alerts();
    if unread > 0 {
        footer = footer.push(footer_button(
            row![
                icon(Icon::Bell, 14.0, alpha(p.green.text, 0.8)),
                text(tr.tf("zen_unread_count", &[("count", &unread)])).size(14).font(GEIST_MEDIUM).color(alpha(p.green.text, 0.8)),
            ]
            .spacing(8)
            .align_y(iced::Center),
            Message::ToggleNotifications,
        ));
    }
    let subtle = alpha(p.text_subtle, 0.6);
    footer = footer.push(
        row![
            footer_button(
                icon(if app.settings.zen_metrics_visible { Icon::Eye } else { Icon::EyeOff }, 15.0, subtle),
                Message::ToggleZenMetrics,
            ),
            footer_button(text(tr.t("zen_footer_back")).size(14).color(subtle), Message::ToggleZen),
        ]
        .spacing(16)
        .align_y(iced::Center),
    );

    column![
        container(core).center_x(Fill).center_y(Fill).padding(Padding::from([0, 32])),
        container(footer).center_x(Fill).padding(Padding { top: 0.0, right: 16.0, bottom: 20.0, left: 16.0 }),
    ]
    .into()
}

/// The strip at the top of the Zen wallpaper that reveals the title bar: a faint accent line.
pub fn title_bar_peek<'a>(ctx: &Ctx) -> Element<'a, Message> {
    let accent = ctx.accent.fill;
    let line = gradient::Linear::new(Radians(std::f32::consts::FRAC_PI_2))
        .add_stop(0.0, Color::TRANSPARENT)
        .add_stop(0.5, alpha(accent, 0.25))
        .add_stop(1.0, Color::TRANSPARENT);

    mouse_area(
        container(container(Space::new()).width(FillPortion(3)).height(1).style(move |_| container::Style {
            background: Some(Background::Gradient(line.into())),
            ..container::Style::default()
        }))
        .width(Fill)
        .height(PEEK_HEIGHT)
        .align_bottom(PEEK_HEIGHT)
        .padding(Padding::from([0, 280])),
    )
    .on_enter(Message::ZenBar(true))
    .into()
}
