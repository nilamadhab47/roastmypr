"use client";

import { JEV_URL } from "@/lib/links";

const links = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Jev", href: "/#jev" },
  { label: "Account", href: "/account" },
  { label: "GitHub", href: "https://github.com", external: true },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Main row */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          {/* Left: Brand */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="text-sm font-bold text-text" data-logo>
              🔥 RoastMyPR
            </span>
            <span className="text-sm text-muted">
              Claude writes it. Jev scores it. GitHub suffers.
            </span>
          </div>

          {/* Center: Links */}
          <nav className="flex items-center gap-6">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="text-sm text-muted hover:text-text transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right: Quip */}
          <p className="text-sm text-muted text-center md:text-right max-w-[280px]">
            Decisions by{" "}
            <a
              href={JEV_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text hover:text-purple transition-colors"
            >
              Jev
            </a>
            . Comedy by us.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("roastmypr-rickrolled");
              window.location.reload();
            }}
            className="text-xs text-muted/40 hover:text-roast-red/70 transition-colors cursor-pointer"
          >
            🔥 Rickroll me again
          </button>
          <p className="text-xs text-muted text-center">
            © 2026 RoastMyPR · No PRs were permanently harmed.
          </p>
        </div>
      </div>
    </footer>
  );
}
