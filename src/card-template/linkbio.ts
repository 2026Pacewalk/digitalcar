/*
 * Link-in-bio ("Linktree-style") card layout.
 * A clean, minimal alternative to the business-card templates: a photo or a
 * left-aligned brand name, the tagline, a stack of full-width label-only link
 * buttons, social icons, and a small scan pill at the foot.
 *
 * Link buttons are auto-generated from what the customer already filled in
 * (Call, WhatsApp, Website, Email, Directions + each Product/Service), so any
 * existing card instantly has a beautiful Linktree view — zero extra setup.
 *
 * These are the templates numbered LINKBIO_START … (LINKBIO_START + variants − 1).
 */

import { resolveCardBg, cardBgOverrideCss } from "./cardBackground";
import { shareSheetCss, shareSheetHtml, shareSheetJs } from "./shareSheet";
import { CONTRAST_GUARD_SCRIPT } from "./contrast";
import { safeExternalUrl } from "@/lib/url";

type LBProduct = { name: string; button?: string; button_title?: string };
type LBRecord = Record<string, unknown>;

const s = (v: unknown) => String(v ?? "").trim();
const esc = (v: unknown) => s(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const IMG = 'referrerpolicy="no-referrer"';

const SOCIAL_FA: Record<string, string> = {
  facebook: "fab fa-facebook-f", instagram: "fab fa-instagram", youtube: "fab fa-youtube",
  twitter: "fab fa-twitter", pinterest: "fab fa-pinterest-p", linkedin: "fab fa-linkedin",
};

/* The first template number that maps to a link-in-bio design. 1..31 are the
   legacy business-card styles; link-bio variants start right after. */
export const LINKBIO_START = 32;

export type LinkBioVariant = { id: number; name: string; swatch: string; css: string };

/* Eight premium aesthetics. `id` is the absolute template number the customer
   stores (LINKBIO_START + index). `swatch` drives the catalog thumbnail dot.
   Each `css` only sets variables + a few flourishes; the base CSS does the rest. */
export function linkBioVariants(accent: string): LinkBioVariant[] {
  const a = accent || "#F7B31C";
  const defs: Omit<LinkBioVariant, "id">[] = [
    {
      name: "Ivory Bloom", swatch: "#EBE3D5",
      css: `
        --lb-bg:radial-gradient(120% 80% at 50% 0%,#fbf6ee 0%,#f3ece0 55%,#ece2d2 100%);
        --lb-text:#2a2320; --lb-sub:#8a7d6d; --lb-name-font:'Playfair Display',serif; --lb-name-weight:600;
        --lb-btn-bg:rgba(255,255,255,.72); --lb-btn-text:#37302a; --lb-btn-border:1px solid rgba(120,100,80,.16);
        --lb-btn-shadow:0 2px 10px rgba(120,100,80,.08); --lb-btn-hover:#fff; --lb-radius:12px;
        --lb-ring:rgba(255,255,255,.9); --lb-social:#6b5f52; --lb-accent:${a};
        --lb-art:radial-gradient(circle at 18% 12%,rgba(201,162,75,.18) 0 90px,transparent 91px),radial-gradient(circle at 88% 30%,rgba(190,160,120,.16) 0 120px,transparent 121px),radial-gradient(rgba(140,115,85,.16) 1.4px,transparent 1.5px);--lb-art-size:auto,auto,22px 22px;--lb-art-repeat:no-repeat,no-repeat,repeat;
        --lb-photo:url('/demo/bio/ivory.webp'); --lb-scrim:linear-gradient(180deg,rgba(251,246,238,.80),rgba(236,226,210,.90));`,
    },
    {
      name: "Aurora Glass", swatch: "#8b5cf6",
      css: `
        --lb-bg:linear-gradient(160deg,#6d28d9 0%,#9333ea 42%,#db2777 100%);
        --lb-text:#ffffff; --lb-sub:rgba(255,255,255,.82); --lb-name-font:'Poppins',sans-serif; --lb-name-weight:700;
        --lb-btn-bg:rgba(255,255,255,.16); --lb-btn-text:#ffffff; --lb-btn-border:1px solid rgba(255,255,255,.28);
        --lb-btn-shadow:0 6px 20px rgba(0,0,0,.18); --lb-btn-hover:rgba(255,255,255,.28); --lb-radius:14px;
        --lb-ring:rgba(255,255,255,.55); --lb-social:#ffffff; --lb-glass:1; --lb-accent:#ffffff;
        --lb-art:radial-gradient(circle at 12% 18%,rgba(255,255,255,.26) 0 150px,transparent 151px),radial-gradient(circle at 92% 8%,rgba(56,189,248,.35) 0 180px,transparent 181px),radial-gradient(circle at 78% 86%,rgba(251,191,36,.28) 0 200px,transparent 201px);--lb-art-repeat:no-repeat;
        --lb-photo:url('/demo/bio/aurora.webp'); --lb-scrim:linear-gradient(160deg,rgba(109,40,217,.72),rgba(219,39,119,.78));`,
    },
    {
      name: "Midnight Neon", swatch: "#0ea5e9",
      css: `
        --lb-bg:radial-gradient(120% 90% at 50% -10%,#132033 0%,#0b1220 60%,#070b14 100%);
        --lb-text:#f1f5f9; --lb-sub:#94a3b8; --lb-name-font:'Poppins',sans-serif; --lb-name-weight:700;
        --lb-btn-bg:rgba(255,255,255,.04); --lb-btn-text:#e2e8f0; --lb-btn-border:1px solid ${a}66;
        --lb-btn-shadow:0 0 0 1px ${a}22, 0 6px 22px rgba(0,0,0,.4); --lb-btn-hover:${a}1f; --lb-radius:12px;
        --lb-ring:${a}; --lb-social:#cbd5e1; --lb-accent:${a};
        --lb-art:linear-gradient(rgba(148,163,184,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.14) 1px,transparent 1px),radial-gradient(circle at 50% -10%,rgba(14,165,233,.30) 0 240px,transparent 241px);--lb-art-size:34px 34px,34px 34px,auto;--lb-art-repeat:repeat,repeat,no-repeat;
        --lb-photo:url('/demo/bio/midnight.webp'); --lb-scrim:linear-gradient(180deg,rgba(11,18,32,.74),rgba(7,11,20,.90));`,
    },
    {
      name: "Sunset Warm", swatch: "#fb7185",
      css: `
        --lb-bg:linear-gradient(160deg,#fb923c 0%,#f43f5e 55%,#e11d48 100%);
        --lb-text:#ffffff; --lb-sub:rgba(255,255,255,.9); --lb-name-font:'Poppins',sans-serif; --lb-name-weight:700;
        --lb-btn-bg:#ffffff; --lb-btn-text:#b21e3a; --lb-btn-border:none;
        --lb-btn-shadow:0 8px 22px rgba(0,0,0,.16); --lb-btn-hover:#fff5f6; --lb-radius:14px;
        --lb-ring:rgba(255,255,255,.85); --lb-social:#ffffff; --lb-accent:#ffffff;
        --lb-art:repeating-conic-gradient(from 200deg at 50% -20%,rgba(255,255,255,.14) 0 6deg,transparent 6deg 14deg),radial-gradient(circle at 50% -12%,rgba(255,237,213,.5) 0 150px,transparent 151px);--lb-art-repeat:no-repeat;
        --lb-photo:url('/demo/bio/sunset.webp'); --lb-scrim:linear-gradient(160deg,rgba(251,146,60,.70),rgba(225,29,72,.80));`,
    },
    {
      name: "Ocean Frost", swatch: "#0891b2",
      css: `
        --lb-bg:linear-gradient(160deg,#22d3ee 0%,#0891b2 45%,#0e7490 100%);
        --lb-text:#ffffff; --lb-sub:rgba(255,255,255,.85); --lb-name-font:'Poppins',sans-serif; --lb-name-weight:700;
        --lb-btn-bg:rgba(255,255,255,.18); --lb-btn-text:#ffffff; --lb-btn-border:1px solid rgba(255,255,255,.3);
        --lb-btn-shadow:0 6px 20px rgba(0,0,0,.14); --lb-btn-hover:rgba(255,255,255,.3); --lb-radius:14px;
        --lb-ring:rgba(255,255,255,.6); --lb-social:#ffffff; --lb-glass:1; --lb-accent:#ffffff;
        --lb-art:repeating-radial-gradient(circle at 50% 118%,rgba(255,255,255,.16) 0 2px,transparent 2px 46px),radial-gradient(circle at 14% 14%,rgba(255,255,255,.22) 0 120px,transparent 121px);--lb-art-repeat:no-repeat;
        --lb-photo:url('/demo/bio/ocean.webp'); --lb-scrim:linear-gradient(160deg,rgba(34,211,238,.62),rgba(14,116,144,.82));`,
    },
    {
      name: "Noir Bold", swatch: "#111111",
      css: `
        --lb-bg:#0a0a0a; --lb-text:#ffffff; --lb-sub:#a1a1aa; --lb-name-font:'Poppins',sans-serif; --lb-name-weight:800;
        --lb-btn-bg:#ffffff; --lb-btn-text:#0a0a0a; --lb-btn-border:none;
        --lb-btn-shadow:0 6px 18px rgba(0,0,0,.5); --lb-btn-hover:#eaeaea; --lb-radius:999px;
        --lb-ring:#ffffff; --lb-social:#ffffff; --lb-accent:#ffffff;
        --lb-art:radial-gradient(rgba(255,255,255,.16) 2.2px,transparent 2.3px);--lb-art-size:26px 26px;
        --lb-photo:url('/demo/bio/noir.webp'); --lb-scrim:linear-gradient(180deg,rgba(10,10,10,.72),rgba(10,10,10,.90));`,
    },
    {
      name: "Peach Soft", swatch: "#fecaca",
      css: `
        --lb-bg:linear-gradient(160deg,#fff1f2 0%,#ffe4e6 50%,#fecdd3 100%);
        --lb-text:#7a3b3b; --lb-sub:#b08585; --lb-name-font:'Playfair Display',serif; --lb-name-weight:600;
        --lb-btn-bg:rgba(255,255,255,.8); --lb-btn-text:#8a4a4a; --lb-btn-border:1px solid rgba(190,120,120,.18);
        --lb-btn-shadow:0 4px 14px rgba(190,120,120,.14); --lb-btn-hover:#fff; --lb-radius:14px;
        --lb-ring:#ffffff; --lb-social:#a56a6a; --lb-accent:#e26d6d;
        --lb-art:radial-gradient(circle at 20% 16%,rgba(255,255,255,.75) 0 110px,transparent 111px),radial-gradient(rgba(244,114,128,.30) 2px,transparent 2.1px),radial-gradient(rgba(251,191,36,.26) 1.6px,transparent 1.7px);--lb-art-size:auto,54px 54px,38px 38px;--lb-art-pos:0 0,0 0,19px 24px;--lb-art-repeat:no-repeat,repeat,repeat;
        --lb-photo:url('/demo/bio/peach.webp'); --lb-scrim:linear-gradient(180deg,rgba(255,241,242,.82),rgba(254,205,211,.88));`,
    },
    {
      name: "Gold Luxe", swatch: "#c9a24b",
      css: `
        --lb-bg:radial-gradient(120% 90% at 50% -10%,#20242c 0%,#14171d 60%,#0d0f13 100%);
        --lb-text:#f5eede; --lb-sub:#b8ab8c; --lb-name-font:'Playfair Display',serif; --lb-name-weight:600;
        --lb-btn-bg:rgba(201,162,75,.08); --lb-btn-text:#f0e6cf; --lb-btn-border:1px solid rgba(201,162,75,.55);
        --lb-btn-shadow:0 6px 20px rgba(0,0,0,.35); --lb-btn-hover:rgba(201,162,75,.18); --lb-radius:10px;
        --lb-ring:#c9a24b; --lb-social:#d8c491; --lb-accent:#c9a24b;
        --lb-art:repeating-linear-gradient(135deg,rgba(201,162,75,.12) 0 1px,transparent 1px 12px),radial-gradient(circle at 50% -8%,rgba(201,162,75,.26) 0 200px,transparent 201px);--lb-art-repeat:repeat,no-repeat;
        --lb-photo:url('/demo/bio/gold.webp'); --lb-scrim:linear-gradient(180deg,rgba(20,23,29,.78),rgba(13,15,19,.92));`,
    },
    {
      name: "Neon Cyber", swatch: "#22d3ee",
      css: `
        --lb-bg:radial-gradient(120% 90% at 50% -10%,#0b1020 0%,#070a14 60%,#04060c 100%);
        --lb-text:#e8fbff; --lb-sub:#7fd8e8; --lb-name-font:'Poppins',sans-serif; --lb-name-weight:800;
        --lb-btn-bg:rgba(10,20,35,.6); --lb-btn-text:#c9f7ff; --lb-btn-border:1px solid rgba(34,211,238,.55);
        --lb-btn-shadow:0 0 14px rgba(34,211,238,.33),inset 0 0 0 1px rgba(34,211,238,.2); --lb-btn-hover:rgba(34,211,238,.14); --lb-radius:10px;
        --lb-ring:#22d3ee; --lb-social:#67e8f9; --lb-accent:#22d3ee;
        --lb-art:linear-gradient(rgba(34,211,238,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,.12) 1px,transparent 1px),radial-gradient(circle at 50% 108%,rgba(34,211,238,.30) 0 220px,transparent 221px);--lb-art-size:40px 40px,40px 40px,auto;--lb-art-repeat:repeat,repeat,no-repeat;
        --lb-photo:url('/demo/bio/cyber.webp'); --lb-scrim:linear-gradient(180deg,rgba(11,16,32,.78),rgba(4,6,12,.92));`,
    },
    {
      name: "Retro Groove", swatch: "#d99a5b",
      css: `
        --lb-bg:linear-gradient(160deg,#f4e3c1 0%,#e9c893 55%,#d99a5b 100%);
        --lb-text:#5a3b1e; --lb-sub:#8a6a45; --lb-name-font:'Poppins',sans-serif; --lb-name-weight:800;
        --lb-btn-bg:#fff7ea; --lb-btn-text:#7a4b22; --lb-btn-border:2px solid #7a4b22;
        --lb-btn-shadow:3px 3px 0 #7a4b22; --lb-btn-hover:#ffefd6; --lb-radius:14px;
        --lb-ring:#fff7ea; --lb-social:#7a4b22; --lb-accent:#c2410c;
        --lb-art:repeating-linear-gradient(135deg,rgba(122,75,34,.14) 0 14px,transparent 14px 34px),radial-gradient(circle at 86% 10%,rgba(255,247,234,.6) 0 110px,transparent 111px);--lb-art-repeat:repeat,no-repeat;
        --lb-photo:url('/demo/bio/retro.webp'); --lb-scrim:linear-gradient(160deg,rgba(244,227,193,.80),rgba(217,154,91,.86));`,
    },
    {
      name: "Editorial", swatch: "#111111",
      css: `
        --lb-bg:#ffffff; --lb-text:#0a0a0a; --lb-sub:#6b7280; --lb-name-font:'Playfair Display',serif; --lb-name-weight:700;
        --lb-btn-bg:#ffffff; --lb-btn-text:#111111; --lb-btn-border:1.5px solid #111111;
        --lb-btn-shadow:none; --lb-btn-hover:#f3f4f6; --lb-radius:0px;
        --lb-ring:#111111; --lb-social:#111111; --lb-accent:#111111;
        --lb-art:linear-gradient(rgba(17,17,17,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(17,17,17,.07) 1px,transparent 1px);--lb-art-size:28px 28px;
        --lb-photo:url('/demo/bio/editorial.webp'); --lb-scrim:linear-gradient(180deg,rgba(255,255,255,.86),rgba(255,255,255,.92));`,
    },
    {
      name: "Mint Fresh", swatch: "#34d399",
      css: `
        --lb-bg:linear-gradient(160deg,#d1fae5 0%,#6ee7b7 55%,#34d399 100%);
        --lb-text:#064e3b; --lb-sub:#0f766e; --lb-name-font:'Poppins',sans-serif; --lb-name-weight:700;
        --lb-btn-bg:#ffffff; --lb-btn-text:#065f46; --lb-btn-border:none;
        --lb-btn-shadow:0 6px 18px rgba(6,95,70,.14); --lb-btn-hover:#ecfdf5; --lb-radius:14px;
        --lb-ring:rgba(255,255,255,.85); --lb-social:#065f46; --lb-accent:#059669;
        --lb-art:radial-gradient(circle at 10% 10%,rgba(255,255,255,.55) 0 130px,transparent 131px),radial-gradient(circle at 94% 36%,rgba(255,255,255,.4) 0 110px,transparent 111px),radial-gradient(rgba(6,95,70,.14) 1.6px,transparent 1.7px);--lb-art-size:auto,auto,30px 30px;--lb-art-repeat:no-repeat,no-repeat,repeat;
        --lb-photo:url('/demo/bio/mint.webp'); --lb-scrim:linear-gradient(160deg,rgba(209,250,229,.78),rgba(52,211,153,.84));`,
    },
    {
      name: "Lavender Dream", swatch: "#a78bfa",
      css: `
        --lb-bg:linear-gradient(160deg,#ede9fe 0%,#c4b5fd 55%,#a78bfa 100%);
        --lb-text:#4c1d95; --lb-sub:#6d28d9; --lb-name-font:'Playfair Display',serif; --lb-name-weight:600;
        --lb-btn-bg:rgba(255,255,255,.82); --lb-btn-text:#5b21b6; --lb-btn-border:1px solid rgba(124,58,237,.18);
        --lb-btn-shadow:0 4px 16px rgba(124,58,237,.15); --lb-btn-hover:#fff; --lb-radius:14px;
        --lb-ring:#ffffff; --lb-social:#7c3aed; --lb-accent:#7c3aed;
        --lb-art:radial-gradient(rgba(255,255,255,.9) 1.8px,transparent 1.9px),radial-gradient(rgba(124,58,237,.22) 1.2px,transparent 1.3px),radial-gradient(circle at 84% 12%,rgba(255,255,255,.6) 0 120px,transparent 121px);--lb-art-size:46px 46px,32px 32px,auto;--lb-art-pos:0 0,16px 20px,0 0;--lb-art-repeat:repeat,repeat,no-repeat;
        --lb-photo:url('/demo/bio/lavender.webp'); --lb-scrim:linear-gradient(160deg,rgba(237,233,254,.76),rgba(167,139,250,.84));`,
    },
    {
      // Corporate navy + gold — like a premium business card.
      name: "Corporate Navy", swatch: "#12263d",
      css: `
        --lb-bg:radial-gradient(120% 90% at 50% -10%,#1c3d61 0%,#12263d 55%,#0a1826 100%);
        --lb-text:#eaf2fb; --lb-sub:#9db4cc; --lb-name-font:'Poppins',sans-serif; --lb-name-weight:700;
        --lb-btn-bg:rgba(255,255,255,.05); --lb-btn-text:#eaf2fb; --lb-btn-border:1px solid ${a}88;
        --lb-btn-shadow:0 6px 20px rgba(0,0,0,.42); --lb-btn-hover:${a}1f; --lb-radius:12px;
        --lb-ring:${a}; --lb-social:#cfe0f0; --lb-accent:${a};
        --lb-art:repeating-linear-gradient(45deg,rgba(255,255,255,.05) 0 1px,transparent 1px 10px),repeating-linear-gradient(-45deg,rgba(255,255,255,.05) 0 1px,transparent 1px 10px);
        --lb-photo:url('/demo/bio/navy.webp'); --lb-scrim:linear-gradient(180deg,rgba(28,61,97,.78),rgba(10,24,38,.90));`,
    },
    {
      // Deep emerald + gold — a prestige / membership look.
      name: "Emerald Prestige", swatch: "#0f5132",
      css: `
        --lb-bg:radial-gradient(120% 90% at 50% -10%,#125c39 0%,#0b3d26 55%,#062417 100%);
        --lb-text:#f4f1e4; --lb-sub:#bcd6c6; --lb-name-font:'Playfair Display',serif; --lb-name-weight:600;
        --lb-btn-bg:rgba(212,175,55,.08); --lb-btn-text:#f6f0da; --lb-btn-border:1px solid ${a}99;
        --lb-btn-shadow:0 6px 20px rgba(0,0,0,.38); --lb-btn-hover:${a}26; --lb-radius:10px;
        --lb-ring:${a}; --lb-social:#e6d9a8; --lb-accent:${a};
        --lb-art:repeating-linear-gradient(45deg,rgba(212,175,55,.10) 0 1px,transparent 1px 22px),repeating-linear-gradient(-45deg,rgba(212,175,55,.10) 0 1px,transparent 1px 22px),radial-gradient(circle at 50% -6%,rgba(212,175,55,.22) 0 180px,transparent 181px);--lb-art-repeat:repeat,repeat,no-repeat;
        --lb-photo:url('/demo/bio/emerald.webp'); --lb-scrim:linear-gradient(180deg,rgba(18,92,57,.78),rgba(6,36,23,.92));`,
    },
    {
      // Clean white + deep navy — a crisp corporate / ID-card feel.
      name: "Executive", swatch: "#12263d",
      css: `
        --lb-bg:radial-gradient(120% 80% at 50% 0%,#ffffff 0%,#f2f6fb 60%,#e6edf6 100%);
        --lb-text:#12263d; --lb-sub:#5a708a; --lb-name-font:'Poppins',sans-serif; --lb-name-weight:700;
        --lb-btn-bg:#12263d; --lb-btn-text:#ffffff; --lb-btn-border:none;
        --lb-btn-shadow:0 8px 20px rgba(18,38,61,.22); --lb-btn-hover:#1c3d61; --lb-radius:12px;
        --lb-ring:#12263d; --lb-social:#12263d; --lb-accent:#12263d;
        --lb-art:repeating-radial-gradient(circle at 50% -40%,rgba(18,38,61,.06) 0 1px,transparent 1px 40px);--lb-art-repeat:no-repeat;
        --lb-photo:url('/demo/bio/executive.webp'); --lb-scrim:linear-gradient(180deg,rgba(255,255,255,.84),rgba(230,237,246,.92));`,
    },
  ];
  return defs.map((d, i) => ({ ...d, id: LINKBIO_START + i }));
}

export const LINKBIO_COUNT = linkBioVariants("#000").length;

/* Themes whose header runs left with no avatar — the brand name leads, the way
   an editorial link page reads. */
const HEAD_LEFT = new Set([LINKBIO_START + 9, LINKBIO_START + 10, LINKBIO_START + 7, LINKBIO_START + 13]);

/* Base CSS — consumes the variant's CSS variables. */
const BASE_CSS = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{margin:0;padding:0;}
body.lb{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--lb-bg);color:var(--lb-text);min-height:100vh;}
/* Photo themes: the picture sits behind everything, the theme gradient over it
   as a scrim, so the name and buttons keep their contrast on any image. */
