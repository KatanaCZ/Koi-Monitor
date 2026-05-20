# 🌸 Koi Monitor

![Icon](data:image/svg+xml,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22paint0_linear_favicon%22%20x1%3D%2212%22%20y1%3D%222%22%20x2%3D%2212%22%20y2%3D%2222%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%239d4edd%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2300d4ff%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20d%3D%22M12%202C6.47715%202%202%206.47715%202%2012C2%2017.5228%206.47715%2022%2012%2022C17.5228%2022%2022%2017.5228%2022%2012C22%206.47715%2017.5228%202%2012%202ZM12%2020C7.58172%2020%204%2016.4183%204%2012C4%207.58172%207.58172%204%2012%204C16.4183%204%2020%207.58172%2020%2012C20%2016.4183%2016.4183%2020%2012%2020Z%22%20fill%3D%22url(%23paint0_linear_favicon)%22%2F%3E%3C%2Fsvg%3E)

**Application de monitoring système pour Windows 11** avec une interface glassmorphisme thème **Koi Monitor Night**.

<!-- Screenshot: exécuter `npm run tauri dev` pour prévisualiser l'interface -->

## ✨ Fonctionnalités

### Monitoring Système
- **CPU** - Usage en temps réel, graphique historique, et monitoring ultra-dense des cœurs (mode *Spectrum Equalizer* interactif). 🟣 Thème Rose (`#ff2d95`).
- **RAM** - Usage mémoire, mémoire utilisée/disponible, graphique historique. 🔵 Thème Cyan (`#00d4ff`).
- **GPU** - Monitoring natif avancé (DirectX DXGI & WMI) : VRAM totale réelle, VRAM allouée, utilisation 3D en temps réel. 🟣 Thème Violet (`#9d4edd`).
- **Réseau** - Vitesse téléchargement/envoi en temps réel, données totales transférées, graphique AreaChart. 🟢 Thème Turquoise (`#00fff7`).

### DNS & Ping Monitor
- Test de latence multi-serveurs DNS (Google, Cloudflare, Quad9, OpenDNS)
- **Statut de connexion dynamique** : le bandeau inférieur affiche un verdict coloré en temps réel (*Latence Excellente / Bonne / Moyenne / Critique*) dont la couleur, la bordure et l'icône changent selon le ping mesuré.
- Identification automatique du meilleur serveur DNS (couronne ⚜️)
- 🟢 Thème Vert Néon (`#00ff9d`)

### Analyse des Pilotes
- **Détection Matériel Réel** : Scan intelligent ciblé sur le matériel physique critique (GPU, Cartes réseau, Audio).
- **Filtrage Avancé** : Exclusion automatique et stricte des périphériques virtuels (VM, VPN, tunnels réseau) et des périphériques d'interface (souris, claviers, casques).
- **UX Bienveillante (Safe UX)** : Statuts non-anxiogènes ("Installed" ou "Verify Online") pour éviter de fausses alertes d'obsolescence à l'utilisateur lambda.
- **OEM & Catalog Integration** : Association intelligente avec les sites de pilotes constructeurs officiels (NVIDIA, AMD, Intel, Realtek, etc.) ou recherche ciblée par Hardware ID sur le Microsoft Update Catalog.
- **Recherche & Filtres** : Recherche par nom ou fournisseur et filtres par catégorie de périphérique.

## 🎨 Design

### Charte Graphique par Composant
- 🩷 **CPU** — Rose Cyberpunk `#ff2d95`
- 🔵 **RAM** — Bleu Cyan `#00d4ff`
- 🟣 **GPU** — Violet Néon `#9d4edd`
- 🩵 **Réseau** — Turquoise `#00fff7`
- 🟢 **DNS & Ping** — Vert Néon `#00ff9d`

### Thème Koi Monitor (Bento Paradigm)
- **Bento Paradigm**: Interface structurée en cartes arrondies modernes (`bento-cards`).
- **Glassmorphisme Liquid Glass**: Panneaux transparents avec blur et reflets subtils.
- **Tailwind CSS v4**: Architecture stylistique robuste, responsive et gérant nativement le mode sombre/clair via attributs de données (`data-theme`).
- **Typographie Premium**: `Geist Sans` pour l'interface globale, et `JetBrains Mono` pour les données et statistiques.
- **Couleurs Koi & Néon**: Préservation des identités colorées vibrantes (Pink, Cyan, Purple) sur fonds minimalistes.
- **Conformité WCAG AA (Accessibilité)** : Optimisation ciblée des contrastes des textes de métriques en mode clair pour garantir une lisibilité absolue (ratio de contraste supérieur ou égal à 4.5:1 sur fond clair) tout en conservant le style brillant cyberpunk en mode sombre.
- **Optimisation et Robustesse** : Mémoïsation du rendu graphique (CPU, RAM, GPU, Réseau), défilement continu du graphique de débit réseau (sans gel au repos), et nettoyage intégral du code mort backend (Rust) et frontend.
- **Uptime système en temps réel** dans le bandeau supérieur (`Xd Xh Xm Xs` avec pulsation continue)
- **StatsBar (Liquid Glass Hub)** : Design de capsules haut de gamme avec des anneaux de progression néon circulaires SVG enroulés autour des icônes Lucide de statistiques.
- **Animation Sakura** : pétales animés en arrière-plan (canvas HTML5, derrière toutes les informations)

### Interface
- **Splash Screen Premium Glassmorphism** : Écran d'accueil dynamique au démarrage avec double orbite lumineuse en rotation, suivi de chargement étape par étape (matériel, DNS, pilotes) et transition fluide révélant l'interface Bento par glissement et fondu.
- Barre de titre personnalisée (sans décoration Windows)
- Widgets interactifs avec micro-animations Framer Motion fluides (effets ressort / `spring`)
- Toggle thème sombre/clair harmonisé
- Structure de la grille auto-ajustable

## 🚀 Installation Rapide (One-Click)

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

## 📁 Structure du Projet

```
koi-monitor/
├── src/                      # Frontend React + TypeScript
│   ├── components/           # Composants UI
│   ├── services/            # API calls vers Rust
│   ├── store/               # Zustand state management
│   ├── styles/              # CSS Katana theme
│   └── types/               # Types TypeScript
├── src-tauri/                # Backend Rust
│   ├── src/                 # Modules Rust
│   │   ├── lib.rs          # Commandes Tauri
│   │   ├── dns.rs          # Module DNS ping
│   │   └── drivers.rs      # Module drivers
│   └── Cargo.toml          # Config Rust
├── setup.bat                # Script one-click installation ⭐
├── build.bat                # Build executable .exe
├── dev.bat                  # Lancer serveur dev Tauri
├── package.json            # Config npm
└── README.md               # Ce fichier
```

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
- [x] Monitoring Network
- [x] DNS Ping multi-serveurs
- [x] Statut de latence dynamique (Excellente → Critique)
- [x] Analyse des pilotes avec filtres stricts et Safe UX
- [x] UI glassmorphisme Katana
- [x] Animations sakura
- [x] Toggle thème dark/light
- [x] Build Windows .exe
- [x] Script one-click installation

## 📄 Licence

MIT License - Katana 2026

---

🌸 **Koi Monitor** - Surveillance système avec style.

*Créé avec passion pour les amateurs de monitoring système et d'esthétique Japonaise (Koi & Sakura).*