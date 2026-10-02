//! Shared building blocks of the interface: cards, headers, badges, buttons.

use iced::widget::{button, column, container, row, text, tooltip, Space};
use iced::{border, gradient, Background, Border, Color, Element, Fill, Padding, Radians, Shadow};

use super::icons::{icon, Icon};
use crate::gfx::glass::{glass, Glass};
use crate::gfx::{Atmosphere, Surface};
use crate::i18n::Tr;
use crate::settings::NeonGlow;
use crate::theme::{alpha, mix, Neon, Palette, GEIST_BOLD, GEIST_MEDIUM, GEIST_SEMIBOLD, MONO, MONO_BOLD};

/// What every view function needs to draw itself.
#[derive(Debug, Clone, Copy)]
pub struct Ctx {
    pub p: Palette,
    pub tr: Tr,
    pub atmosphere: Atmosphere,
    /// UI accent, from the Sakura tint.
    pub accent: Neon,
    pub glow: NeonGlow,
}

pub const CARD_PADDING: f32 = 24.0;
pub const CARD_RADIUS: f32 = 32.0;
pub const GAP: f32 = 24.0;

/// Dashboard card (`.bento-card`): frosted glass, 24 px padding.
pub fn card<'a, Message: 'a>(content: impl Into<Element<'a, Message>>, ctx: &Ctx) -> Glass<'a, Message> {
    glass(content, ctx.atmosphere).radius(CARD_RADIUS).padding(CARD_PADDING)
}

/// Floating panel (`.liquid-glass`).
pub fn panel<'a, Message: 'a>(content: impl Into<Element<'a, Message>>, ctx: &Ctx) -> Glass<'a, Message> {
    glass(content, ctx.atmosphere).surface(Surface::Panel).radius(16.0)
}

/// Rounded surface sunk into a card (`bg-[var(--surface-inset)] border`).
pub fn inset_style(p: &Palette, radius: f32) -> container::Style {
    container::Style {
        background: Some(p.surface_inset.into()),
        border: Border { color: p.border, width: 1.0, radius: radius.into() },
        ..container::Style::default()
    }
}

/// Small uppercase label above a value (`text-[10px] uppercase font-bold tracking-widest`).
pub fn caption<'a>(label: &str, ctx: &Ctx) -> iced::widget::Text<'a> {
    text(label.to_uppercase()).size(10).font(GEIST_BOLD).color(ctx.p.text_subtle)
}

/// Label + value tile at the bottom of a metric card.
pub fn detail_tile<'a, Message: 'a>(
    label: &str,
    value: impl Into<Element<'a, Message>>,
    ctx: &Ctx,
) -> Element<'a, Message> {
    let p = ctx.p;
    container(column![caption(label, ctx), value.into()].spacing(8))
        .padding(16)
        .width(Fill)
        .style(move |_| inset_style(&p, 16.0))
        .into()
}

/// Data value in the mono face.
pub fn mono<'a>(value: impl text::IntoFragment<'a>, size: f32, color: Color) -> iced::widget::Text<'a> {
    text(value).size(size).font(MONO).color(color)
}

/// 40 px rounded tile with the widget's icon on a gradient of its colour.
pub fn icon_tile<'a, Message: 'a>(glyph: Icon, color: Color) -> Element<'a, Message> {
    let fill = gradient::Linear::new(Radians(std::f32::consts::FRAC_PI_4 * 3.0))
        .add_stop(0.0, color)
        .add_stop(1.0, alpha(color, 0.5));

    container(icon(glyph, 20.0, Color::WHITE))
        .center_x(40)
        .center_y(40)
        .style(move |_| container::Style {
            background: Some(Background::Gradient(fill.into())),
            border: border::rounded(12),
            shadow: Shadow { color: Color { a: 0.25, ..Color::BLACK }, offset: [0.0, 4.0].into(), blur_radius: 10.0 },
            ..container::Style::default()
        })
        .into()
}

/// Pill showing the headline figure of a card (`MetricPercentBadge`).
pub fn badge<'a, Message: 'a>(value: String, neon: Neon, ctx: &Ctx) -> Element<'a, Message> {
    let glow = crate::theme::neon_glow_alpha(ctx.glow, ctx.p.is_dark());

    container(text(value).size(18).font(MONO_BOLD).color(neon.text))
        .padding(Padding::from([8, 16]))
        .center_x(iced::Shrink)
        .style(move |_| container::Style {
            background: Some(alpha(neon.fill, 0.15).into()),
            border: Border { color: alpha(neon.fill, 0.30), width: 1.0, radius: 999.0.into() },
            // The halo stands in for the CSS neon text-shadow.
            shadow: Shadow { color: alpha(neon.fill, glow), offset: [0.0, 0.0].into(), blur_radius: 14.0 },
            ..container::Style::default()
        })
        .into()
}

