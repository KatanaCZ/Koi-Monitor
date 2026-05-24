export const AMBIENT_MUSIC_SRC = '/audio/koi-ambient.mp3';
export const EASTER_MUSIC_SRC = '/audio/koi-easter.mp3';
export const AMBIENT_TARGET_VOLUME = 0.35;
export const EASTER_TARGET_VOLUME = 0.4;
export const AMBIENT_FADE_MS = 1200;

export type AudioTrackId = 'ambient' | 'easter';

const TRACKS: Record<
  AudioTrackId,
  { src: string; volume: number; loop: boolean; preload: 'auto' | 'none' }
> = {
  ambient: {
    src: AMBIENT_MUSIC_SRC,
    volume: AMBIENT_TARGET_VOLUME,
    loop: true,
    preload: 'auto',
  },
  easter: {
    src: EASTER_MUSIC_SRC,
    volume: EASTER_TARGET_VOLUME,
    loop: true,
    preload: 'none',
  },
};

const audioElements: Partial<Record<AudioTrackId, HTMLAudioElement>> = {};
let activeTrack: AudioTrackId | null = null;
let fadeRaf: number | null = null;
let fadeGeneration = 0;

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function getOrCreateAudio(id: AudioTrackId): HTMLAudioElement {
  let el = audioElements[id];
  if (!el) {
    const track = TRACKS[id];
    el = new Audio(track.src);
    el.loop = track.loop;
    el.preload = track.preload;
    audioElements[id] = el;
  }
  return el;
}

function cancelFade(): void {
  fadeGeneration += 1;
  if (fadeRaf !== null) {
    cancelAnimationFrame(fadeRaf);
    fadeRaf = null;
  }
}

function fadeVolume(
  el: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
): Promise<void> {
  cancelFade();
  const generation = fadeGeneration;
  const startFrom = clampVolume(from);
  const target = clampVolume(to);

  if (durationMs <= 0) {
    el.volume = target;
    return Promise.resolve();
  }

  const start = performance.now();
  el.volume = startFrom;

  return new Promise((resolve) => {
    const step = (now: number) => {
      if (generation !== fadeGeneration) {
        resolve();
        return;
      }

      const t = Math.min(1, (now - start) / durationMs);
      el.volume = clampVolume(startFrom + (target - startFrom) * t);

      if (t < 1) {
        fadeRaf = requestAnimationFrame(step);
      } else {
        fadeRaf = null;
        el.volume = target;
        resolve();
      }
    };
    fadeRaf = requestAnimationFrame(step);
  });
}

export function getActiveTrack(): AudioTrackId | null {
  return activeTrack;
}

export async function playTrack(id: AudioTrackId, fadeIn = true): Promise<void> {
  cancelFade();

  const track = TRACKS[id];
  const el = getOrCreateAudio(id);

  if (
    activeTrack === id &&
    !el.paused &&
    (!fadeIn || el.volume >= track.volume * 0.95)
  ) {
    return;
  }

  try {
    if (activeTrack && activeTrack !== id) {
      const prev = audioElements[activeTrack];
      if (prev && !prev.paused) {
        prev.pause();
        prev.volume = TRACKS[activeTrack].volume;
      }
    }

    activeTrack = id;

    if (el.paused) {
      el.volume = fadeIn ? 0 : track.volume;
      await el.play();
      if (fadeIn) {
        await fadeVolume(el, 0, track.volume, AMBIENT_FADE_MS);
      } else {
        el.volume = track.volume;
      }
    } else if (fadeIn && el.volume < track.volume) {
      await fadeVolume(el, el.volume, track.volume, AMBIENT_FADE_MS);
    } else if (!fadeIn) {
      el.volume = track.volume;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return;
    }
    console.warn('[ambientMusic] playback failed:', err);
  }
}

export async function crossfadeTo(
  id: AudioTrackId,
  durationMs = AMBIENT_FADE_MS,
): Promise<void> {
  if (activeTrack === id) {
    const el = audioElements[id];
    if (el?.paused) {
      await playTrack(id, true);
    }
    return;
  }

  cancelFade();
  const generation = fadeGeneration;

  const nextTrack = TRACKS[id];
  const nextEl = getOrCreateAudio(id);
  const prevId = activeTrack;
  const prevEl = prevId ? audioElements[prevId] : null;
  const prevPlaying = Boolean(prevEl && !prevEl.paused);
  const prevFrom = clampVolume(prevEl?.volume ?? 0);

  try {
    nextEl.volume = 0;
    if (nextEl.paused) {
      await nextEl.play();
    }

    activeTrack = id;

    await new Promise<void>((resolve) => {
      const start = performance.now();
      const step = (now: number) => {
        if (generation !== fadeGeneration) {
          resolve();
          return;
        }

        const t = Math.min(1, (now - start) / durationMs);
        nextEl.volume = clampVolume(nextTrack.volume * t);

        if (prevEl && prevPlaying) {
          prevEl.volume = clampVolume(prevFrom * (1 - t));
        }

        if (t < 1) {
          fadeRaf = requestAnimationFrame(step);
        } else {
          fadeRaf = null;
          if (prevEl && prevPlaying) {
            prevEl.pause();
            prevEl.volume = prevId ? TRACKS[prevId].volume : 0;
          }
          nextEl.volume = nextTrack.volume;
          resolve();
        }
      };
      fadeRaf = requestAnimationFrame(step);
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return;
    }
    console.warn('[ambientMusic] crossfade failed:', err);
  }
}

export function pauseAll(): void {
  cancelFade();
  for (const el of Object.values(audioElements)) {
    if (el && !el.paused) {
      el.pause();
    }
  }
}

export async function startAmbientMusic(fadeIn = true): Promise<void> {
  await playTrack('ambient', fadeIn);
}

export function pauseAmbientMusic(): void {
  pauseAll();
}

export async function resumeAmbientMusic(fadeIn = true): Promise<void> {
  await playTrack(activeTrack ?? 'ambient', fadeIn);
}

export function disposeAllAudio(): void {
  cancelFade();
  for (const id of Object.keys(audioElements) as AudioTrackId[]) {
    const el = audioElements[id];
    if (el) {
      el.pause();
      el.src = '';
      delete audioElements[id];
    }
  }
  activeTrack = null;
}

export function disposeAmbientMusic(): void {
  disposeAllAudio();
}
