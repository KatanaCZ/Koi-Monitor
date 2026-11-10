//! Drivers analysis card (`DriversWidget`, `DriverTile`, `DriverDetailPanel`, `DriverVersionCompare`).

use iced::widget::{button, column, container, row, text, Space};
use iced::{Border, Color, Element, Fill, Padding, Shadow};

use super::dns::header_button;
use super::icons::{icon, Icon};
use super::kit::{self, caption, icon_tile, inset_style, Ctx};
use crate::app::{App, Expanded, Message, SettingsTab};
use crate::backend::driver_status::{INSTALLED, UNKNOWN, UPDATE_AVAILABLE, UPDATE_SOURCE_DRIVER_STORE, UPDATE_SOURCE_WINDOWS, VERIFY_ONLINE};
use crate::backend::drivers::DriverInfo;
use crate::theme::{alpha, mix, rgb, GEIST_BOLD, GEIST_MEDIUM, GEIST_SEMIBOLD, MONO, MONO_BOLD};

/// Placeholder entry the scan returns when it finds nothing.
const EMPTY_DRIVERS_BACKEND_NAME: &str = "No hardware drivers detected";

const SKY: u32 = 0x0ea5e9;

pub fn is_empty_list(drivers: &[DriverInfo]) -> bool {
    drivers.is_empty() || (drivers.len() == 1 && drivers[0].name == EMPTY_DRIVERS_BACKEND_NAME)
}

pub fn driver_key(driver: &DriverInfo) -> String {
    format!("{}-{}", driver.name, driver.version)
}

// --- versions ---------------------------------------------------------------

/// Human-readable form of a WMI driver version; `None` when there is none.
///
/// Some vendors report a packed integer (`3202151234` → `32.2.15.12`).
fn format_version(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed == "N/A" {
        return None;
    }

    if trimmed.len() >= 8 && trimmed.bytes().all(|b| b.is_ascii_digit()) {
        let (major, rest) = trimmed.split_at(trimmed.len() - 8);
        let part = |range: std::ops::Range<usize>| rest[range].parse::<u32>().ok();
        if let (Ok(major), Some(a), Some(b), Some(c)) = (major.parse::<u64>(), part(0..2), part(2..4), part(4..6)) {
            return Some(format!("{major}.{a}.{b}.{c}"));
        }
    }

    Some(trimmed.to_string())
}

fn installed_label(version: &str, ctx: &Ctx) -> String {
    match format_version(version) {
        Some(version) => format!("v{version}"),
        None => ctx.tr.t("drivers_version_not_detected").to_string(),
    }
}

/// A newer version was found by Windows Update or in the driver store.
pub fn has_update(driver: &DriverInfo) -> bool {
    !driver.latest_version.trim().is_empty() && format_version(&driver.latest_version) != format_version(&driver.version)
}

fn version_segments(version: &str) -> Vec<String> {
    format_version(version).map(|v| v.split('.').map(str::to_string).collect()).unwrap_or_default()
}

/// A version with the segments that differ from the other side highlighted.
fn version_highlight<'a>(version: &str, other: &str, available: bool, size: f32, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let segments = version_segments(version);
    let other = version_segments(other);
    if segments.is_empty() {
        return text(ctx.tr.t("drivers_version_not_detected")).size(size).font(MONO).color(p.text_muted).into();
    }

    let tone = if available { if p.is_dark() { p.fading(rgb(0x7dd3fc)) } else { p.fading(rgb(0x0284c7)) } } else { p.purple.text };
    let highlight = if available { rgb(SKY) } else { p.purple.fill };

    let mut line = row![text("v").size(size).font(MONO_BOLD).color(tone)].align_y(iced::Center);
    for (index, segment) in segments.iter().enumerate() {
        if index > 0 {
            line = line.push(text(".").size(size).font(MONO_BOLD).color(alpha(tone, 0.6)));
        }
        let label = text(segment.clone()).size(size).font(MONO_BOLD).color(tone);
        if other.get(index) != Some(segment) {
            line = line.push(container(label).padding(Padding::from([0, 2])).style(move |_| container::Style {
                background: Some(alpha(highlight, 0.20).into()),
                border: Border { color: alpha(highlight, 0.35), width: 1.0, radius: 4.0.into() },
                ..container::Style::default()
            }));
        } else {
            line = line.push(label);
        }
    }
    line.into()
}

