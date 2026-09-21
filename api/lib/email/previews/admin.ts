/*
 * Preview fixtures for the owner-alert emails (api/lib/email/admin.ts).
 * Fictional people and businesses only — never real customer data.
 */
import type { Email } from "../kit";
import {
  newSignupAdminEmail, referralSignupAdminEmail, paymentToVerifyAdminEmail, payoutRequestAdminEmail,
  resellerApplicationAdminEmail, contactEnquiryAdminEmail, accountDeletionRequestAdminEmail, bulkOrderAdminEmail,
  onlineSaleAdminEmail, paymentSettingsChangedAdminEmail, ownerDailyDigestEmail,
} from "../admin";

type Preview = {
  name: string; module: string;
  audience: "customer" | "admin" | "visitor" | "reseller" | "prospect";
  variant?: string;
  render: () => Email;
};

const M = "admin";
const AT = new Date("2026-09-21T09:12:00+05:30");
const days = (n: number) => new Date(AT.getTime() + n * 86_400_000);
/** Proves escaping: every field that takes user text gets this in one preview. */
const HOSTILE = `Aarav <b>Mehta</b> & "Sons" 'Ltd' <script>alert(1)</script>`;

export const previews: Preview[] = [
  /* ── New signup ── */
  {
    name: "newSignupAdminEmail", module: M, audience: "admin", variant: "google-full",
    render: () => newSignupAdminEmail({
      id: 1042, name: "Aarav Mehta", email: "aarav.mehta@example.com", phone: "+91 90000 01234",
      method: "google", emailVerified: true, business: "Mehta Interiors",
      slug: "pacewalk", trial: { days: 30, endsAt: days(30), voucher: "DIWALI30" },
      template: {
        name: "Bloom Profile",
        image: "https://digitalcarda.in/products/bloom-profile/bloom-profile-digital-business-card.png",
        url: "https://digitalcarda.in/digital-business-cards-templates/bloom-profile",
      },
      colour: "#E11D48", aiDraft: true, referral: { name: "Priya Sharma", code: "PRIYA15" },
      place: "Pune, Maharashtra", device: "Chrome on Android", page: "/signup?product=bloom-profile-card",
      counts: { today: 4, month: 57, total: 1310 }, at: AT,
    }),
  },
  {
    name: "newSignupAdminEmail", module: M, audience: "admin", variant: "email-minimal",
    render: () => newSignupAdminEmail({
      id: 1043, name: "Kavya Iyer", email: "kavya.iyer@example.com", method: "email", emailVerified: false, at: AT,
    }),
  },
  {
    name: "newSignupAdminEmail", module: M, audience: "admin", variant: "hostile",
    render: () => newSignupAdminEmail({
      id: 1044, name: HOSTILE, email: `x"><img src=x onerror=alert(1)>@example.com`, phone: "+91 90000 06666",
      photo: "javascript:alert(1)", method: "email", emailVerified: false, business: HOSTILE, slug: `pacewalk"><b>`,
      template: { name: HOSTILE, image: "javascript:alert(1)", url: `https://example.com/"><script>` },
      colour: `red;background:url(javascript:alert(1))`, referral: { name: HOSTILE, code: `<i>CODE</i>` },
      place: HOSTILE, device: HOSTILE, page: `/signup?x=<script>alert(1)</script>`, at: AT,
    }),
  },

  /* ── Referral signup ── */
  {
    name: "referralSignupAdminEmail", module: M, audience: "admin", variant: "with-rates",
    render: () => referralSignupAdminEmail({
      newUserName: "Rohan Verma", newUserEmail: "rohan.verma@example.com",
      referrerName: "Priya Sharma", referrerEmail: "priya.sharma@example.com", code: "priya-sharma",
      rewardPercent: 15, discountPercent: 15, at: AT,
    }),
  },
  {
    name: "referralSignupAdminEmail", module: M, audience: "admin", variant: "as-called-today",
    render: () => referralSignupAdminEmail({ newUserName: "Rohan Verma", newUserEmail: "rohan.verma@example.com", referrerName: "Priya Sharma", code: "DC7F3K2" }),
  },

  /* ── Manual payment to verify ── */
  {
    name: "paymentToVerifyAdminEmail", module: M, audience: "admin", variant: "upi-coupon",
    render: () => paymentToVerifyAdminEmail({
      name: "Aarav Mehta", email: "aarav.mehta@example.com", phone: "+91 90000 01234", planName: "Gold",
      billingCycle: "yearly", amount: 2699, reference: "UTR 426512345678", method: "upi",
      coupon: { code: "WELCOME10", discount: 300 }, orderId: 318, at: AT,
    }),
  },
  {
    name: "paymentToVerifyAdminEmail", module: M, audience: "admin", variant: "bank-as-called-today",
    render: () => paymentToVerifyAdminEmail({
      name: "Sneha Kulkarni", email: "sneha.k@example.com", planName: "Platinum", amount: 4999, reference: "NEFT-DEMO-88213", method: "bank",
    }),
  },

  /* ── Payout request ── */
  {
    name: "payoutRequestAdminEmail", module: M, audience: "admin", variant: "upi",
    render: () => payoutRequestAdminEmail({
      name: "Priya Sharma", email: "priya.sharma@example.com", phone: "+91 90000 02345", amount: 1250, method: "upi",
      destination: "priya.sharma@okdemo", accountName: "Priya Sharma", balanceAfter: 180, requestId: 27, at: AT,
    }),
  },
  {
    name: "payoutRequestAdminEmail", module: M, audience: "admin", variant: "bank",
    render: () => payoutRequestAdminEmail({
      name: "Vikram Singh", email: "vikram.singh@example.com", amount: 3400, method: "bank",
      destination: "000011112222", accountName: "Vikram Singh", ifsc: "DEMO0001234",
    }),
  },

  /* ── Reseller application ── */
  {
    name: "resellerApplicationAdminEmail", module: M, audience: "admin", variant: "with-message",
    render: () => resellerApplicationAdminEmail({
      name: "Neha Joshi", email: "neha@example.com", phone: "+91 90000 03456", companyName: "Joshi Print & Media",
      message: "We run a print shop in Nashik and already sell visiting cards to about 200 shops.\nWe'd like to offer digital cards to them too.",
      at: AT,
    }),
  },
  {
    name: "resellerApplicationAdminEmail", module: M, audience: "admin", variant: "repeat-no-phone",
    render: () => resellerApplicationAdminEmail({ name: "Neha Joshi", email: "neha@example.com", repeat: true, at: AT }),
  },

  /* ── Website contact enquiry ── */
  {
    name: "contactEnquiryAdminEmail", module: M, audience: "admin", variant: "stored",
    render: () => contactEnquiryAdminEmail({
      name: "Rahul Nair", email: "rahul.nair@example.com", phone: "+91 90000 04567", businessName: "Nair Associates",
      requirement: "Bulk Cards for a Team", message: "We are a team of 35 chartered accountants in Kochi.\nCan you share pricing for everyone, with our logo?",
      stored: true, at: AT,
    }),
  },
  {
    name: "contactEnquiryAdminEmail", module: M, audience: "admin", variant: "not-stored-no-message",
    render: () => contactEnquiryAdminEmail({ name: "Ananya Rao", email: "ananya.rao@example.com", requirement: "Custom Domain", userId: 1043, stored: false, at: AT }),
  },
  {
    name: "contactEnquiryAdminEmail", module: M, audience: "admin", variant: "hostile",
    render: () => contactEnquiryAdminEmail({
      name: HOSTILE, email: `"><script>alert(1)</script>@example.com`, phone: `<b>+91 90000 05678</b>`, businessName: HOSTILE,
      requirement: HOSTILE, message: `Hello <img src=x onerror=alert(1)> & "quotes" 'single'\n<a href="javascript:alert(1)">click</a>`,
      stored: true, at: AT,
    }),
  },

  /* ── Account deletion requested ── */
  {
    name: "accountDeletionRequestAdminEmail", module: M, audience: "admin", variant: "app-with-reason",
    render: () => accountDeletionRequestAdminEmail({
      userId: 1031, name: "Kabir Malhotra", email: "kabir.m@example.com", source: "app",
      reason: "Closing my shop at the end of the month. Thank you for the service.", scheduledFor: days(30), at: AT,
    }),
  },
  {
    name: "accountDeletionRequestAdminEmail", module: M, audience: "admin", variant: "web-no-reason",
    render: () => accountDeletionRequestAdminEmail({ userId: 1032, name: "Meera Pillai", email: "meera.p@example.com", source: "web", scheduledFor: days(30), at: AT }),
  },

  /* ── Bulk-card request ── */
  {
    name: "bulkOrderAdminEmail", module: M, audience: "admin", variant: "priced",
    render: () => bulkOrderAdminEmail({
      company: "Mehta Interiors", contactName: "Aarav Mehta", phone: "+91 90000 01234", email: "aarav.mehta@example.com",
      quantity: 50, pricePerCard: 399, totalEstimate: 19950, packageName: "Team 50",
      note: "Need them before our Diwali client meet. Can the cards carry our logo on the back?", userId: 1042, at: AT,
    }),
  },
  {
    name: "bulkOrderAdminEmail", module: M, audience: "admin", variant: "custom-quote-guest",
    render: () => bulkOrderAdminEmail({ company: "Sharma Motors", phone: "+91 90000 07890", quantity: 240, at: AT }),
  },
  {
    name: "bulkOrderAdminEmail", module: M, audience: "admin", variant: "hostile",
    render: () => bulkOrderAdminEmail({
      company: HOSTILE, contactName: HOSTILE, phone: `<img src=x onerror=alert(1)>`, email: `not-an-email"><script>alert(1)</script>`,
      quantity: 10, pricePerCard: 450, totalEstimate: 4500, packageName: `<marquee>Team</marquee>`,
      note: `</td></tr></table><h1>Injected</h1><script>alert(1)</script>`, at: AT,
    }),
  },

  /* ── Online sale ── */
  {
    name: "onlineSaleAdminEmail", module: M, audience: "admin", variant: "plan-coupon-referral",
    render: () => onlineSaleAdminEmail({
      kind: "plan", itemName: "Gold", cycle: "yearly", amount: 2699, paymentId: "pay_DEMO123", coupon: "WELCOME10", discount: 300,
      customer: { id: 1042, name: "Aarav Mehta", email: "aarav.mehta@example.com", phone: "+91 90000 01234" },
      referrer: { name: "Priya Sharma", reward: 405 }, reseller: { name: "Joshi Print & Media", commission: 270 },
      validTill: days(365), at: AT,
    }),
  },
  {
    name: "onlineSaleAdminEmail", module: M, audience: "admin", variant: "addon",
    render: () => onlineSaleAdminEmail({
      kind: "addon", itemName: "ID Card add-on", cycle: "monthly", amount: 25, paymentId: "pay_DEMO124",
      customer: { id: 1050, name: "Ishaan Gupta", email: "ishaan.g@example.com" }, validTill: days(30), at: AT,
    }),
  },
  {
    name: "onlineSaleAdminEmail", module: M, audience: "admin", variant: "domain",
    render: () => onlineSaleAdminEmail({
      kind: "domain", itemName: "Custom Domain", amount: 499, paymentId: "pay_DEMO125",
      customer: { id: 1051, name: "Diya Menon", email: "diya.menon@example.com", phone: "+91 90000 08901" }, referrer: { name: "Rohan Verma" }, at: AT,
    }),
  },
  {
    name: "onlineSaleAdminEmail", module: M, audience: "admin", variant: "test-mode",
    render: () => onlineSaleAdminEmail({
      kind: "plan", itemName: "Silver", cycle: "monthly", amount: 199, paymentId: "pay_DEMO126", testMode: true,
      customer: { id: 1, name: "Test Admin", email: "test@example.com" }, at: AT,
    }),
  },

  /* ── Payment settings changed ── */
  {
    name: "paymentSettingsChangedAdminEmail", module: M, audience: "admin", variant: "upi-and-bank",
    render: () => paymentSettingsChangedAdminEmail({
      changedKeys: ["pay_upi_id", "pay_upi_qr", "pay_bank_account", "pay_bank_ifsc", "pay_note"],
      who: "Admin (owner@example.com)", ip: "203.0.113.24", place: "Mumbai, Maharashtra", device: "Chrome on Windows", at: AT,
    }),
  },
  {
    name: "paymentSettingsChangedAdminEmail", module: M, audience: "admin", variant: "razorpay-keys",
    render: () => paymentSettingsChangedAdminEmail({ changedKeys: ["keyId", "keySecret", "mode"], at: AT }),
  },
  {
    name: "paymentSettingsChangedAdminEmail", module: M, audience: "admin", variant: "note-only",
    render: () => paymentSettingsChangedAdminEmail({ changedKeys: ["pay_note", "pay_upi_name"], who: "Admin (owner@example.com)", at: AT }),
  },

  /* ── Owner daily digest ── */
  {
    name: "ownerDailyDigestEmail", module: M, audience: "admin", variant: "busy",
    render: () => ownerDailyDigestEmail({
      date: AT,
      signups: { today: 6, week: 38 },
      revenue: { manual: 4999, online: 7396, count: 5 },
      pendingPayments: [
        { name: "Sneha Kulkarni", plan: "Platinum", amount: 4999, ageDays: 0 },
        { name: "Aarav Mehta", plan: "Gold", amount: 2699, ageDays: 3 },
      ],
      payoutsPending: [{ name: "Priya Sharma", amount: 1250, ageDays: 1 }],
      nfcToProduce: [
        { ids: [211, 212], name: "Mehta Interiors", items: "1 × NFC card, 1 × NFC standee" },
        { ids: [215], name: "Kavya Iyer", items: "2 × NFC card" },
      ],
      nfcAwaitingPayment: [{ ids: [219], name: "Rahul Nair", items: "1 × NFC card", amount: 799, ageDays: 2 }],
      bulkRequests: [{ company: "Sharma Motors", quantity: 240, contact: "Vikram Sharma" }],
      deletionsDue: [{ email: "kabir.m@example.com", due: days(-2) }],
      trialsEnding: [
        { name: "Ishaan Gupta", email: "ishaan.g@example.com", phone: "+91 90000 09012", endsOn: days(1) },
        { name: "Diya Menon", email: "diya.menon@example.com", endsOn: days(3) },
      ],
      trialsEnded: [],
      plansExpiring: [{ name: "Neha Joshi", plan: "Gold · yearly", endsOn: days(6), email: "neha@example.com" }],
      failedEmails: 2,
      automation: { enabled: true, sent: 14, abandoned: 2 },
    }),
  },
  {
    name: "ownerDailyDigestEmail", module: M, audience: "admin", variant: "all-clear",
    render: () => ownerDailyDigestEmail({
      date: AT, signups: { today: 2, week: 11 }, revenue: { manual: 0, online: 1999, count: 1 },
      pendingPayments: [], payoutsPending: [], nfcToProduce: [], nfcAwaitingPayment: [], bulkRequests: [],
      deletionsDue: [], trialsEnding: [], trialsEnded: [], plansExpiring: [], failedEmails: 0,
      automation: { enabled: false, sent: 0 },
    }),
  },
  {
    name: "ownerDailyDigestEmail", module: M, audience: "admin", variant: "one-thing",
    render: () => ownerDailyDigestEmail({
      date: AT, signups: { today: 0 },
      pendingPayments: [{ name: "Aarav Mehta", plan: "Gold", amount: 2699, ageDays: 1 }],
      payoutsPending: [], deletionsDue: [], failedEmails: 0,
    }),
  },
  {
    name: "ownerDailyDigestEmail", module: M, audience: "admin", variant: "overflow",
    render: () => {
      const people = ["Aarav Mehta", "Priya Sharma", "Rohan Verma", "Kavya Iyer", "Sneha Kulkarni", "Vikram Singh", "Neha Joshi", "Rahul Nair", "Ananya Rao", "Kabir Malhotra"];
      const mail = (n: string) => `${n.toLowerCase().replace(/\s+/g, ".")}@example.com`;
      const phone = (i: number) => `+91 90000 0${String(1000 + i * 111).slice(-4)}`;
      return ownerDailyDigestEmail({
        date: AT, signups: { today: 12, week: 71 }, revenue: { manual: 15990, online: 24870, count: 14 },
        pendingPayments: people.map((n, i) => ({ name: n, plan: i % 2 ? "Gold" : "Platinum", amount: i % 2 ? 2999 : 4999, ageDays: i })),
        payoutsPending: people.slice(0, 7).map((n, i) => ({ name: n, amount: 500 + i * 250, ageDays: i })),
        nfcToProduce: people.map((n, i) => ({ ids: [300 + i], name: n, items: "1 × NFC card" })),
        nfcAwaitingPayment: people.slice(0, 6).map((n, i) => ({ name: n, items: "1 × NFC standee", amount: 999, ageDays: i })),
        bulkRequests: people.slice(0, 6).map((n, i) => ({ company: `${n.split(" ")[1]} Enterprises`, quantity: 25 * (i + 1), contact: n })),
        deletionsDue: people.slice(0, 6).map((n, i) => ({ email: mail(n), due: days(-i) })),
        trialsEnding: people.map((n, i) => ({ name: n, email: mail(n), phone: phone(i), endsOn: days(1 + (i % 3)) })),
        trialsEnded: people.map((n, i) => ({ name: n, email: mail(n), phone: i % 2 ? phone(i) : null, endedOn: days(-1) })),
        plansExpiring: people.map((n, i) => ({ name: n, plan: "Gold · yearly", endsOn: days(1 + (i % 7)), email: mail(n) })),
        totals: { pendingPayments: 23, trialsEnded: 41 },
        failedEmails: 9,
        automation: { enabled: true, sent: 37 },
      });
    },
  },
];
