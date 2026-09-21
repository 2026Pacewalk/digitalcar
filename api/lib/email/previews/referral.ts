/*
 * Gallery previews for the Refer & Earn emails. Fictional data only.
 */

import type { Email } from "../kit";
import {
  referralJoinedEmail, referralRewardEmail,
  payoutRequestReceivedEmail, payoutCompletedEmail, payoutRejectedEmail,
} from "../referral";

type Preview = {
  name: string;
  module: string;
  audience: "customer" | "admin" | "visitor" | "reseller" | "prospect";
  variant?: string;
  render: () => Email;
};

const MODULE = "referral";
const at = (iso: string) => new Date(iso);

export const previews: Preview[] = [
  /* ── referralJoinedEmail ── */
  {
    name: "referralJoinedEmail", module: MODULE, audience: "customer", variant: "with-rates",
    render: () => referralJoinedEmail({
      name: "Aarav Mehta", friendName: "Priya Sharma", code: "pacewalk",
      commissionPercent: 15, discountPercent: 15, joinedAt: at("2026-09-21T09:12:00Z"),
    }),
  },
  {
    name: "referralJoinedEmail", module: MODULE, audience: "customer", variant: "minimal",
    render: () => referralJoinedEmail({ name: "Aarav Mehta", friendName: "Priya Sharma" }),
  },
  {
    name: "referralJoinedEmail", module: MODULE, audience: "customer", variant: "reward-text",
    render: () => referralJoinedEmail({
      name: "Aarav Mehta", friendName: "Rohan Iyer", code: "pacewalk",
      rewardText: "15% of what they pay", joinedAt: at("2026-09-20T14:40:00Z"),
    }),
  },
  {
    name: "referralJoinedEmail", module: MODULE, audience: "customer", variant: "hostile",
    render: () => referralJoinedEmail({
      name: `<script>alert(1)</script> Aarav`,
      friendName: `<b>Mehta</b> & "Sons" 'Interiors' <img src=x onerror=alert(1)>`,
      rewardText: `<i>15%</i> & "more"`,
      code: `pacewalk"><script>alert(1)</script>`,
      commissionPercent: 15, discountPercent: 15, joinedAt: at("2026-09-21T09:12:00Z"),
    }),
  },

  /* ── referralRewardEmail ── */
  {
    name: "referralRewardEmail", module: MODULE, audience: "customer", variant: "auto-credit",
    render: () => referralRewardEmail({
      name: "Aarav Mehta", refereeName: "Priya Sharma", amount: "449.85", balance: "1249.85",
      planName: "Gold (Yearly)", percent: 15, code: "pacewalk",
    }),
  },
  {
    name: "referralRewardEmail", module: MODULE, audience: "customer", variant: "team-credit",
    render: () => referralRewardEmail({
      name: "Aarav Mehta", refereeName: "Rohan Iyer", amount: 500, balance: 500, creditedByTeam: true,
    }),
  },
  {
    name: "referralRewardEmail", module: MODULE, audience: "customer", variant: "minimal",
    render: () => referralRewardEmail({ amount: 300 }),
  },

  /* ── payoutRequestReceivedEmail ── */
  {
    name: "payoutRequestReceivedEmail", module: MODULE, audience: "customer", variant: "upi",
    render: () => payoutRequestReceivedEmail({
      name: "Aarav Mehta", amount: 1200, method: "upi", destinationMasked: "aarav.mehta@okicici",
      balance: 49.85, requestId: 214, requestedAt: at("2026-09-21T10:05:00Z"),
    }),
  },
  {
    name: "payoutRequestReceivedEmail", module: MODULE, audience: "customer", variant: "bank",
    render: () => payoutRequestReceivedEmail({
      name: "Aarav Mehta", amount: "2500.00", method: "bank", destinationMasked: "000123456789",
      accountName: "Aarav Mehta", ifsc: "hdfc0000001", balance: 0, requestId: 215,
      requestedAt: at("2026-09-21T11:30:00Z"),
    }),
  },
  {
    name: "payoutRequestReceivedEmail", module: MODULE, audience: "customer", variant: "minimal",
    render: () => payoutRequestReceivedEmail({ amount: 750 }),
  },

  /* ── payoutCompletedEmail ── */
  {
    name: "payoutCompletedEmail", module: MODULE, audience: "customer", variant: "upi-with-reference",
    render: () => payoutCompletedEmail({
      name: "Aarav Mehta", amount: 1200, method: "upi", reference: "UTR 426512345678",
      destinationMasked: "aarav.mehta@okicici", paidAt: at("2026-09-22T06:45:00Z"), requestId: 214, balance: 49.85,
    }),
  },
  {
    name: "payoutCompletedEmail", module: MODULE, audience: "customer", variant: "bank-legacy-fields",
    render: () => payoutCompletedEmail({ name: "Aarav Mehta", amount: 2500, method: "bank" }),
  },

  /* ── payoutRejectedEmail ── */
  {
    name: "payoutRejectedEmail", module: MODULE, audience: "customer", variant: "with-note",
    render: () => payoutRejectedEmail({
      name: "Aarav Mehta", amount: 1200, balance: 1249.85, method: "upi",
      destinationMasked: "aarav.mehta@okicic", requestId: 214,
      note: "The UPI ID aarav.mehta@okicic doesn't exist — it looks like a letter is missing from okicici.\nPlease check it and request again.",
    }),
  },
  {
    name: "payoutRejectedEmail", module: MODULE, audience: "customer", variant: "no-note",
    render: () => payoutRejectedEmail({ name: "Aarav Mehta", amount: "2500.00", method: "bank" }),
  },
];
