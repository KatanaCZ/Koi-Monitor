//! Dashboard view: CPU, RAM, GPU, network, DNS and drivers cards.

use iced::widget::{canvas, column, container, row, scrollable, text, Space};
use iced::{Border, Element, Fill, FillPortion, Padding};

use super::charts::{AreaChart, CoreSpectrum, DualAreaChart};
use super::icons::{icon, Icon};
use super::kit::{badge, caption, card, detail_tile, header, inset_style, mono, Ctx, GAP};
use super::{dns, drivers};
use crate::app::{App, Message};
use crate::backend::system::{InterfaceKind, NetworkInterface};
use crate::theme::{alpha, GEIST_SEMIBOLD};

/// Height of the CPU / RAM / GPU cards (`h-[380px]`).
const METRIC_CARD_HEIGHT: f32 = 380.0;

/// Identifies the dashboard scroll area.
pub const SCROLL_ID: &str = "dashboard";

/// "AMD Ryzen 7 7800X3D 8-Core Processor" → "AMD Ryzen 7 7800X3D".
pub fn normalize_cpu_name(raw: &str) -> String {
    let mut words: Vec<&str> = raw.split_whitespace().collect();

    if words.last().is_some_and(|w| w.eq_ignore_ascii_case("processor")) {
        words.pop();
    }
    // Drop a trailing core count: "8-Core", "8 Cores", "8 Cœurs"… but never a bare "Core".
    if let Some(last) = words.last().map(|w| w.to_lowercase()) {
        let unit = last.trim_start_matches(|c: char| c.is_ascii_digit() || c == '-');
        let is_numeric = |w: &str| !w.is_empty() && w.chars().all(|c| c.is_ascii_digit());

        if matches!(unit, "core" | "cores" | "cœur" | "cœurs" | "coeur" | "coeurs") {
            if last.starts_with(|c: char| c.is_ascii_digit()) {
                words.pop();
            } else if words.len() >= 2 && is_numeric(words[words.len() - 2]) {
                words.truncate(words.len() - 2);
            }
        }
    }

    words.join(" ")
}

fn gigabytes(bytes: u64) -> String {
    format!("{:.1} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
}

fn cpu_card<'a>(app: &'a App, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let tr = ctx.tr;
    let cpu = app.system.as_ref().map(|s| &s.cpu);

    let name = cpu.map(|c| normalize_cpu_name(&c.name)).unwrap_or_else(|| if tr.is_french() { "Chargement..." } else { "Loading..." }.to_string());
    let usage = cpu.map(|c| c.usage).unwrap_or(0.0);

    let mut badges = row![badge(format!("{usage:.1}%"), p.pink, ctx)].spacing(8).align_y(iced::Center);
    if let Some(temperature) = cpu.and_then(|c| c.temperature) {
        badges = badges.push(badge(format!("{temperature:.0}°C"), p.pink, ctx));
    }

    let cores: &[f32] = cpu.map(|c| c.per_core_usage.as_slice()).unwrap_or(&[]);
    let core_count = cpu.map(|c| c.cores).unwrap_or(0);

    card(
        column![
            header(Icon::Cpu, "CPU", Some(name), p.pink, Some(badges.into()), ctx),
            canvas(AreaChart { history: &app.cpu_history, color: p.pink.fill }).width(Fill).height(128),
            Space::new().height(Fill),
            column![
                caption(&tr.tf("cpu_cores", &[("count", &core_count)]), ctx),
                canvas(CoreSpectrum {
                    cache: &app.cores_cache,
                    usage: cores,
                    color: p.pink.fill,
                    trough: p.spectrum_trough,
                    border: p.border,
                })
                .width(Fill)
                .height(80),
            ]
            .spacing(8),
        ]
        .spacing(16),
        ctx,
    )
    .width(Fill)
    .height(METRIC_CARD_HEIGHT)
    .into()
}

/// "Corsair × 2", or the distinct module names joined with " · ".
fn ram_modules_subtitle(app: &App) -> Option<String> {
    let modules = &app.system.as_ref()?.memory.modules;
    let names: Vec<&str> = modules.iter().map(|m| m.name.trim()).filter(|n| !n.is_empty()).collect();

    let mut unique: Vec<&str> = Vec::new();
    for name in &names {
        if !unique.contains(name) {
            unique.push(name);
        }
    }

    match unique.as_slice() {
        [] => None,
        [single] if modules.len() > 1 => Some(format!("{single} × {}", modules.len())),
        [single] => Some(single.to_string()),
        many => Some(many.join(" · ")),
    }
}

