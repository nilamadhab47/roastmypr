"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ROAST_CTA_URL } from "@/lib/links";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

const navLinks = [
  { label: "Roast Demo", href: "#hero" },
  { label: "Jev", href: "#jev" },
  { label: "Roast Levels", href: "#roast-levels" },
  { label: "PR Archetypes", href: "#archetypes" },
  { label: "GIFs", href: "#gifs" },
  { label: "How It Works", href: "#how-it-works" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-bg/80 backdrop-blur-xl border-b border-border shadow-lg shadow-black/20"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo */}
          <div
            className="relative"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <a
              href="/"
              className="text-xl font-black tracking-tight text-text hover:text-green transition-colors"
            >
              🔥 RoastMyPR
            </a>
            <AnimatePresence>
              {hovering && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 whitespace-nowrap rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-xs text-muted font-mono shadow-xl"
                >
                  Please don&apos;t submit another 900-line PR.
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Center: Nav links (desktop) */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-muted hover:text-text transition-colors rounded-lg hover:bg-surface/60"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right: GitHub + CTA (desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href={user ? "/account" : "/login"}
              className="text-sm text-muted hover:text-text transition-colors"
            >
              {user ? user.name.split(" ")[0] : "Sign in"}
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted hover:text-text transition-colors"
            >
              GitHub
            </a>
            <a
              href={ROAST_CTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 rounded-xl bg-roast-red px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-roast-red/20 transition-all hover:shadow-roast-red/40 hover:scale-105 active:scale-95"
            >
              <span className="transition-transform group-hover:rotate-12">
                🔥
              </span>
              Roast My PR
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-muted hover:text-text transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-bg/95 backdrop-blur-xl border-b border-border"
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-3 text-sm text-muted hover:text-text transition-colors rounded-lg hover:bg-surface/60"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 pt-3 border-t border-border flex flex-col gap-3">
                <Link
                  href={user ? "/account" : "/login"}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm text-muted hover:text-text transition-colors"
                >
                  {user ? "Account" : "Sign in"}
                </Link>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-sm text-muted hover:text-text transition-colors"
                >
                  GitHub
                </a>
                <a
                  href={ROAST_CTA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-roast-red px-5 py-3 text-sm font-bold text-white shadow-lg shadow-roast-red/20"
                >
                  🔥 Roast My PR
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
