/*
 * Ten more premium designs, in the classic "digital visiting card" style people
 * recognise: a portrait photo, soft brand shapes, round icon rows, a QR and a
 * Save-to-contacts bar. (The first ten, in premiumDesigns.ts, are the more
 * experimental layouts.)
 *
 * They share the same engine as every other premium template — pwContentSections
 * renders About, Services, Offers, Gallery, Videos, Reviews, Payments and the
 * Enquiry form; shareSheet handles sharing; the vCard, QR and live view counter
 * come from the shared parts — so every feature works on all of them.
 *
 * Where a card has no photo, each design falls back to the logo, then to the
 * business's initial, so a sparse card still looks finished.
 */
import {
  HEAD, IMG, esc, s, mix, pwContentSections,
  type PCProduct, type PCRecord, type PremiumExtras,
} from "./premiumCards";
import { shareSheetCss, shareSheetHtml, shareSheetJs } from "./shareSheet";
import {
  baseCss, logoImg, partsFor, saveHref, shareBtn, tokensFor, viewCount,
  floatDock, floatDockJs, flipCss, qrFlip,
  type Design, type Parts, type Tokens,
} from "./premiumDesigns";

export const DESIGN2_NAMES = [
  "Pastel Portrait",
  "Bold Circles",
  "Link Hub",
  "Agency Stack",
  "Geo Yellow",
  "Sky Profile",
  "Photo Frame",
  "Diagonal Split",
  "Ribbon Wave",
  "Corporate Slate",
];

/* The portrait already falls back to the initial, so a logo-less card would show
   the same letter twice — these designs print the brand mark only when there is one. */
const brandMark = (p: Parts, cls: string) => (p.logo ? logoImg(p, cls) : "");

/* The portrait: photo, else logo, else the initial on the brand colour. */
const portrait = (t: Tokens, p: Parts, cls: string) =>
  p.photo
    ? `<span class="${cls}"><img src="${esc(p.photo)}" alt="" ${IMG}></span>`
    : p.logo
      ? `<span class="${cls} is-logo"><img src="${esc(p.logo)}" alt="" ${IMG}></span>`
      : `<span class="${cls} is-text" style="background:${t.accent}"><b>${p.initial}</b></span>`;

/* Round icon buttons — the row people expect under the name. WhatsApp is left
   out on purpose: every design that uses this row already has a WhatsApp button
   in its bottom bar, and the same action twice on one screen just adds noise. */
const iconRow = (p: Parts, cls: string) => {
  const items = [
    p.phone ? { i: "fa fa-phone-alt", href: p.phoneHref, lab: "Call", bg: "#16A34A", ext: false } : null,
    p.email ? { i: "far fa-envelope", href: `mailto:${p.email}`, lab: "Email", bg: "#EF4444", ext: false } : null,
    p.website ? { i: "fa fa-globe", href: p.siteHref, lab: "Website", bg: "#2563EB", ext: true } : null,
    p.mapHref ? { i: "fa fa-map-marker-alt", href: p.mapHref, lab: "Directions", bg: "#F97316", ext: true } : null,
  ].filter(Boolean) as { i: string; href: string; lab: string; bg: string; ext: boolean }[];
  return `<div class="${cls}">${items.map((x) => `
    <a href="${esc(x.href)}"${x.ext ? ' target="_blank" rel="noopener"' : ""} aria-label="${x.lab}" style="--b:${x.bg}"><i class="${x.i}"></i></a>`).join("")}</div>`;
};

/* The three-button footer bar from the reference cards. */
const footBar = (p: Parts, cls: string) => `
  <div class="${cls}">
    <a ${saveHref(p)}><i class="fa fa-download"></i><span>Save to contacts</span></a>
    ${p.showShare && !p.thumb ? `<button type="button" onclick="pwShare()"><i class="fa fa-share-alt"></i><span>Share</span></button>` : ""}
    ${p.wa ? `<a href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i><span>WhatsApp</span></a>` : ""}
  </div>`;

const contactLines = (p: Parts, cls: string) => `
  <div class="${cls}">${p.contacts.map((r) => `
    <a href="${esc(r.href)}"${r.external ? ' target="_blank" rel="noopener"' : ""}><i class="${r.icon}"></i><span>${esc(r.value)}</span></a>`).join("")}</div>`;

