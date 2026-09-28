import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNotNull, like, notInArray, sql, type SQL } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { emailLogs, users } from "@db/schema";
import {
  MANUAL_EMAIL_LIMITS, MANUAL_TEMPLATES,
  type CustomMessageInput, type EmailOptions, type EmailPreview, type ManualTemplateKey, type RecentEmail, type SendResult,
} from "@contracts/customer-email";
import {
  resolveRecipient, templateAvailability, templateCategory, optedOut, buildEmail, cleanCustom, preheaderOf,
  previewWarnings, planLabel, loggedKind, manualKinds, templateKind, TIPS_KINDS, OWNER_ALERT_KINDS, EmailBuildError, type Recipient,
} from "./lib/customer-email";
import { oneLine } from "./lib/email/manual";
import { whenIst } from "./lib/email/kit";
import { enforceRateLimit } from "./lib/rate-limit";
import { sendEmail, CAPTURED_NOTE } from "./lib/mail";
import { notifyUser } from "./lib/notify";

/* Admin → Customers → ⋮ → Send email (contracts/customer-email.ts).
 *
 *   options  what can be sent to this customer right now, what they got lately,
 *            and how many more sends the limits allow        (customers → view)
 *   preview  the email exactly as it would go out, plus a hash (customers → view)
 *   send     rebuilds it, refuses if it no longer matches the preview, checks
 *            the limits (one send at a time per admin and per customer),
 *            then sends and logs it by hand                  (customers → manage)
 *
 * The customer is always an id (userId or legacyId, flat so the staff guard in
 * api/lib/staff-access.ts sees userId); the address comes from the database,
 * never from the browser. The email is built only on the server, by
 * api/lib/customer-email.ts, for the preview and the send alike. */

type Db = ReturnType<typeof getDb>;
const L = MANUAL_EMAIL_LIMITS;
const HOUR_S = 3600;
const DAY_S = 86_400;

const KEYS = MANUAL_TEMPLATES.map((t) => t.key) as [ManualTemplateKey, ...ManualTemplateKey[]];
const who = {
  userId: z.number().int().positive().optional(),
  legacyId: z.number().int().positive().optional(),
};
const oneCustomer = (v: { userId?: number; legacyId?: number }) => (v.userId == null) !== (v.legacyId == null);
const PICK_ONE = { message: "Pick one customer." };
// Generous caps against abuse; cleanCustom() applies the real limits with a readable message.
const customInput = z.object({ subject: z.string().max(1000), message: z.string().max(20_000), promotional: z.boolean() });
const sendInput = z.object({
  ...who,
  template: z.enum(KEYS),
  custom: customInput.optional(),
  previewHash: z.string().regex(/^[a-f0-9]{64}$/),
  requestId: z.uuid(),
  confirmResend: z.boolean().optional(),
}).refine(oneCustomer, PICK_ONE);
type SendInput = z.infer<typeof sendInput>;

async function recipientOf(db: Db, ref: { userId?: number; legacyId?: number }): Promise<Recipient> {
  const r = await resolveRecipient(db, ref);
  if (!r) throw new TRPCError({ code: "NOT_FOUND", message: "That customer isn't in the list any more. Refresh the page." });
  return r;
}

function build(r: Recipient, key: ManualTemplateKey, custom?: Partial<CustomMessageInput> | null) {
  try {
    return buildEmail(r, key, custom);
  } catch (e) {
    if (e instanceof EmailBuildError) throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
    throw e;
  }
}

/* ── Counting what was sent (email_logs) ─────────────────────────────────── */

