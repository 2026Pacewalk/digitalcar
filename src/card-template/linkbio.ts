/*
 * Link-in-bio ("Linktree-style") card layout.
 * A clean, minimal alternative to the business-card templates: circular photo,
 * name, @handle, tagline, a stack of full-width link buttons, and social icons.
 *
 * Link buttons are auto-generated from what the customer already filled in
 * (Call, WhatsApp, Website, Email, Directions + each Product/Service), so any
 * existing card instantly has a beautiful Linktree view — zero extra setup.
 *
 * These are the templates numbered LINKBIO_START … (LINKBIO_START + variants − 1).
 */

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
        --lb-ring:rgba(255,255,255,.9); --lb-social:#6b5f52; --lb-accent:${a};`,
    },
    {
      name: "Aurora Glass", swatch: "#8b5cf6",
      css: `
        --lb-bg:linear-gradient(160deg,#6d28d9 0%,#9333ea 42%,#db2777 100%);
        --lb-text:#ffffff; --lb-sub:rgba(255,255,255,.82); --lb-name-font:'Poppins',sans-serif; --lb-name-weight:700;
        --lb-btn-bg:rgba(255,255,255,.16); --lb-btn-text:#ffffff; --lb-btn-border:1px solid rgba(255,255,255,.28);
        --lb-btn-shadow:0 6px 20px rgba(0,0,0,.18); --lb-btn-hover:rgba(255,255,255,.28); --lb-radius:14px;
        --lb-ring:rgba(255,255,255,.55); --lb-social:#ffffff; --lb-glass:1; --lb-accent:#ffffff;`,
    },
    {
      name: "Midnight Neon", swatch: "#0ea5e9",
      css: `
        --lb-bg:radial-gradient(120% 90% at 50% -10%,#132033 0%,#0b1220 60%,#070b14 100%);
        --lb-text:#f1f5f9; --lb-sub:#94a3b8; --lb-name-font:'Poppins',sans-serif; --lb-name-weight:700;
        --lb-btn-bg:rgba(255,255,255,.04); --lb-btn-text:#e2e8f0; --lb-btn-border:1px solid ${a}66;
        --lb-btn-shadow:0 0 0 1px ${a}22, 0 6px 22px rgba(0,0,0,.4); --lb-btn-hover:${a}1f; --lb-radius:12px;
        --lb-ring:${a}; --lb-social:#cbd5e1; --lb-accent:${a};`,
    },
    {
      name: "Sunset Warm", swatch: "#fb7185",
      css: `
        --lb-bg:linear-gradient(160deg,#fb923c 0%,#f43f5e 55%,#e11d48 100%);
        --lb-text:#ffffff; --lb-sub:rgba(255,255,255,.9); --lb-name-font:'Poppins',sans-serif; --lb-name-weight:700;
        --lb-btn-bg:#ffffff; --lb-btn-text:#b21e3a; --lb-btn-border:none;
        --lb-btn-shadow:0 8px 22px rgba(0,0,0,.16); --lb-btn-hover:#fff5f6; --lb-radius:14px;
        --lb-ring:rgba(255,255,255,.85); --lb-social:#ffffff; --lb-accent:#ffffff;`,
    },
    {
      name: "Ocean Frost", swatch: "#0891b2",
      css: `
        --lb-bg:linear-gradient(160deg,#22d3ee 0%,#0891b2 45%,#0e7490 100%);
        --lb-text:#ffffff; --lb-sub:rgba(255,255,255,.85); --lb-name-font:'Poppins',sans-serif; --lb-name-weight:700;
        --lb-btn-bg:rgba(255,255,255,.18); --lb-btn-text:#ffffff; --lb-btn-border:1px solid rgba(255,255,255,.3);
        --lb-btn-shadow:0 6px 20px rgba(0,0,0,.14); --lb-btn-hover:rgba(255,255,255,.3); --lb-radius:14px;
        --lb-ring:rgba(255,255,255,.6); --lb-social:#ffffff; --lb-glass:1; --lb-accent:#ffffff;`,
    },
    {
      name: "Noir Bold", swatch: "#111111",
      css: `
        --lb-bg:#0a0a0a; --lb-text:#ffffff; --lb-sub:#a1a1aa; --lb-name-font:'Poppins',sans-serif; --lb-name-weight:800;
        --lb-btn-bg:#ffffff; --lb-btn-text:#0a0a0a; --lb-btn-border:none;
        --lb-btn-shadow:0 6px 18px rgba(0,0,0,.5); --lb-btn-hover:#eaeaea; --lb-radius:999px;
        --lb-ring:#ffffff; --lb-social:#ffffff; --lb-accent:#ffffff;`,
    },
    {
      name: "Peach Soft", swatch: "#fecaca",
      css: `
        --lb-bg:linear-gradient(160deg,#fff1f2 0%,#ffe4e6 50%,#fecdd3 100%);
        --lb-text:#7a3b3b; --lb-sub:#b08585; --lb-name-font:'Playfair Display',serif; --lb-name-weight:600;
        --lb-btn-bg:rgba(255,255,255,.8); --lb-btn-text:#8a4a4a; --lb-btn-border:1px solid rgba(190,120,120,.18);
        --lb-btn-shadow:0 4px 14px rgba(190,120,120,.14); --lb-btn-hover:#fff; --lb-radius:14px;
        --lb-ring:#ffffff; --lb-social:#a56a6a; --lb-accent:#e26d6d;`,
    },
    {
      name: "Gold Luxe", swatch: "#c9a24b",
      css: `
        --lb-bg:radial-gradient(120% 90% at 50% -10%,#20242c 0%,#14171d 60%,#0d0f13 100%);
        --lb-text:#f5eede; --lb-sub:#b8ab8c; --lb-name-font:'Playfair Display',serif; --lb-name-weight:600;
        --lb-btn-bg:rgba(201,162,75,.08); --lb-btn-text:#f0e6cf; --lb-btn-border:1px solid rgba(201,162,75,.55);
        --lb-btn-shadow:0 6px 20px rgba(0,0,0,.35); --lb-btn-hover:rgba(201,162,75,.18); --lb-radius:10px;
        --lb-ring:#c9a24b; --lb-social:#d8c491; --lb-accent:#c9a24b;`,
    },
    {
      name: "Neon Cyber", swatch: "#22d3ee",
      css: `
        --lb-bg:radial-gradient(120% 90% at 50% -10%,#0b1020 0%,#070a14 60%,#04060c 100%);
        --lb-text:#e8fbff; --lb-sub:#7fd8e8; --lb-name-font:'Poppins',sans-serif; --lb-name-weight:800;
        --lb-btn-bg:rgba(10,20,35,.6); --lb-btn-text:#c9f7ff; --lb-btn-border:1px solid rgba(34,211,238,.55);
        --lb-btn-shadow:0 0 14px rgba(34,211,238,.33),inset 0 0 0 1px rgba(34,211,238,.2); --lb-btn-hover:rgba(34,211,238,.14); --lb-radius:10px;
        --lb-ring:#22d3ee; --lb-social:#67e8f9; --lb-accent:#22d3ee;`,
    },
    {
      name: "Retro Groove", swatch: "#d99a5b",
      css: `
        --lb-bg:linear-gradient(160deg,#f4e3c1 0%,#e9c893 55%,#d99a5b 100%);
        --lb-text:#5a3b1e; --lb-sub:#8a6a45; --lb-name-font:'Poppins',sans-serif; --lb-name-weight:800;
        --lb-btn-bg:#fff7ea; --lb-btn-text:#7a4b22; --lb-btn-border:2px solid #7a4b22;
        --lb-btn-shadow:3px 3px 0 #7a4b22; --lb-btn-hover:#ffefd6; --lb-radius:14px;
        --lb-ring:#fff7ea; --lb-social:#7a4b22; --lb-accent:#c2410c;`,
    },
    {
      name: "Editorial", swatch: "#111111",
      css: `
        --lb-bg:#ffffff; --lb-text:#0a0a0a; --lb-sub:#6b7280; --lb-name-font:'Playfair Display',serif; --lb-name-weight:700;
        --lb-btn-bg:#ffffff; --lb-btn-text:#111111; --lb-btn-border:1.5px solid #111111;
        --lb-btn-shadow:none; --lb-btn-hover:#f3f4f6; --lb-radius:0px;
        --lb-ring:#111111; --lb-social:#111111; --lb-accent:#111111;`,
    },
    {
      name: "Mint Fresh", swatch: "#34d399",
      css: `
        --lb-bg:linear-gradient(160deg,#d1fae5 0%,#6ee7b7 55%,#34d399 100%);
        --lb-text:#064e3b; --lb-sub:#0f766e; --lb-name-font:'Poppins',sans-serif; --lb-name-weight:700;
        --lb-btn-bg:#ffffff; --lb-btn-text:#065f46; --lb-btn-border:none;
        --lb-btn-shadow:0 6px 18px rgba(6,95,70,.14); --lb-btn-hover:#ecfdf5; --lb-radius:14px;
        --lb-ring:rgba(255,255,255,.85); --lb-social:#065f46; --lb-accent:#059669;`,
    },
    {
      name: "Lavender Dream", swatch: "#a78bfa",
      css: `
        --lb-bg:linear-gradient(160deg,#ede9fe 0%,#c4b5fd 55%,#a78bfa 100%);
        --lb-text:#4c1d95; --lb-sub:#6d28d9; --lb-name-font:'Playfair Display',serif; --lb-name-weight:600;
        --lb-btn-bg:rgba(255,255,255,.82); --lb-btn-text:#5b21b6; --lb-btn-border:1px solid rgba(124,58,237,.18);
        --lb-btn-shadow:0 4px 16px rgba(124,58,237,.15); --lb-btn-hover:#fff; --lb-radius:14px;
        --lb-ring:#ffffff; --lb-social:#7c3aed; --lb-accent:#7c3aed;`,
    },
  ];
  return defs.map((d, i) => ({ ...d, id: LINKBIO_START + i }));
}

