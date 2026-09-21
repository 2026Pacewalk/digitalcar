/*
 * Gallery previews for the lead emails. Fictional data only: the names,
 * businesses, @example.com addresses and +91 90000 0xxxx numbers are made up,
 * and "pacewalk" is the owner's own demo card.
 */

import {
  enquiryAutoReplyEmail, hotLeadEmail, leadFollowUpsDueEmail, leadNotificationEmail, newLeadOwnerEmail,
} from "../leads";

const MODULE = "leads";

/** 21 Sept 2026, 3:42 pm IST. */
const AT = new Date("2026-09-21T10:12:00Z");

const MESSAGE =
  "Hi, we're redoing our 3BHK in Baner and need a quote for a modular kitchen and two wardrobes.\n" +
  "Can someone visit this Saturday? Budget is flexible for the right design.";

const HOSTILE_NAME = `Aarav <b>"Bold"</b> & 'Co' <script>alert(1)</script>`;
const HOSTILE_MESSAGE = `Price? <img src=x onerror=alert(1)> </td></tr></table><a href="javascript:alert(1)">click</a> & "quotes" 'too'`;

export const previews: {
  name: string; module: string;
  audience: "customer" | "admin" | "visitor" | "reseller" | "prospect";
  variant?: string;
  render: () => import("../kit").Email;
}[] = [
  /* ── Visitor auto-reply ── */
  {
    name: "enquiryAutoReplyEmail", module: MODULE, audience: "visitor", variant: "full",
    render: () => enquiryAutoReplyEmail({
      visitorName: "Aarav Mehta", message: MESSAGE, business: "Pacewalk Interiors",
      ownerPhone: "+91 90000 01234", ownerEmail: "hello@example.com", whatsapp: "9000001235", slug: "pacewalk",
    }),
  },
  {
    name: "enquiryAutoReplyEmail", module: MODULE, audience: "visitor", variant: "minimal",
    render: () => enquiryAutoReplyEmail({ visitorName: null, message: null, business: "Pacewalk Interiors" }),
  },

  /* ── Card owner: new lead ── */
  {
    name: "newLeadOwnerEmail", module: MODULE, audience: "customer", variant: "normal",
    render: () => newLeadOwnerEmail({
      ownerName: "Rohan Mehta", name: "Priya Sharma", email: "priya.sharma@example.com", contact: "90000 01236",
      message: "Hello, do you also design small office cabins? Please share some photos of past work.",
      slug: "pacewalk", cardName: "Mehta Interiors", at: AT,
    }),
  },
  {
    name: "newLeadOwnerEmail", module: MODULE, audience: "customer", variant: "hot",
    render: () => newLeadOwnerEmail({
      ownerName: "Rohan Mehta", name: "Aarav Mehta", email: "aarav@example.com", contact: "+91 90000 01234",
      company: "Mehta Traders", message: MESSAGE, slug: "pacewalk", cardName: "Mehta Interiors", hot: true, at: AT,
      reasons: ["came from a card", "shows buying intent", "left a phone number"],
    }),
  },
  {
    name: "newLeadOwnerEmail", module: MODULE, audience: "customer", variant: "email-only-no-message",
    render: () => newLeadOwnerEmail({ name: "Neha Iyer", email: "neha.iyer@example.com", slug: "pacewalk" }),
  },
  {
    name: "newLeadOwnerEmail", module: MODULE, audience: "customer", variant: "hostile-input",
    render: () => newLeadOwnerEmail({
      ownerName: `Rohan "<i>" Mehta`, name: HOSTILE_NAME, email: `x"><script>@example.com`, contact: `+91 90000 01234"><script>`,
      company: "</td><td>Co", message: HOSTILE_MESSAGE, slug: `pacewalk"><script>alert(1)</script>`,
      cardName: `Mehta <Interiors> & "Sons"`, hot: true, at: AT, reasons: ["<b>shows buying intent</b>"],
    }),
  },

  /* ── Card owner: follow-ups due ── */
  {
    name: "leadFollowUpsDueEmail", module: MODULE, audience: "customer", variant: "one",
    render: () => leadFollowUpsDueEmail({
      ownerName: "Rohan Mehta", date: AT, total: 1,
      items: [{ leadName: "Aarav Mehta", phone: "+91 90000 01234", email: "aarav@example.com", status: "interested",
        message: "Need a quote for a modular kitchen and two wardrobes.", note: "Wants a site visit on Saturday.\nSend the Baner project photos first." }],
    }),
  },
  {
    name: "leadFollowUpsDueEmail", module: MODULE, audience: "customer", variant: "several-with-overflow",
    render: () => leadFollowUpsDueEmail({
      ownerName: "Rohan Mehta", date: AT, total: 7,
      items: [
        { leadName: "Aarav Mehta", phone: "+91 90000 01234", status: "interested", company: "Mehta Traders", note: "Send the kitchen quote." },
        { leadName: "Priya Sharma", phone: "90000 01236", email: "priya.sharma@example.com", status: "follow_up" },
        { leadName: "Kabir Singh", email: "kabir@example.com", status: "contacted", message: "Do you do office cabins?" },
        { leadName: "Neha Iyer", phone: "090000 01237", status: "new" },
        { leadName: "Farhan Qureshi", status: "follow_up", note: "No number saved: ask on the next visit." },
      ],
    }),
  },
  {
    name: "leadFollowUpsDueEmail", module: MODULE, audience: "customer", variant: "all-listed",
    render: () => leadFollowUpsDueEmail({
      ownerName: null, date: AT,
      items: [
        { leadName: "Aarav Mehta", phone: "+91 90000 01234", status: "interested" },
        { leadName: "Priya Sharma", phone: "90000 01236", status: "interested" },
        { leadName: "Kabir Singh", phone: "90000 01238", status: "new" },
      ],
    }),
  },

  /* ── Platform inbox ── */
  {
    name: "leadNotificationEmail", module: MODULE, audience: "admin", variant: "with-owner",
    render: () => leadNotificationEmail({
      name: "Priya Sharma", email: "priya.sharma@example.com", contact: "90000 01236",
      message: "Hello, do you also design small office cabins?", slug: "pacewalk", cardName: "Mehta Interiors",
      at: AT, ownerName: "Rohan Mehta", ownerEmail: "rohan@example.com", ownerPhone: "90000 01239",
      ownerNotified: true, reasons: ["came from a card", "left a phone number"],
    }),
  },
  {
    name: "leadNotificationEmail", module: MODULE, audience: "admin", variant: "as-called-today",
    render: () => leadNotificationEmail({ name: "Kabir Singh", email: "kabir@example.com", contact: null, message: null, slug: "pacewalk" }),
  },
  {
    name: "hotLeadEmail", module: MODULE, audience: "admin", variant: "with-owner",
    render: () => hotLeadEmail({
      name: "Aarav Mehta", email: "aarav@example.com", contact: "+91 90000 01234", message: MESSAGE,
      slug: "pacewalk", cardName: "Mehta Interiors", at: AT,
      ownerName: "Rohan Mehta", ownerEmail: "rohan@example.com", ownerPhone: "90000 01239", ownerNotified: true,
      reasons: ["came from a card", "shows buying intent", "left a phone number"],
    }),
  },
  {
    name: "hotLeadEmail", module: MODULE, audience: "admin", variant: "unknown-card",
    render: () => hotLeadEmail({ name: "Farhan Qureshi", contact: "90000 01237", message: "Urgent: need 200 cards by Friday, please call me.", slug: "no-such-card-2026" }),
  },
];
