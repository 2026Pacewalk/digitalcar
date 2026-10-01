/*
 * Ten premium card DESIGNS, numbered after the first five premium templates.
 *
 * These are not ten skins of one layout — each lays the card out in its own way
 * (a bento grid, a chat thread, a boarding pass, a record player, a terminal,
 * photo stories, a timeline, a map-first card, a flip card and a poster
 * collage). Only the engine underneath is shared: pwContentSections renders
 * About, Services, Offers, Gallery, Videos, Reviews, Payments and the Enquiry
 * form, shareSheet handles sharing, plus the vCard, QR and live view counter.
 * So every feature switched on in the Card Builder works on all ten.
 */
import {
  HEAD, IMG, esc, s, legible, mix, premiumSocials, pwContentSections, safeHref,
  type PCProduct, type PCRecord, type PremiumExtras,
} from "./premiumCards";
import { shareSheetCss, shareSheetHtml, shareSheetJs } from "./shareSheet";
import { safeExternalUrl } from "@/lib/url";

export const DESIGN_NAMES = [
  "Bento Grid",
  "Chat Thread",
  "Boarding Pass",
  "Vinyl Player",
  "Terminal",
  "Story Slides",
  "Timeline",
  "Map First",
  "Flip Card",
  "Poster Collage",
];

export type Tokens = {
  accent: string; deep: string; ink: string; muted: string; bg: string; surface: string; line: string;
  tint: string; tint2: string; onAccent: string; accentInk: string;
};
export type Contact = { icon: string; label: string; value: string; href: string; external: boolean };
export type Parts = {
  name: string; designation: string; person: string; tagline: string; about: string;
  phone: string; phoneHref: string; wa: string; email: string; website: string; siteHref: string; webLabel: string;
  address: string; mapHref: string; slug: string; cardUrl: string;
  logo: string; photo: string; initial: string; initials: string;
  socials: string; qr: (n: number) => string; vcard: string;
  showQr: boolean; showShare: boolean; showViews: boolean; views: number;
  contacts: Contact[]; specialities: string[]; services: PCProduct[]; photos: string[];
  thumb: boolean;
};

const digits = (v: unknown) => s(v).replace(/[^\d]/g, "");

export function tokensFor(c: PCRecord): Tokens {
  const accent = /^#[0-9a-f]{6}$/i.test(s(c.color)) ? s(c.color) : "#F7B31C";
  const deep = /^#[0-9a-f]{6}$/i.test(s(c.color2)) ? s(c.color2) : mix(accent, "#000000", 0.6);
  return {
    accent, deep, ink: "#111827", muted: "#6B7280",
    bg: mix(accent, "#ffffff", 0.96), surface: "#ffffff",
    line: mix(accent, "#E5E7EB", 0.86),
    tint: mix(accent, "#ffffff", 0.88), tint2: mix(accent, "#ffffff", 0.74),
    onAccent: legible(accent, "#ffffff", 3),
    accentInk: legible(accent, mix(accent, "#ffffff", 0.88), 4.5),
  };
}

export function partsFor(c: PCRecord, products: PCProduct[], extras: PremiumExtras, opts: { thumb?: boolean }): Parts {
  const slug = s(c.slug).replace(/[^a-zA-Z0-9_-]/g, "");
  const cardUrl = `https://digitalcarda.in/${slug || "card"}`;
  const phone = s(c.mobile1), wa = digits(c.mobile2 || c.mobile1), email = s(c.email);
  const website = s(c.url), address = s(c.address);
  const siteHref = website ? safeHref(website) : "";
  const mapHref = safeExternalUrl(c.google_map) || (address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : "");
  const on = (v: unknown, def = 1) => Number(v ?? def) === 1;
  const who = s(c.company_name) || s(c.name) || "Your Business";

  const contacts: Contact[] = [
    phone ? { icon: "fa fa-phone-alt", label: "Call", value: phone, href: `tel:${digits(phone)}`, external: false } : null,
    wa ? { icon: "fab fa-whatsapp", label: "WhatsApp", value: s(c.mobile2 || c.mobile1), href: `https://wa.me/${wa}`, external: true } : null,
    email ? { icon: "far fa-envelope", label: "Email", value: email, href: `mailto:${email}`, external: false } : null,
    website ? { icon: "fa fa-globe", label: "Website", value: website.replace(/^https?:\/\//i, "").replace(/\/$/, ""), href: siteHref, external: true } : null,
    address ? { icon: "fa fa-map-marker-alt", label: "Visit", value: address, href: mapHref || "#", external: true } : null,
  ].filter(Boolean) as Contact[];

  const vcard = `data:text/vcard;charset=utf-8,${encodeURIComponent([
    "BEGIN:VCARD", "VERSION:3.0", `FN:${s(c.name) || who}`, `ORG:${s(c.company_name)}`,
    `TITLE:${s(c.designation)}`, `TEL;TYPE=CELL:${phone}`, `EMAIL:${email}`, `URL:${website}`,
    `ADR:;;${address};;;;`, "END:VCARD",
  ].join("\n"))}`;

  const initials = who.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return {
    name: esc(who),
    designation: esc(s(c.designation)),
    // Only a contact name that differs from the business name earns a second line.
    person: esc(s(c.company_name) && s(c.name) && s(c.company_name) !== s(c.name) ? s(c.name) : ""),
    tagline: esc(s(c.tagline)),
    about: esc(s(c.about_us).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 190)),
    phone, phoneHref: `tel:${digits(phone)}`, wa, email, website, siteHref,
    webLabel: website.replace(/^https?:\/\//i, "").replace(/\/$/, ""),
    address, mapHref, slug, cardUrl,
    logo: s(c.logo), photo: s(c.photo),
    initial: esc(who[0].toUpperCase()), initials: esc(initials),
    socials: premiumSocials(c, "pdx-soc"),
    qr: (n) => `https://api.qrserver.com/v1/create-qr-code/?size=${n}x${n}&margin=8&data=${encodeURIComponent(cardUrl)}`,
    vcard,
    showQr: on(c.cardqr_on), showShare: on(c.share_on), showViews: on(c.views_on, 1),
    views: Number(c.views ?? 0),
    contacts,
    specialities: s(c.specialities).split(/[,|]/).map((x) => x.trim()).filter(Boolean).slice(0, 6),
    services: (products || []).filter((p) => s(p.name)).slice(0, 4),
    photos: (extras.gallery || []).map((g) => s(g.filename)).filter(Boolean).slice(0, 5),
    thumb: !!opts.thumb,
  };
}

/* Shared, tiny building blocks — a design uses them only if they suit it. */
export const logoImg = (p: Parts, cls: string) =>
  p.logo
    ? `<span class="${cls}"><img src="${esc(p.logo)}" alt="" ${IMG} onerror="this.remove();this.parentNode.classList.add('is-text')"><b class="pdx-lgt">${p.initial}</b></span>`
    : `<span class="${cls} is-text"><b class="pdx-lgt">${p.initial}</b></span>`;

/* The floating dock: the two actions a visitor always wants (call, WhatsApp)
   follow them down the page, with a back-to-top that fades in after a scroll. */
export const floatDock = (p: Parts) => p.thumb ? "" : `
  <div class="pdx-dock" id="pdx-dock">
    <button class="pdx-dock-b top" type="button" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Back to top"><i class="fa fa-arrow-up"></i></button>
    ${p.wa ? `<a class="pdx-dock-b wa" href="https://wa.me/${p.wa}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>` : ""}
    ${p.phone ? `<a class="pdx-dock-b call" href="${p.phoneHref}" aria-label="Call"><i class="fa fa-phone-alt"></i></a>` : ""}
  </div>`;
export const floatDockJs = `(function(){var d=document.getElementById('pdx-dock');if(!d)return;var f=function(){d.classList.toggle('is-up',(window.scrollY||0)>260);};window.addEventListener('scroll',f,{passive:true});f();})();`;

/* A tappable flip tile: QR on the front, save-my-contact on the back. Hover on a
   desktop, tap on a phone, and it keeps working with a keyboard. */
export const flipCss = (t: Tokens) => `
.pdx-flip{perspective:900px;cursor:pointer;}
.pdx-flip-in{position:relative;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.2,.8,.2,1);}
.pdx-flip:hover .pdx-flip-in,.pdx-flip:focus-visible .pdx-flip-in,.pdx-flip.is-flipped .pdx-flip-in{transform:rotateY(180deg);}
.pdx-flip-f,.pdx-flip-b{backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:14px;overflow:hidden;}
.pdx-flip-b{position:absolute;inset:0;transform:rotateY(180deg);background:${t.deep};color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;padding:8px;}
.pdx-flip-b i{font-size:18px;color:${t.accent};}
.pdx-flip-b b{font-size:12px;font-weight:700;line-height:1.2;}
.pdx-flip-b small{font-size:10px;opacity:.75;}
@media (prefers-reduced-motion:reduce){.pdx-flip-in{transition:none;}}`;
export const qrFlip = (p: Parts, size: number, cls = "") => !p.showQr ? "" : `
  <div class="pdx-flip ${cls}" tabindex="0" role="button" aria-label="Flip for the save-contact code" onclick="this.classList.toggle('is-flipped')">
    <div class="pdx-flip-in">
      <div class="pdx-flip-f"><img src="${p.qr(size * 2)}" alt="QR code for this card" style="width:${size}px;height:${size}px;display:block" ${IMG}></div>
      <div class="pdx-flip-b"><i class="fa fa-address-card"></i><b>Save my contact</b><small>Tap to flip back</small></div>
    </div>
  </div>`;
export const saveHref = (p: Parts) => `href="${p.vcard}" download="${p.slug || "contact"}.vcf"`;
export const shareBtn = (p: Parts, cls: string, label = "Share") =>
  p.showShare && !p.thumb ? `<button type="button" class="${cls}" onclick="pwShare()"><i class="fa fa-share-alt"></i> ${label}</button>` : "";
export const viewCount = (p: Parts) => p.showViews ? `<i class="fa fa-eye"></i> <span id="pw-view-count">${p.views.toLocaleString("en-IN")}</span>` : "";

/* Base: typography, the shared section wrapper and the footer chrome. */
export const baseCss = (t: Tokens) => `
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;overflow-wrap:break-word;}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;}
body{font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;background:${mix(t.accent, "#eef0f3", 0.94)};color:${t.ink};line-height:1.55;}
.pdx{max-width:430px;margin:0 auto;min-height:100vh;position:relative;overflow:hidden;background:${t.bg};box-shadow:0 24px 70px rgba(17,24,39,.12);}
.pdx-cx{padding:0 16px 28px;}
.pdx-powered{text-align:center;font-size:11.5px;color:${t.muted};margin-top:22px;}
.pdx-powered a{color:${t.accentInk};font-weight:700;text-decoration:none;}
.pdx-foot{display:flex;margin:12px 16px 0;border:1px solid ${t.line};border-radius:14px;overflow:hidden;background:${t.surface};}
.pdx-foot a{flex:1;text-align:center;font-weight:700;font-size:12.5px;color:${t.ink};text-decoration:none;padding:13px 8px;}
.pdx-foot a:first-child{border-right:1px solid ${t.line};}