/// Installed → available, side by side (`inline`) or stacked.
fn version_compare<'a>(driver: &DriverInfo, inline: bool, compact: bool, ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let (label_size, value_size, padding) = if compact { (8.0, 10.0, Padding::from([4, 8])) } else { (10.0, 14.0, Padding::from([8, 12])) };
    let sky = rgb(SKY);

    let block = |label: &str, label_color: Color, value: Element<'a, Message>, available: bool| {
        container(column![text(label.to_uppercase()).size(label_size).font(GEIST_BOLD).color(label_color), value].spacing(4))
            .padding(padding)
            .style(move |_| container::Style {
                background: Some(if available { alpha(sky, 0.10) } else { alpha(p.surface_raised, 0.7) }.into()),
                border: Border { color: if available { alpha(sky, 0.35) } else { p.border }, width: 1.0, radius: 12.0.into() },
                shadow: if available { Shadow { color: alpha(sky, 0.12), offset: [0.0, 0.0].into(), blur_radius: 16.0 } } else { Shadow::default() },
                ..container::Style::default()
            })
    };

    let installed = block(
        tr.t("drivers_version_label_installed"),
        p.text_subtle,
        version_highlight(&driver.version, &driver.latest_version, false, value_size, ctx),
        false,
    );
    let available = block(
        tr.t("drivers_version_label_available"),
        if p.is_dark() { p.fading(rgb(0x38bdf8)) } else { p.fading(rgb(0x0284c7)) },
        version_highlight(&driver.latest_version, &driver.version, true, value_size, ctx),
        true,
    );

    if inline {
        row![installed, text("→").size(12).color(p.text_subtle), available].spacing(8).align_y(iced::Center).into()
    } else {
        column![
            installed.width(Fill),
            container(icon(Icon::ArrowDown, if compact { 12.0 } else { 14.0 }, alpha(sky, 0.8))).center_x(Fill),
            available.width(Fill),
        ]
        .spacing(if compact { 6 } else { 8 })
        .into()
    }
}

// --- tiles ------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq)]
enum Density {
    Default,
    Compact,
    Ultra,
}

fn density_for(count: usize) -> Density {
    if count >= 9 {
        Density::Ultra
    } else if count > 3 {
        Density::Compact
    } else {
        Density::Default
    }
}

fn status_label(driver: &DriverInfo, ctx: &Ctx) -> String {
    let key = if has_update(driver) {
        "drivers_status_update"
    } else {
        match driver.status.as_str() {
            INSTALLED => "drivers_status_installed",
            UPDATE_AVAILABLE => "drivers_status_update",
            VERIFY_ONLINE => "drivers_status_verify",
            UNKNOWN => "drivers_status_unknown",
            other => return other.to_string(),
        }
    };
    ctx.tr.t(key).to_string()
}

/// (text, background, border) of a status chip.
fn status_colors(driver: &DriverInfo, ctx: &Ctx) -> (Color, Color, Color) {
    let p = ctx.p;
    let dark = p.is_dark();
    let tone = |hex: u32, dark_text: u32, light_text: u32| {
        (if dark { rgb(dark_text) } else { rgb(light_text) }, alpha(rgb(hex), 0.10), alpha(rgb(hex), 0.20))
    };

    if has_update(driver) || driver.status == UPDATE_AVAILABLE {
        tone(SKY, 0x38bdf8, 0x0284c7)
    } else if driver.status == INSTALLED {
        tone(0x10b981, 0x34d399, 0x059669)
    } else if driver.status == VERIFY_ONLINE {
        (p.warning.text, mix(p.warning.fill, p.surface_inset, 0.12), mix(p.warning.fill, p.border, 0.28))
    } else {
        (p.text_muted, p.surface_inset, p.border_strong)
    }
}

