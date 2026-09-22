"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── TYPES ─── */
type Stage =
  | "loading"    // terminal boot sequence
  | "ready"      // waiting for user click (enables sound)
  | "video"      // rickroll plays full-screen WITH SOUND
  | "punchline"  // YOU GOT RICKROLLED
  | "reveal"     // website fades in, video becomes bg
  | "done";      // intro finished, video still loops behind

/* ─── DATA ─── */
const LOADING_LINES = [
  "Initializing Roast Engine...",
  "Reading your PR history...",
  "Checking questionable architectural decisions...",
  "Consulting Stack Overflow...",
  "Blaming the previous developer...",
  "Checking git blame...",
  "Finding something to roast...",
  "Preparing emotional damage...",
];

const RICKROLL_ID = "dQw4w9WgXcQ";
const SESSION_KEY = "roastmypr-rickrolled";

/* ─── POST MESSAGE COMMANDS TO YOUTUBE IFRAME ─── */
function postToYT(iframe: HTMLIFrameElement | null, func: string, args?: unknown) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: "command", func, args: args ? [args] : [] }),
    "*"
  );
}

/* ─── COMPONENT ─── */
export function RickrollIntro({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [loadingLine, setLoadingLine] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [videoOpacity, setVideoOpacity] = useState(0);
  const [showPunchSub, setShowPunchSub] = useState(false);
  const [showPunchSub2, setShowPunchSub2] = useState(false);
  const [showPunchSub3, setShowPunchSub3] = useState(false);
  const [siteVisible, setSiteVisible] = useState(false);
  const [skipIntro, setSkipIntro] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setSkipIntro(true);
      setStage("done");
      setSiteVisible(true);
    }
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  const handleSkip = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    if (fadeRef.current) clearInterval(fadeRef.current);
    postToYT(iframeRef.current, "mute");
    sessionStorage.setItem(SESSION_KEY, "1");
    setStage("done");
    setSiteVisible(true);
    setVideoOpacity(0);
    setSkipIntro(true);
  }, []);

  /* ─── LOADING SEQUENCE ─── */
  useEffect(() => {
    if (stage !== "loading" || skipIntro) return;

    let lineIdx = 0;
    const lineInterval = setInterval(() => {
      lineIdx++;
      if (lineIdx >= LOADING_LINES.length) {
        clearInterval(lineInterval);
        return;
      }
      setLoadingLine(lineIdx);
    }, 350);
    timersRef.current.push(lineInterval as unknown as ReturnType<typeof setTimeout>);

    let prog = 0;
    const progInterval = setInterval(() => {
      prog += Math.random() * 12 + 3;
      if (prog >= 100) {
        prog = 100;
        clearInterval(progInterval);
      }
      setLoadingProgress(Math.min(prog, 100));
    }, 200);
    timersRef.current.push(progInterval as unknown as ReturnType<typeof setTimeout>);

    schedule(() => {
      setShowComplete(true);
      setLoadingProgress(100);
    }, 2800);

    schedule(() => {
      setStage("ready");
    }, 3400);

    return () => {
      clearInterval(lineInterval);
      clearInterval(progInterval);
    };
  }, [stage, skipIntro, schedule]);

  /* ─── USER CLICKS "ENTER" → show iframe WITH SOUND ─── */
  const handleEnter = useCallback(() => {
    setShowIframe(true);
    setStage("video");
  }, []);

  /* ─── VIDEO SEQUENCE ─── */
  useEffect(() => {
    if (stage !== "video") return;

    schedule(() => setVideoOpacity(0.95), 300);

    // At ~4s start fading volume over ~1.5s using postMessage
    schedule(() => {
      let vol = 100;
      const steps = 15;
      const stepSize = vol / steps;

      fadeRef.current = setInterval(() => {
        vol -= stepSize;
        if (vol <= 0) {
          if (fadeRef.current) clearInterval(fadeRef.current);
          postToYT(iframeRef.current, "mute");
          setVideoOpacity(0.4);
          setStage("punchline");
        } else {
          postToYT(iframeRef.current, "setVolume", Math.round(vol));
        }
      }, 100);
    }, 4000);
  }, [stage, schedule]);

  /* ─── PUNCHLINE SEQUENCE ─── */
  useEffect(() => {
    if (stage !== "punchline") return;

    schedule(() => setShowPunchSub(true), 1200);
    schedule(() => setShowPunchSub2(true), 2400);
    schedule(() => setShowPunchSub3(true), 3600);

    schedule(() => {
      setStage("reveal");
      setVideoOpacity(0.12);
    }, 5000);
  }, [stage, schedule]);

  /* ─── REVEAL SEQUENCE ─── */
  useEffect(() => {
    if (stage !== "reveal") return;

    schedule(() => setSiteVisible(true), 300);

    schedule(() => {
      sessionStorage.setItem(SESSION_KEY, "1");
      setStage("done");
    }, 1800);
  }, [stage, schedule]);

  // Embed with sound ON — autoplay after user gesture (the ENTER click)
  const embedSrc = `https://www.youtube-nocookie.com/embed/${RICKROLL_ID}?autoplay=1&mute=0&loop=1&playlist=${RICKROLL_ID}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&iv_load_policy=3&enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}&start=0`;

  // Muted embed for background after done
  const bgEmbedSrc = `https://www.youtube-nocookie.com/embed/${RICKROLL_ID}?autoplay=1&mute=1&loop=1&playlist=${RICKROLL_ID}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&iv_load_policy=3`;

  const showVideo = showIframe && !skipIntro;
  const showOverlay = stage !== "done";

  return (
    <div className="relative min-h-screen">
      {/* ──────── YOUTUBE VIDEO LAYER (with sound) ──────── */}
      {showVideo && (
        <div
          className="fixed inset-0 z-[90] pointer-events-none overflow-hidden transition-opacity duration-1000"
          style={{ opacity: videoOpacity }}
        >
          <iframe
            ref={iframeRef}
            src={embedSrc}
            title="Background"
            tabIndex={-1}
            aria-hidden
            className="absolute top-1/2 left-1/2 min-h-[110%] min-w-[180%] md:min-w-[120%] -translate-x-1/2 -translate-y-1/2 scale-[1.15] border-0"
            style={{ width: "180vw", height: "110vh" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
        </div>
      )}

      {/* After done, keep a faint muted video behind hero */}
      {stage === "done" && !skipIntro && (
        <div
          className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
          style={{ opacity: 0.08 }}
        >
          <iframe
            src={bgEmbedSrc}
            title=""
            tabIndex={-1}
            aria-hidden
            className="absolute top-1/2 left-1/2 min-h-[120%] min-w-[180%] md:min-w-[130%] -translate-x-1/2 -translate-y-1/2 scale-[1.2] border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070708]/90 via-[#070708]/80 to-[#070708]/95" />
        </div>
      )}

      {/* ──────── OVERLAY STAGES ──────── */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            key="overlay"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
          >
            {/* ── LOADING + READY ── */}
            <AnimatePresence>
              {(stage === "loading" || stage === "ready") && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-[#070708] px-6"
                >
                  {/* Logo */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-10"
                  >
                    <span className="text-4xl md:text-5xl font-black tracking-tight">
                      🔥 <span className="text-[#F5F7FA]">RoastMyPR</span>
                    </span>
                  </motion.div>

                  {/* Terminal box */}
                  <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0D0D10] p-5 font-mono text-sm shadow-2xl shadow-black/60">
                    <div className="space-y-1.5 mb-4 min-h-[120px]">
                      {LOADING_LINES.slice(0, loadingLine + 1).map((line, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{
                            opacity: i === loadingLine ? 1 : 0.4,
                            x: 0,
                          }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center gap-2"
                        >
                          <span className="text-[#39FF88]">$</span>
                          <span className="text-[#8B949E]">{line}</span>
                          {i === loadingLine && !showComplete && (
                            <motion.span
                              animate={{ opacity: [1, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity }}
                              className="inline-block w-2 h-4 bg-[#39FF88] ml-0.5"
                            />
                          )}
                        </motion.div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div className="h-3 w-full rounded-full bg-[#1a1a22] overflow-hidden mb-3">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#39FF88] to-[#22C55E]"
                        animate={{ width: `${loadingProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>

                    {/* Complete message */}
                    <AnimatePresence>
                      {showComplete && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-3 space-y-1"
                        >
                          <p className="text-[#F5F7FA] font-bold">
                            Analysis complete.
                          </p>
                          <p className="text-[#FF4D4D]">Unfortunately.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ── BIG "ENTER" BUTTON ── */}
                  <AnimatePresence>
                    {stage === "ready" && (
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.5,
                          type: "spring",
                          bounce: 0.3,
                        }}
                        onClick={handleEnter}
                        className="mt-10 group relative cursor-pointer"
                      >
                        {/* Pulsing glow ring */}
                        <motion.div
                          animate={{
                            boxShadow: [
                              "0 0 20px 4px rgba(255,77,77,0.2)",
                              "0 0 40px 8px rgba(255,77,77,0.4)",
                              "0 0 20px 4px rgba(255,77,77,0.2)",
                            ],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="absolute -inset-1 rounded-2xl"
                        />
                        <div className="relative flex items-center gap-3 rounded-2xl border-2 border-[#FF4D4D]/50 bg-gradient-to-b from-[#FF4D4D]/15 to-[#FF4D4D]/5 px-12 py-5 transition-all hover:border-[#FF4D4D]/80 hover:from-[#FF4D4D]/25 hover:to-[#FF4D4D]/10 hover:scale-105 active:scale-95">
                          <span className="text-3xl md:text-4xl font-black tracking-[0.15em] text-[#FF4D4D] uppercase select-none">
                            ENTER
                          </span>
                          <motion.span
                            animate={{ x: [0, 6, 0] }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="text-2xl md:text-3xl text-[#FF4D4D]"
                          >
                            →
                          </motion.span>
                        </div>
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {/* Skip */}
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="mt-5 text-xs text-white/20 hover:text-white/50 transition-colors cursor-pointer"
                  >
                    Skip intro →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── PUNCHLINE ── */}
            <AnimatePresence>
              {stage === "punchline" && (
                <motion.div
                  key="punchline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="fixed inset-0 z-[105] flex flex-col items-center justify-center px-6 text-center"
                >
                  <motion.h1
                    initial={{ opacity: 0, scale: 0.7, filter: "blur(20px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{
                      duration: 0.6,
                      type: "spring",
                      bounce: 0.25,
                    }}
                    className="text-[clamp(48px,10vw,160px)] font-black leading-[0.85] tracking-tighter text-white select-none"
                  >
                    <span className="block">YOU GOT</span>
                    <span className="block text-[#FF4D4D]">RICKROLLED.</span>
                  </motion.h1>

                  <AnimatePresence>
                    {showPunchSub && (
                      <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 0.7, y: 0 }}
                        className="mt-6 text-lg md:text-xl text-white/70 max-w-md font-medium"
                      >
                        You thought we were going to show you a SaaS landing
                        page.
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {showPunchSub2 && (
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 0.8, y: 0 }}
                        className="mt-3 text-base md:text-lg text-white/50 italic"
                      >
                        We also reviewed your PR.
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {showPunchSub3 && (
                      <motion.p
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-6 text-2xl md:text-3xl font-black text-[#39FF88]"
                      >
                        🔥 Welcome to RoastMyPR.
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={handleSkip}
                    className="mt-10 text-xs text-white/15 hover:text-white/40 transition-colors cursor-pointer"
                  >
                    Skip →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── REVEAL ── */}
            {stage === "reveal" && (
              <motion.div
                key="reveal-overlay"
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
                className="fixed inset-0 z-[102] bg-[#070708] pointer-events-none"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────── WEBSITE CONTENT ──────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={siteVisible ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="relative z-10"
      >
        {children}
      </motion.div>

      {/* ── Easter egg ── */}
      {stage === "done" && !skipIntro && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ delay: 3 }}
          className="fixed bottom-2 left-4 z-[5] text-[10px] font-mono text-white pointer-events-none select-none"
        >
          Yes. That was actually Rick Astley. You&apos;re welcome.
        </motion.p>
      )}
    </div>
  );
}
