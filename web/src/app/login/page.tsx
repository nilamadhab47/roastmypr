"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/account");
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl shadow-black/40">
        <Link href="/" className="text-xl font-black tracking-tight">
          🔥 RoastMyPR
        </Link>
        <h1 className="mt-6 text-3xl font-black tracking-tight">
          Sign in so we can remember how you like to be mean.
        </h1>
        <p className="mt-3 text-sm text-muted">
          Google login stores your name, email, roast personality, and anonymous
          usage stats. We do not post on your behalf. Every roast is still
          scored by Jev against the diff.
        </p>
        <button
          type="button"
          onClick={login}
          className="mt-8 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-black hover:bg-white/90"
        >
          Continue with Google
        </button>
        <p className="mt-4 text-center text-xs text-muted">
          Same account works in the Chrome extension.
        </p>
      </div>
    </div>
  );
}
