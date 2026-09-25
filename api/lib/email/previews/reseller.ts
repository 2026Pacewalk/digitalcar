/*
 * Gallery previews for the reseller / partner-programme emails.
 * Fictional data only: no real people, businesses, emails, phones or ids.
 */

import {
  resellerApplicationReceivedEmail,
  resellerApprovedEmail,
  resellerApprovedExistingEmail,
  resellerLoginDetailsEmail,
  resellerRejectedEmail,
  resellerCommissionEmail,
  resellerCustomerLinkedEmail,
} from "../reseller";

const MODULE = "reseller";
const APPROVED_AT = new Date("2026-09-21T10:30:00+05:30");
const DEMO_RESET_LINK = "https://digitalcarda.in/reset-password?token=DEMO_TOKEN_NOT_REAL";
const HOSTILE = `Aarav <b>Mehta</b> & "Sons" 'Ltd'<script>alert(1)</script>`;

export const previews: {
  name: string;
  module: string;
  audience: "customer" | "admin" | "visitor" | "reseller" | "prospect";
  variant?: string;
  render: () => import("../kit").Email;
}[] = [
  /* ── Application received ── */
  {
    name: "resellerApplicationReceivedEmail", module: MODULE, audience: "reseller", variant: "full",
    render: () => resellerApplicationReceivedEmail({
      name: "Aarav Mehta", email: "aarav.mehta@example.com", phone: "9000001234", companyName: "Mehta Interiors",
    }),
  },
  {
    name: "resellerApplicationReceivedEmail", module: MODULE, audience: "reseller", variant: "name-only",
    render: () => resellerApplicationReceivedEmail({ name: "Aarav Mehta" }),
  },
  {
    name: "resellerApplicationReceivedEmail", module: MODULE, audience: "reseller", variant: "already-pending",
    render: () => resellerApplicationReceivedEmail({
      name: "Aarav Mehta", email: "aarav.mehta@example.com", companyName: "Mehta Interiors", alreadyPending: true,
    }),
  },
  {
    name: "resellerApplicationReceivedEmail", module: MODULE, audience: "reseller", variant: "empty",
    render: () => resellerApplicationReceivedEmail({}),
  },

  /* ── Approved (new account) ── */
  {
    name: "resellerApprovedEmail", module: MODULE, audience: "reseller", variant: "full",
    render: () => resellerApprovedEmail({
      name: "Aarav Mehta", link: DEMO_RESET_LINK, email: "aarav.mehta@example.com",
      companyName: "Mehta Interiors", commissionRate: "10.00", approvedAt: APPROVED_AT,
    }),
  },
  {
    name: "resellerApprovedEmail", module: MODULE, audience: "reseller", variant: "as-called-today",
    render: () => resellerApprovedEmail({ name: "Aarav Mehta", link: DEMO_RESET_LINK }),
  },
  {
    name: "resellerApprovedEmail", module: MODULE, audience: "reseller", variant: "hostile-input",
    render: () => resellerApprovedEmail({
      name: HOSTILE, link: "javascript:alert(1)", email: `x"><img src=x onerror=alert(1)>@example.com`,
      companyName: `<i>Mehta</i> & "Co"`, commissionRate: "12.50", approvedAt: APPROVED_AT,
    }),
  },

  /* ── Approved (existing account upgraded) ── */
  {
    name: "resellerApprovedExistingEmail", module: MODULE, audience: "reseller", variant: "full",
    render: () => resellerApprovedExistingEmail({
      name: "Priya Sharma", email: "priya.sharma@example.com", companyName: "Sharma Print Studio",
      commissionRate: 10, approvedAt: APPROVED_AT,
    }),
  },
  {
    name: "resellerApprovedExistingEmail", module: MODULE, audience: "reseller", variant: "as-called-today",
    render: () => resellerApprovedExistingEmail({ name: "Priya Sharma" }),
  },

  /* ── Login details, sent again from admin → Share with reseller ── */
  {
    name: "resellerLoginDetailsEmail", module: MODULE, audience: "reseller", variant: "never-signed-in",
    render: () => resellerLoginDetailsEmail({
      name: "Aarav Mehta", link: DEMO_RESET_LINK, email: "aarav.mehta@example.com", companyName: "Mehta Interiors",
      commissionRate: 20, approvedAt: APPROVED_AT, signedInBefore: false,
    }),
  },
  {
    name: "resellerLoginDetailsEmail", module: MODULE, audience: "reseller", variant: "returning",
    render: () => resellerLoginDetailsEmail({
      name: "Priya Sharma", link: DEMO_RESET_LINK, email: "priya.sharma@example.com", companyName: "Sharma Print Studio",
      commissionRate: 20, approvedAt: APPROVED_AT, signedInBefore: true,
    }),
  },
  {
    name: "resellerLoginDetailsEmail", module: MODULE, audience: "reseller", variant: "hostile-input",
    render: () => resellerLoginDetailsEmail({ name: HOSTILE, link: "javascript:alert(1)", email: "x@example.com", companyName: HOSTILE }),
  },

  /* ── Rejected ── */
  {
    name: "resellerRejectedEmail", module: MODULE, audience: "reseller", variant: "with-note",
    render: () => resellerRejectedEmail({
      name: "Kabir Rao",
      note: "We're only taking on partners who already sell to local businesses for now.\nIf you start an agency, we'd be glad to hear from you again.",
    }),
  },
  {
    name: "resellerRejectedEmail", module: MODULE, audience: "reseller", variant: "no-note",
    render: () => resellerRejectedEmail({ name: "Kabir Rao" }),
  },
  {
    name: "resellerRejectedEmail", module: MODULE, audience: "reseller", variant: "hostile-note",
    render: () => resellerRejectedEmail({ name: HOSTILE, note: `<a href="https://evil.example.com">Click</a> & "win" 'now'` }),
  },

  /* ── Commission earned ── */
  {
    name: "resellerCommissionEmail", module: MODULE, audience: "reseller", variant: "full",
    render: () => resellerCommissionEmail({
      name: "Aarav Mehta", customerName: "Rohan Kapoor", amount: "99.90", pendingPayout: "349.70",
      rate: "10.00", planName: "Business", billingCycle: "yearly", orderAmount: "999.00",
      totalEarnings: "1249.60", creditedAt: APPROVED_AT,
    }),
  },
  {
    name: "resellerCommissionEmail", module: MODULE, audience: "reseller", variant: "as-called-today",
    render: () => resellerCommissionEmail({ name: "Aarav Mehta", customerName: "Rohan Kapoor", amount: "49.90", pendingPayout: "49.90" }),
  },
  {
    name: "resellerCommissionEmail", module: MODULE, audience: "reseller", variant: "minimal",
    render: () => resellerCommissionEmail({ amount: 150 }),
  },
  {
    name: "resellerCommissionEmail", module: MODULE, audience: "reseller", variant: "hostile-input",
    render: () => resellerCommissionEmail({
      name: HOSTILE, customerName: HOSTILE, amount: "299.70", pendingPayout: "not-a-number",
      rate: "abc", planName: `<b>Gold</b> & "Plus"`, billingCycle: "triennial", orderAmount: "2997.00",
    }),
  },

  /* ── An existing customer linked to the partner by the team ── */
  {
    name: "resellerCustomerLinkedEmail", module: MODULE, audience: "reseller", variant: "full",
    render: () => resellerCustomerLinkedEmail({
      name: "Aarav Mehta", customerName: "Rohan Kapoor", business: "Kapoor Interiors", rate: "20.00", linkedAt: APPROVED_AT,
    }),
  },
  {
    name: "resellerCustomerLinkedEmail", module: MODULE, audience: "reseller", variant: "minimal",
    render: () => resellerCustomerLinkedEmail({}),
  },
  {
    name: "resellerCustomerLinkedEmail", module: MODULE, audience: "reseller", variant: "hostile-input",
    render: () => resellerCustomerLinkedEmail({ name: HOSTILE, customerName: HOSTILE, business: HOSTILE, rate: "abc" }),
  },
];
