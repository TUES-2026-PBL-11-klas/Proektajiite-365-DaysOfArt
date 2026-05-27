"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getToken, setToken } from "./api";
import type { AuthResponse, User } from "./types";

type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  display_name?: string;
  birth_date?: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiFetch<User>("/api/profile");
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Boot-time auth check. We wrap the work in an async IIFE so all setState
  // calls happen in microtasks, satisfying React 19's "no sync setState in
  // effects" rule. The `cancelled` flag guards against state updates after
  // unmount during strict-mode double-invocation.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getToken();
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      try {
        const me = await apiFetch<User>("/api/profile");
        if (!cancelled) setUser(me);
      } catch {
        setToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      setToken(data.access_token);
      setUser(data.user);
      router.push("/profile");
    },
    [router]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const data = await apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: payload,
        auth: false,
      });
      setToken(data.access_token);
      setUser(data.user);
      router.push("/organizations");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // even if the request fails (e.g. expired token), clear locally
    }
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
