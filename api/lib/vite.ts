import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import { cardMetaFor, injectCardMeta } from "./card-og";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.resolve(distPath, "index.html");
    let content = fs.readFileSync(indexPath, "utf-8");
    // For public card URLs, inject per-card OG/meta so social shares get a rich
    // preview (name, role, logo). Non-card paths are served unchanged.
    try {
      const meta = cardMetaFor(new URL(c.req.url).pathname, distPath);
      if (meta) content = injectCardMeta(content, meta);
    } catch { /* fall back to plain index.html */ }
    return c.html(content);
  });
}
