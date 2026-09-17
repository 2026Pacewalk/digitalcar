import { deleteItem, getItem, setItem } from "./secureStorage";
import { API_URL } from "./config";

/* The device session. After sign-in the app holds:
     · an access token (1 hour) sent with every request, and
     · a refresh token that renews it, kept in the keychain.
   Renewal is automatic and one-at-a-time; if the server says the session has
   ended (signed out elsewhere, account deactivated), listeners are told so the
   app returns to sign-in. */

export type SessionTokens = {
  accessToken: string;
  accessExpiresAt: number;       // ms since epoch
  refreshToken: string | null;   // null only for sessions from the first app build
  sessionId: number | null;
};

const KEY = "dc_session_v2";
const LEGACY_TOKEN_KEY = "dc_auth_token";

let tokens: SessionTokens | null = null;
let refreshing: Promise<string | null> | null = null;
const endedListeners = new Set<() => void>();

export const onSessionEnded = (fn: () => void) => {
  endedListeners.add(fn);
  return () => { endedListeners.delete(fn); };
};
const endSession = () => { endedListeners.forEach((fn) => fn()); };

export function tokenExpiry(jwt: string): number {
  try {
    const part = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(globalThis.atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=")));
    return Number(json.exp) * 1000 || 0;
  } catch { return 0; }
}

export async function loadSession(): Promise<SessionTokens | null> {
  const raw = await getItem(KEY);
  if (raw) {
    try { tokens = JSON.parse(raw) as SessionTokens; return tokens; } catch { /* corrupt — fall through */ }
  }
  // First app build stored a plain 7-day website token.
  const legacy = await getItem(LEGACY_TOKEN_KEY);
  if (legacy) {
    tokens = { accessToken: legacy, accessExpiresAt: tokenExpiry(legacy), refreshToken: null, sessionId: null };
    return tokens;
  }
  return null;
}

export async function saveSession(next: SessionTokens) {
  tokens = next;
  await setItem(KEY, JSON.stringify(next));
  await deleteItem(LEGACY_TOKEN_KEY);
}

export async function clearSession() {
  tokens = null;
  await Promise.all([deleteItem(KEY), deleteItem(LEGACY_TOKEN_KEY)]);
}

export const currentSession = () => tokens;

/** An access token that's good for at least another minute, renewing if needed. */
export async function freshAccessToken(): Promise<string | null> {
  if (!tokens) return null;
  if (tokens.accessExpiresAt - Date.now() > 60_000) return tokens.accessToken;
  if (!tokens.refreshToken) {
    // A first-build session can't renew; it works until its own expiry.
    return tokens.accessExpiresAt > Date.now() ? tokens.accessToken : null;
  }
  return renew();
}

/** Renews now (e.g. after the server rejected the access token). */
export function renew(): Promise<string | null> {
  refreshing ??= doRenew().finally(() => { refreshing = null; });
  return refreshing;
}

async function doRenew(): Promise<string | null> {
  const refreshToken = tokens?.refreshToken;
  if (!refreshToken) return null;
  try {
    const result = await rpc<{ accessToken: string; accessExpiresAt: number; refreshToken: string; sessionId: number }>(
      "mobile.refresh", { refreshToken },
    );
    await saveSession({ accessToken: result.accessToken, accessExpiresAt: result.accessExpiresAt, refreshToken: result.refreshToken, sessionId: result.sessionId });
    return result.accessToken;
  } catch (e) {
    const err = e as RpcError;
    if (err.code === "UNAUTHORIZED") { endSession(); return null; }
    // A race or a network blip: keep the current token and try again next request.
    return tokens?.accessToken ?? null;
  }
}

/* ── Minimal tRPC call for the session plumbing itself (outside React). ── */

export class RpcError extends Error {
  constructor(message: string, public code?: string, public status?: number) { super(message); }
}

export async function rpc<T>(path: string, input: unknown, token?: string | null): Promise<T> {
  const res = await globalThis.fetch(`${API_URL}/api/trpc/${path}?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { "x-auth-token": token } : {}) },
    body: JSON.stringify({ 0: { json: input ?? null } }),
  });
  let body: unknown;
  try { body = await res.json(); } catch { throw new RpcError("The server sent an unexpected reply.", undefined, res.status); }
  const first = (Array.isArray(body) ? body[0] : body) as { result?: { data?: { json?: T } }; error?: { json?: { message?: string; data?: { code?: string } } } };
  if (first?.error) throw new RpcError(first.error.json?.message || "Request failed", first.error.json?.data?.code, res.status);
  return first?.result?.data?.json as T;
}
