"use client";

import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";

export function SoundToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "fixed bottom-6 right-4 z-[9998] flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95",
        enabled
          ? "border-green/30 bg-surface-elevated/90 text-green"
          : "border-border bg-surface/90 text-muted hover:text-text"
      )}
      aria-label={enabled ? "Disable sounds" : "Enable sounds"}
      title={enabled ? "Sounds on" : "Sounds off"}
    >
      {enabled ? (
        <Volume2 className="h-4 w-4" />
      ) : (
        <VolumeX className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        Sounds: {enabled ? "ON" : "OFF"}
      </span>
    </button>
  );
}
