//! Canvas drawings: history area charts and the CPU core spectrum.
//!
//! Geometry is cached and only re-tessellated when a new sample arrives, so the
//! 30 FPS atmosphere never redraws the charts.

use iced::mouse;
use iced::widget::canvas::{self, gradient, Cache, Frame, Geometry, LineCap, LineJoin, Path, Stroke};
use iced::{Color, Point, Rectangle, Renderer, Size, Theme};
use std::collections::VecDeque;

use crate::theme::{alpha, Palette, MONO};

/// Bound the history and its rendering cost during long sessions.
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

/// Monotone interpolation avoids inventing peaks between measured samples.
fn monotone_tangents(points: &[Point]) -> Vec<f32> {
    let n = points.len();
    let slope = |a: Point, b: Point| {
        let h = b.x - a.x;
        if h != 0.0 {
            (b.y - a.y) / h
        } else {
            0.0
        }
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

/// Leave room for the stroke at the edges.
fn plot_area(size: Size) -> Rectangle {
    Rectangle { x: 5.0, y: 5.0, width: (size.width - 10.0).max(0.0), height: (size.height - 10.0).max(0.0) }
}

fn draw_guides(frame: &mut Frame, palette: Palette) {
    let area = plot_area(frame.size());
    for fraction in [0.25, 0.5, 0.75] {
        let y = area.y + area.height * fraction;
        frame.stroke(
            &Path::line(Point::new(area.x, y), Point::new(area.x + area.width, y)),
            Stroke::default().with_color(palette.border).with_width(1.0),
        );
    }
}

/// Single 0–100 % history (CPU, RAM, GPU).
pub struct AreaChart<'a> {
    pub history: &'a History,
    pub color: Color,
    pub palette: Palette,
}

fn sample_at(x: f32, area: Rectangle, count: usize) -> Option<usize> {
    if count == 0 || area.width <= 0.0 {
        return None;
    }
    Some((((x - area.x) / area.width).clamp(0.0, 1.0) * (count - 1) as f32).round() as usize)
}

// The hover layer is separate: moving the pointer never rebuilds the curves.
fn draw_inspection(frame: &mut Frame, index: usize, count: usize, label: String, palette: Palette) {
    let area = plot_area(frame.size());
    let x = area.x + area.width * index as f32 / count.saturating_sub(1).max(1) as f32;
    frame.stroke(
        &Path::line(Point::new(x, area.y), Point::new(x, area.y + area.height)),
        Stroke::default().with_color(alpha(palette.foreground, 0.45)).with_width(1.0),
    );
    let width = (label.chars().count() as f32 * 7.5 + 20.0).min(frame.width());
    let left = (x - width / 2.0).clamp(0.0, (frame.width() - width).max(0.0));
    let bubble = Path::rounded_rectangle(Point::new(left, 6.0), Size::new(width, 30.0), 8.0.into());
    frame.fill(&bubble, palette.card_solid);
    frame.stroke(&bubble, Stroke::default().with_color(palette.border_strong));
    frame.fill_text(canvas::Text {
        content: label,
        position: Point::new(left + 10.0, 13.0),
        color: palette.foreground,
        size: 12.0.into(),
        font: MONO,
        ..Default::default()
    });
}

fn hover_update<Message>(
    selected: &mut Option<usize>,
    event: &canvas::Event,
    bounds: Rectangle,
    cursor: mouse::Cursor,
    count: usize,
) -> Option<iced::widget::Action<Message>> {
    if !matches!(event, canvas::Event::Mouse(mouse::Event::CursorMoved { .. } | mouse::Event::CursorLeft)) {
        return None;
    }
    let next = cursor.position_in(bounds).and_then(|point| sample_at(point.x, plot_area(bounds.size()), count));
    if *selected == next {
        return None;
    }
    *selected = next;
    Some(iced::widget::Action::request_redraw())
}

impl<Message> canvas::Program<Message> for AreaChart<'_> {
    type State = Option<usize>;

    fn update(
        &self,
        state: &mut Self::State,
        event: &canvas::Event,
        bounds: Rectangle,
        cursor: mouse::Cursor,
    ) -> Option<iced::widget::Action<Message>> {
        hover_update(state, event, bounds, cursor, self.history.len())
    }

    fn draw(
        &self,
        _state: &Self::State,
        renderer: &Renderer,
        _theme: &Theme,
        bounds: Rectangle,
        cursor: mouse::Cursor,
    ) -> Vec<Geometry> {
        let mut layers = vec![self.history.cache.draw(renderer, bounds.size(), |frame| {
            draw_guides(frame, self.palette);
            draw_area(frame, self.history, plot_area(frame.size()), 100.0, self.color, 0.5);
        })];
        if let Some(index) = cursor
            .position_in(bounds)
            .and_then(|point| sample_at(point.x, plot_area(bounds.size()), self.history.len()))
        {
            let mut overlay = Frame::new(renderer, bounds.size());
            draw_inspection(
                &mut overlay,
                index,
                self.history.len(),
                format!("{:.1} %", self.history.values[index]),
                self.palette,
            );
            layers.push(overlay.into_geometry());
        }
        layers
    }
}

