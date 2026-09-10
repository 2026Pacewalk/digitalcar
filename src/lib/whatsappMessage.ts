/* WhatsApp message templates, filled in from the customer's card.
 *
 * WHATSAPP IS PLAIN TEXT. There is no HTML, no colour, no images inside the
 * message body — only WhatsApp's own lightweight markup:
 *
 *     *bold*      _italic_      ~strikethrough~      ```monospace```
 *
 * So everything here builds a plain string. A few consequences worth knowing:
 *
 *  · Emoji do the work that colour and icons do elsewhere. Used sparingly they
 *    make a long message scannable on a phone; overused they read as spam.
 *  · A bare URL auto-links, and WhatsApp shows a link preview for the FIRST
 *    one. The card link therefore goes early, so it is the link that previews.
 *  · Never wrap a URL in *bold* — the asterisks become part of the tapped link
 *    in some clients and the link breaks.
 *  · Blank lines are the only spacing tool. WhatsApp collapses three or more
 *    newlines, so paragraphs are separated by exactly one blank line.
 *
 * Every template is a starting point: the page lets the customer edit the text
 * before copying, which is the whole point — their words, their tone.
 */

export type WaData = {
  name: string;
  designation: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  cardUrl: string;
  mapUrl: string;
  reviewUrl: string;
  upi: string;
};

export type WaTemplate = {
  id: string;
  name: string;
  blurb: string;
  /** Where it goes in WhatsApp Business — shown as a hint on the page. */
  slot: "Greeting message" | "Away message" | "Quick reply" | "Any chat";
  build: (d: WaData) => string;
};

/* WhatsApp Business caps the greeting and away messages. The exact ceiling has
   moved between app versions, so the page warns rather than truncates — a
   silently cut message is worse than a long one. */
export const WA_SOFT_LIMIT = 1000;

/** Drop empty lines left behind by a card field the customer hasn't filled in,
    and collapse the runs of blank lines that leaves. */
