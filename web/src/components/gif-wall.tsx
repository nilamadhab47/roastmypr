"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Image from "next/image";
import { useSounds } from "@/components/sound-provider";

const reactions = [
  {
    gifUrl: "https://media2.giphy.com/media/LyJ6KPlrFdKnK/200.gif",
    caption: "The reviewer",
    context: "opening your 847-line PR",
    gradient: "linear-gradient(135deg, #FF4D4D 0%, #FFB020 100%)",
    padExtra: "py-4",
  },
  {
    gifUrl: "https://media2.giphy.com/media/CNna9G8BQvnoI/200.gif",
    caption: "Your confidence",
    context: "after reading the roast",
    gradient: "linear-gradient(135deg, #4DA6FF 0%, #A78BFA 100%)",
    padExtra: "py-5",
  },
  {
    gifUrl: "https://media3.giphy.com/media/654unty0gaFji/200.gif",
    caption: "The team",
    context: "when tests actually pass",
    gradient: "linear-gradient(135deg, #39FF88 0%, #22B8A6 100%)",
    padExtra: "py-4",
  },
  {
    gifUrl: "https://media4.giphy.com/media/QMHoU66sBXqqLqYvGO/200.gif",
    caption: "Production",
    context: "Friday at 4:59 PM",
    gradient: "linear-gradient(135deg, #FFE14D 0%, #FFB020 100%)",
    padExtra: "py-6",
  },
  {
    gifUrl: "https://media3.giphy.com/media/3o751WWcpIWWd3GxUI/200.gif",
    caption: "Your tech lead",
    context: "reading the PR description",
    gradient: "linear-gradient(135deg, #FF6EB4 0%, #FF4D4D 100%)",
    padExtra: "py-4",
  },
  {
    gifUrl: "https://media3.giphy.com/media/26uff8ejyd7enPV7i/200.gif",
    caption: "You",
    context: "explaining why it's 47 files",
    gradient: "linear-gradient(135deg, #A78BFA 0%, #4DA6FF 100%)",
    padExtra: "py-4",
  },
  {
    gifUrl: "https://media2.giphy.com/media/3h9Jg4SOJfo5T1sVgJ/200.gif",
    caption: "The intern",
    context: "force pushing to main",
    gradient: "linear-gradient(135deg, #39FF88 0%, #FFE14D 100%)",
    padExtra: "py-5",
  },
  {
    gifUrl: "https://media3.giphy.com/media/yRl0DstAx4nN0RjDLV/200.gif",
    caption: "The senior dev",
    context: "who wrote the code you're 'refactoring'",
    gradient: "linear-gradient(135deg, #FFB020 0%, #FF4D4D 100%)",
    padExtra: "py-4",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 20 },
  },
};

export function GifWall() {
  const { play } = useSounds();
  const lastBoing = useRef(0);

  const handleGifHover = () => {
    const now = Date.now();
    if (now - lastBoing.current > 800) {
      play("gif-boing", 0.35);
      lastBoing.current = now;
    }
  };

  return (
    <section id="gifs" className="relative py-24 md:py-32 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-6xl font-black text-center mb-4"
        >
          EVERY ROAST DESERVES A{" "}
          <span className="text-meme-yellow">REACTION.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-muted text-center mb-16 text-lg"
        >
          Real footage of developers receiving feedback.
        </motion.p>

        <p className="text-muted text-center text-sm mb-6 md:hidden animate-pulse">
          ← swipe for more →
        </p>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5"
        >
          {reactions.map((r, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              whileHover={{ scale: 1.05, rotate: i % 2 === 0 ? 2 : -2 }}
              onMouseEnter={handleGifHover}
              className={`relative rounded-2xl overflow-hidden cursor-pointer group ${r.padExtra}`}
              style={{ background: r.gradient }}
            >
              <div className="absolute inset-0 bg-black/10 pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center text-center px-2">
                <div className="relative w-full aspect-square max-w-[160px] rounded-xl overflow-hidden mb-3 shadow-lg shadow-black/30 group-hover:scale-105 transition-transform duration-200">
                  <Image
                    src={r.gifUrl}
                    alt={r.caption}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <p className="font-bold text-white text-sm md:text-base leading-tight">
                  {r.caption}
                </p>
                <p className="text-white/60 text-xs md:text-sm mt-1 leading-tight">
                  {r.context}
                </p>
              </div>

              <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm text-[10px] font-bold text-white/70 px-1.5 py-0.5 rounded">
                GIF
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 max-w-lg mx-auto"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              readOnly
              placeholder="Search reactions..."
              className="w-full bg-surface border border-border rounded-xl pl-12 pr-4 py-3.5 text-text placeholder:text-muted/60 outline-none cursor-default focus:border-border-bright transition-colors"
            />
          </div>
          <p className="text-muted italic text-sm text-center mt-3">
            try: &ldquo;when your PR gets merged on the first try&rdquo;
          </p>
        </motion.div>
      </div>
    </section>
  );
}
