"use client";

import { useState, useEffect, useRef } from "react";
import { useSounds } from "@/components/sound-provider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

const levels = [
  {
    id: 1,
    emoji: "🌱",
    name: "Friendly Fire",
    quote: "Cute PR. A little suspicious though.",
    color: "text-green",
    bg: "from-green/5 to-transparent",
    track: "bg-green",
    glow: "shadow-[0_0_60px_rgba(57,255,136,0.15)]",
    border: "border-green/20",
  },
  {
    id: 2,
    emoji: "🔥",
    name: "Mildly Spicy",
    quote: "This could've been three lines.",
    color: "text-roast-orange",
    bg: "from-roast-orange/5 to-transparent",
    track: "bg-roast-orange",
    glow: "shadow-[0_0_60px_rgba(255,176,32,0.15)]",
    border: "border-roast-orange/20",
  },
  {
    id: 3,
    emoji: "🌶️",
    name: "Personal",
    quote: "We need to talk about this architecture.",
    color: "text-meme-yellow",
    bg: "from-meme-yellow/5 to-transparent",
    track: "bg-meme-yellow",
    glow: "shadow-[0_0_60px_rgba(255,225,77,0.15)]",
    border: "border-meme-yellow/20",
  },
  {
    id: 4,
    emoji: "💀",
    name: "Ruthless",
    quote: "I've seen production outages with better planning.",
    color: "text-roast-red",
    bg: "from-roast-red/5 to-transparent",
    track: "bg-roast-red",
    glow: "shadow-[0_0_60px_rgba(255,77,77,0.15)]",
    border: "border-roast-red/20",
  },
  {
    id: 5,
    emoji: "☠️",
    name: "Career Reevaluation",
    quote: "This PR needs its own incident postmortem.",
    color: "text-roast-red",
    bg: "from-roast-red/10 to-transparent",
    track: "bg-roast-red",
    glow: "shadow-[0_0_80px_rgba(255,77,77,0.25)]",
    border: "border-roast-red/30",
  },
];

export function RoastLevels() {
  const { play } = useSounds();
  const [level, setLevel] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const playedLevelFive = useRef(false);

  const current = levels[level];
  const isMax = level === 4;

  useEffect(() => {
    if (level === 4 && !playedLevelFive.current) {
      play("level-five", 0.6);
      playedLevelFive.current = true;
    }
    if (level < 4) {
      playedLevelFive.current = false;
    }
  }, [level, play]);

  return (
    <section
      id="roast-levels"
      className="relative py-24 md:py-36 px-4 overflow-hidden"
    >
      {/* Red pulse overlay for level 5 */}
      <AnimatePresence>
        {isMax && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.08, 0.03, 0.08, 0.04] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-0 bg-roast-red/10 z-0"
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-4xl md:text-6xl font-black tracking-tight mb-16"
        >
          CHOOSE YOUR{" "}
          <span className={cn(current.color, "transition-colors duration-500")}>
            VIOLENCE
          </span>
        </motion.h2>

        {/* Display card */}
        <motion.div
          key={`shake-${isMax}`}
          animate={
            isMax
              ? {
                  x: [0, -2, 3, -3, 2, -1, 2, 0],
                  y: [0, 1, -2, 1, -1, 2, -1, 0],
                }
              : { x: 0, y: 0 }
          }
          transition={
            isMax
              ? { duration: 0.6, repeat: Infinity, repeatDelay: 1.5 }
              : { duration: 0.3 }
          }
          className={cn(
            "relative rounded-2xl border bg-surface-elevated p-8 md:p-12 mb-12 transition-all duration-500",
            current.border,
            current.glow
          )}
        >
          {/* Gradient overlay */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b opacity-60 transition-all duration-500",
              current.bg
            )}
          />

          <div className="relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={level}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.35 }}
                className="text-center"
              >
                {/* Emoji */}
                <motion.div
                  className="text-6xl md:text-8xl mb-4"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {current.emoji}
                </motion.div>

                {/* Level name */}
                <h3
                  className={cn(
                    "text-2xl md:text-3xl font-black uppercase tracking-wide mb-4 transition-colors duration-500",
                    current.color
                  )}
                >
                  {confirmed && isMax ? "☠ CAREER REEVALUATION" : current.name}
                </h3>

                {/* Quote */}
                <p className="text-lg md:text-xl text-muted italic max-w-lg mx-auto leading-relaxed">
                  &ldquo;{current.quote}&rdquo;
                </p>

                {/* Level 5 warning + button */}
                <AnimatePresence>
                  {isMax && !confirmed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                      className="mt-8 space-y-4"
                    >
                      <motion.p
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-roast-red font-bold text-sm tracking-widest uppercase"
                      >
                        ⚠ ROAST LEVEL 5 — This cannot be undone.
                      </motion.p>
                      <button
                        onClick={() => {
                          play("roast-complete", 0.5);
                          setConfirmed(true);
                        }}
                        className="inline-block rounded-lg border border-roast-red/40 bg-roast-red/10 px-6 py-3 font-mono font-bold text-roast-red text-sm tracking-wider uppercase transition-all hover:bg-roast-red/20 hover:border-roast-red/60 hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        [ I REGRET NOTHING ]
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isMax && confirmed && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="mt-8"
                    >
                      <p className="text-roast-red font-mono text-xs tracking-widest uppercase">
                        There is no going back now.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Slider */}
        <div className="space-y-4">
          {/* Labels */}
          <div className="flex items-center justify-between text-sm font-bold tracking-wider uppercase">
            <span className="text-green">KIND 🌱</span>
            <span className="text-roast-red">UNHINGED ☠️</span>
          </div>

          {/* Custom slider track */}
          <div className="relative h-3 rounded-full bg-surface-bright">
            {/* Filled portion */}
            <motion.div
              className={cn(
                "absolute left-0 top-0 h-full rounded-full transition-colors duration-500",
                current.track
              )}
              animate={{ width: `${(level / 4) * 100}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            {/* Notch markers */}
            <div className="absolute inset-0 flex items-center justify-between px-0">
              {levels.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setLevel(i);
                    setConfirmed(false);
                  }}
                  className={cn(
                    "relative z-10 h-5 w-5 rounded-full border-2 transition-all duration-300 cursor-pointer",
                    i <= level
                      ? cn(current.track, "border-transparent scale-100")
                      : "bg-surface-bright border-border scale-90 hover:scale-100 hover:border-muted"
                  )}
                  aria-label={`Roast level ${i + 1}: ${levels[i].name}`}
                />
              ))}
            </div>

            {/* Hidden range input for accessibility */}
            <input
              type="range"
              min={0}
              max={4}
              step={1}
              value={level}
              onChange={(e) => {
                setLevel(Number(e.target.value));
                setConfirmed(false);
              }}
              className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
              aria-label="Roast level slider"
            />
          </div>

          {/* Step labels */}
          <div className="flex items-center justify-between">
            {levels.map((l, i) => (
              <button
                key={l.id}
                onClick={() => {
                  setLevel(i);
                  setConfirmed(false);
                }}
                className={cn(
                  "text-xs font-mono transition-all duration-300 cursor-pointer",
                  i === level ? cn(current.color, "scale-110") : "text-muted/50 hover:text-muted"
                )}
              >
                {l.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default RoastLevels;
