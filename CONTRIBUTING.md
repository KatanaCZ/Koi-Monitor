# Contributing to Koi Monitor

Thank you for your interest in Koi Monitor. This project targets **Windows 10/11** with **Tauri v2 + React**.

## Before you start

- Read [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for architecture, commands, and troubleshooting.
- Keep changes **surgical** — match existing style, avoid unrelated refactors.

## Branches & workflow

`master` is **protected** on GitHub:

- **Pull request required** before merge (no direct push)
- **CI check `audit`** (workflow *Audit & Build*) must pass
- **Force push blocked** on `master`

### Daily flow

```powershell
git checkout master
git pull
git checkout -b feat/short-description   # or fix/… chore/… docs/…
# … edit, commit …
git push -u origin feat/short-description
```

Open a PR on GitHub → wait for **Audit & Build** green → merge. Solo maintainer: **0 reviews required** (you can merge your own PR once CI passes).

### Branch naming

| Prefix | Use |
|--------|-----|
| `feat/` | New feature or UX |
| `fix/` | Bug fix |
| `docs/` | README, DEVELOPMENT, comments only |
| `chore/` | CI, deps, tooling |

### Releases

Patch notes live in **[`CHANGELOG.md`](CHANGELOG.md)** ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/), English).

- **`### For you`** — text published on the **GitHub Release** (end users, no dev jargon). Tone guide: [`docs/marketing-context.md`](docs/marketing-context.md).
- **`### Technical details`** — Added / Changed / Fixed for contributors.

**Before each version:**

1. Fill **`## [Unreleased]`**: **For you** first (3–5 bullets, user benefits), then **Technical details** (Added / Changed / Fixed). Do not put CI/infra in **For you**.
2. On green `master`:

```powershell
.\scripts\prepare-release.ps1 -Version 1.0.1   # CHANGELOG + app version (About, npm, Tauri, Cargo, README)
git add CHANGELOG.md src/appVersion.ts package.json package-lock.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock README.md
git commit -m "chore(release): prepare v1.0.1"
git push origin master
git tag v1.0.1
git push origin v1.0.1
```

3. The **Release** workflow extracts the changelog section and publishes **`koi-monitor.exe`** + notes on GitHub.

**SemVer:** `1.0.x` fixes · `1.x.0` features · `x.0.0` breaking changes.

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

CI also runs `npm audit`, `cargo audit`, and a Recharts bundle budget (≤ 550 KB). The full **`koi.bat build`** runs on **push to `master`** and on **Release tags** — not on PRs (saves ~7 min; shipping exe is validated at tag).

**Expected CI times (GitHub Actions, `windows-latest`):**

| Trigger | Job | Typical duration |
|---------|-----|------------------|
| Pull request | `audit` (npm + rust checks) | ~6–10 min (warm cache) · ~12–15 min (cold) |
| Push `master` | `audit` + build exe | ~12–18 min |
| Tag `v*` | `release` | ~3–8 min (warm) · ~7 min baseline |

## Pull requests

- Target branch: **`master`** (protected — merge via PR only)
- One logical change per PR when possible
- Update user-visible behavior in `README.md` and technical details in `docs/DEVELOPMENT.md` when relevant
- **Dependabot PRs:** merge grouped **minor/patch** when CI `audit` is green (weekly, npm + cargo)
- **Ignored npm majors** in `.github/dependabot.yml`: `react`, `react-dom`, `@types/react*`, `recharts`, `framer-motion`, `@vitejs/plugin-react`, `vite`, `typescript`, `zustand`, `lucide-react` — manual upgrades via `chore/deps-*` or `feat/*` + local QA (`koi.bat dev`, `npm run build`, `tsc`)
- Close stale Dependabot major PRs instead of leaving them open

## Code conventions

- Tauri IPC: centralize calls in [`src/services/api.ts`](src/services/api.ts)
- Zustand: prefer granular selectors over full-store subscriptions
- Rust: no `unwrap()` on external input; prefer explicit errors for WMI/PowerShell paths
