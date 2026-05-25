<div align="center">

# 🌸 Koi Monitor

[![Audit & Build](https://github.com/KatanaCZ/Koi-Monitor/actions/workflows/audit.yml/badge.svg)](https://github.com/KatanaCZ/Koi-Monitor/actions/workflows/audit.yml)
[![Release](https://img.shields.io/github/v/release/KatanaCZ/Koi-Monitor?label=Release&color=9d4edd)](https://github.com/KatanaCZ/Koi-Monitor/releases/latest)

### *Votre PC, enfin lisible. Beau. Léger. Fiable.*

**Surveillez Windows sans ouvrir un outil gris des années 2000.**

<br />

![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4?style=for-the-badge&logo=windows&logoColor=white)
![Léger](https://img.shields.io/badge/Léger-~10–25%20Mo-00d4ff?style=for-the-badge)
![Gratuit](https://img.shields.io/badge/Gratuit-MIT-00ff9d?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-1.1.1-9d4edd?style=for-the-badge)

<br />

![Aperçu de Koi Monitor — dashboard](docs/screenshots/MockupViews_1x_PNG_20260524_274.png)

*Verre dépoli · Thème sombre & clair · Ambiance sakura*

<br />

[Pourquoi Koi](#-pourquoi-koi) ·
[Interface](#-une-interface-qui-fait-envie) ·
[Léger & discret](#-léger-et-discret) ·
[Fiable](#-des-chiffres-honnêtes) ·
[Fonctionnalités](#-ce-que-vous-pouvez-faire) ·
[Installation](#-installation) ·
[Vie privée](#-vie-privée--sécurité)

</div>

---

## 🎐 Pourquoi Koi

Les moniteurs système classiques ? Chiffres partout, fond gris, courbes illisibles. On dirait le panneau de config Windows, version fatigue.

**Koi, c’est l’inverse.**

Une app claire et colorée qui répond à trois questions simples :

- Mon PC va bien ?
- Ma connexion tient le coup pour jouer en ligne ?
- Un pilote mérite un coup d’œil ?

Pas de jargon. Pas de fausses alertes pour vous stresser. **Votre machine, en langage humain.**

---

## ✨ Une interface qui fait envie

Ce n’est pas un thème posé sur un utilitaire. C’est une app qu’on a envie de **laisser ouverte**.

| Vous voyez… | Pourquoi ça compte |
|-------------|-------------------|
| 🩷 **CPU** (rose) | Charge, graphique, vue par cœur, température live (lorsque supportée) |
| 🔵 **RAM** (cyan) | Mémoire vraiment utilisée |
| 🟣 **GPU** (violet) | Carte, VRAM, charge en jeu, température live (lorsque supportée) |
| 🩵 **Réseau** (turquoise) | Débit live, Wi‑Fi ou câble |
| 🟢 **DNS & Jeu** (vert) | Meilleur serveur + latence multijoueur |

**Ce qui fait la différence au quotidien :**

- **Cartes en verre** — lisibles, désactivables si vous préférez plus sobre
- **Sakura** — pétales en fond, 4 teintes (rose, violet, bleu, menthe) qui colorent aussi l’interface
- **Ouverture signature** — animation katana, splash ~8–10 s sur une machine rapide
- **Icône app** — le mot **Koi** en néon (même style que la barre de titre), visible fenêtre, barre des tâches et zone de notification
- **Musique zen** — démarre avec le tableau de bord, volume mémorisé ; une seconde piste se cache pour les curieux
- **Thème clair ou sombre** — confortable de jour comme de nuit
- **Paramètres** — **Essentiel · Atmosphère · Connexion · Veille · À propos** ; préréglages **Zen · Doux · Aura** en un clic ; serveur DNS perso (IP + surnom)

> Beau à garder ouvert — pas seulement utile une fois par mois.

---

## ⚡ Léger et discret

Un moniteur ne devrait pas être l’app la plus lourde de votre PC.

| | Koi Monitor | Beaucoup d’apps « modernes » |
|--|-------------|------------------------------|
| **Disque** | ~10–25 Mo | Souvent 150 Mo+ |
| **RAM au repos** | ~80–150 Mo | Souvent bien plus |
| **En veille** | Très faible | Variable |

Laissez-la tourner pendant le travail, le stream ou une session de jeu. Vous ne devriez pas sentir une deuxième app lourde à côté.

- **Moteur de particules Canvas 2D** : La pluie de pétales de fleurs utilise un moteur Canvas 2D avec pré-rendu hors-écran (offscreen buffers), isolation matérielle des calques (`will-change`, `contain`) et un bridage intelligent (30 FPS actif, 24 FPS cinéma en arrière-plan lorsque vous jouez). La charge CPU/GPU des animations est réduite de 95%, libérant toutes vos ressources pour le jeu.


### Mode Zen 🌸

![Mode Zen](docs/screenshots/MockupViews_1x_PNG_20260524_829.png)

Un clic sur la fleur de cerisier. Le dashboard s’efface. Il reste :

- une **grande horloge** et la date ;
- un **étang** qui ondule selon l’état **Zen · Flow · Boost** ;
- **CPU · GPU · Jeu** en grands chiffres, **RAM · Actif** en dessous (masquables) ;
- la barre du haut qui réapparaît au survol — volume, réglages, cloche.

Parfait sur un second écran, en focus, ou quand vous voulez juste du calme.

---

## 🛡️ Des chiffres honnêtes

Joli, c’est bien. Faux, c’est non.

- **Données Windows** — pas de chiffres inventés
- **Températures réelles** — les sondes thermiques CPU/GPU utilisent les classes WMI/ACPI standard de Windows (`MSAcpi_ThermalZoneTemperature`). Si votre carte mère (notamment AMD) ou votre BIOS ne propage pas ces sondes physiques, le badge s'efface proprement. **Koi n'invente et ne simule jamais de fausses données.**
- **Latence jeu ≠ DNS** — le ping de votre box n’est pas un test Cloudflare ; on ne mélange pas les deux
- **Pilotes sans drama** — « Installé », « À vérifier », « MàJ dispo » ; pas de « votre PC est obsolète »
- **MàJ pilotes** — Windows Update d’abord ; liens NVIDIA / AMD / Intel en secours
- **Alertes** — off par défaut ; si activées : toast discret, zéro popup Windows

Un test qui échoue ? **Message clair en bas de l’écran**, pas une erreur cryptique. Et si un scan pilote traîne, l’app démarre quand même (jusqu’à ~90 s au pire).

---

## 🧩 Ce que vous pouvez faire

### 📊 PC en direct

CPU, RAM, GPU, réseau — graphiques d’historique, cœurs CPU en « égaliseur », Wi‑Fi ou Ethernet affiché clairement, températures CPU & GPU (sur configurations dotées de sondes ACPI/WMI compatibles).

### 🌐 Meilleur DNS

Compare Google, Cloudflare, Quad9, OpenDNS. Cochez les serveurs, lancez le test. Ajoutez **votre** serveur (box, Pi-hole…) avec un surnom. Le plus rapide prend la couronne ⚜️.

### 🎮 Prêt pour le jeu ?

Badge simple : *Prêt pour le jeu*, *Limite ranked*, *Problème box / Wi‑Fi*… Un clic pour le détail : box, internet, jitter. Visible sur le dashboard et en mode Zen.

### 🔧 Pilotes

**Simplifié (défaut)** : 3 essentiels — GPU, réseau, Bluetooth.  
**Étendu** : tout le matériel important (~1–2 min).  
Versions comparées, bouton **Ouvrir Windows Update** quand une MàJ officielle existe. Pas de fausse promesse « installer en un clic ».

### 🔔 Alertes (optionnel)

Off par défaut. Au premier lancement, vous choisissez — **Échap** = pas maintenant.

| Contexte | Koi vous prévient si… | Exemple |
|----------|----------------------|---------|
| **Bureau** | La machine force trop longtemps | *Bureau · La machine force · CPU 92 %* |
| **Jeu** | Votre ping s’éloigne de son habitude | *Jeu · Ping qui monte · 60 ms · d’habitude ~10 ms* |

Un message à la fois. Raté quelque chose ? La **cloche** garde le journal de la session. Réglages dans **Veille** : sensibilité **Discrète / Équilibrée / Attentive**, latence jeu on/off.

---

## 🚀 Installation

### Télécharger (recommandé)

1. Ouvrez la **[dernière Release](https://github.com/KatanaCZ/Koi-Monitor/releases/latest)**
2. Téléchargez **`koi-monitor.exe`**
3. Copiez-le où vous voulez et double-cliquez

Notes de version : onglet Release ou [`CHANGELOG.md`](CHANGELOG.md).

**C’est tout.** Pas de Node, pas de Rust, pas d’installateur.

| | |
|--|--|
| **OS** | Windows 10 ou 11, 64 bits |
| **WebView2** | Déjà là sur Windows 11 ; sur Windows 10, via Windows Update ou Edge si besoin |
| **Internet** | Recommandé (DNS, latence, pilotes) |
| **Compte** | Utilisateur standard suffit en général |
| **Entreprise** | Certains PC verrouillés limitent les scans avancés |

<details>
<summary><strong>Développeurs — compiler depuis les sources</strong></summary>

```powershell
git clone https://github.com/KatanaCZ/Koi-Monitor.git
cd koi-monitor
.\koi.bat setup    # Admin — première installation
.\koi.bat dev      # Tauri + Vite (port 1420)
.\koi.bat devfast  # Frontend seul + exe debug
.\koi.bat build    # Exe dans %LOCALAPPDATA%\koi-monitor\
```

Prérequis : Node.js 20+, Rust, WebView2. Doc technique : [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

</details>

---

## 🔒 Vie privée & sécurité

**100 % local.** Pas de compte. Pas de cloud. Vos métriques restent sur votre machine.

| Quoi | Où | Quand |
|------|-----|--------|
| **L’exe** | Là où *vous* l’avez copié | Vous le gardez / supprimez |
| **Profil app** (WebView2) | `%LOCALAPPDATA%\com.koi.monitor\` | Premier lancement |
| **Réglages** (thème, DNS, alertes…) | Dans ce profil, quelques Ko | Quand vous changez une option |
| **Graphiques, journal, cache** | RAM seulement | Effacés à la fermeture |

**Éveil avec Windows** (off par défaut) : une entrée au démarrage — sans copier l’exe ailleurs.

**Tout retirer :** fermez l’app → désactivez l’autostart si besoin → supprimez l’exe → optionnel : dossier `%LOCALAPPDATA%\com.koi.monitor\`.

Tests réseau et scans pilotes passent par Windows (`ping`, WMI…). Koi n’installe rien à votre place. Code **open source** (MIT).

---

## 📄 Licence

**MIT** — Katana © 2026  
Libre d’utilisation, modification et partage. Voir [`LICENSE`](LICENSE).

---

<div align="center">

### 🌸 Koi Monitor

*Comprendre son PC ne devrait pas être une corvée.*  
*Léger. Beau. Fiable.*

<br />

**[⬆ Retour en haut](#-koi-monitor)**

</div>
