//! Opening screen: the wordmark cut by a blade, then the three checks and a progress bar.

use iced::mouse;
use iced::widget::canvas::{self, gradient, Frame, Geometry, LineCap, Path, Stroke, Text};
use iced::widget::{column, container, row, text, Space};
use iced::{alignment, Background, Border, Color, Element, Fill, FillPortion, Padding, Pixels, Point, Radians, Rectangle, Renderer, Shadow, Theme};
use std::time::Instant;

use super::icons::{icon, Icon};
use super::kit::{panel, Ctx};
use crate::app::Message;
use crate::splash::{Flags, Splash, Step, INTRO};
use crate::theme::{alpha, mix, Neon, GEIST_BOLD, GEIST_SEMIBOLD, MONO, MONO_BOLD};

fn ease_out(t: f32) -> f32 {
    1.0 - (1.0 - t.clamp(0.0, 1.0)).powi(3)
}

fn gradient_style(linear: gradient::Linear) -> canvas::Style {
    canvas::Style::Gradient(canvas::Gradient::Linear(linear))
}

/// Progress of an animation running from `from` to `to` seconds.
fn span(t: f32, from: f32, to: f32) -> f32 {
    ((t - from) / (to - from)).clamp(0.0, 1.0)
}

/// The title and its intro: glyphs fade in, a blade sweeps across, a line settles underneath.
struct Title {
    /// Seconds since the splash opened.
    time: f32,
    ctx: Ctx,
}

impl<Message> canvas::Program<Message> for Title {
    type State = ();

    fn draw(
        &self,
        _state: &Self::State,
        renderer: &Renderer,
        _theme: &Theme,
        bounds: Rectangle,
        _cursor: mouse::Cursor,
    ) -> Vec<Geometry> {
        let p = &self.ctx.p;
        let t = self.time;
        let mut frame = Frame::new(renderer, bounds.size());
        let (width, height) = (frame.width(), frame.height());
        let mid = height * 0.42;

        // Soft halo behind the wordmark.
        let halo = Path::rounded_rectangle(Point::new(width * 0.1, mid - 26.0), iced::Size::new(width * 0.8, 52.0), 26.0.into());
        frame.fill(
            &halo,
            gradient::Linear::new(Point::new(width * 0.1, 0.0), Point::new(width * 0.9, 0.0))
                .add_stop(0.0, alpha(p.pink.fill, 0.0))
                .add_stop(0.3, alpha(p.pink.fill, 0.07 * ease_out(span(t, 0.2, 1.0))))
                .add_stop(0.7, alpha(p.cyan.fill, 0.08 * ease_out(span(t, 0.2, 1.0))))
                .add_stop(1.0, alpha(p.cyan.fill, 0.0)),
        );

        // Wordmark, centred: "Koi" pink → purple → cyan, "Monitor" cyan → pale cyan.
        let reveal = ease_out(span(t, 0.25, 0.85));
        let title_width = 300.0;
        let left = (width - title_width) / 2.0;
        let fill = gradient::Linear::new(Point::new(left, 0.0), Point::new(left + title_width, 0.0))
            .add_stop(0.0, alpha(p.pink.fill, reveal))
            .add_stop(0.20, alpha(p.purple.fill, reveal))
            .add_stop(0.30, alpha(p.cyan.fill, reveal))
            .add_stop(1.0, alpha(mix(p.cyan.fill, Color::WHITE, 0.70), reveal));
        let wordmark = Text {
            content: "Koi Monitor".to_string(),
            position: Point::new(width / 2.0, mid),
            size: Pixels(44.0),
            font: GEIST_BOLD,
            align_x: alignment::Horizontal::Center.into(),
            align_y: alignment::Vertical::Center,
            ..Text::default()
        };
        wordmark.draw_with(|glyph, _color| frame.fill(&glyph, fill));

        // The blade: a streak of light crossing the title at mid-height.
        let sweep = span(t, 0.55, 1.05);
        if sweep > 0.0 && sweep < 1.0 {
            let head = -0.2 * width + ease_out(sweep) * 1.4 * width;
            let tail = head - width * 0.45;
            let blade = Path::line(Point::new(tail, mid), Point::new(head, mid));
            let streak = |opacity: f32| {
                gradient::Linear::new(Point::new(tail, 0.0), Point::new(head, 0.0))
                    .add_stop(0.0, alpha(p.cyan.fill, 0.0))
                    .add_stop(0.7, alpha(p.cyan.fill, 0.6 * opacity))
                    .add_stop(1.0, alpha(Color::WHITE, opacity))
            };
            frame.stroke(&blade, Stroke { style: gradient_style(streak(0.25)), width: 9.0, line_cap: LineCap::Round, ..Stroke::default() });
            frame.stroke(&blade, Stroke { style: gradient_style(streak(1.0)), width: 2.5, line_cap: LineCap::Round, ..Stroke::default() });
        }

        // Flash left by the cut, fading out.
        let flash = span(t, 0.95, 1.45);
        if flash > 0.0 && flash < 1.0 {
            let line = Path::line(Point::new(left - 20.0, mid), Point::new(left + title_width + 20.0, mid));
            frame.stroke(&line, Stroke::default().with_color(alpha(Color::WHITE, 0.75 * (1.0 - flash))).with_width(1.5 + 3.0 * (1.0 - flash)));
        }

        // Underline settling under the title.
        let settle = ease_out(span(t, 1.0, 1.7));
        if settle > 0.0 {
            let half = 108.0 * (0.2 + 0.8 * settle);
            let y = height - 6.0;
            let opacity = 0.85 - 0.4 * span(t, 1.3, 1.8);
            let line = Path::line(Point::new(width / 2.0 - half, y), Point::new(width / 2.0 + half, y));
            frame.stroke(
                &line,
                Stroke {
                    style: gradient_style(
                        gradient::Linear::new(Point::new(width / 2.0 - half, 0.0), Point::new(width / 2.0 + half, 0.0))
                            .add_stop(0.0, alpha(p.cyan.fill, 0.0))
                            .add_stop(0.35, alpha(p.cyan.fill, opacity))
                            .add_stop(0.65, alpha(mix(p.pink.fill, p.cyan.fill, 0.55), opacity))
                            .add_stop(1.0, alpha(p.cyan.fill, 0.0)),
                    ),
                    width: 1.5,
                    ..Stroke::default()
                },
            );
        }

        vec![frame.into_geometry()]
    }
}

