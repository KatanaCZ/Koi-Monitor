# Contributing to Koi Monitor

Thank you for your interest in Koi Monitor. This project targets **Windows 10/11** and is written in **Rust** (iced + wgpu).

## Before you start

- Read [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the layout, commands, and how to open the app in a given state.
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
2. On green `master`, set the version in `Cargo.toml`, move **Unreleased** under the new version heading in `CHANGELOG.md`, then:

```powershell
cargo build --release
git add Cargo.toml Cargo.lock CHANGELOG.md README.md
git commit -m "chore(release): prepare v2.0.0"
git push origin master
git tag v2.0.0
git push origin v2.0.0
```

3. There is no release workflow at the moment: create the GitHub Release by hand, attach `target\x86_64-pc-windows-msvc\release\koi-monitor.exe`, and paste the **For you** section as its notes.

**SemVer:** `2.0.x` fixes · `2.x.0` features · `x.0.0` breaking changes.

## Development setup

Requires Rust (stable, MSVC) and the Visual Studio Build Tools (C++ workload).

```powershell
git clone https://github.com/KatanaCZ/Koi-Monitor.git
cd Koi-Monitor
cargo run --release
```

## Checks before opening a PR

```powershell
cargo clippy --all-targets -- -D warnings
cargo test
```

CI also runs `cargo audit`. The release executable is built on **push to `master`**, not on PRs.

## Pull requests

- Target branch: **`master`** (protected — merge via PR only)
- One logical change per PR when possible
- Update user-visible behavior in `README.md` and technical details in `docs/DEVELOPMENT.md` when relevant
- **Dependabot PRs:** merge grouped **minor/patch** when CI `audit` is green (weekly, cargo)
- Close stale Dependabot major PRs instead of leaving them open

## Code conventions

- `src/backend/` holds no UI types; views in `src/ui/` read state and return widgets
- No `unwrap()` on external input; prefer explicit errors for WMI/PowerShell paths
- Helper processes go through `backend::subprocess`, hidden and under a timeout
- A bug fix comes with the test that failed before it
