<div align="center">

# 🌸 Koi Monitor

**Keep an eye on your PC. Let the petals do their thing.**

A Windows system monitor with a soft spot for sakura, quiet music and second screens.

[![Build](https://github.com/KatanaCZ/Koi-Monitor/actions/workflows/audit.yml/badge.svg)](https://github.com/KatanaCZ/Koi-Monitor/actions/workflows/audit.yml)
![Windows 10 / 11](https://img.shields.io/badge/Windows-10%20%2F%2011-687da8)
![Rust](https://img.shields.io/badge/Rust-native-c99583)
[![MIT license](https://img.shields.io/badge/license-MIT-91b5a0)](LICENSE)

[Getting started](#getting-started) · [Development](docs/DEVELOPMENT.md) · [Report a bug](https://github.com/KatanaCZ/Koi-Monitor/issues)

</div>

## A little less dashboard, a little more calm

Koi puts CPU, RAM, GPU and network activity in one window. Check what's busy, have a look at your connection, then leave it on your second screen while you get on with your day.

There are light and dark themes, glass cards and falling petals. You can pick a colour, turn down the motion, mute the music or switch to Zen mode. The interface speaks French and English.

## Around the pond

- **Your PC at a glance.** Live usage charts, per-core CPU activity, GPU memory and network throughput. Temperature readings appear where compatible Windows sensors are available; support depends on your hardware and firmware.
- **A connection check before the next match.** Router ping, internet latency and jitter help spot an unsteady connection. These are diagnostic measurements, not the ping to your game server.
- **DNS comparisons.** Compare response times to public DNS servers or add your own address. A faster ping alone doesn't guarantee faster DNS lookups or lower in-game latency.
- **A look at your drivers.** Start with GPU, network and Bluetooth, or run the extended scan. Koi points you to Windows Update and official vendor pages; you choose what to install.
- **A quiet watch.** Optional load and latency alerts, with a session history behind the bell. They're off by default.
- **Room to breathe.** Zen mode brings up a clock, a pond and a few metrics. A small desktop widget keeps the essentials nearby when the main window is tucked away.

## New roots: Rust

Koi 2 is a native Rust rewrite, using iced and wgpu. The interface and atmosphere run without a browser engine, and fonts, icons and music are bundled into the executable.

**The current source version is `2.0.0-alpha.1`.** It is still an alpha: keyboard navigation is limited, screen-reader support is missing, and some details differ from the 1.x app. See the [development notes](docs/DEVELOPMENT.md#differences-from-the-1x-web-version) for those differences.

The [1.x source](https://github.com/KatanaCZ/Koi-Monitor/tree/v1.1.9) remains available if you need it.

### A lighter footprint

The [development measurements](docs/DEVELOPMENT.md#why-native) compare both versions on the same Ryzen 7 7800X3D and RX 7900 XTX, with the dashboard visible and sakura animated:

| Resource | 1.1.9 (WebView2) | Native Rust |
|---|---|---|
| Processes | 9 | 1 |
| CPU (whole machine) | ~10% | ~0.5% |
| GPU | ~18% | ~1% |
| RAM: working set | 750–810 MB | ~120 MB |
| RAM: private memory | 700–830 MB | ~225 MB |

These are observations recorded during development on one PC, not a promise for every setup or a fresh benchmark of this commit. The notes don't record the sampling duration, measurement tools or exact native commit. Working set and private memory are different measurements; they should not be added together.

The native app was also recorded at 44 MB working set and 0% CPU in the tray. The old version's minimised window was recorded as unchanged, but minimised and tray states are not an equivalent comparison. Enabled alerts, diagnostics and a visible desktop widget can change background usage.

## Getting started

You'll need **64-bit Windows 10 or 11** and a **Direct3D 12-capable GPU**.

### Downloads

Check the [Releases page](https://github.com/KatanaCZ/Koi-Monitor/releases) for published builds and their notes. **Choose a 2.x release for the Rust version.** A 1.x download is the previous app; the latest stable release link may still lead there while 2.x is in alpha.

For a native build, download `koi-monitor.exe`, put it wherever you want and launch it. There is no separate runtime to install. If no 2.x binary is available yet, build the source below.

### Build from source

Install stable Rust with the MSVC toolchain and the Visual Studio Build Tools with the C++ workload, then run these commands from the checked-out Rust branch:

```powershell
cargo run --release
```

To build without launching:

```powershell
cargo build --release
```

The executable lands in `target\x86_64-pc-windows-msvc\release\koi-monitor.exe`.

## Your PC, your data

Koi doesn't require an account or upload your system metrics. Settings and an error log stay in `%LOCALAPPDATA%\com.koi.monitor\`. Charts and notification history live in memory and disappear when you quit.

Connection tests contact the selected network targets. Driver update checks use Windows services, and vendor links open in your browser. Those features need network access.

Start with Windows is optional. To remove Koi, disable that option first, quit from the tray and delete the executable. You can also delete the settings folder for a clean slate.

## Help Koi grow

Found a bug? [Open an issue](https://github.com/KatanaCZ/Koi-Monitor/issues) with what happened, what you expected and your Windows version. Screenshots are welcome.

For code contributions, see [CONTRIBUTING.md](CONTRIBUTING.md). For security issues, use the [private reporting route](SECURITY.md).

Made by [Katana](https://github.com/KatanaCZ). Free to use, change and share under the [MIT license](LICENSE).

*May your ping stay low and your pond stay quiet.*