fn ram_card<'a>(app: &'a App, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let tr = ctx.tr;
    let memory = app.system.as_ref().map(|s| &s.memory);
    let usage = memory.map(|m| m.usage_percent).unwrap_or(0.0);

    card(
        column![
            header(
                Icon::MemoryStick,
                "RAM",
                ram_modules_subtitle(app),
                p.cyan,
                Some(badge(format!("{usage:.1}%"), p.cyan, ctx)),
                ctx,
            ),
            canvas(AreaChart { history: &app.ram_history, color: p.cyan.fill }).width(Fill).height(128),
            Space::new().height(Fill),
            row![
                detail_tile(tr.t("ram_used"), mono(gigabytes(memory.map(|m| m.used).unwrap_or(0)), 14.0, p.cyan.text), ctx),
                detail_tile(
                    tr.t("ram_available"),
                    mono(gigabytes(memory.map(|m| m.available).unwrap_or(0)), 14.0, p.cyan.text),
                    ctx,
                ),
            ]
            .spacing(16),
        ]
        .spacing(16),
        ctx,
    )
    .width(Fill)
    .height(METRIC_CARD_HEIGHT)
    .into()
}

fn gpu_card<'a>(app: &'a App, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let tr = ctx.tr;
    // On dual-GPU machines, show the adapter actually under load.
    let gpu = app
        .system
        .as_ref()
        .and_then(|s| s.gpu.iter().max_by(|a, b| a.usage.total_cmp(&b.usage)));

    let name = gpu.map(|g| g.name.clone()).unwrap_or_else(|| tr.t("gpu_info_unavailable").to_string());
    let usage = gpu.map(|g| g.usage).unwrap_or(0.0);
    let used = gpu.map(|g| g.memory_used).unwrap_or(0);
    let total = gpu.map(|g| g.memory_total).unwrap_or(0);

    let usage_label = if usage == 0.0 { "- %".to_string() } else { format!("{usage:.1}%") };
    let mut badges = row![badge(usage_label, p.purple, ctx)].spacing(8).align_y(iced::Center);
    if let Some(temperature) = gpu.and_then(|g| g.temperature) {
        badges = badges.push(badge(format!("{temperature:.0}°C"), p.purple, ctx));
    }

    card(
        column![
            header(Icon::Monitor, "GPU", Some(name), p.purple, Some(badges.into()), ctx),
            canvas(AreaChart { history: &app.gpu_history, color: p.purple.fill }).width(Fill).height(128),
            Space::new().height(Fill),
            row![
                detail_tile(
                    tr.t("gpu_vram_available"),
                    mono(gigabytes(total.saturating_sub(used)), 14.0, p.purple.text),
                    ctx,
                ),
                detail_tile(tr.t("gpu_vram_used"), mono(gigabytes(used), 14.0, p.purple.text), ctx),
            ]
            .spacing(16),
        ]
        .spacing(16),
        ctx,
    )
    .width(Fill)
    .height(METRIC_CARD_HEIGHT)
    .into()
}

// --- network ----------------------------------------------------------------

/// The interface carrying the most traffic, and how many others are up.
struct ActiveConnection<'a> {
    interface: &'a NetworkInterface,
    extra_count: usize,
}

fn active_connection(interfaces: &[NetworkInterface]) -> Option<ActiveConnection<'_>> {
    let interface = interfaces.iter().max_by_key(|i| i.received + i.transmitted)?;
    Some(ActiveConnection { interface, extra_count: interfaces.len() - 1 })
}

fn connection_icon(kind: InterfaceKind) -> Icon {
    match kind {
        InterfaceKind::Wifi => Icon::Wifi,
        InterfaceKind::Ethernet => Icon::EthernetPort,
        InterfaceKind::Other => Icon::Globe,
    }
}