fn status_chip<'a>(driver: &DriverInfo, size: f32, pill: bool, ctx: &Ctx) -> Element<'a, Message> {
    let (color, background, border) = status_colors(driver, ctx);
    container(text(status_label(driver, ctx).to_uppercase()).size(size).font(GEIST_BOLD).color(color))
        .padding(if pill { Padding::from([4, 10]) } else { Padding::from([2, 6]) })
        .style(move |_| container::Style {
            background: Some(background.into()),
            border: Border { color: border, width: 1.0, radius: if pill { 999.0 } else { 4.0 }.into() },
            ..container::Style::default()
        })
        .into()
}

/// "AMD" / "NV" / "IN" for a graphics driver from a known vendor.
fn gpu_vendor(driver: &DriverInfo) -> Option<(&'static str, u32, u32, u32)> {
    if driver.category != "Graphics" {
        return None;
    }
    let hay = format!("{} {}", driver.name, driver.provider).to_lowercase();
    let has_word = |word: &str| hay.split(|c: char| !c.is_alphanumeric()).any(|w| w == word);

    // (label, brand colour, dark text, light text)
    if has_word("nvidia") || hay.contains("geforce") || hay.contains("quadro") || has_word("rtx") || has_word("gtx") {
        Some(("NV", 0x76b900, 0x9ad926, 0x5a9200))
    } else if has_word("amd") || hay.contains("radeon") || hay.contains("advanced micro devices") {
        Some(("AMD", 0xed1c24, 0xff5c5c, 0xe8323c))
    } else if has_word("intel") {
        Some(("IN", 0x0071c5, 0x4da3e8, 0x0068b5))
    } else {
        None
    }
}

fn category_icon<'a>(driver: &DriverInfo, box_size: f32, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let glyph_size = box_size / 2.0;

    if let Some((label, brand, dark_text, light_text)) = gpu_vendor(driver) {
        let brand = rgb(brand);
        return container(
            text(label).size((box_size / 4.0).max(8.0)).font(MONO_BOLD).color(if p.is_dark() { rgb(dark_text) } else { rgb(light_text) }),
        )
        .center_x(box_size)
        .center_y(box_size)
        .style(move |_| container::Style {
            background: Some(alpha(brand, 0.12).into()),
            border: Border { color: alpha(brand, 0.40), width: 1.0, radius: 8.0.into() },
            ..container::Style::default()
        })
        .into();
    }

    let (glyph, color) = match driver.category.as_str() {
        "Graphics" => (Icon::Monitor, p.fading(rgb(0x3b82f6))),
        "Network" => (Icon::Wifi, p.fading(rgb(0x10b981))),
        "Storage" => (Icon::HardDrive, p.fading(rgb(0xf59e0b))),
        "Audio" => (Icon::Volume, p.fading(rgb(0xa855f7))),
        "Bluetooth" => (Icon::Bluetooth, p.fading(rgb(0x06b6d4))),
        "Firmware" => (Icon::Cpu, p.text_muted),
        _ => (Icon::Box, p.text_subtle),
    };

    container(icon(glyph, glyph_size, color))
        .center_x(box_size)
        .center_y(box_size)
        .style(move |_| container::Style {
            background: Some(p.surface_raised.into()),
            border: Border { color: p.border, width: 1.0, radius: 8.0.into() },
            ..container::Style::default()
        })
        .into()
}

fn display_name(driver: &DriverInfo, ctx: &Ctx) -> String {
    if driver.name == EMPTY_DRIVERS_BACKEND_NAME {
        ctx.tr.t("drivers_empty_label").to_string()
    } else {
        driver.name.clone()
    }
}

