/*
 * NFC card & standee emails.
 *
 * The customer's journey, in order:
 *   nfcOrderReceivedEmail   – placed while online payment is off (nothing charged yet, how to pay)
 *   nfcOrderConfirmedEmail  – paid; last chance to catch a typo before printing
 *   nfcOrderShippedEmail    – with the courier; tracking up front
 *   nfcOrderDeliveredEmail  – arrived; tap-test it, where to keep it
 *   nfcOrderCancelledEmail  – cancelled (never promises an automatic refund)
 * and the team's print-and-ship alert, nfcOrderAdminEmail (kind "nfcOrderAdmin").
 *
 * Every email sent before printing repeats the exact words that will be
 * printed and draws the card / standee the way the customer saw it on
 * /dashboard/nfc (src/pages/customer/NfcOrder.tsx, CardPreview and
 * StandeePreview), so a mistake is caught before production.
 *
 * Local blocks (not in the kit): printDrawing (card front/back + standee),
 * shipLabel (dashed parcel label), trackingPanel (big tracking number).
 */
import {
  BRAND, FONT, MONO, SITE, SUPPORT_WHATSAPP, TONE, type Email, type Tone,
  actionPills, button, callout, cardPreview, codeValue, darkChip, dayIst, emailLink, esc, firstName,
  heroBand, heroLight, helpStrip, hi, infoGrid, inkLink, inr, layout, mailtoLink, mono, muted, note, p,
  phoneLink, progressSteps, qrImage, quoteBlock, receipt, safeUrl, sectionLabel, showPhone, small, spacer,
  stepRow, strong, telLink, tickList, waLink, whenIst,
} from "./kit";
import { NFC_DELIVERY, NFC_PRODUCTS } from "../../../src/lib/nfcProducts";

/* ── Shared types ────────────────────────────────────────────────────────── */

/** One product line of an order — one `nfc_orders` row. */
export type NfcItem = {
  /** The row's `product` ("nfc_card" | "nfc_standee"). When missing, the name is matched instead. */
  product?: "nfc_card" | "nfc_standee" | string;
  /** Product name, e.g. "NFC PVC Card" (nfcProduct(id).name). */
  name: string;
  /** How it is printed, e.g. "Printed on both sides" (nfcProduct(id).print). */
  print?: string;
  quantity: number;
  /** Price per piece in rupees (nfc_orders.unitPrice). */
  unitPrice?: number;
  /** Line total in rupees (nfc_orders.amount). */
  amount?: number;
};

/** The delivery address as the customer typed it (nfc_orders.ship*). */
export type NfcShip = {
  name: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
};

/** The printed words, field by field (nfc_orders.printName/printTitle/printCompany/printPhone).
    With it, the drawing puts each word exactly where the order page did; without it,
    the fields are inferred from `printLines`. */
export type NfcPrint = { name: string; title?: string | null; company?: string | null; phone?: string | null };

/** Where to pay a manual order (payment settings: pay_upi_*, pay_bank_*, pay_note). All optional. */
export type NfcPaymentDetails = {
  upiId?: string | null;
  /** Name the UPI app shows as the payee (pay_upi_name). */
  payeeName?: string | null;
  /** A hosted image of the platform's UPI QR (pay_upi_qr) — used only when it is an http(s) link;
      otherwise a QR is generated from `upiId` with the amount filled in. */
  upiQrUrl?: string | null;
  bank?: { name?: string | null; account?: string | null; ifsc?: string | null; holder?: string | null } | null;
  /** Any extra instruction from payment settings (pay_note). */
  note?: string | null;
};

/* ── Small helpers ───────────────────────────────────────────────────────── */

const ORDERS_URL = `${SITE}/dashboard/nfc`;
const STEPS = ["Confirmed", "Printing", "Shipped", "Delivered"];
/** Long unbroken words (an address, a URL typed as a company) must wrap, not widen the email. */
const WRAP = "word-break:break-word;overflow-wrap:anywhere";

const refOf = (ids: number[]) => ids.map((id) => `#${id}`).join(" + ");
const sortedIds = (ids: number[] | undefined, fallback?: number) => {
  const list = (ids && ids.length ? [...ids] : fallback != null ? [fallback] : []).filter((n) => Number.isFinite(n));
  return list.sort((a, b) => a - b);
};
const itemTextOf = (items: NfcItem[]) => items.map((i) => `${i.quantity} × ${i.name}`).join(" + ");
const productOf = (i: { product?: string; name: string }) =>
  NFC_PRODUCTS.find((p) => p.id === i.product) ?? NFC_PRODUCTS.find((p) => p.name === i.name || p.short === i.name) ?? null;
const isStandee = (i: NfcItem) => (productOf(i)?.id ?? (/standee/i.test(i.name) ? "nfc_standee" : "nfc_card")) === "nfc_standee";

/** "NFC card", "NFC cards", "NFC standee", "NFC card and standee" — and whether it takes "are". */
function nounOf(items: NfcItem[]): { noun: string; plural: boolean } {
  const card = items.some((i) => !isStandee(i));
  const standee = items.some(isStandee);
  const pieces = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  if (card && standee) return { noun: "NFC card and standee", plural: true };
  if (standee) return pieces > 1 ? { noun: "NFC standees", plural: true } : { noun: "NFC standee", plural: false };
  return pieces > 1 ? { noun: "NFC cards", plural: true } : { noun: "NFC card", plural: false };
}

const shortUrl = (u: string) => u.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
/** The short link as HTML that may break after the domain ("digitalcarda.in/" then "pacewalk"). */
const shortHtml = (u: string) => shortUrl(u).split("/").map((part) => esc(part)).join("/<wbr>");
/** inkLink() with the short link as its label, breaking after the domain. `href` must be safeUrl()'d. */
const shortLink = (href: string) =>
  `<a href="${esc(href)}" target="_blank" style="color:${BRAND.ink};text-decoration:none;border-bottom:1px solid ${BRAND.goldLine};${WRAP}">${shortHtml(href)}</a>`;

/** The card's slug when the link is a digitalcarda.in card link (for cardPreview). */
function slugOf(url?: string | null): string | null {
  const u = safeUrl(url);
  if (!u) return null;
  try {
    const x = new URL(u);
    if (!/^(www\.)?digitalcarda\.in$/i.test(x.hostname)) return null;
    const s = decodeURIComponent(x.pathname.replace(/^\/+|\/+$/g, ""));
    return s && !s.includes("/") ? s : null;
  } catch { return null; }
}

/** "cdn.example.com · logo.png" — the host first, so the team sees where a file comes from. */
function hostLabel(url: string): string {
  try {
    const x = new URL(url);
    const file = decodeURIComponent(x.pathname.split("/").filter(Boolean).pop() || "");
    const f = file.length > 40 ? `${file.slice(0, 37)}…` : file;
    return f ? `${x.hostname} · ${f}` : x.hostname;
  } catch { return url; }
}

/** `days` working days after `from` (Mon–Sat; couriers deliver on Saturdays). */
function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  for (let left = days; left > 0;) {
    d.setUTCDate(d.getUTCDate() + 1);
    // The weekday in India, not in the server's zone.
    if (new Date(d.getTime() + 5.5 * 3_600_000).getUTCDay() !== 0) left--;
  }
  return d;
}

const supportWa = (message: string) => waLink(SUPPORT_WHATSAPP.wa, message);
/** Under a customer drawing with no hosted logo: most card logos are embedded in the card, not sent with the order. */
const logoNote = (items: NfcItem[]) => {
  const card = items.some((i) => !isStandee(i)), standee = items.some(isStandee);
  return card && standee
    ? "Your card's logo, if it has one, is printed where the initial is, and above the name on the standee."
    : standee ? "Your card's logo, if it has one, is printed above the name." : "Your card's logo, if it has one, is printed where the initial is.";
};
/** Body-weight text inside an infoGrid value (the grid sets its values semi-bold). Trusted HTML in. */
const plain = (html: string) => `<span style="font-weight:400;color:${BRAND.body}">${html}</span>`;

