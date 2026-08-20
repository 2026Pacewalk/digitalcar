/*
 * Premium single-screen card DESIGNS (not just colour themes) — richer, print-
 * like layouts inspired by real business / ID / membership cards. Numbered right
 * after the link-in-bio range. Each reuses the data the customer already has
 * (name, role, company, contacts, products, socials, QR, vCard) plus a few
 * optional fields (photo, employee id, blood group, membership id…).
 */
type PCProduct = { name: string; tagline?: string; description?: string; button?: string; button_title?: string; filename?: string };
type PCRecord = Record<string, unknown>;

const s = (v: unknown) => String(v ?? "").trim();
const esc = (v: unknown) => s(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const IMG = 'referrerpolicy="no-referrer"';
const SOCIAL_FA: Record<string, string> = {
  facebook: "fab fa-facebook-f", instagram: "fab fa-instagram", youtube: "fab fa-youtube",
  twitter: "fab fa-twitter", pinterest: "fab fa-pinterest-p", linkedin: "fab fa-linkedin",
};

/* Design names — the count drives the template gallery. Add more here + a branch
   in buildPremiumCardHtml to introduce the ID / Membership cards later. */
export const PREMIUM_NAMES = ["Corporate Business Card"];
export const PREMIUM_COUNT = PREMIUM_NAMES.length;

const HEAD = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.12.1/css/all.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800&display=swap">`;

const initialPh = (c: PCRecord, bg: string) => {
  const i = (s(c.name)[0] || "D").toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='220'><rect width='200' height='220' fill='${bg}'/><text x='50%' y='50%' font-size='96' fill='#fff' text-anchor='middle' font-family='Arial' dominant-baseline='central'>${i}</text></svg>`)}`;
};

export function buildPremiumCardHtml(c: PCRecord, products: PCProduct[] = [], index = 0, opts: { thumb?: boolean } = {}): string {
  switch (index) {
    // Future: case 1 → ID card, case 2 → membership card.
    default: return businessCard(c, products, opts);
  }
}

function businessCard(c: PCRecord, products: PCProduct[], opts: { thumb?: boolean }): string {
  const accent = s(c.color) || "#F7B31C";
  const dark = s(c.color2) || "#0e2647";
  const name = esc(c.name) || "Your Name";
  const desig = esc(c.designation);
  const company = esc(c.company_name);
  const slug = s(c.slug).replace(/[^a-zA-Z0-9_-]/g, "");
  const cardUrl = `https://digitalcarda.in/${slug || "card"}`;
  const photo = s(c.photo); // dedicated person photo (falls back to an initial avatar, not the logo)
  const logo = s(c.logo);
  const phone = s(c.mobile1).replace(/[^\d+]/g, "");
  const wa = s(c.mobile2 || c.mobile1).replace(/[^\d+]/g, "");
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=${encodeURIComponent(cardUrl)}`;

  const crow = (icon: string, text: string, href = "") =>
    text ? `<div class="pc-crow"><span class="pc-cic"><i class="${icon}"></i></span>${href ? `<a href="${esc(href)}">${esc(text)}</a>` : `<span>${esc(text)}</span>`}</div>` : "";
  const contacts = [
    crow("fa fa-phone-alt", s(c.mobile1), phone ? `tel:${phone}` : ""),
    crow("fa fa-envelope", s(c.email), s(c.email) ? `mailto:${s(c.email)}` : ""),
    crow("fa fa-globe", s(c.url).replace(/^https?:\/\//i, "").replace(/\/$/, ""), s(c.url)),
    crow("fa fa-map-marker-alt", s(c.address)),
  ].join("");

  const connect = [
    phone ? `<a class="pc-soc" href="tel:${phone}" style="background:${accent};color:${dark}"><i class="fa fa-phone-alt"></i></a>` : "",
    wa ? `<a class="pc-soc" href="https://wa.me/${wa}" target="_blank" rel="noopener" style="background:#25D366"><i class="fab fa-whatsapp"></i></a>` : "",
    ...Object.keys(SOCIAL_FA).filter((k) => s(c[k])).map((k) => `<a class="pc-soc" href="${esc(c[k])}" target="_blank" rel="noopener" style="background:${dark}"><i class="${SOCIAL_FA[k]}"></i></a>`),
  ].filter(Boolean).join("");

  const solutions = products.slice(0, 8).map((p) => {
    const href = s(p.button) || cardUrl;
    const sub = s(p.tagline) || s(p.description).replace(/<[^>]*>/g, "").slice(0, 60);
    return `<a class="pc-sol" href="${esc(href)}" target="_blank" rel="noopener"><span class="pc-sol-ic"><i class="fa fa-bolt"></i></span><span class="pc-sol-tx"><b>${esc(p.name)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span><i class="fa fa-chevron-right pc-sol-ar"></i></a>`;
  }).join("");

  const vcard = ["BEGIN:VCARD", "VERSION:3.0", `FN:${s(c.name)}`, `ORG:${s(c.company_name)}`, `TITLE:${s(c.designation)}`,
    `TEL;TYPE=CELL:${s(c.mobile1)}`, `EMAIL:${s(c.email)}`, `URL:${s(c.url)}`, `ADR:;;${s(c.address)};;;;`, "END:VCARD"].join("\n");
  const vcardHref = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;
  const ref = s(c.referral_code) || slug;

  const css = `
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  body{font-family:'Poppins','Inter',system-ui,sans-serif;background:#e7ecf2;color:#0f172a;}
  .pc{max-width:430px;margin:0 auto;background:#fff;min-height:100vh;box-shadow:0 20px 60px rgba(15,23,42,.12);}
  .pc-head{background:linear-gradient(155deg,${dark} 0%,${dark}f2 60%,#000000 160%);color:#fff;padding:20px 20px 22px;}
  .pc-brand{display:flex;align-items:center;gap:9px;margin-bottom:16px;min-height:30px;}
  .pc-brand img{max-height:34px;max-width:150px;object-fit:contain;}
  .pc-brand .pc-brand-txt{font-weight:800;font-size:15px;letter-spacing:.3px;}
  .pc-main{display:flex;gap:14px;align-items:flex-start;}
  .pc-info{flex:1;min-width:0;}
  .pc-name{color:${accent};font-size:21px;font-weight:700;line-height:1.15;margin-bottom:2px;}
  .pc-role{font-size:12.5px;font-weight:600;}
  .pc-org{font-size:11.5px;opacity:.82;margin-bottom:13px;}
  .pc-crow{display:flex;align-items:center;gap:9px;font-size:11.5px;margin-bottom:7px;word-break:break-word;}
  .pc-cic{width:24px;height:24px;border-radius:6px;background:${accent};color:${dark};display:inline-flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;}
  .pc-crow a,.pc-crow span:not(.pc-cic){color:#fff;text-decoration:none;}
  .pc-side{width:96px;flex-shrink:0;display:flex;flex-direction:column;gap:10px;align-items:center;}
  .pc-photo{width:96px;height:112px;border-radius:11px;overflow:hidden;border:2px solid ${accent};background:rgba(255,255,255,.1);}
  .pc-photo img{width:100%;height:100%;object-fit:cover;display:block;}
  .pc-qr{background:#fff;padding:5px;border-radius:9px;line-height:0;}
  .pc-qr img{width:84px;height:84px;display:block;}
  .pc-body{padding:20px 20px 24px;}
  .pc-title{display:flex;align-items:center;gap:10px;text-align:center;font-size:11px;font-weight:800;letter-spacing:.12em;color:#94a3b8;text-transform:uppercase;margin:4px 0 15px;}
  .pc-title::before,.pc-title::after{content:"";flex:1;height:1px;background:#e6ebf1;}
  .pc-connect{display:flex;justify-content:center;gap:12px;margin-bottom:8px;}
  .pc-soc{width:46px;height:46px;border-radius:50%;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:18px;text-decoration:none;box-shadow:0 5px 14px rgba(15,23,42,.16);transition:transform .15s;}
  .pc-soc:active{transform:scale(.94);}
  .pc-sol{display:flex;align-items:center;gap:12px;padding:11px 12px;border:1px solid #eef1f5;border-radius:13px;margin-bottom:10px;text-decoration:none;background:#fff;box-shadow:0 2px 10px rgba(15,23,42,.05);transition:transform .15s,box-shadow .2s;}
  .pc-sol:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(15,23,42,.08);}
  .pc-sol-ic{width:40px;height:40px;border-radius:10px;background:${dark};color:${accent};display:inline-flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
  .pc-sol-tx{flex:1;min-width:0;}
  .pc-sol-tx b{display:block;font-size:13.5px;font-weight:700;color:#0f172a;line-height:1.2;}
  .pc-sol-tx small{display:block;font-size:11px;color:#94a3b8;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .pc-sol-ar{color:#cbd5e1;font-size:13px;flex-shrink:0;}
  .pc-save{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;height:52px;background:${dark};color:#fff;border-radius:13px;font-weight:700;font-size:14.5px;text-decoration:none;margin-top:6px;box-shadow:0 8px 20px ${dark}33;}
  .pc-save:active{transform:scale(.99);}
  .pc-powered{text-align:center;font-size:11px;color:#94a3b8;margin-top:16px;}
  .pc-powered a{color:${accent};text-decoration:none;font-weight:600;}
  .pc-bottom{display:flex;margin-top:14px;border:1px solid #e6ebf1;border-radius:12px;overflow:hidden;}
  .pc-bottom a{flex:1;text-align:center;font-weight:700;font-size:12.5px;color:${dark};text-decoration:none;padding:12px 8px;}
  .pc-bottom a:first-child{border-right:1px solid #e6ebf1;}
  `;

  const brand = logo
    ? `<img src="${esc(logo)}" alt="${company || name}" ${IMG}>`
    : (company ? `<span class="pc-brand-txt" style="color:${accent}">${company}</span>` : "");

  const chrome = opts.thumb ? "" : `
    <div class="pc-bottom">
      <a href="/login" target="_top">Customer Login</a>
      <a href="/signup${ref ? `?ref=${encodeURIComponent(ref)}` : ""}" target="_top">Create Free Card</a>
    </div>`;

  return `<!doctype html><html><head>${HEAD}<style>${css}</style></head><body>
  <div class="pc">
    <div class="pc-head">
      <div class="pc-brand">${brand}</div>
      <div class="pc-main">
        <div class="pc-info">
          <div class="pc-name">${name}</div>
          ${desig ? `<div class="pc-role">${desig}</div>` : ""}
          ${company ? `<div class="pc-org">${company}</div>` : ""}
          ${contacts}
        </div>
        <div class="pc-side">
          <div class="pc-photo"><img src="${esc(photo) || initialPh(c, accent)}" alt="${name}" ${IMG} onerror="this.onerror=null;this.src='${initialPh(c, accent)}'"></div>
          <div class="pc-qr"><img src="${qrSrc}" alt="QR" ${IMG}></div>
        </div>
      </div>
    </div>
    <div class="pc-body">
      ${connect ? `<div class="pc-title">Connect with me</div><div class="pc-connect">${connect}</div>` : ""}
      ${solutions ? `<div class="pc-title" style="margin-top:22px">Our Solutions</div>${solutions}` : ""}
      <a class="pc-save" href="${vcardHref}" download="${slug || "contact"}.vcf"><i class="fa fa-user-plus"></i> Save Contact</a>
      <div class="pc-powered">Powered by <a href="https://digitalcarda.in" target="_blank" rel="noopener">DigitalCarda</a></div>
      ${chrome}
    </div>
  </div>
  </body></html>`;
}
