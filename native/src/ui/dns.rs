//! DNS comparator and gaming latency card (`DnsWidget`, `DnsViaBand`, `GamingLatencyBreakdown`).

use iced::widget::{button, column, container, row, rule, text, Space};
use iced::{Border, Color, Element, Fill, FillPortion, Padding, Shadow};

use super::icons::{icon, Icon};
use super::kit::{self, caption, icon_tile, inset_style, Ctx};
use crate::app::{App, Expanded, Message, SettingsTab};
use crate::backend::dns::DnsResult;
use crate::backend::gaming_latency::GamingLatencySnapshot;
use crate::settings::{default_dns_checklist, POPULAR_DNS_SERVERS};
use crate::theme::{alpha, mix, rgb, rgba, GEIST_BOLD, GEIST_SEMIBOLD, MONO, MONO_BOLD};

const BASE_HEIGHT: f32 = 400.0;
const DENSE_HEIGHT: f32 = 460.0;
/// The gaming latency breakdown and the gap above it.
const GAMING_DETAIL_EXTRA: f32 = 184.0;

/// Height of the dashboard card; the network card next to it follows.
pub fn card_height(app: &App) -> f32 {
    let base = if app.dns_results.len() > 4 { DENSE_HEIGHT } else { BASE_HEIGHT };
    base + if app.gaming_details_open { GAMING_DETAIL_EXTRA } else { 0.0 }
}

/// Label, text colour and pill background for a DNS latency.
struct LatencyStatus {
    label: &'static str,
    color: Color,
    background: Color,
}

fn latency_status(latency_ms: f64, ctx: &Ctx) -> LatencyStatus {
    let (p, tr) = (ctx.p, ctx.tr);
    let dark = p.is_dark();
    let tint = |dark_bg: u32, light_bg: u32| if dark { rgba(dark_bg, 0.15) } else { rgba(light_bg, 0.10) };
    let pick = |dark_color: u32, light_color: u32| if dark { rgb(dark_color) } else { rgb(light_color) };

    if latency_ms < 0.0 {
        LatencyStatus { label: tr.t("dns_status_expired"), color: p.text_muted, background: tint(0x64748b, 0x64748b) }
    } else if latency_ms < 50.0 {
        LatencyStatus { label: tr.t("dns_status_excellent"), color: p.green.text, background: tint(0x00ff9d, 0x00804c) }
    } else if latency_ms < 100.0 {
        LatencyStatus { label: tr.t("dns_status_good"), color: pick(0xd4ff66, 0x5f7000), background: tint(0xbfff00, 0x5f7000) }
    } else if latency_ms < 200.0 {
        LatencyStatus { label: tr.t("dns_status_fair"), color: pick(0xff9a76, 0xc2410c), background: tint(0xff6b35, 0xc2410c) }
    } else {
        LatencyStatus { label: tr.t("dns_status_critical"), color: pick(0xff6b6b, 0xdc2626), background: tint(0xff3333, 0xdc2626) }
    }
}

fn status_title(latency_ms: f64, ctx: &Ctx) -> &'static str {
    ctx.tr.t(if latency_ms < 0.0 {
        "dns_status_lost"
    } else if latency_ms < 50.0 {
        "dns_status_excellent_title"
    } else if latency_ms < 100.0 {
        "dns_status_good_title"
    } else if latency_ms < 200.0 {
        "dns_status_fair_title"
    } else {
        "dns_status_critical_title"
    })
}

fn status_pill<'a>(status: &LatencyStatus, size: f32, radius: f32) -> Element<'a, Message> {
    let background = status.background;
    container(text(status.label.to_uppercase()).size(size).font(GEIST_BOLD).color(status.color))
        .padding(Padding::from([4, 8]))
        .style(move |_| container::Style {
            background: Some(background.into()),
            border: iced::border::rounded(radius),
            ..container::Style::default()
        })
        .into()
}

fn latency_text<'a>(latency_ms: f64, value_size: f32, unit_size: f32, color: Color) -> Element<'a, Message> {
    let value = if latency_ms < 0.0 { "---".to_string() } else { format!("{latency_ms:.0}") };
    row![
        text(value).size(value_size).font(MONO_BOLD).color(color),
        text("ms").size(unit_size).font(MONO_BOLD).color(color),
    ]
    .spacing(4)
    .align_y(iced::Bottom)
    .into()
}