/** Receipt rows. Amounts come from the rows when every row has one; a single row
    takes the total; otherwise catalogue prices are used only if they add up to the
    total that was charged. If nothing reconciles, one combined line shows the total. */
function receiptRows(items: NfcItem[], total: number): { name: string; sub?: string; qty?: number; amount: number }[] {
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  let amounts: number[] | null = null;
  if (items.length && items.every((i) => num(i.amount))) amounts = items.map((i) => i.amount as number);
  else if (items.length === 1) amounts = [total];
  else if (items.length) {
    const guess = items.map((i) => { const pr = productOf(i); return pr ? pr.price * i.quantity : NaN; });
    if (guess.every((g) => Number.isFinite(g)) && guess.reduce((s, g) => s + g, 0) === total) amounts = guess;
  }
  if (!amounts) return [{ name: itemTextOf(items) || "NFC order", amount: total }];
  const a = amounts;
  return items.map((i, k) => {
    const unit = num(i.unitPrice) ? (i.unitPrice as number) : i.quantity > 0 ? a[k] / i.quantity : NaN;
    const sub = [i.print || productOf(i)?.print, i.quantity > 1 && Number.isFinite(unit) ? `${inr(unit)} each` : ""].filter(Boolean).join(" · ");
    return { name: i.name, sub: sub || undefined, qty: i.quantity, amount: a[k] };
  });
}

const totalOf = (items: NfcItem[], given?: number | null) =>
  typeof given === "number" && Number.isFinite(given) ? given : items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

/* ── The printed words ───────────────────────────────────────────────────── */

type PrintParts = { name: string; title: string; company: string; phone: string; guessed: boolean };

/** Name / title / company / phone. Exact when `print` is given; otherwise read from
    printLines, which the server builds as [name, title, company, phone] minus blanks —
    so with a single middle line we can't tell title from company (`guessed`). */
function printParts(lines: string[], print?: NfcPrint | null): PrintParts {
  if (print && print.name) {
    return { name: print.name, title: print.title || "", company: print.company || "", phone: print.phone || "", guessed: false };
  }
  const rest = lines.slice(1).map((l) => String(l || "")).filter(Boolean);
  const looksPhone = (s: string) => {
    const digits = (s.match(/\d/g) || []).length;
    return digits >= 7 && digits / Math.max(1, s.replace(/\s/g, "").length) >= 0.6;
  };
  const phone = rest.length && looksPhone(rest[rest.length - 1]) ? (rest.pop() as string) : "";
  const title = rest[0] || "";
  const company = rest.length >= 2 ? rest.slice(1).join(" · ") : "";
  return { name: lines[0] || "", title, company, phone, guessed: rest.length === 1 };
}

/** Rows for the "printed details" grid: labelled when the fields are known, the exact lines otherwise. */
function printedRows(lines: string[], print?: NfcPrint | null): [string, string | null][] {
  const wrap = (t: string) => `<span style="${WRAP}">${esc(t)}</span>`;
  if (print && print.name) {
    return [
      ["Name", wrap(print.name)],
      ["Job title", print.title ? wrap(print.title) : null],
      ["Company", print.company ? wrap(print.company) : null],
      ["Phone", print.phone ? wrap(print.phone) : null],
    ];
  }
  return [["Printed text", lines.length ? lines.map((l) => `<div style="${WRAP}">${esc(l)}</div>`).join("") : muted("Nothing to print was given")]];
}

/** The product drawn as the customer saw it on the order page.
    Card front: logo (or the gold initial of company || name), name, title, company — no phone.
    Card back: a real QR of the card link, "Tap or scan", "to save my contact", the short link, the credit.
    Standee: company || name, "Tap or scan to connect", TAP · SCAN, the QR, "Save contact · Review · Pay", the credit.
    `logoImage`: draw the customer's own https logo (customer emails); otherwise a LOGO placeholder (team). */
