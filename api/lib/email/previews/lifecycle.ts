/*
 * Gallery previews for the trial & card lifecycle emails. Fictional data only
 * ("pacewalk" is the owner's own demo card, whose preview image exists).
 */

import type { Email } from "../kit";
import {
  trialDay1Email, trialDay7Email, trialDay15Email, trialDay21Email, trialDay25Email,
  trialEndingEmail, trialEndedEmail, abandonedPublishEmail, trialOfferEmail,
  cardPublishedEmail, monthlyDigestEmail, dormantCardEmail, cardLinkChangedEmail,
  type TrialMetrics,
} from "../lifecycle";

type Preview = {
  name: string;
  module: string;
  audience: "customer" | "admin" | "visitor" | "reseller" | "prospect";
  variant?: string;
  render: () => Email;
};

const MODULE = "lifecycle";
const at = (iso: string) => new Date(iso);
const CARD = "https://digitalcarda.in/pacewalk";
const NONE: TrialMetrics = { views: 0, saves: 0, whatsapp: 0, calls: 0, leads: 0 };
const GOOD: TrialMetrics = { views: 318, saves: 41, whatsapp: 27, calls: 9, leads: 6 };
const EARLY: TrialMetrics = { views: 64, saves: 7, whatsapp: 5, calls: 2, leads: 0 };
const HOSTILE = `<b>Aarav</b> & "Mehta" <script>alert('x')</script>`;

const OFFER_PRICES = [{ plan: "Gold", cycle: "1 year", usual: 999, withCode: 799 }, { plan: "Gold", cycle: "3 years", usual: 2499, withCode: 1999 }, { plan: "Gold", cycle: "monthly", usual: 99, withCode: 79 }, { plan: "Platinum", cycle: "1 year", usual: 1999, withCode: 1599 }, { plan: "Platinum", cycle: "3 years", usual: 4999, withCode: 3999 }, { plan: "Platinum", cycle: "monthly", usual: 199, withCode: 159 }];