fn step_row<'a>(glyph: Icon, label: &'a str, detail: &'a str, neon: Neon, state: Step, time: f32, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let lit = state != Step::Pending;
    let tone = if lit { neon.fill } else { p.text_subtle };
    let green = p.green;

    let marker = container(Space::new()).width(4).height(Fill).style(move |_| container::Style {
        background: Some(if lit { neon.fill } else { alpha(p.border, p.border.a * 0.35) }.into()),
        border: iced::border::rounded(2),
        shadow: if state == Step::Active { Shadow { color: alpha(neon.fill, 0.5), offset: [0.0, 0.0].into(), blur_radius: 12.0 } } else { Shadow::default() },
        ..container::Style::default()
    });

    let tile = container(icon(glyph, 16.0, tone)).center_x(36).center_y(36).style(move |_| container::Style {
        background: Some(if lit { alpha(neon.fill, 0.10) } else { p.surface_inset }.into()),
        border: Border { color: if lit { alpha(neon.fill, 0.35) } else { p.border }, width: 1.0, radius: 12.0.into() },
        ..container::Style::default()
    });

    let status: Element<'a, Message> = match state {
        Step::Done => container(icon(Icon::Check, 14.0, green.text))
            .center_x(28)
            .center_y(28)
            .style(move |_| container::Style {
                background: Some(alpha(green.fill, 0.15).into()),
                border: Border { color: alpha(green.fill, 0.35), width: 1.0, radius: 14.0.into() },
                shadow: Shadow { color: alpha(green.fill, 0.25), offset: [0.0, 0.0].into(), blur_radius: 12.0 },
                ..container::Style::default()
            })
            .into(),
        // One turn every 1.2 s.
        Step::Active => icon(Icon::Loader, 20.0, neon.fill).rotation(Radians(time * std::f32::consts::TAU / 1.2)).into(),
        Step::Pending => container(Space::new())
            .width(8)
            .height(8)
            .style(move |_| container::Style { background: Some(p.border_strong.into()), border: iced::border::rounded(4), ..container::Style::default() })
            .into(),
    };

    container(
        row![
            marker,
            tile,
            column![
                text(label).size(14).font(GEIST_SEMIBOLD).color(if lit { neon.text } else { p.text_muted }),
                text(detail).size(10).color(p.text_subtle),
            ]
            .spacing(4)
            .width(Fill),
            container(status).center_x(32).center_y(32),
        ]
        .spacing(12)
        .align_y(iced::Center)
        .height(40),
    )
    .padding(Padding { top: 10.0, right: 16.0, bottom: 10.0, left: 6.0 })
    .style(move |_| {
        let (background, border, fade) = match state {
            Step::Done => (p.surface_inset, p.border, 1.0),
            Step::Active => (alpha(p.surface_muted, p.surface_muted.a * 0.6), p.border_strong, 1.0),
            Step::Pending => (alpha(p.surface_inset, p.surface_inset.a * 0.5), p.border, 0.55),
        };
        container::Style {
            background: Some(background.into()),
            border: Border { color: alpha(border, border.a * fade), width: 1.0, radius: 16.0.into() },
            ..container::Style::default()
        }
    })
    .into()
}