function printDrawing(o: { parts: PrintParts; cardUrl: string; card: boolean; standee: boolean; logo: string | null; logoImage: boolean }): string {
  const { parts } = o;
  const initial =((parts.company || parts.name || "D").trim().charAt(0) || "D").toUpperCase();
  const caption = (t: string) =>
    `<div style="font-family:${FONT};font-size:10.5px;line-height:1.4;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:.9px;padding-top:8px;text-align:center">${esc(t)}</div>`;
  const placeholder = (dark: boolean) =>
    `<span style="display:inline-block;padding:4px 8px;border:1px dashed ${dark ? "#5B7090" : "#8A6A1F"};border-radius:5px;font-family:${FONT};font-size:9px;line-height:1.2;font-weight:800;color:${dark ? "#93A4BD" : "#5B4712"};letter-spacing:.9px">LOGO</span>`;
  const logoImg = (h: number, maxW: number, center: boolean) =>
    `<img src="${esc(o.logo)}" height="${h}" alt="Logo" style="display:${center ? "inline-block" : "block"};height:${h}px;width:auto;max-width:${maxW}px;background:#FFFFFF;border-radius:4px;padding:2px;border:0">`;
  const credit = (size: number) =>
    `<div style="font-family:${FONT};font-size:${size}px;line-height:1.4;font-weight:600;color:#94A3B8;letter-spacing:.2px">Powered by <span style="font-weight:800;color:${BRAND.ink}">DigitalCarda.in</span></div>`;

  // Two tiles that sit side by side when there's room and stack on a phone.
  const tile = (inner: string, cap: string) =>
    `<div style="display:inline-block;width:100%;max-width:250px;vertical-align:top;text-align:left"><div style="padding:0 5px 14px">${inner}${caption(cap)}</div></div>`;

  const front = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td height="152" valign="top" bgcolor="#0F172A" style="height:152px;background-color:#0F172A;background-image:linear-gradient(135deg,#0F172A 0%,#1E293B 55%,#0B1120 100%);border:1px solid #0F172A;border-radius:14px;padding:14px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="top" height="58" style="height:58px">${o.logo
            ? (o.logoImage ? logoImg(24, 150, false) : placeholder(true))
            : `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="28" height="28" align="center" valign="middle" bgcolor="${BRAND.gold}" style="width:28px;height:28px;border-radius:8px;font-family:${FONT};font-size:13px;font-weight:800;color:${BRAND.ink};line-height:28px">${esc(initial)}</td></tr></table>`}</td>
          <td valign="top" align="right" style="font-family:${FONT};font-size:14px;line-height:1;font-weight:800;color:${BRAND.gold};letter-spacing:-1px">)))</td>
        </tr>
        <tr><td colspan="2" valign="bottom" style="${WRAP}">
          <div style="font-family:${FONT};font-size:15px;line-height:1.25;font-weight:800;color:#FFFFFF;letter-spacing:-.2px;${WRAP}">${esc(parts.name || "Your name")}</div>
          ${parts.title ? `<div style="font-family:${FONT};font-size:11px;line-height:1.45;color:#B8C2D1;padding-top:2px;${WRAP}">${esc(parts.title)}</div>` : ""}
          ${parts.company ? `<div style="font-family:${FONT};font-size:11px;line-height:1.45;font-weight:700;color:${BRAND.gold};padding-top:1px;${WRAP}">${esc(parts.company)}</div>` : ""}
        </td></tr>
      </table>
    </td></tr></table>`;

  const back = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td height="152" valign="middle" bgcolor="#FFFFFF" style="height:152px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="92" valign="middle" style="width:92px">${qrImage(o.cardUrl, 88)}</td>
        <td valign="middle" style="padding-left:12px;${WRAP}">
          <div style="font-family:${FONT};font-size:13px;line-height:1.25;font-weight:800;color:${BRAND.ink}">Tap or scan</div>
          <div style="font-family:${FONT};font-size:11px;line-height:1.4;color:#64748B">to save my contact</div>
          <div style="font-family:${FONT};font-size:10.5px;line-height:1.4;font-weight:700;color:${BRAND.goldDark};padding:7px 0;${WRAP}">${shortHtml(o.cardUrl)}</div>
          ${credit(9)}
        </td>
      </tr></table>
    </td></tr></table>`;

  const card = o.card
    ? `<div style="text-align:center;font-size:0;margin:4px 0 0">${tile(front, "Card · front")}${tile(back, "Card · back")}</div>`
    : "";

  const standee = o.standee ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 14px"><tr><td align="center">
    <table role="presentation" width="204" cellpadding="0" cellspacing="0" style="width:204px;max-width:100%">
      <tr><td align="center" bgcolor="${BRAND.gold}" style="background-color:${BRAND.gold};background-image:linear-gradient(135deg,#F7B31C 0%,#D97706 100%);border-radius:30px 30px 0 0;padding:18px 14px 16px;${WRAP}">
        ${o.logo ? `<div style="padding-bottom:7px">${o.logoImage ? logoImg(28, 160, true) : placeholder(false)}</div>` : ""}
        <div style="font-family:${FONT};font-size:15px;line-height:1.2;font-weight:800;color:${BRAND.ink};${WRAP}">${esc(parts.company || parts.name || "Your business")}</div>
        <div style="font-family:${FONT};font-size:10.5px;line-height:1.4;font-weight:700;color:#554626;padding-top:3px">Tap or scan to connect</div>
      </td></tr>
      <tr><td align="center" bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 8px 8px;padding:12px 14px">
        <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${BRAND.ink};font-family:${FONT};font-size:9.5px;line-height:1.2;font-weight:800;color:${BRAND.gold};letter-spacing:1.4px">TAP · SCAN</span>
        <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:10px auto 0"><tr>
          <td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;padding:6px">${qrImage(o.cardUrl, 104)}</td>
        </tr></table>
        <div style="font-family:${FONT};font-size:10px;line-height:1.4;color:#64748B;padding-top:8px">Save contact · Review · Pay</div>
        <div style="border-top:1px solid #F1F5F9;margin-top:8px;padding-top:7px">${credit(9)}</div>
      </td></tr>
    </table>
    <div style="width:236px;max-width:100%;height:8px;margin:2px auto 0;background:#2B3443;border-radius:999px;font-size:0;line-height:0">&nbsp;</div>
    ${caption("Standee")}
  </td></tr></table>` : "";

  return card + standee;
}

/** A parcel label: who, where, phone, and the PIN in a box. `maps` adds a Google Maps link (for the team). */
function shipLabel(o: { ship?: NfcShip | null; address?: string | null; maps?: boolean }): string {
  const frame = (inner: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td bgcolor="#FFFFFF" style="background:#FFFFFF;border:2px dashed #C3CDDA;border-radius:14px;padding:16px 18px">${inner}</td>
  </tr></table>`;
  const label = (t: string) => `<div style="font-family:${FONT};font-size:10px;font-weight:800;color:${BRAND.sub};text-transform:uppercase;letter-spacing:1.2px">${t}</div>`;
  const s = o.ship;
  if (s) {
    const lines = [s.line1, s.line2, [s.city, s.state].filter(Boolean).join(", ")].filter((x): x is string => !!x);
    const full = [...lines, s.pincode].filter(Boolean).join(", ");
    // The PIN sits in the header row, so the address gets the full width on a phone.
    return frame(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle">${label("Ship to")}</td>
        ${s.pincode ? `<td valign="middle" align="right" style="padding-left:10px">
          <span style="display:inline-block;padding:5px 9px;border:2px solid ${BRAND.ink};border-radius:8px;font-family:${MONO};font-size:15px;line-height:1.2;font-weight:800;color:${BRAND.ink};letter-spacing:1px;${WRAP}"><span style="font-family:${FONT};font-size:9.5px;font-weight:800;color:${BRAND.sub};letter-spacing:1.1px;padding-right:6px">PIN</span>${esc(s.pincode)}</span>
        </td>` : ""}
      </tr></table>
      <div style="font-family:${FONT};font-size:17px;line-height:1.3;font-weight:800;color:${BRAND.ink};padding-top:8px;${WRAP}">${esc(s.name)}</div>
      <div style="font-family:${FONT};font-size:14px;line-height:1.6;color:${BRAND.body};padding-top:4px;${WRAP}">${lines.map((l) => esc(l)).join("<br>")}</div>
      ${s.phone ? `<div style="font-family:${FONT};font-size:14px;font-weight:700;color:${BRAND.ink};padding-top:6px;white-space:nowrap">${phoneLink(s.phone)}</div>` : ""}
      ${o.maps ? `<div style="padding-top:12px;font-family:${FONT};font-size:12.5px"><a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(full)}" target="_blank" style="color:${BRAND.goldDark};font-weight:700;text-decoration:none">Open in Google Maps &rarr;</a></div>` : ""}`);
  }
  if (o.address) {
    return frame(`${label("Ship to")}<div style="font-family:${FONT};font-size:14.5px;line-height:1.6;font-weight:600;color:${BRAND.ink};padding-top:6px;${WRAP}">${esc(o.address)}</div>`);
  }
  return "";
}

const shipText = (ship?: NfcShip | null, address?: string | null): string[] => {
  if (ship) {
    return [
      ship.name,
      ...[ship.line1, ship.line2, [ship.city, ship.state].filter(Boolean).join(", ") + (ship.pincode ? ` ${ship.pincode}` : "")].filter((x): x is string => !!x && !!x.trim()),
      ...(ship.phone ? [showPhone(ship.phone)] : []),
    ];
  }
  return address ? [address] : [];
};

/** The courier's number, big enough to read out on a call; a Track link when there is one. */
function trackingPanel(o: { code?: string | null; href?: string | null; courier?: string | null }): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px"><tr>
    <td bgcolor="${BRAND.navy}" style="background:${BRAND.navy};border-radius:14px;padding:20px 22px">
      <div style="font-family:${FONT};font-size:10.5px;font-weight:700;color:${BRAND.gold};text-transform:uppercase;letter-spacing:1.1px">${o.courier ? `Tracking · ${esc(o.courier)}` : "Tracking"}</div>
      ${o.code ? `<div style="font-family:${MONO};font-size:21px;line-height:1.35;font-weight:800;color:#FFFFFF;letter-spacing:.8px;padding-top:6px;word-break:break-all">${esc(o.code)}</div>` : ""}
      ${o.href ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr>
        <td bgcolor="${BRAND.gold}" style="background:${BRAND.gold};border-radius:10px;border-bottom:3px solid ${BRAND.goldDark}">
          <a href="${esc(o.href)}" target="_blank" style="display:inline-block;padding:11px 22px;font-family:${FONT};font-size:14px;font-weight:700;color:#1A1206;text-decoration:none">Track your parcel &rarr;</a>
        </td></tr></table>` : ""}
    </td>
  </tr></table>`;
}

/* ── 1. Order received (manual checkout, nothing charged yet) ────────────── */

/**
 * NEW · customer · kind "nfcOrderReceivedEmail".
 * Trigger: nfc.checkout when online payment is off (api/nfc-router.ts, the `!cr.enabled`
 * branch), once per checkout — after the rows are inserted, next to notifyTeam().
 * Tells the customer the order is in, that nothing has been charged, how to pay
 * (UPI / bank, when payment settings have them), and that printing starts after payment.
 *
 * - name: the recipient (shipName) or account name, for "Hi …".
 * - ids: every order row created by this checkout (a card + a standee are two rows).
 * - items: one per row — { product, name, print, quantity, unitPrice, amount }.
 * - total: rupees to pay; defaults to the sum of the items' amounts.
 * - deliveryLabel: NFC_DELIVERY.label ("3–7 working days") by default.
 * - printLines / print / logoUrl / cardUrl: what will be printed and the link the chip + QR open.
 * - ship (preferred) or address: where it goes.
 * - payment: where to pay; when empty, the email says the team will get in touch.
 * - at: when it was placed (defaults to now).
 */
export function nfcOrderReceivedEmail(o: {
  name?: string | null;
  ids: number[];
  items: NfcItem[];
  total?: number | null;
  deliveryLabel?: string | null;
  printLines?: string[] | null;
  print?: NfcPrint | null;
  logoUrl?: string | null;
  cardUrl?: string | null;
  ship?: NfcShip | null;
  address?: string | null;
  payment?: NfcPaymentDetails | null;
  at?: Date;
}): Email {
  const ids = sortedIds(o.ids);
  const ref = refOf(ids) || "#—";
  const items = o.items || [];
  const total = totalOf(items, o.total);
  const itemText = itemTextOf(items) || "NFC order";
  const { noun } = nounOf(items);
  const deliveryLabel = o.deliveryLabel || NFC_DELIVERY.label;
  const lines = (o.printLines || []).filter(Boolean);
  const parts = printParts(lines, o.print);
  const cardUrl = safeUrl(o.cardUrl);
  const logo = safeUrl(o.logoUrl);
  const at = o.at ?? new Date();

  const pay: NfcPaymentDetails = o.payment || {};
  const upiId = (pay.upiId || "").trim();
  const payee = (pay.payeeName || "").trim() || "DigitalCarda";
  const bank = pay.bank && pay.bank.account ? pay.bank : null;
  const hasPay = !!(upiId || bank);
  const upiNote = `DigitalCarda NFC ${ref}`;
  const upiUri = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${total}&cu=INR&tn=${encodeURIComponent(upiNote)}`
    : "";
  const hostedQr = safeUrl(pay.upiQrUrl);
  const paidMsg = `Hi DigitalCarda, I've paid ${inr(total)} for NFC order ${ref}. UTR / reference: `;

  const hero = heroBand({
    eyebrow: "Order received · awaiting payment",
    tone: "amber",
    title: `We've got your ${noun} order`,
    sub: hasPay
      ? "Nothing has been charged yet. Pay by UPI or bank transfer and we'll start printing."
      : "Nothing has been charged yet. We'll contact you to arrange payment, then start printing.",
    aside: { label: "To pay", value: inr(total), sub: "free delivery" },
    chips: [darkChip(`Order ${esc(ref)}`), darkChip(esc(itemText)), darkChip(`Placed ${esc(whenIst(at))}`)],
  });

  const upiBlock = upiId ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr>
      <td align="center" bgcolor="${BRAND.goldTint}" style="background:${BRAND.goldTint};border:1px solid ${BRAND.goldLine};border-radius:14px;padding:20px 18px 18px">
        <div style="font-family:${FONT};font-size:10.5px;font-weight:800;color:${BRAND.goldDark};text-transform:uppercase;letter-spacing:1.2px;padding-bottom:12px">Scan with any UPI app</div>
        <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
          <td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid ${BRAND.goldLine};border-radius:12px;padding:8px">${hostedQr
            ? `<img src="${esc(hostedQr)}" width="164" height="164" alt="UPI QR code for ${esc(payee)}" style="display:block;width:164px;height:164px;border:0">`
            : qrImage(upiUri, 164)}</td>
        </tr></table>
        <div style="font-family:${FONT};font-size:13px;line-height:1.55;color:${BRAND.body};padding-top:12px">${hostedQr
          ? `Enter <strong style="color:${BRAND.ink}">${esc(inr(total))}</strong> when your app asks for the amount.`
          : `The amount, <strong style="color:${BRAND.ink}">${esc(inr(total))}</strong>, fills in by itself.`}</div>
        <div style="padding-top:12px">${codeValue(upiId)}</div>
        <div style="font-family:${FONT};font-size:12.5px;color:${BRAND.sub};padding-top:6px;${WRAP}">UPI ID · pays ${esc(payee)}</div>
      </td>
    </tr></table>` : "";

  const bankBlock = bank ? (upiId ? sectionLabel("Or by bank transfer (NEFT / IMPS)") : "") + infoGrid([
    ["Account name", bank.holder ? `<span style="${WRAP}">${esc(bank.holder)}</span>` : null],
    ["Bank", bank.name ? `<span style="${WRAP}">${esc(bank.name)}</span>` : null],
    ["Account no.", bank.account ? mono(bank.account) : null],
    ["IFSC", bank.ifsc ? mono(bank.ifsc) : null],
    ["Amount", strong(inr(total))],
    ["Remark", esc(`NFC ${ref}`)],
  ]) : "";

  const howToPay = hasPay
    ? sectionLabel(`Pay ${inr(total)}`) + upiBlock + bankBlock +
      (pay.note ? note(esc(pay.note).replace(/\r?\n/g, "<br>")) : "") +
      sectionLabel("After you pay") +
      stepRow(1, "Send us the payment reference", `WhatsApp us or reply to this email with the UTR / transaction ID and your order number, <strong style="color:${BRAND.ink}">${esc(ref)}</strong>.`) +
      stepRow(2, "We confirm it and print", "Once the payment shows in our account, your order moves to printing.") +
      stepRow(3, "Free delivery", `We ship it free anywhere in India — ${esc(deliveryLabel)}.`) +
      `<div style="height:14px;font-size:0;line-height:0">&nbsp;</div>` +
      actionPills([{ label: "I've paid — send the reference", href: supportWa(paidMsg), tone: "whatsapp" }])
    : callout("amber", "We'll contact you to arrange payment",
        `Our team will get in touch${o.ship?.phone ? ` on ${phoneLink(o.ship.phone)}` : ""} to arrange payment. Want to pay straight away? Message us on WhatsApp and we'll send the details.`,
        actionPills([{ label: "WhatsApp us to pay now", href: supportWa(`Hi DigitalCarda, I'd like to pay ${inr(total)} for NFC order ${ref}.`), tone: "whatsapp" }]));

  const printSection = sectionLabel("What we'll print") +
    // With title vs company unknown, a drawing could differ from what they approved — the exact list below still shows every word.
    (cardUrl && !parts.guessed ? printDrawing({ parts, cardUrl, card: items.some((i) => !isStandee(i)), standee: items.some(isStandee), logo, logoImage: true }) : "") +
    (cardUrl && !parts.guessed && !logo ? small(logoNote(items)) : "") +
    infoGrid([...printedRows(lines, o.print), ["Tap or scan opens", cardUrl ? shortLink(cardUrl) : null]]) +
    small("Check the spelling now — reply if anything should read differently. Nothing is printed until your payment is confirmed.");

  const bodyHtml =
    hi(o.name) +
    p(`Thank you for your order. ${hasPay ? "We take payment for it by UPI or bank transfer, so " : "We arrange payment for it with you directly, so "}<strong style="color:${BRAND.ink}">nothing has been charged yet</strong>. As soon as your payment reaches us, we print your ${esc(noun)} and ship it free.`) +
    progressSteps(["Order placed", "Payment", "Printing", "Shipped", "Delivered"], 1, "amber") +
    howToPay +
    printSection +
    sectionLabel("Your order") +
    receipt({ rows: receiptRows(items, total), extra: [{ label: `Delivery · ${deliveryLabel}`, value: "Free", tone: "green" }], totalLabel: "To pay", total }) +
    (o.ship || o.address ? sectionLabel("Shipping to") + shipLabel({ ship: o.ship, address: o.address }) : "") +
    button("See your order", ORDERS_URL) +
    helpStrip();

  const text = [
    `Hi ${firstName(o.name) || "there"},`, "",
    `We've received your NFC order ${ref}: ${itemText}.`,
    `Nothing has been charged yet. Amount to pay: ${inr(total)} (free delivery, ${deliveryLabel}). We print it as soon as your payment reaches us.`, "",
    ...(hasPay
      ? [
          "HOW TO PAY",
          ...(upiId ? [`UPI: ${upiId} (pays ${payee}), amount ${inr(total)}`] : []),
          ...(bank ? [
            "Bank transfer (NEFT / IMPS):",
            ...(bank.holder ? [`  Account name: ${bank.holder}`] : []),
            ...(bank.name ? [`  Bank: ${bank.name}`] : []),
            `  Account no.: ${bank.account}`,
            ...(bank.ifsc ? [`  IFSC: ${bank.ifsc}`] : []),
            `  Remark: NFC ${ref}`,
          ] : []),
          ...(pay.note ? [pay.note] : []),
          "",
          "AFTER YOU PAY",
          `1. Send us the UTR / transaction ID and your order number (${ref}) on WhatsApp (${SUPPORT_WHATSAPP.display}) or by replying to this email.`,
          "2. We confirm it and your order moves to printing.",
          `3. We ship it free anywhere in India — ${deliveryLabel}.`,
        ]
      : [
          `Our team will get in touch${o.ship?.phone ? ` on ${showPhone(o.ship.phone)}` : ""} to arrange payment.`,
          `Want to pay straight away? WhatsApp us on ${SUPPORT_WHATSAPP.display}.`,
        ]),
    "",
    "WHAT WE'LL PRINT",
    ...(lines.length ? lines : ["(nothing given)"]),
    ...(cardUrl ? [`The NFC chip and QR code open: ${cardUrl}`] : []),
    "Check the spelling now — reply if anything should read differently. Nothing is printed until your payment is confirmed.", "",
    "YOUR ORDER",
    ...receiptRows(items, total).map((r) => `${r.qty ? `${r.qty} × ` : ""}${r.name} — ${inr(r.amount)}`),
    `Delivery: free (${deliveryLabel})`,
    `To pay: ${inr(total)}`, "",
    ...(o.ship || o.address ? ["SHIPPING TO", ...shipText(o.ship, o.address), ""] : []),
    `See your order: ${ORDERS_URL}`,
    `Questions? Reply to this email or WhatsApp ${SUPPORT_WHATSAPP.display}.`,
  ].join("\n");

  return {
    kind: "nfcOrderReceivedEmail",
    subject: `Order received (${ref}) — pay ${inr(total)} to start printing`,
    html: layout({
      preheader: `Nothing has been charged yet. ${hasPay ? "Pay by UPI or bank transfer" : "We'll contact you to arrange payment"}, and we'll print it and ship it free.`,
      hero, bodyHtml, accent: TONE.amber.solid, audience: "customer",
    }),
    text,
  };
}

