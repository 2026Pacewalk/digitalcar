/* Portal-scoped auth session.

   A browser can hold TWO independent sessions at once — the ADMIN portal
   (/admin*) and the MAIN portal (customer/reseller, everything else) — so a
   super-admin can work in one tab and a customer in another without either
   login clobbering the other. Each portal stores its own token + user under
   different localStorage keys.

   MAIN keeps the original keys, so existing customers/resellers stay signed in
   with no migration. Only the ADMIN portal moves to suffixed keys (a one-time
   re-login for admins).

   Security note: the storage split is a convenience for coexisting sessions —
   it is NOT the access-control boundary. Every request still carries a signed
   JWT and the server authorises each procedure by the role IN that token, so a
   token placed in the "wrong" slot can never unlock an area the account isn't
   allowed in. */

export type Slot = "admin" | "main";

const KEYS: Record<Slot, { token: string; user: string }> = {
  main: { token: "auth_token", user: "digitalcarda_user" },
  admin: { token: "auth_token__admin", user: "digitalcarda_user__admin" },
};

/** Which portal the current URL belongs to. */
export function currentSlot(): Slot {
  if (typeof window === "undefined") return "main";
  return window.location.pathname.startsWith("/admin") ? "admin" : "main";
}

/** The portal a given role signs into. */
export function slotForRole(role: string): Slot {
  return role === "super_admin" ? "admin" : "main";
}

export function getToken(slot: Slot = currentSlot()): string {
  try { return localStorage.getItem(KEYS[slot].token) || ""; } catch { return ""; }
}

export function getSessionUser<T = Record<string, unknown>>(slot: Slot = currentSlot()): T | null {
  try {
    const raw = localStorage.getItem(KEYS[slot].user);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

/** Persist a session into the given portal slot. Defaults to the slot the role
    belongs to; callers on a specific login page pass the slot explicitly. */
export function setSession(token: string, user: unknown, slot: Slot): void {
  try {
    localStorage.setItem(KEYS[slot].token, token);
    localStorage.setItem(KEYS[slot].user, JSON.stringify(user));
  } catch { /* ignore */ }
}

/** Update just the cached user for a slot (e.g. server reconciliation). */
export function setSessionUser(user: unknown, slot: Slot = currentSlot()): void {
  try { localStorage.setItem(KEYS[slot].user, JSON.stringify(user)); } catch { /* ignore */ }
}

export function clearSession(slot: Slot = currentSlot()): void {
  try {
    localStorage.removeItem(KEYS[slot].token);
    localStorage.removeItem(KEYS[slot].user);
  } catch { /* ignore */ }
}
