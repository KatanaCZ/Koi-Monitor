# Contributing to Koi Monitor

Thank you for your interest in Koi Monitor. This project targets **Windows 10/11** with **Tauri v2 + React**.

## Before you start

- Read [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for architecture, commands, and troubleshooting.
- Keep changes **surgical** — match existing style, avoid unrelated refactors.

## Development setup

```powershell
git clone https://github.com/KatanaCZ/Koi-Monitor.git
cd koi-monitor
.\koi.bat setup    # First time — admin
.\koi.bat dev      # Full Tauri + Vite (port 1420)
.\koi.bat devfast  # Frontend only + debug exe (after one `dev` build)
```

## Checks before opening a PR

```powershell
npm ci
npm run build
npx tsc --noEmit
cd src-tauri
cargo check --release
cargo clippy --release -- -D warnings
cargo test
```

CI also runs `npm audit`, `cargo audit`, and a Recharts bundle budget (≤ 550 KB).

## Pull requests

- Target branch: **`master`**
- One logical change per PR when possible
- Update user-visible behavior in `README.md` and technical details in `docs/DEVELOPMENT.md` when relevant

## Code conventions

- Tauri IPC: centralize calls in [`src/services/api.ts`](src/services/api.ts)
- Zustand: prefer granular selectors over full-store subscriptions
- Rust: no `unwrap()` on external input; prefer explicit errors for WMI/PowerShell paths