fn tile<'a>(driver: &DriverInfo, density: Density, essential: bool, selectable: bool, selected: bool, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let update = has_update(driver);
    let ultra = density == Density::Ultra;
    let compact = density != Density::Default;
    let minimal = essential || compact;
    let name = display_name(driver, ctx);

    let content: Element<'a, Message> = if minimal {
        // One line: icon, name, status (plus the version in the dense full-scan grid).
        let mut identity = row![].spacing(if ultra { 6 } else { 8 }).align_y(iced::Center).width(Fill);
        if update {
            identity = identity.push(icon(Icon::Crown, if ultra { 10.0 } else { 12.0 }, p.warning.text));
        }
        identity = identity
            .push(category_icon(driver, if ultra { 28.0 } else { 32.0 }, ctx))
            .push(text(name).size(if essential { 14.0 } else if ultra { 10.0 } else { 12.0 }).font(GEIST_SEMIBOLD).color(p.foreground));

        row![identity, status_chip(driver, if ultra { 7.0 } else { 8.0 }, false, ctx)]
            .spacing(8)
            .align_y(iced::Center)
            .into()
    } else {
        let mut heading = row![
            category_icon(driver, 40.0, ctx),
            column![
                text(name).size(14).font(GEIST_SEMIBOLD).color(p.foreground),
                text(driver.provider.clone()).size(10).color(p.text_subtle),
            ]
            .spacing(4)
            .width(Fill),
        ]
        .spacing(12)
        .align_y(iced::Center);
        if update {
            heading = heading.push(icon(Icon::Crown, 14.0, p.warning.text));
        }

        if update {
            column![heading, version_compare(driver, false, true, ctx), status_chip(driver, 9.0, true, ctx)].spacing(12).into()
        } else {
            column![
                heading,
                row![
                    text(installed_label(&driver.version, ctx)).size(14).font(MONO_BOLD).color(p.purple.text).width(Fill),
                    status_chip(driver, 8.0, false, ctx),
                ]
                .align_y(iced::Center),
            ]
            .spacing(12)
            .into()
        }
    };

    let padding = if ultra {
        Padding::from([4, 8])
    } else if minimal {
        Padding::from([6, 12])
    } else {
        Padding::from(16)
    };
    let radius = if ultra { 8.0 } else if minimal { 12.0 } else { 16.0 };
    let sky = rgb(SKY);
    let border = if selected {
        alpha(p.purple.fill, 0.50)
    } else if update {
        alpha(sky, 0.35)
    } else {
        p.border
    };
    let glow = if update && !selected { alpha(sky, 0.10) } else { Color::TRANSPARENT };

    if selectable {
        let key = driver_key(driver);
        button(content)
            .padding(padding)
            .width(Fill)
            .on_press(Message::DriverSelect(key))
            .style(move |_, status| button::Style {
                background: Some(if matches!(status, button::Status::Hovered | button::Status::Pressed) { p.surface_muted } else { p.surface_inset }.into()),
                border: Border { color: border, width: 1.0, radius: radius.into() },
                shadow: Shadow { color: glow, offset: [0.0, 0.0].into(), blur_radius: 10.0 },
                text_color: p.foreground,
                ..button::Style::default()
            })
            .into()
    } else {
        container(content)
            .padding(padding)
            .width(Fill)
            .style(move |_| container::Style {
                background: Some(p.surface_inset.into()),
                border: Border { color: border, width: 1.0, radius: radius.into() },
                shadow: Shadow { color: glow, offset: [0.0, 0.0].into(), blur_radius: 10.0 },
                ..container::Style::default()
            })
            .into()
    }
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
            line = line.push(Space::new().width(iced::FillPortion(missing)));
        }
        for cell in cells {
            line = line.push(container(cell).width(iced::FillPortion(2)));
        }
        if missing > 0 {
            line = line.push(Space::new().width(iced::FillPortion(missing)));
        }
        rows = rows.push(line);
    }

    rows.into()
}

// --- essentials -------------------------------------------------------------

fn is_integrated_gpu(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.contains("tm) graphics")
        || lower.contains("integrated graphics")
        || (lower.contains("radeon") && lower.contains("graphics") && !lower.contains("rx "))
}

fn is_ethernet_adapter(name: &str) -> bool {
    let lower = name.to_lowercase();
    ["ethernet", "gbe", "2.5g", "gigabit"].iter().any(|needle| lower.contains(needle))
}

