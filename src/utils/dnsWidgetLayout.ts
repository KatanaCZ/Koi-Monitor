import type { CSSProperties } from 'react';

/** Hauteurs carte DNS dashboard (alignées avec NetworkWidget via App). */
export const DNS_WIDGET_BASE_HEIGHT = 400;
export const DNS_WIDGET_DENSE_HEIGHT = 460;
/** Panneau GamingLatencyBreakdown + gap footer. */
export const DNS_WIDGET_GAMING_DETAIL_EXTRA = 184;

export function getDnsWidgetCardHeight(
  dnsCount: number,
  gamingDetailsOpen: boolean,
  isExpanded: boolean,
): number | null {
  if (isExpanded) return null;
  const base =
    dnsCount > 4 ? DNS_WIDGET_DENSE_HEIGHT : DNS_WIDGET_BASE_HEIGHT;
  const gamingExtra = gamingDetailsOpen ? DNS_WIDGET_GAMING_DETAIL_EXTRA : 0;
  return base + gamingExtra;
}

export function getDnsWidgetCardStyle(height: number | null): CSSProperties | undefined {
  if (height == null) return undefined;
  return {
    height,
    minHeight: height,
    maxHeight: `min(${height}px, 90dvh)`,
  };
}