/// Surface of a server entry; the fastest one is tinted green.
fn server_style(is_best: bool, radius: f32, ctx: &Ctx) -> container::Style {
    let p = ctx.p;
    if !is_best {
        return inset_style(&p, radius);
    }
    let green = p.green.fill;
    container::Style {
        background: Some(if p.is_dark() { alpha(green, 0.05) } else { rgb(0xd1fae5) }.into()),
        border: Border {
            color: if p.is_dark() { alpha(green, 0.30) } else { rgb(0x6ee7b7) },
            width: 1.0,
            radius: radius.into(),
        },
        shadow: Shadow { color: alpha(green, 0.12), offset: [0.0, 0.0].into(), blur_radius: 12.0 },
        ..container::Style::default()
    }
}

/// One line per server, used when four or more are compared.
fn compact_server<'a>(dns: &DnsResult, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let status = latency_status(dns.latency_ms, ctx);
    let is_best = dns.is_best;
    let ctx = *ctx;

    let mut identity = row![].spacing(8).align_y(iced::Center).width(Fill);
    if is_best {
        identity = identity.push(icon(Icon::Crown, 12.0, p.warning.text));
    }
    identity = identity.push(
        column![
            text(dns.server_name.clone()).size(12).font(GEIST_SEMIBOLD).color(p.foreground),
            text(dns.ip.clone()).size(9).font(MONO).color(p.text_subtle),
        ]
        .spacing(4),
    );

    container(
        row![identity, latency_text(dns.latency_ms, 14.0, 10.0, status.color), status_pill(&status, 8.0, 4.0)]
            .spacing(8)
            .align_y(iced::Center),
    )
    .padding(Padding::from([6, 12]))
    .width(Fill)
    .style(move |_| server_style(is_best, 12.0, &ctx))
    .into()
}

/// Roomier tile, used for up to three servers and in the expanded view.
fn server_tile<'a>(dns: &DnsResult, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let status = latency_status(dns.latency_ms, ctx);
    let is_best = dns.is_best;
    let ctx = *ctx;

    let mut title = row![text(dns.server_name.clone()).size(14).font(GEIST_SEMIBOLD).color(p.foreground).width(Fill)]
        .align_y(iced::Center);
    if is_best {
        let amber = p.warning.fill;
        title = title.push(
            container(icon(Icon::Crown, 12.0, p.warning.text))
                .center_x(24)
                .center_y(24)
                .style(move |_| container::Style {
                    background: Some(alpha(amber, 0.20).into()),
                    border: Border { color: alpha(amber, 0.30), width: 1.0, radius: 12.0.into() },
                    ..container::Style::default()
                }),
        );
    }

    container(
        column![
            title,
            text(dns.ip.clone()).size(10).font(MONO).color(p.text_muted),
            Space::new().height(8),
            latency_text(dns.latency_ms, 24.0, 12.0, status.color),
            status_pill(&status, 10.0, 8.0),
        ]
        .spacing(4),
    )
    .padding(16)
    .width(180)
    .style(move |_| server_style(is_best, 16.0, &ctx))
    .into()
}

/// Rows of `columns` equal cells; an incomplete last row is centred.
fn grid<'a>(items: Vec<Element<'a, Message>>, columns: usize, spacing: f32) -> Element<'a, Message> {
    let mut rows = column![].spacing(spacing).width(Fill);
    let mut items = items.into_iter().peekable();

    while items.peek().is_some() {
        let cells: Vec<Element<'a, Message>> = items.by_ref().take(columns).collect();
        let missing = (columns - cells.len()) as u16;

        let mut line = row![].spacing(spacing);
        if missing > 0 {
            line = line.push(Space::new().width(FillPortion(missing)));
        }
        for cell in cells {
            line = line.push(container(cell).width(FillPortion(2)));
        }
        if missing > 0 {
            line = line.push(Space::new().width(FillPortion(missing)));
        }
        rows = rows.push(line);
    }

    rows.into()
}

