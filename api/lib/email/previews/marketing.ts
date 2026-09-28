/*
 * Preview fixtures for the marketing module. Fictional data only: the slug
 * "pacewalk" is the owner's own demo card, everything else is made up.
 */
import {
  featureUpdateEmail, marketingIntroEmail, contactReceivedEmail, reviewRequestEmail,
  smtpTestEmail, bulkOrderReceivedEmail,
} from "../marketing";
import { teamMessageEmail } from "../manual";

const MODULE = "marketing";
const HOSTILE = `<b>Aarav</b> & "Mehta" 'Sons' <script>alert(1)</script>`;

export const previews: {
  name: string;
  module: string;
  audience: "customer" | "admin" | "visitor" | "reseller" | "prospect";
  variant?: string;
  render: () => import("../kit").Email;
}[] = [
  /* What's new */
  { name: "featureUpdateEmail", module: MODULE, audience: "customer", variant: "with-card",
    render: () => featureUpdateEmail({ name: "Aarav Mehta", slug: "pacewalk" }) },
  { name: "featureUpdateEmail", module: MODULE, audience: "customer", variant: "no-card",
    render: () => featureUpdateEmail({ name: null, slug: null }) },

  /* Cold intro */
  { name: "marketingIntroEmail", module: MODULE, audience: "prospect", variant: "with-business",
    render: () => marketingIntroEmail({ name: "Aarav Mehta", businessName: "Mehta Interiors" }) },
  { name: "marketingIntroEmail", module: MODULE, audience: "prospect", variant: "minimal",
    render: () => marketingIntroEmail({}) },
  { name: "marketingIntroEmail", module: MODULE, audience: "prospect", variant: "custom-cta-14-day-trial",
    render: () => marketingIntroEmail({ name: "Priya Nair", businessName: "Nair Dental Care", ctaUrl: "https://digitalcarda.in/signup?ref=demo", trialDays: 14 }) },
  { name: "marketingIntroEmail", module: MODULE, audience: "prospect", variant: "unsafe-cta-falls-back",
    render: () => marketingIntroEmail({ name: "Kabir Rao", businessName: "Rao Motors", ctaUrl: "javascript:alert(1)" }) },

  /* /contact confirmation */
  { name: "contactReceivedEmail", module: MODULE, audience: "visitor", variant: "bulk-requirement",
    render: () => contactReceivedEmail({ name: "Aarav Mehta", requirement: "Bulk Cards for a Team" }) },
  { name: "contactReceivedEmail", module: MODULE, audience: "visitor", variant: "no-requirement",
    render: () => contactReceivedEmail({ name: "Sneha", requirement: null }) },
  { name: "contactReceivedEmail", module: MODULE, audience: "visitor", variant: "free-text-requirement-ignored",
    render: () => contactReceivedEmail({ name: "Rohan Gupta", requirement: "Call me now on example dot com" }) },
  { name: "contactReceivedEmail", module: MODULE, audience: "visitor", variant: "hostile-input",
    render: () => contactReceivedEmail({ name: HOSTILE, requirement: "Technical Support" }) },

  /* Review request */
  { name: "reviewRequestEmail", module: MODULE, audience: "customer", variant: "with-review-link",
    render: () => reviewRequestEmail({ name: "Aarav Mehta", reviewUrl: "https://example.com/review/digitalcarda" }) },
  { name: "reviewRequestEmail", module: MODULE, audience: "customer", variant: "no-review-link",
    render: () => reviewRequestEmail({ name: "Aarav Mehta" }) },
  { name: "reviewRequestEmail", module: MODULE, audience: "customer", variant: "after-nfc-delivery",
    render: () => reviewRequestEmail({ name: "Priya Nair", reviewUrl: "https://example.com/review/digitalcarda", productName: "NFC card" }) },

  /* SMTP test */
  { name: "smtpTestEmail", module: MODULE, audience: "admin", variant: "full",
    render: () => smtpTestEmail({ to: "owner@example.com", from: "DigitalCarda <hello@example.com>", host: "smtp.example.com", sentAt: new Date("2026-09-21T10:12:00Z") }) },
  { name: "smtpTestEmail", module: MODULE, audience: "admin", variant: "minimal",
    render: () => smtpTestEmail({}) },

  /* Team (bulk) card request */
  { name: "bulkOrderReceivedEmail", module: MODULE, audience: "customer", variant: "business-bundle",
    render: () => bulkOrderReceivedEmail({
      name: "Aarav Mehta", company: "Mehta Interiors", quantity: 25, packageName: "Business",
      pricePerCard: 699, estimate: Math.round(25 * 699 * 1.18), phone: "+91 90000 01234", requestId: 42,
    }) },
  { name: "bulkOrderReceivedEmail", module: MODULE, audience: "customer", variant: "custom-guest",
    render: () => bulkOrderReceivedEmail({ quantity: 60, packageName: "Custom", pricePerCard: 599, estimate: 35940 }) },
  { name: "bulkOrderReceivedEmail", module: MODULE, audience: "customer", variant: "minimal",
    render: () => bulkOrderReceivedEmail({ quantity: 10 }) },
  { name: "bulkOrderReceivedEmail", module: MODULE, audience: "customer", variant: "hostile-input",
    render: () => bulkOrderReceivedEmail({
      name: HOSTILE, company: HOSTILE, quantity: 12, packageName: `<i>Team</i>"`,
      pricePerCard: 799, estimate: 9588, phone: "<b>not a number</b>", requestId: 7,
    }) },

  /* A message the team writes by hand (Admin → Customers → Send email) */
  { name: "teamMessageEmail", module: MODULE, audience: "customer", variant: "service-with-links",
    render: () => teamMessageEmail({
      name: "Aarav Mehta", subject: "Your card's new QR standee is on its way", promotional: false,
      message: "Thanks for your order today.\n\nYour QR standee ships tomorrow. You can see the design here: https://digitalcarda.in/pacewalk.\nQuestions? Message us on https://wa.me/919517722444\n\nWe'll send the tracking number as soon as it's out.",
    }) },
  { name: "teamMessageEmail", module: MODULE, audience: "customer", variant: "promotional",
    render: () => teamMessageEmail({
      name: "Priya Nair", subject: "Diwali offer: 20% off Platinum this week", promotional: true,
      message: "Diwali is the busiest week of the year for many of our customers.\n\nUpgrade to Platinum before Sunday and get 20% off: https://digitalcarda.in/dashboard/subscription",
    }) },
  { name: "teamMessageEmail", module: MODULE, audience: "customer", variant: "more-links-than-allowed",
    render: () => teamMessageEmail({
      name: null, subject: "Links you asked for", promotional: false,
      message: Array.from({ length: 12 }, (_, i) => `Link ${i + 1}: https://digitalcarda.in/help/${i + 1}`).join("\n"),
    }) },
  { name: "teamMessageEmail", module: MODULE, audience: "customer", variant: "hostile-input",
    render: () => teamMessageEmail({
      name: HOSTILE, subject: `${HOSTILE}\r\nBcc: someone@example.com`, promotional: false,
      message: `${HOSTILE}\n\njavascript:alert(1) and https://example.com/"><script>alert(1)</script> and https://digitalcarda.in@example.com/login`,
    }) },
];
