import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { deleteItem, getItem, setItem } from "./secureStorage";
import { setAuthToken, setUnauthorizedHandler } from "./trpc";

const TOKEN_KEY = "dc_auth_token";
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
  | { status: "signedOut"; user: null }
  | { status: "signedIn"; user: SessionUser };

type AuthContextValue = AuthState & {
  signIn: (token: string, user: SessionUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  // Restore the saved session on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [token, rawUser] = await Promise.all([getItem(TOKEN_KEY), getItem(USER_KEY)]);
      if (cancelled) return;
      let user: SessionUser | null = null;
      try { user = rawUser ? (JSON.parse(rawUser) as SessionUser) : null; } catch { user = null; }
      if (token && user) {
        setAuthToken(token);
        setState({ status: "signedIn", user });
      } else {
        setState({ status: "signedOut", user: null });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    await Promise.all([deleteItem(TOKEN_KEY), deleteItem(USER_KEY)]);
    queryClient.clear();
    setState({ status: "signedOut", user: null });
  }, [queryClient]);

  const signIn = useCallback(async (token: string, user: SessionUser) => {
    setAuthToken(token);
    await Promise.all([setItem(TOKEN_KEY, token), setItem(USER_KEY, JSON.stringify(user))]);
    queryClient.clear();
    setState({ status: "signedIn", user });
  }, [queryClient]);

  // An expired or revoked session anywhere in the app returns to sign-in.
  useEffect(() => {
    setUnauthorizedHandler(() => { void signOut(); });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
