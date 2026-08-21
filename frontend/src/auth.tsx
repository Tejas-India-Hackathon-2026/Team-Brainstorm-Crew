import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { api, setApiToken } from "@/src/api";
import { storage } from "@/src/utils/storage";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = "ss_session_token";

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: "customer" | "worker";
  phone?: string;
  language?: string;
  worker_profile?: {
    skills: string[];
    categories: string[];
    experience_years: number;
    rating: number;
    total_reviews: number;
    completed_jobs: number;
    verification: string;
    online: boolean;
    city?: string;
    bio?: string;
    service_radius_km?: number;
  };
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  loginWithGoogle: (role: "customer" | "worker") => Promise<void>;
  demoLogin: (role: "customer" | "worker") => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

function extractSessionId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const processedIds = useRef<Set<string>>(new Set());

  const finishLogin = useCallback(async (token: string, u: User) => {
    setApiToken(token);
    await storage.secureSet(TOKEN_KEY, token);
    setUser(u);
  }, []);

  const exchangeSession = useCallback(
    async (sessionId: string) => {
      if (processedIds.current.has(sessionId)) return;
      processedIds.current.add(sessionId);
      try {
        const pendingRole = await storage.getItem("ss_pending_role", "customer");
        const res = await api<{ session_token: string; user: User }>("/auth/session", {
          method: "POST",
          body: { session_id: sessionId, role: pendingRole },
        });
        await finishLogin(res.session_token, res.user);
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const clean = window.location.href.replace(/[?#&]session_id=[^&#]+/, "");
          window.history.replaceState(window.history.state, "", clean);
        }
      } catch (e) {
        console.warn("Session exchange failed", e);
      }
    },
    [finishLogin],
  );

  useEffect(() => {
    let sub: any = null;
    (async () => {
      try {
        // 1) Handle OAuth callback with session_id parameter
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const sid = extractSessionId(window.location.href);
          if (sid) {
            await exchangeSession(sid);
            setLoading(false);
            return;
          }
        } else {
          sub = Linking.addEventListener("url", (ev) => {
            const sid = extractSessionId(ev.url);
            if (sid) exchangeSession(sid);
          });
          const initial = await Linking.getInitialURL();
          const sid = extractSessionId(initial);
          if (sid) {
            await exchangeSession(sid);
            setLoading(false);
            return;
          }
        }

        // 2) Restore existing authenticated session from secure storage
        const stored = await storage.secureGet(TOKEN_KEY, null as any);
        if (stored) {
          setApiToken(stored as string);
          try {
            const me = await api<User>("/auth/me");
            setUser(me);
          } catch {
            setApiToken(null);
            await storage.secureRemove(TOKEN_KEY);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      if (sub) sub.remove();
    };
  }, [exchangeSession]);

  const demoLogin = useCallback(
    async (role: "customer" | "worker") => {
      const res = await api<{ session_token: string; user: User }>("/auth/demo-login", {
        method: "POST",
        body: { role },
      });
      await finishLogin(res.session_token, res.user);
    },
    [finishLogin],
  );

  const loginWithGoogle = useCallback(
    async (role: "customer" | "worker") => {
      await storage.setItem("ss_pending_role", role);
      const authBase = process.env.EXPO_PUBLIC_AUTH_URL || "";
      if (!authBase) {
        // Fast development fallback: instant demo login
        await demoLogin(role);
        return;
      }
      const redirectUrl =
        Platform.OS === "web" && typeof window !== "undefined"
          ? window.location.origin + "/"
          : Linking.createURL("");
      const authUrl = `${authBase}?redirect=${encodeURIComponent(redirectUrl)}`;
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.href = authUrl;
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      let sid = extractSessionId((result as any)?.url);
      if (!sid) {
        const initial = await Linking.getInitialURL();
        sid = extractSessionId(initial);
      }
      if (sid) await exchangeSession(sid);
    },
    [exchangeSession, demoLogin],
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    setApiToken(null);
    await storage.secureRemove(TOKEN_KEY);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api<User>("/auth/me");
      setUser(me);
    } catch {}
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, loginWithGoogle, demoLogin, logout, refreshUser, setUser }}>
      {children}
    </Ctx.Provider>
  );
}
