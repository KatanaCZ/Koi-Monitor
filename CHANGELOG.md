# Changelog

Toutes les modifications notables de **Koi Monitor** sont documentées ici.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · versions [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

### Ajouté

### Modifié

### Corrigé

## [1.1.0] - 2026-05-26

### Ajouté

- **`src/appVersion.ts`** — version affichée Paramètres → À propos, synchronisée à chaque release

### Modifié

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

[Unreleased]: https://github.com/KatanaCZ/Koi-Monitor/compare/v1.1.0...HEAD
[1.0.0]: https://github.com/KatanaCZ/Koi-Monitor/releases/tag/v1.0.0
[1.1.0]: https://github.com/KatanaCZ/Koi-Monitor/releases/tag/v1.1.0