/* ── 2. Order confirmed (paid) ───────────────────────────────────────────── */

/**
 * PORTED · customer · kind "nfcOrderConfirmedEmail".
 * Trigger today: nfc.verify after an online payment (api/nfc-router.ts). Planned: also
 * when the team marks a manual order Paid (nfc.update, pending_payment → paid).
 * Repeats exactly what will be printed and where it ships, so a mistake is caught
 * before production.
 *
 * Existing fields are unchanged; everything after `items` is optional and additive:
 * - ids: every order id the payment covers (defaults to [orderId]).
 * - items[].product / print / unitPrice / amount: for an itemised receipt.
 * - ship: the address field by field, drawn as a label (else `address` is shown as given).
 * - print / logoUrl: place the words and logo exactly in the drawing.
 * - paymentId: Razorpay payment id, shown as a reference.
 * - paidAt + delivery {minDays, maxDays}: an arrival window. When `delivery` is missing and
 *   `deliveryDays` is NFC_DELIVERY.label, NFC_DELIVERY's days are used.
 */
export function nfcOrderConfirmedEmail(o: {
  name?: string | null; orderId: number; productName: string; quantity: number; amount: number;
  printLines: string[]; address: string; cardUrl: string; deliveryDays: string;
  /** Several products paid together (e.g. card + standee): one line each. */
  items?: NfcItem[];
  ids?: number[];
  ship?: NfcShip | null;
  print?: NfcPrint | null;
  logoUrl?: string | null;
  paymentId?: string | null;
  paidAt?: Date;
  delivery?: { minDays: number; maxDays: number } | null;
}): Email {
  const ids = sortedIds(o.ids, o.orderId);
  const ref = refOf(ids);
  const items: NfcItem[] = o.items && o.items.length ? o.items : [{ name: o.productName, quantity: o.quantity }];
  const itemText = o.items && o.items.length > 1 ? itemTextOf(o.items) : `${o.quantity} × ${o.productName}`;
  const total = Number(o.amount) || 0;
  const { noun, plural } = nounOf(items);
  const lines = (o.printLines || []).filter(Boolean);
  const parts = printParts(lines, o.print);
  const cardUrl = safeUrl(o.cardUrl);
  const logo = safeUrl(o.logoUrl);
  const paidAt = o.paidAt ?? new Date();
  const days = o.delivery ?? (o.deliveryDays === NFC_DELIVERY.label ? NFC_DELIVERY : null);
  const arrival = days ? `${dayIst(addWorkingDays(paidAt, days.minDays))} – ${dayIst(addWorkingDays(paidAt, days.maxDays))}` : "";
  const fixMsg = `Hi DigitalCarda, a correction for my NFC order ${ref}: `;

  const hero = heroBand({
    eyebrow: "Payment received",
    tone: "green",
    title: `Your ${noun} ${plural ? "are" : "is"} confirmed`,
    sub: "One last look at the print details below — we print exactly what you see.",
    aside: { label: "Paid", value: inr(total), sub: "free delivery" },
    chips: [
      darkChip(`Order ${esc(ref)}`),
      ...(items.length > 1 ? [darkChip(esc(itemText))] : []),
      darkChip(arrival ? `Arrives ${esc(arrival)}` : `Delivery in ${esc(o.deliveryDays)}`, "#FCD34D"),
    ],
  });

  const bodyHtml =
    hi(o.name) +
    p("Thank you — your payment is in and your order is confirmed. We print exactly what's below, so please give it one careful look.") +
    progressSteps(STEPS, 0, "green") +
    callout("gold", "Spotted a mistake? Tell us before we print",
      "Reply to this email or WhatsApp us with the correction and your order number as soon as you can — once it's printed, it can't be changed.",
      actionPills([{ label: "WhatsApp a correction", href: supportWa(fixMsg), tone: "whatsapp" }])) +
    sectionLabel("What we'll print") +
    // With title vs company unknown, a drawing could differ from what they approved — the exact list below still shows every word.
    (cardUrl && !parts.guessed ? printDrawing({ parts, cardUrl, card: items.some((i) => !isStandee(i)), standee: items.some(isStandee), logo, logoImage: true }) : "") +
    (cardUrl && !parts.guessed && !logo ? small(logoNote(items)) : "") +
    infoGrid([...printedRows(lines, o.print), ["Tap or scan opens", cardUrl ? shortLink(cardUrl) : esc(o.cardUrl)]]) +
    sectionLabel("Your order") +
    receipt({ rows: receiptRows(items, total), extra: [{ label: `Delivery · ${o.deliveryDays}`, value: "Free", tone: "green" }], totalLabel: "Paid", total }) +
    (o.paymentId ? small(`Razorpay payment ID ${mono(o.paymentId)}`) : "") +
    sectionLabel("Shipping to") +
    shipLabel({ ship: o.ship, address: o.address }) +
    (o.ship?.phone ? small("Our courier will call this number if they need to.") : "") +
    button("See your order", ORDERS_URL) +
    helpStrip();

  const text = [
    `Hi ${firstName(o.name) || "there"},`, "",
    `Payment received — your order ${ref} is confirmed: ${itemText}, paid ${inr(total)}.`,
    ...(o.paymentId ? [`Razorpay payment ID: ${o.paymentId}`] : []),
    `Delivery: free, ${o.deliveryDays}${arrival ? ` (arriving ${arrival})` : ""}.`, "",
    "WHAT WE'LL PRINT",
    ...lines,
    `The NFC chip and QR code open: ${o.cardUrl}`, "",
    "SHIPPING TO",
    ...shipText(o.ship, o.address), "",
    `Spotted a mistake? Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} as soon as you can, so we can correct it before printing.`, "",
    `See your order: ${ORDERS_URL}`,
  ].join("\n");

  return {
    kind: "nfcOrderConfirmedEmail",
    subject: `Order confirmed — ${itemText} (${ref})`,
    html: layout({
      preheader: `Paid ${inr(total)}. Check the print details before we print — free delivery${arrival ? `, arriving ${arrival}` : `, ${o.deliveryDays}`}.`,
      hero, bodyHtml, accent: TONE.green.solid, audience: "customer",
    }),
    text,
  };
}

