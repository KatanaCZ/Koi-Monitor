//! Opening screen: the wordmark is written letter by letter, cut by a blade and
//! rejoined, then travels to its place in the title bar while the dashboard comes in.

use iced::advanced::graphics::text::Paragraph;
use iced::advanced::text::{self as core_text, Paragraph as _};
use iced::mouse;
use iced::widget::canvas::{self, gradient, Action, Event, Frame, Geometry, LineCap, Path, Stroke, Text};
use iced::{alignment, window, Color, Element, Fill, Font, Pixels, Point, Radians, Rectangle, Renderer, Size, Theme, Vector};
use std::time::Instant;

use super::kit::Ctx;
use super::title_bar;
use crate::app::Message;
use crate::splash::{Flags, Splash, LINE_DELAY};
use crate::theme::{alpha, mix, Palette, GEIST_BOLD, GEIST_SEMIBOLD, MONO};

const WORDMARK: &str = "Koi Monitor";
/// Size of the wordmark during the intro.
const TITLE_SIZE: f32 = 64.0;

// The intro, in seconds since the splash opened (`crate::splash::INTRO` covers it all).
/// First letter.
const WRITE: f32 = 0.35;
const LETTER_GAP: f32 = 0.045;
const LETTER_TIME: f32 = 0.42;
/// The wordmark gathers itself before the cut.
const BRACE: (f32, f32) = (1.05, 1.20);
const BLADE: (f32, f32) = (1.20, 1.44);
/// The blade crosses the wordmark.
const CUT: f32 = 1.38;
const REJOIN: (f32, f32) = (1.95, 2.40);
const UNDERLINE: (f32, f32) = (2.40, 3.00);

const PETALS: usize = 16;
const SPARKS: usize = 12;

// --- curves -------------------------------------------------------------------

/// Progress of an animation running from `from` to `to`, clamped to 0..1.
fn span(t: f32, from: f32, to: f32) -> f32 {
    ((t - from) / (to - from)).clamp(0.0, 1.0)
}

fn ease_out(t: f32) -> f32 {
    1.0 - (1.0 - t.clamp(0.0, 1.0)).powi(3)
}

fn ease_in(t: f32) -> f32 {
    t.clamp(0.0, 1.0).powi(3)
}

fn ease_in_out(t: f32) -> f32 {
    let t = t.clamp(0.0, 1.0);
    if t < 0.5 { 4.0 * t * t * t } else { 1.0 - (-2.0 * t + 2.0).powi(3) / 2.0 }
}

/// Fast start, long tail: an impact.
fn ease_out_expo(t: f32) -> f32 {
    let t = t.clamp(0.0, 1.0);
    if t >= 1.0 { 1.0 } else { 1.0 - 2f32.powf(-10.0 * t) }
}

/// Damped spring from 0 to 1, overshooting by about a tenth.
fn spring(t: f32) -> f32 {
    let t = t.clamp(0.0, 1.0);
    if t >= 1.0 { 1.0 } else { 1.0 - (-8.0 * t).exp() * (11.0 * t).cos() }
}

fn lerp(from: f32, to: f32, t: f32) -> f32 {
    from + (to - from) * t
}

/// A number in 0..1 that only looks random, fixed for a given particle and trait.
fn scatter(index: usize, salt: f32) -> f32 {
    ((index as f32 * 12.9898 + salt * 78.233).sin() * 43_758.547).fract().abs()
}

// --- the dashboard coming in --------------------------------------------------

/// Opacity of the title bar, `progress` being the hand-over from 0 to 1.
pub fn bar_entrance(progress: f32) -> f32 {
    ease_out(span(progress, 0.12, 0.50))
}

/// Opacity of the dashboard card at `index`: each one starts a little after the previous.
pub fn card_entrance(progress: f32, index: usize) -> f32 {
    // The first card waits for the wordmark to be well on its way above it.
    let from = 0.30 + 0.055 * index as f32;
    ease_out(span(progress, from, from + 0.37))
}

/// How far below its place the dashboard still is, in pixels.
pub fn rise(progress: f32) -> f32 {
    36.0 * (1.0 - ease_out(span(progress, 0.18, 0.95)))
}

