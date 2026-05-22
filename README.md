# 🌸 Koi Monitor

![Icon](data:image/svg+xml,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22paint0_linear_favicon%22%20x1%3D%2212%22%20y1%3D%222%22%20x2%3D%2212%22%20y2%3D%2222%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%239d4edd%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2300d4ff%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20d%3D%22M12%202C6.47715%202%202%206.47715%202%2012C2%2017.5228%206.47715%2022%2012%2022C17.5228%2022%2022%2017.5228%2022%2012C22%206.47715%2017.5228%202%2012%202ZM12%2020C7.58172%2020%204%2016.4183%204%2012C4%207.58172%207.58172%204%2012%204C16.4183%204%2020%207.58172%2020%2012C20%2016.4183%2016.4183%2020%2012%2020Z%22%20fill%3D%22url(%23paint0_linear_favicon)%22%2F%3E%3C%2Fsvg%3E)

**Application de monitoring système pour Windows 10 et 11** avec une interface glassmorphisme thème **Koi Monitor Night**.

<!-- Screenshot: exécuter `npm run tauri dev` pour prévisualiser l'interface -->

## 💻 Prérequis système

### Utilisateur final (installateur `.exe` / `.msi`)

| Critère | Détail |
|---------|--------|
| **OS** | Windows **10** ou **11**, **64 bits** (build récent recommandé) |
| **WebView2** | Runtime Microsoft Edge WebView2 (souvent déjà présent). Windows 11 : inclus. Windows 10 : via Windows Update / Edge ; sinon proposé à l’installation |
| **À installer** | **Rien d’autre** — pas de Node.js, Rust, ni outils dev |
| **Plateforme** | **Windows uniquement** (WMI, DXGI, PowerShell, scan pilotes) |
| **Réseau** | Requis pour tests DNS, latence jeu et recherche de MàJ pilotes |
| **Droits** | Compte utilisateur standard suffit en général ; environnements verrouillés (entreprise) peuvent limiter WMI ou PowerShell |

### Développeur (compilation depuis les sources)