/// Windows names many adapters just "Ethernet" or "Wi-Fi": not worth repeating next to the type.
fn is_generic_interface_name(name: &str) -> bool {
    let normalized = name.to_lowercase().replace('\u{2011}', "-").replace('é', "e");
    matches!(
        normalized.trim(),
        "ethernet" | "wi-fi" | "wifi" | "wlan" | "network" | "reseau" | "connexion au reseau local" | "local area connection"
    )
}

fn network_subtitle(app: &App, connection: Option<&ActiveConnection<'_>>, french: bool) -> String {
    let Some(connection) = connection else {
        return if french { "Aucune interface détectée" } else { "No interface detected" }.to_string();
    };

    let kind = connection.interface.kind;
    let short_label = match (kind, french) {
        (InterfaceKind::Wifi, _) => "Wi‑Fi",
        (InterfaceKind::Ethernet, _) => "Ethernet",
        (InterfaceKind::Other, true) => "Réseau",
        (InterfaceKind::Other, false) => "Network",
    };

    // Prefer the hardware name found by the driver scan ("Intel(R) Ethernet Controller I226-V").
    let is_wifi_name = |name: &str| {
        let n = name.to_lowercase();
        ["wi-fi", "wifi", "wlan", "wireless", "802.11"].iter().any(|needle| n.contains(needle))
    };
    let network_drivers = || app.drivers.iter().filter(|d| d.category == "Network");
    let adapter = match kind {
        InterfaceKind::Wifi => network_drivers().find(|d| is_wifi_name(&d.name)),
        InterfaceKind::Ethernet => network_drivers().find(|d| !is_wifi_name(&d.name)),
        InterfaceKind::Other => None,
    }
    .map(|d| d.name.clone())
    .or_else(|| (!is_generic_interface_name(&connection.interface.name)).then(|| connection.interface.name.clone()))
    .or_else(|| network_drivers().next().map(|d| d.name.clone()));

    let mut subtitle = match adapter {
        Some(adapter) => format!("{short_label} · {adapter}"),
        None if french => format!("{short_label} actif"),
        None => format!("{short_label} active"),
    };
    if connection.extra_count > 0 {
        let plural = if connection.extra_count > 1 { "s" } else { "" };
        let other = if french { "autre" } else { "other" };
        subtitle.push_str(&format!(" · +{} {other}{plural}", connection.extra_count));
    }
    subtitle
}

/// (value, unit) for a throughput in MB/s.
pub fn format_speed(megabytes_per_second: f64, french: bool) -> (String, &'static str) {
    if megabytes_per_second < 1.0 {
        (format!("{:.1}", megabytes_per_second * 1024.0), if french { "Ko/s" } else { "KB/s" })
    } else {
        (format!("{megabytes_per_second:.2}"), if french { "Mo/s" } else { "MB/s" })
    }
}

fn format_total(bytes: u64) -> String {
    let bytes = bytes as f64;
    const MB: f64 = 1024.0 * 1024.0;
    if bytes < MB {
        format!("{:.1} KB", bytes / 1024.0)
    } else if bytes < MB * 1024.0 {
        format!("{:.1} MB", bytes / MB)
    } else {
        format!("{:.2} GB", bytes / (MB * 1024.0))
    }
}

fn throughput_tile<'a>(
    glyph: Icon,
    label: &str,
    speed: f64,
    total: u64,
    neon: crate::theme::Neon,
    ctx: &Ctx,
) -> Element<'a, Message> {
    let p = ctx.p;
    let (value, unit) = format_speed(speed, ctx.tr.is_french());

    container(
        column![
            row![icon(glyph, 12.0, neon.text), caption(label, ctx)].spacing(8).align_y(iced::Center),
            row![
                text(value).size(14).font(crate::theme::MONO_BOLD).color(neon.text),
                text(unit).size(10).font(GEIST_SEMIBOLD).color(p.text_muted),
            ]
            .spacing(4)
            .align_y(iced::Bottom),
            row![
                text(ctx.tr.t("net_total")).size(11).color(p.text_muted),
                text(format_total(total)).size(11).font(crate::theme::MONO).color(p.foreground),
            ]
            .spacing(4),
        ]
        .spacing(8),
    )
    .padding(16)
    .width(Fill)
    .style(move |_| inset_style(&p, 16.0))
    .into()
}

