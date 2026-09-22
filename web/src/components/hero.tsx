"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSounds } from "@/components/sound-provider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import Image from "next/image";
import { ROAST_CTA_URL } from "@/lib/links";

type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const loadingLines = [
  { text: "Reading diff...", color: "text-muted" },
  { text: "Checking architectural decisions...", color: "text-muted" },
  { text: "Checking if this was written after midnight...", color: "text-muted" },
  { text: "Asking Jev if this joke is even about the diff...", color: "text-purple" },
  { text: "Oh no.", color: "text-roast-red" },
];

const diffLines = [
  { type: "context", text: "  const config = loadConfig();" },
  { type: "add", text: "+ const data = await fetch(url)" },
  { type: "context", text: "  // TODO: handle errors lol" },
  { type: "remove", text: "- validateInput(data);" },
  { type: "add", text: "+ // it works on my machine" },
];


export function Hero() {
  const { play } = useSounds();
  const [phase, setPhase] = useState<Phase>(0);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [loopKey, setLoopKey] = useState(0);
  const prevPhase = useRef<Phase>(0);

  const resetAndLoop = useCallback(() => {
    setPhase(0);
    setLoadingIndex(0);
    setLoopKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];

    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timers.push(t);
    };

    // Phase 1: PR card fades in
    schedule(() => setPhase(1), 300);
    // Phase 2: Cursor moves to button
    schedule(() => setPhase(2), 2000);
    // Phase 3: Loading lines appear one by one
    schedule(() => {
      setPhase(3);
      setLoadingIndex(0);
    }, 3000);
    schedule(() => setLoadingIndex(1), 3400);
    schedule(() => setLoadingIndex(2), 3800);
    schedule(() => setLoadingIndex(3), 4400);
    schedule(() => setLoadingIndex(4), 5000);
    // Phase 4: Roast result explodes
    schedule(() => setPhase(4), 5800);
    // Phase 5: Fake notification
    schedule(() => setPhase(5), 7000);
    // Phase 6: Hold then loop
    schedule(() => setPhase(6), 8500);
    schedule(() => resetAndLoop(), 10500);

    return () => timers.forEach(clearTimeout);
  }, [loopKey, resetAndLoop]);

  useEffect(() => {
    if (phase === 2 && prevPhase.current !== 2) {
      play("roast-click", 0.4);
    }
    if (phase === 4 && prevPhase.current !== 4) {
      play("roast-complete", 0.55);
    }
    prevPhase.current = phase;
  }, [phase, play]);

  return (
    <section id="hero" className="relative min-h-screen overflow-hidden pt-24 pb-20">
      {/* Accent glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-roast-red/8 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple/8 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Giant typography */}
        <div className="mb-12 md:mb-16 select-none">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <a
              href="#jev"
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple/40 bg-purple/10 px-4 py-1.5 text-xs font-bold tracking-[0.16em] uppercase text-purple hover:bg-purple/20 transition-colors"
            >
              Scored by Jev
              <span className="font-normal tracking-normal text-muted lowercase">
                TypeSafe decision model
              </span>
            </a>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter">
              <span className="block">YOUR PR</span>
              <span className="block">DOESN&apos;T NEED</span>
              <span className="block">A REVIEW.</span>
            </h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="mt-4 md:mt-6"
          >
            <p className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter">
              <span className="block ml-8 sm:ml-12 md:ml-20 text-muted">IT NEEDS</span>
              <span className="block ml-4 sm:ml-6 md:ml-12 text-muted">EMOTIONAL</span>
              <span className="block ml-10 sm:ml-16 md:ml-20 text-roast-red">DAMAGE.</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs font-bold tracking-[0.12em] uppercase"
          >
            {[
              ["01", "Diff"],
              ["02", "Claude"],
              ["03", "Jev"],
              ["04", "GitHub"],
            ].map(([n, label], i) => (
              <span key={label} className="inline-flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1",
                    label === "Jev"
                      ? "border-purple/50 bg-purple/15 text-purple"
                      : "border-border bg-surface text-muted"
                  )}
                >
                  {n} {label}
                </span>
                {i < 3 && <span className="text-muted/40">→</span>}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Demo area */}
        <div className="relative mx-auto max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={`demo-${loopKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 6 ? 0 : 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Phase 1-2: Fake PR Card */}
              {phase >= 1 && phase <= 2 && (
                <FakePRCard phase={phase} />
              )}

              {/* Phase 3: Loading */}
              {phase === 3 && (
                <LoadingState loadingIndex={loadingIndex} />
              )}

              {/* Phase 4: Roast Result */}
              {(phase === 4 || phase === 5) && (
                <RoastResult />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Phase 5: Notification overlay */}
          <AnimatePresence>
            {phase === 5 && <FakeNotification />}
          </AnimatePresence>

          {/* Phase 0: Empty space holder */}
          {phase === 0 && <div className="h-80" />}
        </div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-12 md:mt-16 flex flex-col items-center gap-4"
        >
          <a
            href={ROAST_CTA_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => play("roast-click", 0.4)}
            className="group inline-flex items-center gap-2 rounded-xl bg-roast-red px-8 py-4 text-lg font-bold text-white shadow-xl shadow-roast-red/25 transition-all hover:shadow-roast-red/40 hover:scale-105 active:scale-95"
          >
            <span className="transition-transform group-hover:rotate-12 group-hover:scale-125">
              🔥
            </span>
            Roast My PR
          </a>
          <p className="text-sm text-muted">
            Diff in. Claude writes. Jev scores. Insert on GitHub.
          </p>
          <a href="#jev" className="text-xs font-bold tracking-[0.14em] uppercase text-purple hover:text-text transition-colors">
            See the Jev pipeline ↓
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function FakePRCard({ phase }: { phase: Phase }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative rounded-2xl border border-border bg-surface p-0 overflow-hidden shadow-2xl shadow-black/40"
    >
      {/* PR Header */}
      <div className="border-b border-border px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-green/80" />
            <span className="text-xs font-mono text-green/80">Open</span>
          </div>
          <span className="text-sm font-semibold text-text">
            Pull Request #847
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-green">+1,842</span>
          <span className="text-roast-red">−17</span>
        </div>
      </div>

      {/* PR Title */}
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-base font-semibold text-text">small cleanup</h3>
        <p className="mt-1 text-xs text-muted font-mono">
          dev-intern → main &middot; 47 files changed
        </p>
      </div>

      {/* Fake diff */}
      <div className="px-4 py-3 font-mono text-xs leading-relaxed space-y-0.5 bg-bg/40">
        {diffLines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "px-2 py-0.5 rounded-sm",
              line.type === "add" && "bg-green/8 text-green",
              line.type === "remove" && "bg-roast-red/8 text-roast-red",
              line.type === "context" && "text-muted"
            )}
          >
            {line.text}
          </div>
        ))}
      </div>

      {/* Roast button on card */}
      <div className="px-5 py-4 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted">3 commits &middot; 2 minutes ago</span>
        <motion.button
          animate={
            phase === 2
              ? { scale: [1, 0.92, 1.08, 1], transition: { duration: 0.3, delay: 0.5 } }
              : {}
          }
          className="rounded-lg bg-roast-red px-4 py-2 text-xs font-bold text-white shadow-md shadow-roast-red/20"
        >
          🔥 ROAST THIS PR
        </motion.button>
      </div>

      {/* Phase 2: Animated cursor */}
      {phase === 2 && <AnimatedCursor />}
    </motion.div>
  );
}

