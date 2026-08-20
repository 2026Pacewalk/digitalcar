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
export const PREMIUM_NAMES = ["Corporate Business Card", "Employee ID Card", "Membership Card"];
export const PREMIUM_COUNT = PREMIUM_NAMES.length;

const HEAD = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.12.1/css/all.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800&family=Sora:wght@600;700;800&family=Manrope:wght@500;600;700;800&display=swap">`;

const initialPh = (c: PCRecord, bg: string) => {
  const i = (s(c.name)[0] || "D").toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='220'><rect width='200' height='220' fill='${bg}'/><text x='50%' y='50%' font-size='96' fill='#fff' text-anchor='middle' font-family='Arial' dominant-baseline='central'>${i}</text></svg>`)}`;
};

export function buildPremiumCardHtml(c: PCRecord, products: PCProduct[] = [], index = 0, opts: { thumb?: boolean } = {}): string {
  switch (index) {
    case 1: return idCard(c);
    case 2: return membershipCard(c);
    default: return businessCard(c, products, opts);
  }
}

const fieldRow = (label: string, value: string, labelColor: string, valColor: string) =>
  value ? `<div class="pcf-row"><span class="pcf-l" style="color:${labelColor}">${esc(label)}</span><span class="pcf-c">:</span><span class="pcf-v" style="color:${valColor}">${esc(value)}</span></div>` : "";

