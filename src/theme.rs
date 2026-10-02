//! Colour tokens and fonts — the `:root` / `[data-theme="dark"]` variables of `globals.css`.

use iced::font::{Family, Weight};
use iced::{Color, Font};

use crate::settings::{NeonGlow, SakuraColor, ThemeMode};

pub const GEIST: Font = Font { family: Family::Name("Geist"), weight: Weight::Normal, ..Font::DEFAULT };
pub const GEIST_MEDIUM: Font = Font { weight: Weight::Medium, ..GEIST };
pub const GEIST_SEMIBOLD: Font = Font { weight: Weight::Semibold, ..GEIST };
pub const GEIST_BOLD: Font = Font { weight: Weight::Bold, ..GEIST };
/// Figures and data (`.mono-text`).
pub const MONO: Font = Font { family: Family::Name("JetBrains Mono Medium"), weight: Weight::Medium, ..Font::DEFAULT };
pub const MONO_BOLD: Font = Font { family: Family::Name("JetBrains Mono"), weight: Weight::Bold, ..Font::DEFAULT };
pub const MONO_SEMIBOLD: Font =
    Font { family: Family::Name("JetBrains Mono SemiBold"), weight: Weight::Semibold, ..Font::DEFAULT };
/// The Zen clock.
pub const MONO_EXTRALIGHT: Font =
    Font { family: Family::Name("JetBrains Mono ExtraLight"), weight: Weight::ExtraLight, ..Font::DEFAULT };
pub const MONO_LIGHT: Font = Font { family: Family::Name("JetBrains Mono Light"), weight: Weight::Light, ..Font::DEFAULT };

pub const FONT_FILES: [&[u8]; 9] = [
    include_bytes!("../assets/fonts/geist-sans-400.ttf"),
    include_bytes!("../assets/fonts/geist-sans-500.ttf"),
    include_bytes!("../assets/fonts/geist-sans-600.ttf"),
    include_bytes!("../assets/fonts/geist-sans-700.ttf"),
    include_bytes!("../assets/fonts/jetbrains-mono-200.ttf"),
    include_bytes!("../assets/fonts/jetbrains-mono-300.ttf"),
    include_bytes!("../assets/fonts/jetbrains-mono-500.ttf"),
    include_bytes!("../assets/fonts/jetbrains-mono-600.ttf"),
    include_bytes!("../assets/fonts/jetbrains-mono-700.ttf"),
];

pub const fn rgb(hex: u32) -> Color {
    Color {
        r: ((hex >> 16) & 0xff) as f32 / 255.0,
        g: ((hex >> 8) & 0xff) as f32 / 255.0,
        b: (hex & 0xff) as f32 / 255.0,
        a: 1.0,
    }
}

pub const fn rgba(hex: u32, a: f32) -> Color {
    Color { a, ..rgb(hex) }
}

pub fn alpha(color: Color, a: f32) -> Color {
    Color { a, ..color }
}

/// `color-mix(in srgb, a t%, b)`.
pub fn mix(a: Color, b: Color, t: f32) -> Color {
    Color {
        r: a.r * t + b.r * (1.0 - t),
        g: a.g * t + b.g * (1.0 - t),
        b: a.b * t + b.b * (1.0 - t),
        a: a.a * t + b.a * (1.0 - t),
    }
}

/// A neon hue: `fill` for shapes and glows, `text` for readable (AAA) labels.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Neon {
    pub fill: Color,
    pub text: Color,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Palette {
    pub mode: ThemeMode,
    pub background: Color,
    pub foreground: Color,
    pub text_muted: Color,
    pub text_subtle: Color,
    pub border: Color,
    pub border_strong: Color,
    pub surface_inset: Color,
    pub surface_muted: Color,
    pub surface_raised: Color,
    pub card_solid: Color,
    pub glass_surface: Color,
    pub overlay: Color,
    pub ring_track: Color,
    pub spectrum_trough: Color,
    pub pink: Neon,
    pub cyan: Neon,
    pub purple: Neon,
    pub turquoise: Neon,
    pub green: Neon,
    pub warning: Neon,
    pub error: Neon,
}

const WHITE: Color = Color::WHITE;

