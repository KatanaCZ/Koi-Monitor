import { useEffect, useRef, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useAppStore } from '../store';
import {
  pauseAll,
  playTrack,
  disposeAllAudio,
} from '../utils/ambientMusic';

export function useAmbientMusic(showSplash: boolean): {
  toggleAmbientMute: () => void;
  ambientMusicMuted: boolean;
} {
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion ?? false;
  const ambientMusicMuted = useAppStore((s) => s.settings.ambientMusicMuted);
  const easterMusicActive = useAppStore((s) => s.easterMusicActive);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const startedRef = useRef(false);

  const dashboardReady = !showSplash;

  useEffect(() => {
    if (!dashboardReady) return;

    if (ambientMusicMuted) {
      pauseAll();
      return;
    }

    if (reducedMotion) {
      if (!startedRef.current) return;
      pauseAll();
      return;
    }

    startedRef.current = true;

    if (easterMusicActive) {
      // Easter hook owns crossfade / easter playback — avoid racing play().
      return;
    }

    void playTrack('ambient', true);
  }, [dashboardReady, ambientMusicMuted, reducedMotion, easterMusicActive]);

  useEffect(() => {
    return () => {
      disposeAllAudio();
    };
  }, []);

  const toggleAmbientMute = useCallback(() => {
    const nextMuted = !ambientMusicMuted;
    updateSettings({ ambientMusicMuted: nextMuted });

    if (nextMuted) {
      pauseAll();
      return;
    }

    // Persist unmute in settings; playback stays off while prefers-reduced-motion.
    if (reducedMotion) {
      return;
    }

    if (easterMusicActive) {
      void playTrack('easter', true);
      return;
    }

    void playTrack('ambient', true);
  }, [ambientMusicMuted, easterMusicActive, reducedMotion, updateSettings]);

  return { toggleAmbientMute, ambientMusicMuted };
}
