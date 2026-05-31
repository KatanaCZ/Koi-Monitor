import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useAppStore } from '../store';
import { crossfadeTo, pauseAll } from '../utils/ambientMusic';
import {
  createEasterClickTracker,
  hasSeenEaster,
  markEasterSeen,
  mountEasterDevCommands,
} from '../utils/easterEggMusic';
import { useTranslation } from './useTranslation';

export function useEasterEggMusic(showSplash: boolean): {
  registerEasterClick: () => void;
} {
  const { t } = useTranslation();
  const easterMusicActive = useAppStore((s) => s.easterMusicActive);
  const setEasterMusicActive = useAppStore((s) => s.setEasterMusicActive);
  const ambientMusicMuted = useAppStore((s) => s.settings.ambientMusicMuted);
  const pushStatusToast = useAppStore((s) => s.pushStatusToast);
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion ?? false;
  const manualAudioRef = useRef(false);

  const dashboardReady = !showSplash;

  const activateEasterMusic = useCallback(async () => {
    if (ambientMusicMuted) {
      pushStatusToast(t('easter_mute_warning'));
      return;
    }

    manualAudioRef.current = true;
    await crossfadeTo('easter');
    setEasterMusicActive(true);
    markEasterSeen();
    pushStatusToast(t('easter_reward'), 'success', { skipLog: true });
  }, [ambientMusicMuted, pushStatusToast, setEasterMusicActive, t]);

  const deactivateEasterMusic = useCallback(async () => {
    if (ambientMusicMuted) {
      pauseAll();
      setEasterMusicActive(false);
      return;
    }

    if (reducedMotion && !manualAudioRef.current) {
      pauseAll();
      setEasterMusicActive(false);
      return;
    }

    if (!dashboardReady) {
      pauseAll();
      setEasterMusicActive(false);
      return;
    }

    await crossfadeTo('ambient');
    setEasterMusicActive(false);
  }, [ambientMusicMuted, dashboardReady, reducedMotion, setEasterMusicActive]);

  const toggleEasterMusic = useCallback(() => {
    if (easterMusicActive) {
      void deactivateEasterMusic();
      return;
    }
    void activateEasterMusic();
  }, [activateEasterMusic, deactivateEasterMusic, easterMusicActive]);

  const registerEasterClick = useMemo(
    () =>
      createEasterClickTracker(
        toggleEasterMusic,
        (clickIndex) => {
          if (easterMusicActive || hasSeenEaster()) return;
          const message = t(`easter_hint_${clickIndex}` as any);
          pushStatusToast(message, 'success', { skipLog: true });
        },
      ),
    [toggleEasterMusic, easterMusicActive, pushStatusToast, t],
  );

  useEffect(() => {
    mountEasterDevCommands(
      () => void activateEasterMusic(),
      () => void deactivateEasterMusic(),
    );
  }, [activateEasterMusic, deactivateEasterMusic]);

  return { registerEasterClick };
}
