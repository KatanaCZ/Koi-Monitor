import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { appService } from '../../services/api';

interface DonateButtonProps {
  reducedMotion?: boolean;
  onOpenSuccess?: () => void;
  onOpenError?: () => void;
}

export const DonateButton: React.FC<DonateButtonProps> = ({
  reducedMotion = false,
  onOpenSuccess,
  onOpenError,
}) => {
  const { t } = useTranslation();
  const [opening, setOpening] = useState(false);

  const handleClick = useCallback(async () => {
    if (opening) return;
    setOpening(true);
    try {
      await appService.openDonationPage();
      onOpenSuccess?.();
    } catch {
      onOpenError?.();
    } finally {
      setOpening(false);
    }
  }, [opening, onOpenSuccess, onOpenError]);

  return (
    <motion.button
      type="button"
      onClick={() => void handleClick()}
      disabled={opening}
      aria-label={t('settings_about_donate_aria')}
      className="koi-donate-btn group relative mt-1 cursor-pointer disabled:cursor-wait disabled:opacity-90"
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
          {t('settings_about_donate')}
        </span>
      </span>
    </motion.button>
  );
};
