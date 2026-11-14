//! Shared building blocks of the interface: cards, headers, badges, buttons.

use iced::widget::{button, column, container, row, text, tooltip, Space};
use iced::{border, gradient, Background, Border, Color, Element, Fill, Padding, Radians, Shadow};

use super::icons::{icon, Icon};
use crate::gfx::glass::{glass, Glass};
use crate::gfx::{Atmosphere, Surface};
use crate::i18n::Tr;
use crate::settings::NeonGlow;
use crate::theme::{alpha, mix, Neon, Palette, GEIST_MEDIUM, GEIST_SEMIBOLD, MONO, MONO_BOLD};

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

impl Ctx {
    /// This context at `opacity`, for a view fading in: colours and glass surfaces alike.
    pub fn entering(&self, opacity: f32) -> Self {
        if opacity >= 1.0 {
            return *self;
        }
        Self {
            p: self.p.faded(opacity),
            accent: Neon { fill: alpha(self.accent.fill, opacity), text: alpha(self.accent.text, opacity) },
            atmosphere: Atmosphere { presence: opacity, ..self.atmosphere },
            ..*self
        }
    }
}

pub const CARD_PADDING: f32 = 24.0;
pub const CARD_RADIUS: f32 = 32.0;
pub const GAP: f32 = 24.0;

/// Shared glass surface for dashboard cards.
pub fn card<'a, Message: 'a>(content: impl Into<Element<'a, Message>>, ctx: &Ctx) -> Glass<'a, Message> {
    glass(content, ctx.atmosphere).radius(CARD_RADIUS).padding(CARD_PADDING)
}

/// Floating panel above the dashboard.
pub fn panel<'a, Message: 'a>(content: impl Into<Element<'a, Message>>, ctx: &Ctx) -> Glass<'a, Message> {
    glass(content, ctx.atmosphere).surface(Surface::Panel).radius(16.0)
}

/// Recessed surface for secondary information.
pub fn inset_style(p: &Palette, radius: f32) -> container::Style {
    container::Style {
        background: Some(p.surface_inset.into()),
        border: Border { color: p.border, width: 1.0, radius: radius.into() },
        ..container::Style::default()
    }
}

/// Secondary label above a value.
pub fn caption<'a>(label: &str, ctx: &Ctx) -> iced::widget::Text<'a> {
    text(label.to_owned()).size(11).font(GEIST_MEDIUM).color(ctx.p.text_muted)
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

    // White and the shadow follow the colour's opacity, so the tile fades in as one.
    container(icon(glyph, 20.0, alpha(Color::WHITE, color.a)))
        .center_x(40)
        .center_y(40)
        .style(move |_| container::Style {
            background: Some(Background::Gradient(fill.into())),
            border: border::rounded(12),
            shadow: Shadow { color: Color { a: 0.25 * color.a, ..Color::BLACK }, offset: [0.0, 4.0].into(), blur_radius: 10.0 },
            ..container::Style::default()
        })
        .into()
}

/// Headline metric, tinted to match its chart.
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

/// Keep hardware names below the headline so they never compete with metrics.
pub fn header<'a, Message: 'a>(
    glyph: Icon,
    label: &'a str,
    subtitle: Option<String>,
    neon: Neon,
    trailing: Option<Element<'a, Message>>,
    ctx: &Ctx,
) -> Element<'a, Message> {
    let title = text(label).size(16).font(GEIST_SEMIBOLD).color(ctx.p.foreground).width(Fill);
    let mut header = row![icon_tile(glyph, neon.fill), title].spacing(12).align_y(iced::Center);
    if let Some(trailing) = trailing {
        header = header.push(Space::new().width(8)).push(trailing);
    }
    let mut content = column![header].spacing(12);
    if let Some(subtitle) = subtitle {
        content = content.push(text(subtitle).size(12).line_height(1.5).color(ctx.p.text_muted));
    } else {
        // Align the charts even when Windows supplies no hardware name.
        content = content.push(Space::new().height(18));
    }
    content.into()
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