fn is_wifi_adapter(name: &str) -> bool {
    let lower = name.to_lowercase();
    ["wi-fi", "wifi", "wlan", "802.11"].iter().any(|needle| lower.contains(needle))
}

fn primary_driver<'d>(drivers: &'d [DriverInfo], category: &str) -> Option<&'d DriverInfo> {
    let matches = || drivers.iter().filter(move |d| d.category == category);
    match category {
        "Graphics" => matches().find(|d| !is_integrated_gpu(&d.name)).or_else(|| matches().next()),
        "Network" => matches()
            .find(|d| is_ethernet_adapter(&d.name))
            .or_else(|| matches().find(|d| is_wifi_adapter(&d.name)))
            .or_else(|| matches().next()),
        _ => matches().next(),
    }
}

/// What the card shows: the three essentials in simplified mode, everything otherwise.
pub fn visible_drivers(app: &App) -> Vec<&DriverInfo> {
    let drivers = &app.drivers;
    if is_empty_list(drivers) || !app.settings.simplified_mode {
        return drivers.iter().collect();
    }
    let essentials: Vec<&DriverInfo> =
        ["Graphics", "Network", "Bluetooth"].iter().filter_map(|category| primary_driver(drivers, category)).collect();
    if essentials.is_empty() { drivers.iter().collect() } else { essentials }
}

// --- card sections ----------------------------------------------------------

fn header_subtitle(drivers: &[&DriverInfo], simplified: bool, empty: bool, ctx: &Ctx) -> String {
    let tr = ctx.tr;
    let count = drivers.len();
    if empty {
        tr.t("drivers_header_empty").to_string()
    } else if count == 1 && simplified {
        tr.t("drivers_header_one_essential").to_string()
    } else if simplified {
        tr.tf("drivers_header_essentials", &[("count", &count)])
    } else {
        tr.tf("drivers_header_full", &[("count", &count)])
    }
}

fn counted(tr: crate::i18n::Tr, count: usize, one: &'static str, many: &'static str) -> String {
    if count == 1 { tr.t(one).to_string() } else { tr.tf(many, &[("count", &count)]) }
}

fn summary_band<'a>(drivers: &[&DriverInfo], compact: bool, ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let purple = p.purple.fill;

    let installed = drivers.iter().filter(|d| d.status == INSTALLED).count();
    let updates = drivers.iter().filter(|d| has_update(d)).count();
    let verify = drivers.iter().filter(|d| d.status == VERIFY_ONLINE).count();

    let (badge, tone) = if updates > 0 {
        (counted(tr, updates, "drivers_badge_update_one", "drivers_badge_update_many"), p.purple.text)
    } else if verify > 0 {
        (counted(tr, verify, "drivers_badge_verify_one", "drivers_badge_verify_many"), p.fading(rgb(0xf59e0b)))
    } else {
        (tr.t("drivers_badge_all_ok").to_string(), p.green.text)
    };

    let title = match drivers.len() {
        0 => tr.t("drivers_summary_pending").to_string(),
        count => counted(tr, count, "drivers_summary_one_observing", "drivers_summary_many_observing"),
    };

    let mut parts = Vec::new();
    if installed > 0 {
        parts.push(counted(tr, installed, "drivers_summary_stable_one", "drivers_summary_stable_many"));
    }
    if updates > 0 {
        parts.push(counted(tr, updates, "drivers_summary_update_one", "drivers_summary_update_many"));
    }
    if verify > 0 {
        parts.push(counted(tr, verify, "drivers_summary_verify_one", "drivers_summary_verify_many"));
    }
    let subtitle = if parts.is_empty() { tr.t("drivers_summary_scan_start").to_string() } else { parts.join(", ") };

    let tinted = move |radius: f32, strength: f32| container::Style {
        background: Some(alpha(purple, strength).into()),
        border: Border { color: alpha(purple, 0.30), width: 1.0, radius: radius.into() },
        ..container::Style::default()
    };
    let icon_box = if compact { 32.0 } else { 40.0 };

    container(
        row![
            container(icon(Icon::Signal, if compact { 16.0 } else { 20.0 }, tone))
                .center_x(icon_box)
                .center_y(icon_box)
                .style(move |_| container::Style {
                    background: Some(alpha(purple, 0.15).into()),
                    border: iced::border::rounded(if compact { 8 } else { 12 }),
                    ..container::Style::default()
                }),
            column![
                text(title.to_uppercase()).size(if compact { 10 } else { 12 }).font(GEIST_BOLD).color(p.text_subtle),
                text(subtitle).size(if compact { 12 } else { 14 }).font(GEIST_SEMIBOLD).color(tone),
            ]
            .spacing(if compact { 2 } else { 4 })
            .width(Fill),
            container(text(badge).size(if compact { 14 } else { 16 }).font(GEIST_BOLD).color(tone))
                .padding(if compact { Padding::from([4, 12]) } else { Padding::from([8, 16]) })
                .style(move |_| tinted(if compact { 8.0 } else { 12.0 }, 0.15)),
        ]
        .spacing(8)
        .align_y(iced::Center),
    )
    .padding(if compact { Padding::from([8, 12]) } else { Padding::from(16) })
    .width(Fill)
    .style(move |_| tinted(if compact { 12.0 } else { 16.0 }, 0.10))
    .into()
}

