/*
 * Extract a small brand palette from an uploaded logo, entirely in the browser
 * (canvas pixel sampling). Returns up to 3 distinct, vivid hex colours ordered by
 * prominence — used to preview/apply templates in the customer's own brand colours.
 *
 * Robust by design: near-white / near-black / low-alpha pixels are ignored,
 * saturated colours are weighted up, and a tainted/undecodable image resolves to
 * an empty array (callers just fall back to template defaults).
 */

type RGB = { r: number; g: number; b: number };

const toHex = (c: RGB) => "#" + [c.r, c.g, c.b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("");
const dist = (a: RGB, b: RGB) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);

export function relLuminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 1;
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Darken a hex colour by `amt` (0..1) — used to derive a secondary from a primary. */
export function darken(hex: string, amt = 0.28): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return hex;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return toHex({ r: Math.round(r * (1 - amt)), g: Math.round(g * (1 - amt)), b: Math.round(b * (1 - amt)) });
}

/**
 * A secondary/"dark" brand colour suitable for panels & buttons that carry WHITE
 * text (which most templates do). Prefer a genuinely dark extracted colour;
 * otherwise derive a dark shade of the primary so contrast stays readable.
 */
export function brandSecondaryFor(primary: string, second?: string): string {
  if (second && relLuminance(second) < 0.42) return second;
  return darken(primary, relLuminance(primary) > 0.5 ? 0.62 : 0.42);
}

export async function extractBrandColors(src: string): Promise<string[]> {
  if (!src) return [];
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve([]);
    img.onload = () => {
      try {
        const W = 72, H = 72;
        const cv = document.createElement("canvas");
        cv.width = W; cv.height = H;
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        if (!ctx) { resolve([]); return; }
        ctx.drawImage(img, 0, 0, W, H);
        let data: Uint8ClampedArray;
        try { data = ctx.getImageData(0, 0, W, H).data; } catch { resolve([]); return; }

        const buckets = new Map<string, { r: number; g: number; b: number; n: number; score: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 130) continue;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const light = (max + min) / 2 / 255;
          if (light > 0.92 || light < 0.08) continue; // skip near-white / near-black
          const sat = max === min ? 0 : (max - min) / max;
          const key = `${r >> 4},${g >> 4},${b >> 4}`;
          const e = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0, score: 0 };
          e.r += r; e.g += g; e.b += b; e.n++; e.score += 1 + sat * 4; // weight vivid colours
          buckets.set(key, e);
        }

        const avg = [...buckets.values()].map((e) => ({ r: Math.round(e.r / e.n), g: Math.round(e.g / e.n), b: Math.round(e.b / e.n), score: e.score }));
        avg.sort((a, b) => b.score - a.score);

        const picks: RGB[] = [];
        for (const c of avg) {
          if (picks.every((p) => dist(p, c) > 70)) picks.push({ r: c.r, g: c.g, b: c.b });
          if (picks.length >= 3) break;
        }
        resolve(picks.map(toHex));
      } catch { resolve([]); }
    };
    img.src = src;
  });
}
