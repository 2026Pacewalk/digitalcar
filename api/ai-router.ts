import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { lookup } from "node:dns/promises";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { enforceRateLimit, clientIp } from "./lib/rate-limit";

/* AI Card Generator (public, pre-signup). Generates a full card — content,
   design (template + colours) and an avatar suggestion — from a few business
   details. Uses Claude when ANTHROPIC_API_KEY is set, else a smart deterministic
   generator so it always works. Rate-limited per IP. */

export type AiService = { name: string; description: string };
export type AiCard = {
  tagline: string;
  about: string;
  services: AiService[];
  cta: string;
  seoTitle: string;
  seoDescription: string;
  theme: number;      // template style 1–31
  color: string;      // primary brand colour
  color2: string;     // dark/secondary colour
  avatarStyle: string; // short note describing the suggested monogram/logo look
  source: "ai" | "smart";
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const clampTheme = (n: unknown) => { const t = Math.round(Number(n) || 1); return t >= 1 && t <= 31 ? t : 1; };
const safeHex = (v: unknown, d: string) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim() : d);

/* Profession → palette + template, used by the fallback and to sanity-check AI. */
const PALETTES: { match: RegExp; color: string; color2: string; theme: number }[] = [
  { match: /real ?estate|property|realtor|builder/i, color: "#F7B31C", color2: "#0F172A", theme: 1 },
  { match: /doctor|clinic|dental|hospital|health|medical|physio|pharma/i, color: "#0EA5E9", color2: "#0C4A6E", theme: 3 },
  { match: /law|advocate|legal|attorney|ca\b|chartered|account|finance|tax|audit/i, color: "#334155", color2: "#0F172A", theme: 10 },
  { match: /photo|film|video|creative|art|design|studio/i, color: "#8B5CF6", color2: "#2E1065", theme: 5 },
  { match: /salon|beauty|spa|makeup|hair|cosmet/i, color: "#EC4899", color2: "#500724", theme: 8 },
  { match: /restaurant|cafe|food|catering|bakery|kitchen|chef/i, color: "#EF4444", color2: "#450a0a", theme: 7 },
  { match: /consult|coach|trainer|mentor|advisor|speaker/i, color: "#16A34A", color2: "#052e16", theme: 3 },
  { match: /tech|software|it\b|developer|digital|marketing|agency|startup/i, color: "#3B82F6", color2: "#0f2b2e", theme: 2 },
  { match: /education|school|tutor|academy|teacher|coaching/i, color: "#F97316", color2: "#431407", theme: 4 },
  { match: /insurance|loan|invest|wealth|banking/i, color: "#0D9488", color2: "#042f2e", theme: 3 },
];
const paletteFor = (profession: string) => PALETTES.find((p) => p.match.test(profession)) || { color: "#F7B31C", color2: "#0F172A", theme: 1 };

type Input = { businessName: string; profession: string; city?: string; phone?: string; about?: string };

async function claudeGenerate(input: Input): Promise<AiCard | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const prompt = `You are an expert brand & copywriter creating a digital business card.

Business name: ${input.businessName}
Profession / industry: ${input.profession}
City: ${input.city || "(not given)"}
Extra notes: ${input.about || "(none)"}

Write compelling, professional, India-appropriate content. Return ONLY a JSON object, no prose, exactly this shape:
{
  "tagline": "punchy tagline, max 55 chars",
  "about": "2-3 sentence first-person bio, warm and credible",
  "services": [{"name":"Service name","description":"one concise benefit line"}],
  "cta": "button text, max 22 chars (e.g. Book a Consultation)",
  "seoTitle": "SEO title, max 60 chars",
  "seoDescription": "SEO meta description, max 155 chars",
  "color": "#RRGGBB primary brand colour fitting this profession",
  "color2": "#RRGGBB darker complementary colour",
  "theme": 1,
  "avatarStyle": "one short line describing an ideal monogram/logo look"
}
Rules: 4-6 services. "theme" must be an integer 1-31 picking a card style that suits the profession. Colours must be valid 6-digit hex. Output valid JSON only.`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { content?: { text?: string }[] };
    const text = j?.content?.[0]?.text || "";
    const raw = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const p = JSON.parse(raw) as Record<string, unknown>;
    const pal = paletteFor(input.profession);
    const services = Array.isArray(p.services)
      ? (p.services as Record<string, unknown>[]).slice(0, 6).map((s) => ({ name: String(s.name || "").slice(0, 40), description: String(s.description || "").slice(0, 90) })).filter((s) => s.name)
      : [];
    if (!p.about || !services.length) return null;
    return {
      tagline: String(p.tagline || "").slice(0, 60),
      about: String(p.about).slice(0, 400),
      services,
      cta: String(p.cta || "Get in Touch").slice(0, 24),
      seoTitle: String(p.seoTitle || input.businessName).slice(0, 60),
      seoDescription: String(p.seoDescription || "").slice(0, 160),
      theme: clampTheme(p.theme),
      color: safeHex(p.color, pal.color),
      color2: safeHex(p.color2, pal.color2),
      avatarStyle: String(p.avatarStyle || "Clean monogram in your brand colour").slice(0, 120),
      source: "ai",
    };
  } catch { return null; }
}

