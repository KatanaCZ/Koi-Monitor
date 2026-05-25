# 🌸 Koi Monitor

![Icon](data:image/svg+xml,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22paint0_linear_favicon%22%20x1%3D%2212%22%20y1%3D%222%22%20x2%3D%2212%22%20y2%3D%2222%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%239d4edd%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2300d4ff%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20d%3D%22M12%202C6.47715%202%202%206.47715%202%2012C2%2017.5228%206.47715%2022%2012%2022C17.5228%2022%2022%2017.5228%2022%2012C22%206.47715%2017.5228%202%2012%202ZM12%2020C7.58172%2020%204%2016.4183%204%2012C4%207.58172%207.58172%204%2012%204C16.4183%204%2020%207.58172%2020%2012C20%2016.4183%2016.4183%2020%2012%2020Z%22%20fill%3D%22url(%23paint0_linear_favicon)%22%2F%3E%3C%2Fsvg%3E)

**Application de monitoring système pour Windows 10 et 11** avec une interface glassmorphisme thème **Koi Monitor Night**.

<!-- Screenshot: exécuter `npm run tauri dev` pour prévisualiser l'interface -->

## 💻 Prérequis système

### Utilisateur final (exécutable portable `.exe`)

| Critère | Détail |
|---------|--------|
| **OS** | Windows **10** ou **11**, **64 bits** (build récent recommandé) |
| **WebView2** | Runtime Microsoft Edge WebView2 (souvent déjà présent). Windows 11 : inclus. Windows 10 : via Windows Update / Edge |
| **À installer** | **Rien** — copiez `koi-monitor.exe` où vous voulez et double-cliquez |
| **Plateforme** | **Windows uniquement** (WMI, DXGI, PowerShell, scan pilotes) |
| **Réseau** | Requis pour tests DNS, latence jeu et recherche de MàJ pilotes |
| **Droits** | Compte utilisateur standard suffit en général ; environnements verrouillés (entreprise) peuvent limiter WMI ou PowerShell |

### Développeur (compilation depuis les sources)

