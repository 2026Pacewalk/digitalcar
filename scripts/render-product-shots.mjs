/*
 * Product pictures made from the real card design — no hand-drawn or generated
 * artwork. For every design slug given, this builds the card exactly as the site
 * does (buildCardHtml with the sample business from demoForProduct: the card the
 * product page's LIVE tile and /demo/<slug> show), puts it on the screen of a
 * plain phone drawn in CSS, and photographs it in headless Chrome.
 *
 * Written into public/products/<base>/ (base = the slug without "-card"):
 *   <base>-digital-business-card.png            the main picture (the one sent to Google)
 *   <base>-digital-business-card-preview.png    a second view: services and photos
 *   a .webp beside each PNG, and og.jpg (the 1200×630 banner for link previews)
 *
 *   node scripts/render-product-shots.mjs bento-grid-card terminal-card
 *   node scripts/render-product-shots.mjs --main-only --og emerald-card
 *
 * --main-only replaces just the main picture and its .webp and leaves every
 * other file in the folder alone; with --og it also redraws og.jpg, which shows
 * the main picture. Without --main-only a folder that already holds a second
 * view or a banner is left alone unless --replace is given: on the older
 * designs those two are posters made elsewhere, and this would overwrite them.
 * --out=<dir> writes somewhere other than public/products, to look at the
 * pictures before replacing anything.
 *
 * Google's rule for the main picture is "the product and nothing added on top":
 * no headline, badge, price, watermark or prop. So the scene is only the phone
 * on a plain background tinted with the design's own colour. Words on the card
 * itself are part of the product — but a sample business's "Free Trial Session"
 * would read as an offer on the design, so services worded like that are left
 * out of the sample (sampleFor), and a sample photo that shows another
 * company's logo is left out or swapped for one that doesn't (OTHER_BRANDS).
 * Any offer-like wording still on screen is printed with a "?" so the picture
 * can be looked at before it is published. Always look at the pictures: a "!"
 * line means something did not load.
 *
 * Needs: Node 22 or newer (it talks to Chrome over Node's own WebSocket),
 * Chrome (set CHROME to its path if it isn't in the usual place), the
 * internet (the cards load their fonts, icons and QR code from the web), and
 * DATABASE_URL — each design's number and colours are read from the products
 * table. Nothing is written to the database; deploy links new pictures to
 * their product (db/backfill-product-media.mjs).
 */
import { createServer as createViteServer } from "vite";
import sharp from "sharp";
import mysql from "mysql2/promise";
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import "dotenv/config";

const ROOT = process.cwd();
const PUB = path.join(ROOT, "public");

const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const slugs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const MAIN_ONLY = flags.includes("--main-only"), WITH_OG = flags.includes("--og"), REPLACE = flags.includes("--replace");
const OUT = path.resolve(flags.find((f) => f.startsWith("--out="))?.slice(6) || path.join(PUB, "products"));
if (!slugs.length) { console.error("Usage: node scripts/render-product-shots.mjs [--main-only [--og]] [--replace] [--out=<dir>] <product-slug> …"); process.exit(1); }
// Said before anything is started: on an older Node the script would otherwise
// stop half-way, with Chrome already running.
if (typeof WebSocket !== "function") { console.error(`This needs Node 22 or newer (this is ${process.version}): it talks to Chrome over Node's built-in WebSocket.`); process.exit(1); }

/* ── Sizes ────────────────────────────────────────────────── */
// The finished picture, the size of the newer product pictures.
const OUT_W = 1149, OUT_H = 1436;
// The scene is laid out on an 800×1000 canvas and photographed at twice the
// finished size, then halved: edges, shadows and small text come out smooth.
const STAGE_W = 800, STAGE_H = 1000, OVERSAMPLE = 2;
// The phone's screen: the width the site's design tiles are drawn at (THUMB_W
// in src/pages/public/ProductDetail.tsx) and a tall phone's height. The card
// gets the part between two plain strips — where a phone keeps its clock and
// its swipe bar — so the screen's round corners never cut into the card. The
// strips are that tall for the same reason: nearly as tall as the corners.
const SCREEN_W = 375, SCREEN_H = 800, BAR_TOP = 44, BAR_BOTTOM = 34;
const VIEW_H = SCREEN_H - BAR_TOP - BAR_BOTTOM;
// Where the screen ends the card (SETTLE): as far above or below the usual
// place as it may go to keep from cutting through something, and how tall a
// block, or a picture, may be and still count as small. Upwards the strip
// below grows, to an eighth of the screen at most; downwards it must stay
// clear of the corners.
const FOLD = { usual: VIEW_H, min: VIEW_H - 64, max: VIEW_H + 10, room: SCREEN_H - BAR_TOP, small: 72, picture: 140 };
const FRAME = 3, BEZEL = 10, CORNER = 58;
const PHONE_W = SCREEN_W + 2 * (FRAME + BEZEL), PHONE_H = SCREEN_H + 2 * (FRAME + BEZEL);
// Same settings as scripts/gen-product-webp.mjs. That script isn't run from
// here: it redoes every PNG whose .webp isn't newer, which after a fresh
// checkout is most of the folder.
const WEBP = { quality: 80, effort: 5 };

