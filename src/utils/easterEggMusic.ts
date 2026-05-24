export const EASTER_CLICKS_REQUIRED = 5;
export const EASTER_CLICK_WINDOW_MS = 2500;

export const EASTER_HINT_TOASTS = [
  'Koi · C\'est un titre, pas un bouton.',
  'Koi · Tu cherches quoi, exactement ?',
  'Koi · Bon… tu insistes vraiment.',
  'Koi · D\'accord, une dernière pour la route.',
] as const;

export const EASTER_REWARD_TOAST = 'Koi · Tu l\'as trouvée. Écoute.';

export type EasterClickProgress = 1 | 2 | 3 | 4;

const EASTER_SEEN_KEY = 'koi_easter_music_seen';

export function hasSeenEaster(): boolean {
  try {
    return localStorage.getItem(EASTER_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markEasterSeen(): void {
  try {
    localStorage.setItem(EASTER_SEEN_KEY, 'true');
  } catch {
    // ignore storage failures
  }
}

export function createEasterClickTracker(
  onUnlock: () => void,
  onProgress?: (clickIndex: EasterClickProgress) => void,
): () => void {
  let count = 0;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  return () => {
    count += 1;

    if (resetTimer !== null) {
      clearTimeout(resetTimer);
    }

    if (count >= EASTER_CLICKS_REQUIRED) {
      count = 0;
      resetTimer = null;
      onUnlock();
      return;
    }

    onProgress?.(count as EasterClickProgress);

    resetTimer = setTimeout(() => {
      count = 0;
      resetTimer = null;
    }, EASTER_CLICK_WINDOW_MS);
  };
}

declare global {
  interface Window {
    koiPlayEasterMusic?: () => void;
    koiStopEasterMusic?: () => void;
  }
}

export function mountEasterDevCommands(
  activate: () => void,
  deactivate: () => void,
): void {
  if (!import.meta.env.DEV) return;

  window.koiPlayEasterMusic = activate;
  window.koiStopEasterMusic = deactivate;
  console.info('[Koi Dev] koiPlayEasterMusic() · koiStopEasterMusic()');
}