function smartGenerate(input: Input): AiCard {
  const pal = paletteFor(input.profession);
  const biz = input.businessName.trim();
  const prof = input.profession.trim();
  const where = input.city ? ` in ${input.city}` : "";
  const svcSeed = [
    { name: "Consultation", description: "Free first consultation to understand your needs." },
    { name: "Personalised Service", description: "Tailored solutions built around your goals." },
    { name: "Expert Guidance", description: `Trusted ${prof.toLowerCase()} expertise you can rely on.` },
    { name: "Quick Turnaround", description: "Fast, dependable delivery every time." },
    { name: "After-service Support", description: "We stay with you well after the work is done." },
  ];
  return {
    tagline: `Trusted ${prof}${where}`.slice(0, 60),
    about: `Hi, I'm ${biz} — a dedicated ${prof.toLowerCase()}${where}. I help clients with honest advice, quality work and a personal touch. Reach out and let's get started.`.slice(0, 400),
    services: svcSeed.slice(0, 5),
    cta: "Get in Touch",
    seoTitle: `${biz} — ${prof}${where}`.slice(0, 60),
    seoDescription: `${biz}, a professional ${prof.toLowerCase()}${where}. Contact, services, and more on one smart digital card.`.slice(0, 155),
    theme: pal.theme,
    color: pal.color,
    color2: pal.color2,
    avatarStyle: `A clean monogram of "${(biz[0] || "D").toUpperCase()}" on a ${pal.color} background`,
    source: "smart",
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   "I have a website" — fetch the site and auto-extract everything for a card:
   business name, logo, brand colours, contact details, address/location,
   social links and content, then let Claude write the polished copy.
   ────────────────────────────────────────────────────────────────────────── */

export type WebExtract = {
  businessName: string; logo: string; color?: string; color2?: string;
  phone: string; email: string; address: string; city: string;
  url: string; socials: Record<string, string>;
};

const isPrivateIp = (ip: string) =>
  /^(127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1$|fc|fd|fe80)/i.test(ip) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(ip);

/** Validate + DNS-resolve a user URL, rejecting non-http(s) and private/loopback
    hosts (SSRF guard). Returns the normalised URL. */
async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw.trim()); }
  catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Please enter a valid website address." }); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new TRPCError({ code: "BAD_REQUEST", message: "Only http(s) websites are supported." });
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test"))
    throw new TRPCError({ code: "BAD_REQUEST", message: "That address can't be reached." });
  try { const { address } = await lookup(host); if (isPrivateIp(address)) throw new Error("private"); }
  catch { throw new TRPCError({ code: "BAD_REQUEST", message: "We couldn't reach that website. Check the address and try again." }); }
  return u;
}

async function fetchSiteHtml(u: URL): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(u.toString(), {
      signal: ctrl.signal, redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; DigitalCardaBot/1.0; +https://digitalcarda.in)", accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) throw new TRPCError({ code: "BAD_REQUEST", message: `The website responded with ${res.status}. Try another URL.` });
    if (!/text\/html|xhtml/i.test(res.headers.get("content-type") || "")) throw new TRPCError({ code: "BAD_REQUEST", message: "That link isn't a web page." });
    return (await res.text()).slice(0, 1_500_000);
  } catch (e) {
    if (e instanceof TRPCError) throw e;
    throw new TRPCError({ code: "BAD_REQUEST", message: "We couldn't load that website. It may be down or blocking bots." });
  } finally { clearTimeout(timer); }
}

