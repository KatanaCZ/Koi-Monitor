# Changelog

Toutes les modifications notables de **Koi Monitor** sont documentées ici.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · versions [SemVer](https://semver.org/lang/fr/).

**Releases GitHub** : seule la section **Pour vous** est publiée aux utilisateurs. **Détail technique** sert aux contributeurs (voir [`docs/marketing-context.md`](docs/marketing-context.md)).

## [Unreleased]

### Pour vous

### Détail technique

### Ajouté

### Modifié

- **Notes de version** — Releases GitHub publient la section **Pour vous** ; détail contributeur dans **Détail technique** (voir [`docs/marketing-context.md`](docs/marketing-context.md))

### Corrigé

## [1.1.2] - 2026-05-28

### Pour vous

- **Plus léger au quotidien** — l’application consomme moins de ressources quand le tableau de bord reste ouvert ; l’ambiance sakura et le verre dépoli restent fluides.
- **Même rendu qu’avant** — pas de changement visible à part une interface un peu plus souple sous charge.

### Détail technique

### Ajouté

### Modifié

- **Perf WebView2 (Sakura + verre)** — bridage strict du canvas Sakura au budget 30 FPS (focus) / 24 FPS (hors focus), sans rattrapage multi-frame ; glow bas sans `filter: blur` ; couche `.sakura-fx-layer` isolée ; cartes glass promues GPU (`translateZ`) ; suppression du `backdrop-blur` redondant dans les widgets bento

### Corrigé

- **CI GitHub** — audit PR accéléré (cache Cargo `swatinem/rust-cache`, build exe sur push `master` et tag Release) ; push `master` : `cargo audit` à la place de `rustsec/audit-check` (évite l’échec Check API « Resource not accessible by integration »)

## [1.1.1] - 2026-05-26

### Pour vous

- **Températures CPU et GPU** — affichées sur les widgets lorsque Windows les fournit ; sinon le badge reste masqué (aucune valeur inventée).
- **Correctif de livraison** — cette version inclut bien les améliorations d’ambiance (sakura, verre Doux/Aura) annoncées précédemment.

### Détail technique

### Ajouté

### Modifié

- **Widgets CPU/GPU** — température live affichée lorsque la télémétrie WMI/DXGI la fournit

### Corrigé

- **Exécutable Release** — livraison effective des optimisations atmosphère annoncées en 1.1.0 (Sakura Canvas, verre Doux 16 px / Aura 24 px, `koiSimulateFocus`)

## [1.1.0] - 2026-05-26

### Pour vous

- **Notes de version** — historique dans ce fichier ; numéro de version visible dans **Paramètres → À propos**.
- **Sakura plus fluide et plus léger** — pétales en fond optimisés pour moins peser sur le PC.
- **Verre dépoli** — mode **Doux** un peu plus léger ; mode **Aura** garde le rendu premium pour les machines puissantes.
- **Préréglages atmosphère** — **Zen · Doux · Aura** toujours en un clic dans **Paramètres → Atmosphère**.

### Détail technique

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

### Pour vous

- **Première version publique** — tableau de bord CPU, RAM, GPU, réseau et DNS avec thème néon et verre dépoli.
- **Mode Zen** — horloge, étang, métriques essentielles pour un second écran ou le focus.
- **Jeu et réseau** — latence multijoueur et comparateur DNS ; pilotes en langage clair.
- **Alertes et ambiance** — alertes intelligentes désactivées par défaut ; musique zen après l’ouverture ; exécutable portable sans installateur.

### Détail technique

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

[Unreleased]: https://github.com/KatanaCZ/Koi-Monitor/compare/v1.1.2...HEAD
[1.0.0]: https://github.com/KatanaCZ/Koi-Monitor/releases/tag/v1.0.0
[1.1.0]: https://github.com/KatanaCZ/Koi-Monitor/releases/tag/v1.1.0
[1.1.1]: https://github.com/KatanaCZ/Koi-Monitor/releases/tag/v1.1.1
[1.1.2]: https://github.com/KatanaCZ/Koi-Monitor/releases/tag/v1.1.2