Node.js 20+, Rust (stable), npm, WebView2 — voir [Installation Rapide](#-installation-rapide-one-click) et `setup.bat`.

### Empreinte (ordre de grandeur)

| | Koi Monitor (Tauri) | Référence |
|--|---------------------|-----------|
| **Disque** | ~10–25 Mo installé | Bien en dessous d’Electron (~150 Mo+) |
| **RAM au repos** | ~80–150 Mo | WebView2 + interface React |
| **CPU** | Faible en veille dashboard | Pics possibles au **scan pilotes** (1–2 min en mode étendu) |
| **Profil** | **Légère** pour une app desktop moderne | Pas **ultra-légère** (type utilitaire natif minimal) |

> **Distribution recommandée :** livrer l’installateur NSIS/MSI ou l’exécutable compilé — pas le dossier source avec `setup.bat` (réservé aux développeurs).

## ✨ Fonctionnalités

### Monitoring Système
- **CPU** - Usage en temps réel, graphique historique, et monitoring ultra-dense des cœurs (mode *Spectrum Equalizer* interactif). 🩷 Thème Rose (`#ff2d95`).
- **RAM** - Usage mémoire, mémoire utilisée/disponible, graphique historique. 🔵 Thème Cyan (`#00d4ff`).
- **GPU** - Monitoring natif avancé (DirectX DXGI & WMI) : VRAM totale réelle, VRAM allouée, utilisation 3D en temps réel. 🟣 Thème Violet (`#9d4edd`).
- **Réseau** - Débit temps réel (badge header ↓/↑), totaux cumulés, graphique AreaChart, **connexion active Wi‑Fi ou Ethernet** (icône + libellé). 🩵 Thème Turquoise (`#00fff7`).

### DNS Monitor (comparateur serveurs)
- Test de latence multi-serveurs DNS (Google, Cloudflare, Quad9, OpenDNS) — **TCP `:53`** (comparaison DNS, pas latence jeu)
- **Test auto** (bouton direct) : revient aux 4 serveurs recommandés + lance le ping immédiatement
- **Personnaliser** : ouvre les paramètres sur l'onglet **Réseau & DNS** pour choisir les serveurs
- **Statut de connexion dynamique** : bandeau inférieur avec verdict coloré (*Latence Excellente / Bonne / Moyenne / Critique*)
- Identification automatique du meilleur serveur DNS (couronne ⚜️)
- 🟢 Thème Vert Néon (`#00ff9d`)

### Latence Jeu — « Prêt pour le jeu »
- **Cellule Jeu** dans le bandeau stats (icône manette) — latence internet ICMP + verdict en temps réel
- **Badge cliquable** (`Prêt pour le jeu`, `Limite ranked`, `Wi‑Fi / box`, etc.) → ouvre le panneau détail
- **Panneau détail** (masqué par défaut) : **Passerelle** (IP box auto-détectée) · **Internet** (`1.1.1.1`) · **Jitter** (15 échantillons, ~30 s)
- Fermeture : bouton **Fermer**, re-clic sur le badge, ou touche **Échap**
- Verdicts : `ready` / `marginal` / `poor` / `local_issue` / `measuring` — couleurs vert / ambre / orange / rouge
- Mesure Rust toutes les **2 s** (thread dédié, indépendant du polling DNS)
- Actif en **dashboard** et **mode Zen** (`TelemetryGrid` intégré)

### Analyse des Pilotes
- **Mode Simplifié (défaut)** : **3 pilotes essentiels** — 1 GPU discret, 1 réseau (Ethernet prioritaire), 1 Bluetooth ; cartes récap `EssentialVersionsSummary` + liste compacte.
- **Mode Étendu** : GPU (+ iGPU), réseau (Ethernet + Wi‑Fi), BT, audio, stockage ; rescan **1–2 min** (toast warning à l’activation, modal seule).
- **Comparateur de versions** : installée vs disponible (WU + magasin `pnputil`), segments diff surlignés (`DriverVersionCompare`).
- **Mises à jour — Windows Update d’abord** : si WU propose une MàJ → **« Ouvrir Windows Update »** (action principale) ; lien constructeur/catalogue en secondaire. Si version trouvée **uniquement** dans le magasin pilotes → avertissement + lien OEM/catalogue + **« Vérifier Windows Update »**. Pas d’installation directe depuis l’app.
- **Détection Matériel Réel** : scan WMI ciblé, filtrage physique, blacklist VM/VPN/périphériques d’interface.
- **Safe UX** : statuts « Installé », « Vérifier », « MàJ dispo » — pas de fausses alertes d’obsolescence.
- **Liens constructeurs** : NVIDIA, AMD, Intel, Realtek + catalogue Microsoft si HW ID (`safeUrl.ts`).

### Zen Mode (Mode Méditation)
- **Bouton switchable dédié** : Bouton fleur de cerisier 🌸 dans la barre de titre pour basculer instantanément.
- **Horloge centrale** : Heure, date en français, citation dynamique selon la charge système.
- **Télémétrie intégrée** : CPU, RAM, GPU, **Jeu** (latence multijoueur + verdict), **Actif** (uptime compact `Xh Xm`) — même rendu que le bandeau dashboard, intégré dans la carte horloge (StatsBar masqué en Zen).
- **Protection antivirus réelle** : détection WMI (`Microsoft Defender`, Avast, etc.) — badge « Protégé · [programme] » ou « Non protégé · … ».
- **Analyse de charge dynamique** : `Math.max(cpuUsage, gpuUsage)` — ignore la RAM cache passive.
- **Trois états système** : Repos 💚 / Modéré 🩵 / Intense 💛 (pulsation + icône adaptée).
- **Économie de ressources** : graphiques SVG et widgets dashboard entièrement démontés ; sakura en **faible ou moyen** (élevé plafonné à moyen, sans gros pétales avant-plan).

## 🎨 Design

### Charte Graphique par Composant
- 🩷 **CPU** — Rose Cyberpunk `#ff2d95`
- 🔵 **RAM** — Bleu Cyan `#00d4ff`
- 🟣 **GPU** — Violet Néon `#9d4edd`
- 🩵 **Réseau** — Turquoise `#00fff7`
- 🟢 **DNS & Latence Jeu** — Vert Néon `#00ff9d`

### Thème Koi Monitor (Bento Paradigm)
- **Bento Paradigm**: Interface structurée en cartes arrondies modernes (`bento-cards`).
- **Système de Grille 8px (8-Pt Grid System)** : Tous les paddings, margins, gaps, hauteurs et largeurs de l'application sont rigoureusement alignés sur des multiples de 8px (avec tolérance exceptionnelle de 4px pour les détails ultra-fins), garantissant un alignement visuel parfait.
- **Loi de la Proximité (Contenu Proche / Distant)** : Regroupement visuel intelligent avec des écarts minimes (ex: `gap-2` / 8px) pour les éléments fortement liés (icône + texte, titre + sous-titre) et des espacements plus aérés (ex: `space-y-6` / 24px) pour les sections fonctionnelles distinctes.
- **Hiérarchie des Bordures & Rayons (Border-Radius)** : Structure organique cohérente avec des rayons de courbure adaptés au niveau d'imbrication (Cartes Bento parentes à `rounded-[2rem]` / 32px, conteneurs internes enfants à `rounded-2xl` / 16px, boutons interactifs et petits contrôles à `rounded-xl` / 12px ou `rounded-lg` / 8px).
- **Glassmorphisme Liquid Glass**: Panneaux transparents avec blur (toggle paramètres). **Sans grain** sur cartes glass (évite texture granuleuse). Mode Zen sombre : panneau plus opaque, blur adouci.
- **Tailwind CSS v4**: Architecture stylistique robuste, responsive et gérant nativement le mode sombre/clair via attributs de données (`data-theme`).
- **Typographie Premium**: `Geist Sans` pour l'interface globale, et `JetBrains Mono` pour les données et statistiques.
- **Couleurs Koi & Néon**: Préservation des identités colorées vibrantes (Pink, Cyan, Purple) sur fonds minimalistes.
- **Conformité WCAG AAA (Accessibilité)** : Optimisation ciblée des contrastes des textes de métriques pour garantir une lisibilité absolue (ratio de contraste supérieur ou égal à 7:1 en modes clair et sombre) tout en conservant le style brillant cyberpunk, structure sémantique ARIA complète et navigation intégrale au clavier.
- **Ergonomie ISO 9241 (Dialogue & UX)** : Conforme aux principes d'ergonomie des logiciels de la norme ISO 9241 (Auto-descriptivité, Contrôlabilité, Tolérance aux erreurs). Fermeture instantanée des modales et sortie du mode Zen via la touche `Échap`, double confirmation sécurisée sur le bouton "Réinitialiser" avec retour haptique visuel, bouton de retour explicite stylisé de haut standing en mode Zen, et annonces vocales en temps réel (`role="status"`, `aria-live="polite"`) sur les notifications toast.
- **Optimisation et Robustesse** : télémétrie push (événement Tauri 1 Hz), ring buffer historiques, Recharts lazy-load, sélecteurs Zustand granulaires, toasts erreurs visibles (DNS/pilotes), splash non bloquant, mémoïsation widgets, CI audit + budget bundle.
- **Uptime système en temps réel** dans le bandeau supérieur (format compact `Xh Xm`, libellé **Actif**)
- **StatsBar (Liquid Glass Hub)** : capsules avec anneaux SVG néon — CPU, RAM, GPU, **Jeu** (badge verdict cliquable), **Actif** ; panneau latence jeu repliable sous la grille (visible dashboard uniquement ; Zen utilise `TelemetryGrid` intégré)
- **Animation Sakura** : pétales animés en arrière-plan — en mode Zen : **faible ou moyen** selon réglage (élevé → moyen), pas de couche avant-plan

### Paramètres Persistants
- **Mode Simplifié (défaut)** : 3 pilotes essentiels (GPU, réseau, Bluetooth).
- **Intensité Sakura** : Ajuste le nombre de pétales (Désactivé, Faible, Moyen, Élevé).
- **Intervalle de rafraîchissement** : Configure la fréquence de mise à jour des métriques (1s, 2s, 5s, 10s).
- **Intervalle DNS** : Configure la fréquence de ping DNS (10s, 15s, 30s, 1min).
- **Serveurs DNS** : checklist deux lignes (nom + IP), normalisation legacy via `normalizeDnsChecklist()`
- **Effet Glassmorphism** : Active/désactive le flou vitré sur cartes, panneaux et modales (sombre & clair).

### Interface
- **Identité SlashTitle** : animation katana qui fend « Koi Monitor » (gradient → éclair cyan → texte scindé). Tailles `lg` (splash), `md` (À propos), `sm` (barre de titre). Rejouée au démarrage post-splash et à chaque visite de l’onglet À propos (`aboutSlashKey`).
- **Splash Screen** : orchestration séquentielle (init → matériel → DNS → pilotes → prêt) avec durées min par étape pour un affichage fluide ; barre interpolée ; timeout sécurité **90 s** ; `SplashSlashTitle`, aurora, sakura.
- Barre de titre personnalisée (sans décoration Windows) — titre animé ou statique selon phase de démarrage
- Widgets interactifs avec micro-animations Framer Motion fluides (effets ressort / `spring`)
- Toggle thème sombre/clair harmonisé
- **Paramètres → À propos** : `SlashTitle` + description produit sobre + crédit technique (Tauri, React, Rust) + version en pied de carte
- Structure de la grille auto-ajustable

## 🚀 Installation Rapide (One-Click)

> Réservée à la **compilation depuis les sources**. Les utilisateurs finaux installent l’`.exe` ou le setup NSIS/MSI — voir [Prérequis système](#-prérequis-système).

### Étape 1: Extraire le ZIP
1. Téléchargez `Koi-Monitor-v1.0.zip`
2. Extrayez dans un dossier (ex: `C:\KoiMonitor`)
3. Ouvrez le dossier

### Étape 2: Lancer l'Installation
1. **Clic droit** sur `setup.bat`
2. **"Exécuter en tant qu'administrateur"**
3. Patientez 10-30 minutes (première compilation Rust)

Le script installera automatiquement:
- ✅ Node.js 20.x (si manquant)
- ✅ Rust (si manquant)
- ✅ WebView2 (si nécessaire)
- ✅ Toutes les dépendances npm
- ✅ Build de l'exécutable .exe

### Étape 3: Lancer l'Application
- Double-cliquez sur le fichier `.exe` créé dans `src-tauri\target\release\`

## 🤖 Développement avec Cursor

Le projet inclut une configuration optimisée pour **Cursor / Composer 2.5** :

- **`CLAUDE.md`** — contexte projet (lu automatiquement par Cursor)
- **`.cursor/rules/`** — règles modulaires par domaine (design, frontend, Rust)
- **`.cursorignore`** — exclut `node_modules/`, `dist/`, `target/` de l'indexation

Pas besoin de skills externes : les conventions du projet sont déjà encodées dans ces fichiers.

## 📣 Documentation & communication

| Fichier | Usage |
|---------|--------|
| **`README.md`** | Documentation de référence (ce fichier) — technique + fonctionnel |
| **`readmegit.md`** | Variante **GitHub grand public** : ton lambda, UI et légèreté en avant |
| **`prompt-slides.txt`** | Prompt pour générer une présentation slide via IA (aligné sur `README.md`, sans installation) |

> Pour publier sur GitHub : copier `readmegit.md` → `README.md` du repo public, ou garder les deux si le repo reste orienté dev.

## 📁 Structure du Projet

```
koi-monitor/
├── .github/workflows/        # CI audit (npm, cargo, budget bundle)
├── src/                      # Frontend React + TypeScript
│   ├── components/
│   │   ├── charts/           # Recharts lazy (SingleAreaChart, DualAreaChart)
│   │   ├── common/           # TelemetryGrid, GamingLatencyBreakdown, StatusToast, SlashTitle…
│   │   ├── layout/
│   │   └── widgets/
│   ├── hooks/                # useTelemetryPoller, useFocusTrap, useViewportTier
│   ├── utils/                # gamingLatency, glassBlur, networkInterface, neonEffects, safeUrl
│   ├── services/             # api.ts — IPC + events Tauri
│   ├── store/
│   │   ├── index.ts          # Zustand (+ gamingLatency)
│   │   └── historyRing.ts    # Ring buffer graphiques
│   ├── styles/               # globals.css (tokens, glass blur)
│   └── types/                # GamingLatencySnapshot, DNS, SystemInfo…
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs            # Threads télémétrie + gaming, emit events
│   │   ├── gaming_latency.rs # ICMP passerelle/internet, jitter, verdicts
│   │   ├── dns.rs            # Ping DNS TCP :53 (whitelist IP)
│   │   ├── drivers.rs        # Scan pilotes WMI + collapse simplifié
│   │   ├── driver_updates.rs # Enrichissement WU COM, resolve_update_candidate, open WU settings
│   │   ├── driver_store.rs   # Fallback magasin pnputil
│   │   ├── driver_version.rs # Comparaison multi-format versions
│   │   └── security.rs       # Antivirus WMI
│   ├── capabilities/
│   └── tauri.conf.json       # CSP stricte
├── setup.bat
├── build.bat
├── dev.bat
├── README.md
├── readmegit.md              # README GitHub grand public (optionnel)
├── prompt-slides.txt         # Prompt présentation slide (IA)
└── CLAUDE.md
```

## ⚡ Architecture technique (résumé)

| Flux | Description |
|------|-------------|
| **Télémétrie** | Rust émet `telemetry-update` chaque seconde → React écoute via `useTelemetryPoller` |
| **Latence jeu** | Thread Rust 2 s → ICMP passerelle + `1.1.1.1` (+ TCP `:443` fallback) → jitter → `emit("gaming-latency-update")` + commande `get_gaming_latency` |
| **DNS** | Polling intervalle configurable (10 s – 1 min), mutex anti-collision — **séparé** de la latence jeu |
| **Historiques** | Ring buffer 288 points (CPU/RAM/GPU/réseau) — écriture O(1) |
| **Graphiques** | Recharts chargé à la demande (hors bundle initial ~60 KB) |
| **Erreurs** | Toast global en bas d'écran (`StatusToast`) |
| **Sécurité** | CSP WebView, URLs pilotes filtrées (`safeUrl.ts`), IP DNS whitelistées |
| **Pilotes MàJ** | WU COM + magasin `pnputil` → `update_source` ; UI WU-first (`open_windows_update`) |
| **Glass blur** | Classe `html.no-blur` + tokens `--glass-blur`, `--glass-surface`, `--card-solid` |

## 🔧 Dépannage

### Si erreur Node.js
```powershell
winget install OpenJS.NodeJS.LTS
```

### Si erreur Rust
```powershell
rustup update
rustc --version
```

### Si erreur WebView2
```powershell
winget install Microsoft.WebView2
```

### Si erreur npm
```powershell
npm cache clean --force
rm -Recurse node_modules
npm install
```

## 🎯 Checklist de Succès

- [x] Monitoring CPU temps réel
- [x] Monitoring RAM
- [x] Monitoring GPU avancé (DXGI/WMI 100% Natif)
- [x] Monitoring Network (Wi‑Fi / Ethernet, layout premium)
- [x] Mode clair lisible (surfaces opaques)
- [x] DNS comparateur multi-serveurs + boutons Test auto / Personnaliser
- [x] Latence jeu « Prêt pour le jeu » (passerelle, internet, jitter, badge cliquable)
- [x] Détection antivirus réelle (Defender, tiers)
- [x] Statut de latence dynamique (Excellente → Critique)
- [x] Analyse des pilotes avec filtres stricts, modes simplifié/étendu et flux MàJ WU-first
- [x] UI glassmorphisme Koi Monitor Night
- [x] Animations sakura
- [x] Toggle thème dark/light
- [x] Zen Mode (Mode Méditation) avec tracking dynamique et économie de ressources
- [x] Build Windows .exe
- [x] Script one-click installation
- [x] Télémétrie événements Tauri + fallback IPC
- [x] Ring buffer historiques + Recharts lazy
- [x] Toasts erreurs utilisateur + splash résilient
- [x] CI audit (npm, cargo, budget bundle)

## 📄 Licence

MIT License - Katana 2026

---

🌸 **Koi Monitor** - Surveillance système avec style.

*Créé avec passion pour les amateurs de monitoring système et d'esthétique Japonaise (Koi & Sakura).*