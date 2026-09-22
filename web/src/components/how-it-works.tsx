"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/cn";

const steps = [
  {
    number: "01",
    color: "text-green",
    title: "OPEN A PR",
    description: "Open literally any GitHub pull request.",
    visual: "browser" as const,
  },
  {
    number: "02",
    color: "text-roast-orange",
    title: "PRESS THE BUTTON",
    description: "The big scary one that says 🔥",
    visual: "button" as const,
  },
  {
    number: "03",
    color: "text-purple",
    title: "JEV SCORES THE JOKE",
    description:
      "Claude writes the roast. Jev checks it against the actual diff — yes/no, pick-one, rate-it — before anything hits GitHub.",
    visual: "jev" as const,
  },
  {
    number: "04",
    color: "text-roast-red",
    title: "RECEIVE EMOTIONAL DAMAGE",
    description:
      "Insert a scored roast, archetype, and reaction GIF. Career therapy still not included.",
    visual: "damage" as const,
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 md:py-36 overflow-hidden"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center text-4xl md:text-6xl font-black tracking-tight mb-20 md:mb-28"
        >
          IT&apos;S EMBARRASSINGLY SIMPLE.
        </motion.h2>

        {/* Steps */}
        <div className="relative">
          {/* Dotted vertical line */}
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px border-l-2 border-dashed border-border hidden md:block" />

          <div className="flex flex-col gap-24 md:gap-32">
            {steps.map((step, i) => (
              <StepCard
                key={step.number}
                step={step}
                index={i}
                isInView={isInView}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  index,
  isInView,
}: {
  step: (typeof steps)[number];
  index: number;
  isInView: boolean;
}) {
  const fromLeft = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: fromLeft ? -80 : 80 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.2 + index * 0.2, ease: "easeOut" }}
      className={cn(
        "relative flex flex-col md:flex-row items-center gap-8 md:gap-12",
        fromLeft ? "md:flex-row" : "md:flex-row-reverse"
      )}
    >
      {/* Number + text */}
      <div
        className={cn(
          "flex-1 flex flex-col",
          fromLeft ? "md:items-end md:text-right" : "md:items-start md:text-left",
          "items-center text-center"
        )}
      >
        <span
          className={cn(
            "font-mono text-7xl md:text-8xl font-black leading-none select-none",
            step.color
          )}
        >
          {step.number}
        </span>
        <h3 className="mt-4 text-xl md:text-2xl font-bold text-text">
          {step.title}
        </h3>
        <p className="mt-2 text-sm md:text-base text-muted max-w-xs">
          {step.description}
        </p>
      </div>

      {/* Center dot on the line */}
      <div className="hidden md:flex items-center justify-center relative z-10">
        <div
          className={cn(
            "h-5 w-5 rounded-full border-2 bg-bg",
            step.color === "text-green" && "border-green",
            step.color === "text-roast-orange" && "border-roast-orange",
            step.color === "text-purple" && "border-purple",
            step.color === "text-roast-red" && "border-roast-red"
          )}
        />
      </div>

      {/* Visual */}
      <div className="flex-1 flex items-center justify-center">
        {step.visual === "browser" && <BrowserVisual />}
        {step.visual === "button" && <RoastButtonVisual />}
        {step.visual === "jev" && <JevVisual />}
        {step.visual === "damage" && <DamageVisual />}
      </div>
    </motion.div>
  );
}

function BrowserVisual() {
  return (
    <div className="w-full max-w-xs rounded-xl border border-border bg-surface overflow-hidden shadow-xl shadow-black/30">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-surface-elevated">
        <div className="h-2.5 w-2.5 rounded-full bg-roast-red/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-roast-orange/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-green/60" />
        <div className="ml-2 flex-1 rounded-md bg-bg px-3 py-1">
          <span className="text-[10px] font-mono text-muted truncate block">
            github.com/you/repo/pull/847
          </span>
        </div>
      </div>
      {/* Body */}
      <div className="px-4 py-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green/80" />
          <span className="text-xs font-mono text-green/80">Open</span>
          <span className="text-xs font-semibold text-text">
            Pull Request #847
          </span>
        </div>
        <p className="text-[11px] font-mono text-muted">
          &quot;small cleanup, I promise&quot;
        </p>
        <div className="flex gap-2 text-[10px] font-mono">
          <span className="text-green">+1,842</span>
          <span className="text-roast-red">−17</span>
        </div>
      </div>
    </div>
  );
}

function RoastButtonVisual() {
  return (
    <div className="flex items-center justify-center">
      <motion.button
        animate={{
          scale: [1, 1.08, 1],
          boxShadow: [
            "0 0 20px rgba(255,77,77,0.3)",
            "0 0 40px rgba(255,77,77,0.6)",
            "0 0 20px rgba(255,77,77,0.3)",
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="rounded-2xl bg-roast-red px-10 py-5 text-2xl font-black text-white cursor-default select-none shadow-xl"
      >
        🔥 ROAST
      </motion.button>
    </div>
  );
}

function JevVisual() {
  const rows = [
    "about the code, not the person",
    "funny-constructive",
    "specific to THIS diff",
  ];
  return (
    <div className="w-full max-w-xs rounded-xl border border-purple/30 bg-surface p-5 shadow-xl shadow-purple/10 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-purple">
          Jev
        </span>
        <span className="text-xs font-mono text-green">PASSED · 187ms</span>
      </div>
      {rows.map((label) => (
        <div key={label} className="flex items-start gap-2 text-sm">
          <span className="text-green font-bold">✓</span>
          <span className="text-text">{label}</span>
        </div>
      ))}
    </div>
  );
}

function DamageVisual() {
  return (
    <div className="w-full max-w-xs rounded-xl border border-border bg-surface p-5 shadow-xl shadow-black/30 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">💀</span>
        <span className="text-sm font-bold text-roast-red">
          Roast Level: 5/5
        </span>
      </div>
      <p className="text-sm font-semibold text-text leading-snug">
        &ldquo;This PR has more red flags than a Soviet parade.&rdquo;
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm">🧨</span>
        <span className="text-xs font-bold text-meme-yellow">
          The Kitchen Sink™
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold tracking-[0.14em] uppercase text-purple">
          Jev · checked
        </span>
      </div>
      <div className="h-16 w-full rounded-lg bg-surface-bright flex items-center justify-center">
        <span className="text-2xl">😭</span>
      </div>
    </div>
  );
}