/* ── 3. Shipped ──────────────────────────────────────────────────────────── */

/**
 * PORTED · customer · kind "nfcOrderShippedEmail".
 * Trigger: nfc.update when an order first becomes "shipped" (api/nfc-router.ts).
 * Today it is sent per order row; pass `ids` + `items` to cover a whole checkout in one email.
 *
 * Existing fields unchanged; added (all optional):
 * - ids / items: every row and product in the parcel.
 * - courier: courier name, if the team records it.
 * - trackingUrl: a tracking page (http/https only). A `tracking` value that is itself a URL is linked too.
 * - ship: where it's going, shown as a label.
 * - cardUrl: the link the chip opens, for the "when it arrives" check.
 */
export function nfcOrderShippedEmail(o: {
  name?: string | null; orderId: number; productName: string; quantity: number; tracking?: string | null;
  ids?: number[];
  items?: NfcItem[];
  courier?: string | null;
  trackingUrl?: string | null;
  ship?: NfcShip | null;
  cardUrl?: string | null;
}): Email {
  const ids = sortedIds(o.ids, o.orderId);
  const ref = refOf(ids);
  const multi = !!(o.items && o.items.length > 1);
  const items: NfcItem[] = o.items && o.items.length ? o.items : [{ name: o.productName, quantity: o.quantity }];
  const itemText = multi ? itemTextOf(items) : `${o.quantity} × ${o.productName}`;
  const { noun, plural } = nounOf(items);
  const tracking = (o.tracking || "").trim();
  const trackingHref = safeUrl(o.trackingUrl) ?? safeUrl(tracking);
  const trackingCode = tracking && !safeUrl(tracking) ? tracking : "";
  const courier = (o.courier || "").trim();
  const cardUrl = safeUrl(o.cardUrl);

  const hero = heroBand({
    eyebrow: "Shipped",
    tone: "blue",
    title: `Your ${noun} ${plural ? "are" : "is"} on the way`,
    sub: trackingCode || trackingHref ? "It's with the courier — your tracking details are below." : "It's with the courier and heading to you.",
    chips: [darkChip(`Order ${esc(ref)}`), darkChip(esc(itemText)), ...(courier ? [darkChip(esc(courier))] : [])],
  });

  const bodyHtml =
    hi(o.name) +
    p(`Good news — order ${esc(ref)} has left us and is on its way to you.`) +
    (trackingCode || trackingHref
      ? trackingPanel({ code: trackingCode, href: trackingHref, courier })
      : callout("blue", "No tracking number on this one",
          "Want to know where it is? Reply or WhatsApp us with your order number and we'll check with the courier.")) +
    progressSteps(STEPS, 2) +
    sectionLabel("In the parcel") +
    infoGrid([
      ["Order", esc(ref)],
      [items.length > 1 ? "Items" : "Item", items.map((i) => `<div style="${WRAP}">${esc(`${i.quantity} × ${i.name}`)}</div>`).join("")],
      ["Courier", courier ? esc(courier) : null],
    ]) +
    (o.ship ? sectionLabel("Shipping to") + shipLabel({ ship: o.ship }) : "") +
    callout("gold", "When it arrives, tap it once",
      `Unlock your phone and hold the ${items.some((i) => !isStandee(i)) ? "card" : "standee"} against the back of it${cardUrl ? ` — ${shortLink(cardUrl)} should open` : " — your card should open"}. Any phone can also scan the QR code.`) +
    spacer(18) +
    p(`If the parcel seems stuck or doesn't turn up, WhatsApp us with your order number and we'll chase the courier.`) +
    button("See your order", ORDERS_URL) +
    helpStrip();

  const text = [
    `Hi ${firstName(o.name) || "there"},`, "",
    `Your ${itemText} (order ${ref}) is on its way.`,
    ...(courier ? [`Courier: ${courier}`] : []),
    ...(trackingCode ? [`Tracking: ${trackingCode}`] : []),
    ...(trackingHref ? [`Track your parcel: ${trackingHref}`] : []),
    ...(!trackingCode && !trackingHref ? ["No tracking number was added — reply or WhatsApp us and we'll check with the courier."] : []),
    "",
    ...(o.ship ? ["SHIPPING TO", ...shipText(o.ship), ""] : []),
    `When it arrives, unlock your phone and hold it against the back${cardUrl ? ` — ${cardUrl} should open` : ""}. Any phone can also scan the QR code.`, "",
    `Any problem, reply to this email or WhatsApp ${SUPPORT_WHATSAPP.display}.`,
    `See your order: ${ORDERS_URL}`,
  ].join("\n");

  return {
    kind: "nfcOrderShippedEmail",
    subject: multi ? `Shipped — your ${noun} (${ref})` : `Shipped — your ${o.productName} (#${o.orderId})`,
    html: layout({
      preheader: trackingCode
        ? `Tracking ${trackingCode}. When it arrives, tap it on your phone once to check it opens your card.`
        : "It's with the courier. When it arrives, tap it on your phone once to check it opens your card.",
      hero, bodyHtml, accent: TONE.blue.solid, audience: "customer",
    }),
    text,
  };
}

