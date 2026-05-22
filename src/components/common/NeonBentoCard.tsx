import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { useAppStore } from '../../store';

interface NeonBentoCardProps {
  children: React.ReactNode;
  className?: string;
  themeColor?: string;
  delay?: number;
  layoutId?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const NeonBentoCard: React.FC<NeonBentoCardProps> = ({ 
  children, 
  className = '', 
  themeColor = 'var(--neon-pink)',
  delay = 0,
  layoutId,
  onClick,
  style = {}
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const theme = useAppStore((s) => s.theme);
  const hoverGlow = theme === 'light' ? '28%' : '15%';
  const prefersReducedMotion = useReducedMotion();
  const tiltEnabled = !prefersReducedMotion;

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 40 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 40 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltEnabled || !ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Normalize coordinates between -0.5 and 0.5
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={tiltEnabled ? handleMouseMove : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      layoutId={layoutId}
      onClick={onClick}
      initial={layoutId ? undefined : { opacity: 0, y: 30, scale: 0.95 }}
      animate={layoutId ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: 'spring', 
        stiffness: 100, 
        damping: 20, 
        delay: layoutId ? undefined : delay,
        mass: 1
      }}
      style={{
        rotateX: tiltEnabled && isHovered ? rotateX : 0,
        rotateY: tiltEnabled && isHovered ? rotateY : 0,
        transformPerspective: 1000,
        zIndex: isHovered ? 10 : 1,
        ...style,
      }}
      className={`bento-card group relative p-6 flex flex-col ${className}`}
    >
      {/* Dynamic neon glow strictly bound to the card bounds (overflow is hidden on bento-card) */}
      <motion.div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, color-mix(in srgb, ${themeColor} ${hoverGlow}, transparent) 0%, transparent 70%)`,
        }}
      />
      
      {/* Content — gap applies between widget sections (header, body, footer) */}
      <div className="relative z-10 w-full flex-1 min-h-0 flex flex-col gap-4">
        {children}
      </div>
    </motion.div>
  );
};
