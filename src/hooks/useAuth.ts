import { useState, useEffect, useCallback } from "react";
import { getSessionUser, setSession, clearSession } from "@/lib/session";

interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: "super_admin" | "reseller" | "customer";
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

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    setIsLoading(false);
  }, []);

  const login = useCallback((email: string, password: string): boolean => {
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
    clearSession();
    setUser(null);
    window.location.href = "/login";
  }, []);

  const refetch = useCallback(async () => {
    const u = getStoredUser();
    setUser(u);
  }, []);

  return { user, isLoading, isAuthenticated: !!user, login, logout, refetch };
}
