/*
 * Gallery previews for the billing & plans emails. Fictional data only: the one
 * real slug is "pacewalk", the owner's own demo card, whose preview image exists.
 * Razorpay ids are DEMO values; phones/emails are placeholders.
 */
import {
  planUpgradedEmail, paymentSubmittedEmail, paymentVerifiedEmail, paymentRejectedEmail, paymentFailedEmail,
  subscriptionRenewalReminderEmail, subscriptionExpiredEmail, planExtendedEmail,
} from "../billing";

const DAY = 86_400_000;
/** A fixed "now" so most renders are identical: Mon 21 Sept 2026, 3:10 pm IST. */
const NOW = new Date("2026-09-21T09:40:00Z");
const at = (days: number) => new Date(NOW.getTime() + days * DAY);
/** planExtendedEmail decides "had lapsed" against the real clock, so its dates follow it. */
const fromToday = (days: number) => new Date(Date.now() + days * DAY);

const PLATINUM_FEATURES = [
  "Up to 3 digital cards",
  "Unlimited products & services",
  "60-photo gallery + 25 videos",
  "Enquiry form — capture every lead",
  "Remove DigitalCarda branding",
  "AI writes your card content",
  "Full SEO controls",
  "Priority support",
];

export const previews: {
  name: string; module: string;
  audience: "customer" | "admin" | "visitor" | "reseller" | "prospect";
  variant?: string;
  render: () => import("../kit").Email;
}[] = [
  /* ── planUpgradedEmail ── */
  {
    name: "planUpgradedEmail", module: "billing", audience: "customer", variant: "platinum-with-card-and-features",
    render: () => planUpgradedEmail({
      name: "Aarav Mehta", planName: "Platinum", previousPlanName: "Gold", validTill: "2027-09-21",
      billingCycle: "yearly", slug: "pacewalk", features: PLATINUM_FEATURES,
    }),
  },
  {
    name: "planUpgradedEmail", module: "billing", audience: "customer", variant: "as-called-today",
    // What user.setPackage sends now: an ISO day and slug: null.
    render: () => planUpgradedEmail({ name: "Priya Nair", planName: "Gold", validTill: "2027-09-21", slug: null }),
  },
  {
    name: "planUpgradedEmail", module: "billing", audience: "customer", variant: "mislabelled-trial-name",
    // setPackage maps unknown package ids to "Trial"; the email must not claim that.
    render: () => planUpgradedEmail({ name: "Rohan Gupta", planName: "Trial", validTill: "2027-03-21", slug: null }),
  },

  /* ── paymentSubmittedEmail ── */
  {
    name: "paymentSubmittedEmail", module: "billing", audience: "customer", variant: "upi-as-called-today",
    render: () => paymentSubmittedEmail({ name: "Aarav Mehta", planName: "Gold", amount: 999, reference: "426512349876", method: "upi" }),
  },
  {
    name: "paymentSubmittedEmail", module: "billing", audience: "customer", variant: "bank-with-coupon",
    render: () => paymentSubmittedEmail({
      name: "Neha Sharma", planName: "Platinum", amount: 4499, reference: "HDFCN52026092112345", method: "bank",
      billingCycle: "triennial", couponCode: "diwali10", discount: 500, submittedAt: at(0),
    }),
  },

  /* ── paymentVerifiedEmail ── */
  {
    name: "paymentVerifiedEmail", module: "billing", audience: "customer", variant: "online-with-coupon",
    render: () => paymentVerifiedEmail({
      name: "Aarav Mehta", billedTo: "Mehta Interiors", planName: "Gold", amount: 899, billingCycle: "yearly",
      invoiceNo: "DC-00042-2026", validTill: at(365), paidAt: at(0), gateway: "razorpay", method: "upi",
      reference: "pay_DEMO123", listPrice: 999, couponCode: "SAVE100", discount: 100,
    }),
  },
  {
    name: "paymentVerifiedEmail", module: "billing", audience: "customer", variant: "manual-as-called-today",
    // activateVerifiedOrder today: validTill is an en-IN string, no payment details.
    render: () => paymentVerifiedEmail({
      name: "Priya Nair", planName: "Platinum", amount: 1999, billingCycle: "yearly",
      invoiceNo: "DC-00043-2027", validTill: "21 Sept 2027",
    }),
  },
  {
    name: "paymentVerifiedEmail", module: "billing", audience: "customer", variant: "upgrade-credit-manual-upi",
    render: () => paymentVerifiedEmail({
      name: "Rohan Gupta", planName: "Platinum", amount: 1000, billingCycle: "yearly", invoiceNo: "DC-00044-2026",
      validTill: at(365), paidAt: at(0), gateway: "manual", method: "upi", reference: "426598761234", listPrice: 1999,
    }),
  },

  /* ── paymentRejectedEmail ── */
  {
    name: "paymentRejectedEmail", module: "billing", audience: "customer", variant: "with-note-and-details",
    render: () => paymentRejectedEmail({
      name: "Neha Sharma", planName: "Gold", billingCycle: "yearly", amount: 999, method: "upi",
      reference: "426512340000", submittedAt: at(-1), packageId: 5,
      note: "We couldn't find a payment with this UTR in our account.\nThe amount we can see on 20 Sept is ₹99, not ₹999.",
    }),
  },
  {
    name: "paymentRejectedEmail", module: "billing", audience: "customer", variant: "as-called-today-no-note",
    render: () => paymentRejectedEmail({ name: "Aarav Mehta", planName: "Platinum" }),
  },
  {
    name: "paymentRejectedEmail", module: "billing", audience: "customer", variant: "hostile-input",
    render: () => paymentRejectedEmail({
      name: `<b>Aarav</b>&"'`, planName: `Gold <img src=x onerror=alert(1)>`, billingCycle: `yearly"><svg onload=alert(1)>`,
      amount: 999, method: `upi<script>alert(1)</script>`, reference: `UTR"><svg onload=alert(2)>`, packageId: 5,
      note: `<script>alert("x")</script> & 'quotes' "double" <a href="javascript:alert(1)">click</a>`,
    }),
  },

  /* ── paymentFailedEmail ── */
  {
    name: "paymentFailedEmail", module: "billing", audience: "customer", variant: "with-reason-and-coupon",
    render: () => paymentFailedEmail({
      name: "Aarav Mehta", planName: "Gold", amount: 899, billingCycle: "yearly", packageId: 5,
      couponCode: "SAVE100", paymentId: "pay_DEMO123", method: "card", reason: "Payment was declined by the bank.",
    }),
  },
  {
    name: "paymentFailedEmail", module: "billing", audience: "customer", variant: "minimal",
    render: () => paymentFailedEmail({ name: "Priya Nair", planName: "Platinum", amount: 1999 }),
  },

  /* ── subscriptionRenewalReminderEmail ── */
  {
    name: "subscriptionRenewalReminderEmail", module: "billing", audience: "customer", variant: "7-days-with-upgrade-credit",
    render: () => subscriptionRenewalReminderEmail({
      name: "Aarav Mehta", planName: "Gold", daysLeft: 7, validTill: at(7), billingCycle: "yearly",
      slug: "pacewalk", packageId: 5, upgradeCredit: 999, nextPlanName: "Platinum",
    }),
  },
  {
    name: "subscriptionRenewalReminderEmail", module: "billing", audience: "customer", variant: "tomorrow-platinum-3yr",
    render: () => subscriptionRenewalReminderEmail({
      name: "Neha Sharma", planName: "Platinum", daysLeft: 1, validTill: "2026-09-22", billingCycle: "triennial", packageId: 6,
    }),
  },
  {
    name: "subscriptionRenewalReminderEmail", module: "billing", audience: "customer", variant: "minimal-text-date",
    render: () => subscriptionRenewalReminderEmail({ name: "Rohan Gupta", planName: "Gold", daysLeft: 7, validTill: "28 Sept 2026" }),
  },

  /* ── subscriptionExpiredEmail ── */
  {
    name: "subscriptionExpiredEmail", module: "billing", audience: "customer", variant: "gold-with-card",
    render: () => subscriptionExpiredEmail({
      name: "Aarav Mehta", planName: "Gold", expiredOn: at(-1), slug: "pacewalk", packageId: 5, billingCycle: "yearly",
    }),
  },
  {
    name: "subscriptionExpiredEmail", module: "billing", audience: "customer", variant: "platinum-3yr",
    render: () => subscriptionExpiredEmail({
      name: "Neha Sharma", planName: "Platinum", expiredOn: "2026-09-20", packageId: 6, billingCycle: "triennial",
    }),
  },
  {
    name: "subscriptionExpiredEmail", module: "billing", audience: "customer", variant: "minimal",
    render: () => subscriptionExpiredEmail({ name: "Rohan Gupta", planName: "Gold" }),
  },

  /* ── planExtendedEmail (new) ── */
  {
    name: "planExtendedEmail", module: "billing", audience: "customer", variant: "running-plan",
    render: () => planExtendedEmail({
      name: "Aarav Mehta", planName: "Gold", days: 30, previousEnd: fromToday(5), validTill: fromToday(35), slug: "pacewalk",
    }),
  },
  {
    name: "planExtendedEmail", module: "billing", audience: "customer", variant: "lapsed-plan",
    render: () => planExtendedEmail({
      name: "Priya Nair", planName: "Platinum", days: 15, previousEnd: fromToday(-4), validTill: fromToday(15),
    }),
  },
  {
    name: "planExtendedEmail", module: "billing", audience: "customer", variant: "minimal-one-day",
    render: () => planExtendedEmail({ name: "Rohan Gupta", days: 1, validTill: "2026-10-22" }),
  },
];