const DARK: Palette = Palette {
    mode: ThemeMode::Dark,
    background: rgb(0x090514),
    foreground: rgb(0xf4ecf9),
    text_muted: rgb(0xc8bfd0),
    text_subtle: rgb(0xd8d0de),
    border: Color { a: 0.08, ..WHITE },
    border_strong: Color { a: 0.14, ..WHITE },
    surface_inset: Color { a: 0.05, ..WHITE },
    surface_muted: Color { a: 0.08, ..WHITE },
    surface_raised: rgba(0x1c1038, 0.55),
    card_solid: rgb(0x110926),
    glass_surface: rgba(0x110926, 0.4),
    overlay: rgba(0x000000, 0.55),
    ring_track: Color { a: 0.06, ..WHITE },
    spectrum_trough: rgba(0xff9ecf, 0.085),
    pink: Neon { fill: rgb(0xff2d95), text: rgb(0xff80bf) },
    cyan: Neon { fill: rgb(0x00d4ff), text: rgb(0x00d4ff) },
    purple: Neon { fill: rgb(0xb24dff), text: rgb(0xd499ff) },
    turquoise: Neon { fill: rgb(0x00fff7), text: rgb(0x00fff7) },
    green: Neon { fill: rgb(0x00ff9d), text: rgb(0x00ff9d) },
    warning: Neon { fill: rgb(0xfbbf24), text: rgb(0xfcd34d) },
    error: Neon { fill: rgb(0xf87171), text: rgb(0xfca5a5) },
};

const LIGHT: Palette = Palette {
    mode: ThemeMode::Light,
    background: rgb(0xe4e8f2),
    foreground: rgb(0x100818),
    text_muted: rgb(0x3a3348),
    text_subtle: rgb(0x2a2436),
    border: rgba(0x1f0d2c, 0.13),
    border_strong: rgba(0x2b1040, 0.19),
    surface_inset: rgb(0xe8ecf6),
    surface_muted: rgb(0xdce2ef),
    surface_raised: rgb(0xf7f8fd),
    card_solid: rgb(0xf7f8fd),
    glass_surface: rgba(0xf7f8fd, 0.88),
    overlay: rgba(0x100818, 0.5),
    ring_track: rgb(0xacd3e7),
    spectrum_trough: rgb(0xf7f0f9),
    pink: Neon { fill: rgb(0xff2d95), text: rgb(0x7a0042) },
    cyan: Neon { fill: rgb(0x00d4ff), text: rgb(0x003844) },
    purple: Neon { fill: rgb(0x9d4edd), text: rgb(0x5510a8) },
    turquoise: Neon { fill: rgb(0x00fff7), text: rgb(0x003836) },
    green: Neon { fill: rgb(0x00ff9d), text: rgb(0x004d30) },
    warning: Neon { fill: rgb(0xf59e0b), text: rgb(0x6b3000) },
    error: Neon { fill: rgb(0xef4444), text: rgb(0x7f0d0d) },
};

impl Palette {
    pub fn of(mode: ThemeMode) -> Self {
        match mode {
            ThemeMode::Dark => DARK,
            ThemeMode::Light => LIGHT,
        }
    }

    pub fn is_dark(&self) -> bool {
        self.mode == ThemeMode::Dark
    }

    /// UI accent driven by the Sakura tint (`data-accent`).
    pub fn accent(&self, color: SakuraColor) -> Neon {
        match color {
            SakuraColor::Pink => self.pink,
            SakuraColor::Purple => self.purple,
            SakuraColor::Blue => self.cyan,
            SakuraColor::Green => self.green,
        }
    }
}

/// Opacity of the halo drawn behind neon text, the native stand-in for `getNeonTextShadow`.
pub fn neon_glow_alpha(glow: NeonGlow, is_dark: bool) -> f32 {
    match (glow, is_dark) {
        (NeonGlow::Soft, true) => 0.10,
        (NeonGlow::Soft, false) => 0.22,
        (NeonGlow::Balanced, true) => 0.20,
        (NeonGlow::Balanced, false) => 0.34,
        (NeonGlow::Vivid, true) => 0.34,
        (NeonGlow::Vivid, false) => 0.46,
    }
}
