import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

interface DonateButtonProps {
  onClick?: () => void;
  reducedMotion?: boolean;
}

export const DonateButton: React.FC<DonateButtonProps> = ({
  onClick,
  reducedMotion = false,
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    aria-label="Soutenir Koi Monitor — lien de don bientôt disponible"
    className="koi-donate-btn group relative mt-1 cursor-pointer"
    whileHover={reducedMotion ? undefined : { scale: 1.04, y: -1 }}
    whileTap={reducedMotion ? undefined : { scale: 0.97 }}
    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
  >
    <span className="koi-donate-aura" aria-hidden="true" />
    <span className="koi-donate-shine" aria-hidden="true" />
    <span className="koi-donate-glint" aria-hidden="true" />
    <span className="relative z-10 flex items-center justify-center gap-2 px-5 py-2.5">
      <Heart
        size={14}
        className="text-white/95 drop-shadow-[0_0_6px_rgba(255,255,255,0.45)] group-hover:scale-110 transition-transform duration-300"
        fill="currentColor"
        aria-hidden="true"
      />
      <span className="text-xs font-semibold tracking-[0.06em] text-white drop-shadow-sm">
        Soutenir Koi
      </span>
    </span>
  </motion.button>
);