fn server_list<'a>(app: &'a App, ctx: &Ctx, expanded: bool) -> Element<'a, Message> {
    let results = &app.dns_results;
    let compact = !expanded && results.len() > 3;

    if results.is_empty() {
        let label = if app.dns_attempted { "dns_err_desc" } else { "dns_measuring" };
        return container(text(ctx.tr.t(label)).size(13).color(ctx.p.text_muted)).center_x(Fill).into();
    }

    if compact {
        let columns = if results.len() >= 5 { 3 } else { 2 };
        grid(results.iter().map(|dns| compact_server(dns, ctx)).collect(), columns, 8.0)
    } else {
        let tiles = results.iter().map(|dns| server_tile(dns, ctx));
        container(row(tiles).spacing(16).wrap().vertical_spacing(16)).center_x(Fill).into()
    }
}

// --- gaming latency ---------------------------------------------------------

struct VerdictStyle {
    color: Color,
    text: Color,
    badge_background: Color,
    badge_border: Color,
}

fn verdict_style(verdict: &str, ctx: &Ctx) -> VerdictStyle {
    let p = ctx.p;
    let tone = |color: Color, text: Color| VerdictStyle {
        color,
        text,
        badge_background: alpha(color, 0.20),
        badge_border: alpha(color, 0.50),
    };
    match verdict {
        "ready" => tone(p.green.fill, p.green.text),
        "marginal" => tone(rgb(0xfbbf24), if p.is_dark() { rgb(0xfde68a) } else { rgb(0x92400e) }),
        "local_issue" | "local_network" => tone(rgb(0xfb923c), if p.is_dark() { rgb(0xfdba74) } else { rgb(0x9a3412) }),
        "offline" | "internet_unreachable" | "high_latency" => {
            tone(rgb(0xf87171), if p.is_dark() { rgb(0xfca5a5) } else { rgb(0x991b1b) })
        }
        _ => VerdictStyle {
            color: p.green.fill,
            text: p.text_muted,
            badge_background: alpha(p.green.fill, 0.12),
            badge_border: alpha(p.green.fill, 0.30),
        },
    }
}

pub fn verdict_label(verdict: &str, ctx: &Ctx) -> String {
    let key = match verdict {
        "ready" => "verdict_ready",
        "marginal" => "verdict_marginal",
        "measuring" => "verdict_measuring",
        "local_issue" => "verdict_local_issue",
        "local_network" => "verdict_local_network",
        "offline" => "verdict_offline",
        "internet_unreachable" => "verdict_internet_unreachable",
        "high_latency" => "verdict_high_latency",
        other => return other.to_string(),
    };
    ctx.tr.t(key).to_string()
}

/// Five rising bars, filled according to the latency (120 ms empties them).
fn signal_bars<'a>(latency_ms: f64, measuring: bool, color: Color, compact: bool, ctx: &Ctx) -> Element<'a, Message> {
    let percent = if latency_ms < 0.0 { 0.0 } else { (100.0 - latency_ms / 120.0 * 100.0).clamp(8.0, 100.0) };
    let active = if measuring || percent <= 0.0 { 0 } else { ((percent / 100.0 * 5.0).ceil() as usize).max(1) };
    let (height, width) = if compact { (10.0, 2.0) } else { (12.0, 2.5) };
    let track = ctx.p.ring_track;

    let bars = [0.45f32, 0.6, 0.75, 0.88, 1.0].into_iter().enumerate().map(|(index, ratio)| {
        // Inactive bars stay visible on the dark trough, dimmer still while measuring.
        let fill = if index < active { color } else { alpha(track, track.a.max(0.14) * if measuring { 0.6 } else { 1.0 }) };
        container(Space::new())
            .width(width)
            .height((height * ratio).round().max(2.0))
            .style(move |_| container::Style {
                background: Some(fill.into()),
                border: iced::border::rounded(1),
                ..container::Style::default()
            })
            .into()
    });

    row(bars).spacing(2).align_y(iced::Bottom).height(height).into()
}

fn band_panel<'a>(
    content: impl Into<Element<'a, Message>>,
    border_tint: Option<Color>,
    compact: bool,
    ctx: &Ctx,
) -> Element<'a, Message> {
    let p = ctx.p;
    container(content)
        .padding(if compact { Padding::from([10, 12]) } else { Padding::from(16) })
        .width(Fill)
        .style(move |_| {
            let mut style = inset_style(&p, if compact { 12.0 } else { 16.0 });
            if let Some(tint) = border_tint {
                style.border.color = mix(alpha(tint, 1.0), p.border, 0.30);
            }
            style
        })
        .into()
}