Node.js 20+, Rust (stable), npm, WebView2 — voir [Installation Rapide](#-installation-rapide-one-click) et `koi.bat setup`.

### Empreinte (ordre de grandeur)

| | Koi Monitor (Tauri) | Référence |
|--|---------------------|-----------|
| **Disque** | ~10–25 Mo (exe + WebView2 partagé) | Bien en dessous d’Electron (~150 Mo+) |
| **RAM au repos** | ~80–150 Mo | WebView2 + interface React |
| **CPU** | Faible en veille dashboard | Pics possibles au **scan pilotes** (1–2 min en mode étendu) |
| **Profil** | **Légère** pour une app desktop moderne | Pas **ultra-légère** (type utilitaire natif minimal) |

> **Distribution recommandée :** livrer **`koi-monitor.exe`** (portable, frontend embarqué) — pas de setup MSI/NSIS. Après `koi.bat build`, lancer **`%LOCALAPPDATA%\koi-monitor\koi-monitor.exe`** (évite blocage Defender sur le Bureau) ; copie dev : `src-tauri\target\release\`.

### Données locales & vie privée (utilisateur final)

- **Portable** — l’exe reste où l’utilisateur l’a copié ; pas d’installateur, pas de dossier `Program Files` imposé.
- **Profil WebView2** — `%LOCALAPPDATA%\com.koi.monitor\` (identifiant Tauri `com.koi.monitor`) ; créé au premier lancement.
- **Persistance frontend** — `localStorage` : `koi_settings`, `koi_theme`, `koi_alerts_onboarding_done`, `koi_easter_music_seen` (quelques Ko).
- **Session uniquement (RAM)** — historiques graphiques, journal cloche, cache pilotes Rust, télémétrie : rien n’est exporté ni synchronisé cloud.
- **Optionnel** — `launchAtStartup` → entrée démarrage Windows via `tauri-plugin-autostart` (off par défaut).
- **Désinstallation manuelle** — supprimer l’exe + dossier `%LOCALAPPDATA%\com.koi.monitor\` si réglages inclus.

Version grand public : section **Données & vie privée** dans [`README.md`](README.md).

## ✨ Fonctionnalités

### Monitoring Système
- **CPU / RAM / GPU** — une carte widget chacun (anneau + graphique + détail) ; **pas de bandeau StatsBar** (évite le doublon avec le mode Zen)
- **CPU** - Usage en temps réel, graphique historique, et monitoring ultra-dense des cœurs (mode *Spectrum Equalizer* interactif). 🩷 Thème Rose (`#ff2d95`).
- **RAM** - Usage mémoire, mémoire utilisée/disponible, graphique historique. 🔵 Thème Cyan (`#00d4ff`).
- **GPU** - Monitoring natif avancé (DirectX DXGI & WMI) : **adaptateur discret préféré** (NVIDIA/AMD) sur PC hybrides, **VRAM disponible** + VRAM utilisée, charge GPU (3D/Compute/Copy). 🟣 Thème Violet (`#9d4edd`).
- **Réseau** - Débit temps réel (badge header ↓/↑), totaux cumulés, graphique AreaChart (**s’étire** avec la carte DNS voisine), **connexion active Wi‑Fi ou Ethernet** (icône + libellé). 🩵 Thème Turquoise (`#00fff7`).

### DNS Monitor (comparateur serveurs)
- Test de latence multi-serveurs DNS (Google, Cloudflare, Quad9, OpenDNS) — **TCP `:53`** (comparaison DNS, pas latence jeu)
- **Test auto** (bouton direct) : revient aux 4 serveurs recommandés + lance le ping immédiatement
- **Personnaliser** : ouvre les paramètres sur l'onglet **Connexion** pour choisir les serveurs
- **Serveur personnel** : **1 IP** (box, Pi-hole, DNS maison) dans **Connexion** — adresse + surnom optionnel, bouton **Valider** ; pingée en plus des presets, affichée comme les autres dans le widget
- **Layout widget** : hauteur fixe **400 px** (≤ 4 serveurs) ou **460 px** (5+) — **alignée avec la carte Réseau** via `dnsWidgetLayout.ts` + `onLayoutHeightChange` ; **+184 px** si panneau détail jeu ouvert · liste DNS **centrée verticalement** entre l’en-tête et le bandeau **Via / En jeu** (`min-h-full` + `justify-center`, scroll interne si débordement) · compact en **flex wrap + justify-center** (2 col. · 3 col. dès 5 lg) — dernière ligne incomplète **centrée horizontalement**
- **Bandeau inférieur dual** : **Via {meilleur DNS}** + **En jeu** — **deux cartes jumeaux séparées** (style lignes DNS), verdict coloré + badge latence jeu cliquable
- Identification automatique du meilleur serveur DNS (couronne ⚜️)
- 🟢 Thème Vert Néon (`#00ff9d`)

### Latence Jeu — « Prêt pour le jeu »
- **Panneau En jeu** dans le bandeau **Via** du widget DNS (`DnsViaBand`) — latence internet ICMP + verdict en temps réel
- **Badge cliquable** (`Prêt pour le jeu`, `Limite ranked`, `Wi‑Fi / box`, etc.) → ouvre le panneau détail sous le bandeau
- **Panneau détail** (masqué par défaut) : **Passerelle** (IP box auto-détectée) · **Internet** (`1.1.1.1`) · **Jitter** (15 échantillons, ~30 s)
- Fermeture : bouton **Fermer**, re-clic sur le badge, ou touche **Échap**
- Verdicts : `ready` / `marginal` / `poor` / `local_issue` / `measuring` — couleurs vert / ambre / orange / rouge
- Mesure Rust toutes les **2 s** (thread dédié, indépendant du polling DNS)
- Dashboard : bandeau **Moniteur DNS & Ping** · mode Zen : `ZenMetricsDock` (CPU · GPU · Jeu · RAM · Actif en très grand, masquables)

### Alertes intelligentes (Phase 1)

Comme une brise sur l'eau, au bureau un mot si la machine force, en session un murmure si le ping s'éloigne de son rythme. Discret en bas de l'écran, jamais de popup Windows. La veille s'active ou se repose dans Paramètres, onglet Veille, vous gardez la main.

- **Off par défaut** — proposition au **1er lancement** (`AlertOnboardingModal`, flag `koi_alerts_onboarding_done`, **Échap** = « Pas maintenant »).
- **Deux contextes auto** (invisibles pour l’utilisateur) :
  - **Bureau** — travail, navigateur, montage : alerte si le PC reste **sous pression** (CPU, RAM ou GPU).
  - **Jeu** — session détectée (`max(CPU,GPU) ≥ 45 %` pendant **25 s**) : alerte si le ping **grimpe vs votre habitude** (baseline session, min. 5 mesures) **ou** dépasse le plafond absolu (~80 ms).
- **Messages toast** (fun & clairs) :
  - `Bureau · PC sous pression · CPU 92 %` (composant le plus sollicité, **une seule alerte**)
  - `Jeu · Ping en hausse · 60 ms · ~4 s · habituel ~10 ms` — adapté fibre / connexion compétitive
- **Anti-spam** : seuil **3 s** · **1 toast à la fois** · cooldown (**45–90 s** bureau · **90 s** jeu) · pas d’alerte bureau pendant la montée vers le profil jeu.
- **Journal** : cloche dans la barre de titre (`NotificationLayer`, z-index au-dessus du dashboard) — historique session (24 entrées), toast cliquable, pillule Zen si alertes ratées.
- **Paramètres → Veille** : master on/off · **Sensibilité** (Discrète / Équilibrée / Attentive) · **Latence en jeu** on/off.
- **Pas de popup Windows** — toasts in-app uniquement (`StatusToast` + `pushStatusToast(..., { source: 'alert' })`).
- **Dev** (console) : `koiSimulateLoad()` · `koiSimulateGaming()` (30 s) · `koiSimulateLatency200()` · `koiSimulateZen()` · `koiSimulateFlow()` · `koiSimulateBoost()` · `koiPlayEasterMusic()` · `koiStopEasterMusic()` — voir `alertDevSimulation.ts` / `easterEggMusic.ts`.

### Analyse des Pilotes
- **Layout dashboard** : carte **380 px** (alignée DNS/Réseau), grille **flex-wrap** centrée (lignes impaires équilibrées), **sans scroll** ; densité auto (compact ≥ 4, 3 col ≥ 5, 4 col ≥ 9 pilotes).
- **Bandeau récap** : style « Via … » DNS — compteurs Premium Zen en bas ; tuiles dashboard **informatives** (pas de clic).
- **Zoom agrandi** : master-detail — grille sélectionnable + panneau détail (`DriverDetailPanel`) : comparateur, ID matériel, actions WU/OEM.
- **Mode Simplifié (défaut)** : **3 pilotes essentiels** — 1 GPU discret, 1 réseau (Ethernet prioritaire), 1 Bluetooth ; tuiles compactes unifiées.
- **Mode Étendu** : GPU (+ iGPU), réseau (Ethernet + Wi‑Fi), BT, audio, stockage ; rescan **1–2 min** (toast warning à l’activation, modal seule).
- **Comparateur de versions** : installée vs disponible (WU + magasin `pnputil`), segments diff surlignés (`DriverVersionCompare`).
- **Mises à jour — Windows Update d’abord** : matching **HWID/PCI uniquement** (plus de fuzzy name) ; si WU propose une MàJ → **« Ouvrir Windows Update »** (action principale) ; lien constructeur/catalogue en secondaire. Si version trouvée **uniquement** dans le magasin pilotes → avertissement + lien OEM/catalogue + **« Vérifier Windows Update »**. Scan/WU timeout **90 s / 60 s**. Pas d’installation directe depuis l’app.
- **Détection Matériel Réel** : scan WMI ciblé, filtrage physique, blacklist VM/VPN/périphériques d’interface.
- **Safe UX** : statuts « Installé », « À confirmer », « Nouveauté » — pas de fausses alertes d’obsolescence.
- **Liens constructeurs** : NVIDIA, AMD, Intel, Realtek + catalogue Microsoft si HW ID (`safeUrl.ts`).
- **Copy** : ton Premium Zen centralisé (`driverCopy.ts`) · séparateur ` · ` · pas de tiret long en prose utilisateur.

### Zen Mode (Mode Méditation) — Fond wallpaper
- **Bouton fleur** 🌸 dans la barre de titre pour basculer instantanément.
- **TitleBar auto-masquée** (`ZenTitleBarDock`) : peek ~14 px en haut · ligne néon d’affordance · reste visible si journal de veille ouvert · **même largeur et marge haute** que le dashboard (`TITLE_BAR_SHELL_CLASS` : `max-w-7xl` + gouttières + `pt-6`).
- **Fond étang** (`ZenPondBackground`) : dégradé radial + surface d’eau + **ondulations SVG** réactives à **Zen / Flow / Boost** · désactivé si aura off, animations calmes ou `prefers-reduced-motion`.
- **Typographie seule, centrée** (`zen-wallpaper-core`) : horloge **très grande** · date XL · libellé d’état discret (couleur verdict) · citation grande italique — **sans panneaux glass**.
- **Métriques grandes** (`ZenMetricsDock`) : **CPU · GPU · Jeu** en chiffres neon XL + barre fine · **RAM · Actif** en ligne large · chip latence jeu cliquable → panneau détail (**Échap** ferme le panneau avant de quitter Zen).
- **Visibilité métriques** : raccourci **œil** dans le footer Zen (`zenMetricsVisible`, persisté)
- **Sortie** : hint « Échap · Tableau de bord » discret · toggle fleur (TitleBar au survol).
- **Transitions** : entrée/sortie Zen en fondu + scale (~600 ms).
- **Détection d’état** (`zenLoadState.ts` + `useZenLoadState.ts`) : `max(CPU, GPU)` — médiane 5 s, warmup, anti-pics, montée **5 s** / descente **3 s** ; tracker `useRef` sans polling extra.
- **Trois états** : **Zen** 💚 / **Flow** 🩵 / **Boost** 💛 — `getZenStateChipStyle()` · `aria-live`.
- **Économie de ressources** : widgets dashboard démontés, history rings off, DNS suspendu ; sakura plafonné (`high→medium`, `medium→low`).

### Musique ambiante
- **Démarrage** : à la fin du splash (`showSplash → false`), en sync avec la révélation du tableau de bord — pas pendant l’intro katana.
- **Piste principale** : [`public/audio/koi-ambient.mp3`](public/audio/koi-ambient.mp3) → `/audio/koi-ambient.mp3` — boucle, fondu ~1,2 s, volume ~35 %.
- **Piste secrète (easter egg)** : [`public/audio/koi-easter.mp3`](public/audio/koi-easter.mp3) — lazy load, crossfade depuis l’ambiante, volume ~40 %, boucle.
- **Moteur audio** : [`src/utils/ambientMusic.ts`](src/utils/ambientMusic.ts) — registre multi-pistes (`ambient` | `easter`), `playTrack`, `crossfadeTo`, `pauseAll`, fondus annulables (`fadeGeneration`), volumes clampés `[0, 1]`.
- **Contrôle** : bouton **Volume2 / VolumeX** TitleBar (halo `--accent`) ; mute/unmute relance la piste active (ambiante ou easter).
- **Persistance** : `settings.ambientMusicMuted` dans `koi_settings` (défaut : musique **on**).
- **Accessibilité** : `prefers-reduced-motion` → pas d’autoplay ; activation manuelle via le bouton volume.
- **Easter egg « Koi »** :
  - **Geste** : **5 clics rapides** (< 2,5 s) sur le mot **« Koi »** du `SlashTitle` — onglet **À propos** (Paramètres) ou barre de titre (`onSecretTap`).
  - **1ère découverte** : toasts taquins aux clics 1–4 (`EASTER_HINT_TOASTS`, `skipLog`) → clic 5 : crossfade easter + toast *Koi · Tu l'as trouvée. Écoute.*
  - **Déjà trouvé** (`koi_easter_music_seen`) : pas de hints 1–4 ; 5 clics → toast récompense + easter.
  - **Easter actif** : 5 clics → retour ambiante en crossfade, **sans toast**.
  - **État session** : `easterMusicActive` (Zustand, non persisté) · découverte : `koi_easter_music_seen` (localStorage).
  - **Hooks** : `useEasterEggMusic` + `useAmbientMusic` (ambiante seule ; pas de `playTrack('easter')` pour éviter les courses avec le crossfade).
  - **Dev** : `koiPlayEasterMusic()` · `koiStopEasterMusic()` (console, `import.meta.env.DEV`).
- **CSP** : `media-src 'self'` dans `tauri.conf.json`.

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
- **Glassmorphisme Liquid Glass**: Panneaux transparents avec blur (toggle **Verre dépoli** dans Paramètres). **Sans grain** sur cartes glass (évite texture granuleuse). Mode Zen sombre : bento plus opaque, blur adouci — le wallpaper Zen reste typographie seule (pas de docks glass).
- **Tailwind CSS v4**: Architecture stylistique robuste, responsive et gérant nativement le mode sombre/clair via attributs de données (`data-theme`).
- **Typographie Premium**: `Geist Sans` pour l'interface globale, et `JetBrains Mono` pour les données et statistiques.
- **Couleurs Koi & Néon**: Préservation des identités colorées vibrantes (Pink, Cyan, Purple) sur fonds minimalistes.
- **Conformité WCAG AAA (Accessibilité)** : Optimisation ciblée des contrastes des textes de métriques pour garantir une lisibilité absolue (ratio de contraste supérieur ou égal à 7:1 en modes clair et sombre) tout en conservant le style brillant cyberpunk, structure sémantique ARIA complète et navigation intégrale au clavier.
- **Ergonomie ISO 9241 (Dialogue & UX)** : Conforme aux principes d'ergonomie des logiciels de la norme ISO 9241 (Auto-descriptivité, Contrôlabilité, Tolérance aux erreurs). Fermeture instantanée des modales et sortie du mode Zen via la touche `Échap`, double confirmation sécurisée sur le bouton "Réinitialiser" avec retour haptique visuel, hint discret « Échap · Tableau de bord » en mode Zen, et annonces vocales en temps réel (`role="status"`, `aria-live="polite"`) sur les notifications toast.
- **Optimisation et Robustesse** : télémétrie push (événement Tauri 1 Hz), ring buffer historiques, Recharts lazy-load, sélecteurs Zustand granulaires, toasts erreurs visibles (DNS/pilotes), splash non bloquant, mémoïsation widgets, CI audit + budget bundle.
- **Uptime dashboard** : chip **Actif** centré dans la TitleBar (`SystemUptimeChip`, `md+`) — `formatUptimeShort` · mode Zen = `ZenMetricsDock` (RAM · Actif en ligne)
- **Grille dashboard** : rangée **CPU · RAM · GPU** (`md:grid-cols-3 gap-6`) puis **Réseau + DNS** (`lg:grid-cols-3 items-stretch`, DNS `col-span-2`, hauteur synchronisée **400/460 px** + **+184** détail jeu) ; en-têtes CPU/RAM/GPU via `WidgetMetricHeader` + `MetricPercentBadge`
- **Animation Sakura** : pétales en arrière-plan — en mode Zen : plafonné (`high→medium`, `medium→low`, pas de couche avant-plan)

### Paramètres Persistants
Navigation latérale sans scroll : **Essentiel · Atmosphère · Connexion · Veille · À propos** — ton **Premium Zen**, libellés accessibles ; contenu des onglets scrollable si besoin.

**Essentiel**
- **Cadence** — vitesse de lecture de la machine (1 s, 2 s, 5 s, 10 s)
- **Pilotes essentiels** (défaut) — 3 pilotes (GPU, réseau, Bluetooth) ; analyse complète = moment de recueil
- **Éveil avec Windows** — lancement à l’ouverture de session (désactivé par défaut)
- **Présence discrète** — fermer masque l’app ; clic barre des tâches pour rouvrir

**Atmosphère** (préréglage Koi · sections Lumière · Nature · Ambiance)
- **Préréglage Koi** — **Zen** (sakura léger, verre off, aura légère, néon doux, animations calmes) · **Doux** (défaut, équilibre visuel) · **Aura** (immersion max — toast perf au passage) ; applique sakura, verre, aura, néon et animations en un geste — thème et teinte Sakura restent personnels ; affinage manuel possible (aucun préréglage actif si mix personnalisé) · `atmospherePresets.ts` + `inferAtmospherePreset()`
- **Thème** — clair pour le jour, sombre pour la nuit
- **Sakura** — Aucun · Léger · Doux · Dense + **Teinte Sakura** (rose, violet, bleu, menthe) — pilote pétales **et** accent interface (`sakuraColor` → `data-accent` → `--accent` / `--accent-text` : pastilles, switches, onglets Paramètres, Zen actif, focus clavier ; **pas** les widgets CPU/RAM/GPU)
- **Verre dépoli** — effet cristal sur panneaux (`enableGlassmorphicBlur`)
- **Aura de fond** — Aucune · Légère · Pleine (`data-background-aura` sur `<html>`)
- **Lueur néon** — Douce · Équilibrée · Vive (`getNeonTextShadow` + `data-neon-glow`)
- **Animations calmes** — désactive sakura et réduit les animations décoratives (`html.calm-motion`)

**Connexion**
- **Rythme DNS** — fréquence des contrôles (10 s, 15 s, 30 s, 1 min)
- **Serveurs observés** — checklist deux lignes (nom + IP), `normalizeDnsChecklist()`
- **Serveur personnel** — carte dédiée : **Adresse** (IPv4) + **Surnom** optionnel · bouton **Valider** (Entrée) · **Effacer** ; placeholders Premium Zen (italique, discrets) ; défaut affiché : *Serveur personnel* ; stocké dans `settings.customDns` · fusion via `buildActiveDnsServers()` + `pingActiveDns()`
- Toasts Paramètres : **slot footer** (inline) — tons via `toastToneClass()` (`--warning-text` / `--error-text`, pas `dark:` Tailwind) · toast **Aura** perf à la sélection du préréglage

**Veille**
- **Veille Koi** — signaux calmes, jamais de popup Windows ; onboarding 1er lancement, **off par défaut**, journal cloche, anti-spam
- **Sensibilité** — Discrète · Équilibrée · Attentive
- **Latence en jeu** — signe si le ping s’éloigne de l’habitude en session

**À propos**
- Animation `SlashTitle md` (rejouée à chaque visite) + remerciement + pitch Premium Zen + **Soutenir Koi** (`DonateButton` — reflets animés ; halo externe masqué si **Animations calmes** / préréglage Zen) + crédit technique + version
- Pitch : *Votre machine lue avec tendresse. Charge, connexion, pilotes et veille discrète, au bureau comme en jeu. Pensé pour Windows, léger, fiable, tout simplement.*

### Interface
- **Icône app (wordmark « Koi »)** : texte **Koi** Geist, dégradé **rose `#ff2d95` → violet `#9d4edd` → cyan `#00d4ff`**, glow néon, fond squircle `#0a0e18` — fenêtre, `.exe`, barre des tâches, tray, favicon. Master : `src-tauri/icons/icon-source.png` · regénération : `npm run icons:wordmark` (Pillow + Tauri CLI + sync `public/`) · embarqué Rust (`include_bytes`) + tray via `get_app_icon_png`.
- **Identité SlashTitle v3 (Iai compact)** : balayage horizontal au niveau du titre (sans chute verticale) → traînée néon → katana lame horizontale → éclair horizontal + particules + anneau → **texte scindé horizontalement** (moitié haute / basse) → **recollage fluide** (overshoot magnétique) → sortie en haut-droite. Empreinte = hauteur du texte. `variant="full"` (`lg` splash, `md` À propos) · `variant="static"` barre de titre (**Koi** / **Monitor** dégradé).
- **Splash Screen** : intro `SplashSlashTitle` → révélation étapes + barre ; phases 0→4 synchronisées (`resolveSplashUi` — ligne active, phrase et barre % partagent la même logique) ; durées lisibles (~8–10 s machine rapide) ; dwell 650 ms sur chaque étape terminée ; timeout **90 s** ; aurora, sakura ; **musique ambiante** au `onComplete`.
- Barre de titre personnalisée (sans décoration Windows) — **`SlashTitle variant="static"`** permanent
- **Paramètres** : navigation latérale sans scroll (**Essentiel · Atmosphère · Connexion · Veille · À propos**)
- **Paramètres → À propos** : animation `SlashTitle md` (rejouée à chaque visite) + remerciement + pitch Premium Zen + **Soutenir Koi** (`DonateButton`, reflets animés — lien à configurer ; `html.calm-motion` masque l’aura externe) + crédit technique + version

## 🚀 Installation Rapide (One-Click)

> Réservée à la **compilation depuis les sources**. Les utilisateurs finaux reçoivent **`koi-monitor.exe`** — voir [Prérequis système](#-prérequis-système).

### Étape 1: Cloner le dépôt
1. `git clone https://github.com/KatanaCZ/Koi-Monitor.git`
2. Ouvrez le dossier (ex: `C:\KoiMonitor`)

### Étape 2: Lancer l'Installation
1. **Clic droit** sur `koi.bat`
2. **"Exécuter en tant qu'administrateur"** → choisissez **Setup** (ou `koi.bat setup`)
3. Patientez 10-30 minutes (première compilation Rust)

Le script installera automatiquement:
- ✅ Node.js 20.x (si manquant)
- ✅ Rust (si manquant)
- ✅ WebView2 (si nécessaire)
- ✅ Toutes les dépendances npm
- ✅ Build de l'exécutable `koi-monitor.exe`

### Étape 3: Lancer l'Application
- Double-cliquez sur `src-tauri\target\release\koi-monitor.exe`

## 📣 Documentation

| Fichier | Usage |
|---------|--------|
| **`README.md`** | Page d’accueil GitHub — grand public, installation, fonctionnalités |
| **`docs/DEVELOPMENT.md`** | Documentation technique (ce fichier) — architecture, build, dépannage |
| **`CONTRIBUTING.md`** | Branches, PR, conventions — **`master` protégée** (merge via PR + CI `audit`) |
| **`AUDIT.md`** | Rapport audit concis (findings + mesures CI) |

## 🔀 Git — branches & releases

| Branche | Rôle |
|---------|------|
| **`master`** | Référence publique · **protégée** (PR obligatoire, check **Audit & Build** / job `audit`, pas de force-push) |
| **`feat/*` · `fix/*` · `docs/*` · `chore/*`** | Travail courant → PR → merge si CI verte |

```powershell
git checkout master && git pull
git checkout -b feat/ma-feature
# commits…
git push -u origin feat/ma-feature   # ouvrir PR sur GitHub
```

**Release :** patchnotes dans **`CHANGELOG.md`** · `scripts/prepare-release.ps1 -Version x.y.z` avant le tag · workflow `release.yml` extrait la section + publie `koi-monitor.exe`.

### Dependabot (mises à jour deps)

| Flux | Action |
|------|--------|
| **Minor/patch** npm ou cargo (PR groupée hebdo) | Merger si CI `audit` verte |
| **Major** npm (`react*`, `recharts`, `framer-motion`, `@vitejs/plugin-react`) | Ignorée par config — branche `feat/*` dédiée + QA (charts, animations, budget recharts ≤ 550 KB) |
| **Major** cargo | PR Dependabot possible ; évaluer au cas par cas |

Config : `.github/dependabot.yml` · politique PR : [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## 📁 Structure du Projet

```
koi-monitor/
├── .github/workflows/        # audit.yml (CI) · release.yml (tag v* → exe)
├── .github/dependabot.yml    # Deps npm + cargo (hebdo, minor+patch ; majors npm sensibles ignorées)
├── AUDIT.md                  # Rapport audit concis (findings + mesures)
├── src/                      # Frontend React + TypeScript
│   ├── components/
│   │   ├── charts/           # Recharts lazy (SingleAreaChart, DualAreaChart)
│   │   ├── common/           # SystemUptimeChip, WidgetMetricHeader, DnsViaBand (widgets/), SettingsModal…
│   │   ├── layout/
│   │   └── widgets/          # Cpu/Ram/Gpu/Network/Dns/Drivers, DnsViaBand, ZenClockWidget…
│   ├── hooks/                # useTelemetryPoller, useThresholdAlerts, useAmbientMusic, useEasterEggMusic…
│   ├── utils/                # dnsWidgetLayout, thresholdAlerts, ambientMusic, easterEggMusic…
│   ├── services/             # api.ts — IPC + events Tauri + appService.getIconPng()
│   ├── store/
│   │   ├── index.ts          # Zustand (+ gamingLatency)
│   │   └── historyRing.ts    # Ring buffer graphiques
│   ├── styles/               # globals.css (tokens, glass blur)
│   └── types/                # GamingLatencySnapshot, DNS, SystemInfo…
├── src-tauri/
│   ├── icons/                # icon-source.png · icon.ico · PNGs (tauri icon CLI)
│   ├── src/
│   │   ├── lib.rs            # Threads télémétrie + gaming, emit events
│   │   ├── gaming_latency.rs # ICMP passerelle/internet, jitter, verdicts
│   │   ├── dns.rs            # Ping DNS TCP :53 (presets whitelist + validation IPv4 custom)
│   │   ├── drivers.rs        # Scan pilotes WMI + collapse simplifié
│   │   ├── driver_updates.rs # Enrichissement WU COM, resolve_update_candidate, open WU settings
│   │   ├── driver_store.rs   # Fallback magasin pnputil
│   │   ├── driver_version.rs # Comparaison multi-format versions
│   │   └── security.rs       # Antivirus WMI (SystemInfo, pas d’UI)
│   ├── capabilities/
│   └── tauri.conf.json       # CSP stricte, bundle.active false, targets [] (exe seul)
├── CHANGELOG.md              # Patchnotes (Keep a Changelog, FR) → Release GitHub
├── scripts/                  # koi.ps1 · prepare-release.ps1 · extract-release-notes.ps1 · …
├── public/
│   └── audio/                # koi-ambient.mp3 · koi-easter.mp3 (easter egg, lazy)
├── koi.bat                   # Point d'entree unique (Build / Dev / DevFast / Setup / Doctor)
├── README.md                 # Landing GitHub (grand public + mockups)
├── docs/
│   ├── DEVELOPMENT.md        # Doc technique (ce fichier)
│   └── screenshots/          # Mockups README (MockupViews_*.png — versionner pour GitHub)
└── AUDIT.md
```

## 🔨 Build et dev (développeur)

```powershell
koi.bat              # Menu interactif
koi.bat build        # One-click : clean dist/target/gen + koi-monitor.exe (pas de MSI/NSIS)
koi.bat dev          # Tauri + Vite — compile Rust si besoin (port 1420)
koi.bat devfast      # Tauri + Vite — sans recompiler Rust (exe debug requis)
koi.bat setup        # Premiere install (admin)
koi.bat doctor       # Diagnostic + reparations env / Rust / Defender
# ou : npm run tauri dev / npm run build (frontend seul, CI)
```

**`koi.bat`** : wrapper → [`scripts/koi.ps1`](scripts/koi.ps1) — orchestrateur unique (`Build`, `Dev`, `DevFast`, `Setup`, `Doctor`). Build : arrêt exe, nettoyage `dist/` + `gen/` + caches `target/` (AppData + legacy), puis **`tauri build --no-bundle --ci`** (frontend embarqué dans l’exe — ne pas utiliser `cargo build` seul, sinon `localhost:1420` au lancement). Dev : prérequis Rust, `kill-dev-port.ps1` (port **1420**), `npm run tauri dev`. **DevFast** : Vite + binaire debug déjà compilé, sans relancer Cargo — lancer `koi.bat dev` une fois avant (ou après changement Rust). Fichier **`koi.bat`** en **CRLF** (Windows `cmd.exe`).

**Sortie build / dev :**

| Rôle | Chemin |
|------|--------|
| **Lancer (recommandé)** | `%LOCALAPPDATA%\koi-monitor\koi-monitor.exe` |
| Copie dev (miroir release) | `src-tauri\target\release\koi-monitor.exe` |
| **Exe debug (DevFast)** | `%LOCALAPPDATA%\koi-monitor\target\debug\koi-monitor.exe` |
| Cache compile Rust | `%LOCALAPPDATA%\koi-monitor\target\` (`CARGO_TARGET_DIR`) |

Pas de dossier `bundle/`, pas de `.msi` ni setup NSIS.

**Regénérer l’icône wordmark « Koi » :**

```powershell
py -3 -m pip install -r scripts/requirements-icons.txt
npm run icons:wordmark
koi.bat build   # embarquer la nouvelle icône dans l’exe
```

## ⚡ Architecture technique (résumé)

| Flux | Description |
|------|-------------|
| **Télémétrie** | Rust émet `telemetry-update` chaque seconde → React écoute via `useTelemetryPoller` |
| **Latence jeu** | Thread Rust 2 s → ICMP passerelle + `1.1.1.1` (+ TCP `:443` fallback) → jitter → `emit("gaming-latency-update")` + commande `get_gaming_latency` |
| **DNS** | Polling intervalle configurable (10 s – 1 min), mutex anti-collision — **séparé** de la latence jeu |
| **Historiques** | Ring buffer 288 points (CPU/RAM/GPU/réseau) — écriture O(1) |
| **Graphiques** | Recharts chargé à la demande (hors bundle initial ~60 KB) |
| **Erreurs** | Toast global en bas d'écran (`StatusToast`) + journal cloche (`NotificationPanel`) |
| **Alertes** | `useThresholdAlerts` → profil auto bureau/jeu → toast + log session (`notificationLog.ts`) |
| **Sécurité** | CSP WebView (`media-src 'self'` pour piste locale), URLs pilotes filtrées (`safeUrl.ts`), IP DNS presets whitelistées + validation IPv4 custom (TCP `:53` uniquement) |
| **Pilotes MàJ** | WU COM + magasin `pnputil` → `update_source` ; UI WU-first (`open_windows_update`) |
| **Splash** | Intro katana → étapes/barre sync (`resolveSplashUi`) ; min 1,3–1,9 s/phase + dwell 650 ms ; dashboard ready via `splashReadiness.ts` ; timeout 90 s ; **puis** musique ambiante |
| **Musique** | `koi-ambient.mp3` post-splash ; easter `koi-easter.mp3` (5 clics « Koi », crossfade) ; mute TitleBar · `ambientMusicMuted` persisté · `easterMusicActive` session |
| **Icône app** | Wordmark **Koi** néon (Geist) ; `icon-source.png` → `npm run icons:wordmark` → `icon.ico` ; fenêtre + tray embarqués (`lib.rs` + `get_app_icon_png`) |
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

### Si erreur Rust `x86_64-w64-mingw32-gcc` / `-lgcc`
Vous etes sur la toolchain **GNU** ; Tauri requiert **MSVC** sur Windows.

```powershell
koi.bat doctor
```

Puis installez **Visual Studio Build Tools** (composant *Developpement Desktop en C++*) si `link.exe` est introuvable.

Relancez `koi.bat build` (nettoyage `target/` intégré).

### Si erreur `spawn EPERM` (esbuild) ou `Acces refuse` sur cargo (os error 5)
Windows bloque les outils depuis le **Bureau** (Defender, acces controle).

**Correctif rapide (1 fois) :**
```powershell
koi.bat doctor
```

Doctor répare les variables d'environnement, la toolchain MSVC, et propose le correctif Defender (élévation admin).

**Build frontend sur le Bureau :** le projet utilise `esbuild-wasm` (pas de binaire natif) pour eviter `spawn EPERM`. Apres `npm install`, le postinstall bascule automatiquement. Si besoin :
```powershell
npm install esbuild@npm:esbuild-wasm@0.25.12 --save-dev --ignore-scripts --force
```

Puis relancez `koi.bat dev`, `koi.bat devfast` ou `koi.bat build`.

**Alternative :** deplacez le projet vers `C:\Dev\Koi Monitor` (hors Bureau).

### Si l'exe affiche « localhost a refusé de se connecter » (ERR_CONNECTION_REFUSED)
L'exe a été compilé sans frontend embarqué (ex. `cargo build` seul au lieu de `tauri build`).

```powershell
koi.bat build
```

Puis lancez **`%LOCALAPPDATA%\koi-monitor\koi-monitor.exe`** — pas l'ancien exe du Bureau.

## 🎯 Checklist de Succès

- [x] Monitoring CPU temps réel
- [x] Monitoring RAM
- [x] Monitoring GPU avancé (DXGI/WMI 100% Natif)
- [x] Monitoring Network (Wi‑Fi / Ethernet, layout premium)
- [x] Mode clair lisible (surfaces opaques)
- [x] DNS comparateur multi-serveurs + boutons Test auto / Personnaliser
- [x] Serveur DNS personnel (1 IP + surnom, Connexion · Valider) + widget sans scroll (hauteur adaptive, grille impaire harmonisée)
- [x] Latence jeu « Prêt pour le jeu » (passerelle, internet, jitter, badge cliquable)
- [x] Statut de latence dynamique (Excellente → Critique)
- [x] Analyse des pilotes avec filtres stricts, modes simplifié/étendu et flux MàJ WU-first
- [x] UI glassmorphisme Koi Monitor Night
- [x] Animations sakura
- [x] Toggle thème dark/light
- [x] Zen Mode (Mode Méditation) avec tracking dynamique et économie de ressources
- [x] Build Windows — `koi-monitor.exe` portable (sans MSI/NSIS)
- [x] Script one-click installation
- [x] Télémétrie événements Tauri + fallback IPC
- [x] Ring buffer historiques + Recharts lazy
- [x] Alertes intelligentes (bureau charge PC · jeu latence, journal, anti-spam)
- [x] Toasts erreurs utilisateur + splash résilient
- [x] Musique ambiante post-splash (boucle, fondu, mute TitleBar, persistance)
- [x] Easter egg musique (5 clics « Koi », hints + piste secrète crossfade, dev console)
- [x] CI audit (npm, tsc, cargo test/clippy, budget recharts ≤ 550 KB, Dependabot)

## 📄 Licence

MIT License - Katana 2026

---

🌸 **Koi Monitor** - Surveillance système avec style.

*Créé avec passion pour les amateurs de monitoring système et d'esthétique Japonaise (Koi & Sakura).*