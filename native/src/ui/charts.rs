//! Canvas drawings: history area charts and the CPU core spectrum.
//!
//! Geometry is cached and only re-tessellated when a new sample arrives, so the
//! 30 FPS atmosphere never redraws the charts.

use iced::mouse;
use iced::widget::canvas::{self, gradient, Cache, Frame, Geometry, LineCap, LineJoin, Path, Stroke};
use iced::{Color, Point, Rectangle, Renderer, Size, Theme};
use std::collections::VecDeque;

use crate::theme::alpha;

/// Samples kept per metric, as in `historyRing.ts`.
pub const MAX_HISTORY_POINTS: usize = 288;

/// A metric's recent samples and the cached geometry of the chart showing them.
pub struct History {
    values: VecDeque<f32>,
    pub cache: Cache,
}

impl History {
    pub fn new() -> Self {
        Self { values: VecDeque::with_capacity(MAX_HISTORY_POINTS), cache: Cache::new() }
    }

    pub fn push(&mut self, value: f32) {
        if self.values.len() == MAX_HISTORY_POINTS {
            self.values.pop_front();
        }
        self.values.push_back(value);
        self.cache.clear();
    }

    pub fn len(&self) -> usize {
        self.values.len()
    }

    pub fn max(&self) -> f32 {
        self.values.iter().copied().fold(0.0, f32::max)
    }

    pub fn iter(&self) -> impl Iterator<Item = f32> + '_ {
        self.values.iter().copied()
    }
}

/// Tangents of a monotone cubic through `points` (d3's `curveMonotoneX`, what Recharts draws).
fn monotone_tangents(points: &[Point]) -> Vec<f32> {
    let n = points.len();
    let slope = |a: Point, b: Point| {
        let h = b.x - a.x;
        if h != 0.0 { (b.y - a.y) / h } else { 0.0 }
    };

    let mut tangents = vec![0.0; n];
    for i in 1..n - 1 {
        let (h0, h1) = (points[i].x - points[i - 1].x, points[i + 1].x - points[i].x);
        let (s0, s1) = (slope(points[i - 1], points[i]), slope(points[i], points[i + 1]));
        let p = (s0 * h1 + s1 * h0) / (h0 + h1);
        tangents[i] = (s0.signum() + s1.signum()) * s0.abs().min(s1.abs()).min(0.5 * p.abs());
        if !tangents[i].is_finite() {
            tangents[i] = 0.0;
        }
    }
    tangents[0] = (3.0 * slope(points[0], points[1]) - tangents[1]) / 2.0;
    tangents[n - 1] = (3.0 * slope(points[n - 2], points[n - 1]) - tangents[n - 2]) / 2.0;
    tangents
}

fn curve_through(builder: &mut canvas::path::Builder, points: &[Point]) {
    if points.len() < 3 {
        for point in &points[1..] {
            builder.line_to(*point);
        }
        return;
    }

    let tangents = monotone_tangents(points);
    for i in 0..points.len() - 1 {
        let (a, b) = (points[i], points[i + 1]);
        let dx = (b.x - a.x) / 3.0;
        builder.bezier_curve_to(
            Point::new(a.x + dx, a.y + dx * tangents[i]),
            Point::new(b.x - dx, b.y - dx * tangents[i + 1]),
            b,
        );
    }
}

/// Area under `history`, stretched across `area`; `ceiling` is the value at the top edge.
fn draw_area(frame: &mut Frame, history: &History, area: Rectangle, ceiling: f32, color: Color, fill_alpha: f32) {
    let count = history.len();
    if count < 2 || ceiling <= 0.0 {
        return;
    }

    let step = area.width / (count - 1) as f32;
    let points: Vec<Point> = history
        .iter()
        .enumerate()
        .map(|(i, value)| {
            let ratio = (value / ceiling).clamp(0.0, 1.0);
            Point::new(area.x + i as f32 * step, area.y + area.height * (1.0 - ratio))
        })
        .collect();

    let bottom = area.y + area.height;
    let fill = Path::new(|builder| {
        builder.move_to(Point::new(points[0].x, bottom));
        builder.line_to(points[0]);
        curve_through(builder, &points);
        builder.line_to(Point::new(points[count - 1].x, bottom));
        builder.close();
    });
    frame.fill(
        &fill,
        gradient::Linear::new(Point::new(0.0, area.y), Point::new(0.0, bottom))
            .add_stop(0.05, alpha(color, fill_alpha))
            .add_stop(0.95, alpha(color, 0.0)),
    );

    let line = Path::new(|builder| {
        builder.move_to(points[0]);
        curve_through(builder, &points);
    });
    frame.stroke(
        &line,
        Stroke::default()
            .with_color(color)
            .with_width(2.0)
            .with_line_cap(LineCap::Round)
            .with_line_join(LineJoin::Round),
    );
}

