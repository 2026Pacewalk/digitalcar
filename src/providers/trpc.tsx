import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, httpLink, splitLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";
import { getToken } from "@/lib/session";

export const trpc = createTRPCReact<AppRouter>();

/* One QueryClient per browser tab — but a FRESH one per server render. A module-
   level client on the server (src/entry-server.tsx) would be shared by every
   request, carrying one visitor's cached data into the next visitor's page. */
export function createAppQueryClient(): QueryClient {
  return new QueryClient();
}

let browserQueryClient: QueryClient | undefined;
export function getBrowserQueryClient(): QueryClient {
  return (browserQueryClient ??= createAppQueryClient());
}
const linkOptions = {
  url: "/api/trpc",
  transformer: superjson,
  headers() {
    // Send the token for the portal the current URL belongs to, so admin
    // (/admin*) and customer requests each carry their own session.
    const token = getToken();
    return {
      ...(token ? { "x-auth-token": token } : {}),
    };
  },
  fetch(input: RequestInfo | URL, init?: RequestInit) {
    return globalThis.fetch(input, {
      ...(init ?? {}),
      credentials: "include",
    });
  },
};

/* Reads whose input can be too long for a URL (the preview of a custom email
   carries the whole message) go as a POST — the server allows that for
   queries. Everything else stays batched GET/POST as before. */
const POST_QUERIES = new Set(["customerEmail.preview"]);

const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: (op) => op.type === "query" && POST_QUERIES.has(op.path),
      true: httpLink({ ...linkOptions, methodOverride: "POST" }),
      false: httpBatchLink(linkOptions),
    }),
  ],
});

export function TRPCProvider({ children, queryClient = getBrowserQueryClient() }: { children: ReactNode; queryClient?: QueryClient }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
