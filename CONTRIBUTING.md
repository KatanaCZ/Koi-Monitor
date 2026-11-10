# Contributing to Koi Monitor

Koi is a Windows 10/11 app written in Rust, with iced and wgpu. Bug reports, fixes and small improvements are welcome.

## Get set up

Install stable Rust (MSVC) and the Visual Studio Build Tools with the C++ workload. From the project directory:

```powershell
cargo run --release
```

The [development notes](docs/DEVELOPMENT.md) cover the source layout, rendering and ways to launch the app in a specific state without changing your saved settings.

## Make a change

Create a branch from the current development base. Use `feat/`, `fix/`, `docs/` or `chore/` and keep each PR focused on one change.

Before opening a PR, run:

```powershell
cargo clippy --all-targets -- -D warnings
cargo test
```

For interface changes, include a screenshot or a few steps to check the result. Update the README when behaviour changes and add a note under `Unreleased` in [CHANGELOG.md](CHANGELOG.md).

Target `master`. It is protected: changes go through a pull request, the `audit` check must pass, and force pushes are blocked. CI runs dependency auditing, Clippy and tests on PRs, then builds the release executable after a push to `master`.

## A few conventions

- Keep Windows telemetry in `src/backend/` and views in `src/ui/`.
- Add interface strings to both languages in `assets/i18n.json`.
- Handle external input errors explicitly. Run helper processes through `backend::subprocess` so they stay hidden and have a timeout.
- Keep unrelated refactors out of bug fixes. Add a regression test when it can meaningfully cover the problem.

## Publish a release

1. Prepare a release branch. Update `Cargo.toml` and `Cargo.lock`, move the notes from `Unreleased` to the new version heading, and update the version mentioned in the README.
2. Open a PR and merge it after the required checks pass.
3. From the updated `master`, build with `cargo build --release` and check the app manually.
4. Tag that commit with the version (for example, `v2.0.0-alpha.1`) and push the tag.
5. Create the GitHub Release manually. Attach `target\x86_64-pc-windows-msvc\release\koi-monitor.exe` and use the `For you` notes as the release description. Mark alpha and beta versions as prereleases.

There is no automated release workflow. Publishing source doesn't publish a downloadable app.

The [writing notes](docs/marketing-context.md) cover the tone. Keep user-facing changes under `For you` and implementation details under `Technical details`.
