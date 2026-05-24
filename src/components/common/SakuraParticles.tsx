import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAppStore } from "../../store";

type LayerType = "back" | "mid" | "front";

interface SakuraParticle {
  id: number;
  x: number;
  xMid: number;
  xEnd: number;
  size: number;
  duration: number;
  delay: number;
  rotationStart: number;
  rotationEnd: number;
  layer: LayerType;
  blur: number;
}

const PetalSvg = ({ color, opacity }: { color: string; opacity: number }) => (
  <svg
    viewBox="0 0 30 30"
    width="100%"
    height="100%"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: `drop-shadow(0 0 8px ${color})`, opacity }}
  >
    <path
      d="M15,4 C19,-1 28,1 28,10 C28,18 20,26 15,30 C10,26 2,18 2,10 C2,1 11,-1 15,4 Z"
      fill={color}
    />
  </svg>
);

export const SakuraParticles: React.FC = () => {
  const [particles, setParticles] = useState<SakuraParticle[]>([]);
  const [isVisible, setIsVisible] = useState(
    () => typeof document !== "undefined" && !document.hidden,
  );
  const sakuraIntensity = useAppStore((s) => s.settings.sakuraIntensity);
  const sakuraColorSetting = useAppStore((s) => s.settings.sakuraColor);
  const calmMotion = useAppStore((s) => s.settings.calmMotion);
  const zenMode = useAppStore((s) => s.zenMode);
  const prefersReducedMotion = useReducedMotion();

  /** En Zen : high plafonné à medium ; medium → low ; low/off inchangés. */
  const effectiveIntensity = zenMode
    ? sakuraIntensity === "high"
      ? "medium"
      : sakuraIntensity === "medium"
        ? "low"
        : sakuraIntensity
    : sakuraIntensity;

  useEffect(() => {
    const onVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || calmMotion || !isVisible) {
      setParticles([]);
      return;
    }

    const newParticles: SakuraParticle[] = [];
    let idCounter = 0;

    const generateParticles = (
      count: number,
      layer: LayerType,
      minSize: number,
      maxSize: number,
      minDur: number,
      maxDur: number,
      blur: number,
    ) => {
      for (let i = 0; i < count; i++) {
        const startX = Math.random() * 100;
        newParticles.push({
          id: idCounter++,
          x: startX,
          xMid: startX + (Math.random() * 20 - 10),
          xEnd: startX + (Math.random() * 40 - 20),
          size: Math.random() * (maxSize - minSize) + minSize,
          duration: Math.random() * (maxDur - minDur) + minDur,
          delay: Math.random() * -30,
          rotationStart: Math.random() * 360,
          rotationEnd: Math.random() * 360 + 360,
          layer,
          blur,
        });
      }
    };

    if (effectiveIntensity !== "off") {
      const multiplier =
        effectiveIntensity === "low"
          ? 0.35
          : effectiveIntensity === "medium"
            ? 0.75
            : 1.35;

      generateParticles(Math.max(1, Math.round(15 * multiplier)), "back", 10, 20, 30, 45, 4);
      generateParticles(Math.max(1, Math.round(10 * multiplier)), "mid", 25, 45, 15, 25, 1);
      if (!zenMode) {
        generateParticles(Math.max(1, Math.round(3 * multiplier)), "front", 120, 250, 8, 14, 12);
      }
    }

    setParticles(newParticles);
  }, [effectiveIntensity, zenMode, calmMotion, prefersReducedMotion, isVisible]);

  if (prefersReducedMotion || calmMotion || effectiveIntensity === "off" || !isVisible) {
    return null;
  }

  const getSakuraColor = (color: string) => {
    switch (color) {
      case "purple":
        return "var(--neon-purple)";
      case "blue":
        return "var(--neon-cyan)";
      case "green":
        return "var(--neon-green)";
      case "pink":
      default:
        return "var(--neon-pink)";
    }
  };

  const sakuraColor = getSakuraColor(sakuraColorSetting || "pink");

  return (
    <>
      <motion.div
        className="fixed bottom-0 left-0 w-full pointer-events-none z-[1]"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{
          height: "40vh",
          background: `linear-gradient(to top, color-mix(in srgb, ${sakuraColor} 15%, transparent) 0%, transparent 100%)`,
          filter: "blur(30px)",
        }}
      />

      <div
        className="fixed inset-0 pointer-events-none z-[1] overflow-hidden"
        aria-hidden="true"
      >
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ y: "-20vh", x: `${particle.x}vw`, opacity: 0 }}
            animate={{
              y: ["-20vh", "120vh"],
              x: [`${particle.x}vw`, `${particle.xMid}vw`, `${particle.xEnd}vw`],
              rotate: [particle.rotationStart, particle.rotationEnd],
              opacity:
                particle.layer === "front" ? [0, 0.4, 0.4, 0] : [0, 0.8, 0.8, 0],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              position: "absolute",
              width: particle.size,
              height: particle.size,
              filter: `blur(${particle.blur}px)`,
              zIndex: particle.layer === "front" ? 2 : particle.layer === "mid" ? 1 : 0,
            }}
          >
            <PetalSvg
              color={sakuraColor}
              opacity={particle.layer === "front" ? 0.6 : 0.9}
            />
          </motion.div>
        ))}
      </div>
    </>
  );
};
