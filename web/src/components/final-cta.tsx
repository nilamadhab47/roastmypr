"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { ROAST_CTA_URL } from "@/lib/links";

type Phase = 0 | 1 | 2 | 3 | 4 | 5;

export function FinalCTA() {
  const [phase, setPhase] = useState<Phase>(0);
  const [hasTriggered, setHasTriggered] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const startSequence = useCallback(() => {
    if (hasTriggered) return;
    setHasTriggered(true);
    setPhase(1);
  }, [hasTriggered]);

  // IntersectionObserver to trigger on scroll
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startSequence();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [startSequence]);

  // Phase state machine
  useEffect(() => {
    if (phase === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => {
      timers.push(setTimeout(fn, ms));
    };

    if (phase === 1) schedule(() => setPhase(2), 1000);
    if (phase === 2) schedule(() => setPhase(3), 1000);
    if (phase === 3) schedule(() => setPhase(4), 500);
    if (phase === 4) schedule(() => setPhase(5), 1000);

    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const handleDoIt = () => {
    if (phase === 4) setPhase(5);
  };

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-36 overflow-hidden"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="relative min-h-[480px] flex flex-col items-center justify-center">
          {/* Phase 1: Fake PR card */}
          <AnimatePresence>
            {phase >= 1 && phase < 5 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl shadow-black/40"
              >
                {/* PR header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-green/80" />
                  <span className="text-xs font-mono text-green/80">Open</span>
                </div>
                <h3 className="text-lg font-bold text-text">
                  Pull Request #999
                </h3>
                <p className="mt-1 text-sm font-mono text-muted">
                  &ldquo;just one last change&rdquo;
                </p>

                {/* Phase 2: Cursor moving toward button */}
                {phase >= 2 && phase < 5 && (
                  <div className="mt-6 flex items-center justify-end relative">
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-lg bg-roast-red px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-roast-red/20"
                    >
                      🔥 ROAST
                    </motion.button>

                    {/* Animated cursor */}
                    <motion.div
                      initial={{ x: -120, y: -20, opacity: 0 }}
                      animate={{ x: -10, y: 10, opacity: 1 }}
                      transition={{
                        duration: 0.8,
                        ease: "easeInOut",
                      }}
                      className="absolute pointer-events-none z-10"
                    >
                      <svg
                        width="18"
                        height="22"
                        viewBox="0 0 20 24"
                        fill="none"
                        className="drop-shadow-lg"
                      >
                        <path
                          d="M2 2L2 18L6.5 14L10.5 22L13.5 20.5L9.5 12.5L15 12L2 2Z"
                          fill="white"
                          stroke="#070708"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </motion.div>
                  </div>
                )}

                {/* Phase 3: "Are you sure?" */}
                <AnimatePresence>
                  {phase >= 3 && phase < 5 && (
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 text-center text-sm font-mono text-roast-orange"
                    >
                      Are you sure?
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Phase 4: DO IT button */}
                <AnimatePresence>
                  {phase === 4 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", bounce: 0.4 }}
                      className="mt-4 flex justify-center"
                    >
                      <motion.button
                        onClick={handleDoIt}
                        animate={{
                          scale: [1, 1.05, 1],
                          boxShadow: [
                            "0 0 20px rgba(255,77,77,0.3)",
                            "0 0 40px rgba(255,77,77,0.6)",
                            "0 0 20px rgba(255,77,77,0.3)",
                          ],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="rounded-xl bg-roast-red px-10 py-4 text-lg font-black text-white cursor-pointer"
                      >
                        DO IT.
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 5: Result + CTA */}
          <AnimatePresence>
            {phase === 5 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.5,
                  type: "spring",
                  bounce: 0.3,
                }}
                className="flex flex-col items-center gap-6 text-center"
              >
                {/* Result */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-3"
                >
                  <p className="text-4xl md:text-5xl font-black text-roast-red">
                    🔥 ROAST COMPLETE
                  </p>
                  <div className="space-y-1 text-sm md:text-base font-mono text-muted">
                    <p>Your code has been emotionally damaged.</p>
                    <p>Your reviewer hasn&apos;t seen it yet.</p>
                    <p className="text-text font-semibold">
                      Let&apos;s fix that.
                    </p>
                  </div>
                </motion.div>

                {/* Install CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="flex flex-col items-center gap-3 mt-4"
                >
                  <a
                    href={ROAST_CTA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl bg-green px-10 py-5",
                      "text-lg md:text-xl font-bold text-bg",
                      "shadow-xl shadow-green/25 transition-all",
                      "hover:shadow-green/40 hover:scale-105 active:scale-95"
                    )}
                  >
                    <span className="text-xl">🔥</span>
                    Roast My PR
                  </a>
                  <p className="text-sm text-muted">
                    Claude writes. Jev scores. You drop it on GitHub.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
