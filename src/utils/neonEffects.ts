/** Neon text glow — stronger in light mode so effects stay visible on pale surfaces. */
export function getNeonTextShadow(color: string, isDark: boolean): string {
  if (isDark) {
    return `0 0 12px color-mix(in srgb, ${color} 25%, transparent)`;
  }
  return [
    `0 0 6px color-mix(in srgb, ${color} 75%, transparent)`,
    `0 0 14px color-mix(in srgb, ${color} 48%, transparent)`,
    `0 0 26px color-mix(in srgb, ${color} 24%, transparent)`,
  ].join(", ");
}
