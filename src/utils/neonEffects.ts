import type { NeonGlow } from '../types';

function readNeonGlow(): NeonGlow {
  if (typeof document === 'undefined') return 'balanced';
  const value = document.documentElement.getAttribute('data-neon-glow');
  if (value === 'soft' || value === 'vivid') return value;
  return 'balanced';
}

/** Neon text glow — stronger in light mode so effects stay visible on pale surfaces. */
export function getNeonTextShadow(
  color: string,
  isDark: boolean,
  glow: NeonGlow = readNeonGlow(),
): string {
  if (glow === 'soft') {
    if (isDark) {
      return `0 0 8px color-mix(in srgb, ${color} 14%, transparent)`;
    }
    return `0 0 8px color-mix(in srgb, ${color} 42%, transparent)`;
  }

  if (glow === 'vivid') {
    if (isDark) {
      return [
        `0 0 10px color-mix(in srgb, ${color} 35%, transparent)`,
        `0 0 22px color-mix(in srgb, ${color} 18%, transparent)`,
      ].join(', ');
    }
    return [
      `0 0 8px color-mix(in srgb, ${color} 85%, transparent)`,
      `0 0 18px color-mix(in srgb, ${color} 58%, transparent)`,
      `0 0 32px color-mix(in srgb, ${color} 30%, transparent)`,
    ].join(', ');
  }

  if (isDark) {
    return `0 0 12px color-mix(in srgb, ${color} 25%, transparent)`;
  }
  return [
    `0 0 6px color-mix(in srgb, ${color} 75%, transparent)`,
    `0 0 14px color-mix(in srgb, ${color} 48%, transparent)`,
    `0 0 26px color-mix(in srgb, ${color} 24%, transparent)`,
  ].join(', ');
}
