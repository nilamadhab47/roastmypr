"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/cn";
import { JEV_URL, ROAST_CTA_URL } from "@/lib/links";

const pipeline = [
  {
    n: "01",
    title: "READ THE DIFF",
    body: "The extension pulls the GitHub PR — title, body, files, the actual patch.",
    color: "text-green",
    border: "border-green/30",
  },
  {
    n: "02",
    title: "CLAUDE WRITES",
    body: "One punchline, a roast level, an archetype, GIF searches. Comedy, not a linter dump.",
    color: "text-roast-orange",
    border: "border-roast-orange/30",
  },
  {
    n: "03",
    title: "JEV SCORES IT",
    body: "Eight typed questions vs the diff. Yes/no, pick-one, rate-it. One call. ~200ms. Parallel.",
    color: "text-purple",
    border: "border-purple/40",
  },
  {
    n: "04",
    title: "YOU INSERT",
    body: "If Jev fails hard, Claude rewrites once. Then the roast hits the GitHub comment box.",
    color: "text-roast-red",
    border: "border-roast-red/30",
  },
];

const questions = [
  { type: "YES / NO", q: "Roast the code, not the person?", a: "noul 0.94" },
  { type: "YES / NO", q: "Grounded in THIS diff — no invented files?", a: "noul 0.91" },
  { type: "YES / NO", q: "Safe to post as a public GitHub comment?", a: "noul 0.89" },
  { type: "YES / NO", q: "Light review, not a linter essay?", a: "noul 0.93" },
  { type: "YES / NO", q: "Did it clock the obvious (size, leftover logs)?", a: "noul 0.88" },
  { type: "PICK ONE", q: "Tone: funny-constructive, bland, or mean?", a: "funny_constructive" },
  { type: "RATE IT", q: "How specific is the joke to this PR?", a: "score 2.4 / 3" },
  { type: "YES / NO", q: "Short punchline, archetype actually fits?", a: "pass" },
];

export function JevGate() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.12 });

  return (
    <section
      id="jev"
      ref={sectionRef}
      className="relative py-24 md:py-40 overflow-hidden border-y border-purple/15"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[28rem] w-[28rem] rounded-full bg-purple/12 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-roast-red/8 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center text-xs font-bold tracking-[0.22em] uppercase text-purple"
        >
          The Jev pipeline
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-4 text-center text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]"
        >
          CLAUDE WRITES THE ROAST.
          <br />
          <span className="text-purple">JEV DECIDES IF IT SHIPS.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.12 }}
          className="mx-auto mt-6 max-w-2xl text-center text-base md:text-xl text-muted"
        >
          Jev is TypeSafe&apos;s decision model. It does not generate jokes. It
          answers structured questions about the roast versus the actual git
          diff — then we let you drop it on GitHub. Scored, not guessed.
        </motion.p>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-4">
          {pipeline.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 28 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.45 }}
              className={cn(
                "relative rounded-2xl border bg-surface p-5 md:p-6 min-h-[200px]",
                step.border,
                step.n === "03" && "bg-purple/10 shadow-[0_0_40px_rgba(167,139,250,0.12)]"
              )}
            >
              <p className={cn("font-mono text-3xl font-black", step.color)}>
                {step.n}
              </p>
              <h3 className="mt-3 text-sm md:text-base font-black tracking-wide text-text">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{step.body}</p>
              {i < pipeline.length - 1 && (
                <span className="hidden md:block absolute top-1/2 -right-3 text-muted/40 text-xl">
                  →
                </span>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.55 }}
          className="mt-16 rounded-3xl border border-purple/25 bg-surface/80 p-6 md:p-10"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-purple">
                One API call · eight questions · parallel
              </p>
              <h3 className="mt-2 text-2xl md:text-3xl font-black">
                What Jev actually asks
              </h3>
            </div>
            <p className="font-mono text-sm text-green">PASSED · 187ms</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {questions.map((item) => (
              <div
                key={item.q}
                className="flex items-start justify-between gap-4 rounded-xl border border-border bg-bg/50 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-purple">
                    {item.type}
                  </p>
                  <p className="mt-1 text-sm font-medium text-text">{item.q}</p>
                </div>
                <span className="shrink-0 text-green font-mono text-xs pt-1">
                  ✓ {item.a}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm md:text-base text-muted max-w-3xl">
            Hard misses (personal attack, invented files, linter essay) retry
            Claude once. Soft misses still insert — we log them. If Jev is down,
            the roast still ships. Fail-open, on purpose.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7 }}
          className="mt-12 flex flex-col items-center gap-4"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={ROAST_CTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-roast-red px-8 py-4 text-sm font-bold text-white shadow-lg shadow-roast-red/20 hover:scale-105 active:scale-95 transition-all"
            >
              🔥 Roast a PR
            </a>
            <a
              href={JEV_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-purple/40 bg-surface px-8 py-4 text-sm font-bold text-purple hover:text-text hover:border-purple transition-colors"
            >
              What is Jev →
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
