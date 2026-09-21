/*
 * Gallery previews for the account emails. Fictional data only: the one real
 * slug is "pacewalk", the owner's own demo card, whose preview image exists.
 */
import {
  welcomeEmail, accountDetailsEmail, verifyEmailAddressEmail, passwordChangedEmail,
  passwordResetEmail, emailChangedEmail, accountDeletionScheduledEmail, accountRestoredEmail,
} from "../account";

const DAY = 86_400_000;
/** A fixed "now" so every render is identical: Mon 21 Sept 2026, 3:10 pm IST. */
const NOW = new Date("2026-09-21T09:40:00Z");
const later = (days: number) => new Date(NOW.getTime() + days * DAY);

const VERIFY_LINK = "https://digitalcarda.in/verify-email?token=DEMO_VERIFY_TOKEN_123";
const RESET_LINK = "https://digitalcarda.in/reset-password?token=DEMO_RESET_TOKEN_123";

export const previews: {
  name: string; module: string;
  audience: "customer" | "admin" | "visitor" | "reseller" | "prospect";
  variant?: string;
  render: () => import("../kit").Email;
}[] = [
  /* ── welcomeEmail ── */
  {
    name: "welcomeEmail", module: "account", audience: "customer", variant: "live-card-trial",
    render: () => welcomeEmail({
      name: "Aarav Mehta", role: "customer", slug: "pacewalk", companyName: "Mehta Interiors",
      trial: { days: 30, endsAt: later(30), voucher: "FREE30D" },
    }),
  },
  {
    name: "welcomeEmail", module: "account", audience: "customer", variant: "live-card-no-company-no-voucher",
    render: () => welcomeEmail({
      name: "Priya Nair", role: "customer", slug: "pacewalk",
      trial: { days: 14, endsAt: later(14), voucher: null },
    }),
  },
  {
    name: "welcomeEmail", module: "account", audience: "customer", variant: "fallback-no-card",
    render: () => welcomeEmail({ name: "Aarav Mehta", role: "customer" }),
  },
  {
    name: "welcomeEmail", module: "account", audience: "customer", variant: "hostile-input",
    render: () => welcomeEmail({
      name: `<b>Aarav</b>&"' <script>alert(1)</script>`, role: "customer", slug: "pacewalk",
      companyName: `<img src=x onerror=alert(1)> & "Mehta" 'Interiors'`,
      trial: { days: 30, endsAt: later(30), voucher: `<i>FREE30D</i>"` },
    }),
  },

  /* ── accountDetailsEmail ── */
  {
    name: "accountDetailsEmail", module: "account", audience: "customer", variant: "with-password",
    render: () => accountDetailsEmail({
      name: "Aarav Mehta", loginEmail: "aarav.mehta@example.com", password: "Mehta@2026",
      slug: "pacewalk", company: "Mehta Interiors",
    }),
  },
  {
    name: "accountDetailsEmail", module: "account", audience: "customer", variant: "no-password",
    render: () => accountDetailsEmail({
      name: "Priya Nair", loginEmail: "priya.nair@example.com", password: null, slug: "pacewalk", company: null,
    }),
  },
  {
    name: "accountDetailsEmail", module: "account", audience: "customer", variant: "no-card",
    render: () => accountDetailsEmail({
      name: "Rohan Iyer", loginEmail: "rohan.iyer@example.com", password: "Temp#4821", slug: null, company: "Iyer Traders",
    }),
  },

  /* ── verifyEmailAddressEmail ── */
  {
    name: "verifyEmailAddressEmail", module: "account", audience: "customer", variant: "as-called-today",
    render: () => verifyEmailAddressEmail({ name: "Aarav Mehta", link: VERIFY_LINK }),
  },
  {
    name: "verifyEmailAddressEmail", module: "account", audience: "customer", variant: "signup-with-email",
    render: () => verifyEmailAddressEmail({ name: "Aarav Mehta", link: VERIFY_LINK, email: "aarav.mehta@example.com", purpose: "signup" }),
  },
  {
    name: "verifyEmailAddressEmail", module: "account", audience: "customer", variant: "email-changed",
    render: () => verifyEmailAddressEmail({ name: "Aarav Mehta", link: VERIFY_LINK, email: "aarav@mehtainteriors.example.com", purpose: "changed" }),
  },

  /* ── passwordChangedEmail ── */
  {
    name: "passwordChangedEmail", module: "account", audience: "customer", variant: "as-called-today",
    render: () => passwordChangedEmail({ name: "Aarav Mehta" }),
  },
  {
    name: "passwordChangedEmail", module: "account", audience: "customer", variant: "self-with-time",
    render: () => passwordChangedEmail({ name: "Aarav Mehta", at: NOW }),
  },
  {
    name: "passwordChangedEmail", module: "account", audience: "customer", variant: "by-team",
    render: () => passwordChangedEmail({ name: "Aarav Mehta", byTeam: true, at: NOW }),
  },

  /* ── passwordResetEmail ── */
  {
    name: "passwordResetEmail", module: "account", audience: "customer",
    render: () => passwordResetEmail({ name: "Aarav Mehta", link: RESET_LINK }),
  },

  /* ── emailChangedEmail (new) ── */
  {
    name: "emailChangedEmail", module: "account", audience: "customer", variant: "with-time-and-verification",
    render: () => emailChangedEmail({
      name: "Aarav Mehta", oldEmail: "aarav.mehta@example.com", newEmail: "aarav@mehtainteriors.example.com",
      at: NOW, verificationSent: true,
    }),
  },
  {
    name: "emailChangedEmail", module: "account", audience: "customer", variant: "minimal-hostile-new-email",
    render: () => emailChangedEmail({
      name: null, oldEmail: "priya.nair@example.com", newEmail: `"><script>alert(1)</script>@example.com`,
    }),
  },

  /* ── accountDeletionScheduledEmail (new) ── */
  {
    name: "accountDeletionScheduledEmail", module: "account", audience: "customer", variant: "web-with-reason",
    render: () => accountDeletionScheduledEmail({
      name: "Aarav Mehta", scheduledFor: later(30), source: "web", requestedAt: NOW,
      reason: "Closing the business for a while.",
    }),
  },
  {
    name: "accountDeletionScheduledEmail", module: "account", audience: "customer", variant: "app",
    render: () => accountDeletionScheduledEmail({ name: "Priya Nair", scheduledFor: later(30), source: "app", requestedAt: NOW }),
  },
  {
    name: "accountDeletionScheduledEmail", module: "account", audience: "customer", variant: "minimal",
    render: () => accountDeletionScheduledEmail({ name: "Rohan Iyer", scheduledFor: later(30) }),
  },

  /* ── accountRestoredEmail (new) ── */
  {
    name: "accountRestoredEmail", module: "account", audience: "customer", variant: "with-card",
    render: () => accountRestoredEmail({ name: "Aarav Mehta", slug: "pacewalk" }),
  },
  {
    name: "accountRestoredEmail", module: "account", audience: "customer", variant: "no-card",
    render: () => accountRestoredEmail({ name: "Priya Nair" }),
  },
];