/* ── Colour ───────────────────────────────────────────────── */
const hex = (c) => (/^#[0-9a-f]{6}$/i.test(String(c || "")) ? String(c) : "#F7B31C");
const rgb = (c) => [1, 3, 5].map((i) => parseInt(hex(c).slice(i, i + 2), 16));
/** `amount` of the way from colour a to colour b (0 = a, 1 = b). */
const mix = (a, b, amount) => {
  const x = rgb(a), y = rgb(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * amount).toString(16).padStart(2, "0")).join("");
};

/* ── The scene ────────────────────────────────────────────── */
/* One phone: a dark metal frame, a thin black bezel, the screen with its camera
   and swipe bar. No maker's mark, no clock, no signal icons — nothing to read
   that isn't the card. `to` is the part of the card the phone is scrolled to
   before the picture is taken ("services" or "photos" — see SETTLE). */
const phoneHtml = ({ card, left, top, scale = 1, to = "" }) => `
  <div class="ph" style="left:${left}px;top:${top}px;transform:scale(${scale})">
    <i class="ph-key" style="left:-2px;top:150px;height:30px"></i>
    <i class="ph-key" style="left:-2px;top:205px;height:56px"></i>
    <i class="ph-key" style="left:-2px;top:275px;height:56px"></i>
    <i class="ph-key" style="right:-2px;top:230px;height:88px"></i>
    <div class="ph-frame"><div class="ph-bezel"><div class="ph-screen">
      <div class="ph-top"><i class="ph-cam"></i></div>
      <iframe src="/card/${card}" data-to="${to}" scrolling="no" tabindex="-1"></iframe>
      <div class="ph-bottom"><i class="ph-swipe"></i></div>
    </div></div></div>
  </div>`;

/* The background is light and takes its tint from the design's own colour: a
   soft vertical fade, a pool of light behind the phone and the phone's shadow
   on the floor. */
