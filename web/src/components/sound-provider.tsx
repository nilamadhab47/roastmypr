"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createSoundPlayer,
  getSoundsEnabled,
  setSoundsEnabled,
  type SoundName,
} from "@/lib/sounds";
import { SoundToggle } from "@/components/sound-toggle";

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
  play: (name: SoundName, volume?: number) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEnabled(getSoundsEnabled());
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      setSoundsEnabled(next);
      return next;
    });
  }, []);

  const play = useMemo(
    () => createSoundPlayer(() => enabled),
    [enabled]
  );

  const value = useMemo(
    () => ({ enabled, toggle, play }),
    [enabled, toggle, play]
  );

  return (
    <SoundContext.Provider value={value}>
      {children}
      {hydrated && <SoundToggle enabled={enabled} onToggle={toggle} />}
    </SoundContext.Provider>
  );
}

export function useSounds() {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error("useSounds must be used within SoundProvider");
  }
  return ctx;
}
