# Koi Monitor — release notes writing guide

Reference for drafting **`### For you`** in [`CHANGELOG.md`](../CHANGELOG.md) and GitHub Releases. Tone aligned with [`README.md`](../README.md).

## Product

- **What:** local Windows 10/11 monitor, portable (`koi-monitor.exe`), open source.
- **Promise:** *Your PC, finally readable. Beautiful. Light. Reliable.*
- **Not:** dev jargon, fake alerts, invented metrics, aggressive popups.

## End-user audience

- Windows PC owner (gaming, work-from-home, occasional streaming).
- **Not** a developer: do not mention WebView2, WASM, IPC, CI, crates, or file names unless Settings → About needs it.
- They want: *what changes for me?* *Will my PC feel lighter / clearer?*

## Voice

| Do | Avoid |
|----|--------|
| Short sentences, benefit first | Stack dumps |
| “Smoother”, “lighter”, “shown when Windows provides it” | FPS, `backdrop-blur`, library names |
| Honesty (no temperature = no fake number) | Empty hype (“revolutionary”) |
| Consistent “you” tone with README | Enterprise release-note tone |

## Changelog structure

- **`### For you`** → published on GitHub Release (3–5 bullets when possible).
- **`### Technical details`** → Added / Changed / Fixed (Keep a Changelog, contributors).
- **CI / infra / refactors** → Technical details only, never in For you.

## Rephrasing examples

| Technical | For you |
|-----------|---------|
| WebView2 perf, canvas 30 FPS | The app uses fewer resources; sakura petals and frosted glass stay smooth. |
| WMI/DXGI temperature | CPU/GPU temperature when Windows provides it; otherwise the badge stays hidden. |
| CI cargo audit | *(do not publish to end users)* |

## Release workflow

1. Fill `[Unreleased]`: **For you** + **Technical details**.
2. `prepare-release.ps1 -Version x.y.z`
3. Proofread **For you** before `git tag`.
4. Tag `v*` triggers `release.yml` → `extract-release-notes.ps1` exports **For you** only.
