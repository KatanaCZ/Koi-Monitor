//! Layers above the page: status toast, notification log, alert onboarding.

use iced::widget::{button, column, container, row, scrollable, text, Column, Space};
use iced::{Border, Color, Element, Fill, Padding, Shadow};
use std::time::Instant;

use super::icons::{icon, Icon};
use super::kit::Ctx;
use crate::alerts::Severity;
use crate::app::{App, Message};
use crate::gfx::glass::glass;
use crate::gfx::Surface;
use crate::notify::{relative_time, Entry, Source, Toast};
use crate::theme::{alpha, mix, Neon, GEIST_BOLD, GEIST_MEDIUM, GEIST_SEMIBOLD};

fn severity_neon(severity: Severity, ctx: &Ctx) -> Neon {
    match severity {
        Severity::Success => ctx.p.green,
        Severity::Warning => ctx.p.warning,
        Severity::Error => ctx.p.error,
    }
}

/// Tinted pill used by every toast (`toastToneClass`). The text colour is in `text_color`.
pub fn toast_style(severity: Severity, ctx: &Ctx) -> container::Style {
    let neon = severity_neon(severity, ctx);
    container::Style {
        text_color: Some(neon.text),
        // Over the card colour rather than transparent: the toast floats above busy content.
        background: Some(mix(neon.fill, ctx.p.card_solid, 0.15).into()),
        border: Border { color: alpha(neon.fill, 0.40), width: 1.0, radius: 12.0.into() },
        shadow: Shadow { color: Color { a: 0.35, ..Color::BLACK }, offset: [0.0, 8.0].into(), blur_radius: 20.0 },
        ..container::Style::default()
    }
}

/// Message at the bottom of the window. Alerts are clickable and open the log.
pub fn status_toast<'a>(toast: &'a Toast, ctx: &Ctx) -> Element<'a, Message> {
    let style = toast_style(toast.severity, ctx);
    let color = style.text_color.unwrap_or(ctx.p.foreground);
    let pill = container(text(&toast.message).size(14).font(GEIST_MEDIUM).color(color))
        .padding(Padding::from([12, 20]))
        .style(move |_| style);

    let content: Element<'a, Message> = if toast.source == Source::Alert {
        button(pill).padding(0).on_press(Message::ToggleNotifications).style(|_, _| button::Style::default()).into()
    } else {
        pill.into()
    };

    container(content).center_x(Fill).align_bottom(Fill).padding(Padding { bottom: 24.0, ..Padding::ZERO }).into()
}

fn log_entry<'a>(entry: &'a Entry, now: Instant, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let neon = severity_neon(entry.severity, ctx);
    let fade = if entry.read { 0.8 } else { 1.0 };

    let dot = container(Space::new()).width(8).height(8).style(move |_| container::Style {
        background: Some(neon.fill.into()),
        border: iced::border::rounded(4),
        ..container::Style::default()
    });

    let mut meta = row![].spacing(8).align_y(iced::Center);
    if entry.source == Source::Alert {
        meta = meta.push(text(ctx.tr.t("notif_source_alert").to_uppercase()).size(9).font(GEIST_BOLD).color(p.green.text));
    }
    meta = meta.push(text(relative_time(entry.created, now, ctx.tr)).size(10).color(p.text_subtle));

    container(
        row![
            column![Space::new().height(5), dot],
            column![meta, text(&entry.message).size(14).font(GEIST_MEDIUM).color(alpha(neon.text, fade))].spacing(4).width(Fill),
        ]
        .spacing(8),
    )
    .padding(Padding::from([10, 12]))
    .width(Fill)
    .style(move |_| container::Style {
        background: Some(alpha(neon.fill, 0.10 * fade).into()),
        border: Border { color: alpha(neon.fill, 0.35 * fade), width: 1.0, radius: 12.0.into() },
        ..container::Style::default()
    })
    .into()
}

fn quiet_button<'a>(glyph: Icon, message: Message, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    button(container(icon(glyph, 14.0, p.text_muted)).center_x(Fill).center_y(Fill))
        .width(44)
        .height(44)
        .padding(0)
        .on_press(message)
        .style(move |_, status| button::Style {
            background: matches!(status, button::Status::Hovered).then_some(p.surface_muted.into()),
            border: iced::border::rounded(8),
            ..button::Style::default()
        })
        .into()
}

