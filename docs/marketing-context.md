# Koi Monitor — contexte rédaction (release notes)

Document de référence pour rédiger **`### Pour vous`** dans [`CHANGELOG.md`](../CHANGELOG.md) et les Releases GitHub. Ton aligné sur [`README.md`](../README.md).

## Produit

- **Quoi :** moniteur Windows 10/11 local, portable (`koi-monitor.exe`), open source.
- **Promesse :** *Votre PC, enfin lisible. Beau. Léger. Fiable.*
- **Pas :** jargon dev, fausses alertes, métriques inventées, popups agressives.

## Audience « lambda »

- Propriétaire de PC Windows (jeu, télétravail, stream occasionnel).
- **Pas** développeur : ne pas mentionner WebView2, WASM, IPC, CI, crates, noms de fichiers sauf Paramètres → À propos si utile.
- Veut savoir : *qu’est-ce qui change pour moi ?* *Mon PC sera-t-il plus léger / plus clair ?*

## Voix

| Faire | Éviter |
|--------|--------|
| Phrases courtes, bénéfice d’abord | Listes de stack technique |
| « Plus fluide », « moins gourmand », « affiché quand Windows le permet » | FPS, `backdrop-blur`, noms de libs |
| Honnêteté (température absente = pas de chiffre faux) | Superlatifs vides (« révolutionnaire ») |
| Tutoiement ou vouvoiement cohérent avec README (vouvoiement implicite « vous ») | Ton release note enterprise |

## Structure changelog

- **`### Pour vous`** → publié sur GitHub Release (3–5 puces max quand possible).
- **`### Détail technique`** → Ajouté / Modifié / Corrigé (Keep a Changelog, contributeurs).
- Entrées **CI / infra / refacto** : uniquement sous Détail technique, jamais dans Pour vous.

## Exemples de reformulation

| Technique | Pour vous |
|-----------|-----------|
| Perf WebView2, canvas 30 FPS | L’app consomme moins de ressources ; pétales sakura et verre dépoli restent fluides. |
| WMI/DXGI température | Température CPU/GPU affichée quand Windows la fournit ; sinon le badge reste masqué. |
| CI cargo audit | *(ne pas publier côté utilisateur)* |

## Workflow release

1. Remplir `[Unreleased]` : **Pour vous** + **Détail technique**.
2. `prepare-release.ps1 -Version x.y.z`
3. Relire **Pour vous** avant `git tag`.
4. Skills Cursor utiles : **roadmap-communicator** (brouillon), **copy-editing** (clarté).
