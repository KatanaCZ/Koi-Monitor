# Drivers Widget - Mode Simplifié

## Objectif

Permettre à un utilisateur lambda de voir uniquement les pilotes pertinents (GPU, réseau, Bluetooth) via un toggle "Mode simplifié" dans les paramètres.

## État actuel

- Les drivers sont fetch via Tauri `get_drivers` (Rust)
- Une blacklist Rust filtre déjà les virtuels/VPN/périphériques garbage
- Le filtrage par `driverCategories` dans settings ne fonctionne pas correctement et n'est plus pertinent

## Comportement souhaité

### Toggle "Mode simplifié" dans SettingsModal

| État | Comportement |
|------|-------------|
| **ON (par défaut)** | Affiche uniquement Graphics, Network, Bluetooth |
| **OFF** | Affiche tous les drivers (Graphics, Network, Bluetooth, Audio, Storage, Firmware) après filtrage blacklist Rust |

### Catégories affichées en mode simplifié

- **Graphics** - GPU (NVIDIA, AMD, Intel)
- **Network** - Cartes Ethernet, WiFi (pas les virtuels WAN miniport)
- **Bluetooth** - Adaptateurs Bluetooth réels

## Implémentation

### 1. Rust - Modification de `get_drivers`

Modifier `src-tauri/src/drivers.rs`:

```rust
// Ajouter un paramètre simplified
pub fn get_driver_list() -> Result<Vec<DriverInfo>, String>  //现状

// NOUVEAU: accepter un paramètre simplified
pub fn get_driver_list_simplified() -> Result<Vec<DriverInfo>, String>
```

Ou mieux, modifier `get_driver_list` pour accepter un bool `simplified`:

```rust
pub fn get_driver_list(simplified: bool) -> Result<Vec<DriverInfo>, String>
```

Quand `simplified: true`, filtrer additionally:
- Ne garder que les catégories: `["Graphics", "Network", "Bluetooth"]`

### 2. Frontend - Store

Dans `src/store/index.ts`:
- Remplacer `driverCategories` (objet avec gpu/network/audio/storage bools) par un seul bool `simplifiedMode`
- Changer `DEFAULT_SETTINGS.simplifiedMode = true`

### 3. Frontend - SettingsModal

Dans `src/components/common/SettingsModal.tsx`:
- Remplacer le section "Catégories de pilotes" par un toggle `Mode simplifié`

### 4. Frontend - DriversWidget

Dans `src/components/widgets/DriversWidget.tsx`:
- Passer `simplifiedMode` au fetch
- Supprimer le categoryFilter dropdown (plus nécessaire)
- Supprimer la search bar (plus nécessaire)
- Simplifier la logique de filtrage - juste afficher selon simplifiedMode

### 5. Frontend - API Service

Dans `src/services/api.ts`:
- Modifier `driverService.getDrivers()` pour accepter et passer `simplified: boolean`

### 6. Types

Dans `src/types/index.ts`:
- Simplifier `AppSettings.driverCategories` en `simplifiedMode: boolean`

## Fichiers à modifier

1. `src-tauri/src/drivers.rs` - ajout paramètre simplified
2. `src-tauri/src/lib.rs` ou `main.rs` - adapter la commande Tauri
3. `src/types/index.ts` - modifier AppSettings
4. `src/store/index.ts` - modifier state
5. `src/components/common/SettingsModal.tsx` - UI toggle
6. `src/components/widgets/DriversWidget.tsx` - nettoyer UI
7. `src/services/api.ts` - adapter API

## Vérification

- `npm run build` réussit
- Mode simplifié ON → voit GPU + Network + Bluetooth
- Mode simplifié OFF → voit tous les drivers après blacklist
- Les paramètres persistent après rechargement