fn field<'a>(label: &str, value: impl Into<Element<'a, Message>>, ctx: &Ctx) -> Element<'a, Message> {
    column![text(label.to_uppercase()).size(10).font(GEIST_SEMIBOLD).color(ctx.p.text_subtle), value.into()]
        .spacing(8)
        .width(Fill)
        .into()
}

fn action_button<'a>(label: String, with_icon: bool, tone: Option<Color>, message: Message, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let color = tone.map(|tone| if p.is_dark() { mix(tone, Color::WHITE, 0.75) } else { mix(tone, Color::BLACK, 0.75) }).unwrap_or(p.foreground);
    let mut content = row![].spacing(8).align_y(iced::Center);
    if with_icon {
        content = content.push(icon(Icon::ExternalLink, 16.0, color));
    }
    content = content.push(text(label).size(14).font(GEIST_SEMIBOLD).color(color));

    button(container(content).center_x(Fill).center_y(Fill))
        .width(Fill)
        .height(44)
        .padding(0)
        .on_press(message)
        .style(move |_, status| {
            let hovered = matches!(status, button::Status::Hovered | button::Status::Pressed);
            button::Style {
                background: Some(
                    match tone {
                        Some(tone) => alpha(tone, if hovered { 0.30 } else { 0.20 }),
                        None if hovered => p.surface_muted,
                        None => p.surface_inset,
                    }
                    .into(),
                ),
                border: Border { color: if tone.is_some() { Color::TRANSPARENT } else { p.border }, width: 1.0, radius: 12.0.into() },
                ..button::Style::default()
            }
        })
        .into()
}

