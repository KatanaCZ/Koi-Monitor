//! Desktop widget: a small always-on-top window with the key figures ("pills").

use iced::widget::{button, column, container, mouse_area, row, rule, text, Space};
use iced::{Border, Color, Element, Fill, Padding, Size};

use super::icons::{icon, Icon};
use super::kit::Ctx;
use crate::app::{App, Message};
use crate::settings::WidgetMode;
use crate::theme::{alpha, GEIST_BOLD};

/// Window size for each style.
pub fn window_size(mode: WidgetMode) -> Size {
    match mode {
        WidgetMode::Koi => Size::new(356.0, 92.0),
        WidgetMode::Zen => Size::new(286.0, 52.0),
    }
}

fn metric<'a>(glyph: Icon, label: &'a str, value: String, color: Color, ctx: &Ctx) -> Element<'a, Message> {
    column![
        icon(glyph, 18.0, color),
        text(label).size(9).font(GEIST_BOLD).color(ctx.p.text_subtle),
        text(value).size(14).font(GEIST_BOLD).color(color),
    ]
    .spacing(5)
    .align_x(iced::Center)
    .width(52)
    .into()
}

pub fn view<'a>(app: &'a App, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let system = app.system.as_ref();
    let cpu = system.map(|s| s.cpu.usage).unwrap_or(0.0);
    let ram = system.map(|s| s.memory.usage_percent).unwrap_or(0.0);
    let gpu = system.map(|s| s.gpu.iter().map(|g| g.usage).fold(0.0, f32::max)).unwrap_or(0.0);
    let ping = app.gaming.internet_ms;

    let content: Element<'a, Message> = match app.settings.desktop_widget_mode {
        WidgetMode::Koi => {
            let divider = rule::vertical(1).style(move |_| rule::Style {
                color: p.border,
                radius: 0.0.into(),
                fill_mode: rule::FillMode::Full,
                snap: true,
            });
            row![
                metric(Icon::Cpu, "CPU", format!("{cpu:.0}%"), p.pink.fill, ctx),
                metric(Icon::MemoryStick, "RAM", format!("{ram:.0}%"), p.cyan.fill, ctx),
                metric(Icon::MonitorPlay, "GPU", format!("{gpu:.0}%"), p.purple.fill, ctx),
                container(divider).height(40),
                metric(Icon::Gamepad, "PING", if ping >= 0.0 { format!("{ping:.0}") } else { "---".to_string() }, p.green.fill, ctx),
            ]
            .spacing(22)
            .align_y(iced::Center)
            .into()
        }
        WidgetMode::Zen => {
            let figure = |value: String, color: Color| text(value).size(15).font(GEIST_BOLD).color(color);
            let bar = || text("|").size(15).color(p.border_strong);
            row![
                figure(format!("{cpu:.0}%"), p.pink.fill),
                bar(),
                figure(format!("{ram:.0}%"), p.cyan.fill),
                bar(),
                figure(format!("{gpu:.0}%"), p.purple.fill),
                bar(),
                figure(if ping >= 0.0 { format!("{ping:.0}ms") } else { "---".to_string() }, p.green.fill),
            ]
            .spacing(12)
            .align_y(iced::Center)
            .into()
        }
    };

    let close = button(container(icon(Icon::X, 12.0, Color::WHITE)).center_x(Fill).center_y(Fill))
        .width(20)
        .height(20)
        .padding(0)
        .on_press(Message::CloseWidget)
        .style(|_, status| button::Style {
            background: Some(
                if matches!(status, button::Status::Hovered | button::Status::Pressed) {
                    crate::theme::rgba(0xef4444, 0.8)
                } else {
                    Color { a: 0.4, ..Color::BLACK }
                }
                .into(),
            ),
            border: iced::border::rounded(10),
            ..button::Style::default()
        });

    // Drag the pill anywhere; a double click brings the dashboard back.
    let body = mouse_area(container(content).center_y(Fill).width(Fill))
        .on_press(Message::DragWidget)
        .on_double_click(Message::ShowMainWindow)
        .interaction(iced::mouse::Interaction::Grab);

    container(row![body, close, Space::new().width(2)].spacing(8).align_y(iced::Center))
        .padding(Padding { top: 0.0, right: 10.0, bottom: 0.0, left: 22.0 })
        .width(Fill)
        .height(Fill)
        .style(move |_| container::Style {
            background: Some(p.card_solid.into()),
            border: Border { color: alpha(p.border_strong, p.border_strong.a), width: 1.0, radius: 0.0.into() },
            ..container::Style::default()
        })
        .into()
}