function tidy(s: string): string {
  return s
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The company if there is one, else the person. Never an empty greeting. */
const who = (d: WaData) => d.company || d.name || "us";

/** The same, emphasised — but only when it is a real name. Bolding the "us"
    fallback draws the eye to the one word that says nothing. */
const whoBold = (d: WaData) => (d.company || d.name ? `*${who(d)}*` : "us");

/** A full stop, unless the text already ends in one. Plenty of Indian company
    names end in "Pvt. Ltd." and the naive version produced "Pvt. Ltd.*.". */
const dot = (s: string) => (/[.!?]$/.test(s.trim()) ? "" : ".");

/* A signature block most templates end with. Kept short: on a phone, the
   message should end with the action, not a wall of contact details. */
const signOff = (d: WaData) => tidy(`
${d.name ? `— ${d.name}${d.designation ? `, ${d.designation}` : ""}` : ""}
${d.company && d.name ? d.company : ""}`);

export const WA_TEMPLATES: WaTemplate[] = [
  {
    id: "welcome",
    name: "Welcome",
    blurb: "The first reply anyone gets. Warm, short, with your card link.",
    slot: "Greeting message",
    build: (d) => tidy(`
Hello! 👋 Thanks for reaching out to ${whoBold(d)}${dot(who(d))}

We've received your message and will reply shortly.

Meanwhile, here's everything about us in one link — services, photos, contact details and directions:
${d.cardUrl}

${signOff(d)}`),
  },
  {
    id: "welcome-short",
    name: "Welcome (short)",
    blurb: "Two lines. Best when you reply fast anyway.",
    slot: "Greeting message",
    build: (d) => tidy(`
Hi! 👋 Thanks for messaging ${whoBold(d)}${dot(who(d))} We'll get back to you shortly.

Everything about us, in one link: ${d.cardUrl}`),
  },
  {
    id: "away",
    name: "Away / after hours",
    blurb: "Sets expectations when you can't reply right now.",
    slot: "Away message",
    build: (d) => tidy(`
Thanks for your message! 🙏

We're away right now and will reply as soon as we're back.

If it's urgent, call us on ${d.phone || "our number"}.

In the meantime you can browse our services, photos and prices here:
${d.cardUrl}

${signOff(d)}`),
  },
  {
    id: "hours",
    name: "Business hours",
    blurb: "When you open and close, plus where to find you.",
    slot: "Away message",
    build: (d) => tidy(`
Hello! 👋 Thanks for contacting ${whoBold(d)}${dot(who(d))}

🕘 *Our hours*
Monday – Saturday: 10:00 am – 7:00 pm
Sunday: Closed

We'll reply during working hours. For anything urgent, call ${d.phone || "us"}.

${d.address ? `📍 ${d.address}` : ""}
${d.mapUrl ? `Directions: ${d.mapUrl}` : ""}

More about us: ${d.cardUrl}`),
  },
  {
    id: "catalogue",
    name: "Services / catalogue",
    blurb: "Send when someone asks what you offer.",
    slot: "Quick reply",
    build: (d) => tidy(`
Happy to help! 😊

Here's our full list of services and prices, with photos of recent work:
${d.cardUrl}

Tell me which one you're interested in and I'll share the details.

${signOff(d)}`),
  },
  {
    id: "enquiry",
    name: "Enquiry received",
    blurb: "Acknowledge an enquiry so nobody is left wondering.",
    slot: "Quick reply",
    build: (d) => tidy(`
Thank you for your enquiry! ✅

We've noted your requirement and someone from our team will call you shortly on this number.

To help us prepare, could you share:
1️⃣ What exactly you need
2️⃣ Your location
3️⃣ When you need it by

Our full profile: ${d.cardUrl}

${signOff(d)}`),
  },
  {
    id: "appointment",
    name: "Appointment / visit",
    blurb: "Confirm a booking and give directions.",
    slot: "Quick reply",
    build: (d) => tidy(`
Your appointment is confirmed ✅

📅 Date: _(fill in)_
🕒 Time: _(fill in)_

${d.address ? `📍 *Where*\n${d.address}` : ""}
${d.mapUrl ? `Directions: ${d.mapUrl}` : ""}

Please reply here if you need to reschedule.

${signOff(d)}`),
  },
  {
    id: "payment",
    name: "Payment details",
    blurb: "Share how to pay, without retyping it every time.",
    slot: "Quick reply",
    build: (d) => tidy(`
Thanks for confirming your order! 🙏

*Payment details*
${d.upi ? `UPI: ${d.upi}` : "UPI: _(fill in)_"}
Amount: _(fill in)_

Please send a screenshot once you've paid and we'll confirm straight away.

${d.cardUrl ? `You can also pay from our card: ${d.cardUrl}` : ""}

${signOff(d)}`),
  },
  {
    id: "thanks",
    name: "Thank you + review",
    blurb: "After the job is done — the best moment to ask for a review.",
    slot: "Quick reply",
    build: (d) => tidy(`
Thank you for choosing ${whoBold(d)}! 🙏

It was a pleasure working with you. If you were happy with our service, a quick Google review would mean a lot to us:
${d.reviewUrl || "_(add your Google review link on the Reviews page)_"}

And do save our card so you have our details whenever you need them:
${d.cardUrl}

${signOff(d)}`),
  },
  {
    id: "offer",
    name: "Offer / promotion",
    blurb: "Announce a deal. Keep it to one offer and one deadline.",
    slot: "Any chat",
    build: (d) => tidy(`
🎉 *Special offer from ${who(d)}*

_(Describe the offer in one line — e.g. 20% off all services this month.)_

⏳ Valid till: _(date)_

Reply *YES* and we'll reserve it for you.

See everything we offer: ${d.cardUrl}

${signOff(d)}`),
  },
  {
    id: "introduction",
    name: "Cold introduction",
    blurb: "For reaching out to someone new. Asks permission, doesn't pitch.",
    slot: "Any chat",
    build: (d) => tidy(`
Hello! I'm ${d.name || "reaching out"}${d.designation ? `, ${d.designation}` : ""}${d.company ? ` at *${d.company}*` : ""}${dot(d.company || d.designation || d.name || "x")}

${d.company ? `We help businesses with _(one line on what you do)_.` : "_(One line on what you do.)_"}

Here's my digital card so you can see our work and reach me easily:
${d.cardUrl}

Would it be alright if I shared a few details?`),
  },
  {
    id: "save-contact",
    name: "Save my details",
    blurb: "Ask someone to save your card — the reason you have one.",
    slot: "Any chat",
    build: (d) => tidy(`
Great speaking with you! 😊

Here's my digital card — one tap saves my number, email and address straight to your phone:
${d.cardUrl}

${d.website ? `Website: ${d.website}` : ""}
${d.email ? `Email: ${d.email}` : ""}

${signOff(d)}`),
  },
];

export function buildWaMessage(id: string, d: WaData): string {
  const t = WA_TEMPLATES.find((x) => x.id === id) || WA_TEMPLATES[0];
  return t.build(d);
}

/* Render WhatsApp's markup the way WhatsApp renders it, for an on-screen
   preview bubble. Lives here rather than in the page so the dev preview and
   the real dashboard cannot drift apart.

   Escape FIRST: the text is the customer's own words, but it ends up in
   innerHTML. The delimiters need a boundary on each side, or a phone number
   like 98110_24680 would turn half the message italic. */
export function waPreviewHtml(text: string): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  return esc(text)
    .replace(/```([\s\S]+?)```/g, '<code style="font-family:monospace;background:#00000010;padding:1px 3px;border-radius:3px;">$1</code>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,!?)]|$)/g, "$1<strong>$2</strong>")
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,!?)]|$)/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])~([^~\n]+)~(?=[\s.,!?)]|$)/g, "$1<s>$2</s>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#027eb5;" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\n/g, "<br />");
}
