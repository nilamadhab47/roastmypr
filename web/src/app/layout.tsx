import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://roastmypr.xyz"),
  title: "RoastMyPR — Your PR Doesn't Need a Review. It Needs Emotional Damage.",
  description:
    "Roast GitHub pull requests with savage one-liners — then Jev (TypeSafe) scores the joke against the actual diff before it hits the comment box. Stand-up comedy for git, with a real decision model.",
  keywords: [
    "GitHub PR roast",
    "Jev",
    "TypeSafe Jev",
    "Jev decision model",
    "pull request roast",
    "PR review humor",
    "developer humor",
    "code review jokes",
    "GitHub Chrome extension",
    "developer tools",
  ],
  openGraph: {
    title: "RoastMyPR — Your PR Doesn't Need a Review. It Needs Emotional Damage.",
    description:
      "Claude writes the roast. Jev scores it against the diff. Then it hits GitHub.",
    url: "https://roastmypr.xyz",
    siteName: "RoastMyPR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RoastMyPR — Stand-up comedy for git diff",
    description:
      "Claude writes the roast. Jev decides if it ships. Your PR needs emotional damage.",
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