// --- drawing ------------------------------------------------------------------

fn measure(font: Font, size: f32) -> f32 {
    Paragraph::with_text(core_text::Text {
        content: WORDMARK,
        bounds: Size::INFINITE,
        size: Pixels(size),
        line_height: core_text::LineHeight::default(),
        font,
        align_x: core_text::Alignment::Left,
        align_y: alignment::Vertical::Top,
        shaping: core_text::Shaping::Basic,
        wrapping: core_text::Wrapping::None,
    })
    .min_bounds()
    .width
}

fn gradient_style(linear: gradient::Linear) -> canvas::Style {
    canvas::Style::Gradient(canvas::Gradient::Linear(linear))
}

/// The brand gradient of the title bar wordmark, at any size.
fn brand(p: &Palette, left: f32, size: f32, opacity: f32) -> gradient::Linear {
    let extent = title_bar::WORDMARK_GRADIENT * size / title_bar::WORDMARK_SIZE;
    gradient::Linear::new(Point::new(left, 0.0), Point::new(left + extent, 0.0))
        .add_stop(0.0, alpha(p.pink.fill, opacity))
        .add_stop(0.20, alpha(p.purple.fill, opacity))
        .add_stop(0.30, alpha(p.cyan.fill, opacity))
        .add_stop(1.0, alpha(mix(p.cyan.fill, Color::WHITE, 0.70), opacity))
}

/// Draws the wordmark from its left edge; `glyph` gives each letter its opacity and how
/// far below its place it still is.
fn wordmark(frame: &mut Frame, p: &Palette, left: f32, y: f32, size: f32, font: Font, glyph: impl Fn(usize) -> (f32, f32)) {
    let text = Text {
        content: WORDMARK.to_string(),
        position: Point::new(left, y),
        size: Pixels(size),
        font,
        align_y: alignment::Vertical::Center,
        ..Text::default()
    };
    let mut index = 0;
    text.draw_with(|path, _color| {
        let (opacity, drop) = glyph(index);
        index += 1;
        if opacity > 0.0 {
            let fill = brand(p, left, size, opacity);
            frame.with_save(|frame| {
                frame.translate(Vector::new(0.0, drop));
                frame.fill(&path, fill);
            });
        }
    });
}

/// Runs `draw` scaled by `scale` around `centre`.
fn scaled(frame: &mut Frame, centre: Point, scale: f32, draw: impl FnOnce(&mut Frame)) {
    frame.with_save(|frame| {
        frame.translate(Vector::new(centre.x, centre.y));
        frame.scale(scale);
        frame.translate(Vector::new(-centre.x, -centre.y));
        draw(frame);
    });
}

/// A horizontal line fading out towards both ends.
fn hairline(frame: &mut Frame, centre: Point, half: f32, color: Color, width: f32) {
    if half <= 0.0 || color.a <= 0.0 {
        return;
    }
    let (from, to) = (Point::new(centre.x - half, centre.y), Point::new(centre.x + half, centre.y));
    let fade = gradient::Linear::new(Point::new(from.x, 0.0), Point::new(to.x, 0.0))
        .add_stop(0.0, alpha(color, 0.0))
        .add_stop(0.3, color)
        .add_stop(0.7, color)
        .add_stop(1.0, alpha(color, 0.0));
    frame.stroke(&Path::line(from, to), Stroke { style: gradient_style(fade), width, line_cap: LineCap::Round, ..Stroke::default() });
}

/// A sakura petal, pointed at both ends, lying along the x axis.
fn petal(size: f32) -> Path {
    Path::new(|builder| {
        builder.move_to(Point::new(-size, 0.0));
        builder.quadratic_curve_to(Point::new(0.0, -size * 0.62), Point::new(size, 0.0));
        builder.quadratic_curve_to(Point::new(0.0, size * 0.62), Point::new(-size, 0.0));
        builder.close();
    })
}