/* Floating dock */
.pdx-dock{position:fixed;right:14px;bottom:18px;z-index:60;display:flex;flex-direction:column-reverse;gap:10px;pointer-events:none;opacity:0;transform:translateY(14px);transition:opacity .25s ease,transform .25s ease;}
.pdx-dock.is-up{opacity:1;transform:none;}
.pdx-dock.is-up .pdx-dock-b{pointer-events:auto;}
.pdx-dock-b{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:19px;color:#fff;text-decoration:none;border:none;cursor:pointer;box-shadow:0 12px 26px -10px rgba(17,24,39,.55);transition:transform .18s ease,opacity .25s ease;}
.pdx-dock-b:active{transform:scale(.93);}
.pdx-dock-b.wa{background:#25D366;animation:pdxPulse 2.6s ease-in-out infinite;}
.pdx-dock-b.call{background:${t.onAccent};}
.pdx-dock-b.top{background:rgba(17,24,39,.72);}
@keyframes pdxPulse{0%,100%{box-shadow:0 12px 26px -10px rgba(17,24,39,.55),0 0 0 0 rgba(37,211,102,.45);}60%{box-shadow:0 12px 26px -10px rgba(17,24,39,.55),0 0 0 14px rgba(37,211,102,0);}}
/* Designs with their own pinned bottom bar keep the dock above it. */
.pdx--geo .pdx-dock,.pdx--ribbon .pdx-dock{bottom:86px;}
@media (prefers-reduced-motion:reduce){.pdx-dock-b.wa{animation:none;}}
.pdx-lgt{display:none;}
.is-text > .pdx-lgt{display:block;}
.pdx-soc{width:42px;height:42px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:16px;color:#fff;background:${t.onAccent};text-decoration:none;}
.pdx-soc svg{width:16px;height:16px;fill:currentColor;}
.pdx a:focus-visible,.pdx button:focus-visible{outline:3px solid ${t.onAccent};outline-offset:3px;}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}
`;

export type Design = { id: string; css: (t: Tokens) => string; front: (t: Tokens, p: Parts) => string };

const DESIGNS: Design[] = [
  /* 1 ── BENTO GRID: tiles of different sizes, no list at all */
  {
    id: "bento",
    css: (t) => `
    .pdx{background:${mix(t.accent, "#F3F4F6", 0.93)};}
    .bn{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:18px 14px 8px;}
    .bn-t{border-radius:22px;background:#fff;padding:16px;box-shadow:0 10px 26px -22px rgba(17,24,39,.8);text-decoration:none;color:inherit;display:flex;flex-direction:column;justify-content:space-between;min-height:104px;transition:transform .16s;}
    .bn-t:active{transform:scale(.97);}
    .bn-id{grid-column:span 4;background:linear-gradient(145deg,${t.accent},${t.deep});color:#fff;min-height:168px;position:relative;overflow:hidden;}
    .bn-id::after{content:"";position:absolute;right:-50px;top:-50px;width:190px;height:190px;border-radius:50%;background:rgba(255,255,255,.14);}
    .bn-logo{width:62px;height:62px;border-radius:18px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;z-index:2;}
    .bn-logo img{max-width:76%;max-height:76%;object-fit:contain;} .bn-logo b{display:none;color:${t.accentInk};font-size:26px;font-family:'Poppins',sans-serif;}
    .bn-logo.is-text b{display:block;}
    .bn-name{display:block;font-family:'Sora',sans-serif;font-size:25px;font-weight:800;line-height:1.1;margin-top:14px;position:relative;z-index:2;}
    .bn-role{display:block;font-size:13px;opacity:.85;position:relative;z-index:2;}
    .bn-ic{width:40px;height:40px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:17px;background:${t.tint};color:${t.accentInk};}
    .bn-lab{display:block;font-size:12.5px;font-weight:700;margin-top:10px;}
    .bn-val{display:block;font-size:11.5px;color:${t.muted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .bn-2{grid-column:span 2;} .bn-4{grid-column:span 4;}
    .bn-call{background:${t.onAccent};color:#fff;} .bn-call .bn-ic{background:rgba(255,255,255,.2);color:#fff;} .bn-call .bn-val{color:rgba(255,255,255,.8);}
    .bn-wa{background:#25D366;color:#fff;} .bn-wa .bn-ic{background:rgba(255,255,255,.2);color:#fff;} .bn-wa .bn-val{color:rgba(255,255,255,.85);}
    .bn-qr{align-items:center;text-align:center;}
    .bn-qr img{width:100%;max-width:120px;border-radius:12px;margin:0 auto;}
    .bn-dark{background:${t.ink};color:#fff;} .bn-dark .bn-ic{background:rgba(255,255,255,.14);color:#fff;} .bn-dark .bn-val{color:rgba(255,255,255,.7);}
    .bn-socs{display:flex;gap:8px;flex-wrap:wrap;}
    .bn-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}
    .bn-chip{font-size:11px;font-weight:600;background:${t.tint};color:${t.accentInk};border-radius:999px;padding:5px 10px;}
    .bn-views{position:absolute;top:14px;right:16px;z-index:3;font-size:11.5px;background:rgba(255,255,255,.2);border-radius:999px;padding:4px 10px;}`,
    front: (_t, p) => `
    <div class="bn">
      <div class="bn-t bn-id">
        ${p.showViews ? `<span class="bn-views">${viewCount(p)}</span>` : ""}
        ${logoImg(p, "bn-logo")}
        <div>
          <div class="bn-name">${p.name}</div>
          ${p.designation ? `<div class="bn-role">${p.designation}</div>` : ""}
        </div>
      </div>
      ${p.phone ? `<a class="bn-t bn-2 bn-call" href="${p.phoneHref}"><span class="bn-ic"><i class="fa fa-phone-alt"></i></span><span><span class="bn-lab">Call now</span><span class="bn-val">${esc(p.phone)}</span></span></a>` : ""}
      ${p.wa ? `<a class="bn-t bn-2 bn-wa" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><span class="bn-ic"><i class="fab fa-whatsapp"></i></span><span><span class="bn-lab">WhatsApp</span><span class="bn-val">Chat with us</span></span></a>` : ""}
      ${p.showQr ? `<div class="bn-t bn-2 bn-qr"><img src="${p.qr(220)}" alt="QR code for this card" ${IMG}><span class="bn-val">Scan to open</span></div>` : ""}
      <a class="bn-t bn-2" ${saveHref(p)}><span class="bn-ic"><i class="fa fa-user-plus"></i></span><span><span class="bn-lab">Save contact</span><span class="bn-val">Add to phone</span></span></a>
      ${p.mapHref ? `<a class="bn-t bn-2 bn-dark" href="${esc(p.mapHref)}" target="_blank" rel="noopener"><span class="bn-ic"><i class="fa fa-map-marker-alt"></i></span><span><span class="bn-lab">Directions</span><span class="bn-val">${esc(p.address)}</span></span></a>` : ""}
      ${p.email ? `<a class="bn-t bn-2" href="mailto:${esc(p.email)}"><span class="bn-ic"><i class="far fa-envelope"></i></span><span><span class="bn-lab">Email</span><span class="bn-val">${esc(p.email)}</span></span></a>` : ""}
      ${p.website ? `<a class="bn-t bn-2" href="${esc(p.siteHref)}" target="_blank" rel="noopener"><span class="bn-ic"><i class="fa fa-globe"></i></span><span><span class="bn-lab">Website</span><span class="bn-val">${esc(p.webLabel)}</span></span></a>` : ""}
      ${p.showShare && !p.thumb ? `<div class="bn-t bn-2" onclick="pwShare()" role="button" tabindex="0"><span class="bn-ic"><i class="fa fa-share-alt"></i></span><span><span class="bn-lab">Share card</span><span class="bn-val">Send to anyone</span></span></div>` : ""}
      ${p.specialities.length ? `<div class="bn-t bn-4"><span class="bn-lab">What we do</span><div class="bn-chips">${p.specialities.map((x) => `<span class="bn-chip">${esc(x)}</span>`).join("")}</div></div>` : ""}
      ${p.socials ? `<div class="bn-t bn-4"><span class="bn-lab">Follow</span><div class="bn-socs" style="margin-top:10px">${p.socials}</div></div>` : ""}
    </div>`,
  },

  /* 2 ── CHAT THREAD: the card as a conversation, actions are quick replies */
  {
    id: "chat",
    css: (t) => `
    .pdx{background:#ECE5DD;}
    .ch-top{display:flex;align-items:center;gap:11px;padding:12px 14px;background:${t.deep};color:#fff;position:sticky;top:0;z-index:5;}
    .ch-av{width:42px;height:42px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;}
    .ch-av img{max-width:80%;max-height:80%;object-fit:contain;} .ch-av b{display:none;color:${t.accentInk};}
    .ch-av.is-text b{display:block;}
    .ch-who b{display:block;font-size:15px;}
    .ch-who small{display:block;font-size:11.5px;opacity:.75;}
    .ch-body{padding:16px 14px 10px;background-image:radial-gradient(rgba(0,0,0,.035) 1px,transparent 1px);background-size:18px 18px;}
    .ch-b{max-width:84%;padding:10px 13px;border-radius:16px;background:#fff;font-size:14px;box-shadow:0 1px 1px rgba(0,0,0,.08);margin-bottom:9px;position:relative;animation:chIn .35s ease both;}
    .ch-b small{display:block;font-size:10.5px;color:#9CA3AF;text-align:right;margin-top:3px;}
    @keyframes chIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
    .ch-b--me{margin-left:auto;background:#DCF8C6;}
    .ch-b b{font-weight:700;}
    .ch-chips{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 12px;}
    .ch-chip{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:999px;background:#fff;border:1px solid ${t.line};color:${t.ink};font-size:13px;font-weight:600;text-decoration:none;box-shadow:0 1px 1px rgba(0,0,0,.06);}
    .ch-chip i{color:${t.accentInk};}
    .ch-chip--go{background:${t.onAccent};color:#fff;border-color:transparent;} .ch-chip--go i{color:#fff;}
    .ch-chip--wa{background:#25D366;color:#fff;border-color:transparent;} .ch-chip--wa i{color:#fff;}
    .ch-qr{display:inline-block;background:#fff;padding:8px;border-radius:14px;}
    .ch-qr img{width:128px;height:128px;display:block;}
    .ch-socs{display:flex;gap:8px;margin:2px 0 10px;}`,
    front: (_t, p) => `
    <div class="ch-top">
      ${logoImg(p, "ch-av")}
      <span class="ch-who"><b>${p.name}</b><small>${p.designation || "online"} ${p.showViews ? `· ${viewCount(p)}` : ""}</small></span>
    </div>
    <div class="ch-body">
      <div class="ch-b">Hi 👋 I'm <b>${p.name}</b>${p.designation ? `, ${p.designation}` : ""}.<small>now</small></div>
      ${p.about ? `<div class="ch-b" style="animation-delay:.1s">${p.about}<small>now</small></div>` : ""}
      ${p.specialities.length ? `<div class="ch-b" style="animation-delay:.2s">We do: ${p.specialities.map((x) => esc(x)).join(" · ")}<small>now</small></div>` : ""}
      <div class="ch-b ch-b--me" style="animation-delay:.3s">How do I reach you?<small>now ✓✓</small></div>
      <div class="ch-chips">
        ${p.phone ? `<a class="ch-chip ch-chip--go" href="${p.phoneHref}"><i class="fa fa-phone-alt"></i> Call ${esc(p.phone)}</a>` : ""}
        ${p.wa ? `<a class="ch-chip ch-chip--wa" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ""}
        ${p.email ? `<a class="ch-chip" href="mailto:${esc(p.email)}"><i class="far fa-envelope"></i> Email</a>` : ""}
        ${p.mapHref ? `<a class="ch-chip" href="${esc(p.mapHref)}" target="_blank" rel="noopener"><i class="fa fa-map-marker-alt"></i> Directions</a>` : ""}
        ${p.website ? `<a class="ch-chip" href="${esc(p.siteHref)}" target="_blank" rel="noopener"><i class="fa fa-globe"></i> ${esc(p.webLabel)}</a>` : ""}
        <a class="ch-chip" ${saveHref(p)}><i class="fa fa-user-plus"></i> Save contact</a>
        ${shareBtn(p, "ch-chip")}
      </div>
      ${p.showQr ? `<div class="ch-b" style="animation-delay:.4s">Scan to open my card anywhere:<br><span class="ch-qr"><img src="${p.qr(220)}" alt="QR code for this card" ${IMG}></span><small>now</small></div>` : ""}
      ${p.socials ? `<div class="ch-socs">${p.socials}</div>` : ""}
    </div>`,
  },

  /* 3 ── BOARDING PASS: ticket with perforation, stub and barcode */
  {
    id: "pass",
    css: (t) => `
    .pdx{background:${mix(t.deep, "#0F172A", 0.4)};}
    .bp{margin:18px 14px;border-radius:22px;background:#fff;overflow:hidden;box-shadow:0 26px 60px -30px rgba(0,0,0,.8);}
    .bp-top{background:linear-gradient(120deg,${t.accent},${t.deep});color:#fff;padding:16px;display:flex;align-items:center;justify-content:space-between;}
    .bp-logo{width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;overflow:hidden;}
    .bp-logo img{max-width:80%;max-height:80%;object-fit:contain;} .bp-logo b{display:none;} .bp-logo.is-text b{display:block;font-size:20px;}
    .bp-brand{font-size:11px;letter-spacing:.24em;text-transform:uppercase;opacity:.85;}
    .bp-main{padding:18px 16px 8px;}
    .bp-name{display:block;font-family:'Sora',sans-serif;font-size:26px;font-weight:800;line-height:1.1;}
    .bp-role{display:block;font-size:13px;color:${t.muted};margin-top:3px;}
    .bp-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px 10px;margin-top:16px;}
    .bp-f{min-width:0;}
    .bp-f small{display:block;font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:${t.muted};}
    .bp-f b{display:block;font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .bp-f a{color:inherit;text-decoration:none;display:block;padding:5px 0;overflow:hidden;text-overflow:ellipsis;}
    .bp-perf{position:relative;height:26px;margin-top:14px;}
    .bp-perf::before,.bp-perf::after{content:"";position:absolute;top:50%;width:26px;height:26px;border-radius:50%;background:${mix(t.deep, "#0F172A", 0.4)};transform:translateY(-50%);}
    .bp-perf::before{left:-13px;} .bp-perf::after{right:-13px;}
    .bp-dash{position:absolute;left:14px;right:14px;top:50%;border-top:2px dashed ${t.line};}
    .bp-stub{padding:4px 16px 18px;display:flex;align-items:center;gap:14px;}
    .bp-stub img{width:96px;height:96px;border-radius:10px;}
    .bp-bars{flex:1;height:58px;background:repeating-linear-gradient(90deg,${t.ink} 0 2px,transparent 2px 4px,${t.ink} 4px 7px,transparent 7px 10px);border-radius:4px;opacity:.85;}
    .bp-code{font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.18em;color:${t.muted};margin-top:6px;}
    .bp-acts{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;padding:0 14px 6px;}
    .bp-act{display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:14px;font-size:14px;font-weight:700;text-decoration:none;border:none;font-family:inherit;cursor:pointer;background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2);}
    .bp-act--go{background:${t.accent};color:${t.ink};border-color:transparent;}
    .bp-act--wa{background:#25D366;color:#fff;border-color:transparent;}
    .bp-socs{display:flex;justify-content:center;gap:9px;padding:12px 14px 0;}
    .bp-views{font-size:11.5px;color:rgba(255,255,255,.75);text-align:center;padding-top:10px;}`,
    front: (_t, p) => `
    <div class="bp">
      <div class="bp-top">
        <span class="bp-brand">Digital card · board anytime</span>
        ${logoImg(p, "bp-logo")}
      </div>
      <div class="bp-main">
        <div class="bp-name">${p.name}</div>
        ${p.designation ? `<div class="bp-role">${p.designation}</div>` : ""}
        <div class="bp-fields">
          ${p.phone ? `<span class="bp-f"><small>Call</small><b><a href="${p.phoneHref}">${esc(p.phone)}</a></b></span>` : ""}
          ${p.email ? `<span class="bp-f"><small>Email</small><b><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></b></span>` : ""}
          ${p.website ? `<span class="bp-f"><small>Website</small><b><a href="${esc(p.siteHref)}" target="_blank" rel="noopener">${esc(p.webLabel)}</a></b></span>` : ""}
          ${p.address ? `<span class="bp-f"><small>Gate</small><b>${esc(p.address)}</b></span>` : ""}
        </div>
      </div>
      <div class="bp-perf"><span class="bp-dash"></span></div>
      <div class="bp-stub">
        ${p.showQr ? `<img src="${p.qr(220)}" alt="QR code for this card" ${IMG}>` : ""}
        <span style="flex:1">
          <span class="bp-bars"></span>
          <span class="bp-code">${esc((p.slug || "digitalcarda").toUpperCase().slice(0, 16))} · ${p.showViews ? `${p.views.toLocaleString("en-IN")} VIEWS` : "DIGITALCARDA"}</span>
        </span>
      </div>
    </div>
    <div class="bp-acts">
      ${p.phone ? `<a class="bp-act bp-act--go" href="${p.phoneHref}"><i class="fa fa-phone-alt"></i> Call</a>` : ""}
      ${p.wa ? `<a class="bp-act bp-act--wa" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ""}
      <a class="bp-act" ${saveHref(p)}><i class="fa fa-user-plus"></i> Save</a>
      ${p.mapHref ? `<a class="bp-act" href="${esc(p.mapHref)}" target="_blank" rel="noopener"><i class="fa fa-map-marker-alt"></i> Directions</a>` : ""}
      ${shareBtn(p, "bp-act")}
    </div>
    ${p.socials ? `<div class="bp-socs">${p.socials}</div>` : ""}`,
  },

  /* 4 ── VINYL PLAYER: spinning disc and a player bar */
  {
    id: "vinyl",
    css: (t) => `
    .pdx{background:linear-gradient(180deg,${mix(t.deep, "#111827", 0.4)},#0B0D12);color:#F3F4F6;}
    .vn{padding:26px 16px 10px;text-align:center;}
    .vn-disc{position:relative;width:236px;height:236px;margin:0 auto;border-radius:50%;background:repeating-radial-gradient(circle at 50% 50%,#15171D 0 3px,#1C1F27 3px 6px);box-shadow:0 30px 60px -28px #000,0 0 0 8px #0D0F14;animation:vnSpin 14s linear infinite;}
    @keyframes vnSpin{to{transform:rotate(360deg);}}
    .vn-label{position:absolute;inset:34%;border-radius:50%;background:linear-gradient(140deg,${t.accent},${t.deep});display:flex;align-items:center;justify-content:center;overflow:hidden;}
    .vn-label img{max-width:72%;max-height:72%;object-fit:contain;} .vn-label b{display:none;font-size:28px;color:#fff;} .vn-label.is-text b{display:block;}
    .vn-pin{position:absolute;left:50%;top:50%;width:10px;height:10px;border-radius:50%;background:#0B0D12;transform:translate(-50%,-50%);z-index:2;}
    .vn-name{display:block;font-family:'Sora',sans-serif;font-size:26px;font-weight:800;margin-top:22px;}
    .vn-role{display:block;font-size:13.5px;color:#9CA3AF;margin-top:4px;}
    .vn-bar{display:flex;align-items:center;gap:8px;margin:18px 0 0;font-size:11px;color:#9CA3AF;}
    .vn-track{flex:1;height:4px;border-radius:999px;background:#272A33;overflow:hidden;}
    .vn-track span{display:block;width:62%;height:100%;background:${t.accent};}
    .vn-ctrls{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:18px;}
    .vn-c{width:52px;height:52px;border-radius:50%;background:#15171D;border:1px solid #262933;color:#E5E7EB;display:flex;align-items:center;justify-content:center;font-size:17px;text-decoration:none;cursor:pointer;font-family:inherit;}
    .vn-c--play{width:68px;height:68px;background:${t.accent};color:#0B0D12;border:none;font-size:22px;box-shadow:0 14px 30px -12px ${t.accent};}
    .vn-list{margin:22px 0 0;text-align:left;}
    .vn-item{display:flex;align-items:center;gap:12px;padding:12px 2px;border-bottom:1px solid #1C1F27;color:inherit;text-decoration:none;}
    .vn-no{width:22px;font-size:12px;color:#6B7280;font-variant-numeric:tabular-nums;}
    .vn-item b{font-size:14px;font-weight:600;display:block;}
    .vn-item small{font-size:11.5px;color:#6B7280;display:block;}
    .vn-item i.go{margin-left:auto;color:#4B5563;font-size:12px;}
    .vn-socs{display:flex;justify-content:center;gap:9px;margin-top:18px;}
    .vn-qr{display:flex;align-items:center;gap:12px;margin-top:18px;padding:12px;border-radius:16px;background:#15171D;border:1px solid #262933;}
    .vn-qr img{width:84px;height:84px;border-radius:8px;}
    .vn-qr b{font-size:13.5px;display:block;} .vn-qr small{font-size:11.5px;color:#6B7280;}`,
    front: (_t, p) => `
    <div class="vn">
      <div class="vn-disc">${logoImg(p, "vn-label")}<span class="vn-pin"></span></div>
      <h1 class="vn-name">${p.name}</h1>
      ${p.designation ? `<p class="vn-role">${p.designation}</p>` : ""}
      <div class="vn-bar"><span>${p.showViews ? `${p.views.toLocaleString("en-IN")} plays` : "now playing"}</span><span class="vn-track"><span></span></span><span>live</span></div>
      <div class="vn-ctrls">
        ${p.wa ? `<a class="vn-c" href="https://wa.me/${p.wa}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>` : ""}
        ${p.phone ? `<a class="vn-c vn-c--play" href="${p.phoneHref}" aria-label="Call"><i class="fa fa-phone-alt"></i></a>` : ""}
        <a class="vn-c" ${saveHref(p)} aria-label="Save contact"><i class="fa fa-user-plus"></i></a>
        ${shareBtn(p, "vn-c")}
      </div>
      <div class="vn-list">
        ${p.contacts.map((r, i) => `<a class="vn-item" href="${esc(r.href)}"${r.external ? ' target="_blank" rel="noopener"' : ""}><span class="vn-no">${String(i + 1).padStart(2, "0")}</span><span><b>${esc(r.label)}</b><small>${esc(r.value)}</small></span><i class="fa fa-chevron-right go"></i></a>`).join("")}
      </div>
      ${p.showQr ? `<div class="vn-qr"><img src="${p.qr(200)}" alt="QR code for this card" ${IMG}><span><b>Scan to listen in</b><small>Opens this card instantly</small></span></div>` : ""}
      ${p.socials ? `<div class="vn-socs">${p.socials}</div>` : ""}
    </div>`,
  },

  /* 5 ── TERMINAL: a console session you can tap */
  {
    id: "term",
    css: (t) => `
    .pdx{background:#0A0F14;color:#D1FAE5;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;}
    .tm{padding:16px 14px 10px;}
    .tm-win{border:1px solid #16351F;border-radius:14px;overflow:hidden;background:#06100B;box-shadow:0 20px 50px -30px #000;}
    .tm-bar{display:flex;align-items:center;gap:7px;padding:9px 12px;background:#0B1A12;border-bottom:1px solid #16351F;}
    .tm-dot{width:10px;height:10px;border-radius:50%;}
    .tm-title{margin-left:8px;font-size:11px;color:#4ADE80;opacity:.8;}
    .tm-body{padding:14px 13px 16px;font-size:13px;line-height:1.95;}
    .tm-l{white-space:pre-wrap;word-break:break-word;}
    .tm-p{color:#22C55E;} .tm-k{color:#67E8F9;} .tm-v{color:#E5E7EB;} .tm-c{color:#64748B;}
    a.tm-v{display:inline-block;padding:6px 0;}
    .tm-cursor{display:inline-block;width:8px;height:15px;background:#4ADE80;vertical-align:-2px;animation:tmBlink 1s steps(1) infinite;}
    @keyframes tmBlink{50%{opacity:0;}}
    .tm-logo{width:54px;height:54px;border-radius:10px;background:#0B1A12;border:1px solid #16351F;display:flex;align-items:center;justify-content:center;overflow:hidden;float:right;margin:0 0 8px 10px;}
    .tm-logo img{max-width:78%;max-height:78%;object-fit:contain;} .tm-logo b{display:none;color:#4ADE80;} .tm-logo.is-text b{display:block;}
    .tm-run{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:14px;}
    .tm-btn{display:flex;align-items:center;gap:8px;padding:12px;border-radius:10px;background:#0B1A12;border:1px solid #16351F;color:#D1FAE5;font-family:inherit;font-size:12.5px;text-decoration:none;cursor:pointer;}
    .tm-btn i{color:#4ADE80;}
    .tm-btn--go{background:${t.accent};color:#06100B;border-color:transparent;} .tm-btn--go i{color:#06100B;}
    .tm-qr{margin-top:14px;display:flex;align-items:center;gap:12px;padding:12px;border:1px dashed #16351F;border-radius:12px;}
    .tm-qr img{width:84px;height:84px;background:#fff;padding:4px;border-radius:6px;}
    .tm-socs{display:flex;gap:8px;margin-top:14px;}`,
    front: (_t, p) => `
    <div class="tm">
      <div class="tm-win">
        <div class="tm-bar"><span class="tm-dot" style="background:#EF4444"></span><span class="tm-dot" style="background:#F59E0B"></span><span class="tm-dot" style="background:#22C55E"></span><span class="tm-title">${esc(p.slug || "card")} — digitalcarda</span></div>
        <div class="tm-body">
          ${logoImg(p, "tm-logo")}
          <div class="tm-l"><span class="tm-p">$</span> whoami</div>
          <div class="tm-l tm-v">${p.name}</div>
          ${p.designation ? `<div class="tm-l tm-c"># ${p.designation}</div>` : ""}
          <div class="tm-l"><span class="tm-p">$</span> cat contact.json</div>
          <div class="tm-l tm-v">{</div>
          ${p.phone ? `<div class="tm-l">  <span class="tm-k">"phone"</span>: <a class="tm-v" href="${p.phoneHref}">"${esc(p.phone)}"</a>,</div>` : ""}
          ${p.email ? `<div class="tm-l">  <span class="tm-k">"email"</span>: <a class="tm-v" href="mailto:${esc(p.email)}">"${esc(p.email)}"</a>,</div>` : ""}
          ${p.website ? `<div class="tm-l">  <span class="tm-k">"web"</span>: <a class="tm-v" href="${esc(p.siteHref)}" target="_blank" rel="noopener">"${esc(p.webLabel)}"</a>,</div>` : ""}
          ${p.address ? `<div class="tm-l">  <span class="tm-k">"office"</span>: <span class="tm-v">"${esc(p.address)}"</span>,</div>` : ""}
          ${p.showViews ? `<div class="tm-l">  <span class="tm-k">"views"</span>: <span class="tm-v" id="pw-view-count">${p.views.toLocaleString("en-IN")}</span></div>` : ""}
          <div class="tm-l tm-v">}</div>
          <div class="tm-l"><span class="tm-p">$</span> <span class="tm-cursor"></span></div>
        </div>
      </div>
      <div class="tm-run">
        ${p.phone ? `<a class="tm-btn tm-btn--go" href="${p.phoneHref}"><i class="fa fa-phone-alt"></i> ./call</a>` : ""}
        ${p.wa ? `<a class="tm-btn" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> ./whatsapp</a>` : ""}
        <a class="tm-btn" ${saveHref(p)}><i class="fa fa-user-plus"></i> ./save-vcf</a>
        ${p.mapHref ? `<a class="tm-btn" href="${esc(p.mapHref)}" target="_blank" rel="noopener"><i class="fa fa-map-marker-alt"></i> ./directions</a>` : ""}
        ${shareBtn(p, "tm-btn", "./share")}
      </div>
      ${p.showQr ? `<div class="tm-qr"><img src="${p.qr(200)}" alt="QR code for this card" ${IMG}><span class="tm-c">scan → opens this card<br>no app required</span></div>` : ""}
      ${p.socials ? `<div class="tm-socs">${p.socials}</div>` : ""}
    </div>`,
  },

  /* 6 ── STORY SLIDES: full-bleed photo stories with progress bars */
  {
    id: "story",
    css: (t) => `
    .pdx{background:#0B0B0F;color:#fff;}
    .st{position:relative;height:72vh;min-height:430px;overflow:hidden;}
    .st-track{display:flex;height:100%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;}
    .st-track::-webkit-scrollbar{display:none;}
    .st-s{position:relative;flex:0 0 100%;scroll-snap-align:center;display:flex;flex-direction:column;justify-content:flex-end;padding:20px 18px 26px;background:linear-gradient(150deg,${t.accent},${t.deep});}
    .st-s img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
    .st-s::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,.82) 100%);}
    .st-c{position:relative;z-index:2;}
    .st-eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.8;}
    .st-name{font-family:'Sora',sans-serif;font-size:30px;font-weight:800;line-height:1.08;margin-top:8px;}
    .st-sub{font-size:14px;opacity:.86;margin-top:6px;}
    .st-bars{position:absolute;top:12px;left:14px;right:14px;z-index:4;display:flex;gap:5px;}
    .st-bars span{flex:1;height:3px;border-radius:999px;background:rgba(255,255,255,.3);overflow:hidden;}
    .st-bars span b{display:block;height:100%;width:0;background:#fff;}
    .st-bars span:first-child b{width:100%;}
    .st-logo{position:absolute;top:26px;left:14px;z-index:4;width:44px;height:44px;border-radius:50%;background:rgba(0,0,0,.4);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid rgba(255,255,255,.35);}
    .st-logo img{max-width:76%;max-height:76%;object-fit:contain;} .st-logo b{display:none;} .st-logo.is-text b{display:block;}
    .st-views{position:absolute;top:30px;right:14px;z-index:4;font-size:11.5px;background:rgba(0,0,0,.4);padding:5px 10px;border-radius:999px;backdrop-filter:blur(6px);}
    .st-hint{position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:11px;color:rgba(255,255,255,.65);z-index:4;}
    .st-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:16px 14px 6px;}
    .st-a{display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 4px;border-radius:16px;background:#15161C;color:#E5E7EB;font-size:11px;font-weight:600;text-decoration:none;border:none;font-family:inherit;cursor:pointer;}
    .st-a i{font-size:17px;color:${mix(t.accent, "#ffffff", 0.25)};}
    .st-a--go{background:${t.accent};color:#0B0B0F;} .st-a--go i{color:#0B0B0F;}
    .st-strip{display:flex;gap:9px;padding:10px 14px 0;overflow-x:auto;scrollbar-width:none;}
    .st-strip::-webkit-scrollbar{display:none;}
    .st-pill{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;background:#15161C;color:#D1D5DB;font-size:12.5px;text-decoration:none;}
    .st-qr{margin:14px 14px 0;display:flex;align-items:center;gap:12px;background:#15161C;border-radius:16px;padding:12px;}
    .st-qr img{width:84px;height:84px;border-radius:8px;}
    .st-socs{display:flex;justify-content:center;gap:9px;padding:14px 14px 0;}`,
    front: (_t, p) => {
      const slides = p.photos.length ? p.photos : [p.photo].filter(Boolean);
      const first = `
        <div class="st-s">
          ${slides[0] ? `<img src="${esc(slides[0])}" alt="" ${IMG}>` : ""}
          <div class="st-c">
            <div class="st-eyebrow">${p.designation || "Digital card"}</div>
            <h1 class="st-name">${p.name}</h1>
            ${p.tagline || p.about ? `<p class="st-sub">${p.tagline || p.about}</p>` : ""}
          </div>
        </div>`;
      const rest = slides.slice(1).map((img, i) => `
        <div class="st-s">
          <img src="${esc(img)}" alt="" ${IMG}>
          <div class="st-c"><div class="st-eyebrow">${esc(p.specialities[i] || "Our work")}</div><h1 class="st-name" style="font-size:22px">${esc(p.specialities[i + 1] || p.name)}</h1></div>
        </div>`).join("");
      const bars = Array.from({ length: Math.max(1, slides.length) }, () => "<span><b></b></span>").join("");
      return `
    <div class="st">
      <div class="st-bars">${bars}</div>
      ${logoImg(p, "st-logo")}
      ${p.showViews ? `<span class="st-views">${viewCount(p)}</span>` : ""}
      <div class="st-track">${first}${rest}</div>
      ${slides.length > 1 ? `<div class="st-hint">Swipe for more →</div>` : ""}
    </div>
    <div class="st-actions">
      ${p.phone ? `<a class="st-a st-a--go" href="${p.phoneHref}"><i class="fa fa-phone-alt"></i> Call</a>` : ""}
      ${p.wa ? `<a class="st-a" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ""}
      <a class="st-a" ${saveHref(p)}><i class="fa fa-user-plus"></i> Save</a>
      ${shareBtn(p, "st-a")}
    </div>
    <div class="st-strip">
      ${p.email ? `<a class="st-pill" href="mailto:${esc(p.email)}"><i class="far fa-envelope"></i> ${esc(p.email)}</a>` : ""}
      ${p.website ? `<a class="st-pill" href="${esc(p.siteHref)}" target="_blank" rel="noopener"><i class="fa fa-globe"></i> ${esc(p.webLabel)}</a>` : ""}
      ${p.mapHref ? `<a class="st-pill" href="${esc(p.mapHref)}" target="_blank" rel="noopener"><i class="fa fa-map-marker-alt"></i> ${esc(p.address.slice(0, 28))}</a>` : ""}
    </div>
    ${p.showQr ? `<div class="st-qr"><img src="${p.qr(200)}" alt="QR code for this card" ${IMG}><span><b>Scan to open</b><br><small style="color:#9CA3AF">Share this card anywhere</small></span></div>` : ""}
    ${p.socials ? `<div class="st-socs">${p.socials}</div>` : ""}`;
    },
  },

  /* 7 ── TIMELINE: a vertical spine with milestones */
  {
    id: "timeline",
    css: (t) => `
    .pdx{background:#FBFBFD;}
    .tl-head{padding:30px 18px 10px;display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;}
    .tl-head > span{min-width:0;flex:1 1 auto;}
    .tl-logo{width:72px;height:72px;border-radius:20px;background:#fff;border:1px solid ${t.line};display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;}
    .tl-logo img{max-width:76%;max-height:76%;object-fit:contain;} .tl-logo b{display:none;color:${t.accentInk};font-size:26px;} .tl-logo.is-text b{display:block;}
    .tl-name{display:block;font-family:'Manrope',sans-serif;font-size:24px;font-weight:800;line-height:1.15;}
    .tl-role{display:block;font-size:13px;color:${t.accentInk};font-weight:600;}
    .tl-org{display:block;font-size:12.5px;color:${t.muted};}
    .tl{position:relative;margin:18px 0 0;padding:0 18px 6px 46px;}
    .tl::before{content:"";position:absolute;left:25px;top:6px;bottom:18px;width:2px;background:linear-gradient(${t.accent},${t.line});}
    .tl-i{position:relative;padding:0 0 18px;}
    .tl-i::before{content:"";position:absolute;left:-29px;top:4px;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid ${t.accent};}
    .tl-i small{display:block;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:${t.muted};}
    .tl-i b{display:block;font-size:15px;margin-top:2px;}
    .tl-i p{font-size:13px;color:${t.muted};margin-top:3px;}
    .tl-i a{color:inherit;text-decoration:none;}
    .tl-card{display:block;background:#fff;border:1px solid ${t.line};border-radius:16px;padding:12px 14px;text-decoration:none;color:inherit;}
    .tl-acts{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;padding:4px 18px 0;}
    .tl-a{display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:14px;font-size:14px;font-weight:700;text-decoration:none;border:1px solid ${t.line};background:#fff;color:${t.ink};font-family:inherit;cursor:pointer;}
    .tl-a--go{background:${t.onAccent};color:#fff;border-color:transparent;}
    .tl-qr{display:flex;align-items:center;gap:12px;margin:14px 18px 0;padding:12px;border:1px solid ${t.line};border-radius:16px;background:#fff;}
    .tl-qr img{width:84px;height:84px;border-radius:8px;}
    .tl-socs{display:flex;justify-content:center;gap:9px;margin-top:16px;}
    .tl-views{margin-left:auto;flex-shrink:0;align-self:flex-start;white-space:nowrap;font-size:11.5px;color:${t.muted};}`,
    front: (_t, p) => `
    <div class="tl-head">
      ${logoImg(p, "tl-logo")}
      <span>
        <span class="tl-name">${p.name}</span>
        ${p.designation ? `<span class="tl-role">${p.designation}</span>` : ""}
        ${p.person ? `<span class="tl-org">${p.person}</span>` : ""}
      </span>
      ${p.showViews ? `<span class="tl-views">${viewCount(p)}</span>` : ""}
    </div>
    <div class="tl">
      ${p.about ? `<div class="tl-i"><small>About</small><p>${p.about}</p></div>` : ""}
      ${p.contacts.map((r) => `
        <div class="tl-i"><a class="tl-card" href="${esc(r.href)}"${r.external ? ' target="_blank" rel="noopener"' : ""}>
          <small>${esc(r.label)}</small><b>${esc(r.value)}</b>
        </a></div>`).join("")}
      ${p.specialities.length ? `<div class="tl-i"><small>What we do</small><p>${p.specialities.map((x) => esc(x)).join(" · ")}</p></div>` : ""}
    </div>
    <div class="tl-acts">
      ${p.phone ? `<a class="tl-a tl-a--go" href="${p.phoneHref}"><i class="fa fa-phone-alt"></i> Call</a>` : ""}
      ${p.wa ? `<a class="tl-a" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ""}
      <a class="tl-a" ${saveHref(p)}><i class="fa fa-user-plus"></i> Save contact</a>
      ${shareBtn(p, "tl-a")}
    </div>
    ${p.showQr ? `<div class="tl-qr"><img src="${p.qr(200)}" alt="QR code for this card" ${IMG}><span><b style="font-size:14px">Scan to connect</b><br><small style="color:#6B7280">Opens this card in one tap</small></span></div>` : ""}
    ${p.socials ? `<div class="tl-socs">${p.socials}</div>` : ""}`,
  },

  /* 8 ── MAP FIRST: location-led, for shops and clinics */
  {
    id: "map",
    css: (t) => `
    .pdx{background:#F5F6F8;}
    .mp{position:relative;height:260px;background:
      linear-gradient(0deg,rgba(0,0,0,.1),rgba(0,0,0,.1)),
      repeating-linear-gradient(90deg,#E8EBEF 0 38px,#DDE2E8 38px 40px),
      repeating-linear-gradient(0deg,#E8EBEF 0 38px,#DDE2E8 38px 40px);}
    .mp::after{content:"";position:absolute;inset:0;background:
      linear-gradient(115deg,transparent 42%,${mix(t.accent, "#ffffff", 0.55)} 42% 46%,transparent 46%),
      linear-gradient(25deg,transparent 60%,${mix(t.accent, "#ffffff", 0.7)} 60% 63%,transparent 63%);opacity:.9;}
    .mp-pin{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:3;text-align:center;}
    .mp-pin i{font-size:34px;color:${t.onAccent};filter:drop-shadow(0 8px 14px rgba(0,0,0,.35));}
    .mp-pulse{position:absolute;left:50%;top:44%;width:120px;height:120px;transform:translate(-50%,-50%);border-radius:50%;background:${t.accent}33;animation:mpPulse 2.6s ease-out infinite;z-index:2;}
    @keyframes mpPulse{0%{transform:translate(-50%,-50%) scale(.5);opacity:.8;}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0;}}
    .mp-views{position:absolute;top:14px;right:14px;z-index:4;background:rgba(255,255,255,.9);border-radius:999px;padding:5px 11px;font-size:11.5px;}
    .mp-card{position:relative;margin:-54px 14px 0;background:#fff;border-radius:22px;padding:16px;box-shadow:0 22px 44px -28px rgba(17,24,39,.7);z-index:4;}
    .mp-top{display:flex;align-items:center;gap:13px;}
    .mp-logo{width:60px;height:60px;border-radius:17px;background:#fff;border:1px solid ${t.line};display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;}
    .mp-logo img{max-width:78%;max-height:78%;object-fit:contain;} .mp-logo b{display:none;color:${t.accentInk};font-size:22px;} .mp-logo.is-text b{display:block;}
    .mp-name{display:block;font-family:'Poppins',sans-serif;font-size:21px;font-weight:700;line-height:1.2;}
    .mp-role{display:block;font-size:12.5px;color:${t.muted};}
    .mp-addr{display:flex;gap:10px;margin-top:14px;padding:12px;border-radius:14px;background:${t.tint};font-size:13px;color:${t.ink};}
    .mp-addr i{color:${t.accentInk};margin-top:2px;}
    .mp-go{display:flex;align-items:center;justify-content:center;gap:9px;min-height:52px;margin-top:12px;border-radius:15px;background:${t.onAccent};color:#fff;font-size:15px;font-weight:700;text-decoration:none;}
    .mp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:10px;}
    .mp-b{display:flex;flex-direction:column;align-items:center;gap:6px;padding:13px 6px;border-radius:15px;border:1px solid ${t.line};background:#fff;color:${t.ink};font-size:11.5px;font-weight:600;text-decoration:none;font-family:inherit;cursor:pointer;}
    .mp-b i{font-size:17px;color:${t.accentInk};}
    .mp-hours{margin-top:12px;font-size:12.5px;color:${t.muted};text-align:center;}
    .mp-qr{display:flex;align-items:center;gap:12px;margin:12px 14px 0;padding:12px;border-radius:16px;background:#fff;border:1px solid ${t.line};}
    .mp-qr img{width:82px;height:82px;border-radius:8px;}
    .mp-socs{display:flex;justify-content:center;gap:9px;margin-top:14px;}`,
    front: (_t, p) => `
    <div class="mp">
      <span class="mp-pulse"></span>
      <span class="mp-pin"><i class="fa fa-map-marker-alt"></i></span>
      ${p.showViews ? `<span class="mp-views">${viewCount(p)}</span>` : ""}
    </div>
    <div class="mp-card">
      <div class="mp-top">
        ${logoImg(p, "mp-logo")}
        <span><span class="mp-name">${p.name}</span>${p.designation ? `<span class="mp-role">${p.designation}</span>` : ""}</span>
      </div>
      ${p.address ? `<div class="mp-addr"><i class="fa fa-location-dot"></i><span>${esc(p.address)}</span></div>` : ""}
      ${p.mapHref ? `<a class="mp-go" href="${esc(p.mapHref)}" target="_blank" rel="noopener"><i class="fa fa-diamond-turn-right"></i> Get directions</a>` : ""}
      <div class="mp-grid">
        ${p.phone ? `<a class="mp-b" href="${p.phoneHref}"><i class="fa fa-phone-alt"></i> Call</a>` : ""}
        ${p.wa ? `<a class="mp-b" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ""}
        <a class="mp-b" ${saveHref(p)}><i class="fa fa-user-plus"></i> Save</a>
        ${p.email ? `<a class="mp-b" href="mailto:${esc(p.email)}"><i class="far fa-envelope"></i> Email</a>` : ""}
        ${p.website ? `<a class="mp-b" href="${esc(p.siteHref)}" target="_blank" rel="noopener"><i class="fa fa-globe"></i> Website</a>` : ""}
        ${shareBtn(p, "mp-b")}
      </div>
      ${p.tagline ? `<p class="mp-hours">${p.tagline}</p>` : ""}
    </div>
    ${p.showQr ? `<div class="mp-qr"><img src="${p.qr(200)}" alt="QR code for this card" ${IMG}><span><b>Scan at the counter</b><br><small style="color:#6B7280">Opens this card instantly</small></span></div>` : ""}
    ${p.socials ? `<div class="mp-socs">${p.socials}</div>` : ""}`,
  },

  /* 9 ── FLIP CARD: a real card you turn over */
  {
    id: "flip",
    css: (t) => `
    .pdx{background:linear-gradient(160deg,${mix(t.accent, "#F8FAFC", 0.82)},#EEF1F6);}
    .fl-stage{padding:26px 16px 10px;perspective:1400px;}
    .fl{position:relative;width:100%;aspect-ratio:1.62/1;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.2,.8,.2,1);}
    .fl-chk{position:absolute;opacity:0;pointer-events:none;}
    .fl-chk:checked + .fl{transform:rotateY(180deg);}
    .fl-face{position:absolute;inset:0;border-radius:20px;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;box-shadow:0 26px 50px -28px rgba(17,24,39,.8);}
    .fl-front{background:linear-gradient(135deg,${t.accent},${t.deep});color:#fff;padding:20px 20px 34px;display:flex;flex-direction:column;justify-content:space-between;}
    .fl-front::after{content:"";position:absolute;right:-40px;bottom:-60px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.12);}
    .fl-back{background:#fff;transform:rotateY(180deg);padding:16px;display:flex;flex-direction:column;gap:9px;}
    .fl-logo{width:54px;height:54px;border-radius:15px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;z-index:2;}
    .fl-logo img{max-width:78%;max-height:78%;object-fit:contain;} .fl-logo b{display:none;} .fl-logo.is-text b{display:block;font-size:22px;}
    .fl-name{display:block;font-family:'Sora',sans-serif;font-size:23px;font-weight:800;position:relative;z-index:2;line-height:1.14;}
    .fl-role{display:block;font-size:12.5px;opacity:.85;position:relative;z-index:2;}
    .fl-chip{position:absolute;top:20px;right:20px;width:40px;height:30px;border-radius:6px;background:linear-gradient(135deg,#F7E6B0,#C9A227);z-index:2;}
    .fl-chip::after{content:"";position:absolute;inset:6px 8px;border:1px solid rgba(0,0,0,.25);border-radius:3px;}
    .fl-r{display:flex;align-items:center;gap:10px;font-size:12.5px;color:${t.ink};text-decoration:none;padding:2px 0;min-width:0;}
    .fl-r i{width:28px;height:28px;border-radius:8px;background:${t.tint};color:${t.accentInk};display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;}
    .fl-qr{position:absolute;right:14px;bottom:14px;width:74px;height:74px;border-radius:8px;}
    .fl-turn{display:flex;align-items:center;justify-content:center;gap:8px;margin:14px auto 0;padding:11px 18px;border-radius:999px;background:#fff;border:1px solid ${t.line};font-size:13px;font-weight:700;color:${t.ink};cursor:pointer;width:fit-content;}
    .fl-acts{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;padding:14px 16px 0;}
    .fl-a{display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;border-radius:15px;font-size:14.5px;font-weight:700;text-decoration:none;background:#fff;border:1px solid ${t.line};color:${t.ink};font-family:inherit;cursor:pointer;}
    .fl-a--go{background:${t.onAccent};color:#fff;border-color:transparent;}
    .fl-a--wa{background:#25D366;color:#fff;border-color:transparent;}
    .fl-socs{display:flex;justify-content:center;gap:9px;margin-top:16px;}
    .fl-views{position:absolute;right:20px;bottom:14px;font-size:11px;opacity:.8;z-index:2;}`,
    front: (_t, p) => `
    <div class="fl-stage">
      <input class="fl-chk" type="checkbox" id="fl-turn" aria-label="Turn the card over">
      <div class="fl">
        <div class="fl-face fl-front">
          <span class="fl-chip"></span>
          ${logoImg(p, "fl-logo")}
          <span>
            <span class="fl-name">${p.name}</span>
            ${p.designation ? `<span class="fl-role">${p.designation}</span>` : ""}
          </span>
          ${p.showViews ? `<span class="fl-views">${viewCount(p)}</span>` : ""}
        </div>
        <div class="fl-face fl-back">
          ${p.contacts.slice(0, 4).map((r) => `<a class="fl-r" href="${esc(r.href)}"${r.external ? ' target="_blank" rel="noopener"' : ""}><i class="${r.icon}"></i> ${esc(r.value)}</a>`).join("")}
          ${p.showQr ? `<img class="fl-qr" src="${p.qr(200)}" alt="QR code for this card" ${IMG}>` : ""}
        </div>
      </div>
      <label class="fl-turn" for="fl-turn"><i class="fa fa-rotate"></i> Turn the card over</label>
    </div>
    <div class="fl-acts">
      ${p.phone ? `<a class="fl-a fl-a--go" href="${p.phoneHref}"><i class="fa fa-phone-alt"></i> Call</a>` : ""}
      ${p.wa ? `<a class="fl-a fl-a--wa" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ""}
      <a class="fl-a" ${saveHref(p)}><i class="fa fa-user-plus"></i> Save contact</a>
      ${shareBtn(p, "fl-a")}
      ${p.mapHref ? `<a class="fl-a" href="${esc(p.mapHref)}" target="_blank" rel="noopener"><i class="fa fa-map-marker-alt"></i> Directions</a>` : ""}
    </div>
    ${p.socials ? `<div class="fl-socs">${p.socials}</div>` : ""}`,
  },

  /* 10 ── POSTER COLLAGE: editorial poster with overlapping type and photos */
  {
    id: "poster",
    css: (t) => `
    .pdx{background:#F2F0EC;}
    .po{position:relative;padding:22px 16px 10px;}
    .po-grid{display:grid;grid-template-columns:repeat(6,1fr);grid-auto-rows:54px;gap:8px;}
    .po-im{border-radius:14px;overflow:hidden;background:${t.tint};}
    .po-im img{width:100%;height:100%;object-fit:cover;display:block;}
    .po-a{grid-column:span 4;grid-row:span 3;}
    .po-b{grid-column:span 2;grid-row:span 2;}
    .po-c{grid-column:span 2;grid-row:span 1;background:${t.accent};}
    .po-type{position:relative;margin-top:-34px;z-index:3;}
    .po-name{font-family:'Sora',sans-serif;font-size:42px;line-height:.92;font-weight:800;letter-spacing:-.04em;text-transform:uppercase;color:${t.ink};mix-blend-mode:multiply;word-break:break-word;}
    .po-name span{background:${t.accent};padding:0 6px;color:${t.ink};}
    .po-role{display:inline-block;margin-top:10px;font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;background:${t.ink};color:#fff;padding:6px 11px;border-radius:999px;}
    .po-about{font-size:13.5px;color:${t.muted};margin-top:12px;max-width:36ch;}
    .po-logo{position:absolute;right:16px;top:-26px;width:62px;height:62px;border-radius:50%;background:#fff;border:1px solid ${t.line};display:flex;align-items:center;justify-content:center;overflow:hidden;z-index:4;}
    .po-logo img{max-width:74%;max-height:74%;object-fit:contain;} .po-logo b{display:none;color:${t.accentInk};font-size:24px;} .po-logo.is-text b{display:block;}
    .po-rows{margin-top:18px;display:grid;gap:7px;}
    .po-r{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;border-radius:13px;background:#fff;border:1px solid ${t.line};color:${t.ink};text-decoration:none;font-size:13.5px;}
    .po-r small{display:block;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${t.muted};}
    .po-r b{font-weight:600;}
    .po-acts{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:12px;}
    .po-a2{display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;border-radius:13px;font-size:14.5px;font-weight:700;text-decoration:none;background:${t.ink};color:#fff;border:none;font-family:inherit;cursor:pointer;}
    .po-a2--alt{background:#fff;color:${t.ink};border:1px solid ${t.line};}
    .po-foot{display:flex;align-items:center;justify-content:space-between;margin-top:14px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${t.muted};}
    .po-qr{display:flex;align-items:center;gap:12px;margin-top:12px;padding:12px;border-radius:14px;background:#fff;border:1px solid ${t.line};}
    .po-qr img{width:80px;height:80px;border-radius:7px;}
    .po-socs{display:flex;gap:8px;margin-top:14px;}`,
    front: (_t, p) => {
      const ph = p.photos.length ? p.photos : [p.photo].filter(Boolean);
      return `
    <div class="po">
      <div class="po-grid">
        <div class="po-im po-a">${ph[0] ? `<img src="${esc(ph[0])}" alt="" ${IMG}>` : ""}</div>
        <div class="po-im po-b">${ph[1] ? `<img src="${esc(ph[1])}" alt="" ${IMG}>` : ""}</div>
        <div class="po-im po-c"></div>
      </div>
      <div class="po-type">
        ${logoImg(p, "po-logo")}
        <h1 class="po-name"><span>${p.name}</span></h1>
        ${p.designation ? `<span class="po-role">${p.designation}</span>` : ""}
        ${p.about ? `<p class="po-about">${p.about}</p>` : ""}
      </div>
      <div class="po-rows">
        ${p.contacts.map((r) => `<a class="po-r" href="${esc(r.href)}"${r.external ? ' target="_blank" rel="noopener"' : ""}><span><small>${esc(r.label)}</small><b>${esc(r.value)}</b></span><i class="${r.icon}"></i></a>`).join("")}
      </div>
      <div class="po-acts">
        ${p.phone ? `<a class="po-a2" href="${p.phoneHref}"><i class="fa fa-phone-alt"></i> Call now</a>` : ""}
        ${p.wa ? `<a class="po-a2 po-a2--alt" href="https://wa.me/${p.wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ""}
        <a class="po-a2 po-a2--alt" ${saveHref(p)}><i class="fa fa-user-plus"></i> Save contact</a>
        ${shareBtn(p, "po-a2 po-a2--alt")}
      </div>
      ${p.showQr ? `<div class="po-qr"><img src="${p.qr(200)}" alt="QR code for this card" ${IMG}><span><b>Scan to open</b><br><small style="color:#6B7280">No app needed</small></span></div>` : ""}
      ${p.socials ? `<div class="po-socs">${p.socials}</div>` : ""}
      <div class="po-foot"><span>${esc(p.slug || "digitalcarda")}</span><span>${p.showViews ? `${p.views.toLocaleString("en-IN")} views` : "digital card"}</span></div>
    </div>`;
    },
  },
];

/* ── Build one of the ten ────────────────────────────────────────────────── */
export function buildDesignCardHtml(
  c: PCRecord,
  products: PCProduct[] = [],
  index = 0,
  opts: { thumb?: boolean; extras?: PremiumExtras } = {},
): string {
  const design = DESIGNS[Math.max(0, Math.min(DESIGNS.length - 1, index))];
  const t = tokensFor(c);
  const p = partsFor(c, products, opts.extras || {}, opts);
  const ref = s(c.referral_code) || p.slug;

  // Every content section (About, Services, Offers, Gallery, Videos, Reviews,
  // Payments, Enquiry) comes from the shared builder, so each design supports
  // the full feature set and honours the owner's section switches.
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
