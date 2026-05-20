# Drivers Simplified Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un toggle "Mode simplifié" dans les paramètres pour filtrer les drivers et n'afficher que le pertinent (GPU, réseau, Bluetooth) pour un utilisateur lambda.

**Architecture:** Le filtrage se fait côté Rust via un paramètre `simplified: bool` passé à la commande Tauri `get_drivers`. Le frontend stocke le mode dans les settings (localStorage) et le passe lors du fetch.

**Tech Stack:** Tauri (Rust), React, TypeScript, Zustand, localStorage

---

## File Map

| File | Responsibility |
|------|----------------|
| `src-tauri/src/drivers.rs` | Logique de filtrage par catégorie |
| `src-tauri/src/lib.rs` | Commande Tauri `get_drivers` avec paramètre |
| `src/types/index.ts` | Interface `AppSettings` simplifiée |
| `src/store/index.ts` | State Zustand avec `simplifiedMode` |
| `src/services/api.ts` | Service driver avec paramètre simplified |
| `src/components/common/SettingsModal.tsx` | Toggle UI |
| `src/components/widgets/DriversWidget.tsx` | Nettoyage UI (suppress search/dropdown) |

---

## Task 1: Rust - Modifier drivers.rs

**Files:**
- Modify: `src-tauri/src/drivers.rs:41-96`

- [ ] **Step 1: Modifier la fonction `get_driver_list` pour accepter un paramètre `simplified: bool`**

Remplacer la fonction actuelle:
```rust
pub fn get_driver_list() -> Result<Vec<DriverInfo>, String>
```

Par:
```rust
pub fn get_driver_list(simplified: bool) -> Result<Vec<DriverInfo>, String>
```

Dans le corps de la fonction, après le filtrage blacklist et avant le tri, ajouter:
```rust
if simplified {
    drivers.retain(|d| {
        matches!(d.category.as_str(), "Graphics" | "Network" | "Bluetooth")
    });
}
```

---

## Task 2: Rust - Modifier lib.rs

**Files:**
- Modify: `src-tauri/src/lib.rs:174-177`

- [ ] **Step 1: Modifier la commande `get_drivers` pour accepter et passer le paramètre `simplified`**

Remplacer:
```rust
#[tauri::command]
async fn get_drivers() -> Result<Vec<DriverInfo>, String> {
    drivers::get_driver_list()
}
```

Par:
```rust
#[tauri::command]
async fn get_drivers(simplified: bool) -> Result<Vec<DriverInfo>, String> {
    drivers::get_driver_list(simplified)
}
```

---

## Task 3: TypeScript - Modifier types/index.ts

**Files:**
- Modify: `src/types/index.ts:72-84`

- [ ] **Step 1: Simplifier `AppSettings` - remplacer `driverCategories` par `simplifiedMode`**

Remplacer:
```typescript
export interface AppSettings {
  refreshInterval: number;
  dnsInterval: number;
  sakuraIntensity: 'off' | 'low' | 'medium' | 'high';
  enableGlassmorphicBlur: boolean;
  dnsChecklist: string[];
  driverCategories: {
    gpu: boolean;
    network: boolean;
    audio: boolean;
    storage: boolean;
  };
}
```

Par:
```typescript
export interface AppSettings {
  refreshInterval: number;
  dnsInterval: number;
  sakuraIntensity: 'off' | 'low' | 'medium' | 'high';
  enableGlassmorphicBlur: boolean;
  dnsChecklist: string[];
  simplifiedMode: boolean;
}
```

---

## Task 4: Store - Modifier store/index.ts

**Files:**
- Modify: `src/store/index.ts:4-16,31,44,59`

- [ ] **Step 1: Modifier DEFAULT_SETTINGS**

Remplacer:
```typescript
const DEFAULT_SETTINGS: AppSettings = {
  refreshInterval: 2000,
  dnsInterval: 15000,
  sakuraIntensity: 'medium',
  enableGlassmorphicBlur: true,
  dnsChecklist: ['Google', 'Cloudflare', 'Quad9', 'OpenDNS'],
  driverCategories: {
    gpu: true,
    network: true,
    audio: true,
    storage: true,
  },
};
```