struct Scene {
    /// Seconds since the splash opened.
    time: f32,
    /// Seconds spent waiting for data past the intro.
    waiting: Option<f32>,
    /// Progress of the hand-over to the dashboard.
    outro: Option<f32>,
    percent: f32,
    line_shown: bool,
    status: &'static str,
    calm: bool,
    /// Where the wordmark lands in the title bar: left edge and vertical centre. None in Zen mode.
    slot: Option<Point>,
    /// Keeps the frames coming; off for a sequence held at one instant.
    live: bool,
    ctx: Ctx,
}

impl Scene {
    /// The cut wordmark: two halves sliding apart along the blade's path.
    fn split(&self, frame: &mut Frame, centre: Point, left: f32, cut_y: f32, scale: f32) {
        let p = &self.ctx.p;
        let t = self.time;
        let apart = 9.0 * ease_out_expo(span(t, CUT, CUT + 0.14)) + 2.0 * span(t, CUT + 0.14, REJOIN.0);
        let shift = apart * (1.0 - spring(span(t, REJOIN.0, REJOIN.1)));
        // The halves also part a little, so the cut reads as a clean gap.
        let gap = shift * 0.3;
        let (width, height) = (frame.width(), frame.height());

        let halves = [
            (Rectangle::new(Point::ORIGIN, Size::new(width, cut_y - gap)), Vector::new(shift, -gap)),
            (Rectangle::new(Point::new(0.0, cut_y + gap), Size::new(width, height - cut_y - gap)), Vector::new(-shift, gap)),
        ];
        for (region, offset) in halves {
            // A clipped frame starts from the canvas origin, without the transforms of its parent.
            frame.with_clip(region, |frame| {
                frame.translate(offset);
                scaled(frame, centre, scale, |frame| wordmark(frame, p, left, centre.y, TITLE_SIZE, GEIST_BOLD, |_| (1.0, 0.0)));
            });
        }
    }

    /// Streak of light crossing the wordmark, then the line it leaves behind.
    fn blade(&self, frame: &mut Frame, centre: Point, cut_y: f32, wide: f32) {
        let p = &self.ctx.p;
        let t = self.time;
        let width = frame.width();

        let sweep = span(t, BLADE.0, BLADE.1);
        if sweep > 0.0 && sweep < 1.0 {
            let head = lerp(-0.2 * width, 1.25 * width, ease_in(sweep));
            let tail = head - width * (0.2 + 0.3 * sweep);
            let line = Path::line(Point::new(tail, cut_y), Point::new(head, cut_y));
            let streak = |opacity: f32| {
                gradient::Linear::new(Point::new(tail, 0.0), Point::new(head, 0.0))
                    .add_stop(0.0, alpha(p.cyan.fill, 0.0))
                    .add_stop(0.75, alpha(p.cyan.fill, 0.7 * opacity))
                    .add_stop(1.0, alpha(Color::WHITE, opacity))
            };
            for (opacity, thickness) in [(0.16, 16.0), (0.45, 6.0), (1.0, 1.8)] {
                frame.stroke(&line, Stroke { style: gradient_style(streak(opacity)), width: thickness, line_cap: LineCap::Round, ..Stroke::default() });
            }
        }

        // The cut itself: a white line that widens away from the wordmark while it cools.
        if t >= CUT {
            let cooling = span(t, CUT, CUT + 0.6);
            let glow = (1.0 - cooling).powi(2);
            let half = wide / 2.0 + 40.0 + width * 0.45 * ease_out_expo(cooling);
            hairline(frame, Point::new(centre.x, cut_y), half, alpha(Color::WHITE, 0.9 * glow), 1.0 + 3.0 * glow);
        }
    }