/// Download and upload throughput on a shared, auto-scaled axis.
pub struct DualAreaChart<'a> {
    pub download: &'a History,
    pub upload: &'a History,
    pub download_color: Color,
    pub upload_color: Color,
    pub palette: Palette,
    pub french: bool,
}

impl<Message> canvas::Program<Message> for DualAreaChart<'_> {
    type State = Option<usize>;

    fn update(
        &self,
        state: &mut Self::State,
        event: &canvas::Event,
        bounds: Rectangle,
        cursor: mouse::Cursor,
    ) -> Option<iced::widget::Action<Message>> {
        hover_update(state, event, bounds, cursor, self.download.len().min(self.upload.len()))
    }

    fn draw(
        &self,
        _state: &Self::State,
        renderer: &Renderer,
        _theme: &Theme,
        bounds: Rectangle,
        cursor: mouse::Cursor,
    ) -> Vec<Geometry> {
        // Both series are pushed together, so the download cache covers the pair.
        let mut layers = vec![self.download.cache.draw(renderer, bounds.size(), |frame| {
            draw_guides(frame, self.palette);
            let area = plot_area(frame.size());
            // Headroom above the peak; never tighter than ~50 KB/s so idle noise stays flat.
            let ceiling = self.download.max().max(self.upload.max()).max(0.05) * 1.1;
            draw_area(frame, self.download, area, ceiling, self.download_color, 0.4);
            draw_area(frame, self.upload, area, ceiling, self.upload_color, 0.4);
        })];
        let count = self.download.len().min(self.upload.len());
        if let Some(index) =
            cursor.position_in(bounds).and_then(|point| sample_at(point.x, plot_area(bounds.size()), count))
        {
            let (down, down_unit) = super::format::format_speed(self.download.values[index] as f64, self.french);
            let (up, up_unit) = super::format::format_speed(self.upload.values[index] as f64, self.french);
            let mut overlay = Frame::new(renderer, bounds.size());
            draw_inspection(
                &mut overlay,
                index,
                count,
                format!("↓ {down} {down_unit}  ↑ {up} {up_unit}"),
                self.palette,
            );
            layers.push(overlay.into_geometry());
        }
        layers
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

            let trough =
                Path::rounded_rectangle(Point::new(0.5, 0.5), Size::new(width - 1.0, height - 1.0), 16.0.into());
            frame.fill(&trough, self.trough);
            frame.stroke(&trough, Stroke::default().with_color(self.border).with_width(1.0));

            let cores = &self.usage[..self.usage.len().min(32)];
            if cores.is_empty() {
                return;
            }

            // Cap the height so wide cards do not exaggerate small loads.
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inspection_handles_empty_and_single_sample_histories() {
        let area = plot_area(Size::new(200.0, 128.0));
        assert_eq!(sample_at(90.0, area, 0), None);
        assert_eq!(sample_at(90.0, area, 1), Some(0));
        assert_eq!(sample_at(0.0, plot_area(Size::ZERO), 10), None);
    }

    #[test]
    fn inspection_selects_nearest_sample_and_clamps_at_edges() {
        let area = plot_area(Size::new(210.0, 128.0));
        assert_eq!(sample_at(-10.0, area, 5), Some(0));
        assert_eq!(sample_at(105.0, area, 5), Some(2));
        assert_eq!(sample_at(204.0, area, 5), Some(4));
        assert_eq!(sample_at(500.0, area, 5), Some(4));
    }

    #[test]
    fn history_discards_oldest_samples_in_order() {
        let mut history = History::new();
        for value in 0..MAX_HISTORY_POINTS + 3 {
            history.push(value as f32);
        }
        assert_eq!(history.len(), MAX_HISTORY_POINTS);
        assert_eq!(history.values.front(), Some(&3.0));
        assert_eq!(history.values.back(), Some(&((MAX_HISTORY_POINTS + 2) as f32)));
    }

    #[test]
    fn hover_redraws_only_when_selection_changes() {
        let bounds = Rectangle::new(Point::ORIGIN, Size::new(210.0, 128.0));
        let position = Point::new(105.0, 60.0);
        let event = canvas::Event::Mouse(mouse::Event::CursorMoved { position });
        let cursor = mouse::Cursor::Available(position);
        let mut selected = None;

        assert!(hover_update::<()>(&mut selected, &event, bounds, cursor, 5).is_some());
        assert_eq!(selected, Some(2));
        assert!(hover_update::<()>(&mut selected, &event, bounds, cursor, 5).is_none());
        assert!(hover_update::<()>(
            &mut selected,
            &canvas::Event::Mouse(mouse::Event::CursorLeft),
            bounds,
            mouse::Cursor::Unavailable,
            5,
        )
        .is_some());
        assert_eq!(selected, None);
    }
}