Par:
```typescript
const DEFAULT_SETTINGS: AppSettings = {
  refreshInterval: 2000,
  dnsInterval: 15000,
  sakuraIntensity: 'medium',
  enableGlassmorphicBlur: true,
  dnsChecklist: ['Google', 'Cloudflare', 'Quad9', 'OpenDNS'],
  simplifiedMode: true,
};
```

- [ ] **Step 2: Modifier l'interface `AppState`** - remplacer `driverCategories` par `simplifiedMode` dans la définition de l'interface

---

## Task 5: API - Modifier services/api.ts

**Files:**
- Modify: `src/services/api.ts:26-34`

- [ ] **Step 1: Modifier `driverService.getDrivers` pour accepter `simplified: boolean`**

Remplacer:
```typescript
export const driverService = {
  async getDrivers(): Promise<DriverInfo[]> {
    try {
      return await invoke<DriverInfo[]>('get_drivers');
    } catch (error) {
      console.error('Failed to get drivers:', error);
      throw error;
    }
  },
};
```

Par:
```typescript
export const driverService = {
  async getDrivers(simplified: boolean): Promise<DriverInfo[]> {
    try {
      return await invoke<DriverInfo[]>('get_drivers', { simplified });
    } catch (error) {
      console.error('Failed to get drivers:', error);
      throw error;
    }
  },
};
```

---

## Task 6: SettingsModal - Modifier SettingsModal.tsx

**Files:**
- Modify: `src/components/common/SettingsModal.tsx:180-220` (section Général)

- [ ] **Step 1: Remplacer la section "Catégories de pilotes" par un toggle "Mode simplifié"**

Supprimer les `CheckboxItem` pour GPU/Network/Audio/Storage et les remplacer par un `NeonSwitch`:
```tsx
<NeonSwitch
  checked={settings.simplifiedMode}
  onChange={(v) => handleSettingChange('simplifiedMode', v)}
  label="Mode simplifié"
  description="Affiche uniquement les pilotes pertinents (GPU, réseau, Bluetooth)"
/>
```

---

## Task 7: DriversWidget - Nettoyer l'UI

**Files:**
- Modify: `src/components/widgets/DriversWidget.tsx:9-33,111-131`

- [ ] **Step 1: Supprimer les états `searchTerm` et `categoryFilter` (plus utilisés)**

- [ ] **Step 2: Supprimer les variables `enabledCategories`, `categories`, `filteredDrivers` avec leur logique complexe - remplacer par une logique simple**

```typescript
const filteredDrivers = settings.simplifiedMode
  ? drivers.filter(d => ['Graphics', 'Network', 'Bluetooth'].includes(d.category))
  : drivers;
```

- [ ] **Step 3: Supprimer la search bar (input et select) du JSX**

- [ ] **Step 4: Supprimer `categoryFilter` du dropdown categories**

- [ ] **Step 5: Mettre à jour `handleRefresh` pour passer `settings.simplifiedMode`**

```typescript
const handleRefresh = async () => {
  setLoading(true);
  try {
    const result = await driverService.getDrivers(settings.simplifiedMode);
    setDrivers(result);
  } catch (error) {
    console.error('Failed to refresh drivers:', error);
  } finally {
    setLoading(false);
  }
};
```

---

## Task 8: Build et Test

**Files:**
- None (verification)

- [ ] **Step 1: Lancer `npm run build` pour vérifier qu'il n'y a pas d'erreurs TypeScript**

Attendu: Build réussi sans erreurs

---

## Commit

- [ ] **Step 1: Commiter les changements**

```bash
git add -A
git commit -m "feat: add simplified mode for drivers display

- Rust: get_drivers accepts simplified bool parameter
- Frontend: simplifiedMode in settings, filters Graphics/Network/Bluetooth
- Removed search bar and category dropdown from DriversWidget
- Settings now shows single toggle instead of category checkboxes

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```