/* ── 4. Delivered ────────────────────────────────────────────────────────── */

/**
 * NEW · customer · kind "nfcOrderDeliveredEmail".
 * Trigger: nfc.update when an order first becomes "delivered" (api/nfc-router.ts).
 * How to tap-test it on Android and iPhone, where to keep or place it, and that the
 * chip opens their card link (so edits never need a reprint).
 *
 * - name: recipient (shipName) for "Hi …".
 * - ids: the delivered order row(s).
 * - items: { product?, name, quantity } per row — picks card and/or standee tips.
 * - cardUrl: the link the chip and QR open (nfc_orders.cardUrl); shows their card when it's a digitalcarda.in link.
 */
export function nfcOrderDeliveredEmail(o: {
  name?: string | null;
  ids: number[];
  items: NfcItem[];
  cardUrl?: string | null;
}): Email {
  const ids = sortedIds(o.ids);
  const ref = refOf(ids) || "#—";
  const items = o.items && o.items.length ? o.items : [{ name: "NFC card", quantity: 1 }];
  const itemText = itemTextOf(items);
  const { noun, plural } = nounOf(items);
  const hasCard = items.some((i) => !isStandee(i));
  const hasStandee = items.some(isStandee);
  const thing = hasCard && hasStandee ? "card or standee" : hasStandee ? "standee" : "card";
  const cardUrl = safeUrl(o.cardUrl);
  const slug = slugOf(cardUrl);

  const hero = heroBand({
    eyebrow: "Delivered",
    tone: "green",
    title: `Your ${noun} ${plural ? "have" : "has"} arrived`,
    sub: "Give it one tap on your phone to check it opens your card.",
    chips: [darkChip(`Order ${esc(ref)}`), darkChip(esc(itemText))],
  });

  const keep: string[] = [
    ...(hasCard ? [
      "Keep the card in your wallet or card holder, and tap it on someone's phone when you meet them — no app needed on their side.",
      "Keep it flat. Bending the card can break the chip inside.",
      "A metal card case can block the tap. The QR code on the back still works.",
    ] : []),
    ...(hasStandee ? [
      "Put the standee where people wait or pay — the billing counter, reception desk or a table — facing them, within reach of their phone.",
      "Keep it off metal surfaces and a little away from the card machine, so phones read it cleanly.",
    ] : []),
  ];

  const bodyHtml =
    hi(o.name) +
    p(`Your order has been delivered. Before you put it to work, tap it once on your own phone — it takes a few seconds and tells you it's working.`) +
    progressSteps(STEPS, STEPS.length, "green") +
    sectionLabel("Test it once") +
    infoGrid([
      ["Android", plain(`Check NFC is on (search “NFC” in Settings). Unlock the phone and hold the ${esc(thing)} flat against the middle of its back.`)],
      ["iPhone", plain(`iPhone XR and newer: unlock it and hold the ${esc(thing)} near the top of the back, by the camera. Tap the banner that appears.`)],
      ["Any phone", plain("Open the camera and point it at the QR code.")],
    ]) +
    callout("green", "It should open your card",
      (cardUrl ? `${shortLink(cardUrl)} — the same link as your QR code. ` : "") +
      "Didn't open? Try again with the phone unlocked and its case off. Still nothing? Message us and we'll help.") +
    sectionLabel("Where to keep it") +
    tickList("", keep) +
    note(`<strong style="color:${BRAND.ink}">Changed your number or address?</strong> Just update your card. The chip and QR code open your card link, so there's nothing to reprint.`) +
    (slug ? sectionLabel("What people see when they tap") + cardPreview(slug, "Your DigitalCarda card") : "") +
    (cardUrl ? button("Open my card", cardUrl) : button("See your order", ORDERS_URL)) +
    helpStrip();

  const text = [
    `Hi ${firstName(o.name) || "there"},`, "",
    `Your ${itemText} (order ${ref}) has been delivered.`, "",
    "TEST IT ONCE",
    `Android: check NFC is on (search "NFC" in Settings). Unlock the phone and hold the ${thing} flat against the middle of its back.`,
    `iPhone (XR and newer): unlock it and hold the ${thing} near the top of the back, by the camera. Tap the banner that appears.`,
    "Any phone: open the camera and point it at the QR code.",
    ...(cardUrl ? [`It should open ${cardUrl}.`] : []),
    "Didn't open? Try again with the phone unlocked and its case off. Still nothing? Message us and we'll help.", "",
    "WHERE TO KEEP IT",
    ...keep.map((k) => `- ${k}`), "",
    "Changed your number or address? Just update your card. The chip and QR code open your card link, so there's nothing to reprint.", "",
    `Questions? Reply to this email or WhatsApp ${SUPPORT_WHATSAPP.display}.`,
    `Your orders: ${ORDERS_URL}`,
  ].join("\n");

  return {
    kind: "nfcOrderDeliveredEmail",
    subject: `Delivered — your ${noun} (${ref})`,
    html: layout({
      preheader: "Tap it on your phone once to check it opens your card — here's how on Android and iPhone.",
      hero, bodyHtml, accent: TONE.green.solid, audience: "customer",
    }),
    text,
  };
}