// Sent by hand, and really sent: a failed or skipped send doesn't count against
// anyone, and locally a dev-mailbox capture stands in for a delivery. Every
// limit is counted this way, from the log, so it survives a restart.
const BY_HAND = like(emailLogs.kind, "manual:%");
const DELIVERED = sql`(${emailLogs.status} = 'sent' OR (${emailLogs.status} = 'skipped' AND ${emailLogs.error} LIKE ${`${CAPTURED_NOTE}%`}))`;
// Compared on the database clock, the one that stamped created_at.
const within = (seconds: number) => sql`${emailLogs.createdAt} > NOW() - INTERVAL ${seconds} SECOND`;
const fromEpoch = (v: unknown) => (v == null || !Number.isFinite(Number(v)) ? null : new Date(Number(v) * 1000));

/** How many log rows match, and the newest of them. */
async function tally(db: Db, ...where: SQL[]) {
  const [row] = await db.select({
    n: sql<number>`COUNT(*)`,
    newest: sql<number | null>`UNIX_TIMESTAMP(MAX(${emailLogs.createdAt}))`,
  }).from(emailLogs).where(and(...where));
  return { n: Number(row?.n) || 0, newest: fromEpoch(row?.newest) };
}

const after = (d: Date | null, seconds: number) => whenIst(new Date((d ? d.getTime() : Date.now()) + seconds * 1000));
const minutes = (s: number) => (s < 60 ? "under a minute" : `${Math.ceil(s / 60)} minutes`);
const tooMany = (message: string) => new TRPCError({ code: "TOO_MANY_REQUESTS", message });

/** When a limit of `limit` rows per `seconds` opens again: once fewer than
    `limit` are left in the window, i.e. when the limit-th newest row drops out.
    That is the oldest only while there are exactly `limit` — automatic emails
    count towards the tips limit too, so there can be more. `where` includes the window. */
async function reopensAfter(db: Db, limit: number, seconds: number, where: SQL[]): Promise<string> {
  const [row] = await db.select({ at: sql<number>`UNIX_TIMESTAMP(${emailLogs.createdAt})` }).from(emailLogs)
    .where(and(...where)).orderBy(desc(emailLogs.createdAt), desc(emailLogs.id)).limit(1).offset(limit - 1);
  return after(fromEpoch(row?.at), seconds);
}

/** The last 8 emails that went to this customer's address, newest first —
    never an owner alert, even when their address is also the team's inbox. */
async function recentFor(db: Db, r: Recipient): Promise<RecentEmail[]> {
  const addr = r.email.toLowerCase();
  if (!addr) return [];
  const rows = await db.select({
    at: sql<number>`UNIX_TIMESTAMP(${emailLogs.createdAt})`,
    subject: emailLogs.subject, kind: emailLogs.kind, status: emailLogs.status, sender: users.fullName,
  }).from(emailLogs).leftJoin(users, eq(users.id, emailLogs.sentBy))
    // A row with no kind can't be told apart from an old owner alert, so it's left out too.
    .where(and(eq(emailLogs.toEmail, addr), isNotNull(emailLogs.kind), notInArray(emailLogs.kind, OWNER_ALERT_KINDS)))
    .orderBy(desc(emailLogs.createdAt), desc(emailLogs.id)).limit(8);
  return rows.map((x) => {
    const byHand = !!x.kind?.startsWith("manual:");
    return {
      at: (fromEpoch(x.at) ?? new Date()).toISOString(), subject: x.subject, kind: x.kind ?? "",
      status: x.status, byHand, sentBy: byHand ? x.sender ?? null : null,
    };
  });
}

/** The same email, for the cooldown and the "already got this" warning: the
    template's sends by hand — and for a custom message, only one with this
    subject (the message itself isn't kept). */
const sameEmail = (key: ManualTemplateKey, subject: string): SQL[] =>
  key === "custom" ? [inArray(emailLogs.kind, manualKinds(key)), eq(emailLogs.subject, subject.slice(0, 300))] : [inArray(emailLogs.kind, manualKinds(key))];

/** The newest email of this template they got in the last week, by hand or
    automatically; for a custom message, the newest with the same subject. */