const absUrl = (src: string, base: URL) => { try { return new URL(src, base).toString(); } catch { return ""; } };
const decodeEnt = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ");
const meta = (html: string, key: string) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1]
  || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, "i"))?.[1] || "";

function pickBrandColours(html: string): { color?: string; color2?: string } {
  const lum = (h: string) => { const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const sat = (h: string) => { const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
  const freq = new Map<string, number>();
  for (const h of html.match(/#[0-9a-fA-F]{6}\b/g) || []) { const k = h.toLowerCase(); freq.set(k, (freq.get(k) || 0) + 1); }
  const themeMeta = meta(html, "theme-color");
  const vivid = [...freq.entries()].filter(([h]) => { const l = lum(h); return l > 0.12 && l < 0.88 && sat(h) > 0.28; })
    .sort((a, b) => b[1] * (0.5 + sat(b[0])) - a[1] * (0.5 + sat(a[0])));
  // Trust theme-color only when it's a usable accent (not near-black/white/grey);
  // otherwise use the most prominent vivid colour on the page.
  const usableTheme = !!themeMeta && HEX.test(themeMeta) && lum(themeMeta) > 0.18 && lum(themeMeta) < 0.85 && sat(themeMeta) > 0.22;
  const color = usableTheme ? themeMeta.toLowerCase() : vivid[0]?.[0];
  const color2 = [...freq.entries()].filter(([h]) => lum(h) < 0.22).sort((a, b) => b[1] - a[1])[0]?.[0];
  return { color, color2 };
}

function extractSite(html: string, base: URL): WebExtract {
  const strip = decodeEnt(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim();
  const siteName = meta(html, "og:site_name") || title.split(/[|\-–—·]/)[0].trim() || base.hostname.replace(/^www\./, "");

  // JSON-LD (schema.org) is the richest source for name / phone / address.
  let ldName = "", ldPhone = "", ldStreet = "", ldCity = "", ldRegion = "", ldZip = "";
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (o: unknown): void => {
        if (!o || typeof o !== "object") return;
        if (Array.isArray(o)) { o.forEach(walk); return; }
        const r = o as Record<string, unknown>;
        if (!ldName && typeof r.name === "string") ldName = r.name;
        if (!ldPhone && typeof r.telephone === "string") ldPhone = r.telephone;
        const a = r.address as Record<string, unknown> | undefined;
        if (a && typeof a === "object") {
          ldStreet = ldStreet || String(a.streetAddress || "");
          ldCity = ldCity || String(a.addressLocality || "");
          ldRegion = ldRegion || String(a.addressRegion || "");
          ldZip = ldZip || String(a.postalCode || "");
        }
        Object.values(r).forEach(walk);
      };
      walk(JSON.parse(m[1]));
    } catch { /* ignore malformed JSON-LD */ }
  }

  // Logo: a real <img> whose src/alt/class mentions "logo" wins over og:image (often a banner).
  const logoImg = html.match(/<img[^>]*(?:class|id|alt|src)=["'][^"']*logo[^"']*["'][^>]*>/i)?.[0];
  const logoSrc = logoImg?.match(/\ssrc=["']([^"']+)["']/i)?.[1]
    || html.match(/<link[^>]+rel=["'][^"']*(?:apple-touch-icon|icon)[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1]
    || meta(html, "og:image");
  const logo = logoSrc ? absUrl(logoSrc, base) : "";

  const telHref = html.match(/href=["']tel:([^"']+)["']/i)?.[1];
  const phone = (telHref || ldPhone || strip.match(/(?:\+?91[\s-]?)?[6-9]\d{9}/)?.[0] || "").replace(/[^\d+]/g, "");
  const mailHref = html.match(/href=["']mailto:([^"'?]+)["']/i)?.[1];
  let email = mailHref || strip.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0] || "";
  if (/\.(png|jpg|jpeg|gif|webp)$/i.test(email) || /sentry|example|wixpress|godaddy/i.test(email)) email = "";

  const address = [ldStreet, ldCity, ldRegion, ldZip].filter(Boolean).join(", ");
  const socials: Record<string, string> = {};
  for (const [key, re] of [["facebook", "facebook\\.com"], ["instagram", "instagram\\.com"], ["twitter", "(?:twitter|x)\\.com"], ["youtube", "youtube\\.com|youtu\\.be"], ["linkedin", "linkedin\\.com"], ["pinterest", "pinterest\\."]] as const) {
    const m = html.match(new RegExp(`href=["'](https?:\\/\\/[^"']*(?:${re})[^"']*)["']`, "i"));
    if (m && !/sharer|intent|share\?/.test(m[1])) socials[key] = m[1];
  }

  const { color, color2 } = pickBrandColours(html);
  return {
    businessName: decodeEnt(ldName || siteName).slice(0, 80),
    logo, color, color2, phone, email,
    address: address.slice(0, 240), city: (ldCity || "").slice(0, 60),
    url: base.origin, socials,
  };
}

type SiteSignals = { title: string; description: string; headings: string[]; bodyText: string };

/** Parse the reliable content signals out of a page. */
function parseSiteSignals(html: string): SiteSignals {
  const title = decodeEnt((html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim());
  const description = decodeEnt(meta(html, "description") || meta(html, "og:description") || "");
  const grab = (tag: string) => [...html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))].map((m) => decodeEnt(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()).filter(Boolean);
  const headings = [...grab("h1"), ...grab("h2"), ...grab("h3")];
  const bodyText = decodeEnt(html.replace(/<(script|style|nav|footer)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 1800);
  return { title, description, headings, bodyText };
}

/** Compact site-content string used as the AI's source material. */
function siteContentForAi(sig: SiteSignals): string {
  return `Title: ${sig.title}\nDescription: ${sig.description}\nHeadings: ${sig.headings.slice(0, 24).join(" | ")}\n\nPage text: ${sig.bodyText}`;
}

const SVC_NOISE = /currency|cart|password|log ?in|sign ?in|sign ?up|register|reset|regional|settings|menu|search|newsletter|subscribe|cookie|copyright|©|^home$|about ?us|about ?me|^about$|contact|privacy|terms|faq|blog|shipping|return|wishlist|checkout|my account|^account$|follow us|get in touch|read more/i;
const SVC_IMPERATIVE = /^(explore|discover|welcome|create your|unlock|know more|view all|see all|shop|browse|find|start|get your|our story|why choose)/i;

/** Build a card from the REAL extracted site content — used when Claude isn't
    configured, so results still reflect the actual website (not generic copy). */
function cardFromWebContent(web: WebExtract, sig: SiteSignals): AiCard {
  const biz = web.businessName || sig.title || "Your Business";
  const desc = sig.description.trim();
  const titleBits = sig.title.split(/[|\-–—·:]/).map((x) => x.trim()).filter((p) => p && p.toLowerCase() !== biz.toLowerCase() && !/^home$/i.test(p));
  let tagline = (titleBits.sort((a, b) => b.length - a.length)[0] || desc.split(/[.!?]/)[0] || biz).trim();
  if (tagline.length > 60) tagline = tagline.slice(0, 57).trim() + "…";
  const about = (desc || `Welcome to ${biz}. Explore what we offer and get in touch.`).slice(0, 400);

  const seen = new Set<string>();
  let services = sig.headings
    .map((h) => h.replace(/\s*\|.*$/, "").replace(/\b(?:IM|R|P|IN)-?\d+.*$/i, "").trim())
    .filter((h) => h.length >= 4 && h.length <= 42 && !SVC_NOISE.test(h) && !SVC_IMPERATIVE.test(h) && h.toLowerCase() !== biz.toLowerCase())
    .filter((h) => { const k = h.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 6)
    .map((name) => ({ name, description: "" }));
  if (services.length < 2) services = [{ name: "Our Services", description: "Explore what we offer — get in touch to know more." }];

  const pal = paletteFor(`${biz} ${desc} ${sig.title}`);
  return {
    tagline, about, services, cta: "Get in Touch",
    seoTitle: (sig.title || biz).slice(0, 60),
    seoDescription: desc.slice(0, 155),
    theme: pal.theme, color: web.color || pal.color, color2: web.color2 || pal.color2,
    avatarStyle: `Your logo from ${web.url.replace(/^https?:\/\//, "")}`,
    source: "smart",
  };
}

export const aiRouter = createRouter({
  // Generate a full card from business details (Claude, or smart fallback).
  generate: publicQuery
    .input(z.object({
      businessName: z.string().min(1).max(80),
      profession: z.string().min(1).max(60),
      city: z.string().max(60).optional(),
      phone: z.string().max(30).optional(),
      about: z.string().max(400).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ip = clientIp(ctx.req);
      enforceRateLimit(`aigen:${ip}`, 20, 60 * 60_000); // 20/hour per IP
      const ai = await claudeGenerate(input);
      const result = ai || smartGenerate(input);
      // Log the attempt so admins can track who's trying the feature (best-effort).
      try {
        const { getDb } = await import("./queries/connection");
        const { aiGenerations } = await import("@db/schema");
        await getDb().insert(aiGenerations).values({
          businessName: input.businessName.slice(0, 120),
          profession: input.profession.slice(0, 80),
          city: input.city?.slice(0, 80) || null,
          phone: input.phone?.slice(0, 30) || null,
          source: result.source,
          ip: ip.slice(0, 64),
        });
      } catch { /* logging must never break generation */ }
      return result;
    }),

  // "I have a website" — fetch the site, extract branding + contacts + content,
  // and let Claude (or the smart fallback) write the polished card copy.
  fromWebsite: publicQuery
    .input(z.object({ url: z.string().min(3).max(300) }))
    .mutation(async ({ ctx, input }) => {
      const ip = clientIp(ctx.req);
      enforceRateLimit(`aiweb:${ip}`, 12, 60 * 60_000); // 12/hour per IP (fetch is heavier)
      const u = await assertPublicUrl(input.url);
      const html = await fetchSiteHtml(u);
      const web = extractSite(html, u);
      const sig = parseSiteSignals(html);

      // Write the card copy. With Claude configured it polishes the real site
      // content; without it, we build the card from the extracted content itself
      // (accurate tagline/about/services) — never the generic placeholder copy.
      const gen = (await claudeGenerate({ businessName: web.businessName, profession: "", city: web.city, about: siteContentForAi(sig) }))
        || cardFromWebContent(web, sig);

      // Prefer the real brand colours pulled from the site when we found them.
      const card: AiCard = { ...gen, color: safeHex(web.color, gen.color), color2: safeHex(web.color2, gen.color2) };

      try {
        const { getDb } = await import("./queries/connection");
        const { aiGenerations } = await import("@db/schema");
        await getDb().insert(aiGenerations).values({
          businessName: web.businessName.slice(0, 120), profession: "website-import",
          city: web.city.slice(0, 80) || null, phone: web.phone.slice(0, 30) || null,
          source: card.source, ip: ip.slice(0, 64),
        });
      } catch { /* logging must never break generation */ }

      return { ...card, web };
    }),

  // Regenerate a single piece (tagline / about / one service / cta).
  regenerate: publicQuery
    .input(z.object({
      businessName: z.string().min(1).max(80),
      profession: z.string().min(1).max(60),
      city: z.string().max(60).optional(),
      section: z.enum(["tagline", "about", "services", "cta"]),
    }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`airegen:${clientIp(ctx.req)}`, 40, 60 * 60_000);
      const full = (await claudeGenerate(input)) || smartGenerate(input);
      return {
        section: input.section,
        value: input.section === "tagline" ? full.tagline
          : input.section === "about" ? full.about
          : input.section === "cta" ? full.cta
          : full.services,
        source: full.source,
      };
    }),

  // Admin: recent AI-generator usage — who's trying the feature.
  list: adminQuery.query(async () => {
    const { getDb } = await import("./queries/connection");
    const { aiGenerations } = await import("@db/schema");
    const { desc } = await import("drizzle-orm");
    const rows = await getDb().select().from(aiGenerations).orderBy(desc(aiGenerations.createdAt)).limit(300);
    return rows;
  }),
});