/// The session log, anchored under the bell.
pub fn notification_panel<'a>(app: &'a App, ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let log = &app.notifications.log;
    let now = Instant::now();
    let green = p.green;

    let mut actions = row![].spacing(4);
    if !log.is_empty() {
        actions = actions.push(quiet_button(Icon::Trash, Message::ClearNotifications, ctx));
    }
    actions = actions.push(quiet_button(Icon::X, Message::ToggleNotifications, ctx));

    let header = row![
        container(icon(Icon::Bell, 14.0, green.text)).center_x(32).center_y(32).style(move |_| container::Style {
            background: Some(alpha(green.fill, 0.14).into()),
            border: Border { color: alpha(green.fill, 0.28), width: 1.0, radius: 12.0.into() },
            ..container::Style::default()
        }),
        column![
            text(tr.t("notif_panel_title")).size(14).font(GEIST_SEMIBOLD).color(p.foreground),
            text(tr.t("notif_panel_subtitle")).size(10).color(p.text_subtle),
        ]
        .spacing(2)
        .width(Fill),
        actions,
    ]
    .spacing(8)
    .align_y(iced::Center)
    .padding(Padding { top: 12.0, right: 8.0, bottom: 12.0, left: 16.0 });

    let body: Element<'a, Message> = if log.is_empty() {
        container(
            column![
                text(tr.t("notif_empty_title")).size(14).color(p.text_muted),
                text(tr.t("notif_empty_desc")).size(12).color(p.text_subtle).center(),
            ]
            .spacing(4)
            .align_x(iced::Center),
        )
        .center_x(Fill)
        .padding(Padding::from([32, 12]))
        .into()
    } else {
        scrollable(Column::with_children(log.iter().map(|entry| log_entry(entry, now, ctx))).spacing(8).padding(8))
            .direction(scrollable::Direction::Vertical(scrollable::Scrollbar::new().width(6).scroller_width(6).margin(2)))
            .into()
    };

    let border = p.border;
    let panel = glass(
        column![
            header,
            iced::widget::rule::horizontal(1).style(move |_| iced::widget::rule::Style {
                color: border,
                radius: 0.0.into(),
                fill_mode: iced::widget::rule::FillMode::Full,
                snap: true,
            }),
            body,
        ],
        ctx.atmosphere,
    )
    .surface(Surface::Dialog)
    .radius(16.0)
    .width(320);

    // Below the title bar, aligned with its right edge. Clicks inside stay in the panel.
    container(iced::widget::opaque(container(panel).max_height(352)))
        .align_right(Fill)
        .padding(Padding { top: 88.0, right: 32.0, bottom: 0.0, left: 0.0 })
        .into()
}

/// First-launch offer to enable Koi watch.
pub fn alert_onboarding<'a>(ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let green = p.green;

    let enable = button(container(text(tr.t("onboarding_enable")).size(14).font(GEIST_SEMIBOLD).color(crate::theme::rgb(0x04140e))).center_x(Fill))
        .width(Fill)
        .padding(Padding::from([12, 20]))
        .on_press(Message::AlertOnboarding(true))
        .style(move |_, status| button::Style {
            background: Some(alpha(green.fill, if matches!(status, button::Status::Hovered) { 0.92 } else { 1.0 }).into()),
            border: iced::border::rounded(16),
            shadow: Shadow { color: alpha(green.fill, 0.25), offset: [0.0, 6.0].into(), blur_radius: 16.0 },
            ..button::Style::default()
        });

    let decline = button(container(text(tr.t("onboarding_decline")).size(14).font(GEIST_MEDIUM).color(p.foreground)).center_x(Fill))
        .width(Fill)
        .padding(Padding::from([12, 20]))
        .on_press(Message::AlertOnboarding(false))
        .style(move |_, status| button::Style {
            background: matches!(status, button::Status::Hovered).then_some(p.surface_muted.into()),
            border: Border { color: p.border_strong, width: 1.0, radius: 16.0.into() },
            ..button::Style::default()
        });

    glass(
        column![
            row![
                container(icon(Icon::Bell, 22.0, green.text)).center_x(48).center_y(48).style(move |_| container::Style {
                    background: Some(alpha(green.fill, 0.18).into()),
                    border: Border { color: alpha(green.fill, 0.35), width: 1.0, radius: 16.0.into() },
                    ..container::Style::default()
                }),
                column![
                    text(tr.t("onboarding_badge").to_uppercase()).size(12).font(GEIST_MEDIUM).color(green.text),
                    text(tr.t("onboarding_title")).size(20).font(GEIST_SEMIBOLD).color(p.foreground),
                ]
                .spacing(2)
                .width(Fill),
                quiet_button(Icon::X, Message::AlertOnboarding(false), ctx),
            ]
            .spacing(12)
            .align_y(iced::Center),
            text(tr.t("onboarding_desc")).size(14).color(p.text_muted).line_height(1.6),
            Space::new().height(4),
            row![enable, decline].spacing(12),
        ]
        .spacing(20),
        ctx.atmosphere,
    )
    .surface(Surface::Dialog)
    .radius(32.0)
    .padding(32)
    .width(512)
    .into()
}