// ── Employee ID card (image #2): white card, circular photo, field table, footer ──
function idCard(c: PCRecord): string {
  const dark = s(c.color2) || "#16365d";
  const accent = s(c.color) || "#e0b23c";
  const name = esc(c.name) || "Your Name";
  const photo = s(c.photo);
  const logo = s(c.logo);
  const fields = [
    fieldRow("Employee ID", s(c.employee_id), dark, "#334155"),
    fieldRow("Blood Group", s(c.blood_group), dark, "#334155"),
    fieldRow("Phone", s(c.mobile1), dark, "#334155"),
    fieldRow("Email", s(c.email), dark, "#334155"),
    fieldRow("Joining Date", s(c.joining_date), dark, "#334155"),
  ].join("");
  const css = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Poppins','Inter',system-ui,sans-serif;background:#e7ecf2;}
  .idc{max-width:410px;margin:0 auto;min-height:100vh;background:#fff;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(15,23,42,.12);}
  .idc-top{position:relative;padding:26px 22px 0;text-align:center;}
  .idc-top::before{content:"";position:absolute;top:0;left:0;right:0;height:70px;background:${dark};clip-path:polygon(0 0,100% 0,100% 55%,0 100%);opacity:.06;}
  .idc-logo img{max-height:38px;max-width:170px;object-fit:contain;position:relative;}
  .idc-photo{width:132px;height:132px;border-radius:50%;overflow:hidden;border:4px solid ${dark};margin:16px auto 14px;background:${accent};box-shadow:0 8px 24px rgba(15,23,42,.15);}
  .idc-photo img{width:100%;height:100%;object-fit:cover;display:block;}
  .idc-name{color:${dark};font-size:22px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;}
  .idc-role{font-size:13px;color:#475569;font-weight:600;margin-top:3px;}
  .idc-org{font-size:12px;color:#94a3b8;margin:2px 0 20px;}
  .idc-fields{padding:0 26px;}
  .pcf-row{display:flex;align-items:baseline;gap:8px;font-size:13px;padding:10px 0;border-bottom:1px solid #eef2f7;}
  .pcf-l{width:104px;flex-shrink:0;font-weight:700;text-transform:uppercase;letter-spacing:.03em;font-size:11px;}
  .pcf-c{color:#cbd5e1;}
  .pcf-v{font-weight:500;word-break:break-word;}
  .idc-sign{text-align:right;padding:20px 26px 10px;}
  .idc-sign .idc-sig-name{font-family:'Poppins',cursive;font-size:15px;color:${dark};font-weight:600;font-style:italic;}
  .idc-sign small{display:inline-block;border-top:1.5px solid #cbd5e1;padding-top:4px;margin-top:2px;font-size:10.5px;color:#94a3b8;letter-spacing:.05em;}
  .idc-foot{margin-top:auto;background:${dark};color:${accent};text-align:center;padding:15px;font-weight:700;letter-spacing:.22em;font-size:11px;text-transform:uppercase;}
  `;
  const brand = logo ? `<img src="${esc(logo)}" alt="${esc(c.company_name)}" ${IMG}>` : `<span style="font-weight:800;font-size:17px;color:${dark}">${esc(c.company_name) || "COMPANY"}</span>`;
  return `<!doctype html><html><head>${HEAD}<style>${css}</style></head><body><div class="idc">
    <div class="idc-top">
      <div class="idc-logo">${brand}</div>
      <div class="idc-photo"><img src="${esc(photo) || initialPh(c, dark)}" alt="${name}" ${IMG} onerror="this.onerror=null;this.src='${initialPh(c, dark)}'"></div>
      <div class="idc-name">${name}</div>
      ${s(c.designation) ? `<div class="idc-role">${esc(c.designation)}</div>` : ""}
      ${s(c.company_name) ? `<div class="idc-org">${esc(c.company_name)}</div>` : ""}
    </div>
    <div class="idc-fields">${fields}</div>
    <div class="idc-sign"><div class="idc-sig-name">${name}</div><small>Authorised Signatory</small></div>
    <div class="idc-foot">Innovate &nbsp;·&nbsp; Secure &nbsp;·&nbsp; Empower</div>
  </div></body></html>`;
}

// ── Membership card (image #3): emerald + gold, badge, stars, fields, QR, thanks ──
function membershipCard(c: PCRecord): string {
  const green = s(c.color2) || "#0f5132";
  const gold = s(c.color) || "#d4af37";
  const name = esc(c.name) || "Your Name";
  const photo = s(c.photo);
  const logo = s(c.logo);
  const tier = esc(s(c.membership_type) || "Premium");
  const rating = Math.max(0, Math.min(5, Number(c.member_rating) || 5));
  const slug = s(c.slug).replace(/[^a-zA-Z0-9_-]/g, "");
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=${encodeURIComponent(`https://digitalcarda.in/${slug || "card"}`)}`;
  const stars = Array.from({ length: 5 }, (_, i) => `<i class="fa fa-star" style="color:${i < rating ? gold : "rgba(255,255,255,.25)"}"></i>`).join("");
  const fields = [
    fieldRow("Membership ID", s(c.membership_id), gold, "#f4f1e4"),
    fieldRow("Member Since", s(c.member_since), gold, "#f4f1e4"),
    fieldRow("Valid Till", s(c.valid_till), gold, "#f4f1e4"),
    fieldRow("Membership Type", tier, gold, "#f4f1e4"),
    fieldRow("Blood Group", s(c.blood_group), gold, "#f4f1e4"),
  ].join("");
  const css = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Poppins','Inter',system-ui,sans-serif;background:#08201a;}
  .mem{max-width:410px;margin:0 auto;min-height:100vh;background:radial-gradient(120% 90% at 50% -10%,${green} 0%,#0a3a24 55%,#062417 100%);color:#f4f1e4;display:flex;flex-direction:column;padding:22px 22px 26px;position:relative;}
  .mem::before{content:"";position:absolute;inset:10px;border:1.5px solid ${gold}55;border-radius:16px;pointer-events:none;}
  .mem-in{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;flex:1;}
  .mem-top{display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:6px;}
  .mem-logo img{max-height:30px;max-width:130px;object-fit:contain;}
  .mem-tier{background:${gold};color:${green};font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:5px 10px;border-radius:999px;}
  .mem-badge{display:inline-flex;align-items:center;gap:7px;border:1px solid ${gold}88;color:${gold};font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:6px 16px;border-radius:999px;margin:8px 0 16px;}
  .mem-photo{width:110px;height:110px;border-radius:50%;overflow:hidden;border:3px solid ${gold};background:${green};box-shadow:0 8px 22px rgba(0,0,0,.35);}
  .mem-photo img{width:100%;height:100%;object-fit:cover;display:block;}
  .mem-name{font-family:'Poppins',sans-serif;font-size:21px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin:12px 0 6px;}
  .mem-stars{font-size:14px;letter-spacing:3px;margin-bottom:16px;}
  .mem-fields{width:100%;max-width:320px;margin:0 auto 16px;}
  .mem-fields .pcf-row{border-bottom:1px solid ${gold}22;padding:9px 0;font-size:12.5px;}
  .mem-fields .pcf-l{width:120px;font-size:10.5px;} .mem-fields .pcf-c{color:${gold}66;}
  .mem-qr{background:#fff;padding:6px;border-radius:10px;line-height:0;margin:4px 0 14px;}
  .mem-qr img{width:96px;height:96px;display:block;}
  .mem-thanks{color:${gold};font-size:12.5px;font-weight:600;margin-top:auto;}
  `;
  const brand = logo ? `<img src="${esc(logo)}" alt="${esc(c.company_name)}" ${IMG}>` : `<span style="font-weight:800;font-size:15px;color:${gold}">${esc(c.company_name) || "BRAND"}</span>`;
  return `<!doctype html><html><head>${HEAD}<style>${css}</style></head><body><div class="mem"><div class="mem-in">
    <div class="mem-top"><span class="mem-logo">${brand}</span><span class="mem-tier">${tier} Member</span></div>
    <div class="mem-badge"><i class="fa fa-crown"></i> Membership Card</div>
    <div class="mem-photo"><img src="${esc(photo) || initialPh(c, green)}" alt="${name}" ${IMG} onerror="this.onerror=null;this.src='${initialPh(c, green)}'"></div>
    <div class="mem-name">${name}</div>
    <div class="mem-stars">${stars}</div>
    <div class="mem-fields">${fields}</div>
    <div class="mem-qr"><img src="${qrSrc}" alt="QR" ${IMG}></div>
    <div class="mem-thanks">Thank you for being a valued member!</div>
  </div></div></body></html>`;
}

// Distinct, relevant icon + a professional fallback description per service.
function svcMeta(nm: string): { icon: string; desc: string } {
  const n = nm.toLowerCase();
  const M: [RegExp, string, string][] = [
    [/social|smm|instagram|facebook/, "fa-bullhorn", "Grow reach & engagement across every platform."],
    [/e-?commerce|shop|store|cart/, "fa-shopping-cart", "Sell online with a store built to convert."],
    [/web|website|landing/, "fa-code", "Fast, modern websites that turn visits into leads."],
    [/business ?card|visiting|nfc|digital card/, "fa-id-card", "Smart digital cards that make an impression."],
    [/brand|identity|logo/, "fa-gem", "A cohesive identity that sets you apart."],
    [/catalog|catalogue|brochure/, "fa-book-open", "Beautiful catalogues that showcase your range."],
    [/seo|search|rank/, "fa-search", "Rank higher and get found by the right people."],
    [/app|mobile/, "fa-mobile-alt", "Native-feel mobile apps your users love."],
    [/video|motion|animation/, "fa-video", "Scroll-stopping video that tells your story."],
    [/graphic|creative|poster|design/, "fa-pen-nib", "Standout creatives crafted to perform."],
    [/lead|crm|automation/, "fa-user-plus", "Capture and nurture every lead automatically."],
    [/bulk|sms|whatsapp|campaign/, "fa-comment-dots", "Reach your audience where they already are."],
    [/consult|strategy|growth/, "fa-chart-line", "Data-driven strategy for measurable growth."],
  ];
  for (const [re, icon, desc] of M) if (re.test(n)) return { icon, desc };
  return { icon: "fa-star", desc: "Explore how we can help your business grow." };
}

function businessCard(c: PCRecord, products: PCProduct[], opts: { thumb?: boolean }): string {
  const gold = s(c.color) || "#F7B31C";
  const navy = s(c.color2) || "#0e1b34";
  const name = esc(c.name) || "Your Name";
  const desig = esc(c.designation);
  const company = esc(c.company_name);
  const slug = s(c.slug).replace(/[^a-zA-Z0-9_-]/g, "");
  const cardUrl = `https://digitalcarda.in/${slug || "card"}`;
  const photo = s(c.photo);
  const logo = s(c.logo);
  const phone = s(c.mobile1).replace(/[^\d+]/g, "");
  const wa = s(c.mobile2 || c.mobile1).replace(/[^\d+]/g, "");
  const mapHref = s(c.google_map) || (s(c.address) ? `https://maps.google.com/?q=${encodeURIComponent(s(c.address))}` : "");
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encodeURIComponent(cardUrl)}`;

  const crow = (icon: string, label: string, text: string, href = "", ext = false) =>
    text ? `<a class="pw-crow" ${href ? `href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}` : 'aria-disabled="true"'} aria-label="${esc(label)}: ${esc(text)}"><span class="pw-cic"><i class="fa ${icon}"></i></span><span class="pw-ctx"><small>${esc(label)}</small><b>${esc(text)}</b></span></a>` : "";
  const contacts = [
    crow("fa-phone-alt", "Call", s(c.mobile1), phone ? `tel:${phone}` : ""),
    crow("fa-envelope", "Email", s(c.email), s(c.email) ? `mailto:${s(c.email)}` : ""),
    crow("fa-globe", "Website", s(c.url).replace(/^https?:\/\//i, "").replace(/\/$/, ""), s(c.url), true),
    crow("fa-map-marker-alt", "Address", s(c.address), mapHref, true),
  ].join("");

  const socials = [
    ...Object.keys(SOCIAL_FA).filter((k) => s(c[k])).map((k) => `<a class="pw-soc" href="${esc(c[k])}" target="_blank" rel="noopener" aria-label="${k}"><i class="${SOCIAL_FA[k]}"></i></a>`),
  ].join("");

  const services = products.slice(0, 8).map((p) => {
    const m = svcMeta(s(p.name));
    const desc = s(p.tagline) || s(p.description).replace(/<[^>]*>/g, "").trim().slice(0, 70) || m.desc;
    const href = s(p.button) || cardUrl;
    return `<a class="pw-svc" href="${esc(href)}" target="_blank" rel="noopener"><span class="pw-svc-ic"><i class="fa ${m.icon}"></i></span><span class="pw-svc-tx"><b>${esc(p.name)}</b><small>${esc(desc)}</small></span><i class="fa fa-arrow-right pw-svc-ar"></i></a>`;
  }).join("");

  const vcard = ["BEGIN:VCARD", "VERSION:3.0", `FN:${s(c.name)}`, `ORG:${s(c.company_name)}`, `TITLE:${s(c.designation)}`,
    `TEL;TYPE=CELL:${s(c.mobile1)}`, `EMAIL:${s(c.email)}`, `URL:${s(c.url)}`, `ADR:;;${s(c.address)};;;;`, "END:VCARD"].join("\n");
  const vcardHref = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;
  const ref = s(c.referral_code) || slug;
  const brand = logo ? `<img src="${esc(logo)}" alt="${company || name}" ${IMG}>` : (company ? `<span class="pw-logo-txt">${company}</span>` : "");
  const avatar = `<div class="pw-ava"><img src="${esc(photo) || initialPh(c, gold)}" alt="${name}" ${IMG} onerror="this.onerror=null;this.src='${initialPh(c, gold)}'"></div>`;

  const css = `
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  :root{--navy:${navy};--gold:${gold};--ink:#101828;--muted:#667085;--line:#eef1f5;--paper:#ffffff;--soft:#f6f8fb;}
  html{-webkit-text-size-adjust:100%;}
  body{font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;background:#eaeef3;color:var(--ink);line-height:1.5;}
  .pw{max-width:440px;margin:0 auto;background:var(--paper);min-height:100vh;box-shadow:0 24px 70px rgba(16,24,40,.14);overflow:hidden;padding-bottom:78px;}
  @media(min-width:520px){.pw{padding-bottom:0;}}
  @keyframes pwUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
  .pw-rise{animation:pwUp .5s cubic-bezier(.2,.7,.2,1) both;}
  .pw-rise.d1{animation-delay:.05s;} .pw-rise.d2{animation-delay:.12s;} .pw-rise.d3{animation-delay:.2s;}
  @media(prefers-reduced-motion:reduce){.pw-rise{animation:none;}}

  .pw-hero{position:relative;background:radial-gradient(120% 80% at 85% -10%,#243b63 0%,var(--navy) 45%,#070d1c 130%);color:#fff;padding:22px 22px 46px;overflow:hidden;}
  .pw-hero::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:30px 30px;mask-image:radial-gradient(120% 90% at 80% 0,#000,transparent 70%);opacity:.5;pointer-events:none;}
  .pw-hero::after{content:"";position:absolute;right:-40px;top:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,var(--gold)33 0%,transparent 70%);pointer-events:none;}
  .pw-hero-in{position:relative;z-index:1;}
  .pw-logo{min-height:30px;margin-bottom:18px;}
  .pw-logo img{max-height:34px;max-width:170px;object-fit:contain;}
  .pw-logo-txt{font-family:'Sora',sans-serif;font-weight:800;font-size:16px;letter-spacing:.4px;color:var(--gold);}
  .pw-idrow{display:flex;align-items:center;gap:15px;margin-bottom:18px;}
  .pw-ava{width:76px;height:76px;border-radius:50%;padding:3px;background:linear-gradient(140deg,var(--gold),#fff6);flex-shrink:0;box-shadow:0 10px 26px rgba(0,0,0,.35);}
  .pw-ava img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;border:2px solid var(--navy);}
  .pw-idtx{min-width:0;}
  .pw-name{font-family:'Sora',sans-serif;font-weight:800;font-size:23px;line-height:1.1;letter-spacing:-.01em;color:#fff;}
  .pw-name .u{color:var(--gold);}
  .pw-role{font-size:13px;font-weight:600;color:var(--gold);margin-top:4px;letter-spacing:.01em;}
  .pw-org{font-size:12px;font-weight:500;color:rgba(255,255,255,.75);margin-top:1px;}
  .pw-contacts{display:flex;flex-direction:column;gap:2px;margin-bottom:16px;}
  .pw-crow{display:flex;align-items:center;gap:12px;padding:8px 6px;border-radius:11px;text-decoration:none;transition:background .18s;}
  .pw-crow:hover{background:rgba(255,255,255,.06);}
  .pw-cic{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:var(--gold);display:inline-flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
  .pw-ctx{min-width:0;display:flex;flex-direction:column;}
  .pw-ctx small{font-size:9.5px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.5);font-weight:600;}
  .pw-ctx b{font-size:12.5px;font-weight:500;color:#fff;word-break:break-word;line-height:1.35;}
  .pw-scan{display:flex;align-items:center;gap:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:11px 13px;margin-bottom:16px;}
  .pw-scan-qr{background:#fff;padding:5px;border-radius:9px;line-height:0;flex-shrink:0;transition:transform .2s;}
  .pw-scan-qr img{width:72px;height:72px;display:block;}
  @media(hover:hover){.pw-scan-qr:hover{transform:scale(1.06);}}
  .pw-scan-tx b{display:block;font-size:12.5px;font-weight:700;color:#fff;}
  .pw-scan-tx small{display:block;font-size:11px;color:rgba(255,255,255,.6);margin-top:2px;}
  .pw-cta{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .pw-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:48px;border-radius:12px;font-weight:700;font-size:13.5px;text-decoration:none;border:none;cursor:pointer;transition:transform .12s,box-shadow .2s,filter .2s;font-family:inherit;}
  .pw-btn:active{transform:scale(.97);}
  .pw-btn-gold{background:linear-gradient(135deg,var(--gold),#e0930a);color:var(--navy);box-shadow:0 8px 20px ${gold}44;}
  .pw-btn-gold:hover{filter:brightness(1.04);}
  .pw-btn-ghost{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.2);}
  .pw-btn-ghost:hover{background:rgba(255,255,255,.14);}

  .pw-body{position:relative;background:var(--paper);border-radius:26px 26px 0 0;margin-top:-24px;padding:26px 22px 26px;z-index:2;}
  .pw-h2{display:flex;align-items:center;gap:12px;font-family:'Sora',sans-serif;font-size:12px;font-weight:700;letter-spacing:.14em;color:var(--muted);text-transform:uppercase;margin-bottom:16px;}
  .pw-h2::before{content:"";width:22px;height:3px;border-radius:3px;background:var(--gold);flex-shrink:0;}
  .pw-h2::after{content:"";flex:1;height:1px;background:var(--line);}
  .pw-sec{margin-bottom:26px;}
  .pw-socials{display:flex;flex-wrap:wrap;gap:10px;}
  .pw-soc{width:46px;height:46px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;color:var(--navy);background:var(--soft);border:1px solid var(--line);text-decoration:none;transition:transform .16s,box-shadow .2s,color .2s,background .2s;}
  .pw-soc:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(16,24,40,.12);color:var(--gold);}
  .pw-soc:active{transform:translateY(0);}
  .pw-svcs{display:grid;grid-template-columns:1fr;gap:11px;}
  @media(min-width:400px){.pw-svcs{grid-template-columns:1fr 1fr;}}
  .pw-svc{display:flex;flex-direction:column;gap:9px;padding:15px;border:1px solid var(--line);border-radius:16px;text-decoration:none;background:var(--paper);box-shadow:0 2px 10px rgba(16,24,40,.04);position:relative;overflow:hidden;transition:transform .16s,box-shadow .22s,border-color .2s;}
  .pw-svc::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--gold);transform:scaleY(0);transform-origin:top;transition:transform .22s;}
  .pw-svc:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(16,24,40,.1);border-color:${gold}55;}
  .pw-svc:hover::before{transform:scaleY(1);}
  .pw-svc-ic{width:42px;height:42px;border-radius:12px;background:var(--navy);color:var(--gold);display:inline-flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}
  .pw-svc-tx b{display:block;font-family:'Sora',sans-serif;font-size:14px;font-weight:700;color:var(--ink);line-height:1.25;}
  .pw-svc-tx small{display:block;font-size:11.5px;color:var(--muted);margin-top:4px;line-height:1.45;}
  .pw-svc-ar{position:absolute;right:14px;top:15px;color:#c3cbd6;font-size:12px;transition:transform .18s,color .18s;}
  .pw-svc:hover .pw-svc-ar{color:var(--gold);transform:translateX(3px);}

  .pw-powered{text-align:center;font-size:11px;color:var(--muted);margin-top:20px;}
  .pw-powered a{color:var(--gold);text-decoration:none;font-weight:700;}
  .pw-foot{display:flex;margin-top:16px;border:1px solid var(--line);border-radius:13px;overflow:hidden;}
  .pw-foot a{flex:1;text-align:center;font-weight:700;font-size:12.5px;color:var(--navy);text-decoration:none;padding:13px 8px;transition:background .15s;}
  .pw-foot a:hover{background:var(--soft);}
  .pw-foot a:first-child{border-right:1px solid var(--line);}

  .pw-dock{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);width:calc(100% - 24px);max-width:416px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;background:rgba(14,27,52,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:8px;z-index:50;box-shadow:0 12px 34px rgba(0,0,0,.3);}
  @media(min-width:520px){.pw-dock{display:none;}}
  .pw-dock a,.pw-dock button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 2px;border-radius:11px;background:transparent;border:none;color:rgba(255,255,255,.9);font-size:10px;font-weight:600;font-family:inherit;text-decoration:none;cursor:pointer;transition:background .15s;}
  .pw-dock a i,.pw-dock button i{font-size:16px;}
  .pw-dock a:active,.pw-dock button:active{background:rgba(255,255,255,.12);}
  .pw-dock .g{color:var(--gold);}
  `;

  const chrome = opts.thumb ? "" : `
    <div class="pw-foot">
      <a href="/login" target="_top">Customer Login</a>
      <a href="/signup${ref ? `?ref=${encodeURIComponent(ref)}` : ""}" target="_top">Create Free Card</a>
    </div>`;

  const dock = opts.thumb ? "" : `
  <nav class="pw-dock" aria-label="Quick actions">
    ${phone ? `<a href="tel:${phone}" aria-label="Call"><i class="fa fa-phone-alt g"></i> Call</a>` : ""}
    ${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fab fa-whatsapp" style="color:#25D366"></i> WhatsApp</a>` : ""}
    <a href="${vcardHref}" download="${slug || "contact"}.vcf" aria-label="Save contact"><i class="fa fa-user-plus"></i> Save</a>
    <button type="button" onclick="pwShare()" aria-label="Share profile"><i class="fa fa-share-alt"></i> Share</button>
  </nav>`;

  const script = opts.thumb ? "" : `<script>
  function pwCopy(u){try{var t=document.createElement('textarea');t.value=u;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.focus();t.select();document.execCommand('copy');document.body.removeChild(t);alert('Link copied');}catch(e){alert(u);}}
  function pwShare(){var u=${JSON.stringify(cardUrl)},t=${JSON.stringify(s(c.name) + (company ? " — " + s(c.company_name) : ""))};try{if(navigator.share){navigator.share({title:t,url:u}).catch(function(){pwCopy(u);});return;}}catch(e){}pwCopy(u);}
  </script>`;

  return `<!doctype html><html lang="en"><head>${HEAD}<style>${css}</style></head><body>
  <div class="pw">
    <header class="pw-hero">
      <div class="pw-hero-in">
        <div class="pw-logo pw-rise">${brand}</div>
        <div class="pw-idrow pw-rise d1">
          ${avatar}
          <div class="pw-idtx">
            <h1 class="pw-name">${name}</h1>
            ${desig ? `<p class="pw-role">${desig}</p>` : ""}
            ${company ? `<p class="pw-org">${company}</p>` : ""}
          </div>
        </div>
        <div class="pw-contacts pw-rise d2">${contacts}</div>
        <div class="pw-scan pw-rise d2">
          <div class="pw-scan-qr"><img src="${qrSrc}" alt="Scan to view this card" ${IMG}></div>
          <div class="pw-scan-tx"><b>Scan to connect</b><small>Open &amp; save my card in one tap</small></div>
        </div>
        <div class="pw-cta pw-rise d3">
          <a class="pw-btn pw-btn-gold" href="${vcardHref}" download="${slug || "contact"}.vcf" aria-label="Save contact"><i class="fa fa-user-plus"></i> Save Contact</a>
          <button type="button" class="pw-btn pw-btn-ghost" onclick="pwShare()" aria-label="Share profile"><i class="fa fa-share-alt"></i> Share Profile</button>
        </div>
      </div>
    </header>
    <main class="pw-body">
      ${socials ? `<section class="pw-sec pw-rise"><h2 class="pw-h2">Connect With Me</h2><div class="pw-socials">${socials}</div></section>` : ""}
      ${services ? `<section class="pw-sec pw-rise"><h2 class="pw-h2">Our Solutions</h2><div class="pw-svcs">${services}</div></section>` : ""}
      <div class="pw-powered">Powered by <a href="https://digitalcarda.in" target="_blank" rel="noopener">DigitalCarda</a></div>
      ${chrome}
    </main>
  </div>
  ${dock}
  ${script}
  </body></html>`;
}