    /// Petals and sparks thrown out by the cut.
    fn burst(&self, frame: &mut Frame, left: f32, cut_y: f32, wide: f32) {
        let p = &self.ctx.p;
        let since = self.time - CUT;
        if since <= 0.0 {
            return;
        }
        let tint = mix(self.ctx.accent.fill, Color::WHITE, 0.72);

        for index in 0..PETALS {
            let age = since - 0.05 * scatter(index, 1.0);
            let life = 1.0 + 0.6 * scatter(index, 2.0);
            if age <= 0.0 || age >= life {
                continue;
            }
            let upwards = if index % 2 == 0 { -1.0 } else { 1.0 };
            let across = (scatter(index, 3.0) - 0.25) * 320.0;
            let away = upwards * (120.0 + 180.0 * scatter(index, 4.0));
            // Thrown hard, slowed by the air, then drifting down.
            let travelled = (1.0 - (-2.2 * age).exp()) / 2.2;
            let position = Point::new(
                left + wide * (0.08 + 0.84 * scatter(index, 5.0)) + across * travelled,
                cut_y + away * travelled + 130.0 * age * age,
            );
            let size = 7.0 + 8.0 * scatter(index, 6.0);
            let spin = scatter(index, 7.0) * std::f32::consts::TAU + age * (2.0 + 4.0 * scatter(index, 8.0)) * upwards;
            let flutter = 0.35 + 0.65 * (age * 5.0 + scatter(index, 9.0) * 6.0).cos().abs();
            let opacity = 0.9 * (age / 0.06).min(1.0) * (1.0 - age / life).powf(1.5);

            frame.with_save(|frame| {
                frame.translate(Vector::new(position.x, position.y));
                frame.rotate(Radians(spin));
                frame.scale_nonuniform(Vector::new(1.0, flutter));
                frame.fill(&petal(size), alpha(tint, opacity));
            });
        }

        for index in 0..SPARKS {
            let life = 0.28 + 0.2 * scatter(index, 11.0);
            if since >= life {
                continue;
            }
            let upwards = if index % 2 == 0 { -1.0 } else { 1.0 };
            let angle = (scatter(index, 12.0) - 0.5) * 1.2;
            let speed = 300.0 + 400.0 * scatter(index, 13.0);
            let velocity = Vector::new(angle.sin() * speed + 140.0, upwards * angle.cos() * speed);
            let travelled = (1.0 - (-5.0 * since).exp()) / 5.0;
            let origin = Point::new(left + wide * scatter(index, 14.0), cut_y);
            let head = Point::new(origin.x + velocity.x * travelled, origin.y + velocity.y * travelled);
            let tail = Point::new(head.x - velocity.x * 0.03, head.y - velocity.y * 0.03);
            let opacity = (1.0 - since / life).powi(2);
            frame.stroke(
                &Path::line(tail, head),
                Stroke::default().with_color(alpha(mix(p.cyan.fill, Color::WHITE, 0.3), opacity)).with_width(1.2).with_line_cap(LineCap::Round),
            );
        }
    }

    /// The progress line and its status, shown only when the first data is late.
    fn wait_line(&self, frame: &mut Frame, centre: Point, opacity: f32) {
        if opacity <= 0.0 {
            return;
        }
        let p = &self.ctx.p;
        let (half, y) = (120.0, centre.y + 96.0);
        let (from, to) = (Point::new(centre.x - half, y), Point::new(centre.x + half, y));
        frame.stroke(
            &Path::line(from, to),
            Stroke::default().with_color(alpha(p.foreground, 0.10 * opacity)).with_width(2.0).with_line_cap(LineCap::Round),
        );

        let reached = Point::new(lerp(from.x, to.x, (self.percent / 100.0).clamp(0.0, 1.0)), y);
        if reached.x > from.x {
            let fill = gradient::Linear::new(Point::new(from.x, 0.0), Point::new(to.x, 0.0))
                .add_stop(0.0, alpha(p.pink.fill, opacity))
                .add_stop(0.5, alpha(p.purple.fill, opacity))
                .add_stop(1.0, alpha(p.cyan.fill, opacity));
            frame.stroke(&Path::line(from, reached), Stroke { style: gradient_style(fill), width: 2.0, line_cap: LineCap::Round, ..Stroke::default() });
            frame.fill(&Path::circle(reached, 2.5), alpha(Color::WHITE, 0.85 * opacity));
        }

        frame.fill_text(Text {
            content: self.status.to_string(),
            position: Point::new(centre.x, y + 22.0),
            size: Pixels(12.0),
            font: MONO,
            color: alpha(p.text_muted, opacity),
            align_x: alignment::Horizontal::Center.into(),
            align_y: alignment::Vertical::Center,
            ..Text::default()
        });
    }