body.lb[data-photo]{background:var(--lb-scrim,linear-gradient(180deg,rgba(0,0,0,.2),rgba(0,0,0,.45))),var(--lb-photo) center/cover no-repeat fixed,var(--lb-bg);}
/* Decorative background art — the graphic layer that gives each theme its
   personality (dots, grids, waves, stripes…). Pure CSS, so it costs nothing to
   load and scales on any screen. A customer's own background image replaces it. */
body.lb::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:var(--lb-art,none);background-size:var(--lb-art-size,auto);
  background-position:var(--lb-art-pos,0 0);background-repeat:var(--lb-art-repeat,repeat);
  opacity:var(--lb-art-opacity,1);}
/* A left-aligned header (no avatar) for the themes that lead with the brand
   name rather than a face. */
body[data-head="left"] .lb-wrap{text-align:left;align-items:stretch;}
body[data-head="left"] .lb-avatar-wrap{display:none;}
body[data-head="left"] .lb-name{font-size:34px;line-height:1.05;margin-top:8px;}
body[data-head="left"] .lb-bio,body[data-head="left"] .lb-handle{max-width:none;}
body[data-head="left"] .lb-social{justify-content:flex-start;}
body[data-head="left"] .lb-qr{align-self:flex-start;}
.lb-wrap{position:relative;z-index:1;max-width:480px;margin:0 auto;padding:38px 22px 30px;display:flex;flex-direction:column;align-items:center;text-align:center;min-height:100vh;}
.lb-avatar{width:96px;height:96px;border-radius:50%;overflow:hidden;background:rgba(255,255,255,.2);box-shadow:0 0 0 3px var(--lb-ring),0 10px 30px rgba(0,0,0,.22);margin-bottom:16px;display:flex;align-items:center;justify-content:center;}
.lb-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
/* Square shape — a rounded tile instead of a circle. */
.lb-avatar.shape-square{border-radius:22px;}
/* Fit the whole logo inside the shape (used when scaled or square): contain on white. */
.lb-avatar.fit-contain{background:#fff;}
.lb-avatar.fit-contain img{object-fit:contain;}
/* "Plain" logo: drop the circular disc + ring so a transparent PNG shows on its own. */
.lb-avatar.is-plain{width:auto;max-width:180px;height:96px;border-radius:0;overflow:visible;background:none;box-shadow:none;}
.lb-avatar.is-plain img{width:auto;max-width:100%;height:100%;object-fit:contain;}
/* Avatar wrapper carries the plan badge so it isn't clipped by the avatar's overflow. */
.lb-avatar-wrap{position:relative;display:inline-block;margin-bottom:16px;}
.lb-avatar-wrap .lb-avatar{margin-bottom:0;}
.lb-badge{position:absolute;top:0;right:0;z-index:6;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:9px;line-height:1;background:linear-gradient(135deg,#FCE4A0,#E8A317);color:#5b3d00;border:1.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.28);}
.lb-badge i{font-size:9px;}
/* Floating share button (top-right). */
.lb-share{position:fixed;top:14px;right:14px;z-index:50;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--lb-btn-bg);color:var(--lb-social);border:var(--lb-btn-border);box-shadow:var(--lb-btn-shadow);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);cursor:pointer;font-size:16px;transition:transform .15s;}
.lb-share:active{transform:scale(.92);}
/* Inline QR card. */
/* The QR is a quiet line at the foot, not a card — a template should end on the
   brand, the way a link-in-bio page does. */
.lb-qr{display:inline-flex;align-items:center;gap:9px;margin-top:18px;padding:7px 12px 7px 7px;border-radius:999px;background:var(--lb-btn-bg);color:var(--lb-btn-text);border:var(--lb-btn-border);}
body[data-glass="1"] .lb-qr{backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}
.lb-qr img{width:34px;height:34px;border-radius:999px;background:#fff;padding:3px;flex-shrink:0;}
.lb-qr span{font-size:12.5px;font-weight:600;letter-spacing:.01em;}
.lb-name{font-family:var(--lb-name-font);font-weight:var(--lb-name-weight);font-size:26px;line-height:1.15;margin:2px 0 4px;letter-spacing:-.01em;color:var(--lb-text);}
.lb-handle{font-size:13px;font-weight:600;letter-spacing:.04em;color:var(--lb-sub);margin:0 0 10px;}
.lb-bio{font-size:13.5px;line-height:1.5;color:var(--lb-sub);margin:0 0 22px;max-width:340px;}
.lb-links{width:100%;display:flex;flex-direction:column;gap:14px;}
.lb-link{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:60px;padding:15px 22px;border-radius:var(--lb-radius);background:var(--lb-btn-bg);color:var(--lb-btn-text);border:var(--lb-btn-border);box-shadow:var(--lb-btn-shadow);font-size:14.5px;font-weight:600;text-decoration:none;transition:transform .16s ease,background .2s,box-shadow .2s;}
body[data-glass="1"] .lb-link{backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}
.lb-link:hover{transform:translateY(-2px);background:var(--lb-btn-hover);}
.lb-link:active{transform:translateY(0);}
.lb-link .lb-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lb-social{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:8px;padding:0;margin:26px 0 6px;}
.lb-social a{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;color:var(--lb-social);border:1px solid color-mix(in srgb,var(--lb-social) 35%,transparent);font-size:16px;text-decoration:none;transition:transform .15s,background .2s;}
.lb-social a:hover{transform:translateY(-2px);background:color-mix(in srgb,var(--lb-social) 14%,transparent);}
.lb-site{display:inline-block;margin-top:8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--lb-sub);text-decoration:none;}
.lb-site:hover{color:var(--lb-text);}
.lb-powered{margin-top:auto;padding-top:26px;font-size:11px;color:var(--lb-sub);opacity:.75;}
.lb-powered a{color:var(--lb-accent);text-decoration:none;font-weight:600;}
.lb-bottom-bar{display:flex;width:100%;margin-top:18px;border-radius:12px;overflow:hidden;background:color-mix(in srgb,var(--lb-text) 8%,transparent);border:1px solid color-mix(in srgb,var(--lb-text) 14%,transparent);}
.lb-bottom-bar a{flex:1;text-align:center;font-weight:700;font-size:13px;color:var(--lb-text);text-decoration:none;padding:13px 8px;transition:background .15s;}
.lb-bottom-bar a:first-child{border-right:1px solid color-mix(in srgb,var(--lb-text) 14%,transparent);}
.lb-bottom-bar a:hover{background:color-mix(in srgb,var(--lb-text) 10%,transparent);}
`;

type BuildOpts = { thumb?: boolean };

export function buildLinkBioHtml(c: LBRecord, products: LBProduct[] = [], variantIndex = 0, opts: BuildOpts = {}): string {
  const accent = s(c.color) || "#F7B31C";
  const variants = linkBioVariants(accent);
  const v = variants[Math.max(0, Math.min(variants.length - 1, variantIndex))];
  const glass = /--lb-glass:1/.test(v.css);
  const customBg = resolveCardBg(c);

  // Plan badge (Platinum gem / Gold crown) on the avatar — owner can hide it.
  const pkgId = Number(c.package_id);
  const planBadge = Number(c.badge_on) === 0 ? "" : pkgId === 6
    ? `<span class="lb-badge lb-badge-plat" title="Platinum member" aria-label="Platinum member"><i class="fa fa-gem"></i></span>`
    : pkgId === 5
      ? `<span class="lb-badge lb-badge-gold" title="Gold member" aria-label="Gold member"><i class="fa fa-crown"></i></span>`
      : "";

  // Logo shape + size. The shape box stays a fixed 104px; "Logo size" (70–160%)
  // scales the logo INSIDE the shape so a wide logo can be shrunk to fit the
  // circle/square without being cropped. Plain shows the PNG on its own (size
  // scales the PNG height directly).
  const hasLogo = !!s(c.logo);
  const isPlainLogo = s(c.logo_shape) === "plain" && hasLogo;
  const logoSizePct = Math.max(70, Math.min(isPlainLogo ? 250 : 160, Number(s(c.logo_size)) || 100));
  const isSquare = s(c.logo_shape) === "square" && !isPlainLogo;
  // Fit the whole logo inside the shape (contain, on white) when the user has
  // shrunk/grown it or picked the square shape; otherwise fill (cover).
  const fitContain = hasLogo && !isPlainLogo && (logoSizePct !== 100 || isSquare);
  const avatarClass = [isPlainLogo ? "is-plain" : "", isSquare ? "shape-square" : "", fitContain ? "fit-contain" : ""].filter(Boolean).join(" ");
  // Plain: height scales, and the width cap scales with it (was a fixed 180px,
  // so a wide wordmark couldn't actually get bigger) — never wider than the card.
  const avatarStyle = isPlainLogo ? `height:${Math.round(96 * logoSizePct / 100)}px;max-width:min(${Math.round(180 * logoSizePct / 100)}px,92%)` : "";
  const avatarImgStyle = !isPlainLogo && fitContain ? `width:${logoSizePct}%;height:${logoSizePct}%` : "";

  const cardUrl = `https://digitalcarda.in/${s(c.slug) || "card"}`;
  const showQr = Number(c.cardqr_on ?? 1) === 1 && !!s(c.slug);
  const qrSrc = showQr ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=${encodeURIComponent(cardUrl)}` : "";
  const showShare = Number(c.share_on ?? 1) !== 0 && !opts.thumb;
  const shareName = s(c.company_name) || s(c.name) || "this business";
  const waShareText = `Hi 👋\n\nTake a look at *${shareName}*'s digital card 📇\n\nEverything in one tap — call, WhatsApp, save the contact:\n${cardUrl}`;

  const name = esc(c.name) || "Your Name";
  const handle = s(c.username) || s(c.slug);
  const bio = esc(s(c.designation) || (s(c.about_us).slice(0, 110)));
  const slug = s(c.slug);
  const initial = ([...s(c.name)][0] || "D").toUpperCase();
  const avatarPh = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='160' height='160' fill='${accent}'/><text x='50%' y='50%' font-size='74' fill='#fff' text-anchor='middle' font-family='Arial' dominant-baseline='central'>${initial}</text></svg>`).replace(/'/g, "%27")}`;

  const wa = s(c.mobile2 || c.mobile1).replace(/[^\d+]/g, "");
  const phone = s(c.mobile1).replace(/[^\d+]/g, "");
  const waMsg = encodeURIComponent(`Hi ${s(c.name) || "there"}, I found your card and would love to connect.`);

  const btn = (href: string, label: string, target = "_blank", download = "") =>
    label && href
      ? `<a class="lb-link" href="${esc(href)}" ${download ? `download="${esc(download)}"` : `target="${target}" rel="noopener"`}><span class="lb-label">${esc(label)}</span></a>`
      : "";

  // vCard as a data URI so "Save Contact" works with no JavaScript.
  const vcard = ["BEGIN:VCARD", "VERSION:3.0", `FN:${s(c.name)}`, `ORG:${s(c.company_name)}`, `TITLE:${s(c.designation)}`,
    `TEL;TYPE=CELL:${s(c.mobile1)}`, `EMAIL:${s(c.email)}`, `URL:${s(c.url)}`, `ADR:;;${s(c.address)};;;;`, "END:VCARD"].join("\n");
  const vcardHref = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;

  const links = [
    btn(phone ? `tel:${phone}` : "", "Call Now", "_self"),
    btn(wa ? `https://wa.me/${wa}?text=${waMsg}` : "", "Chat on WhatsApp"),
    btn(safeExternalUrl(c.url), "Visit Website"),
    btn(s(c.email) ? `mailto:${s(c.email)}` : "", "Email Us", "_self"),
    btn(safeExternalUrl(c.google_map), "Get Directions"),
    // Each product/service becomes its own labelled button.
    ...products.map((p) => {
      const label = s(p.button_title) || s(p.name);
      const href = safeExternalUrl(p.button) || (wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I'm interested in "${s(p.name)}".`)}` : "");
      return btn(href, label);
    }),
  ].filter(Boolean).join("");

  const social = Object.keys(SOCIAL_FA).filter((k) => s(c[k]))
    .map((k) => `<li><a href="${esc(c[k])}" target="_blank" rel="noopener" aria-label="${k}"><i class="${SOCIAL_FA[k]}"></i></a></li>`).join("");

  const siteText = s(c.url).replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const ref = s(c.referral_code) || slug;

  const chrome = opts.thumb ? "" : `
    <div class="lb-bottom-bar">
      <a href="/login" target="_top">Customer Login</a>
      <a href="/signup${ref ? `?ref=${encodeURIComponent(ref)}` : ""}" target="_top">Create Your Free Card</a>
    </div>`;

  return `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.12.1/css/all.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@500;600;700;800&family=Playfair+Display:wght@500;600;700&display=swap">
<style>${BASE_CSS}
body{${v.css}}
${customBg ? cardBgOverrideCss(customBg) : ""}
${showShare ? shareSheetCss("#111827") : ""}
</style></head>
<body class="lb" data-variant="${v.id}"${HEAD_LEFT.has(v.id) ? ' data-head="left"' : ""}${glass ? ' data-glass="1"' : ""}${customBg ? "" : " data-photo=\"1\""}>
  ${customBg ? customBg.layerHtml : ""}
  ${showShare ? `<button class="lb-share" onclick="openShare()" aria-label="Share this card"><i class="fa fa-share-alt"></i></button>` : ""}
  <div class="lb-wrap">
    <div class="lb-avatar-wrap"><div class="lb-avatar${avatarClass ? " " + avatarClass : ""}" style="${avatarStyle}"><img src="${esc(c.logo) || avatarPh}" alt="${name}" style="${avatarImgStyle}" ${IMG} onerror="this.onerror=null;this.src='${avatarPh}'"></div>${planBadge}</div>
    <h1 class="lb-name">${name}</h1>
    ${bio ? `<p class="lb-bio">${bio}</p>` : handle ? `<p class="lb-handle">@${esc(handle)}</p>` : ""}
    <div class="lb-links">
      ${links}
      ${btn(vcardHref, "Save Contact", "_self", `${slug || "contact"}.vcf`)}
    </div>
    ${social ? `<ul class="lb-social">${social}</ul>` : ""}
    ${qrSrc ? `<div class="lb-qr"><img src="${qrSrc}" alt="Scan to open this card" ${IMG}><span>Scan my card</span></div>` : ""}
    ${siteText ? `<a class="lb-site" href="${esc(safeExternalUrl(c.url))}" target="_blank" rel="noopener">${esc(siteText)}</a>` : ""}
    <div class="lb-powered">Powered by <a href="https://digitalcarda.in" target="_blank" rel="noopener">DigitalCarda</a></div>
    ${chrome}
  </div>
  ${showShare ? shareSheetHtml({ shareName, cardUrl, waShareText }) : ""}
  ${showShare ? `<script>${shareSheetJs(cardUrl)}</script>` : ""}
  ${CONTRAST_GUARD_SCRIPT}
</body></html>`;
}
