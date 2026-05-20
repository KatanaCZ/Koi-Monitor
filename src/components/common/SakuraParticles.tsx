import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store';

type LayerType = 'back' | 'mid' | 'front';

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

const PetalSvg = ({ color, opacity }: { color: string, opacity: number }) => (
  <svg viewBox="0 0 30 30" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ filter: `drop-shadow(0 0 8px ${color})`, opacity }}>
    {/* Stylized Sakura Petal with cleft */}
    <path 
      d="M15,4 C19,-1 28,1 28,10 C28,18 20,26 15,30 C10,26 2,18 2,10 C2,1 11,-1 15,4 Z" 
      fill={color} 
    />
  </svg>
);

export const SakuraParticles: React.FC = () => {
  const [particles, setParticles] = useState<SakuraParticle[]>([]);
  const { theme, settings } = useAppStore();

  useEffect(() => {
    const newParticles: SakuraParticle[] = [];
    let idCounter = 0;

    // Helper to generate particles
    const generateParticles = (count: number, layer: LayerType, minSize: number, maxSize: number, minDur: number, maxDur: number, blur: number) => {
      for (let i = 0; i < count; i++) {
        const startX = Math.random() * 100;
        newParticles.push({
          id: idCounter++,
          x: startX,
          xMid: startX + (Math.random() * 20 - 10),
          xEnd: startX + (Math.random() * 40 - 20),
          size: Math.random() * (maxSize - minSize) + minSize,
          duration: Math.random() * (maxDur - minDur) + minDur,
          delay: Math.random() * -30, // Negative delay to start already on screen
          rotationStart: Math.random() * 360,
          rotationEnd: Math.random() * 360 + 360, // Rotates at least one full circle
          layer,
          blur,
        });
      }
    };

    const intensity = settings.sakuraIntensity;
    if (intensity !== 'off') {
      const multiplier = intensity === 'low' ? 0.35 : intensity === 'medium' ? 0.75 : 1.35;

      // Layer 1: Background (Distant, slow, many, blurred)
      generateParticles(Math.max(1, Math.round(15 * multiplier)), 'back', 10, 20, 30, 45, 4);
      
      // Layer 2: Midground (In focus, normal speed, medium amount)
      generateParticles(Math.max(1, Math.round(10 * multiplier)), 'mid', 25, 45, 15, 25, 1);
      
      // Layer 3: Foreground (Cinematic depth, huge, fast, heavily blurred)
      generateParticles(Math.max(1, Math.round(3 * multiplier)), 'front', 120, 250, 8, 14, 12);
    }

    setParticles(newParticles);
  }, [settings.sakuraIntensity]);

  const sakuraColor = theme === 'dark' ? 'var(--neon-pink)' : 'var(--neon-purple)';
  const fogColor = theme === 'dark' ? 'var(--neon-pink)' : 'var(--neon-purple)';

  return (
    <>
      {/* Animated Fog at the bottom */}
      <motion.div 
        className="fixed bottom-0 left-0 w-full pointer-events-none z-0"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{
          height: '40vh',
          background: `linear-gradient(to top, color-mix(in srgb, ${fogColor} 15%, transparent) 0%, transparent 100%)`,
          filter: 'blur(30px)',
        }}
      />

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0, // Derrière le contenu principal
        overflow: 'hidden',
      }}>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ y: '-20vh', x: `${particle.x}vw`, opacity: 0 }}
            animate={{
              y: ['-20vh', '120vh'],
              x: [`${particle.x}vw`, `${particle.xMid}vw`, `${particle.xEnd}vw`],
              rotate: [particle.rotationStart, particle.rotationEnd],
              opacity: particle.layer === 'front' 
                ? [0, 0.4, 0.4, 0] // Front is very transparent
                : [0, 0.8, 0.8, 0],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              position: 'absolute',
              width: particle.size,
              height: particle.size,
              filter: `blur(${particle.blur}px)`,
              zIndex: particle.layer === 'front' ? 2 : particle.layer === 'mid' ? 1 : 0,
            }}
          >
            <PetalSvg color={sakuraColor} opacity={particle.layer === 'front' ? 0.6 : 0.9} />
          </motion.div>
        ))}
      </div>
    </>
  );
};