    /// The wordmark shrinking towards its place in the title bar.
    fn travel(&self, frame: &mut Frame, progress: f32, centre: Point, left: f32) {
        let p = &self.ctx.p;
        let Some(slot) = self.slot else {
            // Zen mode has no title bar: the wordmark lifts and fades.
            let gone = ease_in_out(span(progress, 0.0, 0.6));
            let size = lerp(TITLE_SIZE, TITLE_SIZE * 0.8, gone);
            let narrower = (measure(GEIST_BOLD, TITLE_SIZE) - measure(GEIST_BOLD, size)) / 2.0;
            wordmark(frame, p, left + narrower, centre.y - 40.0 * gone, size, GEIST_BOLD, |_| (1.0 - gone, 0.0));
            return;
        };

        let moved = ease_in_out(span(progress, 0.0, 0.60));
        // The height leads slightly, so the path bends instead of running straight.
        let lifted = ease_in_out(span(progress, 0.0, 0.50));
        let size = lerp(TITLE_SIZE, title_bar::WORDMARK_SIZE, moved);
        let (x, y) = (lerp(left, slot.x, moved), lerp(centre.y, slot.y, lifted));

        // The title bar sets it in semibold: change weight on the way.
        let lighter = span(moved, 0.55, 1.0);
        if lighter < 1.0 {
            wordmark(frame, p, x, y, size, GEIST_BOLD, |_| (1.0 - lighter, 0.0));
        }
        if lighter > 0.0 {
            wordmark(frame, p, x, y, size, GEIST_SEMIBOLD, |_| (lighter, 0.0));
        }
    }
}

impl canvas::Program<Message> for Scene {
    type State = ();

    fn update(&self, _state: &mut Self::State, event: &Event, _bounds: Rectangle, _cursor: mouse::Cursor) -> Option<Action<Message>> {
        // The sequence runs at the display's own rate: each frame asks for the next.
        match event {
            Event::Window(window::Event::RedrawRequested(_)) if self.live => Some(Action::request_redraw()),
            _ => None,
        }
    }

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
        let centre = Point::new(frame.width() / 2.0, frame.height() * 0.46);
        let wide = measure(GEIST_BOLD, TITLE_SIZE);
        let left = centre.x - wide / 2.0;
        let cut_y = centre.y + 3.0;

        // Everything but the wordmark leaves at the start of the hand-over.
        let staying = 1.0 - ease_out(span(self.outro.unwrap_or(0.0), 0.0, 0.25));

        if let Some(progress) = self.outro {
            self.travel(&mut frame, progress, centre, left);
        } else if self.calm {
            let shown = ease_out(span(t, 0.1, 0.7));
            wordmark(&mut frame, p, left, centre.y, TITLE_SIZE, GEIST_BOLD, |_| (shown, 0.0));
        } else {
            // Breath in before the cut, a slight swell on impact.
            let scale = if t < CUT {
                1.0 - 0.015 * ease_in_out(span(t, BRACE.0, BRACE.1))
            } else {
                1.0 + 0.02 * (1.0 - ease_out(span(t, CUT, CUT + 0.35)))
            };

            // Flash of the impact, behind the letters.
            if t >= CUT {
                let flash = (1.0 - span(t, CUT, CUT + 0.32)).powi(2);
                let band = Rectangle::new(Point::new(0.0, cut_y - 70.0), Size::new(frame.width(), 140.0));
                let light = gradient::Linear::new(Point::new(0.0, band.y), Point::new(0.0, band.y + band.height))
                    .add_stop(0.0, alpha(Color::WHITE, 0.0))
                    .add_stop(0.5, alpha(Color::WHITE, 0.16 * flash))
                    .add_stop(1.0, alpha(Color::WHITE, 0.0));
                frame.fill_rectangle(band.position(), band.size(), light);
            }

            if (CUT..REJOIN.1).contains(&t) {
                self.split(&mut frame, centre, left, cut_y, scale);
            } else {
                scaled(&mut frame, centre, scale, |frame| {
                    wordmark(frame, p, left, centre.y, TITLE_SIZE, GEIST_BOLD, |index| {
                        let written = ease_out(span(t, WRITE + LETTER_GAP * index as f32, WRITE + LETTER_GAP * index as f32 + LETTER_TIME));
                        (written, 14.0 * (1.0 - written))
                    });
                });
            }

            self.blade(&mut frame, centre, cut_y, wide);
            self.burst(&mut frame, left, cut_y, wide);

            // A small flare where the halves close.
            let closing = span(t, REJOIN.0 + 0.12, REJOIN.1 + 0.2);
            if closing > 0.0 && closing < 1.0 {
                hairline(&mut frame, Point::new(centre.x, cut_y), wide * 0.6 * ease_out(closing), alpha(Color::WHITE, 0.5 * (1.0 - closing)), 1.5);
            }
        }

