"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";

const clips = [
  {
    youtubeId: "0oBx7Jg4m-o",
    caption: "You after approving a 3,000-line PR",
    subcaption: "without reading it",
    rotate: -2,
    offset: "md:mt-0",
  },
  {
    youtubeId: "N0v3BhJiNNQ",
    start: 15,
    caption: "Our AI reviewing your spaghetti code",
    subcaption: "it's RAW",
    rotate: 1.5,
    offset: "md:mt-8",
  },
  {
    youtubeId: "tQIdxbWhHSM",
    caption: "What senior devs see",
    subcaption: "when they open your PR",
    rotate: -1,
    offset: "md:-mt-4",
  },
  {
    youtubeId: "nn2FB1P_Mn8",
    caption: "Our deepest technical suggestion",
    subcaption: "have you tried turning it off and on again?",
    rotate: 2,
    offset: "md:mt-6",
  },
  {
    youtubeId: "iaEcZW0eyEg",
    start: 45,
    caption: "The code review meeting",
    subcaption: "going exactly as planned",
    rotate: -1.5,
    offset: "md:mt-2",
  },
  {
    youtubeId: "OcTIAG8GFqE",
    caption: "Your reviewer opening line 847",
    subcaption: "oh.",
    rotate: 1,
    offset: "md:mt-10",
  },
];

function ReactionWindow({
  clip,
  index,
}: {
  clip: (typeof clips)[number];
  index: number;
}) {
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
        } else {
          setActive(false);
          setMuted(true);
        }
      },
      { rootMargin: "80px", threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const embedSrc = active
    ? `https://www.youtube-nocookie.com/embed/${clip.youtubeId}?autoplay=1&mute=${muted ? 1 : 0}&start=${clip.start ?? 0}&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`
    : null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, rotate: clip.rotate }}
      whileInView={{ opacity: 1, y: 0, rotate: clip.rotate }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      className={cn("relative", clip.offset)}
    >
      <div
        className="rounded-xl border border-border bg-surface-elevated overflow-hidden shadow-2xl shadow-black/50 transition-transform hover:scale-[1.02] hover:rotate-0"
        style={{ transform: `rotate(${clip.rotate}deg)` }}
      >
        <div className="flex items-center gap-2 border-b border-border bg-surface-bright px-3 py-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-roast-red/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-meme-yellow/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-green/80" />
          </div>
          <span className="ml-2 font-mono text-[10px] text-muted truncate">
            reaction_clip_{index + 1}.mp4
          </span>
        </div>

        <div className="relative aspect-video bg-black">
          {embedSrc ? (
            <>
              <iframe
                key={`${clip.youtubeId}-${muted ? "muted" : "unmuted"}`}
                src={embedSrc}
                title={clip.caption}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm hover:bg-black/90 transition-colors"
                aria-label={muted ? "Unmute video" : "Mute video"}
              >
                {muted ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
                {muted ? "muted" : "sound on"}
              </button>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-bright">
              <div className="h-8 w-8 rounded-full border-2 border-muted/30 border-t-roast-orange animate-spin" />
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          <p className="font-bold text-sm text-text leading-tight">
            {clip.caption}
          </p>
          <p className="text-xs text-muted mt-0.5 italic">{clip.subcaption}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function YoutubeReactions() {
  return (
    <section
      id="reactions"
      className="relative py-24 md:py-32 px-4 overflow-hidden border-y border-border/50"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-roast-red/5 via-transparent to-electric-blue/5 pointer-events-none" />

      <div className="relative mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-6xl font-black mb-3"
        >
          WHEN THE PR
          <br />
          <span className="text-roast-orange ml-8 md:ml-16">GETS REVIEWED.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-muted text-lg mb-14 max-w-xl ml-4 md:ml-8"
        >
          Autoplays muted when you scroll here. Tap the corner button for sound.
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {clips.map((clip, i) => (
            <ReactionWindow key={clip.youtubeId + i} clip={clip} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