/// "Via Cloudflare" and "In game" twin panels under the server list.
fn via_band<'a>(app: &'a App, ctx: &Ctx, compact: bool) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let best = app.dns_results.iter().find(|d| d.is_best).or(app.dns_results.first());
    let gaming = &app.gaming;

    let (label_size, subtitle_size, value_size, unit_size, icon_size, pill_size) =
        if compact { (10.0, 11.0, 14.0, 10.0, 16.0, 8.0) } else { (12.0, 14.0, 24.0, 12.0, 20.0, 10.0) };

    // Resolver
    let status = match best {
        Some(dns) => latency_status(dns.latency_ms, ctx),
        None => LatencyStatus {
            label: tr.t("dns_status_pending"),
            color: p.text_muted,
            background: rgba(0x64748b, if p.is_dark() { 0.15 } else { 0.10 }),
        },
    };
    let resolver_label = best.map(|dns| format!("Via {}", dns.server_name)).unwrap_or_else(|| tr.t("dns_resolver_label").to_string());
    let resolver_title = best.map(|dns| status_title(dns.latency_ms, ctx)).unwrap_or_else(|| tr.t("dns_status_waiting"));

    let resolver = band_panel(
        row![
            icon(Icon::Signal, icon_size, status.color),
            column![
                text(resolver_label.to_uppercase()).size(label_size).font(GEIST_BOLD).color(p.text_subtle),
                text(resolver_title).size(subtitle_size).font(GEIST_SEMIBOLD).color(status.color),
            ]
            .spacing(2)
            .width(Fill),
            latency_text(best.map(|dns| dns.latency_ms).unwrap_or(-1.0), value_size, unit_size, status.color),
            status_pill(&status, pill_size, 4.0),
        ]
        .spacing(8)
        .align_y(iced::Center),
        best.map(|_| p.green.fill),
        compact,
        ctx,
    );

    // Gaming latency
    let style = verdict_style(&gaming.verdict, ctx);
    let measuring = gaming.verdict == "measuring";
    let badge_glow = if app.gaming_details_open { 0.35 } else { 0.0 };
    let (badge_color, badge_background, badge_border) = (style.color, style.badge_background, style.badge_border);

    let badge = button(text(verdict_label(&gaming.verdict, ctx).to_uppercase()).size(pill_size).font(GEIST_BOLD).color(badge_color))
        .padding(Padding::from([2, 8]))
        .on_press(Message::ToggleGamingDetails)
        .style(move |_, status| button::Style {
            background: Some(
                match status {
                    button::Status::Hovered | button::Status::Pressed => alpha(badge_color, 0.30),
                    _ => badge_background,
                }
                .into(),
            ),
            border: Border { color: badge_border, width: 1.0, radius: 8.0.into() },
            shadow: Shadow { color: alpha(badge_color, badge_glow), offset: [0.0, 0.0].into(), blur_radius: 12.0 },
            ..button::Style::default()
        });

    let in_game = band_panel(
        row![
            icon(Icon::Gamepad, icon_size, style.color),
            signal_bars(gaming.internet_ms, measuring, style.color, compact, ctx),
            column![
                text(tr.t("gaming_label").to_uppercase()).size(label_size).font(GEIST_BOLD).color(p.text_subtle),
                row![
                    text(tr.t(if measuring { "gaming_listening_line" } else { "gaming_ping_direct" }))
                        .size(subtitle_size)
                        .font(GEIST_SEMIBOLD)
                        .color(style.text),
                    badge,
                ]
                .spacing(6)
                .align_y(iced::Center),
            ]
            .spacing(2)
            .width(Fill),
            latency_text(gaming.internet_ms, value_size, unit_size, style.text),
        ]
        .spacing(8)
        .align_y(iced::Center),
        Some(style.color),
        compact,
        ctx,
    );

    row![resolver, in_game].spacing(12).into()
}

fn metric_tone(ms: f64, kind: &str, sample_count: u32, ctx: &Ctx) -> Color {
    let p = ctx.p;
    if ms < 0.0 || (kind == "jitter" && sample_count < 2) {
        p.text_muted
    } else if kind == "gateway" && ms > 25.0 {
        rgb(0xfb923c)
    } else if kind == "internet" && ms > 100.0 {
        rgb(0xf87171)
    } else if (kind == "internet" && ms > 60.0) || (kind == "jitter" && ms > 20.0) {
        rgb(0xfbbf24)
    } else {
        p.green.text
    }
}