function stageHtml(color, phones, shadows) {
  const hi = mix(color, "#ffffff", 0.96), mid = mix(color, "#ffffff", 0.9), low = mix(color, "#f1f3f6", 0.8);
  const shade = mix(color, "#0f172a", 0.82);
  const [r, g, b] = rgb(shade);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${STAGE_W}px;height:${STAGE_H}px;overflow:hidden;}
  body{position:relative;background:
    radial-gradient(58% 44% at 50% 40%, rgba(255,255,255,.92) 0%, rgba(255,255,255,0) 72%),
    linear-gradient(180deg, ${hi} 0%, ${mid} 58%, ${low} 100%);}
  .floor{position:absolute;border-radius:50%;background:radial-gradient(closest-side, rgba(${r},${g},${b},.34), rgba(${r},${g},${b},.12) 55%, rgba(${r},${g},${b},0));filter:blur(7px);}
  .ph{position:absolute;width:${PHONE_W}px;height:${PHONE_H}px;transform-origin:0 0;}
  .ph-frame{position:relative;width:100%;height:100%;box-sizing:border-box;padding:${FRAME}px;border-radius:${CORNER}px;
    background:linear-gradient(140deg,#7b8494 0%,#2b303b 16%,#0e1015 48%,#262b35 84%,#6c7483 100%);
    box-shadow:0 1px 2px rgba(${r},${g},${b},.3),0 26px 44px -16px rgba(${r},${g},${b},.34),0 64px 90px -44px rgba(${r},${g},${b},.42);}
  .ph-bezel{width:100%;height:100%;box-sizing:border-box;padding:${BEZEL}px;border-radius:${CORNER - FRAME}px;background:#07080b;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);}
  .ph-screen{width:${SCREEN_W}px;height:${SCREEN_H}px;border-radius:${CORNER - FRAME - BEZEL}px;overflow:hidden;background:#fff;}
  .ph-screen iframe{display:block;border:0;width:${SCREEN_W}px;height:${VIEW_H}px;}
  .ph-top{position:relative;z-index:1;height:${BAR_TOP}px;padding-bottom:1px;margin-bottom:-1px;background:#fff;}
  .ph-cam{position:absolute;left:50%;top:11px;width:74px;height:22px;margin-left:-37px;border-radius:11px;background:#07080b;}
  .ph-bottom{position:relative;z-index:1;height:${BAR_BOTTOM}px;padding-top:1px;margin-top:-1px;background:#fff;}
  .ph-swipe{position:absolute;left:50%;bottom:13px;width:112px;height:4px;margin-left:-56px;border-radius:2px;background:rgba(15,23,42,.3);}
  .ph-bottom.is-dark .ph-swipe{background:rgba(255,255,255,.6);}
  .ph-key{position:absolute;width:3px;border-radius:2px;background:linear-gradient(180deg,#444b58,#1b1f27);}
  </style></head><body>
  ${shadows.map((s) => `<div class="floor" style="left:${s.left}px;top:${s.top}px;width:${s.width}px;height:${s.height}px"></div>`).join("")}
  ${phones.map(phoneHtml).join("")}
  </body></html>`;
}

/* The two pictures. The main one is the card as it opens; the second one shows
   two phones further down the same card. */
const center = (STAGE_W - PHONE_W) / 2;
const SHOTS = {
  main: (card) => ({
    phones: [{ card, left: center, top: 84 }],
    shadows: [{ left: center - 70, top: 84 + PHONE_H - 26, width: PHONE_W + 140, height: 70 }],
  }),
  preview: (card) => {
    const scale = 0.82, w = PHONE_W * scale, h = PHONE_H * scale, gap = 46;
    const left = (STAGE_W - 2 * w - gap) / 2;
    return {
      phones: [
        { card, left, top: 118, scale, to: "services" },
        { card, left: left + w + gap, top: 208, scale, to: "photos" },
      ],
      shadows: [
        { left: left - 50, top: 118 + h - 22, width: w + 100, height: 56 },
        { left: left + w + gap - 50, top: 208 + h - 22, width: w + 100, height: 56 },
      ],
    };
  },
};

/* ── Runs inside the page ─────────────────────────────────── */
/* Waits for each phone's fonts and pictures and scrolls it to its section.
   Returns what could not be loaded, the wording now on screen, where each
   card sits in the scene, and how many of the phones still end on a cut
   through something. */
const SETTLE = `(async (FOLD) => {
  const problems = [], wording = [], cards = [], shown = [], cuts = [];
  for (const frame of document.querySelectorAll("iframe")) {
    const win = frame.contentWindow, doc = win.document;
    // Pictures further down are fetched only when scrolled near; ask for all of
    // them now, so nothing moves or is caught half-way after scrolling.
    for (const img of doc.images) img.loading = "eager";
    await doc.fonts.ready;
    if (!doc.fonts.size || [...doc.fonts].some((f) => f.status === "error")) problems.push("fonts did not load");
    await Promise.all([...doc.images].map((img) => img.complete ? null : new Promise((done) => {
      img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true }); setTimeout(done, 20000);
    })));

    // Where "services" and "photos" are on a card. Every design names its
    // sections the same way.
    const section = (id) => doc.querySelector("#" + id + "-section");
    const pageTop = (el) => el.getBoundingClientRect().top + win.scrollY;
    const start = {
      // The services — from About, just above them, when they alone would not
      // fill most of the screen.
      services: () => { const s = section("products"), a = section("about"); return s && (s.offsetHeight >= 0.6 * win.innerHeight || !a) ? s : a || s; },
      // The photos, or else the next section an earlier phone isn't showing.
      photos: () => [section("gallery"), section("enquiry"), section("about")].find((e) => e && !shown.some(([from, until]) => pageTop(e) >= from && pageTop(e) < until)),
    }[frame.dataset.to];
    if (start) {
      const el = start();
      if (el) {
        // The section's heading right at the top of the screen (the strip above
        // it is the margin): any higher and the row of icons that some designs
        // end the part before with shows as a sliver.
        win.scrollTo({ top: Math.max(0, pageTop(el)), behavior: "instant" });
        // A bar that stays at the top of the card would now cover the heading.
        const bar = doc.elementsFromPoint(win.innerWidth / 2, 2).find((e) => /fixed|sticky/.test(win.getComputedStyle(e).position));
        if (bar) win.scrollTo({ top: Math.max(0, pageTop(el) - 10 - bar.getBoundingClientRect().bottom), behavior: "instant" });
        shown.push([win.scrollY, win.scrollY + win.innerHeight - 140]);
      } else problems.push("no section to scroll to for " + frame.dataset.to);
    }
    // Drawn at all? Not, for one, the buttons that float over a card once it
    // has been scrolled: until then they are in place but see-through.
    const drawn = (el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const texts = [];
    const walk = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.nodeValue.trim() && !/^(SCRIPT|STYLE)$/.test(n.parentElement.tagName) && drawn(n.parentElement)) texts.push(n);

    // Where the screen cuts the card off at the bottom: higher or lower than
    // usual (the strip below takes up the difference) when that keeps the cut
    // from running through a line of text, an icon or a button, or leaving a
    // sliver of the next block. Not when a bar is pinned to the bottom of the
    // card: that is its edge already.
    if (!doc.elementsFromPoint(win.innerWidth / 2, win.innerHeight - 2).some((e) => /fixed|sticky/.test(win.getComputedStyle(e).position) && drawn(e))) {
      // What could be cut: the lines of text and the blocks (anything with a
      // picture, a background or a border) within reach of the bottom edge.
      // Not what floats over the card: that keeps its distance from the bottom
      // of the screen wherever that is.
      const reach = (r) => r.width > 1 && r.right > 0 && r.left < win.innerWidth && r.bottom > FOLD.min - 150 && r.top < FOLD.max + 150;
      const floats = (el) => { for (let e = el; e && e !== doc.body; e = e.parentElement) if (win.getComputedStyle(e).position === "fixed") return true; return false; };
      const range = doc.createRange();
      const words = texts.filter((n) => reach(n.parentElement.getBoundingClientRect()) && !floats(n.parentElement));
      const boxes = [...doc.body.querySelectorAll("*")].filter((el) => {
        const style = win.getComputedStyle(el);
        return reach(el.getBoundingClientRect()) && drawn(el) && !floats(el) && (el.tagName === "IMG" || style.backgroundImage !== "none" || style.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(style.borderTopWidth) > 0);
      });
      // What a cut at height h costs. The window is given that height first: a
      // design that sizes a part of itself by the height of the screen moves
      // everything below that part when the screen ends somewhere else.
      // A line counts as cut even when the cut only grazes it from below: text
      // needs a little air under it. A block is a sliver when less than 22px
      // shows. A small block — an icon, a button, a round link, a tile, or a
      // picture no bigger than a QR code or a portrait — looks sliced wherever
      // the cut goes through it, and it too wants some air; a tall one (a
      // photo, a panel) simply carries on below the screen.
      const cost = (h) => {
        frame.style.height = h + "px";
        const lines = words.flatMap((n) => { range.selectNodeContents(n); return [...range.getClientRects()]; });
        const blocks = boxes.map((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, small: r.height <= (el.tagName === "IMG" ? FOLD.picture : FOLD.small) }; });
        return 3 * lines.filter((r) => r.top < h - 1 && r.bottom > h - 4).length
          + 2 * blocks.filter((r) => r.top > h - 22 && r.top < h - 1 && r.bottom > h).length
          + 2 * blocks.filter((r) => r.small && r.top < h - 1 && r.bottom > h - 3).length;
      };
      let best = FOLD.usual, least = cost(best);
      for (let h = FOLD.min; h <= FOLD.max; h++) {
        const c = cost(h);
        if (c < least || (c === least && Math.abs(h - FOLD.usual) < Math.abs(best - FOLD.usual))) { best = h; least = c; }
      }
      frame.style.height = best + "px";
      frame.nextElementSibling.style.height = (FOLD.room - best) + "px";
      if (least) cuts.push(best - FOLD.usual);
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    }

    const seen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < win.innerHeight && r.right > 0 && r.left < win.innerWidth && r.width > 0; };
    for (const img of doc.images) if (seen(img) && drawn(img) && !img.naturalWidth) problems.push("picture did not load: " + img.currentSrc.slice(0, 120));
    for (const n of texts) if (seen(n.parentElement)) wording.push(n.nodeValue.replace(/\\s+/g, " ").trim());
    // What the card is painted with in a corner of its window: one plain colour
    // ([r, g, b]), "picture" for a photo — also one under a see-through layer
    // — or "fade" for a gradient or anything else see-through.
    const paint = (x, y) => {
      let veiled = false;
      for (const el of doc.elementsFromPoint(x, y)) {
        const style = win.getComputedStyle(el), c = style.backgroundColor.match(/[\\d.]+/g) || [];
        if (el.tagName === "IMG" || style.backgroundImage.includes("url(")) return "picture";
        if (style.backgroundImage !== "none") veiled = true;
        else if (c.length === 3 || Number(c[3]) === 1) return veiled ? "fade" : c.slice(0, 3).map(Number);
        else if (Number(c[3]) > 0) veiled = true;
      }
      return veiled ? "fade" : [255, 255, 255];
    };
    // The page's own colour at a point — that of whatever fills the whole
    // window behind the things drawn there — or null when that is no one colour.
    const paper = (x, y) => {
      for (const el of doc.elementsFromPoint(x, y)) {
        const box = el.getBoundingClientRect(), style = win.getComputedStyle(el), c = style.backgroundColor.match(/[\\d.]+/g) || [];
        if (box.width < win.innerWidth - 1 || box.height < win.innerHeight - 1) continue;
        if (style.backgroundImage !== "none") return null;
        if (c.length === 3 || Number(c[3]) === 1) return c.slice(0, 3).map(Number);
      }
      return [255, 255, 255];
    };
    // An edge of the window. The same plain colour in both corners is the
    // page's own background, or a bar running the full width: that is the
    // edge's colour. Anything else is read from the photograph of the scene
    // (edgeColours), which is told whether there is a photo in a corner and
    // what the page's colour is.
    const edge = (y) => {
      const a = paint(3, y), b = paint(win.innerWidth - 3, y);
      return { plain: Array.isArray(a) && a.join() === String(b) ? a : null, picture: a === "picture" || b === "picture", paper: paper(3, y) };
    };
    const box = frame.getBoundingClientRect();
    cards.push({ x: box.x, y: box.y, width: box.width, height: box.height, top: edge(1), bottom: edge(win.innerHeight - 2) });
  }
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  return { problems, wording, cards, cuts };
})`;
/* Colours the strips above and below each card — and the screen behind them.
   The scene is not drawn on whole pixels, so along each edge of the card's
   window a little of whatever is behind shows through. Hence two things in
   the scene: the window has no background of its own (the screen behind it is
   in the strips' colours), and each strip laps one pixel over the card. With
   a white window and strips that merely touched the card, a dark card had a
   pale hairline down its side and across its top. */
const PAINT = `((bars) => document.querySelectorAll(".ph-screen").forEach((screen, i) => {
  screen.style.background = "linear-gradient(" + bars[i].top.flat + " 50%, " + bars[i].bottom.flat + " 50%)";
  screen.querySelector(".ph-top").style.background = bars[i].top.css;
  screen.querySelector(".ph-bottom").style.background = bars[i].bottom.css;
  screen.querySelector(".ph-bottom").classList.toggle("is-dark", bars[i].bottom.dark);
}))`;

/* Wording that, on a product picture, reads as an offer on the design itself. */
const OFFER_WORDS = /\b(free|trial|offers?|deals?|discounts?|sale|cashback|coupons?|best price)\b|% ?off|₹/i;

/* The sample business for the pictures: the one the site shows for this design
   (demoForProduct), without any service or speciality worded like an offer —
   a sample gym's "Free Trial Session" would read as a free trial of the design.
   The business simply lists fewer services; nothing is painted over. */
function sampleFor(demo) {
  const clean = (text) => !OFFER_WORDS.test(String(text ?? "").replace(/<[^>]*>/g, " "));
  return {
    customer: { ...demo.customer, specialities: String(demo.customer.specialities ?? "").split(",").map((x) => x.trim()).filter((x) => x && clean(x)).join(", ") },
    products: demo.products.filter((p) => clean(p.name) && clean(p.description)).map((p) => (OTHER_BRANDS.has(p.filename) ? { ...p, filename: "" } : p)),
    gallery: (demo.gallery ?? []).map((g) => (OTHER_BRANDS.has(g.filename) ? { ...g, filename: OTHER_BRANDS.get(g.filename) } : g)).filter((g) => g.filename),
  };
}
/* Sample photos (public/demo) in which another company's logo or name is plain
   to see. A picture advertising these designs should not carry them, so the
   sample lists that service without its photo, and its gallery shows the photo
   named here in its place — or, where none is named, one photo fewer. The
   site's own demo pages keep their photos. Add a photo here when a new one
   shows somebody's brand. */
const OTHER_BRANDS = new Map([
  ["/demo/automobile/svc-1.webp", ""],                                             // a car maker's name on the showroom wall, its badge on the car
  ["/demo/automobile/svc-3.webp", ""], ["/demo/automobile/gal-2.webp", ""],         // a car maker's badge over the showroom door
  ["/demo/travel/svc-2.webp", ""], ["/demo/travel/gal-1.webp", ""],                 // an airline's name on its aircraft
  ["/demo/homeservices/svc-3.webp", ""], ["/demo/homeservices/gal-2.webp", ""],     // a tool maker's name cast into a wrench
  ["/demo/consulting/svc-2.webp", ""], ["/demo/consulting/gal-1.webp", "/demo/consulting/svc-1.webp"],  // a laptop maker's logo, lit, at the back of a meeting room
  // Both of the agency's gallery photos show a brand, and Story Slides builds
  // its front out of the gallery: with one photo it has nothing to swipe to.
  // So the gallery gets the agency's own third photo and, as it has no fourth,
  // one of the consultancy's — people at a table, no brand in either.
  ["/demo/agency/svc-2.webp", ""], ["/demo/agency/gal-1.webp", "/demo/agency/svc-1.webp"],      // a studio's logo on the wall and on a laptop sticker
  ["/demo/agency/svc-3.webp", ""], ["/demo/agency/gal-2.webp", "/demo/consulting/svc-1.webp"],  // a laptop maker's logo on two lids
]);

/* ── A local web server for the scene ─────────────────────── */
/* Serves the scene, the card and the sample pictures in public/. Anything else
   — the card's own analytics or enquiry calls — is answered and dropped, so
   photographing a card never reaches the real site or a database. The scene
   lives under /demo/, where a card switches its visit counting off by itself. */
const TYPES = { ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2" };
const pages = new Map();
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const page = pages.get(url);
  if (req.method === "GET" && page) { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(page); return; }
  const file = path.join(PUB, url), type = TYPES[path.extname(file).toLowerCase()];
  if (req.method === "GET" && file.startsWith(PUB + path.sep) && type && fs.existsSync(file)) {
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(file).pipe(res);
    return;
  }
  res.writeHead(204); res.end();
});

/* ── Headless Chrome over the DevTools protocol ───────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function openChrome() {
  const exe = process.env.CHROME || [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium",
  ].find((p) => fs.existsSync(p));
  if (!exe) throw new Error("Chrome not found — set CHROME to its path");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "dc-product-shots-"));
  const proc = spawn(exe, [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank",
  ], { stdio: "ignore" });
  let ws, send;
  // Stops Chrome and removes its profile folder. Chrome is asked to quit, so
  // that it takes its helper processes with it and lets go of the folder's
  // files; it is stopped outright only when it can't be asked or doesn't go.
  const close = async () => {
    const gone = new Promise((done) => proc.once("exit", done));
    if (send && proc.exitCode === null) await Promise.race([send("Browser.close").catch(() => {}), sleep(3000)]);
    try { ws?.close(); } catch { /* already closed */ }
    if (proc.exitCode === null) await Promise.race([gone, sleep(3000)]);
    if (proc.exitCode === null) proc.kill();
    await sleep(400);
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch { /* something still holds a file */ }
  };
  try {
    // Chrome picks a free port and writes it into its profile folder.
    const portFile = path.join(profile, "DevToolsActivePort");
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
    if (!fs.existsSync(portFile)) throw new Error("Chrome did not start");
    const port = fs.readFileSync(portFile, "utf8").split("\n")[0].trim();
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
    await new Promise((ok, fail) => { ws.addEventListener("open", ok, { once: true }); ws.addEventListener("error", fail, { once: true }); });
  } catch (e) {
    // Chrome is running by now: it is not left behind when it can't be reached.
    await close();
    throw e;
  }

  let id = 0;
  const waiting = new Map(), listeners = new Set();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
    else if (m.method) for (const fn of listeners) fn(m);
  });
  send = (method, params = {}) => new Promise((ok, fail) => {
    const n = ++id;
    waiting.set(n, (m) => (m.error ? fail(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  /** Listen to Chrome's events; call what it returns to stop listening. */
  const on = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  return { send, on, close };
}

/* The strips above and below a card take the colour of the card's own edge, the
   way a phone's browser tints the space around a page. Where the card says
   what that is — the same plain colour in both corners (SETTLE) — the strip
   continues it. Where it doesn't (a photo, a pattern, a fade, a shape in one
   corner), the edge is read from `image`, a photograph of the scene, along the
   line `y` across the card (scene pixels, like `x` and `width`): the colour at
   both ends when they match, else the colour most of the line has. Failing
   both, a line that changes smoothly from end to end — and is no photo
   (`picture`) — is a fade, and the strip repeats it colour for colour: one
   flat colour would meet it with a step. Anything else gets the page's own
   colour (`paper`), as on a phone, or the line's average when the page has no
   one colour. Returns the strip's colours from left to right — one, when the
   strip is flat. */
const FADE_STOPS = 17;
function edgeColours(image, { x, y, width, paper, picture }) {
  const k = image.info.width / STAGE_W, n = image.info.channels;
  // The ends are read just inside the card's edge: past the few pixels the
  // screen's round corners still take, and short of where a design's own
  // boxes begin (every design keeps a margin of 14px or more).
  const from = Math.round((x + 0.015 * width) * k), to = Math.round((x + 0.985 * width) * k), end = Math.round(0.012 * width * k);
  const at = (px) => (Math.round(y * k) * image.info.width + px) * n;
  const average = (a, b) => [0, 1, 2].map((c) => { let sum = 0; for (let px = a; px < b; px++) sum += image.data[at(px) + c]; return Math.round(sum / (b - a)); });
  const left = average(from, from + end), right = average(to - end, to);
  if (left.every((v, c) => Math.abs(v - right[c]) <= 8)) return [left];
  const count = new Map();
  for (let px = from; px < to; px++) { const i = at(px), key = (image.data[i] << 16) | (image.data[i + 1] << 8) | image.data[i + 2]; count.set(key, (count.get(key) || 0) + 1); }
  const [most, times] = [...count].sort((a, b) => b[1] - a[1])[0];
  if (times >= (to - from) / 2) return [[most >> 16, (most >> 8) & 255, most & 255]];
  // Smooth: no pixel more than a few levels from its neighbour. A pattern or
  // the edge of a shape always has a jump somewhere. (A blurred photo may not,
  // which is why a photo is ruled out by name.)
  let smooth = !picture;
  for (let px = from + 1; px < to && smooth; px++) for (let c = 0; c < 3; c++) if (Math.abs(image.data[at(px) + c] - image.data[at(px - 1) + c]) > 6) smooth = false;
  if (smooth) return Array.from({ length: FADE_STOPS }, (_, i) => { const px = Math.round(from + (i / (FADE_STOPS - 1)) * (to - 1 - from)); return [0, 1, 2].map((c) => image.data[at(px) + c]); });
  return [paper ?? average(from, to)];
}
/* A strip's colours as CSS. A fade's colours sit where they were read: evenly
   from 1.5% to 98.5% of the width (edgeColours). `flat` is the one colour
   nearest to all of them, and `dark` says whether the swipe bar must be light. */
const strip = (colours) => {
  const css = ([r, g, b]) => `rgb(${r},${g},${b})`;
  const mean = [0, 1, 2].map((c) => Math.round(colours.reduce((sum, colour) => sum + colour[c], 0) / colours.length));
  const stops = colours.map((colour, i) => `${css(colour)} ${(1.5 + (97 * i) / (FADE_STOPS - 1)).toFixed(2)}%`);
  return { css: colours.length > 1 ? `linear-gradient(90deg, ${stops.join(", ")})` : css(colours[0]), flat: css(mean), dark: 0.2126 * mean[0] + 0.7152 * mean[1] + 0.0722 * mean[2] < 140 };
};

/* Photographs one scene. Waits for the page, then until nothing has been
   downloading for a moment (fonts, pictures, background images), twice: once
   after loading and once after the phones have been scrolled. The scene is
   photographed twice as well: the first photograph is only read, for the
   colours of the strips above and below each card. */
async function photograph(chrome, url) {
  let lastChange = Date.now(), loaded = false;
  const busy = new Set(), failed = [];
  const stop = chrome.on((m) => {
    if (m.method === "Page.loadEventFired") loaded = true;
    if (m.method === "Network.requestWillBeSent") { busy.add(m.params.requestId); lastChange = Date.now(); }
    if (m.method === "Network.loadingFinished" || m.method === "Network.loadingFailed") { busy.delete(m.params.requestId); lastChange = Date.now(); }
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) failed.push(`${m.params.response.status} ${m.params.response.url.slice(0, 120)}`);
  });
  const quiet = async () => { for (let i = 0; i < 300 && !(loaded && !busy.size && Date.now() - lastChange > 700); i++) await sleep(100); };
  const run = async (expression) => {
    const r = await chrome.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  try {
    await chrome.send("Page.navigate", { url });
    await quiet();
    const { problems, wording, cards, cuts } = await run(`${SETTLE}(${JSON.stringify(FOLD)})`);
    await quiet();
    await sleep(300);
    const shoot = async () => Buffer.from((await chrome.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: STAGE_W, height: STAGE_H, scale: 1 } })).data, "base64");
    const first = await sharp(await shoot()).raw().toBuffer({ resolveWithObject: true });
    const bar = (c, edge, y) => strip(edge.plain ? [edge.plain] : edgeColours(first, { x: c.x, width: c.width, y, picture: edge.picture, paper: edge.paper }));
    // Read a little inside the card: each strip laps a pixel over its edge.
    const bars = cards.map((c) => ({ top: bar(c, c.top, c.y + 2.5), bottom: bar(c, c.bottom, c.y + c.height - 3) }));
    await run(`${PAINT}(${JSON.stringify(bars)})`);
    await sleep(200);
    return { png: await shoot(), problems: [...problems, ...failed], wording, cuts };
  } finally { stop(); }
}

/* The finished picture as a PNG. In full colour when that is small enough: a
   card with flat colours, the usual case, comes to 350–450 KB and is then
   exactly what Chrome drew. A picture full of photographs would be around
   1 MB, so it is saved the way the other product pictures are
   (scripts/import-product-images.mjs): with a palette of 256 colours, where a
   photo's own texture hides the dots the palette leaves on smooth colour. */
const FULL_COLOUR_LIMIT = 640 * 1024;
async function productPng(picture, phones) {
  const full = await sharp(picture).png({ compressionLevel: 9 }).toBuffer();
  return full.length <= FULL_COLOUR_LIMIT ? full : palettePng(picture, phones);
}

/* A palette has too few colours for the soft background: saved as it is, the
   fade and the phone's shadow break into faint bands. So the background — not
   the phones — first gets a grain of a level or two, too fine to see, which
   lets the steps blend into each other. The grain is the same on every run. */
async function palettePng(picture, phones) {
  const { data, info } = await sharp(picture).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const k = info.width / STAGE_W;
  const boxes = phones.map((p) => ({ left: p.left * k, top: p.top * k, right: (p.left + PHONE_W * (p.scale ?? 1)) * k, bottom: (p.top + PHONE_H * (p.scale ?? 1)) * k }));
  let seed = 1;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const shift = Math.round((random() + random() - 1) * 1.5);
      if (!shift || boxes.some((b) => x >= b.left && x < b.right && y >= b.top && y < b.bottom)) continue;
      const i = (y * info.width + x) * 3;
      for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, data[i + c] + shift));
    }
  }
  return sharp(data, { raw: info }).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toBuffer();
}

/* ── The link-preview banner ──────────────────────────────── */
/* og.jpg, laid out like the banners the other product folders already have
   (ogBanner in scripts/gen-brand-assets.mjs). That script isn't run from here:
   it redraws the banner of every product and the site's favicons with it. */
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function wrap(name, max = 15) {
  const lines = []; let cur = "";
  for (const w of String(name).split(/\s+/)) {
    if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}
async function ogBanner(product, mainPng, out) {
  const NAVY = "#0F172A", GOLD = "#F7B31C", W = 1200, H = 630, mockH = 540;
  const meta = await sharp(mainPng).metadata();
  const mockW = Math.round(mockH * (meta.width / meta.height));
  const mask = Buffer.from(`<svg width="${mockW}" height="${mockH}"><rect width="${mockW}" height="${mockH}" rx="26" ry="26" fill="#fff"/></svg>`);
  const rounded = await sharp(await sharp(mainPng).resize(mockW, mockH).toBuffer()).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const mockX = W - mockW - 70, mockY = Math.round((H - mockH) / 2);
  const lines = wrap(product.name), below = 250 + lines.length * 62;
  const accent = hex(product.primary_color);
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B1220"/><stop offset="1" stop-color="${NAVY}"/></linearGradient>
      <radialGradient id="glow" cx="0.25" cy="0.2" r="0.7"><stop offset="0" stop-color="${accent}" stop-opacity="0.28"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>
    <g font-family="Arial, sans-serif">
      <rect x="70" y="150" width="10" height="34" rx="5" fill="${GOLD}"/>
      <text x="94" y="176" font-size="20" font-weight="700" letter-spacing="3" fill="${GOLD}">${esc((product.category || "Digital Business Card").toUpperCase())}</text>
      ${lines.map((l, i) => `<text x="70" y="${250 + i * 62}" font-size="54" font-weight="800" fill="#ffffff">${esc(l)}</text>`).join("")}
      <text x="70" y="${below + 20}" font-size="24" font-weight="500" fill="#94A3B8">One-tap call · WhatsApp · QR · Lead capture</text>
      <rect x="70" y="${below + 46}" width="330" height="46" rx="23" fill="${GOLD}"/>
      <text x="94" y="${below + 76}" font-size="20" font-weight="800" fill="${NAVY}">30-Day Free Trial · No app</text>
      <text x="70" y="585" font-size="26" font-weight="800" fill="#ffffff">Digital<tspan fill="${GOLD}">Carda</tspan></text>
    </g>
  </svg>`);
  const shadow = Buffer.from(`<svg width="${mockW + 40}" height="${mockH + 40}"><rect x="20" y="24" width="${mockW}" height="${mockH}" rx="30" fill="#000" opacity="0.35"/></svg>`);
  await sharp(bg).composite([
    { input: await sharp(shadow).blur(18).png().toBuffer(), left: mockX - 20, top: mockY - 24 },
    { input: rounded, left: mockX, top: mockY },
  ]).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
}

/* ── main ─────────────────────────────────────────────────── */
if (!process.env.DATABASE_URL) { console.error("Set DATABASE_URL"); process.exit(1); }
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.query("SELECT slug, name, category, style_number, primary_color, secondary_color FROM products WHERE slug IN (?)", [slugs]);
await conn.end();
const products = slugs.map((slug) => rows.find((r) => r.slug === slug));
const unknown = slugs.filter((_, i) => !products[i]);
if (unknown.length) { console.error("No such product: " + unknown.join(", ")); process.exit(1); }
const baseOf = (product) => product.slug.replace(/-card$/, "");
/* A full run also writes the second view and the banner. A design that has
   them already keeps them unless that is asked for: on the older designs they
   are posters made elsewhere, which this script cannot make again. */
if (!MAIN_ONLY && !REPLACE) {
  const there = products.flatMap((p) => [`${baseOf(p)}-digital-business-card-preview.png`, "og.jpg"].map((f) => path.join(OUT, baseOf(p), f))).filter((f) => fs.existsSync(f));
  if (there.length) {
    console.error(`These are there already and would be overwritten:\n${there.map((f) => "  " + path.relative(ROOT, f)).join("\n")}\nGive --main-only to replace just the main picture, or --replace to make them all again.`);
    process.exit(1);
  }
}

/* The card builders are the app's own TypeScript, loaded through Vite (they
   read their style sheets with Vite's ?raw imports). With a small config of
   its own: the project's vite.config.ts would also start the API. */
const vite = await createViteServer({
  configFile: false, root: ROOT, appType: "custom", logLevel: "error", envFile: false,
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true },
  resolve: { alias: { "@": path.join(ROOT, "src"), "@contracts": path.join(ROOT, "contracts") } },
});
let chrome;
let trouble = 0;
try {
  const { buildCardHtml } = await vite.ssrLoadModule("/src/card-template/buildCard.ts");
  const { demoForProduct } = await vite.ssrLoadModule("/src/lib/demoData.ts");
  const { withoutScrollbars } = await vite.ssrLoadModule("/src/components/customer/PhoneMockup.tsx");
  const { DEFAULT_CUSTOMER } = await vite.ssrLoadModule("/src/hooks/useCustomer.ts");

  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const origin = `http://127.0.0.1:${server.address().port}`;
  chrome = await openChrome();
  await chrome.send("Page.enable");
  await chrome.send("Network.enable");
  // Reduced motion: every design then draws its finished state straight away.
  await chrome.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await chrome.send("Emulation.setDeviceMetricsOverride", { width: STAGE_W, height: STAGE_H, deviceScaleFactor: (OUT_W / STAGE_W) * OVERSAMPLE, mobile: false });

  let files = 0, bytes = 0;
  const wrote = (file) => { const size = fs.statSync(file).size; files++; bytes += size; console.log(`    ${path.relative(ROOT, file)}  ${(size / 1024).toFixed(0)} KB`); };

  for (const product of products) {
    const base = baseOf(product);
    const dir = path.join(OUT, base);
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  ${product.slug}  (design ${product.style_number})`);

    // The card /demo/<slug> opens on: this design, its own colours, the sample
    // business chosen for it. Sample data only — no customer's card. Its
    // address is the site's showcase card's, as on the design tiles: a few
    // designs print the address, and the Live Demo's own, "demo", would read
    // as a label put on the picture.
    const demo = sampleFor(demoForProduct({ styleNumber: product.style_number, category: product.category }));
    const customer = { ...demo.customer, slug: DEFAULT_CUSTOMER.slug, theme: product.style_number, color: hex(product.primary_color), color2: product.secondary_color || "" };
    pages.set(`/card/${base}`, withoutScrollbars(buildCardHtml(customer, demo.products, demo.gallery, [], [], [], [])));

    for (const kind of MAIN_ONLY ? ["main"] : ["main", "preview"]) {
      const scene = SHOTS[kind](base);
      pages.set(`/demo/shot/${base}-${kind}`, stageHtml(hex(product.primary_color), scene.phones, scene.shadows));
      const { png, problems, wording, cuts } = await photograph(chrome, `${origin}/demo/shot/${base}-${kind}`);
      for (const p of [...new Set(problems)]) { trouble++; console.log(`    ! ${kind}: ${p}`); }
      for (const w of [...new Set(wording)].filter((t) => OFFER_WORDS.test(t))) console.log(`    ? ${kind} shows offer-like wording: "${w.slice(0, 90)}"`);
      if (cuts.length) console.log(`    ? ${kind}: the bottom of ${cuts.length > 1 ? "both screens" : "the screen"} still cuts through something`);

      const name = `${base}-digital-business-card${kind === "main" ? "" : "-preview"}`;
      const full = await sharp(png).resize(OUT_W, OUT_H, { fit: "fill", kernel: "lanczos3" }).png().toBuffer();
      fs.writeFileSync(path.join(dir, `${name}.png`), await productPng(full, scene.phones));
      wrote(path.join(dir, `${name}.png`));
      await sharp(full).webp(WEBP).toFile(path.join(dir, `${name}.webp`));
      wrote(path.join(dir, `${name}.webp`));
      if (kind === "main" && (!MAIN_ONLY || WITH_OG)) { await ogBanner(product, full, path.join(dir, "og.jpg")); wrote(path.join(dir, "og.jpg")); }
    }
  }
  console.log(`\n${files} file(s), ${(bytes / 1024 / 1024).toFixed(2)} MB.`);
} finally {
  if (chrome) await chrome.close();
  server.close();
  await vite.close();
}
if (trouble) { console.error(`\n${trouble} problem(s) above — look at those pictures before using them.`); process.exit(1); }