/// Recharts leaves 5 px around the plot.
fn plot_area(size: Size) -> Rectangle {
    Rectangle { x: 5.0, y: 5.0, width: (size.width - 10.0).max(0.0), height: (size.height - 10.0).max(0.0) }
}

/// Single 0–100 % history (CPU, RAM, GPU).
pub struct AreaChart<'a> {
    pub history: &'a History,
    pub color: Color,
}

impl<Message> canvas::Program<Message> for AreaChart<'_> {
    type State = ();

    fn draw(
        &self,
        _state: &Self::State,
        renderer: &Renderer,
        _theme: &Theme,
        bounds: Rectangle,
        _cursor: mouse::Cursor,
    ) -> Vec<Geometry> {
        vec![self.history.cache.draw(renderer, bounds.size(), |frame| {
            draw_area(frame, self.history, plot_area(frame.size()), 100.0, self.color, 0.5);
        })]
    }
}

/// Download and upload throughput on a shared, auto-scaled axis.
pub struct DualAreaChart<'a> {
    pub download: &'a History,
    pub upload: &'a History,
    pub download_color: Color,
    pub upload_color: Color,
}

impl<Message> canvas::Program<Message> for DualAreaChart<'_> {
    type State = ();

    fn draw(
        &self,
        _state: &Self::State,
        renderer: &Renderer,
        _theme: &Theme,
        bounds: Rectangle,
        _cursor: mouse::Cursor,
    ) -> Vec<Geometry> {
        // Both series are pushed together, so the download cache covers the pair.
        vec![self.download.cache.draw(renderer, bounds.size(), |frame| {
            let area = plot_area(frame.size());
            // Headroom above the peak; never tighter than ~50 KB/s so idle noise stays flat.
            let ceiling = self.download.max().max(self.upload.max()).max(0.05) * 1.1;
            draw_area(frame, self.download, area, ceiling, self.download_color, 0.4);
            draw_area(frame, self.upload, area, ceiling, self.upload_color, 0.4);
        })]
    }
}

/// CPU per-core "equalizer": one bar per logical core.
pub struct CoreSpectrum<'a> {
    pub cache: &'a Cache,
    pub usage: &'a [f32],
    pub color: Color,
    pub trough: Color,
    pub border: Color,
}

impl<Message> canvas::Program<Message> for CoreSpectrum<'_> {
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
            let Size { width, height } = frame.size();

            let trough = Path::rounded_rectangle(Point::new(0.5, 0.5), Size::new(width - 1.0, height - 1.0), 16.0.into());
            frame.fill(&trough, self.trough);
            frame.stroke(&trough, Stroke::default().with_color(self.border).with_width(1.0));

            let cores = &self.usage[..self.usage.len().min(32)];
            if cores.is_empty() {
                return;
            }

            // `px-3 py-2 gap-1`, bars grow from the bottom up to 64 px.
            let (pad_x, pad_y, gap) = (12.0, 8.0, 4.0);
            let bar_width = ((width - pad_x * 2.0 - gap * (cores.len() - 1) as f32) / cores.len() as f32).max(1.0);
            let bottom = height - pad_y;
            let max_height = (height - pad_y * 2.0).min(64.0);

            for (index, usage) in cores.iter().enumerate() {
                let bar_height = (usage / 100.0 * max_height).clamp(4.0, max_height);
                let x = pad_x + index as f32 * (bar_width + gap);
                let top = bottom - bar_height;

                // Soft halo, then the bar itself.
                let halo = Path::rounded_rectangle(
                    Point::new(x - 2.0, top - 2.0),
                    Size::new(bar_width + 4.0, bar_height + 4.0),
                    3.0.into(),
                );
                frame.fill(&halo, alpha(self.color, 0.10));

                let bar = Path::rounded_rectangle(Point::new(x, top), Size::new(bar_width, bar_height), 2.0.into());
                frame.fill(
                    &bar,
                    gradient::Linear::new(Point::new(0.0, bottom), Point::new(0.0, top))
                        .add_stop(0.0, alpha(self.color, 0.3))
                        .add_stop(1.0, self.color),
                );
            }
        })]
    }
}
