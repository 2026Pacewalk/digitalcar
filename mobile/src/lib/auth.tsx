import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useQueryClient } from "@tanstack/react-query";
import { deleteItem, getItem, setItem } from "./secureStorage";
import {
  clearSession, currentSession, loadSession, onSessionEnded, rpc, saveSession, tokenExpiry,
} from "./session";
import { forgetPushRegistration } from "./push";

const USER_KEY = "dc_auth_user";

export type SessionUser = {
  id: number;
  email: string;
  fullName: string;
  role: "super_admin" | "reseller" | "customer";
  avatar?: string | null;
};

type AuthState =
  | { status: "loading"; user: null }
  | { status: "signedOut"; user: null; notice?: string }
  | { status: "signedIn"; user: SessionUser };

type AuthContextValue = AuthState & {
  /** Finishes sign-in: turns the login token into a long-lived device session. */
  completeSignIn: (loginToken: string, user: SessionUser) => Promise<void>;
  signOut: (notice?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type StartedSession = { sessionId: number; accessToken: string; accessExpiresAt: number; refreshToken: string };

const deviceInfo = () => ({
  platform: (Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web" ? Platform.OS : "unknown") as "ios" | "android" | "web" | "unknown",
  deviceName: (Device.deviceName || [Device.manufacturer, Device.modelName].filter(Boolean).join(" ") || Platform.OS).slice(0, 120),
  appVersion: Constants.expoConfig?.version ?? undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  const signOut = useCallback(async (notice?: string) => {
    const s = currentSession();
    // Best-effort: stop pushes to this phone and end the session on the server.
    await forgetPushRegistration(s?.accessToken ?? null).catch(() => {});
    if (s?.refreshToken) await rpc("mobile.signOut", { refreshToken: s.refreshToken }).catch(() => {});
    await Promise.all([clearSession(), deleteItem(USER_KEY)]);
    queryClient.clear();
    setState({ status: "signedOut", user: null, notice });
  }, [queryClient]);

  // Restore the saved session on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [session, rawUser] = await Promise.all([loadSession(), getItem(USER_KEY)]);
      if (cancelled) return;
      let user: SessionUser | null = null;
      try { user = rawUser ? (JSON.parse(rawUser) as SessionUser) : null; } catch { user = null; }
      if (!session || !user) { setState({ status: "signedOut", user: null }); return; }

      // A session from the first app build: upgrade it to a renewable one.
      if (!session.refreshToken) {
        if (session.accessExpiresAt <= Date.now()) { await clearSession(); setState({ status: "signedOut", user: null }); return; }
        try {
          const started = await rpc<StartedSession>("mobile.startSession", deviceInfo(), session.accessToken);
          await saveSession({ ...started });
        } catch { /* keep the old token until it expires; retried next launch */ }
      }
      if (!cancelled) setState({ status: "signedIn", user });
    })();
    return () => { cancelled = true; };
  }, []);

  const completeSignIn = useCallback(async (loginToken: string, user: SessionUser) => {
    let started: StartedSession | null = null;
    try {
      started = await rpc<StartedSession>("mobile.startSession", deviceInfo(), loginToken);
    } catch {
      // Server without device sessions: fall back to the plain sign-in token.
    }
    await saveSession(started
      ? { accessToken: started.accessToken, accessExpiresAt: started.accessExpiresAt, refreshToken: started.refreshToken, sessionId: started.sessionId }
      : { accessToken: loginToken, accessExpiresAt: tokenExpiry(loginToken), refreshToken: null, sessionId: null });
    await setItem(USER_KEY, JSON.stringify(user));
    queryClient.clear();
    setState({ status: "signedIn", user });
  }, [queryClient]);

  // Signed out elsewhere, or the account was deactivated: back to sign-in.
  useEffect(() => onSessionEnded(() => { void signOut("You've been signed out. Please sign in again."); }), [signOut]);

  const value = useMemo(() => ({ ...state, completeSignIn, signOut }), [state, completeSignIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