fn network_card<'a>(app: &'a App, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let tr = ctx.tr;
    let network = app.system.as_ref().map(|s| &s.network);
    let connection = network.and_then(|n| active_connection(&n.interfaces));

    let glyph = connection.as_ref().map(|c| connection_icon(c.interface.kind)).unwrap_or(Icon::Globe);
    let subtitle = network_subtitle(app, connection.as_ref(), tr.is_french());

    card(
        column![
            header(glyph, tr.t("net_title"), Some(subtitle), p.turquoise, None, ctx),
            canvas(DualAreaChart {
                download: &app.download_history,
                upload: &app.upload_history,
                download_color: p.turquoise.fill,
                upload_color: p.green.fill,
            })
            .width(Fill)
            .height(Fill),
            row![
                throughput_tile(
                    Icon::Download,
                    tr.t("net_reception"),
                    network.map(|n| n.download_speed).unwrap_or(0.0),
                    network.map(|n| n.total_received).unwrap_or(0),
                    p.turquoise,
                    ctx,
                ),
                throughput_tile(
                    Icon::Upload,
                    tr.t("net_emission"),
                    network.map(|n| n.upload_speed).unwrap_or(0.0),
                    network.map(|n| n.total_transmitted).unwrap_or(0),
                    p.green,
                    ctx,
                ),
            ]
            .spacing(16),
        ]
        .spacing(16),
        ctx,
    )
    .width(Fill)
    .height(Fill)
    .into()
}

pub fn view<'a>(app: &'a App, ctx: &Ctx) -> Element<'a, Message> {
    let p = ctx.p;
    let dns_height = dns::card_height(app);

    let content = column![
        row![cpu_card(app, ctx), ram_card(app, ctx), gpu_card(app, ctx)].spacing(GAP),
        row![
            container(network_card(app, ctx)).width(FillPortion(1)),
            container(dns::card(app, ctx, false)).width(FillPortion(2)),
        ]
        .spacing(GAP)
        .height(dns_height),
        drivers::card(app, ctx, false),
    ]
    .spacing(GAP)
    // Room for the cards' drop shadows inside the scroll area.
    .padding(Padding { top: 0.0, right: 32.0, bottom: 32.0, left: 32.0 });

    scrollable(container(container(content).max_width(1280.0 + 64.0)).center_x(Fill))
        .id(SCROLL_ID)
        .direction(scrollable::Direction::Vertical(
            scrollable::Scrollbar::new().width(6).scroller_width(6).margin(4),
        ))
        .style(move |_, status| {
            let hovered = matches!(status, scrollable::Status::Hovered { .. } | scrollable::Status::Dragged { .. });
            let rail = scrollable::Rail {
                background: None,
                border: Border::default(),
                scroller: scrollable::Scroller {
                    background: alpha(p.foreground, if hovered { 0.30 } else { 0.14 }).into(),
                    border: iced::border::rounded(3),
                },
            };
            scrollable::Style {
                container: container::Style::default(),
                vertical_rail: rail,
                horizontal_rail: rail,
                gap: None,
                auto_scroll: scrollable::AutoScroll {
                    background: p.card_solid.into(),
                    border: Border::default(),
                    shadow: iced::Shadow::default(),
                    icon: p.foreground,
                },
            }
        })
        .width(Fill)
        .height(Fill)
        .into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cpu_name_drops_core_count_and_processor_suffix() {
        assert_eq!(normalize_cpu_name("AMD Ryzen 7 7800X3D 8-Core Processor"), "AMD Ryzen 7 7800X3D");
        assert_eq!(normalize_cpu_name("Intel(R) Core(TM) i7-13700K"), "Intel(R) Core(TM) i7-13700K");
        assert_eq!(normalize_cpu_name("AMD Ryzen 9 5950X 16 Cores Processor"), "AMD Ryzen 9 5950X");
        assert_eq!(normalize_cpu_name("Some CPU Processor"), "Some CPU");
    }

    #[test]
    fn speeds_switch_unit_at_one_megabyte() {
        assert_eq!(format_speed(0.5, true), ("512.0".to_string(), "Ko/s"));
        assert_eq!(format_speed(2.345, false), ("2.35".to_string(), "MB/s"));
    }
}
