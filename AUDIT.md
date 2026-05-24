# Audit Koi Monitor — Mai 2026

Rapport concis post-remédiation. Mesures : npm audit 0 vuln · build OK · recharts ≤ 550 KB · cargo check/clippy/test · tsc OK.

## Sécurité

- **OK** — CSP stricte, IPC centralisé (`api.ts`), DNS whitelist Rust + frontend, URLs HTTPS allowlist
- **P2** — `opener:default` large ; gate frontend uniquement
- **P2** — Pas de CodeQL/SAST (Dependabot ajouté)
- **P3** — DNS custom RFC1918 sonde LAN (by design desktop)
- **P3** — `-ExecutionPolicy Bypass` sur scripts PowerShell statiques

## Backend Rust

- **OK** — tests unitaires GPU (`gpu_metrics_tests`), clippy clean, CREATE_NO_WINDOW
- **OK** — GPU hybride : adaptateur discret DXGI + charge 3D/Compute/Copy (max), VRAM par LUID
- **OK** — PowerShell timeout 90 s drivers / 60 s WU (`subprocess.rs`)
- **P2→fix** — Log mutex poison + emit failures
- **P2→fix** — JSON drivers parse → Err explicite
- **P3→fix** — WU matching : HWID/PCI requis (fuzzy name retiré)

## Frontend / Perf

- **OK** — Ring buffers, lazy widgets/charts, Zen suspend, sélecteurs granulaires
- **OK** — StatsBar / TelemetryGrid retirés · uptime `SystemUptimeChip` · latence jeu `DnsViaBand`
- **OK** — Préréglages Atmosphère Zen/Doux/Aura (`atmospherePresets.ts`)
- **OK** — Toasts Paramètres via `toastToneClass()` (tokens `--warning-text`, pas Tailwind `dark:`)
- **OK** — `DonateButton` : halo masqué si `html.calm-motion`
- **OK** — TitleBar Zen alignée dashboard (`TITLE_BAR_SHELL_CLASS`)
- **P2→fix** — DNS ping dédupliqué (`runDnsPingSession`)
- **P3** — SettingsModal subscribe `settings` entier (acceptable modal ouvert)

## Accessibilité

- **OK** — SettingsModal tabs/focus trap, NotificationPanel, StatusToast live
- **OK** — AlertOnboardingModal : Escape → onDecline
- **OK** — Toasts warning lisibles en thème clair (`--warning-text: #6b3000`)

## CI & Docs

- **OK** — CI : `tsc --noEmit` + `cargo test` + budget recharts
- **OK** — Dependabot npm + cargo
- **OK** — README public + `docs/DEVELOPMENT.md` + AUDIT alignés (sans doc outillage IA)

## Hygiène repo (UltraClean — mai 2026)

- **OK** — Code mort retiré : `StatVisuals`, `TelemetryGrid`, `StatsBar`, `ZenPrimaryMetrics`, `ZenSecondaryMetrics`, `useViewportTier`
- **OK** — Fichiers actifs trackés : `SystemUptimeChip`, `WidgetMetricHeader`, `ZenPondBackground`, `DnsViaBand`, `ZenMetricsDock`, `atmospherePresets`, `dnsWidgetLayout`
- **Régénérable** — `dist/`, `node_modules/`, `src-tauri/target/`, `%LOCALAPPDATA%\koi-monitor\target\` → `koi.bat build`

## Mesures automatisées (24 mai 2026)

| Contrôle | Résultat |
|----------|----------|
| npm audit (moderate+) | 0 vulnérabilités |
| npm run build | OK |
| npx tsc --noEmit | OK |
| Build exe | `koi.bat build` → `tauri build --no-bundle --ci` + `Publish-KoiExe` → `%LOCALAPPDATA%\koi-monitor\koi-monitor.exe` |
| recharts chunk | ≤ 550 KB (CI budget) |
| cargo check / test | OK |
