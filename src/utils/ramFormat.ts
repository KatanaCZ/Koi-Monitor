import type { RamModuleInfo } from '../types';

/** Sous-titre widget RAM — marques dédupliquées (ex. Corsair × 2). */
export function formatRamModulesSubtitle(modules: RamModuleInfo[] | undefined): string | null {
  if (!modules?.length) return null;

  const names = modules.map((m) => m.name.trim()).filter(Boolean);
  if (!names.length) return null;

  const unique = [...new Set(names)];
  if (unique.length === 1) {
    return modules.length > 1 ? `${unique[0]} × ${modules.length}` : unique[0];
  }

  return unique.join(' · ');
}
