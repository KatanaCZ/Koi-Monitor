import React, { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store";

type LayerType = "back" | "mid" | "front";

interface SakuraParticle {
  id: number;
  xStart: number; // percentage of screen width (0 to 100)
  xMid: number;
  xEnd: number;
  size: number;   // size in pixels
  duration: number; // duration in milliseconds
  elapsed: number;  // current time elapsed in milliseconds (0 to duration)
  rotationStart: number;
  rotationEnd: number;
  layer: LayerType;
}

interface PetalTexture {
  canvas: HTMLCanvasElement;
  baseSize: number;
  padding: number;
}

// Helper to resolve CSS variables to actual hex/rgb strings for Canvas context drawing
const resolveThemeColor = (colorName: string, theme: "light" | "dark"): string => {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const computed = getComputedStyle(document.documentElement).getPropertyValue(colorName).trim();
    if (computed) return computed;
  }
  // Fallbacks aligned with globals.css
  switch (colorName) {
    case "--neon-cyan":
      return "#00d4ff";
    case "--neon-green":
      return "#00ff9d";
    case "--neon-purple":
      return theme === "dark" ? "#b24dff" : "#9d4edd";
    case "--neon-pink":
    default:
      return "#ff2d95";
  }
};

const drawPetalPath = (ctx: CanvasRenderingContext2D, ox: number, oy: number, scale: number) => {
  ctx.beginPath();
  // SVG path coordinates: M15,4 C19,-1 28,1 28,10 C28,18 20,26 15,30 C10,26 2,18 2,10 C2,1 11,-1 15,4 Z
  ctx.moveTo(ox + 15 * scale, oy + 4 * scale);
  ctx.bezierCurveTo(
    ox + 19 * scale,
    oy + -1 * scale,
    ox + 28 * scale,
    oy + 1 * scale,
    ox + 28 * scale,
    oy + 10 * scale
  );
  ctx.bezierCurveTo(
    ox + 28 * scale,
    oy + 18 * scale,
    ox + 20 * scale,
    oy + 26 * scale,
    ox + 15 * scale,
    oy + 30 * scale
  );
  ctx.bezierCurveTo(
    ox + 10 * scale,
    oy + 26 * scale,
    ox + 2 * scale,
    oy + 18 * scale,
    ox + 2 * scale,
    oy + 10 * scale
  );
  ctx.bezierCurveTo(
    ox + 2 * scale,
    oy + 1 * scale,
    ox + 11 * scale,
    oy + -1 * scale,
    ox + 15 * scale,
    oy + 4 * scale
  );
  ctx.closePath();
};

// Pre-renders a single petal with its drop-shadow and blur filter to an offscreen canvas
const createPetalTexture = (
  color: string,
  baseSize: number,
  blur: number
): PetalTexture => {
  const canvas = document.createElement("canvas");
  const padding = Math.max(16, blur * 2) + 15;
  
  canvas.width = baseSize + padding * 2;
  canvas.height = baseSize + padding * 2;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Apply SVG drop-shadow + Gaussian blur using fully hardware-accelerated Canvas filters
    ctx.filter = `drop-shadow(0px 0px 8px ${color}) blur(${blur}px)`;
    ctx.fillStyle = color;
    
    const scale = baseSize / 30; // standard width/height is 30px
    drawPetalPath(ctx, padding, padding, scale);
    ctx.fill();
  }

  return {
    canvas,
    baseSize,
    padding,
  };
};

