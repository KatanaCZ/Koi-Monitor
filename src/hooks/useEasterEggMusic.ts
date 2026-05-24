import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useAppStore } from '../store';
import { crossfadeTo, pauseAll } from '../utils/ambientMusic';
import {
  createEasterClickTracker,
  EASTER_HINT_TOASTS,
  EASTER_REWARD_TOAST,
  hasSeenEaster,
  markEasterSeen,
  mountEasterDevCommands,
} from '../utils/easterEggMusic';

export function useEasterEggMusic(showSplash: boolean): {
  registerEasterClick: () => void;
} {
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
      pushStatusToast('Activez le volume pour entendre la mélodie.');
      return;
    }

    manualAudioRef.current = true;
    await crossfadeTo('easter');
    setEasterMusicActive(true);
    markEasterSeen();
    pushStatusToast(EASTER_REWARD_TOAST, 'success', { skipLog: true });
  }, [ambientMusicMuted, pushStatusToast, setEasterMusicActive]);

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
          const message = EASTER_HINT_TOASTS[clickIndex - 1];
          pushStatusToast(message, 'success', { skipLog: true });
        },
      ),
    [toggleEasterMusic, easterMusicActive, pushStatusToast],
  );

  useEffect(() => {
    mountEasterDevCommands(
      () => void activateEasterMusic(),
      () => void deactivateEasterMusic(),
    );
  }, [activateEasterMusic, deactivateEasterMusic]);

  return { registerEasterClick };
}
