export type SoundName =
  | "roast-click"
  | "roast-complete"
  | "level-five"
  | "gif-boing"
  | "easter-egg";

const SOUND_FILES: Record<SoundName, string> = {
  "roast-click": "/sounds/roast-click.mp3",
  "roast-complete": "/sounds/roast-complete.mp3",
  "level-five": "/sounds/level-five.mp3",
  "gif-boing": "/sounds/gif-boing.mp3",
  "easter-egg": "/sounds/easter-egg.mp3",
};

const STORAGE_KEY = "roastmypr-sounds-enabled";

export function getSoundsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setSoundsEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
}

export function createSoundPlayer(enabled: () => boolean) {
  const cache = new Map<SoundName, HTMLAudioElement>();

  const getAudio = (name: SoundName) => {
    if (!cache.has(name)) {
      const audio = new Audio(SOUND_FILES[name]);
      audio.preload = "auto";
      cache.set(name, audio);
    }
    return cache.get(name)!;
  };

  return (name: SoundName, volume = 0.5) => {
    if (!enabled()) return;

    try {
      const audio = getAudio(name);
      audio.volume = volume;
      audio.currentTime = 0;
      void audio.play();
    } catch {
      // Autoplay blocked or missing file — ignore silently
    }
  };
}