function AnimatedCursor() {
  return (
    <motion.div
      initial={{ left: "20%", top: "30%", opacity: 0 }}
      animate={{
        left: ["20%", "75%"],
        top: ["30%", "85%"],
        opacity: [0, 1, 1],
      }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="absolute pointer-events-none z-10"
    >
      <svg
        width="20"
        height="24"
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
  );
}

function LoadingState({ loadingIndex }: { loadingIndex: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl border border-border bg-surface p-8 shadow-2xl shadow-black/40"
    >
      <div className="flex flex-col items-center gap-5">
        {/* Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-muted/30 border-t-roast-red"
        />

        {/* Loading lines */}
        <div className="flex flex-col items-center gap-2 font-mono text-sm">
          {loadingLines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={i <= loadingIndex ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.25 }}
              className={cn(
                line.color,
                i <= loadingIndex ? "visible" : "invisible",
    i === 4 && "font-bold text-base mt-1"
              )}
            >
              {line.text}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function RoastResult() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
      className="rounded-2xl border border-border bg-surface p-6 md:p-10 shadow-2xl shadow-roast-red/10"
    >
      {/* Roast text */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight text-text text-center"
      >
        <span className="text-roast-red">&ldquo;</span>
        THIS PR HAS MORE LINES THAN THE FEATURE IT WAS SUPPOSED TO FIX.
        <span className="text-roast-red">&rdquo;</span>
      </motion.p>

      {/* Jev chip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-5 flex justify-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-purple/30 bg-purple/10 px-4 py-1.5 text-xs font-bold text-purple">
          Jev · checked
          <span className="font-normal text-muted">light review vs this diff</span>
        </div>
      </motion.div>

      {/* Roast meter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6 md:mt-8 flex flex-col items-center gap-3"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted uppercase tracking-widest">
            Roast Level
          </span>
          <span className="text-sm font-bold text-roast-red">5/5</span>
        </div>
        <div className="w-full max-w-xs h-3 rounded-full bg-surface-bright overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-roast-orange to-roast-red"
          />
        </div>
      </motion.div>

      {/* Reaction GIF */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring", bounce: 0.3 }}
        className="mt-6 flex justify-center"
      >
        <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-xl overflow-hidden shadow-xl shadow-black/40 border border-border">
          <Image
            src="https://media4.giphy.com/media/QMHoU66sBXqqLqYvGO/200.gif"
            alt="This is fine reaction"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </motion.div>

      {/* Archetype badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, type: "spring", bounce: 0.4 }}
        className="mt-5 md:mt-6 flex justify-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-surface-bright border border-border px-5 py-2.5 text-sm font-bold">
          <span className="text-lg">🧨</span>
          <span className="text-meme-yellow">The Kitchen Sink™</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FakeNotification() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 80, y: -20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 80 }}
      transition={{ duration: 0.4, type: "spring", bounce: 0.25 }}
      className="absolute -top-4 -right-4 sm:right-0 z-20 w-72 rounded-xl border border-border bg-surface-elevated p-4 shadow-2xl shadow-black/60"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">🔔</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text truncate">
            @reviewer has requested changes
          </p>
          <p className="mt-1 text-xs text-roast-red font-mono">
            reason: emotional damage
          </p>
        </div>
      </div>
    </motion.div>
  );
}
