# Koi Monitor — Developer Guide

![Icon](data:image/svg+xml,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22paint0_linear_favicon%22%20x1%3D%2212%22%20y1%3D%222%22%20x2%3D%2212%22%20y2%3D%2222%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%239d4edd%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2300d4ff%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20d%3D%22M12%202C6.47715%202%202%206.47715%202%2012C2%2017.5228%206.47715%2022%2012%2022C17.5228%2022%2022%2017.5228%2022%2012C22%206.47715%2017.5228%202%2012%202ZM12%2020C7.58172%2020%204%2016.4183%204%2012C4%207.58172%207.58172%204%2012%204C16.4183%204%2020%207.58172%2020%2012C20%2016.4183%2016.4183%2020%2012%2020Z%22%20fill%3D%22url(%23paint0_linear_favicon)%22%2F%3E%3C%2Fsvg%3E)

**Windows 10 and 11 system monitoring application** with a **Koi Monitor Night** glassmorphism-themed interface.

<!-- Screenshot: run `npm run tauri dev` to preview the UI -->

## System requirements

### End user (portable `.exe`)

| Criterion | Detail |
|---------|--------|
| **OS** | Windows **10** or **11**, **64-bit** (recent build recommended) |
| **WebView2** | Microsoft Edge WebView2 runtime (often already installed). Windows 11: included. Windows 10: via Windows Update / Edge |
| **Install** | **Nothing** — copy `koi-monitor.exe` anywhere and double-click |
| **Platform** | **Windows only** (WMI, DXGI, PowerShell, driver scan) |
| **Network** | Required for DNS tests, gaming latency, and driver update lookup |
| **Rights** | Standard user account is usually enough; locked-down environments (enterprise) may limit WMI or PowerShell |

### Developer (build from source)

