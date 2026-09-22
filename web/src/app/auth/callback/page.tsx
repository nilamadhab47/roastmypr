"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TOKEN_KEY } from "@/lib/links";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      router.replace("/account");
      return;
    }
    router.replace("/login?error=missing_token");
  }, [params, router]);

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center">
      <p className="font-mono text-sm text-muted">Saving your session…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg text-text flex items-center justify-center">
          <p className="font-mono text-sm text-muted">Saving your session…</p>
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