export const LINKBIO_COUNT = linkBioVariants("#000").length;

/* Base CSS — consumes the variant's CSS variables. */
const BASE_CSS = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{margin:0;padding:0;}
body.lb{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--lb-bg);color:var(--lb-text);min-height:100vh;}
.lb-wrap{max-width:480px;margin:0 auto;padding:38px 22px 30px;display:flex;flex-direction:column;align-items:center;text-align:center;min-height:100vh;}
.lb-avatar{width:104px;height:104px;border-radius:50%;overflow:hidden;background:rgba(255,255,255,.2);box-shadow:0 0 0 4px var(--lb-ring),0 10px 30px rgba(0,0,0,.18);margin-bottom:16px;}
.lb-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
.lb-name{font-family:var(--lb-name-font);font-weight:var(--lb-name-weight);font-size:26px;line-height:1.15;margin:2px 0 4px;letter-spacing:-.01em;color:var(--lb-text);}
.lb-handle{font-size:13px;font-weight:600;letter-spacing:.04em;color:var(--lb-sub);margin:0 0 10px;}
.lb-bio{font-size:13.5px;line-height:1.5;color:var(--lb-sub);margin:0 0 22px;max-width:340px;}
.lb-links{width:100%;display:flex;flex-direction:column;gap:13px;}
.lb-link{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:56px;padding:14px 46px;border-radius:var(--lb-radius);background:var(--lb-btn-bg);color:var(--lb-btn-text);border:var(--lb-btn-border);box-shadow:var(--lb-btn-shadow);font-size:14.5px;font-weight:600;text-decoration:none;transition:transform .16s ease,background .2s,box-shadow .2s;}
body[data-glass="1"] .lb-link{backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}
.lb-link:hover{transform:translateY(-2px);background:var(--lb-btn-hover);}
.lb-link:active{transform:translateY(0);}
.lb-link .lb-ic{position:absolute;left:18px;top:50%;transform:translateY(-50%);font-size:16px;opacity:.9;width:20px;text-align:center;}
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

  const name = esc(c.name) || "Your Name";
  const handle = s(c.username) || s(c.slug);
  const bio = esc(s(c.designation) || (s(c.about_us).slice(0, 110)));
  const slug = s(c.slug);
  const initial = (s(c.name)[0] || "D").toUpperCase();
  const avatarPh = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='160' height='160' fill='${accent}'/><text x='50%' y='50%' font-size='74' fill='#fff' text-anchor='middle' font-family='Arial' dominant-baseline='central'>${initial}</text></svg>`)}`;

  const wa = s(c.mobile2 || c.mobile1).replace(/[^\d+]/g, "");
  const phone = s(c.mobile1).replace(/[^\d+]/g, "");
  const waMsg = encodeURIComponent(`Hi ${s(c.name) || "there"}, I found your card and would love to connect.`);

  const btn = (icon: string, href: string, label: string, target = "_blank") =>
    label && href ? `<a class="lb-link" href="${esc(href)}" target="${target}" rel="noopener"><span class="lb-ic"><i class="${icon}"></i></span><span class="lb-label">${esc(label)}</span></a>` : "";

  // vCard as a data URI so "Save Contact" works with no JavaScript.
  const vcard = ["BEGIN:VCARD", "VERSION:3.0", `FN:${s(c.name)}`, `ORG:${s(c.company_name)}`, `TITLE:${s(c.designation)}`,
    `TEL;TYPE=CELL:${s(c.mobile1)}`, `EMAIL:${s(c.email)}`, `URL:${s(c.url)}`, `ADR:;;${s(c.address)};;;;`, "END:VCARD"].join("\n");
  const vcardHref = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;

  const links = [
    btn("fa fa-phone-alt", phone ? `tel:${phone}` : "", "Call Now", "_self"),
    btn("fab fa-whatsapp", wa ? `https://wa.me/${wa}?text=${waMsg}` : "", "Chat on WhatsApp"),
    btn("fa fa-globe", s(c.url), "Visit Website"),
    btn("fa fa-envelope", s(c.email) ? `mailto:${s(c.email)}` : "", "Email Us", "_self"),
    btn("fa fa-map-marker-alt", s(c.google_map), "Get Directions"),
    // Each product/service becomes its own labelled button.
    ...products.map((p) => {
      const label = s(p.button_title) || s(p.name);
      const href = s(p.button) || (wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I'm interested in "${s(p.name)}".`)}` : "");
      return btn("fa fa-arrow-right", href, label);
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
</style></head>
<body class="lb" data-variant="${v.id}"${glass ? ' data-glass="1"' : ""}>
  <div class="lb-wrap">
    <div class="lb-avatar"><img src="${esc(c.logo) || avatarPh}" alt="${name}" ${IMG} onerror="this.onerror=null;this.src='${avatarPh}'"></div>
    <h1 class="lb-name">${name}</h1>
    ${handle ? `<p class="lb-handle">@${esc(handle)}</p>` : ""}
    ${bio ? `<p class="lb-bio">${bio}</p>` : ""}
    <div class="lb-links">
      ${links}
      ${btn("fa fa-user-plus", vcardHref, "Save Contact")}
    </div>
    ${social ? `<ul class="lb-social">${social}</ul>` : ""}
    ${siteText ? `<a class="lb-site" href="${esc(s(c.url))}" target="_blank" rel="noopener">${esc(siteText)}</a>` : ""}
    <div class="lb-powered">Powered by <a href="https://digitalcarda.in" target="_blank" rel="noopener">DigitalCarda</a></div>
    ${chrome}
  </div>
</body></html>`;
}
