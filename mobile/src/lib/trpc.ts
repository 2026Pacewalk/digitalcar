import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
import superjson from "superjson";
// Type-only: the app gets the server's full, typed contract without bundling
// any server code.
import type { AppRouter } from "../../../api/router";
import { API_URL } from "./config";
import { currentSession, freshAccessToken, renew } from "./session";

export const trpc = createTRPCReact<AppRouter>();

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

/** Sends the request with a current access token; if the server rejects it,
    renews once and retries — so an expired token never surfaces as an error. */
async function authorisedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = await freshAccessToken();
  const withToken = (t: string | null): RequestInit => {
    const headers = new Headers(init?.headers);
    if (t) headers.set("x-auth-token", t); else headers.delete("x-auth-token");
    return { ...init, headers };
  };
  const res = await globalThis.fetch(input, withToken(token));
  if (res.status === 401 && currentSession()?.refreshToken) {
    const renewed = await renew();
    if (renewed && renewed !== token) return globalThis.fetch(input, withToken(renewed));
  }
  return res;
}

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_URL}/api/trpc`,
        transformer: superjson,
        fetch: authorisedFetch,
      }),
    ],
  });
}

/** Plain REST calls for the few endpoints outside tRPC (e.g. the card snapshot). */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await authorisedFetch(`${API_URL}${path}`);
  if (res.status === 401) throw new Error("Your session has ended. Please sign in again.");
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
  if (e.message && !/^[A-Z_]+$/.test(e.message) && e.message.length < 200) {
    // Server messages may carry a machine prefix ("SNAPSHOT_STALE: …").
    return e.message.replace(/^[A-Z_]+:\s*/, "");
  }
  return fallback;
}

/** Machine prefix of a server error message, e.g. "SNAPSHOT_STALE". */
export const errorTag = (error: unknown) => (String((error as { message?: string })?.message || "").match(/^([A-Z_]+):/)?.[1] ?? null);