async function lastSentThisWeek(db: Db, r: Recipient, key: ManualTemplateKey, subject: string) {
  if (!r.email) return null;
  const kinds = key === "custom" ? sameEmail(key, subject) : [inArray(emailLogs.kind, [templateKind(key), ...manualKinds(key)])];
  const [row] = await db.select({ kind: emailLogs.kind, at: sql<number>`UNIX_TIMESTAMP(${emailLogs.createdAt})` })
    .from(emailLogs)
    .where(and(eq(emailLogs.toEmail, r.email.toLowerCase()), ...kinds, DELIVERED, within(7 * DAY_S)))
    .orderBy(desc(emailLogs.createdAt)).limit(1);
  const at = fromEpoch(row?.at);
  return row && at ? { at, byHand: !!row.kind?.startsWith("manual:") } : null;
}

/** Every limit, from the log. The caller holds this admin's and this address's
    locks, so no other send can slip into those counts while they're read (the
    team-wide one can be off by what other admins have in flight). Throws with
    a message that says when sending is possible again. */
async function checkLimits(db: Db, adminId: number, r: Recipient, email: { key: ManualTemplateKey; subject: string; tips: boolean }, confirmResend: boolean): Promise<void> {
  const addr = r.email.toLowerCase();
  const w = {
    global: [BY_HAND, DELIVERED, within(DAY_S)],
    mine: [eq(emailLogs.sentBy, adminId), BY_HAND, DELIVERED, within(HOUR_S)],
    theirs: [eq(emailLogs.toEmail, addr), BY_HAND, DELIVERED, within(DAY_S)],
    tips: [eq(emailLogs.toEmail, addr), inArray(emailLogs.kind, TIPS_KINDS), DELIVERED, within(7 * DAY_S)],
  };
  const [global, mine, theirs, tipsSent, again] = await Promise.all([
    tally(db, ...w.global),
    tally(db, ...w.mine),
    tally(db, ...w.theirs),
    email.tips ? tally(db, ...w.tips) : null,
    tally(db, eq(emailLogs.toEmail, addr), ...sameEmail(email.key, email.subject), DELIVERED, within(L.sameTemplateCooldownMin * 60)),
  ]);
  if (global.n >= L.globalPerDay) {
    throw tooMany(`The team has sent ${L.globalPerDay} emails by hand in the last 24 hours, the daily limit. Sending opens again after ${await reopensAfter(db, L.globalPerDay, DAY_S, w.global)}.`);
  }
  if (mine.n >= L.perAdminPerHour) {
    throw tooMany(`You've sent ${L.perAdminPerHour} emails by hand in the last hour, the hourly limit. You can send again after ${await reopensAfter(db, L.perAdminPerHour, HOUR_S, w.mine)}.`);
  }
  if (theirs.n >= L.perRecipientPerDay) {
    throw tooMany(`They've had ${L.perRecipientPerDay} emails from the team in the last 24 hours. You can email them again after ${await reopensAfter(db, L.perRecipientPerDay, DAY_S, w.theirs)}.`);
  }
  if (tipsSent && tipsSent.n >= L.tipsPerRecipientPerWeek) {
    throw tooMany(`They got a tips & news email on ${tipsSent.newest ? whenIst(tipsSent.newest) : "this week"}; the next one can go after ${await reopensAfter(db, L.tipsPerRecipientPerWeek, 7 * DAY_S, w.tips)}.`);
  }
  if (again.n && !confirmResend) {
    const ago = again.newest ? Math.max(0, Math.round((Date.now() - again.newest.getTime()) / 1000)) : 0;
    // Its own code, so the modal can ask "send it again anyway?" and retry with confirmResend.
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: `You sent them this email ${minutes(ago)} ago. Send it again anyway?` });
  }
}

