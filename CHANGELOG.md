# Changelog

Toutes les modifications notables de **Koi Monitor** sont documentées ici.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · versions [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

### Ajouté

- **`CHANGELOG.md`** et scripts **`prepare-release.ps1`** / **`extract-release-notes.ps1`** — patchnotes Release GitHub depuis le changelog
- **Outil de simulation de focus** — Ajout de la fonction globale `koiSimulateFocus(lostFocus?: boolean)` dans la console développeur pour tester instantanément le passage de la pluie de pétales en cadence cinéma (24 FPS).

### Modifié

- **Moteur de particules Sakura Canvas** — Remplacement complet du système d'animation SVG DOM (React + Framer Motion) par un moteur Canvas 2D ultra-performant. Pré-rendu des textures avec ombres et flous (offscreen buffers), limitation dynamique à **30 FPS (focus)** et **24 FPS (hors focus / jeu)**, et limitation DPI à **1.25** pour éliminer jusqu'à 95% de la charge CPU/GPU de l'effet.
- **Flou de verre glassmorphic adaptatif** — Réduction du flou gaussien par défaut de `24px` à `16px` en mode **Doux** pour alléger le GPU de moitié, tout en préservant le flou complet de `24px` en mode **Aura** pour les configurations haut de gamme.

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

[Unreleased]: https://github.com/KatanaCZ/Koi-Monitor/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/KatanaCZ/Koi-Monitor/releases/tag/v1.0.0