/// Comparator, identifiers and update actions for the driver selected in the expanded view.
fn detail_panel<'a>(driver: &DriverInfo, ctx: &Ctx) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let update = has_update(driver);
    let from_windows_update = driver.update_source == UPDATE_SOURCE_WINDOWS;
    let store_only = driver.update_source == UPDATE_SOURCE_DRIVER_STORE;
    let sky = rgb(SKY);

    let mut panel = column![column![
        caption(tr.t("drivers_detail_title"), ctx),
        text(display_name(driver, ctx)).size(16).font(GEIST_SEMIBOLD).color(p.foreground),
        text(driver.provider.clone()).size(12).color(p.text_muted),
    ]
    .spacing(4)]
    .spacing(16);

    if update {
        panel = panel.push(version_compare(driver, true, false, ctx));
    }

    let date = if driver.date != "N/A" { driver.date.clone() } else { tr.t("drivers_date_unspecified").to_string() };
    let category = match driver.category.as_str() {
        "Graphics" => tr.t("drivers_category_graphics"),
        "Network" => tr.t("drivers_category_network"),
        "Bluetooth" => tr.t("drivers_category_bluetooth"),
        "Audio" => tr.t("drivers_category_audio"),
        "Storage" => tr.t("drivers_category_storage"),
        "Firmware" => tr.t("drivers_category_firmware"),
        _ => "",
    };
    let category = if category.is_empty() { driver.category.clone() } else { category.to_string() };

    let date_field = field(tr.t("drivers_detail_installed_date"), text(date).size(14).font(MONO).color(p.foreground), ctx);
    let first_row = if update {
        row![date_field, field(tr.t("drivers_category"), text(category.clone()).size(14).font(GEIST_MEDIUM).color(p.foreground), ctx)]
    } else {
        row![
            field(
                tr.t("drivers_detail_installed_version"),
                text(installed_label(&driver.version, ctx)).size(14).font(MONO_BOLD).color(p.purple.text),
                ctx,
            ),
            date_field,
        ]
    };
    let provider_field = field(tr.t("drivers_provider"), text(driver.provider.clone()).size(14).font(GEIST_MEDIUM).color(p.foreground), ctx);
    let second_row = if update {
        row![provider_field, Space::new().width(Fill)]
    } else {
        row![field(tr.t("drivers_category"), text(category).size(14).font(GEIST_MEDIUM).color(p.foreground), ctx), provider_field]
    };
    panel = panel.push(column![first_row.spacing(16), second_row.spacing(16)].spacing(16));

    if !driver.hardware_id.is_empty() {
        panel = panel.push(field(
            tr.t("drivers_hwid"),
            container(text(driver.hardware_id.clone()).size(11).font(MONO).color(p.text_muted))
                .padding(8)
                .width(Fill)
                .style(move |_| container::Style {
                    background: Some(p.surface_raised.into()),
                    border: Border { color: p.border, width: 1.0, radius: 8.0.into() },
                    ..container::Style::default()
                }),
            ctx,
        ));
    }

    let vendor_label = if driver.update_url.contains("catalog.update.microsoft.com") {
        tr.t("drivers_vendor_catalog")
    } else {
        tr.t("drivers_vendor_manufacturer")
    };

    if update {
        let mut actions = column![].spacing(12);
        if store_only {
            let amber = if p.is_dark() { p.fading(rgb(0xfbbf24)) } else { p.fading(rgb(0xb45309)) };
            actions = actions.push(
                column![
                    text(tr.t("drivers_store_warning_1")).size(11).color(amber),
                    text(tr.t("drivers_store_warning_2")).size(11).color(amber),
                ]
                .spacing(4),
            );
        }
        if from_windows_update {
            actions = actions.push(action_button(tr.t("drivers_btn_open_wu").to_string(), true, Some(sky), Message::OpenWindowsUpdate, ctx));
        }
        if !driver.update_url.is_empty() && (store_only || from_windows_update) {
            actions = actions.push(action_button(
                vendor_label.to_string(),
                true,
                if from_windows_update { None } else { Some(sky) },
                Message::OpenUrl(driver.update_url.clone()),
                ctx,
            ));
        }
        if store_only {
            actions = actions.push(action_button(tr.t("drivers_btn_check_wu").to_string(), false, None, Message::OpenWindowsUpdate, ctx));
        }
        panel = panel.push(actions);
    } else if !driver.update_url.is_empty() {
        let verify = driver.status == VERIFY_ONLINE;
        panel = panel.push(action_button(
            tr.t(if verify { "drivers_btn_confirm_online" } else { "drivers_btn_manufacturer_page" }).to_string(),
            true,
            verify.then(|| p.fading(rgb(0xf59e0b))),
            Message::OpenUrl(driver.update_url.clone()),
            ctx,
        ));
    }

    container(panel).padding(16).width(Fill).style(move |_| inset_style(&p, 16.0)).into()
}