/* ── 5. Cancelled ────────────────────────────────────────────────────────── */

/**
 * NEW · customer · kind "nfcOrderCancelledEmail".
 * Trigger: nfc.update when an order first becomes "cancelled" (api/nfc-router.ts).
 * Skip abandoned online checkouts (pending_payment WITH a razorpayOrderId) — the
 * customer never placed those. There is no refund flow, so this never promises an
 * automatic refund: "if you already paid, reply / WhatsApp and we'll sort it out".
 *
 * - name: recipient (shipName) for "Hi …".
 * - ids / items: the cancelled row(s).
 * - reason: the team's note (nfc_orders.adminNote), shown as their words.
 * - amount: order total in rupees.
 * - paid: true when the order had been paid (status was past pending_payment).
 * - paymentId: Razorpay payment id when it was paid online.
 */
export function nfcOrderCancelledEmail(o: {
  name?: string | null;
  ids: number[];
  items: NfcItem[];
  reason?: string | null;
  amount?: number | null;
  paid?: boolean;
  paymentId?: string | null;
}): Email {
  const ids = sortedIds(o.ids);
  const ref = refOf(ids) || "#—";
  const items = o.items || [];
  const itemText = itemTextOf(items) || "NFC order";
  const amount = typeof o.amount === "number" && Number.isFinite(o.amount) && o.amount > 0
    ? o.amount
    : items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const reason = (o.reason || "").trim();
  const msg = `Hi DigitalCarda, about my cancelled NFC order ${ref}: `;

  const hero = heroLight({
    badge: "Order cancelled",
    tone: "red",
    title: `Order ${ref} is cancelled`,
    sub: `${itemText}. Nothing from it will be printed or shipped.`,
  });

  const bodyHtml =
    hi(o.name) +
    p(`We've cancelled your NFC order ${esc(ref)}, so it won't be printed or shipped.`) +
    (reason ? quoteBlock(reason, "DigitalCarda team") : "") +
    callout(o.paid ? "amber" : "gold", o.paid ? "You paid for this order" : "Already paid for it?",
      o.paid
        ? `Our records show a payment for this order${o.paymentId ? ` (Razorpay ${mono(o.paymentId)})` : ""}. Reply to this email or WhatsApp us with your order number, and we'll sort it out with you.`
        : "If you already paid for this order, reply to this email or WhatsApp us with your order number and payment reference, and we'll sort it out with you.",
      actionPills([{ label: "WhatsApp us", href: supportWa(msg), tone: "whatsapp" }])) +
    sectionLabel("The order") +
    infoGrid([
      ["Order", esc(ref)],
      [items.length > 1 ? "Items" : "Item", items.length ? items.map((i) => `<div style="${WRAP}">${esc(`${i.quantity} × ${i.name}`)}</div>`).join("") : esc(itemText)],
      ["Amount", amount ? esc(inr(amount)) : null],
    ]) +
    spacer(18) +
    p(`Didn't ask for this, or still want it? Reply and we'll help — or place a new order any time.`) +
    button("Go to NFC orders", ORDERS_URL, "dark") +
    helpStrip();

  const text = [
    `Hi ${firstName(o.name) || "there"},`, "",
    `We've cancelled your NFC order ${ref} (${itemText}${amount ? `, ${inr(amount)}` : ""}), so it won't be printed or shipped.`,
    ...(reason ? ["", `Note from our team: ${reason}`] : []), "",
    o.paid
      ? `Our records show a payment for this order${o.paymentId ? ` (Razorpay ${o.paymentId})` : ""}. Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} with your order number, and we'll sort it out with you.`
      : `If you already paid for this order, reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} with your order number and payment reference, and we'll sort it out with you.`,
    "",
    "Didn't ask for this, or still want it? Reply and we'll help — or place a new order any time.",
    `NFC orders: ${ORDERS_URL}`,
  ].join("\n");

  return {
    kind: "nfcOrderCancelledEmail",
    subject: `Order cancelled — ${itemText} (${ref})`,
    html: layout({
      preheader: "It won't be printed or shipped. If you already paid, reply or WhatsApp us and we'll sort it out.",
      hero, bodyHtml, accent: TONE.red.solid, audience: "customer",
    }),
    text,
  };
}

/* ── 6. NFC order → the team ─────────────────────────────────────────────
   One email per checkout (a card and a standee bought together arrive as one),
   laid out in the order the work happens: collect or confirm the money, print,
   encode and test the chip, ship. */

export type NfcAdminAlert = {
  ids: number[];
  paid: boolean;
  paymentId?: string | null;
  items: { product: "nfc_card" | "nfc_standee" | string; name: string; print: string; quantity: number; unitPrice: number; amount: number }[];
  printLines: string[];
  cardUrl: string;
  logoUrl?: string | null;
  ship: { name: string; phone: string; line1: string; line2?: string | null; city: string; state: string; pincode: string };
  customer?: { id: number; name: string; email: string } | null;
  delivery: { label: string; maxDays: number };
  at?: Date;
  /** Optional: the printed words field by field (nfc_orders.print*), so the drawing places
      title and company exactly. Without it they are read from printLines. */
  print?: NfcPrint | null;
  /** Optional: the customer has been sent nfcOrderReceivedEmail with the payment details. */
  customerEmailed?: boolean;
};

/**
 * PORTED · admin · kind "nfcOrderAdmin" (kept — it is stored in email_logs).
 * Trigger: notifyTeam() in api/nfc-router.ts — manual checkout (paid:false) and
 * online payment verified (paid:true).
 */
