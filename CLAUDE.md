# Koi Monitor — AI Context

Project rules for Cursor / Composer. Detailed rules live in `.cursor/rules/` (auto-loaded).

## Quick Reference

| Topic | Rule file |
|-------|-----------|
| Stack, structure, commands | `.cursor/rules/koi-core.mdc` |
| Design system & colors | `.cursor/rules/koi-design-system.mdc` |
| React / TypeScript | `.cursor/rules/koi-frontend.mdc` |
| Rust / Tauri backend | `.cursor/rules/koi-rust-backend.mdc` |

## Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS v4, Framer Motion, Zustand, Recharts (lazy)
- **Backend:** Tauri v2, Rust (`src-tauri/src/{lib,dns,drivers,driver_updates,driver_store,driver_version,gaming_latency,security}.rs`)
- **Fonts:** Geist Sans latin 400/600 (UI), JetBrains Mono latin 500 (data)
- **Télémétrie:** événement Tauri `telemetry-update` (1 Hz) + `gaming-latency-update` (2 s)
- **CI:** `.github/workflows/audit.yml` — npm audit, cargo audit, budget recharts ≤ 550 KB

## Commands

```bash
dev.bat              # Dev server
build.bat            # koi-monitor.exe only (no MSI/NSIS)
setup.bat            # First install (admin)
npm run tauri dev    # Alternative dev
npm run tauri build -- --no-bundle   # Alternative build
npm run build        # Frontend only (Vite)
```

**Build output:** `src-tauri/target/release/koi-monitor.exe` — `bundle.active: false` in `tauri.conf.json`, no installers.

## Coding Principles

1. **Simplicity first** — minimum code, no speculative features
2. **Surgical changes** — touch only what's needed, match existing style
3. **Verify** — run `npm run build` + `cargo check` before claiming done
4. **IPC centralization** — all Tauri calls through `src/services/api.ts`
5. **Zustand selectors** — subscribe to granular slices, not whole store (évite re-renders télémétrie)

## Key Design Constraints

- 8px grid, bento cards `rounded-[2rem]`, inner panels `rounded-2xl`
- Component colors: CPU `#ff2d95`, RAM `#00d4ff`, GPU `#9d4edd`, Network `#00fff7`, DNS/Jeu `#00ff9d`
- **Light mode (Daylight Neon):** canvas `#e4e8f2`, néons de marque visibles, glows via `getNeonTextShadow()` (`src/utils/neonEffects.ts`)
- **Glass blur toggle:** `src/utils/glassBlur.ts` — `html.no-blur` désactive `backdrop-blur` (sombre & clair). Grain SVG (`bento-card::before`) **désactivé** quand glass actif (évite texture granuleuse).
- Zen Mode: `Math.max(cpuUsage, gpuUsage)`, unmount heavy widgets; **Sakura** conservés en faible/moyen (`high` → plafonné `medium`, pas de couche front) ; télémétrie via `TelemetryGrid` **intégrée** dans `ZenClockWidget` (StatsBar masqué)
- Zen + glass sombre: `data-zen-mode="true"` sur `<html>`, panneau `bento-card` plus opaque (88 %), blur 12 px, fond body lissé
- Détection antivirus réelle (WMI `SecurityCenter2`, refresh ~60 s) — badge « Protégé · [programme] » en Zen
- WCAG AAA contrast, Escape closes modals **and gaming latency panel**, double-confirm on Reset
- Toasts globaux erreurs: `StatusToast` + `pushStatusToast()` (DNS, pilotes, télémétrie)

## Architecture télémétrie & perf

| Couche | Rôle |
|--------|------|
| `lib.rs` thread 1 Hz | sysinfo + DXGI + WMI GPU → `emit("telemetry-update")` |
| `gaming_latency.rs` thread 2 s | ICMP passerelle + `1.1.1.1`, jitter 15 pts → `emit("gaming-latency-update")` |
| `useTelemetryPoller.ts` | `listen(telemetry-update)` + `listen(gaming-latency-update)` + polling DNS |
| `store/historyRing.ts` | Ring buffer O(1) historiques graphiques (288 pts) |
| `components/charts/` | Recharts lazy (`SingleAreaChart`, `DualAreaChart`) |
| `get_system_info` / `get_gaming_latency` | Fallback IPC |

## Latence jeu vs DNS

| | **Jeu** (`TelemetryGrid`) | **DNS** (`DnsWidget`) |
|--|---------------------------|------------------------|
| Mesure | ICMP passerelle + internet | TCP connect `:53` |
| Cible | Box + `1.1.1.1` | Serveurs DNS configurables |
| UI | Badge verdict cliquable → `GamingLatencyBreakdown` | Comparateur + couronne meilleur serveur |
| Intervalle | 2 s (event) | `settings.dnsInterval` |

## Sécurité (app desktop)

- CSP stricte dans `tauri.conf.json` (pas `null`)
- DNS : whitelist IP côté Rust, mutex async (pas de rejet concurrent)
- Pilotes : validation URL HTTPS (`src/utils/safeUrl.ts`) avant `openUrl` ; MàJ via WU-first (`update_source`), pas d’installation directe
- PowerShell drivers : vérif exit code, pas de `unwrap` sur JSON
- Gaming ping : subprocess `ping` + PowerShell gateway (CREATE_NO_WINDOW `0x08000000`)

