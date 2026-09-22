"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const scenes = [
  {
    thought: "I have a meeting in 4 minutes.",
    punchline: 'opens your 1,947-line PR',
    color: "text-roast-red",
  },
  {
    thought: "Seems simple.",
    punchline: "47 files changed",
    color: "text-roast-orange",
  },
  {
    thought: "Let me just quickly review this.",
    punchline: "3 hours later...",
    color: "text-meme-yellow",
  },
  {
    thought: '"LGTM"',
    punchline: "(They did not look at it.)",
    color: "text-electric-blue",
  },
];

function Scene({
  thought,
  punchline,
  color,
}: {
  thought: string;
  punchline: string;
  color: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className="flex flex-col items-center gap-4 py-8 md:py-12">
      {/* Thought bubble */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={
          isInView
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.85, y: 20 }
        }
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="relative bg-surface-elevated border border-border rounded-2xl px-6 py-4 md:px-8 md:py-5 max-w-md"
      >
        <p className="text-text text-lg md:text-xl font-medium text-center">
          &ldquo;{thought}&rdquo;
        </p>
        {/* Triangle pointer */}
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-surface-elevated" />
      </motion.div>

      {/* Animated arrow */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={
          isInView
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: -10 }
        }
        transition={{ delay: 0.5, duration: 0.4 }}
        className="flex flex-col items-center gap-0.5 text-muted"
      >
        <motion.span
          animate={isInView ? { y: [0, 6, 0] } : {}}
          transition={{ delay: 0.7, duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="text-2xl"
        >
          ↓
        </motion.span>
      </motion.div>

      {/* Punchline */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={
          isInView
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 10 }
        }
        transition={{ delay: 0.9, type: "spring", stiffness: 200, damping: 18 }}
        className={`text-xl md:text-2xl font-black text-center ${color}`}
      >
        {punchline}
      </motion.p>
    </div>
  );
}

export function ReviewerThoughts() {
  return (
    <section className="relative py-24 md:py-32 px-4 overflow-hidden">
      <div className="max-w-2xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-5xl font-black text-center mb-4"
        >
          THINGS YOUR REVIEWER IS{" "}
          <span className="text-electric-blue">THINKING.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-muted text-center mb-12 md:mb-16 text-lg"
        >
          A real-time look inside the approval process.
        </motion.p>

        <div className="flex flex-col divide-y divide-border">
          {scenes.map((scene, i) => (
            <Scene
              key={i}
              thought={scene.thought}
              punchline={scene.punchline}
              color={scene.color}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
