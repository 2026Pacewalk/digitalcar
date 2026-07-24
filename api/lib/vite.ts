import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import { metaFor, injectCardMeta } from "./card-og";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");
  const indexPath = path.resolve(distPath, "index.html");

  // Serve index.html with per-page OG/meta injected (marketing pages + cards),
  // so social shares and crawlers get proper titles/descriptions/previews.
  const serveHtml = (c: Parameters<Parameters<App["get"]>[1]>[0]) => {
    let content = fs.readFileSync(indexPath, "utf-8");
    try {
      const meta = metaFor(new URL(c.req.url).pathname, distPath);
      if (meta) content = injectCardMeta(content, meta);
    } catch { /* fall back to plain index.html */ }
    return c.html(content);
  };

  // The homepage would otherwise be served as a raw file by serveStatic, so
  // handle it first to inject meta.
  app.get("/", serveHtml);
  app.use("*", serveStatic({ root: "./dist/public" }));
  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) return c.json({ error: "Not Found" }, 404);
    return serveHtml(c);
  });
}
