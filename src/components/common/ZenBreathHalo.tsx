import type { ReactNode, CSSProperties } from "react";
import { memo } from "react";
import { useReducedMotion } from "framer-motion";
import {
  getZenLoadStatePresentation,
  getZenLoadStateStyle,
  type ZenLoadState,
} from "../../utils/zenLoadState";

interface ZenBreathHaloProps {
  loadState: ZenLoadState;
  children: ReactNode;
}

export const ZenBreathHalo = memo(function ZenBreathHalo({
  loadState,
  children,
}: ZenBreathHaloProps) {
  const prefersReducedMotion = useReducedMotion();
  const style = getZenLoadStateStyle(loadState);
  const presentation = getZenLoadStatePresentation(loadState);
  const staticHalo = prefersReducedMotion;

  return (
    <div className="zen-breath-halo-wrap relative inline-block max-w-full">
      <div
        aria-hidden="true"
        className={`zen-breath-halo zen-celestial-halo pointer-events-none ${
          staticHalo ? "zen-breath-static" : ""
        }`}
        style={
          {
            "--zen-breath-duration": `${presentation.breathDuration}s`,
            "--zen-halo-color": style.color,
          } as CSSProperties
        }
      >
        <div className="zen-breath-halo-core" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
});
