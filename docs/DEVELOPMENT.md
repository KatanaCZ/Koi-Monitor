# Koi Monitor — development

The Windows system monitor as one Rust process, without a browser engine:
[iced](https://iced.rs) for the interface and wgpu (Direct3D 12) for the rendering.
It replaces the Tauri + React + WebView2 application of versions 1.x, whose source
remains available under the `v1.1.9` tag.

## Why native

Koi is meant to stay visible on a secondary monitor. Measured on the same machine
(Ryzen 7 7800X3D, RX 7900 XTX, dashboard visible, sakura animated):

| | v1.1.9 (WebView2) | native |
|---|---|---|
| Processes | 9 | 1 |
| CPU | ~10 % of the machine | ~0.5 % |
| GPU | ~18 % | ~1 % |
| Working set | 750–810 MB | ~120 MB |
| Private memory | 700–830 MB | ~225 MB |
| Window minimised / in the tray | unchanged when minimised | 44 MB working set, 0 % CPU in the tray |

## Build and run

Requires Rust (stable, MSVC) and the Visual Studio Build Tools (C++ workload).

```powershell
cargo run --release          # or: cargo build --release
cargo test
cargo clippy --all-targets
```

The executable is `target\x86_64-pc-windows-msvc\release\koi-monitor.exe`:
portable, nothing else to ship.

## Files on the user's machine

Everything lives in `%LOCALAPPDATA%\com.koi.monitor\`:

| File | Content |
|---|---|
| `settings.json` | Preferences. A value that cannot be read falls back to its default on its own. |
| `settings.corrupt.json` | Copy of a settings file that was not JSON at all, kept before defaults replaced it. |
| `koi.log` | Warnings and errors (Koi has no console). Starts afresh once it passes 256 KB. |

Only one Koi runs per session: a second launch brings the first one back and exits.

## Layout

| Path | Role |
|---|---|
| `src/backend/` | Windows telemetry and diagnostics, no UI types. `system.rs` is the telemetry loop; `subprocess.rs` runs PowerShell and pnputil under a timeout. |
| `src/gfx/` | The atmosphere, one WGSL shader: aura backdrop, sakura petals, Zen pond, glass surfaces. |
| `src/ui/` | Views: dashboard cards, Zen, settings, overlays, splash, desktop widget. They read state and return widgets. |
| `src/app.rs` | State, messages, update loop, windows (dashboard, desktop widget) and tray. |
| `src/alerts.rs`, `zen_state.rs`, `splash.rs`, `notify.rs` | Alert, mood, opening-screen and notification logic, with their tests. |
| `src/audio.rs`, `tray.rs` | Music thread (rodio) and notification-area icon, each on its own thread. |
| `src/settings.rs`, `logger.rs`, `single_instance.rs` | Preferences on disk, the log file, the one-instance lock. |
| `assets/` | `i18n.json` (French and English strings), `icons/` (Lucide SVG), `fonts/`, `audio/`, `app/` (window, tray and executable icons). All embedded in the executable. |

### How the glass works

There is no blur pass. The backdrop (aura, petals) is drawn by the shader; each glass
surface repaints the backdrop inside its own bounds, draws the petals again blurred
and dimmed, then lays its tint, sheen, border and shadow on top. Petal motion is
computed in the vertex shader from a static instance buffer, so a frame costs a few
small uniform uploads and a handful of draw calls.

### Strings

`assets/i18n.json` holds two tables, `fr` and `en`. A key missing in French falls back
to English, then to the key itself. Add a string to both tables.

## Opening the app in a given state

`KOI_DEV_STATE` takes comma-separated tokens, handy for screenshots and manual checks.
A session started this way never writes the settings file and may run next to the
real Koi.

```powershell
$env:KOI_DEV_STATE = 'mute,no-splash,no-onboarding,zen'; cargo run --release
```

`mute` · `no-splash` · `onboarding` / `no-onboarding` · `dark` / `light` · `zen` / `dashboard` ·
`zen-bar` · `expand-dns` / `expand-drivers` · `gaming-details` · `scroll-end` ·
`settings-general|visual|network|alerts|about` · `notifications` · `toast` ·
`widget-koi` / `widget-zen` · `tray` · `splash-at=<seconds>`

`splash-at=1.4` holds the opening screen 1.4 s in (the cut); past 3 s it is the
hand-over to the dashboard, which lasts 1.1 s.

### The opening screen

`src/splash.rs` keeps time: a 3 s title intro, a wait for the first telemetry sample
and DNS test only if they are late (a progress line then appears), and a 1.1 s
hand-over. The driver scan is not waited for. `src/ui/splash.rs` draws it on a canvas
at the display's refresh rate.

iced has no opacity for a group of widgets. The dashboard fades in by being drawn with
a faded palette (`Ctx::entering`, `Palette::faded`), one context per card; `theme::alpha`
is relative for that reason, and a colour from outside the palette goes through
`Palette::fading`. With calm motion, or Windows animations turned off, the title only
fades in and out.

## Differences from the 1.x web version

- **Frosted glass** is the approximation described above, not a real backdrop blur.
- **Motion** is simpler: no 3D tilt on cards, no cross-fades between views. The opening
  screen is the exception: it was redone for the native version.
- **Accessibility**: iced exposes no accessibility tree yet, so screen readers do not see
  the interface, and keyboard navigation is limited to Escape and text fields.
- **Charts** have no hover tooltip.
- **Desktop widget** is a small rounded window, not a transparent pill, and a double
  click (not a single one) reopens the dashboard, since a single press drags it.
- **Zen quote** is not italic (Geist has no italic face).
- The Zen mood tracker no longer gets stuck on "Zen" when the load jumps straight from
  idle to a game (a bug of the web version, see `zen_state.rs`).
