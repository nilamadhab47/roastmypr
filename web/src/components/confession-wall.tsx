"use client";

import { motion } from "framer-motion";

const confessions = [
  {
    quote: "Changed one CSS property.",
    detail: "47 files changed.",
    attribution: "Anonymous",
    tint: "rgba(255,77,77,0.05)",
    rotate: -2.4,
    from: "left" as const,
  },
  {
    quote: "Forgot to remove console.log.",
    detail: "Production.",
    attribution: "Full Stack Developer",
    tint: "rgba(57,255,136,0.05)",
    rotate: 1.8,
    from: "bottom" as const,
  },
  {
    quote: "Renamed one variable.",
    detail: "Opened a 14-file PR.",
    attribution: "Anonymous",
    tint: "rgba(255,176,32,0.05)",
    rotate: -1.2,
    from: "right" as const,
  },
  {
    quote: "Tests passed.",
    detail: "Nobody knows why.",
    attribution: "DevOps",
    tint: "rgba(77,166,255,0.05)",
    rotate: 2.6,
    from: "left" as const,
  },
  {
    quote: '"quick fix"',
    detail: "+932 lines",
    attribution: "Backend Engineer",
    tint: "rgba(167,139,250,0.05)",
    rotate: -0.8,
    from: "bottom" as const,
  },
  {
    quote: '"temporary workaround"',
    detail: "Created: 2024. Still here: 2026.",
    attribution: "Anonymous",
    tint: "rgba(255,110,180,0.05)",
    rotate: 3.1,
    from: "right" as const,
  },
  {
    quote: '"works locally"',
    detail: "Production: 💀",
    attribution: "Senior Developer",
    tint: "rgba(255,225,77,0.05)",
    rotate: -2.8,
    from: "left" as const,
  },
  {
    quote: '"should be easy"',
    detail: "Famous last words.",
    attribution: "Tech Lead",
    tint: "rgba(57,255,136,0.05)",
    rotate: 1.4,
    from: "bottom" as const,
  },
];

function getInitial(from: "left" | "right" | "bottom") {
  switch (from) {
    case "left":
      return { opacity: 0, x: -60, y: 20 };
    case "right":
      return { opacity: 0, x: 60, y: 20 };
    case "bottom":
      return { opacity: 0, x: 0, y: 60 };
  }
}

export function ConfessionWall() {
  return (
    <section className="relative py-24 md:py-32 px-4 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-6xl font-black text-center mb-4"
        >
          PRS THAT SHOULD&apos;VE STAYED{" "}
          <span className="text-roast-red">LOCAL.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-muted text-center mb-16 text-lg"
        >
          Anonymous confessions from the trenches.
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {confessions.map((c, i) => (
            <motion.div
              key={i}
              initial={getInitial(c.from)}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: i * 0.07,
              }}
              whileHover={{ scale: 1.04, rotate: 0, y: -6 }}
              style={{
                rotate: `${c.rotate}deg`,
                backgroundColor: c.tint,
              }}
              className="relative border border-border rounded-xl p-5 md:p-6 cursor-default transition-shadow duration-200 hover:shadow-lg hover:shadow-black/30 bg-surface-elevated"
            >
              {/* Push pin */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-roast-red/70 shadow-sm shadow-roast-red/30" />

              <p className="font-bold text-text text-base md:text-lg leading-snug mb-2">
                &ldquo;{c.quote}&rdquo;
              </p>
              <p className="text-roast-orange font-semibold text-sm mb-3">
                {c.detail}
              </p>
              <p className="text-muted text-xs">
                — {c.attribution}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
