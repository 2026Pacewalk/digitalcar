/*
 * Lead emails: what happens after someone fills in the enquiry form on a card.
 *
 *   enquiryAutoReplyEmail   the VISITOR, on the business's behalf (loaded by a
 *                           dynamic import in api/boot.ts, so keep the name)
 *   newLeadOwnerEmail       the CARD OWNER, the moment a lead arrives (normal / hot)
 *   leadFollowUpsDueEmail   the CARD OWNER, on a day they have follow-ups due
 *   leadNotificationEmail   the PLATFORM inbox: oversight copy of a normal lead
 *   hotLeadEmail            the PLATFORM inbox: oversight copy of a high-intent lead
 *
 * Everything a visitor typed is untrusted, and on the public /api/enquiry path
 * it arrives unvalidated: any length, any characters, even the slug and the
 * "email". So it is always escaped, collapsed to one line where it lands in a
 * subject, clipped, and only turned into a mailto:/tel:/wa.me link when it
 * really looks like an address or a number.
 *
 * Kinds are stored in email_logs: keep them exactly as they are.
 */

import {
  type Email, type Tone,
  layout, heroBand, heroLight, heroPerson,
  sectionLabel, button, actionPills, callout, note, infoGrid, quoteBlock, cardPreview,
  pill, darkChip, hi, p, strong, small, inkLink, goldLink, phoneLink, emailLink,
  esc, firstName, showPhone, waLink, telLink, mailtoLink, whenIst, dayIst, helpStrip,
  BRAND, TONE, FONT, SITE, SUPPORT_WHATSAPP,
} from "./kit";

/* ── Local helpers ─────────────────────────────────────────────────────── */

const LEADS_URL = `${SITE}/dashboard/leads`;
const ADMIN_LEADS_URL = `${SITE}/admin/leads`;

/** "3:42 pm", India time. */
const timeIst = (d: Date) =>
  d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });

/** A usable Date or null. */
const okDate = (d?: Date | null): Date | null => (d instanceof Date && !Number.isNaN(d.getTime()) ? d : null);

/** Whitespace (newlines too: these land in subjects) collapsed to single spaces. */
const oneLine = (s?: string | null) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Cut to n characters with an ellipsis. */
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** The visitor's message, newlines kept. /api/enquiry has no length limit, so
    clip it to keep every email well inside the size budget. */