        if !self.calm {
            let settled = ease_out(span(t, UNDERLINE.0, UNDERLINE.1));
            hairline(
                &mut frame,
                Point::new(centre.x, centre.y + 52.0),
                wide * 0.36 * settled,
                alpha(mix(p.pink.fill, p.cyan.fill, 0.4), 0.85 * staying),
                1.5,
            );
        }

        let line = match (self.waiting, self.outro) {
            (Some(waited), _) => ease_out(span(waited, LINE_DELAY.as_secs_f32(), LINE_DELAY.as_secs_f32() + 0.4)),
            (None, Some(_)) if self.line_shown => staying,
            _ => 0.0,
        };
        self.wait_line(&mut frame, centre, line);

        vec![frame.into_geometry()]
    }
}

/// The opening scene, over the whole window. During the hand-over it only carries the
/// travelling wordmark, above the dashboard.
pub fn view<'a>(splash: &Splash, flags: Flags, slot: Option<Point>, live: bool, ctx: &Ctx) -> Element<'a, Message> {
    let now = Instant::now();
    canvas::Canvas::new(Scene {
        time: splash.time(now),
        waiting: splash.waiting(now),
        outro: splash.outro(now),
        percent: splash.percent,
        line_shown: splash.line_shown(),
        status: ctx.tr.t(splash.message_key(flags)),
        calm: splash.calm(),
        slot,
        live,
        ctx: *ctx,
    })
    .width(Fill)
    .height(Fill)
    .into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn curves_start_at_zero_and_end_at_one() {
        for curve in [ease_out, ease_in, ease_in_out, ease_out_expo, spring] {
            assert!(curve(0.0).abs() < 0.001);
            assert!((curve(1.0) - 1.0).abs() < 0.001);
        }
    }

    #[test]
    fn spring_overshoots_a_little_then_settles() {
        let peak = (0..=100).map(|step| spring(step as f32 / 100.0)).fold(0.0, f32::max);
        assert!(peak > 1.04 && peak < 1.15, "peak {peak}");
    }

    #[test]
    fn cards_come_in_one_after_the_other_and_all_arrive() {
        for step in 0..=20 {
            let progress = step as f32 / 20.0;
            for index in 1..6 {
                assert!(card_entrance(progress, index) <= card_entrance(progress, index - 1));
            }
        }
        for index in 0..6 {
            assert_eq!(card_entrance(0.0, index), 0.0);
            assert_eq!(card_entrance(1.0, index), 1.0);
        }
        assert_eq!(bar_entrance(1.0), 1.0);
        assert_eq!(rise(1.0), 0.0);
        assert!(rise(0.0) > 30.0);
    }

    #[test]
    fn scatter_is_stable_and_in_range() {
        for index in 0..PETALS {
            let value = scatter(index, 3.0);
            assert!((0.0..1.0).contains(&value));
            assert_eq!(value, scatter(index, 3.0));
        }
    }

    #[test]
    fn the_cut_falls_inside_the_blade_sweep_and_the_intro() {
        assert!(BLADE.0 < CUT && CUT < BLADE.1);
        assert!(UNDERLINE.1 <= crate::splash::INTRO.as_secs_f32());
    }
}