const DESIGNS2: Design[] = [
  /* 1 ── PASTEL PORTRAIT (logo bar, round photo, colour icon row, share bar) */
  {
    id: "pastel2",
    css: (t) => `
    .pdx{background:#fff;}
    .pp-wrap{position:relative;padding:18px 18px 24px;background:${mix(t.accent, "#ffffff", 0.84)};text-align:center;overflow:hidden;}
    .pp-wrap::before{content:"";position:absolute;left:-60px;top:40px;width:200px;height:200px;border-radius:50%;background:${mix(t.accent, "#ffffff", 0.66)};}
    .pp-wrap::after{content:"";position:absolute;right:-70px;top:120px;width:230px;height:230px;border-radius:50%;background:${mix(t.accent, "#ffffff", 0.74)};}
    .pp-logo{position:relative;z-index:3;height:46px;display:flex;align-items:center;justify-content:center;}
    .pp-logo img{max-height:46px;max-width:70%;object-fit:contain;} .pp-logo b{font-family:'Poppins',sans-serif;font-size:22px;color:${t.accentInk};}
    .pp-ph{position:relative;z-index:3;margin:14px auto 12px;width:140px;height:140px;border-radius:50%;overflow:hidden;border:5px solid #fff;box-shadow:0 14px 30px -14px rgba(17,24,39,.5);background:${t.tint};display:flex;align-items:center;justify-content:center;}
    .pp-ph img{width:100%;height:100%;object-fit:cover;} .pp-ph.is-logo img{object-fit:contain;padding:14px;} .pp-ph.is-text b{color:#fff;font-size:56px;font-family:'Poppins',sans-serif;}
    .pp-name{position:relative;font-family:'Poppins',sans-serif;font-size:25px;font-weight:700;z-index:2;}
    .pp-role{position:relative;font-size:14px;color:${t.muted};z-index:2;}
    .pp-c{position:relative;z-index:2;margin-top:12px;font-size:14.5px;font-weight:600;}
    .pp-c a{display:block;color:${t.ink};text-decoration:none;padding:5px 0;}
    .pp-icons{position:relative;z-index:2;display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin-top:16px;}
    .pp-icons a{width:48px;height:48px;border-radius:50%;background:var(--b);color:#fff;display:flex;align-items:center;justify-content:center;font-size:19px;text-decoration:none;box-shadow:0 10px 20px -12px var(--b);}
    .pp-org{position:relative;z-index:2;margin-top:18px;font-family:'Poppins',sans-serif;font-size:18px;font-weight:700;}
    .pp-addr{position:relative;z-index:2;font-size:13px;color:${t.muted};}
    .pp-qr{position:relative;z-index:2;margin:16px auto 0;width:fit-content;background:#fff;padding:10px;border-radius:14px;}
    .pp-qr img{width:112px;height:112px;display:block;}
    .pp-bar{display:flex;border-top:1px solid ${t.line};background:#fff;}
    .pp-bar a,.pp-bar button{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;padding:13px 4px;font-size:11.5px;font-weight:600;color:${t.ink};text-decoration:none;border:none;background:none;font-family:inherit;cursor:pointer;}
    .pp-bar a+a,.pp-bar a+button,.pp-bar button+a{border-left:1px solid ${t.line};}
    .pp-bar i{font-size:16px;color:${t.accentInk};}
    .pp-socs{display:flex;justify-content:center;gap:10px;padding:14px;}
    .pp-views{position:absolute;right:16px;top:16px;z-index:4;font-size:11.5px;color:${t.muted};}`,
    front: (t, p) => `
    <div class="pp-wrap">
      ${p.showViews ? `<span class="pp-views">${viewCount(p)}</span>` : ""}
      ${brandMark(p, "pp-logo")}
      ${portrait(t, p, "pp-ph")}
      <h1 class="pp-name">${p.person || p.name}</h1>
      ${p.designation ? `<p class="pp-role">${p.designation}</p>` : ""}
      <div class="pp-c">
        ${p.phone ? `<a href="${p.phoneHref}">${esc(p.phone)}</a>` : ""}
        ${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ""}
      </div>
      ${iconRow(p, "pp-icons")}
      <div class="pp-org">${p.name}</div>
      ${p.address ? `<p class="pp-addr">${esc(p.address)}</p>` : ""}
      ${p.showQr ? `<div class="pp-qr">${qrFlip(p, 112)}</div>` : ""}
    </div>
    ${footBar(p, "pp-bar")}
    ${p.socials ? `<div class="pp-socs">${p.socials}</div>` : ""}`,
  },

  /* 2 ── BOLD CIRCLES (dark, big cut circles, avatar + wordmark) */
  {
    id: "circles",
    css: (t) => `
    .pdx{background:#121212;color:#F5F5F5;}
    .bc{position:relative;padding:26px 20px 18px;overflow:hidden;}
    .bc::before{content:"";position:absolute;left:-40px;top:-30px;width:190px;height:190px;border-radius:0 0 190px 0;background:${t.accent};opacity:.95;}
    .bc::after{content:"";position:absolute;right:-96px;top:196px;width:200px;height:200px;border-radius:50%;background:${mix(t.accent, "#EF4444", 0.65)};opacity:.55;}
    .bc-row{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:14px;}
    .bc-ph{width:104px;height:104px;border-radius:50%;overflow:hidden;border:4px solid #fff;background:#222;display:flex;align-items:center;justify-content:center;}
    .bc-ph img{width:100%;height:100%;object-fit:cover;} .bc-ph.is-logo img{object-fit:contain;padding:12px;background:#fff;} .bc-ph.is-text b{color:#fff;font-size:40px;}
    .bc-logo{max-width:46%;} .bc-logo img{max-width:100%;max-height:70px;object-fit:contain;} .bc-logo b{font-family:'Sora',sans-serif;font-size:24px;color:#fff;}
    .bc-name{position:relative;z-index:2;font-family:'Manrope',sans-serif;font-size:27px;font-weight:800;margin-top:22px;color:${mix(t.accent, "#ffffff", 0.3)};}
    .bc-role{position:relative;z-index:2;font-size:14.5px;color:${mix(t.accent, "#ffffff", 0.55)};}
    .bc-lines{position:relative;z-index:2;margin-top:20px;display:grid;gap:3px;}
    .bc-lines a{color:#F5F5F5;text-decoration:none;font-size:14.5px;display:flex;gap:10px;align-items:center;padding:5px 0;min-width:0;}
    .bc-lines i{width:18px;color:${t.accent};font-size:13px;}
    .bc-socs{position:relative;z-index:2;display:flex;gap:9px;margin-top:16px;}
    .bc-bottom{position:relative;z-index:2;display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-top:22px;}
    .bc-save{display:inline-flex;align-items:center;gap:9px;padding:13px 18px;border-radius:10px;background:${t.accent};color:#121212;font-weight:700;font-size:14px;text-decoration:none;border:none;font-family:inherit;cursor:pointer;}
    .bc-qr{background:#fff;padding:6px;border-radius:8px;} .bc-qr img{width:96px;height:96px;display:block;}
    .bc-acts{position:relative;z-index:2;display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:14px;}
    .bc-a{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border-radius:10px;background:#1C1C1C;border:1px solid #2A2A2A;color:#F5F5F5;font-size:13.5px;font-weight:600;text-decoration:none;font-family:inherit;cursor:pointer;}
    .bc-views{position:absolute;right:20px;top:200px;z-index:3;font-size:11.5px;color:#9CA3AF;}`,
    front: (t, p) => `
    <div class="bc">
      <div class="bc-row">
        ${portrait(t, p, "bc-ph")}
        ${brandMark(p, "bc-logo")}
      </div>
      <h1 class="bc-name">${p.person || p.name}</h1>
      ${p.designation ? `<p class="bc-role">${p.designation}</p>` : ""}
      ${contactLines(p, "bc-lines")}
      ${p.socials ? `<div class="bc-socs">${p.socials}</div>` : ""}
      <div class="bc-bottom">
        <a class="bc-save" ${saveHref(p)}><i class="fa fa-user-plus"></i> Save contact details</a>
        ${p.showQr ? `<span class="bc-qr">${qrFlip(p, 96)}</span>` : ""}
      </div>
      <div class="bc-acts">
        ${p.phone ? `<a class="bc-a" href="${p.phoneHref}"><i class="fa fa-phone-alt"></i> Call</a>` : ""}
        ${p.wa ? `<a class="bc-a" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ""}
        ${shareBtn(p, "bc-a")}
      </div>
      ${p.showViews ? `<span class="bc-views">${viewCount(p)}</span>` : ""}
    </div>`,
  },

  /* 3 ── LINK HUB (blue header, confetti card, brand social grid) */
  {
    id: "hub",
    css: (t) => `
    .pdx{background:#F4F6FB;}
    .hb-top{background:${t.onAccent};color:#fff;padding:16px 18px 54px;}
    .hb-top b{font-size:19px;font-family:'Poppins',sans-serif;} .hb-top small{display:block;font-size:12.5px;opacity:.85;}
    .hb-brand{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
    .hb-brand img{max-height:30px;max-width:140px;object-fit:contain;}
    .hb-brand:has(img){background:#fff;padding:5px 9px;border-radius:10px;width:fit-content;}
    .hb-brand b{font-size:16px;}
    .hb-card{position:relative;margin:-40px 14px 0;background:#fff;border-radius:20px;padding:18px;box-shadow:0 18px 40px -26px rgba(17,24,39,.6);overflow:hidden;}
    .hb-dot{position:absolute;border-radius:50%;opacity:.5;}
    .hb-row{position:relative;display:flex;align-items:center;gap:14px;z-index:2;}
    .hb-ph{width:96px;height:96px;border-radius:50%;overflow:hidden;background:${t.tint};flex-shrink:0;display:flex;align-items:center;justify-content:center;}
    .hb-ph img{width:100%;height:100%;object-fit:cover;} .hb-ph.is-logo img{object-fit:contain;padding:12px;} .hb-ph.is-text b{font-size:38px;color:#fff;}
    .hb-name{display:block;font-family:'Poppins',sans-serif;font-size:23px;font-weight:700;color:${t.accentInk};line-height:1.15;}
    .hb-role{display:block;font-size:13px;color:${t.muted};}
    .hb-mini{display:block;margin-top:8px;display:grid;gap:3px;font-size:12.5px;}
    .hb-mini a{color:${t.ink};text-decoration:none;display:flex;gap:7px;align-items:center;overflow:hidden;padding:5px 0;}
    .hb-mini a span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .hb-mini i{color:#16A34A;font-size:11px;}
    .hb-org{margin:16px 14px 0;background:#fff;border-radius:18px;padding:16px;box-shadow:0 14px 30px -26px rgba(17,24,39,.6);}
    .hb-org b{font-family:'Poppins',sans-serif;font-size:16px;display:block;}
    .hb-org p{font-size:13px;color:${t.muted};margin-top:6px;}
    .hb-socgrid{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:16px 14px 0;}
    .hb-socgrid .pdx-soc{width:46px;height:46px;font-size:18px;}
    .hb-list{margin:16px 14px 0;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 14px 30px -26px rgba(17,24,39,.6);}
    .hb-li{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid ${t.line};color:${t.ink};text-decoration:none;font-size:14px;font-weight:600;border:none;background:none;width:100%;font-family:inherit;cursor:pointer;}
    .hb-li:last-child{border-bottom:none;}
    .hb-li i.lead{width:30px;height:30px;border-radius:9px;background:${t.tint};color:${t.accentInk};display:flex;align-items:center;justify-content:center;font-size:13px;}
    .hb-li i.go{margin-left:auto;color:#C7CBD3;font-size:12px;}
    .hb-qr{margin:16px 14px 0;background:#fff;border-radius:18px;padding:14px;display:flex;align-items:center;gap:13px;box-shadow:0 14px 30px -26px rgba(17,24,39,.6);}
    .hb-qr img{width:92px;height:92px;border-radius:8px;}`,
    front: (t, p) => `
    <div class="hb-top">${brandMark(p, "hb-brand")}<b>Hello 👋</b><small>${p.name}${p.showViews ? ` · ${p.views.toLocaleString("en-IN")} views` : ""}</small></div>
    <div class="hb-card">
      <span class="hb-dot" style="width:70px;height:70px;background:${t.tint2};right:-14px;top:-18px"></span>
      <span class="hb-dot" style="width:40px;height:40px;background:${mix(t.accent, "#A7F3D0", 0.5)};right:-16px;bottom:-16px"></span>
      <div class="hb-row">
        ${portrait(t, p, "hb-ph")}
        <span>
          <span class="hb-name">${p.person || p.name}</span>
          ${p.designation ? `<span class="hb-role">${p.designation}</span>` : ""}
          <span class="hb-mini">
            ${p.phone ? `<a href="${p.phoneHref}"><i class="fa fa-phone-alt"></i><span>${esc(p.phone)}</span></a>` : ""}
            ${p.email ? `<a href="mailto:${esc(p.email)}"><i class="far fa-envelope"></i><span>${esc(p.email)}</span></a>` : ""}
          </span>
        </span>
      </div>
    </div>
    ${p.about || p.person ? `<div class="hb-org"><b>${p.name}</b>${p.about ? `<p>${p.about}</p>` : ""}</div>` : ""}
    ${p.socials ? `<div class="hb-socgrid">${p.socials}</div>` : ""}
    <div class="hb-list">
      <a class="hb-li" ${saveHref(p)}><i class="fa fa-address-book lead"></i> Share to my contacts <i class="fa fa-chevron-right go"></i></a>
      ${p.wa ? `<a class="hb-li" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp lead"></i> Chat on WhatsApp <i class="fa fa-chevron-right go"></i></a>` : ""}
      ${p.website ? `<a class="hb-li" href="${esc(p.siteHref)}" target="_blank" rel="noopener"><i class="fa fa-globe lead"></i> ${esc(p.webLabel)} <i class="fa fa-chevron-right go"></i></a>` : ""}
      ${p.mapHref ? `<a class="hb-li" href="${esc(p.mapHref)}" target="_blank" rel="noopener"><i class="fa fa-map-marker-alt lead"></i> Get directions <i class="fa fa-chevron-right go"></i></a>` : ""}
      ${p.showShare && !p.thumb ? `<button class="hb-li" type="button" onclick="pwShare()"><i class="fa fa-share-alt lead"></i> Share this card <i class="fa fa-chevron-right go"></i></button>` : ""}
    </div>
    ${p.showQr ? `<div class="hb-qr"><img src="${p.qr(200)}" alt="QR code for this card" ${IMG}><span><b>QR code</b><br><small style="color:#6B7280">Scan to open this card</small></span></div>` : ""}`,
  },

  /* 4 ── AGENCY STACK (logo bar, photo + navy name block, icon strip, link rows) */
  {
    id: "stack",
    css: (t) => `
    .pdx{background:#F3F4F6;}
    .ag-bar{display:flex;align-items:center;gap:10px;padding:14px 16px;background:#fff;}
    .ag-bar .ag-logo{height:34px;} .ag-bar img{max-height:34px;max-width:160px;object-fit:contain;}
    .ag-bar b{font-family:'Poppins',sans-serif;font-size:19px;color:${t.accentInk};}
    .ag-hero{display:flex;gap:12px;padding:14px 16px 0;}
    .ag-ph{width:46%;aspect-ratio:3/3.4;border-radius:14px;overflow:hidden;background:${t.tint};display:flex;align-items:center;justify-content:center;}
    .ag-ph img{width:100%;height:100%;object-fit:cover;} .ag-ph.is-logo img{object-fit:contain;padding:14px;} .ag-ph.is-text b{font-size:46px;color:#fff;}
    .ag-nav{flex:1;background:${t.deep};color:#fff;border-radius:14px;padding:16px;display:flex;flex-direction:column;justify-content:center;}
    .ag-name{display:block;font-family:'Poppins',sans-serif;font-size:21px;font-weight:700;line-height:1.15;}
    .ag-role{display:block;font-size:13px;opacity:.82;margin-top:6px;}
    .ag-strip{display:flex;justify-content:space-around;gap:8px;margin:14px 16px 0;padding:12px;border-radius:14px;background:${t.accent};}
    .ag-strip a{width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.8);color:#fff;display:flex;align-items:center;justify-content:center;font-size:17px;text-decoration:none;}
    .ag-rows{margin:14px 16px 0;display:grid;gap:10px;}
    .ag-r{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:14px;background:#fff;text-decoration:none;color:${t.ink};box-shadow:0 10px 24px -22px rgba(17,24,39,.8);}
    .ag-r .ic{width:38px;height:38px;border-radius:11px;background:${t.tint};color:${t.accentInk};display:flex;align-items:center;justify-content:center;font-size:16px;}
    .ag-r b{display:block;font-size:14px;} .ag-r small{display:block;font-size:11.5px;color:${t.muted};}
    .ag-r i.go{margin-left:auto;color:#C7CBD3;}
    .ag-bottom{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;margin:16px 16px 0;padding:12px 14px;border-radius:16px;background:${t.deep};color:#fff;}
    .ag-bottom a,.ag-bottom button{display:inline-flex;align-items:center;gap:8px;padding:11px 14px;border-radius:12px;background:${t.accent};color:${t.ink};font-weight:700;font-size:13px;text-decoration:none;border:none;font-family:inherit;cursor:pointer;}
    .ag-qr{background:#fff;padding:5px;border-radius:8px;} .ag-qr img{width:64px;height:64px;display:block;}
    .ag-socs{display:flex;justify-content:center;gap:9px;margin-top:14px;}
    .ag-views{font-size:11.5px;opacity:.8;}`,
    front: (t, p) => `
    <div class="ag-bar">${brandMark(p, "ag-logo")}<span style="margin-left:auto;font-size:11.5px;color:#6B7280">${p.showViews ? viewCount(p) : ""}</span></div>
    <div class="ag-hero">
      ${portrait(t, p, "ag-ph")}
      <div class="ag-nav">
        <span class="ag-name">${p.person || p.name}</span>
        ${p.designation ? `<span class="ag-role">${p.designation}</span>` : ""}
      </div>
    </div>
    ${iconRow(p, "ag-strip")}
    <div class="ag-rows">
      ${p.phone ? `<a class="ag-r" href="${p.phoneHref}"><span class="ic"><i class="fa fa-phone-alt"></i></span><span><b>Call us</b><small>${esc(p.phone)}</small></span><i class="fa fa-chevron-right go"></i></a>` : ""}
      ${p.wa ? `<a class="ag-r" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><span class="ic"><i class="fab fa-whatsapp"></i></span><span><b>WhatsApp</b><small>Chat with our team</small></span><i class="fa fa-chevron-right go"></i></a>` : ""}
      ${p.website ? `<a class="ag-r" href="${esc(p.siteHref)}" target="_blank" rel="noopener"><span class="ic"><i class="fa fa-globe"></i></span><span><b>Website</b><small>${esc(p.webLabel)}</small></span><i class="fa fa-chevron-right go"></i></a>` : ""}
      ${p.mapHref ? `<a class="ag-r" href="${esc(p.mapHref)}" target="_blank" rel="noopener"><span class="ic"><i class="fa fa-map-marker-alt"></i></span><span><b>Visit us</b><small>${esc(p.address)}</small></span><i class="fa fa-chevron-right go"></i></a>` : ""}
    </div>
    <div class="ag-bottom">
      ${p.showQr ? `<span class="ag-qr"><img src="${p.qr(180)}" alt="QR code for this card" ${IMG}></span>` : `<span class="ag-views">${p.name}</span>`}
      <a ${saveHref(p)}><i class="fa fa-user-plus"></i> Add to contacts</a>
      ${shareBtn(p, "")}
    </div>
    ${p.socials ? `<div class="ag-socs">${p.socials}</div>` : ""}`,
  },

  /* 5 ── GEO YELLOW (geometric corners, left social rail, UPI/WhatsApp bar) */
  {
    id: "geo",
    css: (t) => `
    .pdx{background:#fff;}
    .gy{position:relative;padding:22px 18px 18px 64px;overflow:hidden;}
    .gy::before{content:"";position:absolute;right:-40px;top:-50px;width:170px;height:170px;background:${t.accent};transform:rotate(45deg);border-radius:28px;}
    .gy::after{content:"";position:absolute;left:-70px;bottom:40px;width:150px;height:150px;background:${mix(t.accent, "#ffffff", 0.55)};border-radius:40px;transform:rotate(30deg);}
    .gy-rail{position:absolute;left:10px;top:70px;display:grid;gap:9px;z-index:3;}
    .gy-rail .pdx-soc{width:38px;height:38px;font-size:15px;border-radius:10px;}
    .gy-logo{position:relative;z-index:2;margin:0 auto;width:fit-content;padding:10px 14px;border:2px dashed ${t.line};border-radius:12px;background:#fff;}
    .gy-logo img{max-height:62px;max-width:170px;object-fit:contain;display:block;} .gy-logo b{font-family:'Poppins',sans-serif;font-size:26px;color:${t.accentInk};}
    .gy-name{position:relative;z-index:2;text-align:center;font-family:'Poppins',sans-serif;font-size:23px;font-weight:700;margin-top:14px;}
    .gy-tag{position:relative;z-index:2;text-align:center;font-size:13.5px;color:${t.muted};margin-top:8px;}
    .gy-person{position:relative;z-index:2;text-align:center;font-size:12px;color:${t.muted};margin-top:10px;}
    .gy-lines{position:relative;z-index:2;margin-top:18px;display:grid;gap:12px;}
    .gy-lines a{display:flex;align-items:center;gap:13px;min-width:0;color:${t.ink};text-decoration:none;font-size:15px;font-weight:600;}
    .gy-lines a span{min-width:0;flex:1;overflow-wrap:anywhere;}
    .gy-lines i{width:40px;height:40px;border-radius:50%;background:${t.ink};color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
    .gy-save{position:relative;z-index:2;display:flex;align-items:center;gap:11px;margin-top:18px;padding:14px 18px;background:${t.accent};color:${t.ink};font-weight:700;font-size:15.5px;text-decoration:none;clip-path:polygon(0 0,100% 0,94% 100%,0 100%);}
    .gy-qr{position:relative;z-index:2;margin:16px auto 0;width:fit-content;}
    .gy-qr img{width:120px;height:120px;display:block;}
    .gy-bar{position:sticky;bottom:0;display:flex;z-index:40;}
    .gy-bar a,.gy-bar button{flex:1;display:flex;align-items:center;justify-content:center;gap:9px;padding:16px 8px;font-size:14px;font-weight:700;text-decoration:none;border:none;font-family:inherit;cursor:pointer;}
    .gy-wa{background:${t.ink};color:#fff;} .gy-upi{background:${t.accent};color:${t.ink};}`,
    front: (_t, p) => `
    <div class="gy">
      ${p.socials ? `<div class="gy-rail">${p.socials}</div>` : ""}
      ${logoImg(p, "gy-logo")}
      <h1 class="gy-name">${p.name}</h1>
      ${p.tagline || p.about ? `<p class="gy-tag">${p.tagline || p.about}</p>` : ""}
      ${p.person ? `<p class="gy-person">${p.person}${p.designation ? ` · ${p.designation}` : ""}</p>` : ""}
      <div class="gy-lines">
        ${p.phone ? `<a href="${p.phoneHref}"><i class="fa fa-phone-alt"></i><span>${esc(p.phone)}</span></a>` : ""}
        ${p.email ? `<a href="mailto:${esc(p.email)}"><i class="far fa-envelope"></i><span>${esc(p.email)}</span></a>` : ""}
        ${p.address ? `<a href="${esc(p.mapHref || "#")}" target="_blank" rel="noopener"><i class="fa fa-map-marker-alt"></i><span>${esc(p.address)}</span></a>` : ""}
        ${p.website ? `<a href="${esc(p.siteHref)}" target="_blank" rel="noopener"><i class="fa fa-globe"></i><span>${esc(p.webLabel)}</span></a>` : ""}
      </div>
      <a class="gy-save" ${saveHref(p)}><i class="fa fa-user-plus"></i> Save Contact</a>
      ${p.showQr ? `<div class="gy-qr"><img src="${p.qr(240)}" alt="QR code for this card" ${IMG}></div>` : ""}
      ${p.showViews ? `<p class="gy-person" style="margin-top:12px">${viewCount(p)}</p>` : ""}
    </div>
    ${p.thumb ? "" : `<div class="gy-bar">
      ${p.wa ? `<a class="gy-wa" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ""}
      <a class="gy-upi" href="#payment-section"><i class="fa fa-rupee-sign"></i> Payment</a>
    </div>`}`,
  },

  /* 6 ── SKY PROFILE (rounded blue panel, tile row, about block) */
  {
    id: "sky",
    css: (t) => `
    .pdx{background:#fff;}
    .sk-top{display:flex;align-items:center;gap:9px;padding:14px 18px 0;font-size:13px;color:${t.muted};}
    .sk-top img{height:26px;max-width:120px;object-fit:contain;} .sk-top b{font-size:15px;color:${t.ink};}
    .sk-ph{width:168px;height:168px;border-radius:50%;margin:12px auto 0;overflow:hidden;background:${t.tint};display:flex;align-items:center;justify-content:center;}
    .sk-ph img{width:100%;height:100%;object-fit:cover;} .sk-ph.is-logo img{object-fit:contain;padding:24px;} .sk-ph.is-text b{font-size:62px;color:#fff;}
    .sk-panel{position:relative;margin:-54px 16px 0;padding:70px 18px 20px;border-radius:26px;background:${mix(t.accent, "#ffffff", 0.78)};text-align:center;}
    .sk-share{position:absolute;right:16px;top:60px;width:38px;height:38px;border-radius:50%;background:#fff;border:none;color:${t.accentInk};font-size:14px;cursor:pointer;box-shadow:0 8px 18px -10px rgba(17,24,39,.6);}
    .sk-name{font-family:'Poppins',sans-serif;font-size:26px;font-weight:700;line-height:1.15;}
    .sk-role{font-size:13px;color:${t.muted};margin-top:4px;font-style:italic;}
    .sk-tag{display:block;margin-top:14px;padding:11px 14px;border-radius:14px;background:${mix(t.accent, "#ffffff", 0.6)};font-size:13px;font-style:italic;color:${t.ink};}
    .sk-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 16px 0;}
    .sk-t{display:flex;flex-direction:column;align-items:center;gap:7px;padding:16px 6px;border-radius:18px;background:#fff;border:1px solid ${t.line};color:${t.ink};font-size:11.5px;font-weight:600;text-decoration:none;box-shadow:0 12px 26px -24px rgba(17,24,39,.9);}
    .sk-t i{font-size:19px;color:${t.accentInk};}
    .sk-about{margin:16px 16px 0;padding:16px;border-radius:20px;background:${mix(t.accent, "#ffffff", 0.84)};}
    .sk-about b{font-family:'Poppins',sans-serif;font-size:15px;display:block;margin-bottom:6px;}
    .sk-about p{font-size:13.5px;color:${t.ink};opacity:.82;}
    .sk-lines{margin:14px 16px 0;display:grid;gap:9px;}
    .sk-lines a{display:flex;align-items:center;gap:11px;padding:12px 14px;border-radius:14px;border:1px solid ${t.line};color:${t.ink};text-decoration:none;font-size:13.5px;}
    .sk-lines i{color:${t.accentInk};width:18px;}
    .sk-socs{display:flex;justify-content:center;gap:10px;margin-top:16px;}
    .sk-views{margin-left:auto;font-size:11.5px;}`,
    front: (t, p) => `
    <div class="sk-top">${brandMark(p, "sk-logoline")}${p.showViews ? `<span class="sk-views">${viewCount(p)}</span>` : ""}</div>
    ${portrait(t, p, "sk-ph")}
    <div class="sk-panel">
      ${p.showShare && !p.thumb ? `<button class="sk-share" type="button" onclick="pwShare()" aria-label="Share"><i class="fa fa-share-alt"></i></button>` : ""}
      <h1 class="sk-name">${p.person || p.name}</h1>
      ${p.designation ? `<p class="sk-role">${p.designation}${p.person ? ` · ${p.name}` : ""}</p>` : ""}
      ${p.tagline ? `<span class="sk-tag">${p.tagline}</span>` : ""}
    </div>
    <div class="sk-tiles">
      ${p.phone ? `<a class="sk-t" href="${p.phoneHref}"><i class="fa fa-mobile-alt"></i> Mobile</a>` : ""}
      ${p.email ? `<a class="sk-t" href="mailto:${esc(p.email)}"><i class="fa fa-at"></i> Email</a>` : ""}
      <a class="sk-t" ${saveHref(p)}><i class="fa fa-qrcode"></i> Add to wallet</a>
    </div>
    ${p.about ? `<div class="sk-about"><b>About</b><p>${p.about}</p></div>` : ""}
    <div class="sk-lines">
      ${p.wa ? `<a href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp us</a>` : ""}
      ${p.website ? `<a href="${esc(p.siteHref)}" target="_blank" rel="noopener"><i class="fa fa-globe"></i> ${esc(p.webLabel)}</a>` : ""}
      ${p.mapHref ? `<a href="${esc(p.mapHref)}" target="_blank" rel="noopener"><i class="fa fa-map-marker-alt"></i> ${esc(p.address)}</a>` : ""}
    </div>
    ${p.showQr ? `<div class="sk-lines"><a href="${p.cardUrl}" target="_blank" rel="noopener" style="justify-content:center"><img src="${p.qr(200)}" alt="QR code for this card" style="width:120px;height:120px" ${IMG}></a></div>` : ""}
    ${p.socials ? `<div class="sk-socs">${p.socials}</div>` : ""}`,
  },

  /* 7 ── PHOTO FRAME (full photo background, glass overlay, side rail) */
  {
    id: "frame",
    css: (t) => `
    .pdx{background:#1A120B;color:#fff;}
    .fr{position:relative;min-height:520px;padding:22px 16px 22px;}
    .fr-bg{position:absolute;inset:0;overflow:hidden;}
    .fr-bg img{width:100%;height:100%;object-fit:cover;filter:saturate(1.05) contrast(1.02);}
    .fr-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,${mix(t.deep, "#000000", 0.15)}66,${mix(t.deep, "#000000", 0.35)}B8 46%,${mix(t.deep, "#000000", 0.5)}F0);}
    .fr-in{position:relative;z-index:2;text-align:center;}
    .fr-logo{display:flex;justify-content:center;}
    .fr-logo img{max-height:38px;max-width:150px;object-fit:contain;} .fr-logo:has(img){background:rgba(255,255,255,.92);padding:6px 10px;border-radius:12px;width:fit-content;margin:0 auto;}
    .fr-logo b{font-size:18px;letter-spacing:.04em;}
    .fr-ph{width:118px;height:118px;border-radius:50%;margin:10px auto 0;overflow:hidden;border:3px solid rgba(255,255,255,.75);background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;}
    .fr-ph img{width:100%;height:100%;object-fit:cover;} .fr-ph.is-logo img{object-fit:contain;padding:16px;} .fr-ph.is-text b{font-size:44px;}
    .fr-icons{display:flex;justify-content:center;gap:14px;margin-top:18px;}
    .fr-icons a{width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.35);color:#fff;display:flex;align-items:center;justify-content:center;font-size:17px;text-decoration:none;backdrop-filter:blur(6px);}
    .fr-name{font-family:Georgia,serif;font-size:27px;margin-top:18px;}
    .fr-role{font-size:13.5px;opacity:.85;}
    .fr-org{margin-top:12px;font-size:15px;font-weight:600;}
    .fr-rail{position:absolute;right:14px;top:170px;display:grid;gap:8px;z-index:3;}
    .fr-rail .pdx-soc{width:34px;height:34px;font-size:14px;background:rgba(255,255,255,.22);}
    .fr-qr{position:relative;z-index:2;margin:18px auto 0;width:fit-content;background:#fff;padding:8px;border-radius:12px;}
    .fr-qr img{width:110px;height:110px;display:block;}
    .fr-bar{position:relative;z-index:2;display:flex;margin-top:20px;border-top:1px solid rgba(255,255,255,.25);}
    .fr-bar a,.fr-bar button{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;padding:14px 4px;color:#fff;text-decoration:none;font-size:11.5px;font-weight:600;background:none;border:none;font-family:inherit;cursor:pointer;}
    .fr-bar a+a,.fr-bar a+button{border-left:1px solid rgba(255,255,255,.25);}
    .fr-views{position:absolute;left:16px;top:22px;z-index:3;font-size:11.5px;background:rgba(0,0,0,.35);padding:4px 10px;border-radius:999px;}`,
    front: (t, p) => `
    <div class="fr">
      <div class="fr-bg">${p.photos[0] || p.photo ? `<img src="${esc(p.photos[0] || p.photo)}" alt="" ${IMG}>` : ""}</div>
      ${p.showViews ? `<span class="fr-views">${viewCount(p)}</span>` : ""}
      ${p.socials ? `<div class="fr-rail">${p.socials}</div>` : ""}
      <div class="fr-in">
        ${brandMark(p, "fr-logo")}
        ${portrait(t, p, "fr-ph")}
        ${iconRow(p, "fr-icons")}
        <h1 class="fr-name">${p.person || p.name}</h1>
        ${p.designation ? `<p class="fr-role">${p.designation}</p>` : ""}
        ${p.person ? `<p class="fr-org">${p.name}</p>` : ""}
        ${p.showQr ? `<div class="fr-qr"><img src="${p.qr(220)}" alt="QR code for this card" ${IMG}></div>` : ""}
      </div>
      ${footBar(p, "fr-bar")}
    </div>`,
  },

  /* 8 ── DIAGONAL SPLIT (colour wedge, photo right, details left) */
  {
    id: "diagonal",
    css: (t) => `
    .pdx{background:#fff;}
    .dg{position:relative;padding:24px 18px 20px;overflow:hidden;background:linear-gradient(150deg,${t.accent} 0 54%,#fff 54% 100%);}
    .dg-row{display:flex;align-items:center;gap:14px;}
    .dg-ph{width:108px;height:108px;border-radius:22px;overflow:hidden;border:4px solid #fff;box-shadow:0 14px 28px -16px rgba(17,24,39,.6);background:${t.tint};flex-shrink:0;display:flex;align-items:center;justify-content:center;}
    .dg-ph img{width:100%;height:100%;object-fit:cover;} .dg-ph.is-logo img{object-fit:contain;padding:12px;background:#fff;} .dg-ph.is-text b{font-size:42px;color:#fff;}
    .dg-name{display:block;font-family:'Sora',sans-serif;font-size:23px;font-weight:800;color:#fff;line-height:1.15;}
    .dg-role{display:block;font-size:13px;color:rgba(255,255,255,.88);}
    .dg-logo{display:block;margin-bottom:14px;}
    .dg-logo:has(img){background:rgba(255,255,255,.92);padding:6px 10px;border-radius:10px;width:fit-content;}
    .dg-logo b{color:#fff;} .dg-logo img{max-height:34px;max-width:140px;object-fit:contain;} .dg-logo b{font-size:17px;color:${t.ink};}
    .dg-lines{margin-top:12px;display:grid;gap:9px;}
    .dg-lines a{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:#fff;border:1px solid ${t.line};color:${t.ink};text-decoration:none;font-size:13.5px;box-shadow:0 10px 22px -22px rgba(17,24,39,.9);}
    .dg-lines i{width:34px;height:34px;border-radius:11px;background:${t.tint};color:${t.accentInk};display:flex;align-items:center;justify-content:center;font-size:14px;}
    .dg-cta{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px;}
    .dg-b{display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:14px;font-size:14px;font-weight:700;text-decoration:none;border:none;font-family:inherit;cursor:pointer;background:${t.ink};color:#fff;}
    .dg-b--alt{background:#fff;color:${t.ink};border:1px solid ${t.line};}
    .dg-qr{display:flex;align-items:center;gap:12px;margin-top:14px;padding:12px;border-radius:16px;border:1px solid ${t.line};}
    .dg-qr img{width:90px;height:90px;border-radius:8px;}
    .dg-socs{display:flex;justify-content:center;gap:9px;margin-top:16px;}
    .dg-views{position:absolute;right:18px;top:22px;font-size:11.5px;color:rgba(255,255,255,.9);}`,
    front: (t, p) => `
    <div class="dg">
      ${p.showViews ? `<span class="dg-views">${viewCount(p)}</span>` : ""}
      ${brandMark(p, "dg-logo")}
      <div class="dg-row">
        ${portrait(t, p, "dg-ph")}
        <span><span class="dg-name">${p.person || p.name}</span>${p.designation ? `<span class="dg-role">${p.designation}</span>` : ""}</span>
      </div>
      <div class="dg-lines">
        ${p.phone ? `<a href="${p.phoneHref}"><i class="fa fa-phone-alt"></i> ${esc(p.phone)}</a>` : ""}
        ${p.email ? `<a href="mailto:${esc(p.email)}"><i class="far fa-envelope"></i> ${esc(p.email)}</a>` : ""}
        ${p.website ? `<a href="${esc(p.siteHref)}" target="_blank" rel="noopener"><i class="fa fa-globe"></i> ${esc(p.webLabel)}</a>` : ""}
        ${p.address ? `<a href="${esc(p.mapHref || "#")}" target="_blank" rel="noopener"><i class="fa fa-map-marker-alt"></i> ${esc(p.address)}</a>` : ""}
      </div>
      <div class="dg-cta">
        ${p.wa ? `<a class="dg-b" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ""}
        <a class="dg-b dg-b--alt" ${saveHref(p)}><i class="fa fa-user-plus"></i> Save contact</a>
        ${shareBtn(p, "dg-b dg-b--alt")}
      </div>
      ${p.showQr ? `<div class="dg-qr"><img src="${p.qr(200)}" alt="QR code for this card" ${IMG}><span><b>Scan to open</b><br><small style="color:#6B7280">Share in one tap</small></span></div>` : ""}
      ${p.socials ? `<div class="dg-socs">${p.socials}</div>` : ""}
    </div>`,
  },

  /* 9 ── RIBBON WAVE (wave header, overlapping avatar, vCard bar) */
  {
    id: "ribbon",
    css: (t) => `
    .pdx{background:#FAFAFB;}
    .rb-head{position:relative;height:186px;background:linear-gradient(120deg,${t.accent},${t.deep});}
    .rb-head svg{position:absolute;bottom:-1px;left:0;width:100%;height:64px;}
    .rb-logo{position:absolute;left:18px;top:18px;z-index:3;} .rb-logo img{max-height:36px;max-width:150px;object-fit:contain;} .rb-logo:has(img){background:#fff;padding:5px 9px;border-radius:10px;} .rb-logo b{color:#fff;font-size:18px;}
    .rb-views{position:absolute;right:18px;top:20px;z-index:3;color:#fff;font-size:11.5px;background:rgba(255,255,255,.2);padding:4px 10px;border-radius:999px;}
    .rb-ph{position:relative;width:124px;height:124px;margin:-70px auto 0;border-radius:50%;overflow:hidden;border:5px solid #fff;box-shadow:0 16px 30px -18px rgba(17,24,39,.6);background:${t.tint};z-index:4;display:flex;align-items:center;justify-content:center;}
    .rb-ph img{width:100%;height:100%;object-fit:cover;} .rb-ph.is-logo img{object-fit:contain;padding:16px;background:#fff;} .rb-ph.is-text b{font-size:46px;color:#fff;}
    .rb-name{text-align:center;font-family:'Manrope',sans-serif;font-size:25px;font-weight:800;margin-top:12px;}
    .rb-role{text-align:center;font-size:13.5px;color:${t.accentInk};font-weight:600;}
    .rb-org{text-align:center;font-size:12.5px;color:${t.muted};}
    .rb-chips{display:flex;justify-content:center;flex-wrap:wrap;gap:7px;margin:12px 16px 0;}
    .rb-chip{font-size:11.5px;font-weight:600;background:${t.tint};color:${t.accentInk};padding:6px 11px;border-radius:999px;}
    .rb-cards{margin:16px 16px 0;display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    .rb-c{min-width:0;display:flex;flex-direction:column;gap:7px;padding:14px;border-radius:18px;background:#fff;border:1px solid ${t.line};color:${t.ink};text-decoration:none;}
    .rb-c i{width:36px;height:36px;border-radius:12px;background:${t.tint};color:${t.accentInk};display:flex;align-items:center;justify-content:center;font-size:15px;}
    .rb-c b{font-size:13.5px;} .rb-c small{font-size:11.5px;color:${t.muted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .rb-wide{grid-column:span 2;flex-direction:row;align-items:center;gap:12px;}
    .rb-wide > span{min-width:0;}
    .rb-bar{position:sticky;bottom:0;display:flex;gap:9px;padding:12px 16px;background:rgba(250,250,251,.92);backdrop-filter:blur(8px);border-top:1px solid ${t.line};z-index:30;}
    .rb-bar a,.rb-bar button{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:14px;font-size:14px;font-weight:700;text-decoration:none;border:none;font-family:inherit;cursor:pointer;background:${t.onAccent};color:#fff;}
    .rb-bar .alt{background:#fff;color:${t.ink};border:1px solid ${t.line};}
    .rb-socs{display:flex;justify-content:center;gap:9px;margin-top:16px;}`,
    front: (t, p) => `
    <div class="rb-head">
      ${brandMark(p, "rb-logo")}
      ${p.showViews ? `<span class="rb-views">${viewCount(p)}</span>` : ""}
      <svg viewBox="0 0 430 64" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30c80 28 170 34 240 20s130-26 190-6v20H0z" fill="#FAFAFB"/></svg>
    </div>
    ${portrait(t, p, "rb-ph")}
    <h1 class="rb-name">${p.person || p.name}</h1>
    ${p.designation ? `<p class="rb-role">${p.designation}</p>` : ""}
    ${p.person ? `<p class="rb-org">${p.name}</p>` : ""}
    ${p.specialities.length ? `<div class="rb-chips">${p.specialities.map((x) => `<span class="rb-chip">${esc(x)}</span>`).join("")}</div>` : ""}
    <div class="rb-cards">
      ${p.phone ? `<a class="rb-c" href="${p.phoneHref}"><i class="fa fa-phone-alt"></i><b>Call</b><small>${esc(p.phone)}</small></a>` : ""}
      ${p.wa ? `<a class="rb-c" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i><b>WhatsApp</b><small>Chat now</small></a>` : ""}
      ${p.email ? `<a class="rb-c" href="mailto:${esc(p.email)}"><i class="far fa-envelope"></i><b>Email</b><small>${esc(p.email)}</small></a>` : ""}
      ${p.website ? `<a class="rb-c" href="${esc(p.siteHref)}" target="_blank" rel="noopener"><i class="fa fa-globe"></i><b>Website</b><small>${esc(p.webLabel)}</small></a>` : ""}
      ${p.mapHref ? `<a class="rb-c rb-wide" href="${esc(p.mapHref)}" target="_blank" rel="noopener"><i class="fa fa-map-marker-alt"></i><span><b>Visit us</b><small style="display:block">${esc(p.address)}</small></span></a>` : ""}
      ${p.showQr ? `<div class="rb-c rb-wide"><img src="${p.qr(200)}" alt="QR code for this card" style="width:84px;height:84px;border-radius:8px" ${IMG}><span><b>Scan to open</b><small style="display:block">Share this card anywhere</small></span></div>` : ""}
    </div>
    ${p.socials ? `<div class="rb-socs">${p.socials}</div>` : ""}
    ${p.thumb ? "" : `<div class="rb-bar">
      <a ${saveHref(p)}><i class="fa fa-user-plus"></i> Save contact</a>
      ${shareBtn(p, "alt")}
    </div>`}`,
  },

  /* 10 ── CORPORATE SLATE (letterhead bar, portrait block, formal detail table) */
  {
    id: "slate",
    css: (t) => `
    .pdx{background:#F8F9FB;}
    .sl-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;background:${t.deep};color:#fff;}
    .sl-bar img{max-height:32px;max-width:150px;object-fit:contain;} .sl-bar span:has(img){background:#fff;padding:5px 9px;border-radius:10px;display:inline-flex;} .sl-bar b{font-size:17px;font-family:'Poppins',sans-serif;}
    .sl-bar small{font-size:11px;opacity:.8;letter-spacing:.16em;text-transform:uppercase;}
    .sl-hero{background:#fff;padding:20px 18px;display:flex;gap:16px;align-items:center;border-bottom:3px solid ${t.accent};}
    .sl-ph{width:96px;height:112px;border-radius:12px;overflow:hidden;background:${t.tint};flex-shrink:0;display:flex;align-items:center;justify-content:center;}
    .sl-ph img{width:100%;height:100%;object-fit:cover;} .sl-ph.is-logo img{object-fit:contain;padding:10px;} .sl-ph.is-text b{font-size:40px;color:#fff;}
    .sl-name{display:block;font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;line-height:1.2;}
    .sl-role{display:block;font-size:13px;color:${t.accentInk};font-weight:600;margin-top:2px;}
    .sl-org{display:block;font-size:12.5px;color:${t.muted};margin-top:4px;}
    .sl-table{margin:14px 16px 0;background:#fff;border:1px solid ${t.line};border-radius:14px;overflow:hidden;}
    .sl-tr{display:flex;align-items:center;gap:12px;padding:13px 15px;border-bottom:1px solid ${t.line};color:${t.ink};text-decoration:none;font-size:13.5px;}
    .sl-tr:last-child{border-bottom:none;}
    .sl-tr span.l{width:84px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:${t.muted};flex-shrink:0;}
    .sl-tr b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .sl-tr i{margin-left:auto;color:${t.accentInk};}
    .sl-acts{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin:14px 16px 0;}
    .sl-a{display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;border:1px solid ${t.line};background:#fff;color:${t.ink};font-family:inherit;cursor:pointer;}
    .sl-a--go{background:${t.deep};color:#fff;border-color:transparent;}
    .sl-qr{margin:14px 16px 0;background:#fff;border:1px solid ${t.line};border-radius:14px;padding:14px;display:flex;align-items:center;gap:14px;}
    .sl-qr img{width:96px;height:96px;}
    .sl-socs{display:flex;justify-content:center;gap:9px;margin-top:16px;}`,
    front: (t, p) => `
    <div class="sl-bar">${brandMark(p, "sl-logo")}<small>${p.showViews ? `${p.views.toLocaleString("en-IN")} views` : "Digital card"}</small></div>
    <div class="sl-hero">
      ${portrait(t, p, "sl-ph")}
      <span>
        <span class="sl-name">${p.person || p.name}</span>
        ${p.designation ? `<span class="sl-role">${p.designation}</span>` : ""}
        ${p.person ? `<span class="sl-org">${p.name}</span>` : ""}
        ${p.tagline ? `<span class="sl-org">${p.tagline}</span>` : ""}
      </span>
    </div>
    <div class="sl-table">
      ${p.contacts.map((r) => `<a class="sl-tr" href="${esc(r.href)}"${r.external ? ' target="_blank" rel="noopener"' : ""}><span class="l">${esc(r.label)}</span><b>${esc(r.value)}</b><i class="${r.icon}"></i></a>`).join("")}
    </div>
    <div class="sl-acts">
      ${p.phone ? `<a class="sl-a sl-a--go" href="${p.phoneHref}"><i class="fa fa-phone-alt"></i> Call</a>` : ""}
      ${p.wa ? `<a class="sl-a" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ""}
      <a class="sl-a" ${saveHref(p)}><i class="fa fa-user-plus"></i> Save contact</a>
      ${shareBtn(p, "sl-a")}
    </div>
    ${p.showQr ? `<div class="sl-qr">${qrFlip(p, 96)}<span><b style="font-size:14px">Scan to open this card</b><br><small style="color:#6B7280">Works on any phone camera</small></span></div>` : ""}
    ${p.socials ? `<div class="sl-socs">${p.socials}</div>` : ""}`,
  },
];

export function buildDesign2CardHtml(
  c: PCRecord,
  products: PCProduct[] = [],
  index = 0,
  opts: { thumb?: boolean; extras?: PremiumExtras } = {},
): string {
  const design = DESIGNS2[Math.max(0, Math.min(DESIGNS2.length - 1, index))];
  const t = tokensFor(c);
  const p = partsFor(c, products, opts.extras || {}, opts);
  const ref = s(c.referral_code) || p.slug;

  const cx = opts.thumb
    ? { css: "", html: "", js: "" }
    : pwContentSections(c, opts.extras || {}, p.slug, { products, accent: t.accent });
  const cxCss = cx.css ? `:root{--navy:${t.deep};--gold:${t.accent};--soft:${t.tint};}${cx.css}` : "";

  const shareName = s(c.company_name) || s(c.name) || "this business";
  const waShareText = `Hi 👋\n\nTake a look at *${shareName}*'s digital visiting card 📇\n\nEverything in one tap — call, WhatsApp, save the contact:\n${p.cardUrl}`;
  const shareUi = opts.thumb || !p.showShare ? "" : shareSheetHtml({ shareName, cardUrl: p.cardUrl, waShareText, accent: t.onAccent });
  const viewsJs = p.showViews
    ? `window.addEventListener('message',function(e){try{if(e.data&&typeof e.data.__dcViews==='number'){var el=document.getElementById('pw-view-count');if(el)el.textContent=Number(e.data.__dcViews).toLocaleString('en-IN');}}catch(_){}});`
    : "";
  const script = opts.thumb ? "" : `<script>${p.showShare ? shareSheetJs(p.cardUrl) : ""}${cx.js}${viewsJs}${floatDockJs}</script>`;

  const chrome = opts.thumb ? "" : `
    <div class="pdx-powered">Powered by <a href="https://digitalcarda.in" target="_blank" rel="noopener">DigitalCarda</a></div>
    <div class="pdx-foot">
      <a href="/login" target="_top">Customer Login</a>
      <a href="/signup${ref ? `?ref=${encodeURIComponent(ref)}` : ""}" target="_top">Create Free Card</a>
    </div>`;

  return `<!doctype html><html lang="en"><head>${HEAD}<style>${baseCss(t)}${flipCss(t)}${design.css(t)}${cxCss}${p.showShare && !opts.thumb ? shareSheetCss(t.onAccent) : ""}</style></head><body>
  <div class="pdx pdx--${design.id}">
    ${design.front(t, p)}
    ${cx.html ? `<div class="pdx-cx">${cx.html}</div>` : ""}
    ${floatDock(p)}
    ${chrome}
    <div style="height:18px"></div>
  </div>
  ${shareUi}
  ${script}
  </body></html>`;
}