export const previews: Preview[] = [
  /* ── trialOfferEmail (day-2 EARLY20 offer) ── */
  {
    name: "trialOfferEmail", module: MODULE, audience: "customer", variant: "full",
    render: () => trialOfferEmail({ name: "Aarav Mehta", cardUrl: CARD, code: "EARLY20", percent: 20, endsAt: at("2026-10-01T12:30:00Z"), prices: OFFER_PRICES }),
  },
  {
    name: "trialOfferEmail", module: MODULE, audience: "customer", variant: "no-card-no-prices",
    render: () => trialOfferEmail({ name: "Aarav Mehta", cardUrl: "https://digitalcarda.in/dashboard", code: "EARLY20", percent: 20, endsAt: at("2026-10-01T12:30:00Z"), prices: [] }),
  },
  {
    name: "trialOfferEmail", module: MODULE, audience: "customer", variant: "hostile-input",
    render: () => trialOfferEmail({ name: HOSTILE, cardUrl: CARD, code: "EARLY20", percent: 20, endsAt: at("2026-10-01T12:30:00Z"), prices: OFFER_PRICES }),
  },

  /* ── trialDay1Email ── */
  {
    name: "trialDay1Email", module: MODULE, audience: "customer", variant: "as-sent-today",
    render: () => trialDay1Email({ name: "Aarav Mehta", cardUrl: CARD }),
  },
  {
    name: "trialDay1Email", module: MODULE, audience: "customer", variant: "with-trial",
    render: () => trialDay1Email({ name: "Aarav Mehta", cardUrl: CARD, daysLeft: 29, trialDays: 30, endsAt: at("2026-10-21T06:30:00Z") }),
  },
  {
    name: "trialDay1Email", module: MODULE, audience: "customer", variant: "no-card",
    render: () => trialDay1Email({ name: "Aarav Mehta", cardUrl: "https://digitalcarda.in/dashboard" }),
  },

  /* ── trialDay7Email ── */
  {
    name: "trialDay7Email", module: MODULE, audience: "customer", variant: "as-sent-today",
    render: () => trialDay7Email({ name: "Aarav Mehta", cardUrl: CARD }),
  },
  {
    name: "trialDay7Email", module: MODULE, audience: "customer", variant: "with-trial",
    render: () => trialDay7Email({ name: "Aarav Mehta", cardUrl: CARD, daysLeft: 23, endsAt: at("2026-10-14T06:30:00Z") }),
  },

  /* ── trialDay15Email ── */
  {
    name: "trialDay15Email", module: MODULE, audience: "customer", variant: "with-metrics",
    render: () => trialDay15Email({ name: "Aarav Mehta", daysLeft: 15, metrics: EARLY }),
  },
  {
    name: "trialDay15Email", module: MODULE, audience: "customer", variant: "no-visits",
    render: () => trialDay15Email({ name: "Aarav Mehta", daysLeft: 15, metrics: NONE, cardUrl: CARD, endsAt: at("2026-10-06T06:30:00Z") }),
  },

  /* ── trialDay21Email ── */
  {
    name: "trialDay21Email", module: MODULE, audience: "customer", variant: "working",
    render: () => trialDay21Email({ name: "Aarav Mehta", daysLeft: 9, metrics: GOOD, endsAt: at("2026-09-30T06:30:00Z") }),
  },
  {
    name: "trialDay21Email", module: MODULE, audience: "customer", variant: "no-visits",
    render: () => trialDay21Email({ name: "Aarav Mehta", daysLeft: 9, metrics: NONE, cardUrl: CARD }),
  },

  /* ── trialDay25Email ── */
  {
    name: "trialDay25Email", module: MODULE, audience: "customer", variant: "with-metrics",
    render: () => trialDay25Email({ name: "Aarav Mehta", daysLeft: 5, metrics: GOOD, endsAt: at("2026-09-26T06:30:00Z") }),
  },
  {
    name: "trialDay25Email", module: MODULE, audience: "customer", variant: "as-sent-today-no-visits",
    render: () => trialDay25Email({ name: "Aarav Mehta", daysLeft: 5, metrics: NONE }),
  },

  /* ── trialEndingEmail ── */
  {
    name: "trialEndingEmail", module: MODULE, audience: "customer", variant: "as-sent-today-no-offer",
    render: () => trialEndingEmail({ name: "Aarav Mehta", daysLeft: 2 }),
  },
  {
    name: "trialEndingEmail", module: MODULE, audience: "customer", variant: "with-offer-code",
    render: () => trialEndingEmail({
      name: "Aarav Mehta", daysLeft: 2, cardUrl: CARD, endsAt: at("2026-09-23T06:30:00Z"),
      graceDays: 3, offer: { percent: 10, code: "STAYLIVE10", endsAt: at("2026-09-25T18:29:00Z") },
    }),
  },
  {
    name: "trialEndingEmail", module: MODULE, audience: "customer", variant: "last-day",
    render: () => trialEndingEmail({ name: "Aarav Mehta", daysLeft: 1, slug: "pacewalk", offer: { percent: 10 } }),
  },

  /* ── trialEndedEmail ── */
  {
    name: "trialEndedEmail", module: MODULE, audience: "customer", variant: "as-sent-today",
    render: () => trialEndedEmail({ name: "Aarav Mehta" }),
  },
  {
    name: "trialEndedEmail", module: MODULE, audience: "customer", variant: "with-results-and-offer",
    render: () => trialEndedEmail({ name: "Aarav Mehta", slug: "pacewalk", metrics: GOOD, offer: { percent: 15, code: "WELCOMEBACK15" } }),
  },

  /* ── abandonedPublishEmail ── */
  {
    name: "abandonedPublishEmail", module: MODULE, audience: "customer", variant: "as-sent-today",
    render: () => abandonedPublishEmail({ name: "Aarav Mehta", cardUrl: "https://digitalcarda.in/dashboard/build" }),
  },
  {
    name: "abandonedPublishEmail", module: MODULE, audience: "customer", variant: "with-design",
    render: () => abandonedPublishEmail({ name: "Aarav Mehta", productName: "Ocean Blue", trialDays: 30 }),
  },

  /* ── cardPublishedEmail ── */
  {
    name: "cardPublishedEmail", module: MODULE, audience: "customer", variant: "permanent-qr",
    render: () => cardPublishedEmail({ name: "Aarav Mehta", slug: "pacewalk", company: "Mehta Interiors", publicId: "DEMO123abc" }),
  },
  {
    name: "cardPublishedEmail", module: MODULE, audience: "customer", variant: "minimal",
    render: () => cardPublishedEmail({ name: "Aarav Mehta", slug: "pacewalk" }),
  },
  {
    name: "cardPublishedEmail", module: MODULE, audience: "customer", variant: "hostile-input",
    render: () => cardPublishedEmail({ name: HOSTILE, slug: "pacewalk", company: `Mehta <img src=x onerror=alert(1)> & "Sons"`, publicId: `"><script>` }),
  },

  /* ── monthlyDigestEmail ── */
  {
    name: "monthlyDigestEmail", module: MODULE, audience: "customer", variant: "good-month",
    render: () => monthlyDigestEmail({
      name: "Aarav Mehta", month: "August 2026", slug: "pacewalk",
      views: 412, leads: 7, saves: 38, whatsapp: 29, calls: 11, qrScans: 23,
      prevViews: 356, prevLeads: 5, topProduct: "Modular kitchen design",
      unsubscribeUrl: "https://digitalcarda.in/unsubscribe?t=DEMO",
    }),
  },
  {
    name: "monthlyDigestEmail", module: MODULE, audience: "customer", variant: "views-no-enquiries",
    render: () => monthlyDigestEmail({ name: "Aarav Mehta", month: "August 2026", slug: "pacewalk", views: 96, leads: 0, saves: 4 }),
  },
  {
    name: "monthlyDigestEmail", module: MODULE, audience: "customer", variant: "quiet-month",
    render: () => monthlyDigestEmail({ name: "Aarav Mehta", month: "August 2026", views: 0, leads: 0 }),
  },
  {
    name: "monthlyDigestEmail", module: MODULE, audience: "customer", variant: "hostile-input",
    render: () => monthlyDigestEmail({
      name: HOSTILE, month: `<i>August</i> "2026"`, slug: "pacewalk", views: 12, leads: 1,
      topProduct: `<a href="javascript:alert(1)">Free & 'fast'</a>`, unsubscribeUrl: `javascript:alert(1)`,
    }),
  },

  /* ── dormantCardEmail ── */
  {
    name: "dormantCardEmail", module: MODULE, audience: "customer", variant: "still-viewed",
    render: () => dormantCardEmail({ name: "Aarav Mehta", slug: "pacewalk", days: 94, views: 214, viewsDays: 30, unsubscribeUrl: "https://digitalcarda.in/unsubscribe?t=DEMO" }),
  },
  {
    name: "dormantCardEmail", module: MODULE, audience: "customer", variant: "minimal",
    render: () => dormantCardEmail({ name: "Aarav Mehta", days: 120 }),
  },

  /* ── cardLinkChangedEmail (new) ── */
  {
    name: "cardLinkChangedEmail", module: MODULE, audience: "customer", variant: "with-permanent-qr",
    render: () => cardLinkChangedEmail({
      name: "Aarav Mehta", oldSlug: "mehta", newSlug: "pacewalk", publicId: "DEMO123abc",
      company: "Mehta Interiors", changedAt: at("2026-09-21T10:15:00Z"),
      reason: "Another business was already using digitalcarda.in/mehta, so we gave your card its own address.",
    }),
  },
  {
    name: "cardLinkChangedEmail", module: MODULE, audience: "customer", variant: "no-public-id",
    render: () => cardLinkChangedEmail({ name: "Aarav Mehta", oldSlug: "mehta-interiors", newSlug: "pacewalk" }),
  },
  {
    name: "cardLinkChangedEmail", module: MODULE, audience: "customer", variant: "hostile-input",
    render: () => cardLinkChangedEmail({
      name: HOSTILE, oldSlug: `old"><script>`, newSlug: "pacewalk", company: `<b>Bold</b> & 'Co'`,
      reason: `<script>alert("x")</script>\nSecond line & more`,
    }),
  },
];