Node.js 20+, Rust (stable), npm, WebView2 — see [Quick install](#quick-install-one-click) and `koi.bat setup`.

### Footprint (order of magnitude)

| | Koi Monitor (Tauri) | Reference |
|--|---------------------|-----------|
| **Disk** | ~10–25 MB (exe + shared WebView2) | Well below Electron (~150 MB+) |
| **RAM at rest** | ~80–150 MB | WebView2 + React UI |
| **CPU** | Low when dashboard is idle | Spikes possible during **driver scan** (1–2 min in extended mode) |
| **Profile** | **Light** for a modern desktop app | Not **ultra-light** (minimal native utility class) |

> **Recommended distribution:** ship **`koi-monitor.exe`** (portable, embedded frontend) — no MSI/NSIS installer. After `koi.bat build`, run **`%LOCALAPPDATA%\koi-monitor\koi-monitor.exe`** (avoids Defender blocking on Desktop); dev copy: `src-tauri\target\release\`.

### Local data & privacy (end user)

- **Portable** — the exe stays where the user copied it; no installer, no forced `Program Files` folder.
- **WebView2 profile** — `%LOCALAPPDATA%\com.koi.monitor\` (Tauri id `com.koi.monitor`); created on first launch.
- **Frontend persistence** — `localStorage`: `koi_settings`, `koi_theme`, `koi_alerts_onboarding_done`, `koi_easter_music_seen` (a few KB).
- **Session only (RAM)** — chart history, notification log, Rust driver cache, telemetry: nothing exported or synced to the cloud.
- **Optional** — `launchAtStartup` → Windows startup entry via `tauri-plugin-autostart` (off by default).
- **Manual uninstall** — delete the exe + `%LOCALAPPDATA%\com.koi.monitor\` if settings should be removed.

Public-facing version: **Data & privacy** section in [`README.md`](../README.md).

## Features

### System monitoring
- **CPU / RAM / GPU** — one widget card each (ring + chart + detail); **no StatsBar** (avoids duplication with Zen mode)
- **CPU** — Real-time usage, history chart, and ultra-dense core monitoring (interactive *Spectrum Equalizer* mode). Pink theme (`#ff2d95`).
- **RAM** — Memory usage, used/available memory, history chart. Cyan theme (`#00d4ff`).
- **GPU** — Advanced native monitoring (DirectX DXGI & WMI): **discrete adapter preferred** (NVIDIA/AMD) on hybrid PCs, **available VRAM** + used VRAM, GPU load (3D/Compute/Copy). Purple theme (`#9d4edd`).
- **Network** — Real-time throughput (header badge ↓/↑), cumulative totals, AreaChart (**stretches** with adjacent DNS card), **active Wi‑Fi or Ethernet** connection (icon + label). Turquoise theme (`#00fff7`).

### DNS monitor (server comparator)
- Multi-server DNS latency test (Google, Cloudflare, Quad9, OpenDNS) — **TCP `:53`** (DNS comparison, not gaming latency)
- **Auto test** (direct button): restores the 4 recommended servers and runs ping immediately
- **Customize**: opens Settings on the **Connection** tab to pick servers
- **Personal server**: **1 IP** (router, Pi-hole, custom DNS) in **Connection** — address + optional nickname, **Validate** button; pinged in addition to presets, shown like others in the widget
- **Widget layout**: fixed height **400 px** (≤ 4 servers) or **460 px** (5+) — **aligned with Network card** via `dnsWidgetLayout.ts` + `onLayoutHeightChange`; **+184 px** when gaming detail panel is open · DNS list **vertically centered** between header and **Via / In-game** band (`min-h-full` + `justify-center`, internal scroll on overflow) · compact **flex wrap + justify-center** (2 col · 3 col from 5 on lg) — incomplete last row **centered horizontally**
- **Dual footer band**: **Via {best DNS}** + **In-game** — **two separate twin cards** (DNS row style), colored verdict + clickable gaming latency badge
- Automatic best DNS identification (crown)
- Neon green theme (`#00ff9d`)

### Gaming latency — “Ready to play”
- **In-game panel** in the DNS widget **Via** band (`DnsViaBand`) — ICMP internet latency + real-time verdict
- **Clickable badge** (`Ready to play`, `Ranked limit`, `Wi‑Fi / router`, etc.) → opens detail panel under the band
- **Detail panel** (hidden by default): **Gateway** (auto-detected router IP) · **Internet** (`1.1.1.1`) · **Jitter** (15 samples, ~30 s)
- Close: **Close** button, badge re-click, or **Escape**
- Verdicts: `ready` / `marginal` / `poor` / `local_issue` / `measuring` — green / amber / orange / red
- Rust measurement every **2 s** (dedicated thread, independent of DNS polling)
- Dashboard: **DNS & Ping monitor** band · Zen mode: `ZenMetricsDock` (CPU · GPU · Game · RAM · Active at very large size, hideable)

### Smart alerts (Phase 1)

At the desk, a quiet toast if the machine is under strain; in a gaming session, a whisper if ping drifts from its usual rhythm. Discreet at the bottom of the screen, never a Windows popup. Alerts are enabled or rested in Settings → Watch, you stay in control.

- **Off by default** — offer on **first launch** (`AlertOnboardingModal`, flag `koi_alerts_onboarding_done`, **Escape** = “Not now”).
- **Two automatic contexts** (invisible to the user):
  - **Desktop** — work, browser, editing: alert if the PC stays **under pressure** (CPU, RAM, or GPU).
  - **Gaming** — session detected (`max(CPU,GPU) ≥ 45%` for **25 s**): alert if ping **rises vs your habit** (session baseline, min. 5 samples) **or** exceeds absolute ceiling (~80 ms).
- **Toast messages** (clear, friendly):
  - `Desktop · PC under pressure · CPU 92%` (most stressed component, **one alert only**)
  - `Gaming · Ping rising · 60 ms · ~4 s · usual ~10 ms` — adapted for fiber / competitive play
- **Anti-spam**: **3 s** threshold · **one toast at a time** · cooldown (**45–90 s** desktop · **90 s** gaming) · no desktop alert while ramping to gaming profile.
- **Log**: bell in title bar (`NotificationLayer`, z-index above dashboard) — session history (24 entries), clickable toast, Zen pill if missed alerts.
- **Settings → Watch**: master on/off · **Sensitivity** (Quiet / Balanced / Attentive) · **In-game latency** on/off.
- **No Windows popup** — in-app toasts only (`StatusToast` + `pushStatusToast(..., { source: 'alert' })`).
- **Dev** (console): `koiSimulateLoad()` · `koiSimulateGaming()` (30 s) · `koiSimulateLatency200()` · `koiSimulateZen()` · `koiSimulateFlow()` · `koiSimulateBoost()` · `koiSimulateFocus(lostFocus?: boolean)` · `koiPlayEasterMusic()` · `koiStopEasterMusic()` — see `alertDevSimulation.ts` / `easterEggMusic.ts`.

### Driver analysis
- **Dashboard layout**: **380 px** card (aligned with DNS/Network), **flex-wrap** centered grid (balanced odd rows), **no scroll**; auto density (compact ≥ 4, 3 col ≥ 5, 4 col ≥ 9 drivers).
- **Summary band**: DNS-style “Via …” band — Premium Zen counters at bottom; dashboard tiles **informative** (not clickable).
- **Expanded zoom**: master-detail — selectable grid + detail panel (`DriverDetailPanel`): comparator, hardware ID, WU/OEM actions.
- **Simplified mode (default)**: **3 essential drivers** — 1 discrete GPU, 1 network (Ethernet preferred), 1 Bluetooth; unified compact tiles.
- **Extended mode**: GPU (+ iGPU), network (Ethernet + Wi‑Fi), BT, audio, storage; rescan **1–2 min** (warning toast on enable, modal only).
- **Version comparator**: installed vs available (WU + `pnputil` store), highlighted diff segments (`DriverVersionCompare`).
- **Updates — Windows Update first**: **HWID/PCI matching only** (no fuzzy name); if WU offers an update → **“Open Windows Update”** (primary action); vendor/catalog link secondary. If version found **only** in driver store → warning + OEM/catalog link + **“Check Windows Update”**. Scan/WU timeout **90 s / 60 s**. No direct install from the app.
- **Real hardware detection**: targeted WMI scan, physical filter, VM/VPN/interface device blacklist.
- **Safe UX**: “Installed”, “To confirm”, “New” statuses — no false obsolete alerts.
- **Vendor links**: NVIDIA, AMD, Intel, Realtek + Microsoft catalog when HW ID (`safeUrl.ts`).
- **Copy**: Premium Zen tone centralized (`driverCopy.ts`) · separator ` · ` · no em dash in user-facing prose.

### Zen mode (meditation) — Wallpaper background
- **Flower button** in title bar for instant toggle.
- **Auto-hidden title bar** (`ZenTitleBarDock`): ~14 px peek at top · neon affordance line · stays visible if watch log open · **same width and top margin** as dashboard (`TITLE_BAR_SHELL_CLASS`: `max-w-7xl` + gutters + `pt-6`).
- **Pond background** (`ZenPondBackground`): radial gradient + water surface + **SVG ripples** reactive to **Zen / Flow / Boost** · disabled if aura off, calm animations, or `prefers-reduced-motion`.
- **Typography only, centered** (`zen-wallpaper-core`): **very large** clock · XL date · discreet state label (verdict color) · large italic quote — **no glass panels**.
- **Large metrics** (`ZenMetricsDock`): **CPU · GPU · Game** in XL neon figures + thin bar · **RAM · Active** on wide row · clickable gaming latency chip → detail panel (**Escape** closes panel before leaving Zen).
- **Metrics visibility**: **eye** shortcut in Zen footer (`zenMetricsVisible`, persisted).
- **Exit**: discreet “Escape · Dashboard” hint · flower toggle (title bar on hover).
- **Transitions**: Zen enter/exit fade + scale (~600 ms).
- **State detection** (`zenLoadState.ts` + `useZenLoadState.ts`): `max(CPU, GPU)` — 5 s median, warmup, spike filtering, **5 s** rise / **3 s** fall; `useRef` tracker without extra polling.
- **Three states**: **Zen** / **Flow** / **Boost** — `getZenStateChipStyle()` · `aria-live`.
- **Resource savings**: dashboard widgets unmounted, history rings off, DNS suspended; sakura capped (`high→medium`, `medium→low`).

### Ambient music
- **Start**: when splash ends (`showSplash → false`), in sync with dashboard reveal — not during katana intro.
- **Main track**: [`public/audio/koi-ambient.mp3`](../public/audio/koi-ambient.mp3) → `/audio/koi-ambient.mp3` — loop, ~1.2 s fade, volume ~35%.
- **Secret track (easter egg)**: [`public/audio/koi-easter.mp3`](../public/audio/koi-easter.mp3) — lazy load, crossfade from ambient, volume ~40%, loop.
- **Audio engine**: [`src/utils/ambientMusic.ts`](../src/utils/ambientMusic.ts) — multi-track registry (`ambient` | `easter`), `playTrack`, `crossfadeTo`, `pauseAll`, cancellable fades (`fadeGeneration`), volumes clamped `[0, 1]`.
- **Control**: **Volume2 / VolumeX** title bar button (halo `--accent`); mute/unmute resumes active track (ambient or easter).
- **Persistence**: `settings.ambientMusicMuted` in `koi_settings` (default: music **on**).
- **Accessibility**: `prefers-reduced-motion` → no autoplay; manual enable via volume button.
- **“Koi” easter egg**:
  - **Gesture**: **5 quick clicks** (< 2.5 s) on **“Koi”** in `SlashTitle` — **About** tab (Settings) or title bar (`onSecretTap`).
  - **First discovery**: playful toasts on clicks 1–4 (`EASTER_HINT_TOASTS`, `skipLog`) → click 5: easter crossfade + toast *Koi · You found it. Listen.*
  - **Already found** (`koi_easter_music_seen`): no hints 1–4; 5 clicks → reward toast + easter.
  - **Easter active**: 5 clicks → crossfade back to ambient, **no toast**.
  - **Session state**: `easterMusicActive` (Zustand, not persisted) · discovery: `koi_easter_music_seen` (localStorage).
  - **Hooks**: `useEasterEggMusic` + `useAmbientMusic` (ambient only; no `playTrack('easter')` to avoid races with crossfade).
  - **Dev**: `koiPlayEasterMusic()` · `koiStopEasterMusic()` (console, `import.meta.env.DEV`).
- **CSP**: `media-src 'self'` in `tauri.conf.json`.

## Design

### Per-component color chart
- **CPU** — Cyberpunk pink `#ff2d95`
- **RAM** — Cyan blue `#00d4ff`
- **GPU** — Neon purple `#9d4edd`
- **Network** — Turquoise `#00fff7`
- **DNS & gaming latency** — Neon green `#00ff9d`

### Koi Monitor theme (Bento paradigm)
- **Bento paradigm**: Modern rounded card layout (`bento-cards`).
- **8px grid system**: All paddings, margins, gaps, heights, and widths align to multiples of 8px (4px tolerance for fine details) for consistent visual alignment.
- **Proximity law**: Tight gaps (`gap-2` / 8px) for strongly related elements (icon + text, title + subtitle); looser spacing (`space-y-6` / 24px) between distinct functional sections.
- **Border & radius hierarchy**: Organic structure — parent bento cards `rounded-[2rem]` / 32px, inner containers `rounded-2xl` / 16px, buttons and small controls `rounded-xl` / 12px or `rounded-lg` / 8px.
- **Liquid glass glassmorphism**: Transparent panels with `backdrop-filter` (**Frosted glass** toggle in Settings). **No grain** on glass cards. `.bento-card` / `.liquid-glass`: `translateZ(0)` + `backface-visibility: hidden`; **no nested `backdrop-blur`** in bento children (`globals.css`). Zen dark mode: more opaque bento, 12 px blur — Zen wallpaper typography only.
- **Tailwind CSS v4**: Robust styling, responsive, native dark/light via data attributes (`data-theme`).
- **Premium typography**: `Geist Sans` for UI, `JetBrains Mono` for data and stats.
- **Koi & neon colors**: Vibrant component identities (pink, cyan, purple) on minimal backgrounds.
- **WCAG AAA accessibility**: Metric text contrast optimized (ratio ≥ 7:1 in light and dark) while keeping cyberpunk glow; full ARIA semantics and keyboard navigation.
- **ISO 9241 ergonomics**: Self-descriptiveness, controllability, error tolerance. Instant modal close and Zen exit via **Escape**, double confirmation on **Reset**, discreet Zen hint “Escape · Dashboard”, live toast announcements (`role="status"`, `aria-live="polite"`).
- **Optimization & robustness**: push telemetry (Tauri event 1 Hz), history ring buffer, Recharts lazy-load, granular Zustand selectors, visible error toasts (DNS/drivers), non-blocking splash, widget memoization, CI audit + bundle budget.
- **Dashboard uptime**: **Active** chip centered in title bar (`SystemUptimeChip`, `md+`) — `formatUptimeShort` · Zen mode = `ZenMetricsDock` (RAM · Active on one row)
- **Dashboard grid**: **CPU · RAM · GPU** row (`md:grid-cols-3 gap-6`) then **Network + DNS** (`lg:grid-cols-3 items-stretch`, DNS `col-span-2`, synced height **400/460 px** + **+184** gaming detail); CPU/RAM/GPU headers via `WidgetMetricHeader` + `MetricPercentBadge`
- **Sakura animation** (`SakuraParticles.tsx`): Canvas 2D, pre-drawn petal textures (drop-shadow/blur offscreen), max DPI `1.25`. `tick` loop: **draw only** if `now - lastDrawTime >= 1000/targetFps` (30 focus, 24 window blur) — no accumulator or multi-frame catch-up; bottom glow via `radial-gradient` (not `filter: blur`). Wrapper `.sakura-fx-layer` + canvas `.sakura-fx-canvas` (`contain: strict`, `isolation: isolate`). Zen: capped intensity (`high→medium`, `medium→low`, no front layer). Dev: `koiSimulateFocus()`.

### Persistent settings
Side navigation without scroll: **Essential · Atmosphere · Connection · Watch · About** — **Premium Zen** tone, accessible labels; tab content scrolls when needed.

**Essential**
- **Cadence** — how fast the machine is read (1 s, 2 s, 5 s, 10 s)
- **Essential drivers** (default) — 3 drivers (GPU, network, Bluetooth); full analysis = a longer moment
- **Wake with Windows** — launch at session start (disabled by default)
- **Discrete presence** — close hides the app; taskbar click to reopen

**Atmosphere** (Koi preset · Light · Nature · Ambiance sections)
- **Koi preset** — **Zen** (light sakura, glass off, light aura, soft neon, calm animations) · **Gentle** (default, visual balance) · **Aura** (max immersion — perf toast on switch); applies sakura, glass, aura, neon, and animations in one gesture — theme and Sakura tint stay personal; manual tweak possible (no active preset if customized mix) · `atmospherePresets.ts` + `inferAtmospherePreset()`
- **Theme** — light for day, dark for night
- **Sakura** — None · Light · Soft · Dense + **Sakura tint** (rose, violet, blue, mint) — drives petals **and** UI accent (`sakuraColor` → `data-accent` → `--accent` / `--accent-text`: pills, switches, Settings tabs, active Zen, keyboard focus; **not** CPU/RAM/GPU widgets)
- **Frosted glass** — crystal effect on panels (`enableGlassmorphicBlur`)
- **Background aura** — None · Light · Full (`data-background-aura` on `<html>`)
- **Neon glow** — Soft · Balanced · Vivid (`getNeonTextShadow` + `data-neon-glow`)
- **Calm animations** — disables sakura and reduces decorative motion (`html.calm-motion`)

**Connection**
- **DNS rhythm** — check frequency (10 s, 15 s, 30 s, 1 min)
- **Observed servers** — two-line checklist (name + IP), `normalizeDnsChecklist()`
- **Personal server** — dedicated card: **Address** (IPv4) + optional **Nickname** · **Validate** (Enter) · **Clear**; Premium Zen placeholders (italic, subtle); default label: *Personal server*; stored in `settings.customDns` · merged via `buildActiveDnsServers()` + `pingActiveDns()`
- Settings toasts: **footer slot** (inline) — tones via `toastToneClass()` (`--warning-text` / `--error-text`, not Tailwind `dark:`) · **Aura** perf toast when selecting Aura preset

**Watch**
- **Koi watch** — calm signals, never Windows popups; first-launch onboarding, **off by default**, bell log, anti-spam
- **Sensitivity** — Quiet · Balanced · Attentive
- **In-game latency** — signal when ping drifts from habit in session

**About**
- `SlashTitle md` animation (replays each visit) + thanks + Premium Zen pitch + **Support Koi** (`DonateButton` — animated highlights; external halo hidden if **Calm animations** / Zen preset) + technical credit + version
- Pitch: *Your machine read with care. Load, connection, drivers, and quiet watch — at the desk and in game. Built for Windows, light, reliable, simply.*

### Interface
- **App icon (wordmark “Koi”)**: **Koi** text Geist, gradient **rose `#ff2d95` → violet `#9d4edd` → cyan `#00d4ff`**, neon glow, squircle background `#0a0e18` — window, `.exe`, taskbar, tray, favicon. Master: `src-tauri/icons/icon-source.png` · regen: `npm run icons:wordmark` (Pillow + Tauri CLI + sync `public/`) · embedded Rust (`include_bytes`) + tray via `get_app_icon_png`.
- **SlashTitle v3 identity (compact Iai)**: horizontal sweep at title level (no vertical drop) → neon trail → horizontal blade katana → horizontal flash + particles + ring → **horizontal text split** (top / bottom halves) → **smooth rejoin** (magnetic overshoot) → exit top-right. Footprint = text height. `variant="full"` (`lg` splash, `md` About) · `variant="static"` title bar (**Koi** / **Monitor** gradient).
- **Splash screen**: `SplashSlashTitle` intro → steps + bar reveal; phases 0→4 synced (`resolveSplashUi` — active line, phrase, and bar % share logic); readable durations (~8–10 s on fast machine); 650 ms dwell per completed step; **90 s** timeout; aurora, sakura; **ambient music** on `onComplete`.
- Custom title bar (no Windows decorations) — permanent **`SlashTitle variant="static"`**
- **Settings**: side nav without scroll (**Essential · Atmosphere · Connection · Watch · About**)
- **Settings → About**: `SlashTitle md` (replays each visit) + thanks + Premium Zen pitch + **Support Koi** (`DonateButton`, animated highlights — link TBD; `html.calm-motion` hides external aura) + technical credit + version

## Quick install (one-click)

> For **building from source** only. End users receive **`koi-monitor.exe`** — see [System requirements](#system-requirements).

### Step 1: Clone the repository
1. `git clone https://github.com/KatanaCZ/Koi-Monitor.git`
2. Open the folder (e.g. `C:\KoiMonitor`)

### Step 2: Run setup
1. **Right-click** `koi.bat`
2. **Run as administrator** → choose **Setup** (or `koi.bat setup`)
3. Wait 10–30 minutes (first Rust compile)

The script will automatically install:
- Node.js 20.x (if missing)
- Rust (if missing)
- WebView2 (if needed)
- All npm dependencies
- Build of `koi-monitor.exe`

### Step 3: Launch the application
- Double-click `src-tauri\target\release\koi-monitor.exe`

## Documentation

| File | Purpose |
|---------|--------|
| **`README.md`** | GitHub home — public-facing install and features |
| **`docs/DEVELOPMENT.md`** | Technical documentation (this file) — architecture, build, troubleshooting |
| **`CONTRIBUTING.md`** | Branches, PRs, conventions — **`master` protected** (merge via PR + CI `audit`) |

## Git — branches & releases

| Branch | Role |
|---------|------|
| **`master`** | Public reference · **protected** (PR required, **Audit & Build** / `audit` job, no force-push) |
| **`feat/*` · `fix/*` · `docs/*` · `chore/*`** | Day-to-day work → PR → merge when CI is green |

```powershell
git checkout master && git pull
git checkout -b feat/my-feature
# commits…
git push -u origin feat/my-feature   # open PR on GitHub
```

**Release:** **`CHANGELOG.md`** with **`### For you`** (GitHub release notes, public) and **`### Technical details`** (contributors) — guide [`docs/marketing-context.md`](marketing-context.md) · `prepare-release.ps1 -Version x.y.z` · `extract-release-notes.ps1` exports **For you** only · workflow `release.yml` + `koi-monitor.exe`.

### GitHub CI (`audit.yml` · `release.yml`)

| Trigger | Contents | Typical duration |
|-------------|---------|---------------|
| **PR** | npm audit · build · tsc · recharts budget · rustsec · check · clippy · test | ~6–10 min (warm cache) |
| **Push `master`** | PR checks + **`koi.ps1 -Action Build`** | ~12–18 min |
| **Tag `v*`** | build exe + CHANGELOG notes → GitHub Release | ~3–8 min (warm cache) |

Optimizations: `taiki-e/install-action@cargo-audit`, `swatinem/rust-cache` (`src-tauri -> ../.cargo-target`), `CARGO_TARGET_DIR=.cargo-target` in CI (`koi-lib.ps1` respects the variable if already set).

### Dependabot (dependency updates)

| Flow | Action |
|------|--------|
| **Minor/patch** npm or cargo (weekly grouped PR) | Merge if CI `audit` is green |
| **Major** npm (`react*`, `recharts`, `framer-motion`, `@vitejs/plugin-react`) | Ignored by config — dedicated `feat/*` branch + QA (charts, animations, recharts budget ≤ 550 KB) |
| **Major** cargo | Dependabot PR possible; evaluate case by case |

Config: `.github/dependabot.yml` · PR policy: [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Project structure

```
koi-monitor/
├── .github/workflows/        # audit.yml (CI) · release.yml (tag v* → exe)
├── .github/dependabot.yml    # npm + cargo deps (weekly, minor+patch; sensitive npm majors ignored)
├── src/                      # React + TypeScript frontend
│   ├── components/
│   │   ├── charts/           # Recharts lazy (SingleAreaChart, DualAreaChart)
│   │   ├── common/           # SystemUptimeChip, WidgetMetricHeader, DnsViaBand (widgets/), SettingsModal…
│   │   ├── layout/
│   │   └── widgets/          # Cpu/Ram/Gpu/Network/Dns/Drivers, DnsViaBand, ZenClockWidget…
│   ├── hooks/                # useTelemetryPoller, useThresholdAlerts, useAmbientMusic, useEasterEggMusic…
│   ├── utils/                # dnsWidgetLayout, thresholdAlerts, ambientMusic, easterEggMusic…
│   ├── services/             # api.ts — Tauri IPC + events + appService.getIconPng()
│   ├── store/
│   │   ├── index.ts          # Zustand (+ gamingLatency)
│   │   └── historyRing.ts    # Chart ring buffer
│   ├── styles/               # globals.css (tokens, glass blur)
│   └── types/                # GamingLatencySnapshot, DNS, SystemInfo…
├── src-tauri/
│   ├── icons/                # icon-source.png · icon.ico · PNGs (tauri icon CLI)
│   ├── src/
│   │   ├── lib.rs            # Telemetry + gaming threads, emit events
│   │   ├── gaming_latency.rs # ICMP gateway/internet, jitter, verdicts
│   │   ├── dns.rs            # DNS ping TCP :53 (preset whitelist + custom IPv4 validation)
│   │   ├── drivers.rs        # WMI driver scan + simplified collapse
│   │   ├── driver_updates.rs # WU COM enrichment, resolve_update_candidate, open WU settings
│   │   ├── driver_store.rs   # pnputil store fallback
│   │   ├── driver_version.rs # Multi-format version comparison
│   │   └── security.rs       # Antivirus WMI (SystemInfo, no UI)
│   ├── capabilities/
│   └── tauri.conf.json       # Strict CSP, bundle.active false, targets [] (exe only)
├── CHANGELOG.md              # Patch notes (Keep a Changelog, English) → GitHub Release
├── scripts/                  # koi.ps1 · prepare-release.ps1 · extract-release-notes.ps1 · …
├── public/
│   └── audio/                # koi-ambient.mp3 · koi-easter.mp3 (easter egg, lazy)
├── koi.bat                   # Single entry point (Build / Dev / DevFast / Setup / Doctor)
├── README.md                 # GitHub landing (public + mockups)
├── docs/
│   ├── DEVELOPMENT.md        # Technical docs (this file)
│   ├── marketing-context.md  # Public release note voice
│   └── screenshots/          # README mockups (MockupViews_*.png — commit for GitHub)
```

## Build and dev (developer)

```powershell
koi.bat              # Interactive menu
koi.bat build        # One-click: clean dist/target/gen + koi-monitor.exe (no MSI/NSIS)
koi.bat dev          # Tauri + Vite — compiles Rust if needed (port 1420)
koi.bat devfast      # Tauri + Vite — no Rust recompile (debug exe required)
koi.bat setup        # First install (admin)
koi.bat doctor       # Diagnostics + env / Rust / Defender fixes
# or: npm run tauri dev / npm run build (frontend only, CI)
```

**`koi.bat`**: wrapper → [`scripts/koi.ps1`](../scripts/koi.ps1) — single orchestrator (`Build`, `Dev`, `DevFast`, `Setup`, `Doctor`). Build: stop exe, clean `dist/` + `gen/` + `target/` caches (AppData + legacy), then **`tauri build --no-bundle --ci`** (frontend embedded in exe — do not use `cargo build` alone or you get `localhost:1420` at launch). Dev: Rust prereqs, `kill-dev-port.ps1` (port **1420**), `npm run tauri dev`. **DevFast**: Vite + already-built debug binary, no Cargo — run `koi.bat dev` once before (or after Rust changes). **`koi.bat`** must be **CRLF** (Windows `cmd.exe`).

**Build / dev output:**

| Role | Path |
|------|--------|
| **Run (recommended)** | `%LOCALAPPDATA%\koi-monitor\koi-monitor.exe` |
| Dev copy (release mirror) | `src-tauri\target\release\koi-monitor.exe` |
| **Debug exe (DevFast)** | `%LOCALAPPDATA%\koi-monitor\target\debug\koi-monitor.exe` |
| Rust compile cache | `%LOCALAPPDATA%\koi-monitor\target\` (`CARGO_TARGET_DIR`) |

No `bundle/` folder, no `.msi` or NSIS setup.

**Regenerate “Koi” wordmark icon:**

```powershell
py -3 -m pip install -r scripts/requirements-icons.txt
npm run icons:wordmark
koi.bat build   # embed new icon in exe
```

## Technical architecture (summary)

| Flow | Description |
|------|-------------|
| **Telemetry** | Rust emits `telemetry-update` every second → React listens via `useTelemetryPoller` |
| **Gaming latency** | Rust thread 2 s → ICMP gateway + `1.1.1.1` (+ TCP `:443` fallback) → jitter → `emit("gaming-latency-update")` + `get_gaming_latency` command |
| **DNS** | Configurable interval polling (10 s – 1 min), anti-collision mutex — **separate** from gaming latency |
| **History** | Ring buffer 288 points (CPU/RAM/GPU/network) — O(1) writes |
| **Charts** | Recharts loaded on demand (~60 KB outside initial bundle) |
| **Errors** | Global bottom toast (`StatusToast`) + bell log (`NotificationPanel`) |
| **Alerts** | `useThresholdAlerts` → auto desktop/gaming profile → toast + session log (`notificationLog.ts`) |
| **Security** | WebView CSP (`media-src 'self'` for local track), filtered driver URLs (`safeUrl.ts`), whitelisted preset DNS IPs + custom IPv4 validation (TCP `:53` only) |
| **Driver updates** | WU COM + `pnputil` store → `update_source`; WU-first UI (`open_windows_update`) |
| **Splash** | Katana intro → synced steps/bar (`resolveSplashUi`); min 1.3–1.9 s/phase + 650 ms dwell; dashboard ready via `splashReadiness.ts`; 90 s timeout; **then** ambient music |
| **Music** | `koi-ambient.mp3` post-splash; easter `koi-easter.mp3` (5 “Koi” clicks, crossfade); title bar mute · persisted `ambientMusicMuted` · session `easterMusicActive` |
| **App icon** | Neon **Koi** wordmark (Geist); `icon-source.png` → `npm run icons:wordmark` → `icon.ico`; window + tray embedded (`lib.rs` + `get_app_icon_png`) |
| **Glass blur** | `glassBlur.ts` → `html.no-blur`; tokens `--glass-blur` (16 px Gentle, 24 px Aura), `--glass-surface`; GPU `translateZ(0)` on bento/liquid-glass; `.bento-card [class*='backdrop-blur']` disabled |
| **Sakura / WebView2** | `SakuraParticles.tsx` + `.sakura-fx-*` in `globals.css` — strict FPS budget, no CSS blur on glow |

## Troubleshooting

### Node.js error
```powershell
winget install OpenJS.NodeJS.LTS
```

### Rust error
```powershell
rustup update
rustc --version
```

### WebView2 error
```powershell
winget install Microsoft.WebView2
```

### npm error
```powershell
npm cache clean --force
rm -Recurse node_modules
npm install
```

### Rust `x86_64-w64-mingw32-gcc` / `-lgcc` error
You are on the **GNU** toolchain; Tauri requires **MSVC** on Windows.

```powershell
koi.bat doctor
```

Then install **Visual Studio Build Tools** (*Desktop development with C++*) if `link.exe` is not found.

Run `koi.bat build` again (integrated `target/` clean).

### `spawn EPERM` (esbuild) or cargo access denied (os error 5)
Windows blocks tools from the **Desktop** (Defender, controlled folder access).

**Quick fix (once):**
```powershell
koi.bat doctor
```

Doctor repairs environment variables, MSVC toolchain, and offers Defender exclusions (admin elevation).

**Frontend build on Desktop:** the project uses `esbuild-wasm` (no native binary) to avoid `spawn EPERM`. After `npm install`, postinstall switches automatically. If needed:
```powershell
npm install esbuild@npm:esbuild-wasm@0.25.12 --save-dev --ignore-scripts --force
```

Then rerun `koi.bat dev`, `koi.bat devfast`, or `koi.bat build`.

**Alternative:** move the project to `C:\Dev\Koi Monitor` (off Desktop).

### Exe shows “localhost refused to connect” (ERR_CONNECTION_REFUSED)
The exe was built without embedded frontend (e.g. `cargo build` instead of `tauri build`).

```powershell
koi.bat build
```

Then run **`%LOCALAPPDATA%\koi-monitor\koi-monitor.exe`** — not an old Desktop exe.

## Success checklist

- [x] Real-time CPU monitoring
- [x] RAM monitoring
- [x] Advanced GPU monitoring (DXGI/WMI, 100% native)
- [x] Network monitoring (Wi‑Fi / Ethernet, premium layout)
- [x] Readable light mode (opaque surfaces)
- [x] Multi-server DNS comparator + Auto test / Customize buttons
- [x] Personal DNS server (1 IP + nickname, Connection · Validate) + adaptive-height widget (harmonized odd grid)
- [x] Gaming latency “Ready to play” (gateway, internet, jitter, clickable badge)
- [x] Dynamic latency status (Excellent → Critical)
- [x] Driver analysis with strict filters, simplified/extended modes, WU-first update flow
- [x] Koi Monitor Night glassmorphism UI
- [x] Sakura animations
- [x] Dark/light theme toggle
- [x] Zen mode with dynamic tracking and resource savings
- [x] Windows build — portable `koi-monitor.exe` (no MSI/NSIS)
- [x] One-click install script
- [x] Tauri event telemetry + IPC fallback
- [x] History ring buffer + Recharts lazy
- [x] Smart alerts (desktop load · gaming latency, log, anti-spam)
- [x] User error toasts + resilient splash
- [x] Post-splash ambient music (loop, fade, title bar mute, persistence)
- [x] Music easter egg (5 “Koi” clicks, hints + secret crossfade track, dev console)
- [x] CI audit (npm, tsc, cargo audit, cargo test/clippy, recharts budget ≤ 550 KB; exe build on master + tag; Cargo cache)

## License

MIT License - Katana 2026

---

**Koi Monitor** — System monitoring with style.

*Built for system monitoring enthusiasts and Japanese aesthetics (Koi & Sakura).*