// sendEmail's answers for a mail it didn't even try to send.
const NOT_ATTEMPTED = new Set(["No recipient", "Placeholder address", "Deleted account", "Alert switched off", "SMTP not configured"]);
// One send at a time per address and per admin, held from before the limits
// are counted until the send is logged, so two racing sends can't both pass them.
const inFlight = new Set<string>();
const adminSending = new Set<number>();

async function deliver(adminId: number, input: SendInput): Promise<SendResult> {
  const db = getDb();
  const r = await recipientOf(db, input);
  // Rebuilding re-checks that they may be emailed and that the template still fits.
  const { email, hash } = build(r, input.template, input.custom);
  const custom = input.template === "custom" ? cleanCustom(input.custom) : null;
  const promotional = !!(custom?.ok && custom.value.promotional);
  const category = templateCategory(input.template, { promotional });
  if (optedOut(r, category)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: category === "plan" ? "They've switched off plan and trial emails." : "They've switched off tips and news." });
  }
  if (hash !== input.previewHash) {
    throw new TRPCError({ code: "CONFLICT", message: "This email changed since you previewed it — review it again." });
  }

  const addr = r.email.toLowerCase();
  if (adminSending.has(adminId)) throw tooMany("Still sending your last email — try again in a moment.");
  if (inFlight.has(addr)) throw tooMany("An email to them is on its way. Give it a moment.");
  adminSending.add(adminId);
  inFlight.add(addr);
  try {
    await checkLimits(db, adminId, r, { key: input.template, subject: email.subject, tips: category === "tips" }, !!input.confirmResend);
    // sendEmail waits for the log row of a send by hand, so the next count sees it.
    const res = await sendEmail(r.email, { ...email, kind: loggedKind(input.template, promotional) }, undefined, { sentBy: adminId });
    // A service message also lands in their bell. Never a promotion.
    if (res.ok && custom?.ok && !promotional && r.userId) {
      const m = oneLine(custom.value.message);
      await notifyUser({
        userId: r.userId, type: "team_message", title: custom.value.subject,
        message: m.length > 200 ? `${m.slice(0, 199).trimEnd()}…` : m, link: null,
      }, db);
    }
    const status: SendResult["status"] = res.ok ? (res.captured ? "captured" : "sent") : NOT_ATTEMPTED.has(res.error ?? "") ? "skipped" : "failed";
    return { status, error: res.ok ? null : res.error || "The email wasn't sent.", to: r.email };
  } finally {
    adminSending.delete(adminId);
    inFlight.delete(addr);
  }
}

/* A double click or a retry must never send twice. The modal makes a requestId
   for each send; the first request with it does the work, and a repeat within
   10 minutes gets that same result. The id is claimed before anything is
   awaited, so two requests racing each other can't both send. A send that
   didn't go out (failed/skipped) or was refused frees its id for a retry. */
type Flight = { fingerprint: string; at: number; result: Promise<SendResult> };
const flights = new Map<string, Flight>();
const FLIGHT_MS = 10 * 60_000;

