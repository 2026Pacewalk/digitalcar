/*
 * Server rendering entry for the PUBLIC marketing pages.
 *
 * Built separately (`vite build --ssr src/entry-server.tsx --outDir dist/server`)
 * and loaded by api/lib/vite.ts, which decides which URLs get rendered here.
 * Everything else — the dashboard, admin, customer cards — stays rendered in
 * the browser exactly as before.
 *
 * It renders the real <App />, not a separate "SEO version" of each page: a
 * crawler must see what a visitor sees, and one tree is also what lets the
 * browser attach to this markup (hydrateRoot in main.tsx) instead of throwing
 * it away and building the page a second time.
 *
 * `prerenderToNodeStream` rather than `renderToString` because every page is a
 * React.lazy() import. renderToString gives up on anything still loading and
 * emits the spinner; prerender waits for those imports to resolve.
 */
import { StrictMode } from "react";
import { prerenderToNodeStream } from "react-dom/static";
import { StaticRouter } from "react-router";
import { dehydrate } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import superjson from "superjson";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App";
import { trpc, TRPCProvider, createAppQueryClient } from "@/providers/trpc";
import BlogCover from "@/components/blog/BlogCover";
import type { BlogCover as Cover } from "@/data/blog";

/** A blog article's cover art as a standalone SVG string — the same drawing the
 *  page shows — for the server's social preview images (api/lib/blog-og.ts). */
export function renderBlogCoverSvg(cover: Cover): string {
  return renderToStaticMarkup(<BlogCover cover={cover} />);
}

/** API data fetched by the server before rendering, e.g. the product catalogue.
 *  `path` is the tRPC procedure ("product.bySlug"); `input` must be exactly what
 *  the page passes to useQuery, or the page won't find it in the cache. */
export type SsrSeed = { path: string; input?: unknown; data: unknown };

/** Abort a render that takes longer than this. The caller falls back to the
 *  plain client-rendered shell, which is what every page served before. */
const RENDER_TIMEOUT_MS = 4000;

export async function render(url: string, seeds: SsrSeed[] = []): Promise<{ html: string; state: string }> {
  // A fresh cache per render — a shared one would carry one request's data
  // into the next visitor's page.
  const queryClient = createAppQueryClient();
  for (const seed of seeds) {
    const proc = seed.path.split(".").reduce<unknown>(
      (node, key) => (node as Record<string, unknown> | undefined)?.[key],
      trpc,
    );
    if (!proc) continue;
    // getQueryKey builds the key the same way useQuery does, so the page reads
    // this data on its first render instead of showing its loading state.
    queryClient.setQueryData(getQueryKey(proc as never, seed.input as never, "query"), seed.data);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);
  try {
    const { prelude } = await prerenderToNodeStream(
      <StrictMode>
        <StaticRouter location={url}>
          <TRPCProvider queryClient={queryClient}>
            <App />
          </TRPCProvider>
        </StaticRouter>
      </StrictMode>,
      { signal: controller.signal },
    );
    const chunks: Buffer[] = [];
    for await (const chunk of prelude) chunks.push(Buffer.from(chunk));
    // The seeded data travels with the page so the browser's first render uses
    // it too — identical markup on both sides is what hydration needs.
    return { html: Buffer.concat(chunks).toString("utf8"), state: superjson.stringify(dehydrate(queryClient)) };
  } finally {
    clearTimeout(timer);
  }
}
