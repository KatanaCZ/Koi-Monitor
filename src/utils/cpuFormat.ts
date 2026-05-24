/** Nom CPU lisible — sans suffixe cœurs / processeur WMI Windows. */
export function normalizeCpuDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "Chargement...") return trimmed;

  return trimmed
    .replace(/\s+\d+\s*-?\s*C(?:œ|oe)?urs?(?:\s+Processor)?/gi, "")
    .replace(/\s+\d+\s*-?\s*Core(?:s)?(?:\s+Processor)?/gi, "")
    .replace(/\s+Processor$/i, "")
    .trim();
}
