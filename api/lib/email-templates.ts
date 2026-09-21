/*
 * Every DigitalCarda email, in one import.
 *
 * The templates live in api/lib/email/, one module per area, all built on the
 * shared kit (api/lib/email/kit.ts) so they look like one family. This file
 * only re-exports them, so callers keep importing from "./lib/email-templates".
 * Previews with sample data for every template are in api/lib/email/previews/
 * and show up in Admin → Email previews.
 */

export type { Email } from "./email/kit";
export { inr } from "./email/kit";

export * from "./email/account";
export * from "./email/lifecycle";
export * from "./email/billing";
export * from "./email/nfc";
export * from "./email/leads";
export * from "./email/referral";
export * from "./email/reseller";
export * from "./email/admin";
export * from "./email/marketing";
