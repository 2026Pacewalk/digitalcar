import { z } from "zod";
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
