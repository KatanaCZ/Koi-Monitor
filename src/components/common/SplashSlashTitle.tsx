import React from "react";
import { SlashTitle } from "./SlashTitle";

interface SplashSlashTitleProps {
  reducedMotion?: boolean;
}

export const SplashSlashTitle: React.FC<SplashSlashTitleProps> = ({
  reducedMotion = false,
}) => (
  <div className="relative flex flex-col items-center w-full shrink-0">
    <SlashTitle size="lg" reducedMotion={reducedMotion} className="mb-0 pb-0" />

    {/* Réserve l'espace sous le katana (position absolute) pour ne pas chevaucher les étapes */}
    <div aria-hidden="true" className="h-6 sm:h-8 w-full shrink-0" />

    <h2 id="splash-title" className="sr-only">
      Koi Monitor
    </h2>
  </div>
);
