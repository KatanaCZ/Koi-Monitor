# Koi Monitor — native UI

The Windows system monitor, rewritten without a browser engine: one Rust process,
[iced](https://iced.rs) for the interface and wgpu (Direct3D 12) for the rendering.
It replaces the Tauri + React + WebView2 application in `src/` and `src-tauri/`.

## Why

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
cd native
cargo run --release          # or: cargo build --release
cargo test
cargo clippy
```

The executable is `native\target\x86_64-pc-windows-msvc\release\koi-monitor.exe`:
portable, nothing else to ship. Settings live in
`%LOCALAPPDATA%\com.koi.monitor\settings.json`.

## Layout

| Path | Role |
|---|---|
| `src/backend/` | Windows telemetry and diagnostics, no UI types. `dns`, `drivers*`, `gaming_latency`, `memory`, `security` are the Tauri modules unchanged; `system.rs` is the telemetry loop that lived in `src-tauri/src/lib.rs`. |
| `src/gfx/` | The atmosphere, one WGSL shader: aura backdrop, sakura petals, Zen pond, glass surfaces. |
| `src/ui/` | Views: dashboard cards, Zen, settings, overlays, splash, desktop widget. They read state and return widgets. |
| `src/app.rs` | State, messages, update loop, windows (dashboard, desktop widget) and tray. |
| `src/alerts.rs`, `zen_state.rs`, `splash.rs`, `notify.rs` | Logic ported from the TypeScript utilities, with their tests. |
| `src/audio.rs`, `tray.rs` | Music thread (rodio) and notification-area icon, each on its own thread. |
| `assets/` | Fonts, icons and strings **generated** from the web sources (see below). |

### How the glass works

There is no blur pass. The backdrop (aura, petals) is drawn by the shader; each glass
surface repaints the backdrop inside its own bounds, draws the petals again blurred
and dimmed, then lays its tint, sheen, border and shadow on top. Petal motion is
computed in the vertex shader from a static instance buffer, so a frame costs a few
small uniform uploads and a handful of draw calls.

### Generated assets

```powershell
node native/tools/gen-assets.mjs     # i18n.json from src/utils/translations.ts, Lucide icons
python native/tools/gen-fonts.py     # TTF fonts from @fontsource (pip install fonttools)
```

Both read from the web project (`src/`, `node_modules/`). Icons for the window, the tray
and the executable come from `src-tauri/icons/`, the music from `public/audio/`.

## Opening the app in a given state

`KOI_DEV_STATE` takes comma-separated tokens, handy for screenshots and manual checks.
A session started this way never writes the settings file.

```powershell
$env:KOI_DEV_STATE = 'mute,no-splash,no-onboarding,zen'; cargo run --release
```

`mute` · `no-splash` · `onboarding` / `no-onboarding` · `dark` / `light` · `zen` / `dashboard` ·
`zen-bar` · `expand-dns` / `expand-drivers` · `gaming-details` · `scroll-end` ·
`settings-general|visual|network|alerts|about` · `notifications` · `toast` ·
`widget-koi` / `widget-zen` · `tray`

## Differences from the web version

- **Frosted glass** is the approximation described above, not a real backdrop blur.
- **Motion** is simpler: no spring entrances, no 3D tilt on cards, no cross-fades between
  views; the katana title intro is a blade sweep rather than the full split-and-rejoin.
- **Accessibility**: iced exposes no accessibility tree yet, so screen readers do not see
  the interface, and keyboard navigation is limited to Escape and text fields.
- **Charts** have no hover tooltip.
- **Desktop widget** is a small rounded window, not a transparent pill, and a double
  click (not a single one) reopens the dashboard, since a single press drags it.
- **Zen quote** is not italic (Geist has no italic face).
- The Zen mood tracker no longer gets stuck on "Zen" when the load jumps straight from
  idle to a game (a bug of the web version, see `zen_state.rs`).