const MESSAGE_MAX = 2000;
const messageText = (m?: string | null) => {
  const t = String(m ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return t.length > MESSAGE_MAX ? `${t.slice(0, MESSAGE_MAX).trimEnd()}…` : t;
};

/** An address we can safely offer as a mailto: button, or "" (the enquiry
    endpoint does not validate the email field). */
const validEmail = (e?: string | null) => {
  const t = oneLine(e);
  return /^[^@\s"'<>]+@[^@\s"'<>]+\.[^@\s"'<>]+$/.test(t) && t.length <= 254 ? t : "";
};

const cardUrlOf = (slug?: string | null) => {
  const s = oneLine(slug);
  return s ? `${SITE}/${encodeURIComponent(s)}` : null;
};

/** Lead-check reasons worth showing a card owner ("came from a card" is true of
    every card lead, and "classified by AI" means nothing to them). */
const ownerReasons = (r?: string[] | null) =>
  (r || []).map((x) => oneLine(x)).filter((x) => x && !/^(came from a card|classified by ai|general enquiry)$/i.test(x)).slice(0, 3);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Lead stages, labelled and coloured as on the leads page. */
const STAGE: Record<string, { label: string; tone: Tone }> = {
  new: { label: "New", tone: "blue" },
  contacted: { label: "Contacted", tone: "violet" },
  interested: { label: "Interested", tone: "green" },
  follow_up: { label: "Follow-up", tone: "amber" },
  converted: { label: "Converted", tone: "green" },
  not_interested: { label: "Not interested", tone: "gold" },
  closed: { label: "Closed", tone: "red" },
};
const stageOf = (s?: string | null) => {
  const k = oneLine(s).toLowerCase();
  if (!k) return null;
  return STAGE[k] || { label: clip(cap(k.replace(/_/g, " ")), 24), tone: "gold" as Tone };
};

/** The WhatsApp hello a card owner sends a new lead (prefilled, editable). */
function ownerHello(visitor: string, ownerName?: string | null, cardName?: string | null): string {
  const me = clip(firstName(ownerName), 30);
  const business = cardName && firstName(cardName).toLowerCase() !== me.toLowerCase() ? cardName : "";
  return `Hi ${clip(firstName(visitor), 30) || "there"}, thank you for ${business ? `contacting ${business}` : "your enquiry on my digital card"}. `
    + `${me ? `This is ${me}, happy to help.` : "Happy to help."} When would be a good time to talk?`;
}

/** The WhatsApp follow-up a card owner sends on the day they planned to. */
function followUpHello(lead: string, ownerName?: string | null): string {
  const me = clip(firstName(ownerName), 30);
  const who = clip(firstName(lead), 30) || "there";
  return me
    ? `Hi ${who}, this is ${me}. Just following up on your enquiry. Is now a good time to talk?`
    : `Hi ${who}, just following up on your enquiry. Is now a good time to talk?`;
}

/** helpStrip() says "reply to this email", but a lead email's Reply-To is the
    visitor, so a reply would go to them. This strip only offers WhatsApp. */
function whatsappHelpStrip(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 6px"><tr>
    <td bgcolor="${BRAND.soft}" style="background:${BRAND.soft};border:1px solid ${BRAND.line};border-radius:14px;padding:14px 18px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle" style="font-family:${FONT};font-size:13.5px;line-height:1.5;color:${BRAND.body}"><strong style="color:${BRAND.ink}">Need a hand with your leads?</strong> Message us on WhatsApp — a real person answers.</td>
        <td valign="middle" align="right" style="padding-left:12px;white-space:nowrap">
          <a href="https://wa.me/${SUPPORT_WHATSAPP.wa}" target="_blank" style="display:inline-block;padding:9px 14px;border-radius:999px;background:#25D366;border:1px solid #1FAF55;font-family:${FONT};font-size:12.5px;font-weight:700;color:#FFFFFF;text-decoration:none;white-space:nowrap">WhatsApp us</a>
        </td>
      </tr></table>
    </td>
  </tr></table>`;
}

/** A muted line under a callout's text ("WhatsApp opens with …"). */
const mutedLine = (html: string) =>
  `<div style="font-family:${FONT};font-size:12.5px;line-height:1.55;color:${BRAND.sub};padding-top:8px">${html}</div>`;

/* ── Visitor: the auto-reply sent on the business's behalf ─────────────── */

/**
 * Audience: VISITOR (the person who filled in the enquiry form on a card).
 * Trigger: POST /api/enquiry (api/boot.ts), when the visitor's email looks valid
 * and the published card has a business name. Loaded by a dynamic import there,
 * so the export name must not change. Reply-To is set to the business's email.
 *
 * Fields: visitorName = what they typed; message = their enquiry; business =
 * company_name || name from the card; ownerPhone = mobile1; ownerEmail = the
 * card's email; whatsapp = mobile2 || mobile1; slug = the card they used.
 */
export function enquiryAutoReplyEmail(o: {
  visitorName?: string | null; message?: string | null;
  business: string; ownerPhone?: string | null; ownerEmail?: string | null;
  slug?: string | null; whatsapp?: string | null;
}): Email {
  const business = clip(oneLine(o.business), 80) || "the business";
  const shortBiz = clip(business, 32);
  const visitor = clip(oneLine(o.visitorName), 80);
  const msg = messageText(o.message);
  const phone = oneLine(o.ownerPhone);
  const wa = oneLine(o.whatsapp) || phone;
  const email = validEmail(o.ownerEmail);
  const cardUrl = cardUrlOf(o.slug);
  const slug = oneLine(o.slug);

  const vFirst = clip(firstName(visitor), 30);
  const waHref = waLink(wa, `Hi ${business}, ${vFirst ? `this is ${vFirst}. I've` : "I've"} just sent you an enquiry through your digital card.`);
  const callHref = telLink(phone || wa);
  const mailHref = email ? mailtoLink(email, "My enquiry") : null;
  const canReach = !!(waHref || callHref || mailHref);

  const reachLines = [
    callHref ? `Phone: ${phoneLink(phone || wa)}` : "",
    waHref && wa !== phone ? `WhatsApp: ${phoneLink(wa)}` : "",
    email ? `Email: ${emailLink(email)}` : "",
  ].filter(Boolean);

  const bodyHtml =
    hi(visitor) +
    p(`${strong(business)} will get back to you on the details you shared. Until then, here's a copy of your message and the quickest ways to reach them.`) +
    (msg ? sectionLabel("What you sent") + quoteBlock(msg) : "") +
    (canReach
      ? callout("gold", "If it can't wait",
          `You can reach ${esc(business)} directly.${reachLines.length ? `<br>${reachLines.join("<br>")}` : ""}`,
          actionPills([
            { label: "WhatsApp them", href: waHref, tone: "whatsapp" },
            { label: "Call", href: callHref, tone: "dark" },
            { label: "Email", href: mailHref, tone: "light" },
          ]))
      : "") +
    (cardUrl && slug
      ? sectionLabel("Their digital card") +
        cardPreview(slug, `${business} digital business card`) +
        p(`<span style="font-size:14px">Open it to save their contact to your phone in one tap, so you'll know it's them when they call back.</span>`) +
        button(`View ${shortBiz}`, cardUrl)
      : "") +
    (email ? small(`You can also reply to this email — your reply goes straight to ${esc(business)}.`) : "");

  const text = [
    `Hi ${firstName(visitor) || "there"},`,
    "",
    `Thank you for contacting ${business} through their digital card. Your enquiry has reached them, and they'll get back to you on the details you shared.`,
    ...(msg ? ["", "What you sent:", msg] : []),
    ...(canReach ? ["", "If it can't wait, reach them directly:"] : []),
    ...(callHref ? [`Phone: ${showPhone(phone || wa)}`] : []),
    ...(waHref ? [`WhatsApp: ${waHref}`] : []),
    ...(email ? [`Email: ${email}`] : []),
    ...(cardUrl ? ["", `Their digital card (save their contact in one tap): ${cardUrl}`] : []),
    ...(email ? ["", `You can also reply to this email — it goes straight to ${business}.`] : []),
    "",
    `Sent automatically on behalf of ${business} by DigitalCarda.`,
  ].join("\n");

  return {
    kind: "enquiryAutoReplyEmail",
    subject: `We've received your enquiry — ${clip(business, 70)}`,
    html: layout({
      preheader: canReach
        ? `Your message reached ${business}. Their number and card are inside if it can't wait.`
        : `Your message reached ${business}. They'll reply on the details you shared.`,
      hero: heroLight({
        badge: "Enquiry received",
        title: `${business} has your enquiry`,
        sub: "Thank you for getting in touch through their digital card. Your message has reached them.",
      }),
      bodyHtml,
      audience: "visitor",
      footer: `Sent automatically on behalf of ${esc(business)}, who use DigitalCarda for their digital business card. You're receiving it because you sent them an enquiry.`,
    }),
    text,
  };
}

/* ── Card owner: a new lead, the moment it arrives ─────────────────────── */

/**
 * Audience: CARD OWNER (a DigitalCarda customer).
 * Trigger: a stored, non-spam enquiry: sendLeadNotification in api/lib/mail.ts,
 * reached from POST /api/enquiry (api/boot.ts) and tRPC lead.create
 * (api/lead-router.ts). Send with Reply-To = the visitor's email: the copy
 * tells the owner that replying reaches the visitor.
 */
export interface NewLeadOwnerInput {
  /** The card owner's full name (users.fullName): greeting + signature in the prefilled WhatsApp. */
  ownerName?: string | null;
  /** The visitor's name as typed in the form. */
  name: string;
  /** The visitor's email as typed (unvalidated on /api/enquiry: shown as text if it isn't an address). */
  email?: string | null;
  /** The visitor's phone as typed. WhatsApp and Call buttons appear only if it parses as a number. */
  contact?: string | null;
  /** The visitor's company (lead.create path only). */
  company?: string | null;
  /** What they wrote. Clipped to 2,000 characters. */
  message?: string | null;
  /** The card they used: builds the card link. */
  slug?: string | null;
  /** The card's title (card.title) or company name; falls back to the link, then "your card". */
  cardName?: string | null;
  /** The lead check said "important": the visibly more urgent version. */
  hot?: boolean;
  /** When the enquiry arrived (defaults to now). */
  at?: Date | null;
  /** LeadVerdict.reasons from classifyLeadSmart; generic ones are hidden. Shown on the hot version. */
  reasons?: string[] | null;
}

export function newLeadOwnerEmail(o: NewLeadOwnerInput): Email {
  const hot = !!o.hot;
  const name = clip(oneLine(o.name), 80) || "Someone";
  const vFirst = clip(firstName(name), 20) || "them";
  const cardName = clip(oneLine(o.cardName), 60);
  const slug = clip(oneLine(o.slug), 60);
  const cardUrl = cardUrlOf(o.slug);
  const label = cardName || (slug ? `digitalcarda.in/${slug}` : "your card");
  const at = okDate(o.at) || new Date();
  const phone = clip(oneLine(o.contact), 40);
  const emailTyped = clip(oneLine(o.email), 120);
  const email = validEmail(o.email);
  const company = clip(oneLine(o.company), 80);
  const msg = messageText(o.message);
  const reasons = ownerReasons(o.reasons);

  const hello = ownerHello(name, o.ownerName, cardName || null);
  const waHref = waLink(phone, hello);
  const callHref = telLink(phone);
  const mailHref = email ? mailtoLink(email, `Re: your enquiry${cardName ? ` on ${cardName}` : ""}`) : null;
  const canReply = !!(waHref || callHref || mailHref);
  const tone: Tone = hot ? "red" : "green";

  const pills = actionPills([
    { label: `WhatsApp ${vFirst}`, href: waHref, tone: "whatsapp" },
    { label: "Call", href: callHref, tone: "dark" },
    { label: "Email", href: mailHref, tone: "light" },
  ]);
  const helloLine = waHref ? mutedLine(`WhatsApp opens with this, ready to send or edit: “${esc(hello)}”`) : "";

  const replyPanel = canReply
    ? callout(tone,
        hot ? "Reply soon — this one looks serious" : "Reply while it's fresh",
        (hot
          ? `Our lead check marked it high-intent${reasons.length ? ` (${esc(reasons.join(", "))})` : ""}. Someone ready to buy may be asking a few businesses at once, so a quick, personal reply matters.`
          : "A quick, personal reply is the best way to turn an enquiry into a customer.")
        + helloLine,
        pills)
    : callout(tone,
        hot ? "This one looks serious" : "How to reply",
        `They didn't leave a phone number or email we could turn into a button. Their details are below exactly as they typed them.`);

  const chips = [
    darkChip(`On ${esc(clip(label, 40))}`),
    phone ? darkChip(esc(showPhone(phone))) : "",
    emailTyped ? darkChip(esc(clip(emailTyped, 40))) : "",
  ].filter(Boolean);

  const bodyHtml =
    hi(o.ownerName) +
    p(`${strong(name)} filled in the enquiry form on ${cardUrl ? inkLink(cardUrl, label) : esc(label)} at ${esc(timeIst(at))}. ${msg ? "Here's what they wrote:" : "They left their details but no message."}`) +
    (msg ? quoteBlock(msg, name) : "") +
    replyPanel +
    sectionLabel("Their details") +
    infoGrid([
      ["Name", esc(name)],
      ["Company", company ? esc(company) : null],
      ["Phone", phone ? phoneLink(phone) : null],
      ["Email", email ? emailLink(email) : emailTyped ? esc(emailTyped) : null],
      ["Card", cardUrl ? inkLink(cardUrl, label) : esc(label)],
      ["Received", esc(whenIst(at))],
    ]) +
    note(`<strong style="color:${BRAND.ink}">Tip:</strong> the first reply sets the tone — use their name and answer their question in the first line. Then mark the lead <strong style="color:${BRAND.ink}">Contacted</strong> and set a follow-up date, so your dashboard reminds you on the day.`) +
    button("Open your leads", LEADS_URL, "dark") +
    (email ? small(`Replying to this email writes straight to ${esc(vFirst)} at ${esc(email)}.`) : "") +
    whatsappHelpStrip();

  const subject = hot
    ? `🔥 Hot lead: ${clip(name, 50)} — reply soon`
    : `New enquiry from ${clip(name, 50)}${cardName ? ` on ${clip(cardName, 40)}` : ""}`;

  const preheader = msg
    ? `“${clip(oneLine(msg), 110)}” — reply on WhatsApp, call or email in one tap.`
    : `${name} left ${phone ? "their number" : email ? "their email" : "their name"} on ${label}. Reply in one tap.`;

  const text = [
    `Hi ${firstName(o.ownerName) || "there"},`,
    "",
    `${hot ? "HOT LEAD. " : ""}${name} filled in the enquiry form on ${label} (${whenIst(at)}).`,
    ...(hot ? [`Our lead check marked it high-intent${reasons.length ? ` (${reasons.join(", ")})` : ""}. Reply soon.`] : []),
    ...(msg ? ["", "What they wrote:", msg] : ["", "They left their details but no message."]),
    "",
    "Reply now:",
    ...(waHref ? [`WhatsApp (message ready to send): ${waHref}`] : []),
    ...(callHref ? [`Call: ${showPhone(phone)}`] : phone ? [`Phone (as typed): ${phone}`] : []),
    ...(email ? [`Email: ${email}`] : emailTyped ? [`Email (as typed): ${emailTyped}`] : []),
    ...(company ? [`Company: ${company}`] : []),
    ...(cardUrl ? [`Card: ${cardUrl}`] : []),
    "",
    "Tip: use their name and answer their question in the first line. Then mark the lead Contacted and set a follow-up date, so your dashboard reminds you on the day.",
    "",
    `Your leads: ${LEADS_URL}`,
    ...(email ? [`Replying to this email writes straight to ${name}.`] : []),
    "",
    `Need a hand with your leads? WhatsApp us: https://wa.me/${SUPPORT_WHATSAPP.wa}`,
    "— Team DigitalCarda",
  ].join("\n");

  return {
    kind: "newLeadOwnerEmail",
    subject,
    html: layout({
      preheader,
      hero: heroBand({
        eyebrow: hot ? "Hot enquiry" : "New enquiry",
        tone,
        title: `${hot ? "Hot" : "New"} enquiry from ${name}`,
        sub: hot
          ? "Their message reads like a real buying enquiry. Reply soon, while they're still deciding."
          : "Someone found your card and wants to hear from you. Reply in one tap from this email.",
        aside: { label: "Received", value: timeIst(at), sub: dayIst(at) },
        chips,
        icon: hot ? "🔥" : undefined,
      }),
      bodyHtml,
      accent: TONE[tone].solid,
      audience: "customer",
    }),
    text,
  };
}

/* ── Card owner: today's follow-ups ────────────────────────────────────── */

/** One lead in the follow-ups email. Every field comes from its `leads` row. */
export interface LeadFollowUpItem {
  /** leads.fullName */
  leadName: string;
  /** leads.phone: Call and WhatsApp buttons appear only if it parses as a number. */
  phone?: string | null;
  /** leads.email */
  email?: string | null;
  /** leads.notes: the owner's own notes, shown as "Your note". */
  note?: string | null;
  /** leads.status (new, contacted, interested, follow_up…). */
  status?: string | null;
  /** leads.company */
  company?: string | null;
  /** leads.message: the original enquiry, shown as a one-line reminder. */
  message?: string | null;
}

/**
 * Audience: CARD OWNER.
 * Trigger: a daily job (runDailyEmailJobs) for owners with open leads
 * (status not converted / not_interested / closed) whose followUpDate falls
 * today in IST. One email per owner per day.
 *
 * Fields: ownerName = users.fullName; items = the leads due (pass up to 10;
 * more than 15 are cut); total = how many are due in all (defaults to
 * items.length), so "+3 more" can point to the leads page; date = the IST day
 * the list is for (defaults to now).
 */
export interface LeadFollowUpsInput {
  ownerName?: string | null;
  items: LeadFollowUpItem[];
  total?: number | null;
  date?: Date | null;
}

const FOLLOW_UPS_SHOWN = 15;

function followUpCard(it: LeadFollowUpItem, ownerName?: string | null): string {
  const name = clip(oneLine(it.leadName), 80) || "A lead";
  const first = clip(firstName(name), 20);
  const phone = clip(oneLine(it.phone), 40);
  const email = validEmail(it.email);
  const company = clip(oneLine(it.company), 60);
  const noteText = clip(String(it.note ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim(), 400);
  const asked = clip(oneLine(it.message), 160);
  const stage = stageOf(it.status);
  const initial = (first.charAt(0) || "?").toUpperCase();

  const sub = [company ? esc(company) : "", phone ? esc(showPhone(phone)) : "", email ? esc(email) : ""].filter(Boolean).join(" &nbsp;&middot;&nbsp; ");
  const pills = actionPills([
    { label: "Call", href: telLink(phone), tone: "dark" },
    { label: "WhatsApp", href: waLink(phone, followUpHello(name, ownerName)), tone: "whatsapp" },
    { label: "Email", href: email ? mailtoLink(email, "Following up on your enquiry") : null, tone: "light" },
  ]);

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px"><tr>
    <td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid ${BRAND.line};border-left:4px solid ${TONE.amber.solid};border-radius:14px;padding:16px 18px ${pills ? 8 : 14}px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="48" valign="top" style="width:48px;min-width:48px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td width="38" height="38" align="center" valign="middle" bgcolor="${BRAND.navy}" style="width:38px;height:38px;border-radius:50%;font-family:${FONT};font-size:16px;font-weight:800;color:${BRAND.gold}">${esc(initial)}</td>
          </tr></table>
        </td>
        <td valign="top">
          <div style="font-family:${FONT};font-size:16px;font-weight:800;color:${BRAND.ink};line-height:1.3;word-break:break-word">${esc(name)}</div>
          ${sub ? `<div style="font-family:${FONT};font-size:12.5px;line-height:1.5;color:${BRAND.sub};padding-top:2px;word-break:break-word">${sub}</div>` : ""}
        </td>
        ${stage ? `<td valign="top" align="right" style="padding-left:10px">${pill(stage.label, stage.tone)}</td>` : ""}
      </tr></table>
      ${asked ? `<div style="font-family:${FONT};font-size:13px;line-height:1.55;color:${BRAND.body};padding-top:10px;word-break:break-word"><span style="color:${BRAND.sub}">They asked:</span> “${esc(asked)}”</div>` : ""}
      ${noteText ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 0"><tr>
        <td bgcolor="${BRAND.goldTint}" style="background:${BRAND.goldTint};border:1px solid ${BRAND.goldLine};border-radius:10px;padding:9px 12px;font-family:${FONT};font-size:13px;line-height:1.55;color:${BRAND.body};word-break:break-word">
          <div style="font-size:10px;font-weight:800;color:${BRAND.goldDark};text-transform:uppercase;letter-spacing:.9px;padding-bottom:2px">Your note</div>
          ${esc(noteText).replace(/\n/g, "<br>")}
        </td></tr></table>` : ""}
      <div style="padding-top:12px">${pills || `<div style="font-family:${FONT};font-size:12.5px;color:${BRAND.sub};padding-bottom:6px">No phone number or email saved on this lead.</div>`}</div>
    </td>
  </tr></table>`;
}

export function leadFollowUpsDueEmail(o: LeadFollowUpsInput): Email {
  const items = (o.items || []).filter(Boolean);
  const shown = items.slice(0, FOLLOW_UPS_SHOWN);
  const totalIn = Number(o.total);
  const total = Math.max(Number.isFinite(totalIn) ? Math.floor(totalIn) : 0, items.length);
  const more = total - shown.length;
  const day = okDate(o.date) || new Date();

  const fulls = shown.map((i) => clip(oneLine(i.leadName), 60) || "a lead");
  const firsts = shown.map((i) => clip(firstName(oneLine(i.leadName)), 20) || "a lead");
  const names =
    total === 1 && fulls[0] ? fulls[0]
    : total === 2 && firsts.length >= 2 ? `${firsts[0]} and ${firsts[1]}`
    : total >= 3 && firsts.length >= 2 ? `${firsts[0]}, ${firsts[1]} and ${total - 2} more`
    : `${total} lead${total === 1 ? "" : "s"}`;
  const namesKnown = (total === 1 && !!fulls[0]) || firsts.length >= 2;

  const title = total === 0 ? "No follow-ups due today" : `Time to follow up with ${names}`;

  // Stage counts as hero chips, only when every due lead is listed (so they add up).
  const counts = new Map<string, number>();
  if (shown.length === total) for (const i of shown) { const s = stageOf(i.status); if (s) counts.set(s.label, (counts.get(s.label) || 0) + 1); }
  const chips = [darkChip(esc(dayIst(day))), ...[...counts].map(([l, n]) => darkChip(`${n} ${esc(l)}`))];

  const bodyHtml =
    hi(o.ownerName) +
    (total === 0
      ? p("You have no follow-ups due today. Leads you give a follow-up date will show up here on the day.")
      : p(`You asked to be reminded about ${total === 1 ? "this lead" : "these leads"} today. Wherever you saved a number, you can call or WhatsApp in one tap, straight from your phone.`)) +
    (shown.length ? sectionLabel("Due today") + shown.map((i) => followUpCard(i, o.ownerName)).join("") : "") +
    (more > 0 ? p(`<span style="font-size:14px">+ ${more} more due today. ${goldLink(LEADS_URL, "See them all in your leads →")}</span>`) : "") +
    button(total === 0 ? "Open your leads" : "Open today's follow-ups", LEADS_URL) +
    note(`<strong style="color:${BRAND.ink}">After each call,</strong> update the lead's stage or pick a new follow-up date, so tomorrow's list stays accurate.`) +
    helpStrip();

  const text = [
    `Hi ${firstName(o.ownerName) || "there"},`,
    "",
    total === 0
      ? "You have no follow-ups due today."
      : `You have ${total} follow-up${total === 1 ? "" : "s"} due today (${dayIst(day)}):`,
    ...shown.flatMap((i) => {
      const n = clip(oneLine(i.leadName), 80) || "A lead";
      const ph = clip(oneLine(i.phone), 40);
      const em = validEmail(i.email);
      const s = stageOf(i.status);
      const wa = waLink(ph, followUpHello(n, o.ownerName));
      const nt = clip(oneLine(i.note), 200);
      return [
        "",
        `- ${n}${oneLine(i.company) ? `, ${clip(oneLine(i.company), 60)}` : ""}${s ? ` (${s.label})` : ""}`,
        ...(ph ? [`  Phone: ${showPhone(ph)}`] : []),
        ...(wa ? [`  WhatsApp: ${wa}`] : []),
        ...(em ? [`  Email: ${em}`] : []),
        ...(oneLine(i.message) ? [`  They asked: ${clip(oneLine(i.message), 160)}`] : []),
        ...(nt ? [`  Your note: ${nt}`] : []),
      ];
    }),
    ...(more > 0 ? ["", `+ ${more} more due today.`] : []),
    "",
    `Open your leads: ${LEADS_URL}`,
    "After each call, update the lead's stage or pick a new follow-up date, so tomorrow's list stays accurate.",
    "",
    `Need a hand? Reply to this email or WhatsApp us: https://wa.me/${SUPPORT_WHATSAPP.wa}`,
    "— Team DigitalCarda",
  ].join("\n");

  return {
    kind: "leadFollowUpsDueEmail",
    subject: total === 0
      ? "No follow-ups due today"
      : total === 1 && fulls[0] ? `Follow up with ${fulls[0]} today` : `${total} follow-up${total === 1 ? "" : "s"} due today${namesKnown ? ` — ${names}` : ""}`,
    html: layout({
      preheader: total === 0
        ? "Nothing due today. Leads you give a follow-up date will show up here."
        : "Call or WhatsApp them in one tap, straight from this email.",
      hero: heroBand({
        eyebrow: "Follow-ups",
        tone: "amber",
        title,
        sub: total === 0 ? undefined : "You set these reminders on your leads. A quick call or WhatsApp today keeps each conversation warm.",
        aside: { label: "Due today", value: String(total) },
        chips,
      }),
      bodyHtml,
      accent: TONE.amber.solid,
      audience: "customer",
    }),
    text,
  };
}

/* ── Platform inbox: oversight copies of every lead ────────────────────── */

/**
 * Audience: ADMIN (the DigitalCarda platform inbox, ownerAddress()).
 * Trigger: sendLeadNotification in api/lib/mail.ts for every non-spam enquiry
 * on any card: leadNotificationEmail for "normal" (and when classification
 * fails), hotLeadEmail for "important". Reply-To is currently the visitor.
 *
 * The first six fields are the existing contract (mail.ts LeadEmail). The rest
 * are optional additions the wiring phase can pass.
 */
export interface LeadAlertInput {
  name: string;
  email?: string | null;
  contact?: string | null;
  message?: string | null;
  /** On /api/enquiry this is whatever the form posted, so it may match no card. */
  slug?: string | null;
  cardName?: string | null;
  /** When the enquiry arrived (defaults to now). */
  at?: Date | null;
  /** The card's owner, when the caller resolved one: shows whose customer this is,
      and on a hot lead offers a one-tap nudge to them. */
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  /** true / false once the owner's own copy (newLeadOwnerEmail) was sent or not; unset = unknown, not shown. */
  ownerNotified?: boolean;
  /** LeadVerdict.reasons from classifyLeadSmart. */
  reasons?: string[] | null;
}

function adminLeadAlert(o: LeadAlertInput, hot: boolean): { subject: string; html: string; text: string } {
  const name = clip(oneLine(o.name), 80) || "Someone";
  const cardName = clip(oneLine(o.cardName), 60);
  const slug = clip(oneLine(o.slug), 60);
  const cardUrl = cardUrlOf(o.slug);
  const label = cardName || (slug ? `digitalcarda.in/${slug}` : "a DigitalCarda card");
  const at = okDate(o.at) || new Date();
  const phone = clip(oneLine(o.contact), 40);
  const emailTyped = clip(oneLine(o.email), 120);
  const email = validEmail(o.email);
  const msg = messageText(o.message);
  const owner = clip(oneLine(o.ownerName), 80);
  const ownerEmail = validEmail(o.ownerEmail);
  const ownerPhone = clip(oneLine(o.ownerPhone), 40);
  const reasons = (o.reasons || []).map((x) => clip(oneLine(x), 60)).filter(Boolean).slice(0, 4);
  const tone: Tone = hot ? "red" : "green";

  const nudge = `Hi ${clip(firstName(owner), 30) || "there"}, this is Team DigitalCarda. ${name} just sent an enquiry on your card that looks promising. You'll find it in your leads: ${LEADS_URL}`;
  const nudgePills = actionPills([
    { label: `WhatsApp ${clip(firstName(owner), 20) || "the owner"}`, href: waLink(ownerPhone, nudge), tone: "whatsapp" },
    { label: "Email the owner", href: ownerEmail ? mailtoLink(ownerEmail, `A new enquiry on your card from ${name}`) : null, tone: "light" },
  ]);

  const ownerCell = owner || ownerEmail || ownerPhone
    ? [owner ? esc(owner) : "", ownerEmail ? emailLink(ownerEmail) : "", ownerPhone ? phoneLink(ownerPhone) : ""].filter(Boolean).join("<br>")
    : null;

  const bodyHtml =
    p(`${strong(name)} sent an enquiry through ${cardUrl ? inkLink(cardUrl, label) : esc(label)}${owner ? `, ${esc(owner)}'s card` : ""}.`) +
    (msg ? quoteBlock(msg, name) : note("They left no message — only their contact details.")) +
    (hot
      ? callout("red", "Marked high-intent",
          `The lead check flagged this one${reasons.length ? `: ${esc(reasons.join(" · "))}` : ""}.`
          + (nudgePills ? ` If ${owner ? esc(firstName(owner)) : "the owner"} hasn't replied yet, a quick nudge takes a second.` : ""),
          nudgePills)
      : "") +
    sectionLabel("Lead details") +
    infoGrid([
      ["Visitor", esc(name)],
      ["Phone", phone ? phoneLink(phone) : null],
      ["Email", email ? emailLink(email) : emailTyped ? esc(emailTyped) : null],
      ["Card", cardUrl ? inkLink(cardUrl, label) : esc(label)],
      ["Card owner", ownerCell],
      ["Received", esc(whenIst(at))],
      ["Lead check", `${pill(hot ? "High intent" : "Normal", tone)}${!hot && reasons.length ? ` <span style="font-size:12.5px;color:${BRAND.sub}">${esc(reasons.join(" · "))}</span>` : ""}`],
      ["Owner emailed", o.ownerNotified === undefined ? null : o.ownerNotified ? "Yes — they have their own copy" : "No — only this platform copy went out"],
    ]) +
    `<div style="margin:22px 0 0">${actionPills([
      { label: "All leads", href: ADMIN_LEADS_URL, tone: "dark" },
      { label: "Open the card", href: cardUrl, tone: "light" },
    ])}</div>` +
    small("The platform inbox gets a copy of every non-spam enquiry on every card, for oversight.");

  const subject = `${hot ? "🔥 Hot lead" : "New lead"} on ${clip(label, 40)}: ${clip(name, 50)}`;
  const preheader = msg
    ? `${name}: “${clip(oneLine(msg), 110)}”`
    : `${name} left ${phone ? "a phone number" : email ? "an email address" : "only a name"}, no message.`;

  const text = [
    `${hot ? "HOT LEAD" : "New lead"} on ${label}`,
    "",
    `${name} sent an enquiry (${whenIst(at)}).`,
    ...(msg ? ["", "Message:", msg] : ["", "No message, only contact details."]),
    "",
    ...(phone ? [`Phone: ${showPhone(phone)}`] : []),
    ...(emailTyped ? [`Email: ${emailTyped}`] : []),
    `Card: ${cardUrl || label}`,
    ...(owner || ownerEmail || ownerPhone ? [`Card owner: ${[owner, ownerEmail, ownerPhone ? showPhone(ownerPhone) : ""].filter(Boolean).join(", ")}`] : []),
    `Lead check: ${hot ? "High intent" : "Normal"}${reasons.length ? ` (${reasons.join(", ")})` : ""}`,
    ...(o.ownerNotified === undefined ? [] : [`Owner emailed: ${o.ownerNotified ? "yes" : "no"}`]),
    "",
    `All leads: ${ADMIN_LEADS_URL}`,
  ].join("\n");

  return {
    subject,
    html: layout({
      preheader,
      hero: heroPerson({
        eyebrow: hot ? "Hot lead" : "New lead",
        tone,
        when: at,
        name,
        sub: `on ${label}`,
        chips: [
          phone ? darkChip(esc(showPhone(phone))) : "",
          emailTyped ? darkChip(esc(clip(emailTyped, 40))) : "",
          darkChip(hot ? "High intent" : "Normal priority", hot ? BRAND.gold : undefined),
        ].filter(Boolean),
      }),
      bodyHtml,
      accent: TONE[tone].solid,
      audience: "admin",
    }),
    text,
  };
}

/** Platform-inbox copy of a normal lead. See LeadAlertInput. Kind: leadNotificationEmail. */
export function leadNotificationEmail(o: LeadAlertInput): Email {
  return { kind: "leadNotificationEmail", ...adminLeadAlert(o, false) };
}

/** Platform-inbox copy of a lead the lead check marked "important". See LeadAlertInput. Kind: hotLeadEmail. */
export function hotLeadEmail(o: LeadAlertInput): Email {
  return { kind: "hotLeadEmail", ...adminLeadAlert(o, true) };
}
