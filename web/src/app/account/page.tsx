"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, type RoastPersonality } from "@/components/auth-provider";
import { cn } from "@/lib/cn";

const PERSONALITIES: { id: RoastPersonality; label: string; hint: string }[] = [
  { id: "dry", label: "😐 Dry", hint: "Office-holiday-party energy" },
  { id: "sarcastic", label: "😏 Sarcastic", hint: "You already know" },
  { id: "savage", label: "🔥 Savage", hint: "Default. Recommended" },
  { id: "unhinged", label: "☠️ Unhinged", hint: "Internet at 2am" },
];

export default function AccountPage() {
  const { user, stats, loading, login, logout, updatePrefs, sendFeedback } = useAuth();
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <p className="font-mono text-sm text-muted">Loading your damage report…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-black">You are not signed in.</h1>
          <p className="mt-2 text-muted">The roast engine does not know your face yet.</p>
          <button
            type="button"
            onClick={login}
            className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black"
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  async function savePrefs(patch: Parameters<typeof updatePrefs>[0]) {
    setSaving(true);
    try {
      await updatePrefs(patch);
      setStatus("Saved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function onFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (feedback.trim().length < 3) {
      setStatus("Write a little more than that.");
      return;
    }
    setSaving(true);
    try {
      await sendFeedback(feedback.trim());
      setFeedback("");
      setStatus("Feedback sent. We will read it. Eventually.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not send feedback");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-black tracking-tight">
            🔥 RoastMyPR
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="text-sm text-muted hover:text-text"
          >
            Sign out
          </button>
        </div>

        <div className="mt-10 flex items-center gap-4">
          {user.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture}
              alt=""
              className="h-16 w-16 rounded-full border border-border"
            />
          ) : null}
          <div>
            <h1 className="text-3xl font-black tracking-tight">{user.name}</h1>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Roasts" value={stats?.roasts ?? 0} />
          <Stat label="Another roast" value={stats?.again ?? 0} />
          <Stat label="Made meaner" value={stats?.meaner ?? 0} />
          <Stat label="Feedback" value={stats?.feedback ?? 0} />
        </div>
        <p className="mt-3 text-xs text-muted">
          Every roast is scored by{" "}
          <Link href="/#jev" className="text-purple hover:text-text">
            Jev
          </Link>{" "}
          against the actual diff before you insert it on GitHub.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-bold">Roast personality</h2>
          <p className="text-sm text-muted mb-4">Synced to the Chrome extension.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PERSONALITIES.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={saving}
                onClick={() => savePrefs({ roastPersonality: item.id })}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-colors",
                  user.roastPersonality === item.id
                    ? "border-roast-red bg-roast-red/10"
                    : "border-border bg-surface hover:border-border-bright"
                )}
              >
                <div className="font-bold">{item.label}</div>
                <div className="text-xs text-muted">{item.hint}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold">Default roast level</h2>
          <div className="mt-4 flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={5}
              value={user.defaultRoastLevel}
              onChange={(e) =>
                savePrefs({ defaultRoastLevel: Number(e.target.value) })
              }
              className="flex-1 accent-[#FF4D4D]"
            />
            <span className="font-black tabular-nums w-12">
              {user.defaultRoastLevel}/5
            </span>
          </div>
        </section>

        <section className="mt-10">
          <label className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            <span>
              <strong>GIF reactions</strong>
              <span className="block text-xs text-muted">Every roast deserves a reaction.</span>
            </span>
            <input
              type="checkbox"
              checked={user.gifsEnabled}
              onChange={(e) => savePrefs({ gifsEnabled: e.target.checked })}
            />
          </label>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold">Feedback</h2>
          <p className="text-sm text-muted mb-3">
            Tell us what is funny, what is broken, or which GIF ruined a PR comment.
          </p>
          <form onSubmit={onFeedback} className="space-y-3">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm"
              placeholder="The chaos score called my README a cry for help."
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-roast-red px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              Send feedback
            </button>
          </form>
        </section>

        {status ? <p className="mt-4 text-sm text-muted">{status}</p> : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
