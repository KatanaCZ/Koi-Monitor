import { useEffect, useState } from "react";

export type ViewportTier = "compact" | "medium" | "wide" | "ultra";

function getTier(width: number): ViewportTier {
  if (width >= 1536) return "ultra";
  if (width >= 1024) return "wide";
  if (width >= 640) return "medium";
  return "compact";
}

export function useViewportTier(): ViewportTier {
  const [tier, setTier] = useState<ViewportTier>(() =>
    typeof window !== "undefined" ? getTier(window.innerWidth) : "medium",
  );

  useEffect(() => {
    const update = () => setTier(getTier(window.innerWidth));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return tier;
}

export const TIER_LAYOUT = {
  compact: {
    ring: 34,
    stroke: 2.5,
    icon: 13,
    valueClass: "text-sm",
    labelClass: "text-[8px]",
    cellPadding: "py-2 px-2",
    cellGap: "gap-2",
  },
  medium: {
    ring: 38,
    stroke: 2.5,
    icon: 14,
    valueClass: "text-base",
    labelClass: "text-[9px]",
    cellPadding: "py-2 px-3",
    cellGap: "gap-3",
  },
  wide: {
    ring: 42,
    stroke: 3,
    icon: 15,
    valueClass: "text-lg",
    labelClass: "text-[9px]",
    cellPadding: "py-3 px-4",
    cellGap: "gap-3",
  },
  ultra: {
    ring: 50,
    stroke: 3,
    icon: 17,
    valueClass: "text-xl",
    labelClass: "text-[10px]",
    cellPadding: "py-4 px-5",
    cellGap: "gap-4",
  },
} as const;
