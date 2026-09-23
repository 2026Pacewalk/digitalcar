/* Platform settings — the shape of everything on Admin → Settings, shared by
 * the server (which stores and applies them) and the admin UI.
 *
 * Rule for this file: a setting only belongs here if something actually reads
 * it. Each field's comment says what it changes.
 */

/** Business identity and the contact details shown across the website. */
export type BusinessSettings = {
  brandName: string;        // name in emails ("DigitalCarda <hello@…>") and on invoices
  supportEmail: string;     // website footer/menus, contact page, invoices
  supportPhone: string;     // website footer/menus (as typed, e.g. "+91 95177 22444")
  whatsappNumber: string;   // digits only — the "Chat on WhatsApp" links
  legalName: string;        // invoices: the registered entity
  address: string;          // invoices
  gstin: string;            // invoices (blank = not shown)
};

/** Who the platform's own alerts go to, and which ones are sent at all. */
export const ALERT_KINDS = [
  { key: "signups", label: "New sign-ups", hint: "Someone creates an account, including referrals" },
  { key: "leads", label: "Enquiries from cards", hint: "A visitor sends an enquiry — hot leads included" },
  { key: "payments", label: "Payments", hint: "A payment to verify, or an online sale" },
  { key: "payouts", label: "Payout requests", hint: "A partner asks to withdraw their referral earnings" },
  { key: "resellers", label: "Reseller applications", hint: "Someone applies to become a reseller" },
  { key: "orders", label: "Bulk & NFC orders", hint: "A bulk card request or an NFC card / standee order" },
  { key: "contact", label: "Website contact form", hint: "Someone writes from the Contact page" },
  { key: "system", label: "Account & settings alerts", hint: "Deletion requests, payment settings changed" },
  { key: "digest", label: "Daily digest", hint: "One summary email each morning" },
] as const;

export type AlertKind = (typeof ALERT_KINDS)[number]["key"];

export type AlertSettings = {
  recipients: string[];                      // where the alerts above are sent
  enabled: Record<AlertKind, boolean>;       // off = that alert is not sent at all
};

/** How the platform sends email. SMTP credentials stay in the server .env. */
export type EmailSettings = {
  fromName: string;   // display name on every email; blank = brand name
  replyTo: string;    // optional Reply-To for platform emails; blank = none
};

/** Sign-in protection for every portal. */
export type SecuritySettings = {
  attemptsPerIp: number;       // sign-in tries allowed from one IP per minute
  attemptsPerAccount: number;  // sign-in tries allowed per email in 5 minutes
  adminSessionDays: number;    // how long an admin/staff sign-in lasts
  adminIpAllowlist: string[];  // empty = any IP; otherwise only these may open the admin portal
};

export type PlatformSettings = {
  business: BusinessSettings;
  alerts: AlertSettings;
  email: EmailSettings;
  security: SecuritySettings;
};

export type SettingsSection = keyof PlatformSettings;

export const DEFAULT_SETTINGS: PlatformSettings = {
  business: {
    brandName: "DigitalCarda",
    supportEmail: "hello@digitalcarda.in",
    supportPhone: "+91 95177 22444",
    whatsappNumber: "919517722444",
    legalName: "",
    address: "",
    gstin: "",
  },
  alerts: {
    recipients: [],
    enabled: { signups: true, leads: true, payments: true, payouts: true, resellers: true, orders: true, contact: true, system: true, digest: true },
  },
  email: { fromName: "DigitalCarda", replyTo: "" },
  security: { attemptsPerIp: 8, attemptsPerAccount: 10, adminSessionDays: 7, adminIpAllowlist: [] },
};

/** Which alert group an email template belongs to. Templates not listed here
    are customer emails and are never gated by the alert switches. */
export const ALERT_KIND_BY_TEMPLATE: Record<string, AlertKind> = {
  newSignupAdminEmail: "signups",
  referralSignupAdminEmail: "signups",
  leadNotificationEmail: "leads",
  hotLeadEmail: "leads",
  paymentToVerifyAdminEmail: "payments",
  onlineSaleAdminEmail: "payments",
  payoutRequestAdminEmail: "payouts",
  resellerApplicationAdminEmail: "resellers",
  bulkOrderAdmin: "orders",
  bulkOrderAdminEmail: "orders",
  nfcOrderAdmin: "orders",
  contactEnquiryAdmin: "contact",
  contactEnquiryAdminEmail: "contact",
  accountDeletionRequestAdmin: "system",
  paymentSettingsChangedAdminEmail: "system",
  ownerDailyDigestEmail: "digest",
};

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim());

/** IPv4/IPv6 address or CIDR range — what the admin allowlist accepts. */
export const isIpOrCidr = (v: string) =>
  /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(v.trim()) || /^[0-9a-f:]+(\/\d{1,3})?$/i.test(v.trim());
