# Changelog

All notable changes to **Koi Monitor** are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · [SemVer](https://semver.org/).

**GitHub Releases**: only the **For you** section is published to users. **Technical details** is for contributors (see [`docs/marketing-context.md`](docs/marketing-context.md)).

## [Unreleased]

### For you

### Technical details

### Added

### Changed

### Fixed
## [1.1.9] - 2026-06-13

### For you

- **Desktop Widget** — Added a detachable "Pills" widget (Koi mode & Zen mode) that can float anywhere on your desktop.
- **Draggable & Transparent** — The widget is perfectly borderless and transparent. It opens the main dashboard with a single click.
- **Auto System Tray** — The widget automatically appears when Koi Monitor is minimized to the system tray, keeping your metrics in sight without clutter.
- **GPU in Zen Pill** — The Zen pill now includes GPU utilization monitoring along with CPU, RAM, and Ping.

### Technical details

### Added

- **Multi-window architecture** — Added a secondary `widget.html` Vite entry point and a transparent Tauri window configuration (`widget`).
- **`useStorageSync` & `useWidgetSync`** — Custom hooks bridging `localStorage` across isolated Tauri Webviews (Zustand state mirroring) for instant mode swapping.

### Changed

- **Tauri Capabilities** — `default.json` updated to allow IPC events and `startDragging` for the new `"widget"` window.
- **`systemTray.ts`** — Injects `showDesktopWidget: true` upon `hideToTray` to automatically summon the widget.
- **`ZenPill`** — Now tracks and displays GPU usage via the `telemetrySlice`.

### Fixed

- **Transparent Webview Background** — Overrode `globals.css` with `background: transparent !important` in the widget HTML to eliminate WebView2 shadow artifacts on Windows 11.
- **Widget Close Button** — Prevented the widget's native dragging handler (`startDragging`) from intercepting and blocking the close button's click event.
- **Background Process Persistence** — Fixed an issue where the Tauri background process remained active when closing the main app window if the widget window was still open. Quitting the app now securely destroys all running windows.

## [1.1.8] - 2026-06-03

### For you

- **Battery Telemetry** — Added battery percentage and status monitoring specifically for laptops or devices with battery systems (UPS).
- **Dashboard Battery Status** — Displays a beautiful battery chip next to the system uptime on the dashboard when a battery is present.
- **Zen Mode Integration** — Displays battery percentage and charging/low/full indicators in Zen mode below the CPU/GPU/RAM metrics.

### Technical details

### Added

- **`SYSTEM_POWER_STATUS` integration** — Query Windows power status natively in Rust via `GetSystemPowerStatus` in the `windows` crate and expose it through the Zustand store as `battery`.
- **`SystemBatteryChip` component** — Displays the battery percentage, charging, low, and full states (utilizing Lucide's `Battery` / `BatteryCharging` / `BatteryLow` icons and custom pulse animations).
- **`koiSimulateBattery(percentage, charging)` tool** — Added simulation command in the browser dev console to test battery indicators on desktop machines.


## [1.1.7] - 2026-06-02

### For you

- **Scroll Responsiveness** — Fixed a scroll wheel delay when attempting to scroll back up from the absolute top or bottom of the dashboard.
- **Zen Mode** — Click anywhere on the central clock header or the bottom "Escape · Dashboard" button to return to the full dashboard instantly.
- **Zen Default** — The app now remembers your Zen Mode preference. If closed in Zen Mode, it reopens in Zen Mode automatically on next launch.
- **Smoother Tilt** — The 3D movement on bento cards is now much more subtle and 100% glitch-free at the card edges.
- **Calm Motion** — Card 3D tilt is now completely disabled when the "Calm Motion" option is active.

### Technical details

### Added

- **`localStorage` persistence for `zenMode`** — Wired into the Zustand `uiSlice` store to retain the user's view preference across restarts.

### Changed

- **`NeonBentoCard` refactoring** — Decoupled the stable flat hover event-detecting parent container from the inner GPU-accelerated 3D rotating card, eliminating pointer loss loop glitches at the card boundaries.
- **Subtle 3D Tilt** — Reduced maximum tilt angle on bento cards from `10deg` to a premium `4deg` and wired it to respect `calmMotion`.
- **Zen Footer Toggle** — Converted the static span hint into an interactive, hover-reactive `<button>`.
- **GPU-accelerated Transitions** — Redesigned `DashboardView` and `ZenView` animations in Framer Motion to use GPU-promoted vertical translations (`translateY`) with custom cubic-bezier easing (`[0.16, 1, 0.3, 1]`) instead of scale/opacity alone, matching the premium slide feel at native monitor refresh rates while keeping the inactive view fully unmounted for 0% idle CPU overhead.

### Fixed

- **Elastic Overscroll** — Set `overscroll-behavior-y: none` on `html` and `body` in `globals.css` to disable the native WebView2/Windows 11 scroll bounce at window bounds, making reverse scrolling instantaneous.
## [1.1.6] - 2026-05-31

### For you

- **Drivers** — driver age now uses the current year, so **To confirm** badges stay accurate year after year.
- **Language** — drivers, alerts, DNS labels, and error messages follow your **French or English** choice more consistently across the app.
- **Accessibility** — game latency descriptions for screen readers match your selected language.

### Technical details

### Added

- **`driver_status.rs`** + **`src/constants/driverStatus.ts`** — shared driver status and `update_source` constants (Rust ↔ TypeScript contract).
- **`gaming_aria_*`** translation keys — localized screen-reader strings for game latency (DNS band + Zen dock).

### Changed

- **`eval_status`** — dynamic local year via `GetLocalTime()` instead of hardcoded `2026`; threshold `DRIVER_VERIFY_AGE_YEARS`; unit tests.
- **Gaming latency** — Rust emits machine `verdict` keys only (`ready`, `high_latency`, `local_network`, …); UI labels via `getVerdictLabel()` in `gamingLatency.ts` (removed `translateVerdictLabel` French-string hack).
- **DNS ping** — removed unused `status` field from `DnsResult`; labels come from `latency_ms` + `dns_status_*` i18n in `DnsWidget` / `DnsViaBand`.
- **Driver badges** — `getDriverStatusLabel()` uses `drivers_status_*` i18n keys (removed inline FR/EN in `driverFormat.ts`).
- **i18n cleanup** — alerts (`thresholdAlerts`), notification timestamps, driver copy/detail, DNS test mode labels, error boundaries, and `DriverVersionDisplay` use `translations.ts` + `TranslateFn` / `createTranslator()` (no remaining `language === 'fr'` in utils or layout widgets).
- **`DriverStatus`** — single source in `constants/driverStatus.ts`; re-exported from `types/index.ts`.

### Fixed

- **Drivers** — **To confirm** status based on the PC’s current year, not a frozen constant.
- **`useThresholdAlerts`** — stable effect deps (`language` + `createTranslator` inside effect, not unstable `t` from hook).

## [1.1.5] - 2026-05-31

### For you

- **Support Koi** — the **Support Koi** button in **Settings → About** opens the Ko-fi page in your browser; a short thank-you message appears after the click.

### Technical details

### Added

- **`appService.openDonationPage()`** — Ko-fi URL in `koiLinks.ts`, `isSafeDonationUrl()` allowlist (`ko-fi.com` only).

### Changed

- **DonateButton** — opens Ko-fi via centralized IPC helper; success/error toasts (FR/EN).
- **`koi.bat doctor` / Dev** — detects an incomplete MSVC Rust toolchain (folder present, missing `std` manifest) and reinstalls it automatically.

### Fixed

- **`koi.bat dev`** — `E0463` / « can't find crate for std » when `stable-x86_64-pc-windows-msvc` was corrupted on disk.

## [1.1.4] - 2026-05-31

### For you

- **Bilingual support (French / English)** — Full app translation (dashboard, Zen mode, headers, and settings).
- **Language choice** — Language selector (English / French) in **Settings → Essential**.
- **Automatic language on first launch** — Koi detects your system language (French for `fr`, English for everything else).

### Technical details

### Added

- **Lightweight translation system (`useTranslation`)** — Custom Zustand-based i18n for full reactivity without heavy external dependencies.
- **Dynamic translations** — Language preference wired through Zustand for dynamic widgets (`driverCopy.ts`), DNS latency copy, and Zen time formats.

### Changed

- **Essential settings** — Language selector added; reset action now keeps the active language.

### Fixed

## [1.1.3] - 2026-05-29

### For you

- **Dual-GPU PCs** — Zen mode and Boost state follow the GPU actually under load (laptops with integrated + dedicated). The GPU widget always shows the right metrics.
- **Fairer in-game ping** — Latency uses native Windows tools: less display lag and lower CPU overhead.
- **Smart idle** — Minimized, in the tray, or behind another window, Koi rests (telemetry, DNS, visual effects) to free CPU, GPU, and RAM. With alerts enabled, monitoring continues in the background.
- **Lighter day to day** — Ambient music with a soft fade; expanded widgets without duplicate background rendering; muted music releases RAM after fifteen seconds.
- **Leaner Zen mode** — Less data loaded behind the scenes for an even smoother experience.

### Technical details

### Added

- **Zustand slice store** — `settingsSlice`, `telemetrySlice`, `uiSlice` + `store/types.ts`; hooks `useAtmosphereSync`, `useDriversData`, `useKeyboardNavigation`; views `DashboardView` / `ZenView`

### Changed

- **Multi-GPU aggregation** — Max usage envelope (`Math.max` across GPUs) in `useZenLoadState`, `telemetrySlice`, and `thresholdAlerts`; `GpuWidget` and `ZenMetricsDock` pick the most active index
- **Native Windows ping via IcmpSendEcho** — Replaced `ping.exe` with FFI `IcmpSendEcho` (`iphlpapi.dll`); minimum clamp 1 ms
- **Visibility-aware telemetry** — `document.hidden` + IPC `TELEMETRY_ACTIVE` / `TELEMETRY_THROTTLED`; `html.document-hidden` class; DNS polling paused with refresh on return; DNS TCP timeout 400 ms
- **Background performance** — `useAtmosphereSync` disables glass blur when unfocused; grid widgets unmount when DNS/Drivers expanded; Zen telemetry filtered; WMI GPU throttled to 6 s at rest; compact `formatUptimeShort` ≥ 24 h
- **Audio** — 300 ms fade on pause/mute; audio buffers unloaded after 15 s muted (`ambientMusic.ts`)

### Fixed

- **Multi-GPU Boost mode** — Load detection based on the busiest GPU, not fixed `gpu[0]`

## [1.1.2] - 2026-05-28

### For you

- **Lighter day to day** — the app uses fewer resources with the dashboard open; sakura atmosphere and frosted glass stay smooth.
- **Same look as before** — no visible change except a slightly smoother UI under load.

### Technical details

### Added

### Changed

- **WebView2 performance (Sakura + glass)** — strict Sakura canvas budget at 30 FPS (focus) / 24 FPS (unfocused), no multi-frame catch-up; bottom glow without `filter: blur`; isolated `.sakura-fx-layer`; glass cards GPU-promoted (`translateZ`); redundant `backdrop-blur` removed inside bento widgets

### Fixed

- **GitHub CI** — faster PR audit (Cargo cache `swatinem/rust-cache`, exe build on push to `master` and Release tags); push to `master`: `cargo audit` instead of `rustsec/audit-check` (avoids Check API “Resource not accessible by integration” failure)

## [1.1.1] - 2026-05-26

### For you

- **CPU & GPU temperatures** — shown on widgets when Windows provides them; otherwise the badge stays hidden (no fake values).
- **Delivery fix** — this release actually ships the atmosphere improvements (sakura, Soft/Aura glass) announced earlier.

### Technical details

### Added

### Changed

- **CPU/GPU widgets** — live temperature when WMI/DXGI telemetry provides it

### Fixed

- **Release executable** — effective delivery of atmosphere optimizations announced in 1.1.0 (Sakura Canvas, Soft 16 px / Aura 24 px glass, `koiSimulateFocus`)

## [1.1.0] - 2026-05-26

### For you

- **Release notes** — history in this file; version number visible in **Settings → About**.
- **Smoother, lighter Sakura** — background petals optimized to weigh less on your PC.
- **Frosted glass** — **Soft** mode a bit lighter; **Aura** keeps the premium look for powerful machines.
- **Atmosphere presets** — **Zen · Soft · Aura** still one click in **Settings → Atmosphere**.

### Technical details

### Added

- **`CHANGELOG.md`** and scripts **`prepare-release.ps1`** / **`extract-release-notes.ps1`** — GitHub Release notes from the changelog
- **`src/appVersion.ts`** — version shown in Settings → About, synced on each release
- **Focus simulation tool** — global **`koiSimulateFocus(lostFocus?: boolean)`** in the dev console to instantly test sakura cadence (24 FPS) when unfocused

### Changed

- **Sakura Canvas particle engine** — full replacement of SVG DOM animation (React + Framer Motion) with a high-performance Canvas 2D engine: pre-rendered textures with shadows and blur (offscreen buffers), dynamic cap at 30 FPS (focus) and 24 FPS (unfocused / gaming), DPI cap at 1.25 — up to ~95% less CPU/GPU load on the effect
- **Adaptive glassmorphic blur** — default Gaussian blur reduced from 24 px to 16 px in Soft mode (~half GPU load), full 24 px blur kept in Aura for high-end configs
- **`prepare-release.ps1`** — promotes changelog and aligns npm, Tauri, Cargo, README badge, and About version
- **Dependabot** — sensitive npm majors ignored (`react*`, `recharts`, `framer-motion`, `@vitejs/plugin-react`); grouped minor/patch unchanged

### Fixed

## [1.0.0] - 2026-05-24

First public release — local Windows monitor, open source.

### For you

- **First public release** — CPU, RAM, GPU, network, and DNS dashboard with neon theme and frosted glass.
- **Zen mode** — clock, pond, essential metrics for a second screen or focus.
- **Gaming & network** — multiplayer latency and DNS comparator; drivers in plain language.
- **Alerts & atmosphere** — smart alerts off by default; zen music after opening; portable executable, no installer.

### Technical details

### Added

- Dashboard CPU · RAM · GPU · Network · DNS with neon theme and frosted glass
- Zen mode (clock, pond, essential metrics)
- Gaming latency (router + internet), DNS comparator, simplified/extended drivers
- Smart alerts (off by default), ambient music, orchestrated splash
- Portable executable **`koi-monitor.exe`** (Windows 10/11, no installer)

### Changed

- n/a

### Fixed

- n/a

[Unreleased]: https://github.com/KatanaCZ/Koi-Monitor/compare/v1.1.9...HEAD
[1.1.9]: https://github.com/KatanaCZ/Koi-Monitor/releases/tag/v1.1.9
[1.1.8]: https://github.com/KatanaCZ/Koi-Monitor/releases/tag/v1.1.8
