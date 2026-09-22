"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { API_URL, TOKEN_KEY } from "@/lib/links";

export type RoastPersonality = "dry" | "sarcastic" | "savage" | "unhinged";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  roastPersonality: RoastPersonality;
  defaultRoastLevel: number;
  gifsEnabled: boolean;
}

export interface AuthStats {
  roasts: number;
  again: number;
  meaner: number;
  gifInserted: number;
  roastInserted: number;
  feedback: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  stats: AuthStats | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  refresh: () => Promise<void>;
  updatePrefs: (prefs: Partial<AuthUser>) => Promise<void>;
  sendFeedback: (message: string, rating?: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function googleLoginUrl() {
  const redirect = `${window.location.origin}/auth/callback`;
  return `${API_URL}/api/auth/google/start?redirect_uri=${encodeURIComponent(redirect)}`;
}

async function api(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<AuthStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setStats(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api("/api/me");
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user || null);
      setStats(data.stats || null);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(() => {
    window.location.href = googleLoginUrl();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setStats(null);
  }, []);

  const updatePrefs = useCallback(
    async (prefs: Partial<AuthUser>) => {
      const data = await api("/api/me", {
        method: "PATCH",
        body: JSON.stringify(prefs),
      });
      setUser(data.user);
    },
    []
  );

  const sendFeedback = useCallback(async (message: string, rating?: number) => {
    await api("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ message, rating }),
    });
    setStats((prev) =>
      prev ? { ...prev, feedback: prev.feedback + 1 } : prev
    );
  }, []);

  const value = useMemo(
    () => ({ user, stats, loading, login, logout, refresh, updatePrefs, sendFeedback }),
    [user, stats, loading, login, logout, refresh, updatePrefs, sendFeedback]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
