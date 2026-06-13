<div align="center">

# 🌸 Koi Monitor

[![Audit & Build](https://github.com/KatanaCZ/Koi-Monitor/actions/workflows/audit.yml/badge.svg)](https://github.com/KatanaCZ/Koi-Monitor/actions/workflows/audit.yml)
[![Release](https://img.shields.io/github/v/release/KatanaCZ/Koi-Monitor?label=Release&color=9d4edd)](https://github.com/KatanaCZ/Koi-Monitor/releases/latest)

### *Your PC, finally readable. Beautiful. Light. Reliable.*

**Monitor Windows without opening a gray tool from 2005.**

<br />

![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4?style=for-the-badge&logo=windows&logoColor=white)
![Optimized](https://img.shields.io/badge/Optimized-WebView2-00d4ff?style=for-the-badge)
![Free](https://img.shields.io/badge/Free-MIT-00ff9d?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-1.1.9-9d4edd?style=for-the-badge)

<br />

![Koi Monitor preview — dashboard](docs/screenshots/MockupViews_1x_PNG_20260524_274.png)

*Frosted glass · Dark & light theme · Sakura atmosphere*

<br />

[Why Koi](#-why-koi) ·
[Interface](#-an-interface-youll-want-to-keep-open) ·
[Light & discreet](#-light-and-discreet) ·
[Honest metrics](#-honest-numbers) ·
[Features](#-what-you-can-do) ·
[Install](#-installation) ·
[Privacy](#-privacy--security)

</div>

---

## 🎐 Why Koi

Classic system monitors? Numbers everywhere, gray background, unreadable charts. It feels like the Windows control panel on a bad day.

**Koi is the opposite.**

A clear, colorful app that answers three simple questions:

- Is my PC doing okay?
- Will my connection hold up for online gaming?
- Does a driver deserve a look?

No jargon. No fake alerts to stress you out. **Your machine, in human language.**

**French & English** — full UI translation; pick your language in **Settings → Essential**, or let Koi detect your system language on first launch.

---

## ✨ An interface you'll want to keep open

This isn't a theme slapped on a utility. It's an app you actually **leave open**.

| What you see… | Why it matters |
|---------------|----------------|
| 🩷 **CPU** (pink) | Load, chart, per-core view, live temperature (when supported) |
| 🔵 **RAM** (cyan) | Memory actually in use |
| 🟣 **GPU** (purple) | Card, VRAM, in-game load, live temperature (when supported) |
| 🩵 **Network** (turquoise) | Live throughput, Wi‑Fi or Ethernet |
| 🟢 **DNS & Gaming** (green) | Best server + multiplayer latency |

**What makes the daily difference:**

- **Glass cards** — readable; disable them if you prefer something calmer
- **Sakura** — petals in the background, 4 tints (pink, purple, blue, mint) that tint the UI too
- **Signature opening** — katana animation, ~8–10 s splash on a fast machine
- **App icon** — the word **Koi** in neon (same style as the title bar), visible in the window, taskbar, and notification area
- **Zen music** — starts with the dashboard, volume remembered; a second track hides for the curious
- **Light or dark theme** — comfortable day and night
- **Settings** — **Essential · Atmosphere · Connection · Watch · About**; **Zen · Soft · Aura** presets in one click; personal DNS server (IP + nickname); **Support Koi** on About (Ko-fi tip, thank-you toast)

> Beautiful enough to keep open — not just useful once a month.

---

## ⚡ Optimized and respectful

A monitor shouldn't be the heaviest app on your PC.

| | Koi Monitor |
|--|-------------|
| **Disk** | ~10–25 MB (thanks to Tauri, no bundled Chromium) |
| **RAM** | ~100–250 MB (uses Windows WebView2 Edge engine) |
| **CPU / GPU at rest** | Close to 0% (smart suspension when minimized or hidden) |

Koi Monitor runs on web technologies (Tauri + React) to deliver a stunning, modern UI. While it requires the Windows WebView2 browser engine (which inherently consumes some RAM), we've engineered strict limits so you don't feel it while working, streaming, or gaming:

- **Canvas 2D particle engine**: petals in Canvas with pre-rendered textures (offscreen), isolated layer, strict cap at **30 FPS** (focus) / **24 FPS** (unfocused); frosted glass turns off when unfocused to free the GPU.
- **Smart idle**: minimized, in the tray, or behind another window, Koi suspends telemetry, DNS, and visual effects. Active alerts keep watching in the background.


### Zen Mode 🌸

![Zen Mode](docs/screenshots/MockupViews_1x_PNG_20260524_829.png)

One click on the cherry blossom. The dashboard fades. What remains:

- a **large clock** and the date;
- a **pond** that ripples with **Zen · Flow · Boost** state;
- **CPU · GPU · Gaming** in large figures, **RAM · Uptime** below (hideable) — the GPU shown is the one actually under load (dual-GPU laptops);
- the top bar reappears on hover — volume, settings, bell.

Perfect on a second screen, for focus, or when you just want calm.

---

## 🛡️ Honest numbers

Pretty is good. Fake is not.

- **Windows data** — no invented numbers
- **Real temperatures** — CPU/GPU thermal sensors use Windows standard WMI/ACPI classes (`MSAcpi_ThermalZoneTemperature`). If your motherboard (especially AMD) or BIOS doesn't expose those sensors, the badge stays hidden. **Koi never fakes or simulates data.**
- **Gaming latency ≠ DNS** — your router ping isn't a Cloudflare test; we don't mix the two
- **Drivers without drama** — “Installed”, “Check recommended”, “Update available”; no “your PC is obsolete”
- **Driver updates** — Windows Update first; NVIDIA / AMD / Intel links as backup
- **Alerts** — off by default; if enabled: discreet toast, zero Windows popups

A test fails? **Clear message at the bottom of the screen**, not a cryptic error. If a driver scan takes a while, the app still starts (up to ~90 s worst case).

---

## 🧩 What you can do

### 📊 Live PC

CPU, RAM, GPU, network — history charts, CPU cores as an “equalizer”, Wi‑Fi or Ethernet shown clearly, CPU & GPU temperatures (on setups with compatible ACPI/WMI sensors).

### 🌐 Best DNS

Compare Google, Cloudflare, Quad9, OpenDNS. Check the servers, run the test. Add **your** server (router, Pi-hole…) with a nickname. The fastest gets the crown ⚜️.

### 🎮 Ready to game?

Simple badge: *Ready to play*, *Ranked limit*, *Router / Wi‑Fi issue*… Native Windows measurement for a fairer ping. One click for details: router, internet, jitter. Visible on the dashboard and in Zen mode.

### 🔧 Drivers

**Simplified (default)**: 3 essentials — GPU, network, Bluetooth.  
**Extended**: all important hardware (~1–2 min).  
Compared versions, **Open Windows Update** when an official update exists. No fake “install in one click” promise.

### 🔔 Alerts (optional)

Off by default. On first launch, you choose — **Escape** = not now.

| Context | Koi warns if… | Example |
|---------|---------------|---------|
| **Desktop** | The machine stays under heavy load | *Desktop · PC under pressure · CPU 92%* |
| **Gaming** | Your ping drifts from its usual baseline | *Gaming · Ping rising · 60 ms · usually ~10 ms* |

One message at a time. Missed something? The **bell** keeps the session log. Tune in **Watch**: **Quiet / Balanced / Attentive** sensitivity, gaming latency on/off.

---

## 🚀 Installation

### Download (recommended)

1. Open the **[latest Release](https://github.com/KatanaCZ/Koi-Monitor/releases/latest)**
2. Download **`koi-monitor.exe`**
3. Copy it wherever you like and double-click

Release notes: **Release** tab (plain *For you* text) or [`CHANGELOG.md`](CHANGELOG.md) for the full history.

**That's it.** No Node, no Rust, no installer.

| | |
|--|--|
| **OS** | Windows 10 or 11, 64-bit |
| **WebView2** | Already on Windows 11; on Windows 10, via Windows Update or Edge if needed |
| **Internet** | Recommended (DNS, latency, drivers) |
| **Account** | Standard user is usually enough |
| **Enterprise** | Some locked-down PCs limit advanced scans |

<details>
<summary><strong>Developers — build from source</strong></summary>

```powershell
git clone https://github.com/KatanaCZ/Koi-Monitor.git
cd koi-monitor
.\koi.bat setup    # Admin — first install
.\koi.bat dev      # Tauri + Vite (port 1420)
.\koi.bat devfast  # Frontend only + debug exe
.\koi.bat build    # Exe in %LOCALAPPDATA%\koi-monitor\
```

Requirements: Node.js 20+, Rust, WebView2. Technical docs: [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

</details>

---

## 🔒 Privacy & security

**100% local.** No account. No cloud. Your metrics stay on your machine.

| What | Where | When |
|------|-------|------|
| **The exe** | Where *you* copied it | You keep / delete it |
| **App profile** (WebView2) | `%LOCALAPPDATA%\com.koi.monitor\` | First launch |
| **Settings** (theme, DNS, alerts…) | In that profile, a few KB | When you change an option |
| **Charts, log, cache** | RAM only | Cleared on exit |

**Start with Windows** (off by default): one startup entry — without copying the exe elsewhere.

**Remove everything:** close the app → disable autostart if needed → delete the exe → optional: folder `%LOCALAPPDATA%\com.koi.monitor\`.

Network tests and driver scans go through Windows (`ping`, WMI…). Koi installs nothing for you. **Open source** code (MIT).

---

## 📄 License

**MIT** — Katana © 2026  
Free to use, modify, and share. See [`LICENSE`](LICENSE).

---

<div align="center">

### 🌸 Koi Monitor

*Understanding your PC shouldn't be a chore.*  
*Light. Beautiful. Reliable.*

<br />

**[⬆ Back to top](#-koi-monitor)**

</div>