export const customerEmailRouter = createRouter({
  options: adminQuery
    .input(z.object(who).refine(oneCustomer, PICK_ONE))
    .query(async ({ ctx, input }): Promise<EmailOptions> => {
      const db = getDb();
      const r = await recipientOf(db, input);
      const now = Date.now();
      const addr = r.email.toLowerCase();
      // Nothing can be sent to a blocked recipient (an erased, hidden or
      // non-customer account), so their email history isn't shown either.
      const open = addr && !r.blocked;
      const [recent, lately, mine, theirs] = await Promise.all([
        open ? recentFor(db, r) : [],
        open
          ? db.select({ kind: emailLogs.kind, at: sql<number>`UNIX_TIMESTAMP(MAX(${emailLogs.createdAt}))` }).from(emailLogs)
            .where(and(eq(emailLogs.toEmail, addr), BY_HAND, DELIVERED, within(L.sameTemplateCooldownMin * 60)))
            .groupBy(emailLogs.kind)
          : [],
        tally(db, eq(emailLogs.sentBy, ctx.user.id), BY_HAND, DELIVERED, within(HOUR_S)),
        addr ? tally(db, eq(emailLogs.toEmail, addr), BY_HAND, DELIVERED, within(DAY_S)) : { n: 0 },
      ]);
      const lastByKind = new Map(lately.map((x) => [x.kind ?? "", Number(x.at) || 0]));
      return {
        recipient: {
          name: r.name, email: r.email, source: r.source, planLabel: planLabel(r, now), emailVerified: r.emailVerified,
          optedOut: { plan: optedOut(r, "plan"), tips: optedOut(r, "tips") },
        },
        blocked: r.blocked,
        templates: MANUAL_TEMPLATES.map((t) => {
          const { available, reason } = templateAvailability(r, t.key, now);
          // A custom message is "the same email" only with the same subject,
          // which isn't known yet: send's PRECONDITION_FAILED decides.
          const last = t.key === "custom" ? 0 : Math.max(0, ...manualKinds(t.key).map((k) => lastByKind.get(k) ?? 0));
          return {
            key: t.key, available, reason,
            optedOut: optedOut(r, templateCategory(t.key)),
            recentlySentAt: last ? new Date(last * 1000).toISOString() : null,
          };
        }),
        recent,
        remaining: {
          adminThisHour: Math.max(0, L.perAdminPerHour - mine.n),
          recipientToday: Math.max(0, L.perRecipientPerDay - theirs.n),
        },
      };
    }),

  preview: adminQuery
    .input(z.object({ ...who, template: z.enum(KEYS), custom: customInput.optional() }).refine(oneCustomer, PICK_ONE))
    .query(async ({ ctx, input }): Promise<EmailPreview> => {
      enforceRateLimit(`manual-mail-preview:${ctx.user.id}`, 60, 60_000);
      const db = getDb();
      const r = await recipientOf(db, input);
      const { email, hash } = build(r, input.template, input.custom);
      const custom = input.template === "custom" ? cleanCustom(input.custom) : null;
      // The same check the send's cooldown makes, so the modal asks once.
      const [again] = await db.select({ at: sql<number>`UNIX_TIMESTAMP(${emailLogs.createdAt})` }).from(emailLogs)
        .where(and(eq(emailLogs.toEmail, r.email.toLowerCase()), ...sameEmail(input.template, email.subject), DELIVERED, within(L.sameTemplateCooldownMin * 60)))
        .orderBy(desc(emailLogs.createdAt)).limit(1);
      return {
        subject: email.subject,
        preheader: preheaderOf(email.html),
        html: email.html,
        text: email.text,
        sizeKb: Math.round(Buffer.byteLength(email.html, "utf8") / 102.4) / 10,
        warnings: previewWarnings(r, input.template, custom?.ok ? custom.value : null, await lastSentThisWeek(db, r, input.template, email.subject)),
        sameEmailAt: r.email ? fromEpoch(again?.at)?.toISOString() ?? null : null,
        hash,
      };
    }),

  send: adminQuery
    .input(sendInput)
    .mutation(async ({ ctx, input }): Promise<SendResult> => {
      const now = Date.now();
      for (const [k, f] of flights) if (now - f.at > FLIGHT_MS) flights.delete(k);
      const key = `${ctx.user.id}:${input.requestId}`;
      const fingerprint = JSON.stringify([input.userId ?? null, input.legacyId ?? null, input.template, input.custom ?? null, input.previewHash]);
      const seen = flights.get(key);
      if (seen) {
        if (seen.fingerprint !== fingerprint) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This send was already used for a different email. Preview it again." });
        }
        return seen.result;
      }
      const result = deliver(ctx.user.id, input);
      flights.set(key, { fingerprint, at: now, result });
      result.then(
        (res) => { if (res.status === "failed" || res.status === "skipped") flights.delete(key); },
        () => flights.delete(key),
      );
      return result;
    }),
});
