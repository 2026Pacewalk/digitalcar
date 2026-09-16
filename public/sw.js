/* DigitalCarda service worker — makes the site open like an installed app.
 *
 *  Pages     network first; the last good copy is used only when offline, so
 *            nobody ever sees a stale page while connected.
 *  /assets/  build files have content hashes in their names, so a stored copy
 *            is always correct — served from the store, instantly.
 *  Images    shown from the store while a fresh copy is fetched behind it.
 *  API, uploads, OG/signature images, payments: never touched.
 *
 * Emergency off switch: replace this file's body with
 *   self.addEventListener("install", () => self.skipWaiting());
 *   self.addEventListener("activate", (e) => e.waitUntil(self.registration.unregister()));
 * and deploy — every browser drops the worker on its next visit. */

const VERSION = "2026-09-16";
const SHELL = `dc-shell-${VERSION}`;
const PAGES = "dc-pages-v1";
const ASSETS = "dc-assets-v1";
const IMAGES = "dc-images-v1";
const KEEP = [SHELL, PAGES, ASSETS, IMAGES];
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll([OFFLINE_URL, "/icons/app-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith("dc-") && !KEEP.includes(n)).map((n) => caches.delete(n)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

const SKIP = /^\/(api|trpc|og|sig-img|otdo-panel|uploads|media|sitemap|robots|merchant-feed|feed)(\/|\.|$)/;

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function page(event) {
  const cache = await caches.open(PAGES);
  try {
    const preload = await event.preloadResponse;
    const res = preload || (await fetch(event.request));
    if (res.ok && res.type === "basic" && !res.redirected) {
      const copy = res.clone();
      event.waitUntil(cache.put(event.request, copy).then(() => trim(PAGES, 40)));
    }
    return res;
  } catch {
    const url = new URL(event.request.url);
    // Any dashboard screen can boot from any stored dashboard page — it is the
    // same app; the screen itself is chosen in the browser.
    const app = /^\/(dashboard|admin|reseller)(\/|$)/.test(url.pathname);
    const hit = (await cache.match(event.request, { ignoreSearch: true }))
      || (app && ((await cache.match("/dashboard", { ignoreSearch: true }))
        || (await cache.match("/admin", { ignoreSearch: true }))
        || (await cache.match("/reseller", { ignoreSearch: true }))));
    return hit || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

async function asset(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) { await cache.put(request, res.clone()); trim(ASSETS, 150); }
  return res;
}

async function image(event) {
  const cache = await caches.open(IMAGES);
  const hit = await cache.match(event.request);
  const fresh = fetch(event.request).then((res) => {
    if (res.ok && (res.type === "basic" || res.type === "cors")) {
      cache.put(event.request, res.clone()).then(() => trim(IMAGES, 120));
    }
    return res;
  }).catch(() => hit || Response.error());
  if (hit) { event.waitUntil(fresh); return hit; }
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (SKIP.test(url.pathname) || url.pathname === "/sw.js" || url.pathname === "/service-worker") return;
    if (request.mode === "navigate") { event.respondWith(page(event)); return; }
    if (url.pathname.startsWith("/assets/")) { event.respondWith(asset(request)); return; }
    if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(url.pathname)) { event.respondWith(image(event)); return; }
    return;
  }

  // Web fonts are versioned and never change under the same URL.
  if (url.hostname === "fonts.gstatic.com") { event.respondWith(asset(request)); return; }
});