pub fn view<'a>(splash: &Splash, flags: Flags, ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let now = Instant::now();
    let time = now.duration_since(splash.started).as_secs_f32();

    let hairline = iced::gradient::Linear::new(Radians(std::f32::consts::FRAC_PI_2))
        .add_stop(0.0, Color::TRANSPARENT)
        .add_stop(0.25, p.pink.fill)
        .add_stop(0.5, p.purple.fill)
        .add_stop(0.75, p.cyan.fill)
        .add_stop(1.0, Color::TRANSPARENT);

    let title = canvas::Canvas::new(Title { time, ctx: *ctx }).width(Fill).height(92);

    let mut card = column![title].align_x(iced::Center);

    // The checks and the bar join once the title intro has played, fading in.
    if splash.intro_done(now) {
        let fade = ease_out(span(time, INTRO.as_secs_f32(), INTRO.as_secs_f32() + 0.6));
        let steps = column![
            step_row(Icon::Cpu, tr.t("splash_step_system"), tr.t("splash_step_system_detail"), p.pink, splash.step(0, flags), time, ctx),
            step_row(Icon::Globe, tr.t("splash_step_dns"), tr.t("splash_step_dns_detail"), p.cyan, splash.step(1, flags), time, ctx),
            step_row(Icon::Disc, tr.t("splash_step_drivers"), tr.t("splash_step_drivers_detail"), p.green, splash.step(2, flags), time, ctx),
        ]
        .spacing(12);

        let percent = splash.percent.round().clamp(0.0, 100.0);
        let filled = percent as u16;
        let bar_fill = iced::gradient::Linear::new(Radians(std::f32::consts::FRAC_PI_2))
            .add_stop(0.0, p.pink.fill)
            .add_stop(0.25, p.purple.fill)
            .add_stop(0.5, p.cyan.fill)
            .add_stop(0.75, p.purple.fill)
            .add_stop(1.0, p.pink.fill);
        let glow = p.cyan.fill;

        let mut bar = row![].height(8);
        if filled > 0 {
            bar = bar.push(container(Space::new()).width(FillPortion(filled)).height(Fill).style(move |_| container::Style {
                background: Some(Background::Gradient(bar_fill.into())),
                border: iced::border::rounded(4),
                shadow: Shadow { color: alpha(glow, 0.4), offset: [0.0, 0.0].into(), blur_radius: 16.0 },
                ..container::Style::default()
            }));
        }
        if filled < 100 {
            bar = bar.push(Space::new().width(FillPortion(100 - filled)));
        }

        card = card
            .push(Space::new().height(28))
            .push(steps)
            .push(Space::new().height(32))
            .push(
                row![
                    text(tr.t(splash.message_key(flags))).size(12).font(MONO).color(alpha(p.text_muted, fade)).width(Fill),
                    text(format!("{percent:.0}%")).size(14).font(MONO_BOLD).color(alpha(p.pink.text, fade)),
                ]
                .align_y(iced::Bottom)
                .padding(Padding::from([0, 4])),
            )
            .push(Space::new().height(12))
            .push(container(bar).width(Fill).style(move |_| container::Style {
                background: Some(p.surface_inset.into()),
                border: Border { color: p.border, width: 1.0, radius: 4.0.into() },
                ..container::Style::default()
            }));
    }

    let top_line = container(Space::new()).width(Fill).height(1).style(move |_| container::Style {
        background: Some(Background::Gradient(hairline.into())),
        ..container::Style::default()
    });

    container(
        panel(column![top_line, container(card).padding(Padding { top: 43.0, right: 40.0, bottom: 40.0, left: 40.0 })], ctx)
            .radius(32.0)
            .width(512),
    )
    .center_x(Fill)
    .center_y(Fill)
    .into()
}
