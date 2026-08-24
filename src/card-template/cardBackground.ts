/*
 * Custom background system for the link-in-bio cards (Linktree-style, but richer).
 * The customer can override the template's default background with:
 *   • a curated PRESET (mesh gradients, aurora, sunsets, subtle patterns)
 *   • a SOLID colour
 *   • a custom GRADIENT (two colours + angle)
 *   • a PHOTO (with dim + blur controls)
 *
 * When a custom background is active we also re-derive readable text and a glass
 * button style so the card stays legible on ANY background — the thing that makes
 * this feel more polished than a plain colour picker.
 *
 * Card fields used (all stored as strings on the card record):
 *   bg_type   "" | "preset" | "solid" | "gradient" | "image"
 *   bg_preset  preset key
 *   bg_color1  hex (solid / gradient start)
 *   bg_color2  hex (gradient end)
 *   bg_angle   gradient angle in degrees (default 160)
 *   bg_image   photo URL / data URI
 *   bg_dim     photo darken 0..80 (%)
 *   bg_blur    photo blur 0..24 (px)
 */

const s = (v: unknown) => String(v ?? "").trim();

/** Perceived brightness of a #rrggbb colour (0 dark … 1 light). */
function lum(hex: string): number {
  const h = s(hex).replace("#", "");
  if (h.length < 6) return 1;
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export type BgPreset = { key: string; label: string; bg: string; dark: boolean };

/* Curated, full-bleed backgrounds — several mesh / multi-stop gradients you can't
   get from a single colour picker. `dark` decides light-vs-dark foreground. */
export const BG_PRESETS: BgPreset[] = [
  { key: "aurora", label: "Aurora", dark: true, bg: "radial-gradient(120% 90% at 15% 10%,#7c3aed 0%,transparent 45%),radial-gradient(120% 90% at 85% 20%,#db2777 0%,transparent 50%),radial-gradient(140% 120% at 50% 100%,#0ea5e9 0%,transparent 55%),#0b1020" },
  { key: "sunset", label: "Sunset", dark: true, bg: "linear-gradient(160deg,#ff8a00 0%,#e52e71 55%,#8e2de2 100%)" },
  { key: "ocean", label: "Deep Ocean", dark: true, bg: "linear-gradient(160deg,#2b5876 0%,#1e3c72 50%,#0f2027 100%)" },
  { key: "emerald", label: "Emerald", dark: true, bg: "radial-gradient(120% 90% at 50% -10%,#059669 0%,#065f46 55%,#022c22 100%)" },
  { key: "grape", label: "Grape Soda", dark: true, bg: "linear-gradient(160deg,#5b21b6 0%,#7c3aed 45%,#c026d3 100%)" },
  { key: "midnight", label: "Midnight", dark: true, bg: "radial-gradient(120% 90% at 50% -10%,#1e293b 0%,#0f172a 55%,#020617 100%)" },
  { key: "coral", label: "Coral Reef", dark: true, bg: "radial-gradient(120% 90% at 20% 15%,#f97316 0%,transparent 45%),radial-gradient(120% 90% at 85% 85%,#ec4899 0%,transparent 50%),#7f1d1d" },
  { key: "forest", label: "Forest Mist", dark: true, bg: "linear-gradient(160deg,#134e5e 0%,#2d6a4f 55%,#1b4332 100%)" },
  { key: "gold", label: "Black Gold", dark: true, bg: "radial-gradient(120% 90% at 50% -10%,#3b3016 0%,#1a1608 55%,#0a0803 100%)" },
  { key: "cotton", label: "Cotton Candy", dark: false, bg: "linear-gradient(160deg,#fbc2eb 0%,#a6c1ee 100%)" },
  { key: "peach", label: "Peach Cream", dark: false, bg: "linear-gradient(160deg,#ffecd2 0%,#fcb69f 100%)" },
  { key: "mint", label: "Fresh Mint", dark: false, bg: "linear-gradient(160deg,#d4fc79 0%,#96e6a1 100%)" },
  { key: "sky", label: "Clear Sky", dark: false, bg: "linear-gradient(160deg,#e0f2fe 0%,#bae6fd 55%,#7dd3fc 100%)" },
  { key: "lavender", label: "Lavender", dark: false, bg: "linear-gradient(160deg,#ede9fe 0%,#c4b5fd 100%)" },
  { key: "paper", label: "Warm Paper", dark: false, bg: "radial-gradient(120% 80% at 50% 0%,#fbf6ee 0%,#f3ece0 55%,#ece2d2 100%)" },
  { key: "dots", label: "Ink Dots", dark: true, bg: "radial-gradient(rgba(255,255,255,.16) 1.2px,transparent 1.2px) 0 0/18px 18px,#0f172a" },
  { key: "grid", label: "Blueprint", dark: true, bg: "linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px) 0 0/24px 24px,linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px) 0 0/24px 24px,#0b1e3b" },
];

const PRESET_BY_KEY: Record<string, BgPreset> = Object.fromEntries(BG_PRESETS.map((p) => [p.key, p]));

export type ResolvedBg = {
  /** CSS for `body` background (non-image types) or the base colour (image). */
  bodyBg: string;
  /** true → light foreground; false → dark foreground. */
  dark: boolean;
  /** Photo layer (blur + dim) or "" when not an image background. */
  layerCss: string;
  layerHtml: string;
};

/** Resolve the card's custom background, or null when it uses the template default. */
export function resolveCardBg(c: Record<string, unknown>): ResolvedBg | null {
  const type = s(c.bg_type);
  if (!type) return null;

  if (type === "preset") {
    const p = PRESET_BY_KEY[s(c.bg_preset)];
    if (!p) return null;
    return { bodyBg: p.bg, dark: p.dark, layerCss: "", layerHtml: "" };
  }

  if (type === "solid") {
    const col = s(c.bg_color1) || "#0f172a";
    return { bodyBg: col, dark: lum(col) < 0.55, layerCss: "", layerHtml: "" };
  }

  if (type === "gradient") {
    const c1 = s(c.bg_color1) || "#6d28d9";
    const c2 = s(c.bg_color2) || "#db2777";
    const angle = Number(s(c.bg_angle)) || 160;
    return { bodyBg: `linear-gradient(${angle}deg,${c1} 0%,${c2} 100%)`, dark: (lum(c1) + lum(c2)) / 2 < 0.55, layerCss: "", layerHtml: "" };
  }

  if (type === "image") {
    const img = s(c.bg_image);
    if (!img) return null;
    const dim = Math.max(0, Math.min(80, Number(s(c.bg_dim)) || 35));
    const blur = Math.max(0, Math.min(24, Number(s(c.bg_blur)) || 0));
    const safe = img.replace(/["\\]/g, "");
    const layerCss = `
.lb-bgfx{position:fixed;inset:0;z-index:-1;overflow:hidden;background:#0b0b0b;}
.lb-bgfx::before{content:'';position:absolute;inset:-${blur * 2 + 4}px;background:url("${safe}") center/cover no-repeat;${blur ? `filter:blur(${blur}px);` : ""}}
.lb-bgfx::after{content:'';position:absolute;inset:0;background:rgba(0,0,0,${(dim / 100).toFixed(2)});}`;
    return { bodyBg: "#0b0b0b", dark: true, layerCss, layerHtml: `<div class="lb-bgfx" aria-hidden="true"></div>` };
  }

  return null;
}

/**
 * CSS that overrides the template variables so the card is readable on the custom
 * background: foreground text, a glass button style, and the body background.
 * Appended AFTER the variant's own `body{…}` block so it wins.
 */
export function cardBgOverrideCss(bg: ResolvedBg): string {
  const vars = bg.dark
    ? `--lb-text:#ffffff;--lb-sub:rgba(255,255,255,.82);
       --lb-btn-bg:rgba(255,255,255,.14);--lb-btn-text:#ffffff;--lb-btn-border:1px solid rgba(255,255,255,.30);
       --lb-btn-shadow:0 8px 24px rgba(0,0,0,.28);--lb-btn-hover:rgba(255,255,255,.26);
       --lb-ring:rgba(255,255,255,.6);--lb-social:#ffffff;`
    : `--lb-text:#0f172a;--lb-sub:#475569;
       --lb-btn-bg:rgba(255,255,255,.72);--lb-btn-text:#0f172a;--lb-btn-border:1px solid rgba(15,23,42,.10);
       --lb-btn-shadow:0 6px 18px rgba(15,23,42,.10);--lb-btn-hover:#ffffff;
       --lb-ring:rgba(255,255,255,.9);--lb-social:#0f172a;`;
  return `
body.lb{background:${bg.bodyBg};background-size:cover;background-position:center;background-attachment:fixed;${vars}}
body.lb .lb-link{backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}
${bg.layerCss}`;
}