export const SakuraParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [isVisible, setIsVisible] = useState(
    () => typeof document !== "undefined" && !document.hidden
  );

  // High performance focus tracker (useRef to avoid any React re-render overhead)
  const targetFpsRef = useRef(
    typeof document !== "undefined" && document.hasFocus() ? 30 : 24
  );

  const theme = useAppStore((s) => s.theme);
  const sakuraIntensity = useAppStore((s) => s.settings.sakuraIntensity);
  const sakuraColorSetting = useAppStore((s) => s.settings.sakuraColor);
  const calmMotion = useAppStore((s) => s.settings.calmMotion);
  const zenMode = useAppStore((s) => s.zenMode);

  // Fallback if system settings dictate reduced motion
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Capped intensity in Zen Mode (high capped to medium, medium to low)
  const effectiveIntensity = zenMode
    ? sakuraIntensity === "high"
      ? "medium"
      : sakuraIntensity === "medium"
        ? "low"
        : sakuraIntensity
    : sakuraIntensity;

  // Track visibility of document to pause animation when minimized/backgrounded
  useEffect(() => {
    const onVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Main animation and canvas setup hook
  useEffect(() => {
    // 1. Exit early if animations are disabled
    if (prefersReducedMotion || calmMotion || effectiveIntensity === "off" || !isVisible) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // 2. Resolve colors
    let resolvedColor = "";
    switch (sakuraColorSetting) {
      case "purple":
        resolvedColor = resolveThemeColor("--neon-purple", theme);
        break;
      case "blue":
        resolvedColor = resolveThemeColor("--neon-cyan", theme);
        break;
      case "green":
        resolvedColor = resolveThemeColor("--neon-green", theme);
        break;
      case "pink":
      default:
        resolvedColor = resolveThemeColor("--neon-pink", theme);
        break;
    }

    // 3. Create pre-rendered offscreen textures (saves 95% GPU fill rate)
    const textures: Record<LayerType, PetalTexture> = {
      back: createPetalTexture(resolvedColor, 35, 4),
      mid: createPetalTexture(resolvedColor, 55, 1),
      front: createPetalTexture(resolvedColor, 180, 12),
    };

    // 4. Generate particles
    let idCounter = 0;
    const particles: SakuraParticle[] = [];

    const addParticles = (
      count: number,
      layer: LayerType,
      minSize: number,
      maxSize: number,
      minDur: number,
      maxDur: number
    ) => {
      for (let i = 0; i < count; i++) {
        const startX = Math.random() * 100;
        const duration = (Math.random() * (maxDur - minDur) + minDur) * 1000; // to ms
        
        particles.push({
          id: idCounter++,
          xStart: startX,
          xMid: startX + (Math.random() * 20 - 10),
          xEnd: startX + (Math.random() * 40 - 20),
          size: Math.random() * (maxSize - minSize) + minSize,
          duration,
          elapsed: Math.random() * duration, // evenly distributed initial heights
          rotationStart: Math.random() * 360,
          rotationEnd: Math.random() * 360 + 360,
          layer,
        });
      }
    };

    const multiplier =
      effectiveIntensity === "low"
        ? 0.35
        : effectiveIntensity === "medium"
          ? 0.75
          : 1.35;

    addParticles(Math.max(1, Math.round(15 * multiplier)), "back", 10, 20, 30, 45);
    addParticles(Math.max(1, Math.round(10 * multiplier)), "mid", 25, 45, 15, 25);
    
    // Front particles are large, heavy, and disabled in Zen mode
    if (!zenMode) {
      addParticles(Math.max(1, Math.round(3 * multiplier)), "front", 120, 250, 8, 14);
    }

    // 5. Handle resizing with DPI scaling capped at 1.25 (saves 50%+ pixel fill rate on 4K/high DPI screens)
    let width = window.innerWidth;
    let height = window.innerHeight;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(1.25, window.devicePixelRatio || 1);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.restore();
      ctx.save();
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // 6. Focus listeners for dynamic target FPS shifting (cinematic 24 FPS out of focus vs smooth 30 FPS in focus)
    const handleFocus = () => {
      targetFpsRef.current = 30;
    };
    const handleBlur = () => {
      targetFpsRef.current = 24;
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // 7. Strict FPS cap — draw only when frame budget elapsed (30 in focus, 24 blurred)
    let lastDrawTime = 0;
    let animationFrameId = 0;

    const frameBudgetMs = () => 1000 / targetFpsRef.current;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = (now: number) => {
      animationFrameId = requestAnimationFrame(tick);

      if (lastDrawTime === 0) {
        lastDrawTime = now;
        return;
      }

      const elapsed = now - lastDrawTime;
      const budget = frameBudgetMs();
      if (elapsed < budget) {
        return;
      }

      lastDrawTime = now;
      const stepMs = budget;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.elapsed += stepMs;
          if (p.elapsed >= p.duration) {
            p.elapsed = p.elapsed % p.duration;
            // Randomize trajectory slightly on recycle for organic realism
            p.xStart = Math.random() * 100;
            p.xMid = p.xStart + (Math.random() * 20 - 10);
            p.xEnd = p.xStart + (Math.random() * 40 - 20);
          }

          const t = p.elapsed / p.duration;

          // Path: 2-segment linear interpolation matching Framer Motion keyframes [xStart, xMid, xEnd]
          const xPct = t < 0.5 ? lerp(p.xStart, p.xMid, t * 2) : lerp(p.xMid, p.xEnd, (t - 0.5) * 2);
          const x = (xPct / 100) * width;

          // Vertically goes from -20vh to 120vh
          const y = -0.2 * height + t * 1.4 * height;

          // Rotation
          const rotation = lerp(p.rotationStart, p.rotationEnd, t) * (Math.PI / 180);

          // Opacity
          const peakOpacity = p.layer === "front" ? 0.24 : 0.72;
          let opacity = peakOpacity;
          if (t < 0.15) {
            opacity = (t / 0.15) * peakOpacity;
          } else if (t > 0.85) {
            opacity = ((1 - t) / 0.15) * peakOpacity;
          }

          const texture = textures[p.layer];
          if (texture) {
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.translate(x, y);
            ctx.rotate(rotation);

            const scale = p.size / texture.baseSize;
            const drawW = texture.canvas.width * scale;
            const drawH = texture.canvas.height * scale;
            
            // Draw centered around origin (0, 0)
            const drawX = -texture.padding * scale - p.size / 2;
            const drawY = -texture.padding * scale - p.size / 2;

            ctx.drawImage(texture.canvas, drawX, drawY, drawW, drawH);
            ctx.restore();
          }
        }
    };

    animationFrameId = requestAnimationFrame(tick);

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [effectiveIntensity, sakuraColorSetting, calmMotion, theme, zenMode, isVisible, prefersReducedMotion]);

  // If animations are off, render absolutely nothing to preserve resources
  if (prefersReducedMotion || calmMotion || effectiveIntensity === "off" || !isVisible) {
    return null;
  }

  // Define dynamic accent colors for ambient bottom glow
  let ambientColor = "";
  switch (sakuraColorSetting) {
    case "purple":
      ambientColor = "var(--neon-purple)";
      break;
    case "blue":
      ambientColor = "var(--neon-cyan)";
      break;
    case "green":
      ambientColor = "var(--neon-green)";
      break;
    case "pink":
    default:
      ambientColor = "var(--neon-pink)";
      break;
  }

  return (
    <div className="sakura-fx-layer" aria-hidden>
      <div
        className="absolute bottom-0 left-0 w-full sakura-ambient-glow"
        style={{
          height: "40vh",
          background: `radial-gradient(ellipse 120% 80% at 50% 100%, color-mix(in srgb, ${ambientColor} 22%, transparent) 0%, transparent 72%)`,
        }}
      />

      <canvas ref={canvasRef} className="sakura-fx-canvas absolute inset-0 w-full h-full overflow-hidden" />
    </div>
  );
};
