"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/cn";

const boringItems = [
  "❌ Potential null reference.",
  "❌ Cyclomatic complexity too high.",
  "❌ Missing test coverage.",
  "❌ Consider refactoring.",
];

const roastItems = [
  '🔥 "Bro trusted production to catch this."',
  '🔥 "This function has more responsibilities than your entire engineering team."',
  '🔥 "You called this a refactor?"',
];

export function VSBattle() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative py-24 md:py-36 px-4 overflow-hidden">
      <div ref={ref} className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 md:gap-6 items-start">
          {/* LEFT — Normal Code Review */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-2xl border border-border bg-surface p-6 md:p-8"
          >
            <h3 className="text-lg md:text-xl font-bold text-muted uppercase tracking-wider mb-6 text-center">
              Normal Code Review
            </h3>

            <div className="space-y-4">
              {boringItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.4 + i * 0.3, duration: 0.4 }}
                  className="rounded-lg border border-border/50 bg-surface-elevated px-4 py-3 text-muted text-sm md:text-base font-mono"
                >
                  {item}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CENTER — VS */}
          <div className="flex items-center justify-center md:mt-32">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{
                delay: 0.8,
                type: "spring",
                stiffness: 300,
                damping: 15,
              }}
              className="relative"
            >
              <span className="text-5xl md:text-7xl font-black text-roast-orange select-none">
                VS
              </span>
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 blur-2xl bg-roast-orange/20 rounded-full -z-10"
              />
            </motion.div>
          </div>

          {/* RIGHT — RoastMyPR */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className={cn(
              "rounded-2xl border border-roast-orange/20 bg-surface-elevated p-6 md:p-8",
              "shadow-[0_0_40px_rgba(255,176,32,0.08)]"
            )}
          >
            <h3 className="text-lg md:text-xl font-black text-roast-orange uppercase tracking-wider mb-6 text-center">
              RoastMyPR
            </h3>

            <div className="space-y-4">
              {roastItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.85, y: 10 }}
                  animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
                  transition={{
                    delay: 1.2 + i * 0.35,
                    type: "spring",
                    stiffness: 250,
                    damping: 18,
                  }}
                  className="rounded-lg border border-roast-orange/10 bg-surface-bright px-4 py-3 text-text text-sm md:text-base font-medium"
                >
                  {item}
                </motion.div>
              ))}
              <motion.p
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 2.2 }}
                className="pt-1 text-center text-[11px] font-bold tracking-[0.14em] uppercase text-purple"
              >
                Jev · checked against the diff
              </motion.p>
            </div>
          </motion.div>
        </div>

        {/* Bottom tagline */}
        <div className="mt-12 md:mt-16 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 2.4, duration: 0.6 }}
            className="text-xl md:text-2xl text-muted font-medium"
          >
            One gives feedback.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 3, duration: 0.6 }}
            className="text-xl md:text-2xl font-bold text-text mt-2"
          >
            The other gives{" "}
            <span className="text-roast-orange">character development.</span>
          </motion.p>
        </div>
      </div>
    </section>
  );
}

export default VSBattle;
