# Changelog

Toutes les modifications notables de **Koi Monitor** sont documentées ici.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · versions [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

### Ajouté

### Modifié

### Corrigé

## [1.1.1] - 2026-05-26

### Ajouté

### Modifié

- **Widgets CPU/GPU** — température live affichée lorsque la télémétrie WMI/DXGI la fournit

### Corrigé

- **Exécutable Release** — livraison effective des optimisations atmosphère annoncées en 1.1.0 (Sakura Canvas, verre Doux 16 px / Aura 24 px, `koiSimulateFocus`)

## [1.1.0] - 2026-05-26

### Ajouté

- **`CHANGELOG.md`** et scripts **`prepare-release.ps1`** / **`extract-release-notes.ps1`** — patchnotes Release GitHub depuis le changelog
- **`src/appVersion.ts`** — version affichée Paramètres → À propos, synchronisée à chaque release
- **Outil de simulation de focus** — fonction globale **`koiSimulateFocus(lostFocus?: boolean)`** dans la console développeur pour tester instantanément le passage de la pluie de pétales en cadence cinéma (24 FPS)

### Modifié

- **Moteur de particules Sakura Canvas** — remplacement complet du système d'animation SVG DOM (React + Framer Motion) par un moteur Canvas 2D ultra-performant : pré-rendu des textures avec ombres et flous (offscreen buffers), limitation dynamique à 30 FPS (focus) et 24 FPS (hors focus / jeu), limitation DPI à 1,25 — jusqu'à ~95 % de charge CPU/GPU en moins sur l'effet
- **Flou de verre glassmorphic adaptatif** — flou gaussien par défaut réduit de 24 px à 16 px en mode Doux (GPU allégé d'environ moitié), flou complet 24 px conservé en mode Aura pour les configs haut de gamme
- **`prepare-release.ps1`** — promeut le changelog et aligne npm, Tauri, Cargo, badge README et version À propos
- **Dependabot** — majors npm sensibles ignorées (`react*`, `recharts`, `framer-motion`, `@vitejs/plugin-react`) ; minor/patch groupées inchangées

### Corrigé

## [1.0.0] - 2026-05-24

Première release publique — moniteur Windows local, open source.

### Ajouté

- Dashboard CPU · RAM · GPU · Réseau · DNS avec thème néon et verre dépoli
- Mode Zen (horloge, étang, métriques essentielles)
- Latence jeu (passerelle + internet), comparateur DNS, pilotes simplifié/étendu
- Alertes intelligentes (off par défaut), musique ambiante, splash orchestré
- Exécutable portable **`koi-monitor.exe`** (Windows 10/11, sans installateur)

### Modifié

- n/a

### Corrigé

- n/a

[Unreleased]: https://github.com/KatanaCZ/Koi-Monitor/compare/v1.1.1...HEAD
[1.0.0]: https://github.com/KatanaCZ/Koi-Monitor/releases/tag/v1.0.0
[1.1.0]: https://github.com/KatanaCZ/Koi-Monitor/releases/tag/v1.1.0
[1.1.1]: https://github.com/KatanaCZ/Koi-Monitor/releases/tag/v1.1.1
