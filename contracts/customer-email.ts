/* "Send email" to one customer, from Admin → Customers (⋮ → Send email).

   The server owns everything that matters: it finds the customer from their
   id (never from an address the browser sends), decides which templates make
   sense for them right now, builds the email with the same code for the
   preview and the send, and refuses a send whose content changed since the
   preview. Built by api/lib/customer-email.ts (router: customerEmail), drawn
   by src/components/admin/SendEmailModal.tsx. */

/** Which customer: a platform account (users.id) or an old-site customer
    (the customers.json id). Exactly one is set. Flat on purpose — the staff
    guard reads `userId` to stop staff emailing admin or partner accounts. */
export type RecipientRef = { userId?: number; legacyId?: number };

/** Who may switch a template off: service mail always goes; the rest honour
    the customer's own notification switches (plan emails / tips & news). */
export type TemplateCategory = "service" | "plan" | "tips";

export type TemplateGroup = "message" | "account" | "plan" | "growth";

export type ManualTemplateKey =
  | "custom"
  | "welcome"
  | "account_details"
  | "card_live"
  | "feature_update"
  | "review_request"
  | "finish_card"
  | "renewal_reminder"
  | "plan_expired"
  | "trial_ending"
  | "trial_ended";

export const TEMPLATE_GROUPS: { key: TemplateGroup; label: string }[] = [
  { key: "message", label: "Write your own" },
  { key: "account", label: "Account & card" },
  { key: "plan", label: "Plan & trial" },
  { key: "growth", label: "Tips & news" },
];

/** What the admin picks from. Availability is decided per customer by the
    server (options), with a reason when a template doesn't apply. */
export const MANUAL_TEMPLATES: {
  key: ManualTemplateKey;
  label: string;
  hint: string;
  group: TemplateGroup;
  category: TemplateCategory;
}[] = [
  { key: "custom", label: "Custom message", hint: "Write a subject and message; it goes out in the DigitalCarda design.", group: "message", category: "service" },
  { key: "welcome", label: "Welcome email", hint: "Re-send the welcome: how to sign in and share their card.", group: "account", category: "service" },
  { key: "account_details", label: "Account details", hint: "Their sign-in email and card link (no password).", group: "account", category: "service" },
  { key: "card_live", label: "Your card is live", hint: "Their card link, QR link and how to share it.", group: "account", category: "service" },
  { key: "renewal_reminder", label: "Plan renewal reminder", hint: "Their plan ends soon — renew before it lapses.", group: "plan", category: "plan" },
  { key: "plan_expired", label: "Plan expired", hint: "Their paid plan has ended — renew to keep the card live.", group: "plan", category: "plan" },
  { key: "trial_ending", label: "Trial ending", hint: "Their free trial ends in a few days.", group: "plan", category: "plan" },
  { key: "trial_ended", label: "Trial ended", hint: "Their free trial has ended — pick a plan.", group: "plan", category: "plan" },
  { key: "finish_card", label: "Finish your card", hint: "They signed up but haven't published a card yet.", group: "growth", category: "tips" },
  { key: "feature_update", label: "What's new", hint: "The latest features and improvements.", group: "growth", category: "tips" },
  { key: "review_request", label: "Ask for a review", hint: "Ask a happy customer to leave a review.", group: "growth", category: "tips" },
];

/** Limits the server enforces (shown in the modal so nothing is a surprise). */
export const MANUAL_EMAIL_LIMITS = {
  perAdminPerHour: 30,
  perRecipientPerDay: 3,
  sameTemplateCooldownMin: 10,
  tipsPerRecipientPerWeek: 1,
  globalPerDay: 300,
  subjectMax: 150,
  messageMax: 5000,
  linksMax: 10,
} as const;

/** The admin's own words for a custom message — plain text only. Blank lines
    start a new paragraph; http(s) links become clickable. */
export type CustomMessageInput = {
  subject: string;
  message: string;
  /** A promotion honours the customer's "tips & news" switch; otherwise it's a
      service message and always goes. */
  promotional: boolean;
};

export type TemplateOption = {
  key: ManualTemplateKey;
  available: boolean;
  /** Why it isn't available for this customer (e.g. "No published card yet"). */
  reason: string | null;
  /** The customer switched this kind of email off. */
  optedOut: boolean;
  /** Sent this template to this customer within the cooldown. */
  recentlySentAt: string | null;
};

export type RecentEmail = {
  at: string;
  subject: string;
  /** The email-log kind, e.g. "welcomeEmail" or "manual:teamMessageEmail". */
  kind: string;
  status: "sent" | "failed" | "skipped";
  byHand: boolean;
  /** Who sent it by hand (admin name), when known. */
  sentBy: string | null;
};

export type EmailOptions = {
  recipient: {
    name: string;
    email: string;
    /** "platform" = has an account on this site; "old_site" = customers.json only. */
    source: "platform" | "old_site";
    planLabel: string | null;
    emailVerified: boolean | null;
    /** The customer's own switches: true = they turned that kind of email off
        (a promotional custom message counts as tips & news). */
    optedOut: { plan: boolean; tips: boolean };
  };
  /** Set when nothing can be sent to this customer at all (erased, hidden,
      suspended, placeholder address, not a customer account). */
  blocked: string | null;
  templates: TemplateOption[];
  recent: RecentEmail[];
  /** How many more this admin can send in the current hour, and this customer today. */
  remaining: { adminThisHour: number; recipientToday: number };
};

export type EmailPreview = {
  subject: string;
  preheader: string;
  html: string;
  text: string;
  sizeKb: number;
  /** Things worth a second look before sending (unverified address, links
      outside digitalcarda.in, sent recently…). */
  warnings: string[];
  /** When this same email (same template; for a custom message, the same
      subject) went to them within the cooldown — sending it again needs
      confirmResend. Null when it hasn't. */
  sameEmailAt: string | null;
  /** Pass back to send: the send is refused if the rebuilt email differs. */
  hash: string;
};

export type SendResult = {
  /** sent = handed to the mail server; captured = dev mailbox only (not
      delivered); failed/skipped = see error. */
  status: "sent" | "captured" | "failed" | "skipped";
  error: string | null;
  to: string;
};
