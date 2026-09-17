import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
import superjson from "superjson";
// Type-only: the app gets the server's full, typed contract without bundling
// any server code.
import type { AppRouter } from "../../../api/router";
import { API_URL } from "./config";

export const trpc = createTRPCReact<AppRouter>();

/* The token lives in memory for request headers; AuthProvider keeps it in
   sync with secure storage. */
let authToken: string | null = null;
export const setAuthToken = (token: string | null) => { authToken = token; };
export const getAuthToken = () => authToken;

/** Called when the server rejects the session, so the app can sign out. */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error) => {
          const code = (error as { data?: { code?: string } })?.data?.code;
          if (code === "UNAUTHORIZED" || code === "FORBIDDEN" || code === "NOT_FOUND") return false;
          return count < 2;
        },
      },
    },
  });
}

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_URL}/api/trpc`,
        transformer: superjson,
        headers() {
          return authToken ? { "x-auth-token": authToken } : {};
        },
        async fetch(input, init) {
          const res = await globalThis.fetch(input, init);
          if (res.status === 401 && authToken) onUnauthorized?.();
          return res;
        },
      }),
    ],
  });
}

/** Plain REST calls for the few endpoints outside tRPC (e.g. the card snapshot). */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await globalThis.fetch(`${API_URL}${path}`, {
    headers: authToken ? { "x-auth-token": authToken } : {},
  });
  if (res.status === 401) {
    if (authToken) onUnauthorized?.();
    throw new Error("Your session has ended. Please sign in again.");
  }
  if (!res.ok) throw new Error(`Couldn't load (${res.status}). Pull down to try again.`);
  return (await res.json()) as T;
}

/** tRPC error → a sentence to show the owner. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const e = error as { message?: string; data?: { code?: string } } | null;
  if (!e) return fallback;
  if (/Network request failed|Failed to fetch|NetworkError/i.test(e.message || "")) {
    return "No internet connection. Check your data or Wi-Fi and try again.";
  }
  if (e.message && !/^[A-Z_]+$/.test(e.message) && e.message.length < 200) return e.message;
  return fallback;
}
