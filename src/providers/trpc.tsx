import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
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
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
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
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
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