fn metric_column<'a>(glyph: Icon, label: &str, target: String, value: String, tone: Color, ctx: &Ctx) -> Element<'a, Message> {
    column![
        row![icon(glyph, 13.0, tone), text(label.to_uppercase()).size(10).font(GEIST_BOLD).color(tone)]
            .spacing(6)
            .align_y(iced::Center),
        text(target).size(11).font(MONO).color(ctx.p.text_muted),
        text(value).size(16).font(MONO_BOLD).color(tone),
    ]
    .spacing(4)
    .align_x(iced::Center)
    .width(Fill)
    .into()
}

/// Gateway / internet / jitter detail, opened from the verdict badge.
fn gaming_breakdown<'a>(gaming: &GamingLatencySnapshot, ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);

    let reading = |ms: f64| if ms < 0.0 { "—".to_string() } else { format!("{ms:.0} ms") };
    let jitter = if gaming.sample_count < 2 { "—".to_string() } else { format!("{:.1} ms", gaming.jitter_ms) };
    let gateway_target = if gaming.gateway_ip.trim().is_empty() { tr.t("gaming_auto_detect").to_string() } else { gaming.gateway_ip.clone() };
    let internet_target = if gaming.internet_host.is_empty() { "1.1.1.1".to_string() } else { gaming.internet_host.clone() };

    let divider = || rule::vertical(1).style(move |_| rule::Style { color: p.border, radius: 0.0.into(), fill_mode: rule::FillMode::Full, snap: true });

    let close = button(
        row![icon(Icon::X, 14.0, p.text_muted), text(tr.t("gaming_close")).size(12).font(GEIST_SEMIBOLD).color(p.text_muted)]
            .spacing(6)
            .align_y(iced::Center),
    )
    .padding(Padding::from([6, 10]))
    .on_press(Message::ToggleGamingDetails)
    .style(move |_, status| button::Style {
        background: None,
        border: Border {
            color: if matches!(status, button::Status::Hovered) { p.green.fill } else { p.border },
            width: 1.0,
            radius: 12.0.into(),
        },
        ..button::Style::default()
    });

    container(
        column![
            row![
                column![
                    caption(tr.t("gaming_test_title"), ctx),
                    text(verdict_label(&gaming.verdict, ctx)).size(14).font(GEIST_SEMIBOLD).color(p.foreground),
                ]
                .spacing(2)
                .width(Fill),
                close,
            ]
            .align_y(iced::Center),
            container(
                row![
                    metric_column(Icon::Router, tr.t("gaming_gateway"), gateway_target, reading(gaming.gateway_ms), metric_tone(gaming.gateway_ms, "gateway", 0, ctx), ctx),
                    divider(),
                    metric_column(Icon::Globe, tr.t("gaming_internet"), internet_target, reading(gaming.internet_ms), metric_tone(gaming.internet_ms, "internet", 0, ctx), ctx),
                    divider(),
                    metric_column(
                        Icon::Activity,
                        tr.t("gaming_jitter"),
                        tr.tf("gaming_samples", &[("count", &15)]),
                        jitter,
                        metric_tone(gaming.jitter_ms, "jitter", gaming.sample_count, ctx),
                        ctx,
                    ),
                ]
                .spacing(12)
                .height(iced::Shrink),
            )
            .padding(12)
            .style(move |_| container::Style {
                border: Border { color: p.border, width: 1.0, radius: 12.0.into() },
                ..container::Style::default()
            }),
        ]
        .spacing(12),
    )
    .padding(12)
    .width(Fill)
    .style(move |_| {
        let mut style = inset_style(&p, 16.0);
        style.border.color = mix(p.green.fill, p.border, 0.35);
        style
    })
    .into()
}

// --- card -------------------------------------------------------------------

/// "Test auto", "1 serveur", "Tous les serveurs"…
fn test_mode_label(app: &App, ctx: &Ctx) -> String {
    let checklist = &app.settings.dns_checklist;
    if is_auto_checklist(checklist) {
        ctx.tr.t("dns_mode_auto").to_string()
    } else if checklist.len() == POPULAR_DNS_SERVERS.len() {
        ctx.tr.t("dns_mode_all").to_string()
    } else if checklist.len() == 1 {
        ctx.tr.t("dns_mode_one").to_string()
    } else {
        ctx.tr.tf("dns_mode_count", &[("count", &checklist.len())])
    }
}