/// Icon, title and subtitle on the left, optional badges on the right (`WidgetMetricHeader`).
pub fn header<'a, Message: 'a>(
    glyph: Icon,
    label: &'a str,
    subtitle: Option<String>,
    neon: Neon,
    trailing: Option<Element<'a, Message>>,
    ctx: &Ctx,
) -> Element<'a, Message> {
    let mut titles = column![text(label).size(16).font(GEIST_SEMIBOLD).color(ctx.p.foreground)].spacing(4).width(Fill);
    if let Some(subtitle) = subtitle {
        titles = titles.push(text(subtitle).size(12).color(ctx.p.text_muted));
    }

    let mut header = row![icon_tile(glyph, neon.fill), titles].spacing(8).align_y(iced::Center);
    if let Some(trailing) = trailing {
        header = header.push(Space::new().width(8)).push(trailing);
    }
    header.into()
}

/// Dark rounded hint shown under a hovered control.
pub fn hint<'a, Message: 'a>(
    content: impl Into<Element<'a, Message>>,
    label: &'a str,
    ctx: &Ctx,
) -> Element<'a, Message> {
    let p = ctx.p;
    tooltip(
        content,
        container(text(label).size(12).font(GEIST_MEDIUM).color(p.foreground))
            .padding(Padding::from([6, 10]))
            .style(move |_| container::Style {
                background: Some(Color { a: 0.97, ..p.card_solid }.into()),
                border: Border { color: p.border_strong, width: 1.0, radius: 8.0.into() },
                shadow: Shadow { color: Color { a: 0.35, ..Color::BLACK }, offset: [0.0, 6.0].into(), blur_radius: 16.0 },
                ..container::Style::default()
            }),
        tooltip::Position::Bottom,
    )
    .gap(8)
    .into()
}

/// How a title-bar button is drawn when idle.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Emphasis {
    /// Muted icon, background only on hover.
    Quiet,
    /// Tinted background and icon: the feature is on.
    Tinted(Neon),
    /// Filled with the colour (Zen mode active).
    Filled(Color),
    /// Quiet, but hovering turns it red (close).
    Danger,
}

/// 44 px square icon button of the title bar.
pub fn icon_button<'a, Message: Clone + 'a>(
    glyph: Icon,
    size: f32,
    emphasis: Emphasis,
    message: Message,
    label: &'a str,
    ctx: &Ctx,
) -> Element<'a, Message> {
    let p = ctx.p;
    let tint = match emphasis {
        Emphasis::Quiet | Emphasis::Danger => p.text_muted,
        Emphasis::Tinted(neon) => neon.text,
        Emphasis::Filled(_) => Color::WHITE,
    };

    let control = button(container(icon(glyph, size, tint)).center_x(Fill).center_y(Fill))
        .width(44)
        .height(44)
        .padding(0)
        .on_press(message)
        .style(move |_, status| {
            let hovered = matches!(status, button::Status::Hovered | button::Status::Pressed);
            let background = match (emphasis, hovered) {
                (Emphasis::Quiet, false) | (Emphasis::Danger, false) => None,
                (Emphasis::Quiet, true) => Some(p.surface_muted),
                (Emphasis::Danger, true) => Some(crate::theme::rgb(0xef4444)),
                (Emphasis::Tinted(neon), false) => Some(alpha(neon.fill, 0.14)),
                (Emphasis::Tinted(neon), true) => Some(alpha(neon.fill, 0.20)),
                (Emphasis::Filled(color), false) => Some(color),
                (Emphasis::Filled(color), true) => Some(mix(color, Color::WHITE, 0.88)),
            };
            button::Style {
                background: background.map(Background::Color),
                border: border::rounded(8),
                shadow: match emphasis {
                    Emphasis::Filled(color) => Shadow { color: alpha(color, 0.30), offset: [0.0, 6.0].into(), blur_radius: 14.0 },
                    _ => Shadow::default(),
                },
                ..button::Style::default()
            }
        });

    hint(control, label, ctx)
}

/// Text button with a tinted background (card actions such as "Test auto").
pub fn pill_button<'a, Message: Clone + 'a>(
    label: impl text::IntoFragment<'a>,
    glyph: Option<Icon>,
    neon: Neon,
    message: Option<Message>,
    ctx: &Ctx,
) -> Element<'a, Message> {
    let p = ctx.p;
    let mut content = row![].spacing(6).align_y(iced::Center);
    if let Some(glyph) = glyph {
        content = content.push(icon(glyph, 14.0, neon.text));
    }
    content = content.push(text(label).size(12).font(GEIST_SEMIBOLD).color(neon.text));

    button(content)
        .padding(Padding::from([8, 12]))
        .on_press_maybe(message)
        .style(move |_, status| {
            let strength = match status {
                button::Status::Hovered | button::Status::Pressed => 0.22,
                button::Status::Disabled => 0.06,
                button::Status::Active => 0.12,
            };
            button::Style {
                background: Some(alpha(neon.fill, strength).into()),
                border: Border { color: alpha(neon.fill, 0.30), width: 1.0, radius: 12.0.into() },
                text_color: p.foreground,
                ..button::Style::default()
            }
        })
        .into()
}
