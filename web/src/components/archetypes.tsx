"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/cn";

function Scene({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border border-border bg-surface-elevated p-8 md:p-12",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/* ── Scene 1: The 2AM Hotfix ────────────────────────────── */

function HotfixScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <Scene>
      <div ref={ref}>
        <h3 className="text-2xl md:text-3xl font-black mb-8">
          <span className="mr-2">🧨</span> The 2AM Hotfix
        </h3>

        <div className="flex flex-col md:flex-row md:items-start gap-8">
          {/* Clock */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex-shrink-0 rounded-xl border border-border bg-surface p-6 text-center"
          >
            <div className="text-xs text-muted uppercase tracking-widest mb-1">
              Current Time
            </div>
            <div className="text-4xl md:text-5xl font-mono font-black text-roast-red">
              2:47 AM
            </div>
          </motion.div>

          {/* Progress bars */}
          <div className="flex-1 space-y-5">
            {[
              { label: "coffee", pct: 100, color: "bg-green", text: "text-green" },
              { label: "sleep", pct: 12, color: "bg-roast-red", text: "text-roast-red" },
              { label: "production", pct: 95, color: "bg-roast-orange", text: "text-roast-orange", fire: true },
            ].map((bar, i) => (
              <motion.div
                key={bar.label}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.5 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-mono text-muted">{bar.label}</span>
                  {bar.fire && (
                    <span className="text-sm">🔥🔥🔥🔥</span>
                  )}
                </div>
                <div className="h-3 rounded-full bg-surface-bright overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", bar.color)}
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${bar.pct}%` } : { width: 0 }}
                    transition={{ delay: 0.6 + i * 0.15, duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-8 text-muted italic text-center text-lg"
        >
          &ldquo;Works on my machine.&rdquo;{" "}
          <span className="text-muted/60">— Famous last words</span>
        </motion.p>
      </div>
    </Scene>
  );
}

/* ── Scene 2: The Copy-Paste Special ────────────────────── */

const copyLines = [
  "CTRL+C",
  "CTRL+V",
  "CTRL+C",
  "CTRL+V",
  "CTRL+V",
  "CTRL+PRAY",
];

function CopyPasteScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <Scene>
      <div ref={ref}>
        <h3 className="text-2xl md:text-3xl font-black mb-8">
          <span className="mr-2">📦</span> The Copy-Paste Special
        </h3>

        <div className="rounded-xl border border-border bg-surface p-6 md:p-8 font-mono">
          {copyLines.map((line, i) => (
            <motion.div
              key={`${line}-${i}`}
              initial={{ opacity: 0, x: -10 + (i % 2 === 0 ? -5 : 5) }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3 + i * 0.25, duration: 0.4 }}
              className={cn(
                "text-xl md:text-2xl font-bold py-1",
                i === copyLines.length - 1
                  ? "text-roast-red mt-2"
                  : i % 2 === 0
                  ? "text-electric-blue"
                  : "text-meme-yellow"
              )}
              style={{ paddingLeft: `${(i % 3) * 12}px` }}
            >
              {line}
              {i === copyLines.length - 1 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: [0, 1, 0, 1] } : {}}
                  transition={{ delay: 2, duration: 1.5 }}
                  className="ml-1"
                >
                  🙏
                </motion.span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </Scene>
  );
}

/* ── Scene 3: The Kitchen Sink ──────────────────────────── */

const kitchenItems = [
  "CSS",
  "Auth",
  "Database",
  "Docker",
  "README",
  "Unrelated Kubernetes change",
];

function KitchenSinkScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <Scene>
      <div ref={ref}>
        <h3 className="text-2xl md:text-3xl font-black mb-8">
          <span className="mr-2">🛒</span> The Kitchen Sink
        </h3>

        <div className="rounded-xl border border-border bg-surface p-6 md:p-8">
          <div className="space-y-3">
            {kitchenItems.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -15 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.2, duration: 0.4 }}
                className={cn(
                  "flex items-center gap-3 text-lg font-mono",
                  i === kitchenItems.length - 1 ? "text-roast-orange" : "text-text"
                )}
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={inView ? { scale: 1 } : {}}
                  transition={{ delay: 0.5 + i * 0.2, type: "spring", stiffness: 400 }}
                  className="text-green flex-shrink-0"
                >
                  ✓
                </motion.span>
                <span>{item}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 1.8, type: "spring", stiffness: 200 }}
            className="mt-8 text-center"
          >
            <span className="text-4xl md:text-5xl font-black text-roast-red">
              Why???
            </span>
          </motion.div>
        </div>
      </div>
    </Scene>
  );
}

/* ── Scene 4: The Overengineer ──────────────────────────── */

const pipeline = [
  "API",
  "Kafka",
  "Redis",
  "GraphQL",
  "Microservice",
  "Event Bus",
  "Kubernetes",
];

function OverengineerScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <Scene>
      <div ref={ref}>
        <h3 className="text-2xl md:text-3xl font-black mb-8">
          <span className="mr-2">🏗️</span> The Overengineer
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Left — Requirement */}
          <div className="rounded-xl border border-border bg-surface p-6 md:p-8">
            <div className="text-xs text-muted uppercase tracking-widest mb-4">
              Requirement
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="font-mono text-green text-lg md:text-xl"
            >
              <span className="text-muted">function </span>
              <span className="text-electric-blue">check</span>
              <span className="text-muted">() {"{"}</span>
              <br />
              <span className="text-muted pl-4">{"  "}return </span>
              <span className="text-green">true</span>
              <span className="text-muted">;</span>
              <br />
              <span className="text-muted">{"}"}</span>
            </motion.div>
          </div>

          {/* Right — Implementation */}
          <div className="rounded-xl border border-border bg-surface p-6 md:p-8">
            <div className="text-xs text-muted uppercase tracking-widest mb-4">
              Implementation
            </div>
            <div className="space-y-0">
              {pipeline.map((step, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.5 + i * 0.15, duration: 0.4 }}
                  className="flex items-center gap-2"
                >
                  <span
                    className={cn(
                      "font-mono text-sm md:text-base font-bold",
                      [
                        "text-electric-blue",
                        "text-purple",
                        "text-roast-red",
                        "text-pink",
                        "text-roast-orange",
                        "text-meme-yellow",
                        "text-green",
                      ][i]
                    )}
                  >
                    {step}
                  </span>
                  {i < pipeline.length - 1 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={inView ? { opacity: 1 } : {}}
                      transition={{ delay: 0.7 + i * 0.15 }}
                      className="text-muted text-xs"
                    >
                      →
                    </motion.span>
                  )}
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 1.8, duration: 0.4 }}
                className="pt-3 mt-3 border-t border-border"
              >
                <span className="font-mono text-sm text-muted">↳ </span>
                <span className="font-mono text-sm text-green">return true;</span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </Scene>
  );
}

/* ── Main Component ─────────────────────────────────────── */

export function Archetypes() {
  return (
    <section id="archetypes" className="relative py-24 md:py-36 px-4">
      <div className="mx-auto max-w-4xl">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-4xl md:text-6xl font-black tracking-tight mb-16 md:mb-24"
        >
          EVERY PR HAS A{" "}
          <span className="text-roast-orange">PERSONALITY.</span>
        </motion.h2>

        <div className="space-y-12 md:space-y-16">
          <HotfixScene />
          <CopyPasteScene />
          <KitchenSinkScene />
          <OverengineerScene />
        </div>
      </div>
    </section>
  );
}

export default Archetypes;