/// The four recommended servers, in any order.
pub fn is_auto_checklist(checklist: &[String]) -> bool {
    let default = default_dns_checklist();
    checklist.len() == default.len() && default.iter().all(|name| checklist.contains(name))
}

/// 44 px outlined button used in the headers of the DNS and drivers cards.
pub fn header_button<'a>(
    glyph: Icon,
    label: Option<&'a str>,
    active: bool,
    busy: bool,
    message: Option<Message>,
    neon: crate::theme::Neon,
    ctx: &Ctx,
) -> Element<'a, Message> {
    let p = ctx.p;
    let tint = if active { neon.text } else { p.foreground };
    let mut content = row![icon(if busy { Icon::Loader } else { glyph }, if label.is_some() { 16.0 } else { 18.0 }, if active { neon.text } else { p.text_muted })]
        .spacing(8)
        .align_y(iced::Center);
    if let Some(label) = label {
        content = content.push(text(label).size(13).font(GEIST_SEMIBOLD).color(tint));
    }

    button(container(content).center_y(Fill))
        .height(44)
        .padding(Padding::from([0, if label.is_some() { 14 } else { 12 }]))
        .on_press_maybe(if busy { None } else { message })
        .style(move |_, status| {
            let hovered = matches!(status, button::Status::Hovered | button::Status::Pressed);
            button::Style {
                background: Some(
                    if active {
                        alpha(neon.fill, 0.15)
                    } else if hovered {
                        p.surface_muted
                    } else {
                        p.surface_inset
                    }
                    .into(),
                ),
                border: Border {
                    color: if active { alpha(neon.fill, 0.40) } else if hovered { alpha(neon.fill, 0.30) } else { p.border },
                    width: 1.0,
                    radius: 12.0.into(),
                },
                shadow: if active { Shadow { color: alpha(neon.fill, 0.12), offset: [0.0, 0.0].into(), blur_radius: 12.0 } } else { Shadow::default() },
                ..button::Style::default()
            }
        })
        .into()
}

pub fn card<'a>(app: &'a App, ctx: &Ctx, expanded: bool) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let compact = !expanded && app.dns_results.len() > 3;
    let auto = is_auto_checklist(&app.settings.dns_checklist);

    let subtitle = if auto {
        tr.t("dns_widget_subtitle_auto").to_string()
    } else {
        tr.tf("dns_widget_subtitle_custom", &[("label", &test_mode_label(app, ctx))])
    };

    let header = row![
        icon_tile(Icon::Wifi, p.green.fill),
        column![
            text(tr.t("dns_widget_title")).size(16).font(GEIST_SEMIBOLD).color(p.foreground),
            text(subtitle).size(12).color(p.text_muted),
        ]
        .spacing(4)
        .width(Fill),
        header_button(Icon::Signal, Some(tr.t("dns_btn_auto_test")), auto, app.dns_pinging, Some(Message::DnsAutoTest), p.green, ctx),
        header_button(Icon::Settings2, Some(tr.t("dns_customize")), false, false, Some(Message::OpenSettings(Some(SettingsTab::Network))), p.green, ctx),
        header_button(
            if expanded { Icon::Minimize } else { Icon::Maximize },
            None,
            false,
            false,
            Some(Message::Expand(if expanded { None } else { Some(Expanded::Dns) })),
            p.green,
            ctx,
        ),
    ]
    .spacing(8)
    .align_y(iced::Center);

    let mut footer = column![
        rule::horizontal(1).style(move |_| rule::Style { color: p.border, radius: 0.0.into(), fill_mode: rule::FillMode::Full, snap: true }),
        via_band(app, ctx, compact),
    ]
    .spacing(12);
    if app.gaming_details_open {
        footer = footer.push(gaming_breakdown(&app.gaming, ctx));
    }

    let list = server_list(app, ctx, expanded);
    let body: Element<'a, Message> = if expanded {
        column![list, footer].spacing(16).into()
    } else {
        column![container(list).center_y(Fill), footer].spacing(8).height(Fill).into()
    };

    let card = kit::card(column![header, body].spacing(16), ctx).width(Fill);
    if expanded { card.into() } else { card.height(Fill).into() }
}