## Shared Utilities

| File | Role |
|------|------|
| `TelemetryGrid.tsx` | Grille CPU/RAM/GPU/**Jeu**/Actif — badge verdict toggle panneau détail |
| `GamingLatencyBreakdown.tsx` | Passerelle · Internet · Jitter — fermeture × / Échap |
| `gamingLatency.ts` | Verdict styles, format ms, ring %, aria labels |
| `glassBlur.ts` | `syncGlassBlurClass()`, `initGlassBlurFromStorage()` |
| `SlashTitle.tsx` | Animation katana + titre scindé — sizes `lg` / `md` / `sm` |
| `StatusToast.tsx` | Toast global `role="status"` / `aria-live="polite"` |
| `historyRing.ts` | Ring buffer historiques |
| `networkInterface.ts` | Wi‑Fi / Ethernet detection |
| `neonEffects.ts` | `getNeonTextShadow()` — glow adaptatif dark/light |
| `driverFormat.ts` | Versions WMI, `collapseEssentialDrivers`, diff segments, comparateur, `isWindowsUpdateSource` / `isDriverStoreOnlySource`, `getVendorUpdateLinkLabel` |
| `DriverVersionDisplay.tsx` | `DriverVersionCompare`, `EssentialVersionsSummary` |
| `safeUrl.ts` | Whitelist hosts constructeurs pour liens pilotes |
| `types/index.ts` | `GamingLatencySnapshot`, `GamingVerdict`, DNS normalize |
| `useTelemetryPoller.ts` | Events télémétrie + gaming + intervalle DNS |
| `useViewportTier.ts` | Breakpoints responsive pour anneaux télémétrie |

## Chart Tooltips

- X-axis uses `index`; each point carries `timestamp` (ms)
- Historique lu via `ringToArray(ring)` + dépendance `ring.seq`
- Never pass axis `label` to relative time — use `formatChartTooltipLabel(_, payload)`

## Pilotes (modes simplifié / étendu)

- **Défaut:** `simplifiedMode: true` (`store/index.ts`)
- **Simplifié:** backend `collapse_simplified_primary` → **3 pilotes** (1 GPU discret, 1 Ethernet prioritaire, 1 BT) ; frontend `collapseEssentialDrivers()` en filet
- **Étendu:** GPU + réseau + BT + audio + stockage (filtre matériel physique, blacklist VM/VPN/périphériques)
- Enrichissement MàJ: Windows Update COM (`driver_updates.rs`) + fallback magasin `pnputil` (`driver_store.rs`)
- **Flux WU-first (safe UX):** `resolve_update_candidate()` préfère WU si versions égales ; champ `update_source`: `"windows_update"` | `"driver_store"` | `""`
  - MàJ via WU → bouton primaire **« Ouvrir Windows Update »** (`open_windows_update` → `ms-settings:windowsupdate` + `DetectNow`)
  - Magasin seul → avertissement ambre + lien constructeur/catalogue primaire + **« Vérifier Windows Update »** secondaire
  - Pas de bouton « Installer la mise à jour » trompeur (installation = Windows / OEM)
- Toggle mode → `fetchDrivers(true)` dans `App.tsx` ; toast warning **modal seule** si passage en étendu (~1–2 min)
- Rescan au splash: attend `driversFetchSettled` (timeout sécurité **90 s**)

## Splash — orchestration visuelle

Machine à états séquentielle (`SplashScreen.tsx`) — affichage fluide même si le backend répond vite :

| Phase | Message | Durée min | Condition réelle |
|-------|---------|-----------|------------------|
| 0 | Initialisation | 900 ms | — |
| 1 | Matériel | 1,8 s | `systemInfo !== null` |
| 2 | DNS | 1,8 s | résultats ou `dnsFetchAttempted` |
| 3 | Pilotes | 1,4 s | `driversFetchSettled` |
| 4 | Prêt | 1,1 s | barre → 100 % |

Barre interpolée par phase (pas de sauts). Timeout sécurité **90 s** → force fermeture.

## Documentation projet

| Fichier | Public | Rôle |
|---------|--------|------|
| `README.md` | Dev + utilisateur avancé | Doc complète : features, design, architecture, install, dépannage |
| `readmegit.md` | Grand public / GitHub | README orienté lambda : UI, légèreté, fiabilité — ton accessible, sans jargon |
| `prompt-slides.txt` | Présentation / marketing | Prompt IA pour slides (14–16) — **source de vérité : README.md**, sans slide installation |
| `CLAUDE.md` | Agents IA (Cursor) | Contexte technique condensé |
| `.cursor/rules/*.mdc` | Agents IA | Règles modulaires auto-chargées |

**Règle :** fonctionnalités / couleurs / modes → aligner `README.md` en premier ; décliner en langage lambda dans `readmegit.md` et `prompt-slides.txt`.