export function nfcOrderAdminEmail(o: NfcAdminAlert): Email {
  const at = o.at ?? new Date();
  const ids = sortedIds(o.ids);
  const ref = refOf(ids) || "#—";
  const total = o.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const itemText = itemTextOf(o.items) || "NFC order";
  const first = firstName(o.ship.name) || "there";
  const tone: Tone = o.paid ? "green" : "amber";
  const cardUrl = safeUrl(o.cardUrl);
  const slug = slugOf(o.cardUrl);
  const logo = safeUrl(o.logoUrl);
  const parts = printParts(o.printLines, o.print);
  const addressLines = [o.ship.line1, o.ship.line2, `${o.ship.city}, ${o.ship.state}`].filter((x): x is string => !!x);
  const fullAddress = [...addressLines, o.ship.pincode].join(", ");
  const deliverBy = addWorkingDays(at, o.delivery.maxDays);
  const hasCard = o.items.some((i) => (i.product ? i.product === "nfc_card" : !isStandee(i)));
  const hasStandee = o.items.some((i) => (i.product ? i.product === "nfc_standee" : isStandee(i)));

  const hero = heroBand({
    eyebrow: o.paid ? "Paid · ready to print" : "Awaiting payment · don't print yet",
    tone,
    title: itemText,
    sub: `Order ${ref} for ${o.ship.name}`,
    aside: { label: o.paid ? "Paid" : "To collect", value: inr(total), sub: "free delivery" },
    chips: [
      darkChip(esc(whenIst(at))),
      darkChip(`To ${esc(o.ship.city)}, ${esc(o.ship.state)}`),
      darkChip(`Deliver by ${esc(dayIst(deliverBy))}`, "#FCD34D"),
    ],
  });

  const waMsg = o.paid
    ? `Hi ${first}, this is DigitalCarda 👋 We've received your payment for order ${ref} (${itemText}). We're printing it now and will send tracking as soon as it ships.`
    : `Hi ${first}, this is DigitalCarda 👋 Thanks for your order ${ref}: ${itemText}, ${inr(total)} with free delivery. How would you like to pay? As soon as it's paid we print it and ship within ${o.delivery.label}.`;
  const contact = actionPills([
    { label: `WhatsApp ${first}`, href: waLink(o.ship.phone, waMsg), tone: "whatsapp" },
    { label: "Call", href: telLink(o.ship.phone), tone: "dark" },
    { label: "Email", href: o.customer?.email ? mailtoLink(o.customer.email, `Your DigitalCarda order ${ref}`) : null },
  ]);
  const next = o.paid
    ? callout("green", "Paid online — go ahead and print",
        `${esc(inr(total))} received${o.paymentId ? ` · Razorpay ${mono(o.paymentId)}` : ""}. The customer already has their confirmation email.`, contact)
    : callout("amber", `Collect ${inr(total)} before printing`,
        `Online payment is switched off, so nothing has been charged.${o.customerEmailed ? " The customer has been emailed how to pay." : ""} Contact ${esc(first)} to arrange payment, then set the order to <strong>Paid</strong> in Admin.`, contact);

  const itemsReceipt = receipt({
    rows: o.items.map((i) => ({
      name: i.name,
      sub: [i.print, `${inr(i.unitPrice)} each`].filter(Boolean).join(" · "),
      qty: i.quantity,
      amount: Number(i.amount) || 0,
    })),
    extra: [{ label: `Delivery · ${o.delivery.label}`, value: "Free", tone: "green" }],
    total,
  });

  const logoRow = logo
    ? `${inkLink(logo, hostLabel(logo))}<div style="font-size:12px;font-weight:500;color:${BRAND.sub};padding-top:2px">Uploaded by the customer — check the site above before downloading.</div>`
    : `${muted("Not uploaded")} — take it from ${cardUrl ? inkLink(cardUrl, "their card") : "their card"} if it has one`;

  const steps: [string, string][] = [
    ...(o.paid ? [] : [["Collect the payment", `${esc(inr(total))} from ${esc(o.ship.name)}, then set the order to <strong>Paid</strong>.`] as [string, string]]),
    ["Print it", `Use the exact text and layout above${logo ? ", with the logo file" : ", with the logo from their card if it has one"}.`],
    ["Write the chip", `Encode <strong style="${WRAP}">${shortHtml(o.cardUrl)}</strong> on the NFC chip — the same link as the QR code.`],
    ["Test it", "Tap it on an Android phone and an iPhone, and scan the QR code. Both must open the card."],
    ["Ship it", "Set the order to <strong>Shipped</strong> with the tracking number — the customer is emailed automatically."],
  ];

  const bodyHtml =
    next +
    sectionLabel("Order") + itemsReceipt +
    sectionLabel("What to print") +
    (cardUrl ? printDrawing({ parts, cardUrl, card: hasCard, standee: hasStandee, logo, logoImage: false }) : "") +
    small(`Drawn the way the customer saw it when ordering. The printed text below is exact.${parts.guessed ? " This alert doesn't say whether the middle line is a job title or a company — check the order in Admin." : ""}`) +
    infoGrid([
      ["Printed text", o.printLines.length ? o.printLines.map((l) => `<div style="${WRAP}">${esc(l)}</div>`).join("") : muted("None given")],
      ["Chip + QR open", cardUrl ? shortLink(cardUrl) : `<span style="${WRAP}">${esc(o.cardUrl)}</span>`],
      ["Logo", logoRow],
    ]) +
    (slug ? `<div style="height:14px;font-size:0;line-height:0">&nbsp;</div>` + cardPreview(slug, "The card the chip opens") : "") +
    sectionLabel("Shipping label") + shipLabel({ ship: o.ship, maps: true }) +
    (o.customer ? sectionLabel("Customer account") + infoGrid([
      ["Name", `<span style="${WRAP}">${esc(o.customer.name)}</span>`],
      ["Email", `<span style="word-break:break-all">${emailLink(o.customer.email)}</span>`],
      ["Account", `#${esc(o.customer.id)} ${muted(`· ${inkLink(`${SITE}/admin/customers?q=${encodeURIComponent(o.customer.email)}`, "open in admin")}`)}`],
    ]) : "") +
    sectionLabel("Checklist") +
    steps.map(([t, b], i) => stepRow(i + 1, t, b)).join("") +
    button("Open NFC orders", `${SITE}/admin/nfc-orders`);

  return {
    kind: "nfcOrderAdmin",
    subject: `NFC order ${ref} · ${itemText} · ${inr(total)} · ${o.paid ? "Paid, ready to print" : "Awaiting payment"}`,
    html: layout({
      preheader: `${o.paid ? "Paid" : "Collect payment"}: ${itemText} for ${o.ship.name}, ${o.ship.city}. Deliver by ${dayIst(deliverBy)}.`,
      hero, bodyHtml, accent: TONE[tone].solid, audience: "admin",
    }),
    text: [
      `NFC order ${ref} — ${o.paid ? `PAID${o.paymentId ? ` (Razorpay ${o.paymentId})` : ""}, ready to print` : "AWAITING PAYMENT — collect it before printing"}`, "",
      ...o.items.map((i) => `${i.quantity} × ${i.name} (${i.print}) = ${inr(i.amount)}`),
      `Total: ${inr(total)} · free delivery, ${o.delivery.label} (by ${dayIst(deliverBy)})`, "",
      "Print:", ...o.printLines,
      `NFC chip + QR open: ${o.cardUrl}`,
      `Logo: ${logo || `not uploaded — take it from ${o.cardUrl} if the card has one`}`, "",
      `Ship to: ${o.ship.name}, ${o.ship.phone}`, fullAddress, "",
      ...(o.customer ? [`Customer account: #${o.customer.id} ${o.customer.name} <${o.customer.email}>`, ""] : []),
      `Manage it: ${SITE}/admin/nfc-orders`,
    ].join("\n"),
  };
}