pub fn card<'a>(app: &'a App, ctx: &Ctx, expanded: bool) -> Element<'a, Message> {
    let (p, tr) = (ctx.p, ctx.tr);
    let simplified = app.settings.simplified_mode;
    let drivers = visible_drivers(app);
    let empty = is_empty_list(&app.drivers);
    let density = density_for(drivers.len());
    let compact = drivers.len() > 3;
    let loading = app.drivers_loading;

    let header = row![
        icon_tile(Icon::HardDrive, p.purple.fill),
        column![
            text(tr.t("drivers_widget_title")).size(16).font(GEIST_SEMIBOLD).color(p.foreground),
            text(header_subtitle(&drivers, simplified, empty, ctx)).size(12).color(p.text_muted),
        ]
        .spacing(4)
        .width(Fill),
        header_button(
            Icon::RefreshCw,
            Some(tr.t(if loading { "drivers_scan_loading" } else { "drivers_scan_idle" })),
            false,
            loading,
            Some(Message::DriversRefresh),
            p.purple,
            ctx,
        ),
        header_button(Icon::Settings2, Some(tr.t("dns_customize")), false, false, Some(Message::OpenSettings(Some(SettingsTab::General))), p.purple, ctx),
        header_button(
            if expanded { Icon::Minimize } else { Icon::Maximize },
            None,
            false,
            false,
            Some(Message::Expand(if expanded { None } else { Some(Expanded::Drivers) })),
            p.purple,
            ctx,
        ),
    ]
    .spacing(8)
    .align_y(iced::Center);

    // In the expanded view a driver is always selected: the first with an update, else the first.
    let selected_key = expanded
        .then(|| {
            app.driver_selected
                .clone()
                .filter(|key| drivers.iter().any(|d| &driver_key(d) == key))
                .or_else(|| drivers.iter().find(|d| has_update(d)).or(drivers.first()).map(|d| driver_key(d)))
        })
        .flatten();

    let tiles: Vec<Element<'a, Message>> = drivers
        .iter()
        .map(|driver| {
            let selected = selected_key.as_deref() == Some(driver_key(driver).as_str());
            tile(driver, density, simplified, expanded && !empty, selected, ctx)
        })
        .collect();

    let list: Element<'a, Message> = if simplified && drivers.len() <= 3 {
        iced::widget::Column::with_children(tiles).spacing(8).width(Fill).into()
    } else {
        match density {
            Density::Ultra => grid(tiles, 4, 8.0),
            Density::Compact => grid(tiles, 3, 8.0),
            Density::Default => grid(tiles, drivers.len().max(1), 16.0),
        }
    };

    if expanded {
        let mut body = column![list].spacing(12);
        if let Some(driver) = selected_key.and_then(|key| drivers.iter().find(|d| driver_key(d) == key).copied()) {
            body = body.push(detail_panel(driver, ctx));
        }
        kit::card(column![header, body].spacing(16), ctx).width(Fill).into()
    } else {
        let mut body = column![container(list).center_y(Fill)].spacing(8).height(Fill);
        if !empty {
            body = body.push(summary_band(&drivers, compact, ctx));
        }
        kit::card(column![header, body].spacing(16), ctx).width(Fill).height(380).into()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn packed_wmi_versions_are_unpacked() {
        assert_eq!(format_version("3202151234").as_deref(), Some("32.2.15.12"));
        assert_eq!(format_version("31.0.24033.1003").as_deref(), Some("31.0.24033.1003"));
        assert_eq!(format_version("N/A"), None);
        assert_eq!(format_version("  "), None);
    }

    #[test]
    fn update_requires_a_different_latest_version() {
        let driver = |version: &str, latest: &str| DriverInfo {
            name: "GPU".into(),
            version: version.into(),
            latest_version: latest.into(),
            date: "N/A".into(),
            provider: String::new(),
            status: INSTALLED.into(),
            category: "Graphics".into(),
            hardware_id: String::new(),
            hardware_ids: Vec::new(),
            update_url: String::new(),
            update_source: String::new(),
        };
        assert!(!has_update(&driver("1.2.3", "")));
        assert!(!has_update(&driver("1.2.3", "1.2.3")));
        assert!(has_update(&driver("1.2.3", "1.2.4")));
    }
}
