import { useEffect } from 'react';
import { useAppStore } from '../store';
import { syncGlassBlurClass } from '../utils/glassBlur';
import { syncAtmosphereFromSettings } from '../utils/atmosphereSettings';

export const useAtmosphereSync = () => {
  const enableGlassmorphicBlur = useAppStore((s) => s.settings.enableGlassmorphicBlur);
  const backgroundAura = useAppStore((s) => s.settings.backgroundAura);
  const neonGlow = useAppStore((s) => s.settings.neonGlow);
  const calmMotion = useAppStore((s) => s.settings.calmMotion);
  const sakuraColor = useAppStore((s) => s.settings.sakuraColor);

  useEffect(() => {
    syncGlassBlurClass(enableGlassmorphicBlur);

    const handleFocus = () => {
      syncGlassBlurClass(enableGlassmorphicBlur);
    };
    const handleBlur = () => {
      syncGlassBlurClass(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enableGlassmorphicBlur]);

  useEffect(() => {
    syncAtmosphereFromSettings({ backgroundAura, neonGlow, calmMotion, sakuraColor });
  }, [backgroundAura, neonGlow, calmMotion, sakuraColor]);
};
