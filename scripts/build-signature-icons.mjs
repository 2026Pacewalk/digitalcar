#!/usr/bin/env node
/*
 * Generate the PNG icons the e-mail signatures use.
 *
 *   node scripts/build-signature-icons.mjs
 *
 * Run this ONCE and commit the output; the signatures load the committed PNGs
 * from https://digitalcarda.in/sig/, so nothing here runs in production.
 *
 * Why PNG and not the card's icons: the card renders Font Awesome from a CDN
 * and inline SVG. E-mail clients have neither — Gmail strips <svg>, Outlook
 * ignores webfonts, and every client blocks data: URIs in <img>. A hosted PNG
 * is the only icon format that renders in all of them.
 *
 * Brand glyphs come from simple-icons (CC0). Contact glyphs are Material Design
 * icon paths (Apache-2.0), written inline so the common case needs no network.
 * Everything is drawn at 2× the display size so it stays sharp on retina.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { SOCIAL_PLATFORMS } from "../src/lib/socialPlatforms.ts";

const OUT = path.resolve("public/sig");
const SI_VERSION = "11.14.0";

/* Generic contact icons — stroked or filled 24×24 paths, drawn in one neutral
   grey that sits comfortably against any accent colour the customer picks. */
const CONTACT_INK = "#64748b";
/* A white set for the dark-background designs, where the grey glyph vanishes.
   Written as <name>-w.png. */
const CONTACT_INK_LIGHT = "#ffffff";
const CONTACT = {
  phone: `<path fill="CURRENT" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>`,
  mail: `<path fill="CURRENT" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>`,
  pin: `<path fill="CURRENT" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>`,
  globe: `<g fill="none" stroke="CURRENT" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4.1" ry="9"/><path d="M3.2 9.5h17.6M3.2 14.5h17.6"/></g>`,
};

/** simple-icons slug for each catalogue key (omit = no brand glyph available). */
const SI_SLUG = {
  facebook: "facebook", instagram: "instagram", x: "x", youtube: "youtube",
  linkedin: "linkedin", whatsapp: "whatsapp", telegram: "telegram", tiktok: "tiktok",
  pinterest: "pinterest", snapchat: "snapchat", github: "github", behance: "behance",
  dribbble: "dribbble", spotify: "spotify", twitch: "twitch", discord: "discord",
};

async function fetchGlyphPath(slug) {
  const url = `https://cdnjs.cloudflare.com/ajax/libs/simple-icons/${SI_VERSION}/${slug}.svg`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  const svg = await res.text();
  const d = svg.match(/\sd="([^"]+)"/)?.[1];
  if (!d) throw new Error(`${slug}: no path in SVG`);
  return d;
}

const render = (svg, file) =>
  sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(OUT, file));

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  let made = 0;

  // ── Contact icons: 40px file, shown at 20px ──────────────────────────────
  for (const [name, body] of Object.entries(CONTACT)) {
    for (const [ink, suffix] of [[CONTACT_INK, ""], [CONTACT_INK_LIGHT, "-w"]]) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">${body.replace(/CURRENT/g, ink)}</svg>`;
      await render(svg, `${name}${suffix}.png`);
      made++;
    }
  }

  // ── Social badges: brand-coloured 64px disc, shown at 32px ───────────────
  for (const p of SOCIAL_PLATFORMS) {
    const slug = SI_SLUG[p.key];
    if (!slug) continue;
    let d;
    try {
      d = await fetchGlyphPath(slug);
    } catch (e) {
      console.warn(`  ! skipped ${p.key} — ${e.message}`);
      continue;
    }
    const fg = p.fg || "#ffffff";
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
      `<circle cx="32" cy="32" r="32" fill="${p.color}"/>` +
      `<g transform="translate(17.6 17.6) scale(1.2)"><path d="${d}" fill="${fg}"/></g></svg>`;
    await render(svg, `s-${p.key}.png`);
    made++;
    process.stdout.write(`  ✓ ${p.key}\n`);
  }

  console.log(`\n✓ ${made} icons written to public/sig/`);
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
