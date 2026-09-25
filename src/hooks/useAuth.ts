import { useState, useEffect, useCallback } from "react";
import { getSessionUser, getToken, setSession, clearSession } from "@/lib/session";

interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: "super_admin" | "reseller" | "customer" | "staff";
  avatar?: string;
}

// Local-dev fallback only (gated to import.meta.env.DEV). No admin here on purpose —
// the super-admin must authenticate against the real backend, never a hardcoded value.
export const DEMO_USERS: Record<string, { password: string; user: AuthUser }> = {
  "demo@digitalcarda.com": {
    password: "demo123",
    user: {
      id: 2,
      email: "demo@digitalcarda.com",
      fullName: "Demo Customer",
      role: "customer",
    },
  },
  "reseller@digitalcarda.com": {
    password: "reseller123",
    user: {
      id: 3,
      email: "reseller@digitalcarda.com",
      fullName: "Demo Reseller",
      role: "reseller",
    },
  },
};

function getStoredUser(): AuthUser | null {
  return getSessionUser<AuthUser>();
}

type Role = AuthUser["role"];

/* Which portal a dashboard path belongs to — used only while the role is still
   unknown, so a partner page never paints the customer menu for a frame. */
export function roleForPath(pathname: string): Role {
  if (pathname.startsWith("/reseller")) return "reseller";
  if (pathname.startsWith("/admin")) return "staff"; // the most limited admin menu
  return "customer";
}

/* The signed-in role for the dashboard shells (sidebar, tab bar, top bar,
   profile menu, bell). useAuth() starts at null and fills in after an effect,
   and those shells used to treat "unknown" as "customer" — so a reseller saw
   the customer menu. This reads the stored session synchronously instead, and
   falls back to the portal the URL is in. The server still decides access. */
export function useSessionRole(pathname?: string): Role {
  const { user } = useAuth();
  return user?.role ?? getStoredUser()?.role
    ?? roleForPath(pathname ?? (typeof window === "undefined" ? "" : window.location.pathname));
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    setIsLoading(false);
    // Another tab signed in, out, or as someone else ("Login as Client"): follow
    // it, so this tab's menus never show one account while its requests carry
    // another's session.
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || /^(auth_token|digitalcarda_user)(__admin)?$/.test(e.key)) setUser(getStoredUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = useCallback((email: string, password: string): boolean => {
    // Local-dev only, exactly like Login.tsx's demoLogin. Without this guard the
    // built-in demo credentials were a hardcoded sign-in path in the production
    // bundle too. (Nothing currently calls this — the guard keeps it that way.)
    if (!import.meta.env.DEV) return false;
    const entry = DEMO_USERS[email.toLowerCase().trim()];
    if (entry && entry.password === password) {
      setSession("demo_token_" + entry.user.id, entry.user, "main");
      setUser(entry.user);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    // Sign out of the CURRENT portal only, leaving the other session intact.
    const onMain = typeof window !== "undefined" && !window.location.pathname.startsWith("/admin");
    const adminActive = !!getToken("admin");
    const wasPartner = onMain && getSessionUser<AuthUser>()?.role === "reseller";
    clearSession();
    setUser(null);
    // If a super-admin was impersonating a customer ("Login as Client"), their
    // own admin session is still intact — send them back to the admin portal
    // instead of the main login page (where admin sign-in is blocked).
    if (onMain && adminActive) { window.location.href = wasPartner ? "/admin/resellers" : "/admin/customers"; return; }
    // A reseller signs out back to the partner door they came in through.
    window.location.href = wasPartner ? "/resellers-login" : "/login";
  }, []);

  const refetch = useCallback(async () => {
    const u = getStoredUser();
    setUser(u);
  }, []);

  return { user, isLoading, isAuthenticated: !!user, login, logout, refetch };
}
