"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSounds } from "@/components/sound-provider";

interface Toast {
  id: number;
  message: string;
}

let toastId = 0;

const SEQUENCES: { keys: string; message: string }[] = [
  { keys: "git push --force", message: "🚨 WHY WOULD YOU DO THAT?" },
  { keys: "sudo roast me", message: "Permission denied. You're already being roasted." },
];

export function EasterEggs() {
  const { play } = useSounds();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keystrokeBuffer = useRef("");

  const addToast = useCallback((message: string) => {
    play("easter-egg", 0.45);
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, [play]);

  // Logo click listener
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-logo]")) return;

      logoClickCount.current += 1;

      if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
      logoClickTimer.current = setTimeout(() => {
        logoClickCount.current = 0;
      }, 3000);

      if (logoClickCount.current >= 5) {
        addToast("Stop clicking the logo. Ship the PR.");
        logoClickCount.current = 0;
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [addToast]);

  // Keyboard sequence listener
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      keystrokeBuffer.current += e.key.length === 1 ? e.key : "";

      // Keep buffer at a reasonable size
      if (keystrokeBuffer.current.length > 50) {
        keystrokeBuffer.current = keystrokeBuffer.current.slice(-30);
      }

      for (const seq of SEQUENCES) {
        if (keystrokeBuffer.current.endsWith(seq.keys)) {
          addToast(seq.message);
          keystrokeBuffer.current = "";
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [addToast]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
            className="pointer-events-auto rounded-xl border border-border bg-surface-elevated px-5 py-3 shadow-2xl shadow-black/60"
          >
            <p className="text-sm font-semibold text-text whitespace-nowrap">
              {toast.message}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
