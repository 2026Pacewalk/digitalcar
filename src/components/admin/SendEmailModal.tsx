import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Mail, Send, Loader2, Monitor, Smartphone, FileText, AlertTriangle, CheckCircle2, XCircle, MinusCircle,
  ChevronDown, Inbox, ShieldAlert, FlaskConical, ExternalLink, PenLine, Clock, BellOff, RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { readableError } from "@/lib/errors";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { kindLabel } from "@/pages/admin/EmailLog";
import EmailFrame, { type EmailDevice } from "@/components/admin/EmailFrame";
import { exactTime } from "@contracts/notifications";
import {
  MANUAL_EMAIL_LIMITS as LIMITS, MANUAL_TEMPLATES, TEMPLATE_GROUPS,
  type CustomMessageInput, type EmailOptions, type EmailPreview, type ManualTemplateKey, type RecentEmail,
  type RecipientRef, type SendResult, type TemplateCategory, type TemplateOption,
} from "@contracts/customer-email";

/* Admin → Customers → ⋮ → Send email.

   One customer, one email: pick a template or write a message, check the
   preview, send. The server decides everything that matters (which templates
   fit this customer, what the email says, whether it may go), and the preview
   is built by the same code as the send (contracts/customer-email.ts). This
   page names the customer by id only and hands back the preview's hash, so
   what the admin approved is what goes out: if the customer's details changed
   in between, the server refuses and the page shows the new version. */

type Step =
  | { kind: "compose" }
  | { kind: "confirm"; resend: boolean; reason: string | null }
  | { kind: "result"; result: SendResult; subject: string };

const EMPTY: CustomMessageInput = { subject: "", message: "", promotional: false };
const LINK_RE = /https?:\/\/[^\s<>"']+/gi;
// Gmail cuts a message off above ~102 KB behind "View entire message".
const GMAIL_CLIP_KB = 102;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

const OPTED_OUT: Record<TemplateCategory, string> = { service: "these emails", plan: "plan emails", tips: "tips & news" };
const DOT: Record<RecentEmail["status"], string> = { sent: "bg-[#22C55E]", failed: "bg-[#EF4444]", skipped: "bg-[#94A3B8]" };
const STATUS_WORD: Record<RecentEmail["status"], string> = { sent: "Sent", failed: "Failed", skipped: "Skipped" };

/* One id per email composed. The server answers a repeat of the same id with
   the first result, so a double click or a retry after a dropped connection
   can't send twice. randomUUID needs a secure context, which a LAN address in
   development isn't, hence the fallback. */
const newRequestId = (): string => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

const linkCount = (s: string) => (s.match(LINK_RE) ?? []).length;
// The server's own rule (api/lib/customer-email.ts cleanCustom): a subject of 3+ characters and a message.
const SUBJECT_MIN = 3;
const messageReady = (c: CustomMessageInput) => c.subject.trim().length >= SUBJECT_MIN && !!c.message.trim();
const firstName = (n: string) => (n || "").trim().split(/\s+/)[0] || "this customer";
const initials = (n: string) => (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const errorCode = (e: unknown) => (e as { data?: { code?: string } } | null)?.data?.code ?? null;
// A repeat of the same email inside the cooldown is refused with its own code
// until the admin confirms it (api/customer-email-router.ts checkLimits).
const asksToResend = (code: string | null, msg: string) => code === "PRECONDITION_FAILED" || /again anyway\?/i.test(msg);

function ago(at: string): string {
  const t = new Date(at).getTime();
  if (Number.isNaN(t)) return "";
  const min = Math.floor(Math.max(0, Date.now() - t) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${plural(d, "day")} ago`;
  return new Date(t).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
}

const PILL = {
  slate: "bg-[#F1F5F9] text-[#475569]",
  gold: "bg-[#FEF3C7] text-[#92400E]",
  amber: "bg-[#FFEDD5] text-[#9A3412]",
  blue: "bg-[#E0F2FE] text-[#0369A1]",
} as const;

function Pill({ tone, icon: Icon, title, children }: { tone: keyof typeof PILL; icon?: LucideIcon; title?: string; children: React.ReactNode }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${PILL[tone]}`}>
      {Icon && <Icon size={10} aria-hidden />}{children}
    </span>
  );
}

function Note({ tone, icon: Icon, children }: { tone: "amber" | "red" | "blue"; icon: LucideIcon; children: React.ReactNode }) {
  const cls = tone === "red" ? "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
    : tone === "amber" ? "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
    : "border-[#BFDBFE] bg-[#EFF6FF] text-[#1E3A8A]";
  return (
    <div className={`flex gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] leading-relaxed ${cls}`}>
      <Icon size={15} className="mt-0.5 shrink-0" aria-hidden /><div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: readonly (readonly [T, string, LucideIcon])[];
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg bg-white p-0.5 ring-1 ring-[#E2E8F0]">
      {options.map(([k, text, Icon]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold transition-colors ${value === k ? "bg-[#0F172A] text-white" : "text-[#475569] hover:text-[#0F172A]"}`}>
          <Icon size={13} aria-hidden /> {text}
        </button>
      ))}
    </div>
  );
}

function EmptyPreview({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex max-w-xs flex-col items-center self-center py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#E2E8F0]"><Icon size={20} className="text-[#94A3B8]" aria-hidden /></span>
      <p className="mt-3 text-[13.5px] font-semibold text-[#334155]">{title}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[#94A3B8]">{text}</p>
    </div>
  );
}

const RESULT: Record<SendResult["status"], { icon: LucideIcon; ring: string; title: (first: string) => string; text: string }> = {
  sent: { icon: CheckCircle2, ring: "bg-[#DCFCE7] text-[#16A34A]", title: (f) => `Sent to ${f}`, text: "Handed to the mail server — it's in the Email Log." },
  captured: { icon: FlaskConical, ring: "bg-[#E0F2FE] text-[#0369A1]", title: () => "Captured, not delivered", text: "Captured in the dev mailbox — not delivered (no SMTP here)." },
  failed: { icon: XCircle, ring: "bg-[#FEE2E2] text-[#DC2626]", title: () => "It didn't go out", text: "The mail server didn't accept it." },
  skipped: { icon: MinusCircle, ring: "bg-[#F1F5F9] text-[#475569]", title: () => "Not sent", text: "It was never handed to the mail server." },
};

export default function SendEmailModal({ recipient, name, email, returnFocus, onClose }: {
  /** The customer by id; the server looks up their address itself. */
  recipient: RecipientRef;
  /** From the list row, shown until the server's own copy loads. */
  name: string;
  email: string;
  /** Where focus goes back on close, e.g. the row's ⋮ button. The menu item
      that opened the modal is gone by the time it mounts. */
  returnFocus?: HTMLElement | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const { canOpenPath } = useStaffAccess();
  const uid = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  // When the second look opened: the click that opened it mustn't also confirm it.
  const confirmShownAt = useRef(0);

  // Never from cache: the recent emails and the limits must be as they are now.
  const optionsQ = trpc.customerEmail.options.useQuery(recipient, { refetchOnWindowFocus: false, retry: false, gcTime: 0, refetchOnMount: "always" });
  const opts: EmailOptions | undefined = optionsQ.data;
  const toName = opts?.recipient.name || name;
  const toEmail = opts?.recipient.email || email;
  const first = firstName(toName);
  const blocked = opts?.blocked ?? null;

  const [template, setTemplate] = useState<ManualTemplateKey | null>(null);
  const [custom, setCustom] = useState<CustomMessageInput>(EMPTY);
  // The message the preview is built from: what it said 500 ms after the last keystroke.
  const [settled, setSettled] = useState<CustomMessageInput>(EMPTY);
  const [requestId, setRequestId] = useState(newRequestId);
  const [step, setStep] = useState<Step>({ kind: "compose" });
  const [sendError, setSendError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false); // the last send was refused because the email changed
  const [askDiscard, setAskDiscard] = useState(false);
  const [view, setView] = useState<"email" | "text">("email");
  // On a phone the desktop width would only scroll sideways, so start narrow there.
  const [device, setDevice] = useState<EmailDevice>(() => (typeof window !== "undefined" && window.innerWidth < 700 ? "phone" : "desktop"));
  const [previewOpen, setPreviewOpen] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSettled(custom), 500);
    return () => clearTimeout(t);
  }, [custom]);

  const byKey = useMemo(() => new Map((opts?.templates ?? []).map((t) => [t.key, t])), [opts]);
  // A template the server didn't list for this customer can't be sent to them.
  const optionOf = (k: ManualTemplateKey): TemplateOption =>
    byKey.get(k) ?? { key: k, available: false, reason: "Not offered for this customer.", optedOut: false, recentlySentAt: null };
  const chosen = template ? optionOf(template) : null;
  const isCustom = template === "custom";
  const links = linkCount(custom.message);
  const typing = isCustom && settled !== custom;

  const canPreview = !!opts && !blocked && !!chosen?.available && (!isCustom || messageReady(settled));
  const previewQ = trpc.customerEmail.preview.useQuery(
    { ...recipient, template: template ?? "custom", custom: isCustom ? settled : undefined },
    {
      enabled: canPreview,
      retry: false,
      refetchOnWindowFocus: false,
      // While an edited message rebuilds, keep its last preview on screen; a
      // different template starts from a clean slate instead. Only while the
      // query runs: once the message is no longer sendable nothing rebuilds,
      // and the old preview would sit there "Updating…" for good.
      placeholderData: canPreview
        ? (prev, prevQuery) =>
          (prevQuery?.queryKey as unknown as [unknown, { input?: { template?: string } }?] | undefined)?.[1]?.input?.template === template ? prev : undefined
        : undefined,
    },
  );
  const preview: EmailPreview | undefined = previewQ.data;
  const previewError = previewQ.error ? readableError(previewQ.error, "Couldn't build this email.") : null;
  const updating = typing || previewQ.isFetching || previewQ.isPlaceholderData;
  const fresh = canPreview && !!preview && !updating && !previewQ.error;

  const quota = !opts ? null
    : opts.remaining.adminThisHour <= 0 ? `You've sent ${LIMITS.perAdminPerHour} emails this hour, the most allowed. Try again later.`
    : opts.remaining.recipientToday <= 0 ? `${first} has had ${LIMITS.perRecipientPerDay} emails from the team today, the most allowed. Try again tomorrow.`
    : null;
  // The server refuses email the customer switched off, so don't offer to send
  // it: a template by its own category, a custom message only when it's a
  // promotion (which counts as tips & news).
  const category: TemplateCategory = isCustom ? (custom.promotional ? "tips" : "service")
    : MANUAL_TEMPLATES.find((t) => t.key === template)?.category ?? "service";
  const switchedOff = !!chosen?.optedOut || (category !== "service" && !!opts?.recipient.optedOut?.[category]);
  const optedOutOf = switchedOff ? OPTED_OUT[category] : null;
  const canSend = fresh && !quota && !!chosen?.available && !optedOutOf;
  // A repeat inside the cooldown, as the preview's server-side check found it
  // (a custom message only repeats one with the same subject) — so the second
  // look already asks "send again", and the send carries confirmResend.
  const recentAt = preview?.sameEmailAt ?? null;
  const warnings = preview?.warnings ?? [];

  const send = trpc.customerEmail.send.useMutation();
  const sending = send.isPending;
  const renewId = () => setRequestId(newRequestId());
  const succeeded = step.kind === "result" && (step.result.status === "sent" || step.result.status === "captured");
  const dirty = !succeeded && !!(custom.subject.trim() || custom.message.trim());

  const requestClose = () => {
    if (sending) return;
    if (dirty) setAskDiscard(true);
    else onClose();
  };

  // Esc steps back one level: the discard question, then the send confirmation, then the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (askDiscard) setAskDiscard(false);
      else if (step.kind === "confirm") setStep({ kind: "compose" });
      else requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Focus moves into the dialog and, on close, back to returnFocus (the row's
  // ⋮ button), else to whatever had it before, if either is still on the page.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      const back = [returnFocus, before].find((el) => el?.isConnected && el !== document.body);
      back?.focus();
    };
  }, [returnFocus]);

  // Going back from the second look or the result, or closing the discard
  // question, removes the focused button. Put focus on the dialog itself
  // rather than lose it to the page behind.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
  }, [step.kind, askDiscard]);

  // Tab stays inside the dialog (or inside the discard question while it's open).
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const root = askDiscard ? discardRef.current : dialogRef.current;
    if (!root) return;
    const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
    if (!items.length) return;
    const head = items[0], tail = items[items.length - 1];
    const active = document.activeElement;
    // Focus on the dialog box itself counts as outside: Shift+Tab from it would leave.
    const outside = !root.contains(active) || active === root;
    if (e.shiftKey && (active === head || outside)) { e.preventDefault(); tail.focus(); }
    else if (!e.shiftKey && (active === tail || outside)) { e.preventDefault(); head.focus(); }
  };

  const clearNotes = () => { setSendError(null); setChanged(false); };
  const openConfirm = (resend: boolean, reason: string | null) => {
    confirmShownAt.current = performance.now();
    setStep({ kind: "confirm", resend, reason });
  };
  const pick = (k: ManualTemplateKey) => {
    if (!optionOf(k).available || k === template) return;
    setTemplate(k);
    renewId();
    clearNotes();
    setStep({ kind: "compose" });
  };
  const edit = (patch: Partial<CustomMessageInput>) => {
    setCustom((c) => ({ ...c, ...patch }));
    renewId();
    clearNotes();
    if (step.kind === "confirm") setStep({ kind: "compose" });
  };
  const startOver = () => {
    setTemplate(null);
    setCustom(EMPTY);
    setSettled(EMPTY);
    clearNotes();
    setStep({ kind: "compose" });
  };

  const doSend = async (confirmResend: boolean) => {
    if (!template || !preview || sending) return;
    clearNotes();
    try {
      const result: SendResult = await send.mutateAsync({
        ...recipient,
        template,
        custom: isCustom ? settled : undefined,
        previewHash: preview.hash,
        requestId,
        ...(confirmResend ? { confirmResend: true } : {}),
      });
      renewId();
      setStep({ kind: "result", result, subject: preview.subject });
      void utils.customerEmail.options.invalidate();
    } catch (e) {
      const code = errorCode(e);
      const msg = readableError(e, "Couldn't send the email. Try again.");
      // A refusal means nothing went out, so the next try is a new request. A
      // dropped connection keeps the id: if the first attempt did go out, the
      // server answers the retry with that result instead of sending again.
      if (code && code !== "INTERNAL_SERVER_ERROR" && code !== "TIMEOUT" && code !== "CLIENT_CLOSED_REQUEST") renewId();
      if (!confirmResend && asksToResend(code, msg)) {
        openConfirm(true, msg);
      } else if (code === "CONFLICT") {
        // Their plan, trial or card moved on since the preview: show the new version.
        setStep({ kind: "compose" });
        setChanged(true);
        void previewQ.refetch();
        void utils.customerEmail.options.invalidate();
      } else {
        setStep({ kind: "compose" });
        setSendError(msg);
      }
    }
  };

  const onSendClick = () => {
    if (!canSend || sending) return;
    // Anything the server flagged, or a repeat inside the cooldown, gets a second look first.
    if (warnings.length || recentAt) openConfirm(!!recentAt, null);
    else void doSend(false);
  };
  /* The second look's send button sits about where Send was, so the second
     click of a double click (or a quick repeat) would land on it and skip the
     look. Take a single click only, and none in its first moments. */
  const onConfirmClick = (e: React.MouseEvent) => {
    if (step.kind !== "confirm" || e.detail > 1 || performance.now() - confirmShownAt.current < 400) return;
    void doSend(step.resend);
  };

  const statusLine = blocked ? ""
    : !opts ? (optionsQ.error ? "" : "Loading…")
    : quota ? quota
    : !template ? "Pick an email to send."
    : !chosen?.available ? chosen?.reason || `This email doesn't apply to ${first} right now.`
    : optedOutOf ? (isCustom
      ? `${first} switched off tips & news, so a promotion can't be sent. Turn off 'This is a promotion' to send it as a service message.`
      : `${first} switched ${optedOutOf} off in the app, so this can't be sent.`)
    : isCustom && !messageReady(custom) ? `Add a subject (${SUBJECT_MIN} characters or more) and a message.`
    : previewError ? "The preview has a problem — see above."
    : !fresh ? "Updating the preview…"
    : `What you see is exactly what ${first} will get.`;

  /* ── Left: who, which email, and what they've had lately ── */

  const recipientCard = (
    <div className="flex items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3.5">
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full gradient-gold text-[13px] font-extrabold text-[#0F172A]">{initials(toName)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[15px] font-bold text-[#0F172A]">{toName || "Customer"}</p>
        <p className="break-all text-[12.5px] text-[#475569]">{toEmail}</p>
        {opts && (opts.recipient.source === "old_site" || opts.recipient.planLabel || opts.recipient.emailVerified === false) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {opts.recipient.source === "old_site" && <Pill tone="slate" title="From the old DigitalCarda site, before accounts">Old-site customer</Pill>}
            {opts.recipient.planLabel && <Pill tone="gold">{opts.recipient.planLabel}</Pill>}
            {opts.recipient.emailVerified === false && (
              <Pill tone="amber" icon={AlertTriangle} title="They haven't confirmed this address, so it may not reach them">Unverified email</Pill>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const editor = (
    <div className="mt-2.5 space-y-3.5 rounded-xl border border-[#F7B31C]/35 bg-[#FFFBEB]/50 p-3.5">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={`${uid}-subject`} className="text-xs font-semibold text-[#334155]">Subject</label>
          <span className={`text-[11px] tabular-nums ${custom.subject.length >= LIMITS.subjectMax ? "font-semibold text-[#B45309]" : "text-[#94A3B8]"}`}>{custom.subject.length}/{LIMITS.subjectMax}</span>
        </div>
        <input id={`${uid}-subject`} value={custom.subject} maxLength={LIMITS.subjectMax} onChange={(e) => edit({ subject: e.target.value })}
          placeholder={`e.g. A quick note about your card, ${first}`}
          className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15" />
      </div>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={`${uid}-message`} className="text-xs font-semibold text-[#334155]">Message</label>
          <span className={`text-[11px] tabular-nums ${custom.message.length >= LIMITS.messageMax ? "font-semibold text-[#B45309]" : "text-[#94A3B8]"}`}>{custom.message.length.toLocaleString("en-IN")}/{LIMITS.messageMax.toLocaleString("en-IN")}</span>
        </div>
        <textarea id={`${uid}-message`} value={custom.message} maxLength={LIMITS.messageMax} rows={9} onChange={(e) => edit({ message: e.target.value })}
          aria-describedby={`${uid}-message-help`} placeholder={`Write to ${first} as you would in any email.`}
          className="w-full resize-y rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13.5px] leading-relaxed text-[#0F172A] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15" />
        <p id={`${uid}-message-help`} className="mt-1 text-[11.5px] leading-snug text-[#64748B]">
          Plain text. Blank line = new paragraph. Links become clickable. We add “Hi {first},” and the sign-off, unless you start with your own greeting.
          {links > 0 && <span className={`tabular-nums ${links > LIMITS.linksMax ? "font-semibold text-[#B45309]" : ""}`}> {links}/{LIMITS.linksMax} links.</span>}
        </p>
        {links > LIMITS.linksMax && (
          <p className="mt-1 text-[11.5px] font-semibold text-[#B45309]">Only the first {LIMITS.linksMax} links become clickable; the other {plural(links - LIMITS.linksMax, "stays", "stay")} plain text.</p>
        )}
      </div>
      <div className="flex items-start gap-3 rounded-xl bg-white p-3 ring-1 ring-[#E2E8F0]">
        <button type="button" role="switch" id={`${uid}-promo`} aria-checked={custom.promotional} aria-describedby={`${uid}-promo-help`}
          onClick={() => edit({ promotional: !custom.promotional })}
          className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]/50 ${custom.promotional ? "bg-[#F7B31C]" : "bg-[#CBD5E1]"}`}>
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${custom.promotional ? "translate-x-[18px]" : "translate-x-0.5"}`} />
        </button>
        <span className="min-w-0">
          <label htmlFor={`${uid}-promo`} className="block cursor-pointer text-[13px] font-semibold text-[#0F172A]">This is a promotion</label>
          <span id={`${uid}-promo-help`} className="block text-[11.5px] leading-snug text-[#64748B]">
            An offer or news, not something about their account. Promotions respect {first}&apos;s tips &amp; news setting: if they switched it off, it isn&apos;t sent.
          </span>
        </span>
      </div>
    </div>
  );

  const picker = (
    <div role="radiogroup" aria-label="Email to send" className="space-y-4">
      {TEMPLATE_GROUPS.map((g) => {
        const items = MANUAL_TEMPLATES.filter((t) => t.group === g.key);
        if (!items.length) return null;
        return (
          <div key={g.key}>
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">{g.label}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((t) => {
                const o = optionOf(t.key);
                const on = template === t.key;
                const off = !o.available;
                return (
                  <button key={t.key} type="button" role="radio" aria-checked={on} aria-disabled={off || undefined} onClick={() => pick(t.key)}
                    className={`flex w-full rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]/60 ${t.key === "custom" ? "sm:col-span-2" : ""} ${
                      off ? "cursor-not-allowed border-[#EEF2F6] bg-[#F8FAFC]"
                        : on ? "border-[#F7B31C] bg-[#FFFBEB] shadow-[0_0_0_3px_rgba(247,179,28,0.16)]"
                        : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:shadow-sm"}`}>
                    <span aria-hidden className={`mr-2.5 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-[#F7B31C]" : off ? "border-[#E2E8F0]" : "border-[#CBD5E1]"}`}>
                      {on && <span className="h-2 w-2 rounded-full bg-[#F7B31C]" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13px] font-semibold leading-snug ${off ? "text-[#94A3B8]" : "text-[#0F172A]"}`}>{t.label}</span>
                      <span className={`mt-0.5 block text-[11.5px] leading-snug ${off ? "text-[#94A3B8]" : "text-[#64748B]"}`}>
                        {off ? o.reason || "Doesn't apply to this customer right now." : t.hint}
                      </span>
                      {(o.optedOut || o.recentlySentAt) && (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {o.optedOut && <Pill tone="amber" icon={BellOff} title={`${first} switched ${OPTED_OUT[t.category]} off in the app`}>Opted out</Pill>}
                          {o.recentlySentAt && <Pill tone="blue" icon={Clock} title={exactTime(o.recentlySentAt)}>Sent {ago(o.recentlySentAt)}</Pill>}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {g.key === "message" && isCustom && editor}
          </div>
        );
      })}
    </div>
  );

  const history = opts && !blocked ? (
    <section aria-label={`Recent emails to ${first}`} className="space-y-2.5">
      <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">Recent emails to {first}</h3>
      {opts.recent.length ? (
        <ul className="divide-y divide-[#F1F5F9] rounded-xl border border-[#E2E8F0] bg-white">
          {opts.recent.slice(0, 5).map((r, i) => (
            <li key={`${r.at}-${i}`} className="flex items-start gap-2.5 px-3 py-2.5">
              <span aria-hidden title={STATUS_WORD[r.status]} className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[r.status]}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-[#0F172A]" title={r.subject}>{r.subject}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-[#64748B]">
                  {r.status === "sent" ? <span className="sr-only">Sent · </span>
                    : <span className={`font-semibold ${r.status === "failed" ? "text-[#B91C1C]" : "text-[#475569]"}`}>{STATUS_WORD[r.status]} · </span>}
                  {kindLabel(r.kind.replace(/^manual:/, ""))}
                  {r.byHand && <> · by hand{r.sentBy ? ` · ${r.sentBy}` : ""}</>}
                </span>
              </span>
              <time dateTime={r.at} title={exactTime(r.at)} className="shrink-0 pt-px text-[11px] tabular-nums text-[#94A3B8]">{ago(r.at)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-[#E2E8F0] px-3 py-3 text-[12px] text-[#94A3B8]">Nothing in the Email Log for {first} yet.</p>
      )}
      <p className="text-[11.5px] leading-relaxed tabular-nums text-[#94A3B8]">
        You can send {plural(Math.max(0, opts.remaining.adminThisHour), "more email")} this hour · {first} can get {Math.max(0, opts.remaining.recipientToday)} more today · the same email once every {LIMITS.sameTemplateCooldownMin} min
      </p>
    </section>
  ) : null;

  const left = optionsQ.isLoading ? (
    <div className="space-y-2" aria-busy="true">
      <p className="sr-only">Loading this customer…</p>
      <div className="grid gap-2 sm:grid-cols-2" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className={`h-[74px] animate-pulse rounded-xl bg-[#F1F5F9] ${i === 0 ? "sm:col-span-2" : ""}`} />)}
      </div>
    </div>
  ) : optionsQ.error ? (
    <Note tone="red" icon={AlertTriangle}>
      {readableError(optionsQ.error, "Couldn't load this customer.")}{" "}
      <button type="button" onClick={() => void optionsQ.refetch()} className="font-semibold underline underline-offset-2">Try again</button>
    </Note>
  ) : blocked ? (
    <Note tone="red" icon={ShieldAlert}>
      <b className="font-semibold">{blocked}</b> Nothing can be sent to {first} from here.
    </Note>
  ) : picker;

  /* ── Right: the email exactly as it will arrive ── */

  // A preview can fail for a passing reason (the per-minute preview limit), so offer another go.
  const retryPreview = (
    <button type="button" onClick={() => void previewQ.refetch()} className="font-semibold underline underline-offset-2">Try again</button>
  );

  const previewBody = blocked ? (
    <EmptyPreview icon={Inbox} title="No preview" text="There's nothing to send." />
  ) : !template ? (
    <EmptyPreview icon={Inbox} title="Pick an email" text={`The preview shows exactly what ${first} will get: subject, design and all.`} />
  ) : !preview && isCustom && !messageReady(custom) ? (
    <EmptyPreview icon={PenLine} title="Write your message" text="Add a subject and a message. The preview builds as you type." />
  ) : !preview && previewError ? (
    <div className="w-full max-w-lg self-start"><Note tone="red" icon={AlertTriangle}>{previewError} {retryPreview}</Note></div>
  ) : !preview ? (
    <div className="flex items-center gap-2 self-center py-16 text-sm text-[#64748B]"><Loader2 size={16} className="animate-spin" /> Building the email…</div>
  ) : view === "text" ? (
    <pre className="h-fit w-full max-w-[680px] self-start whitespace-pre-wrap break-words rounded-xl bg-white p-4 font-mono text-[12.5px] leading-relaxed text-[#1E293B] ring-1 ring-[#E2E8F0] sm:p-5">{preview.text}</pre>
  ) : (
    <EmailFrame html={preview.html} device={device} title={`Preview: ${preview.subject}`}
      className={`h-[68vh] min-h-[420px] lg:h-full lg:min-h-0 ${updating ? "opacity-60" : ""}`} />
  );

  const previewPane = (
    <section aria-label="Preview" className="flex flex-col bg-[#F8FAFC] lg:min-h-0">
      <button type="button" onClick={() => setPreviewOpen((o) => !o)} aria-expanded={previewOpen} aria-controls={`${uid}-preview`}
        className="flex w-full items-center justify-between gap-3 border-y border-[#F1F5F9] bg-white px-4 py-3 text-left lg:hidden">
        <span className="min-w-0">
          <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">Preview</span>
          {preview && !previewOpen && <span className="block truncate text-[12.5px] font-semibold text-[#0F172A]">{preview.subject}</span>}
        </span>
        <ChevronDown size={16} aria-hidden className={`shrink-0 text-[#64748B] transition-transform ${previewOpen ? "rotate-180" : ""}`} />
      </button>
      <div id={`${uid}-preview`} className={`${previewOpen ? "flex" : "hidden"} min-h-0 flex-1 flex-col lg:flex`}>
        {(preview || changed || previewError) && !blocked && (
          <div className="space-y-2.5 border-b border-[#EEF2F6] bg-white px-4 py-3 sm:px-5">
            {preview && (
              <>
                {/* How it sits in their inbox: sender, subject, then the preheader. */}
                <div className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5">
                  <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-gold text-[11px] font-extrabold text-[#0F172A]">DC</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-2 text-[12px]">
                      <b className="font-bold text-[#0F172A]">DigitalCarda</b>
                      <span className="truncate text-[#94A3B8]">to {toEmail}</span>
                    </p>
                    <p className="break-words text-[13.5px] font-semibold text-[#0F172A]">{preview.subject}</p>
                    {preview.preheader && <p className="truncate text-[12.5px] text-[#64748B]">{preview.preheader}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Segmented label="Show" value={view} onChange={setView} options={[["email", "Email", Mail], ["text", "Plain text", FileText]] as const} />
                  {view === "email" && (
                    <Segmented label="Width" value={device} onChange={setDevice} options={[["desktop", "Desktop", Monitor], ["phone", "Phone", Smartphone]] as const} />
                  )}
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] tabular-nums text-[#94A3B8]">
                    {updating && <><Loader2 size={12} className="animate-spin" aria-hidden /> Updating…</>}
                    <span className={preview.sizeKb > GMAIL_CLIP_KB ? "font-semibold text-[#B91C1C]" : ""}>
                      {preview.sizeKb.toFixed(1)} KB{preview.sizeKb > GMAIL_CLIP_KB && " · Gmail will clip it"}
                    </span>
                  </span>
                </div>
              </>
            )}
            {changed && (
              <Note tone="amber" icon={RefreshCw}>
                <b className="font-semibold">Not sent: this email changed after you previewed it.</b> {first}&apos;s account moved on (a plan, trial or card detail). This is the new version; check it, then send again.
              </Note>
            )}
            {preview && previewError && <Note tone="red" icon={AlertTriangle}>Couldn&apos;t update the preview: {previewError} {retryPreview}</Note>}
            {warnings.map((w, i) => <Note key={i} tone="amber" icon={AlertTriangle}>{w}</Note>)}
          </div>
        )}
        <div className="flex min-h-[420px] flex-1 justify-center overflow-auto bg-[#EEF1F5] p-3 sm:p-4 lg:min-h-0">
          {previewBody}
        </div>
      </div>
    </section>
  );

  /* ── Bottom: send, the second look, and the outcome ── */

  const confirmPanel = step.kind === "confirm" && (
    <div role="group" aria-labelledby={`${uid}-confirm`} className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5">
      <p id={`${uid}-confirm`} className="flex items-center gap-2 text-[13.5px] font-bold text-[#92400E]">
        <AlertTriangle size={15} aria-hidden /> {step.resend ? `Send this to ${first} again?` : "Before you send"}
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-6 text-[12.5px] leading-snug text-[#92400E]">
        {/* The server's refusal says it best; otherwise say when it went, unless a warning already does. */}
        {step.resend && (step.reason || !warnings.some((w) => /already got this email/i.test(w))) && (
          <li>{step.reason ? step.reason
            : recentAt ? `This email went to ${first} ${ago(recentAt)}.`
            : `This email already went to ${first} in the last ${LIMITS.sameTemplateCooldownMin} minutes.`}</li>
        )}
        {warnings.map((w, i) => <li key={i}>{w}</li>)}
      </ul>
      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {/* Focus lands on "Go back", so a second Enter never sends by accident. */}
        <button type="button" autoFocus onClick={() => setStep({ kind: "compose" })} disabled={sending}
          className="h-10 rounded-xl border border-[#E2E8F0] bg-white px-4 text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-60">Go back</button>
        <button type="button" onClick={onConfirmClick} disabled={sending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl gradient-gold px-4 text-[13px] font-bold text-[#0F172A] hover:shadow-gold disabled:opacity-60">
          {sending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Send size={14} aria-hidden />}
          {sending ? "Sending…" : step.resend ? "Send again anyway" : "Send anyway"}
        </button>
      </div>
    </div>
  );

  const footer = (
    <div className="shrink-0 border-t border-[#F1F5F9] bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
      {confirmPanel || (
        <>
          {sendError && <div role="alert" className="mb-2.5"><Note tone="red" icon={AlertTriangle}>{sendError}</Note></div>}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <p aria-live="polite" className={`min-w-0 flex-1 text-[12px] leading-snug ${quota || optedOutOf || (chosen && !chosen.available) ? "font-semibold text-[#B45309]" : "text-[#64748B]"}`}>{statusLine}</p>
            <div className="flex gap-2">
              <button type="button" onClick={requestClose} disabled={sending}
                className={`h-11 rounded-xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-60 ${blocked ? "flex-1 sm:flex-none" : "hidden sm:block"}`}>
                {blocked ? "Close" : "Cancel"}
              </button>
              {!blocked && (
                <button type="button" onClick={onSendClick} disabled={!canSend || sending}
                  className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl gradient-gold px-5 text-sm font-bold text-[#0F172A] transition-shadow hover:shadow-gold disabled:opacity-50 disabled:hover:shadow-none sm:max-w-[380px] sm:flex-none">
                  {sending ? <Loader2 size={15} className="shrink-0 animate-spin" aria-hidden /> : <Send size={15} className="shrink-0" aria-hidden />}
                  <span className="truncate">{sending ? "Sending…" : `Send to ${toEmail}`}</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const resultView = step.kind === "result" && (() => {
    const r = RESULT[step.result.status] ?? RESULT.failed;
    const ok = succeeded;
    const logLink = canOpenPath("/admin/email-log");
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[#F8FAFC] p-4 sm:p-6">
        <div role="status" className="w-full max-w-md rounded-2xl border border-[#F1F5F9] bg-white p-6 text-center shadow-premium">
          <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${r.ring}`}><r.icon size={26} aria-hidden /></span>
          <h3 className="mt-4 font-display text-lg font-bold text-[#0F172A]">{r.title(first)}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-[#64748B]">{r.text}</p>
          {!ok && step.result.error && <p className="mt-3 break-words rounded-xl bg-[#FEF2F2] px-3 py-2 text-left text-[12.5px] text-[#991B1B]">{step.result.error}</p>}
          <dl className="mt-4 space-y-1.5 rounded-xl bg-[#F8FAFC] px-4 py-3 text-left text-[12.5px] ring-1 ring-[#E2E8F0]">
            <div className="flex gap-3"><dt className="w-14 shrink-0 text-[#94A3B8]">To</dt><dd className="min-w-0 break-all font-semibold text-[#0F172A]">{step.result.to || toEmail}</dd></div>
            <div className="flex gap-3"><dt className="w-14 shrink-0 text-[#94A3B8]">Subject</dt><dd className="min-w-0 break-words text-[#334155]">{step.subject}</dd></div>
          </dl>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            {logLink && (
              <a href="/admin/email-log" target="_blank" rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] px-4 text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC]">
                Open the Email Log <ExternalLink size={13} aria-hidden />
              </a>
            )}
            <button type="button" onClick={ok ? startOver : () => setStep({ kind: "compose" })}
              className="h-10 rounded-xl border border-[#E2E8F0] px-4 text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC]">
              {ok ? "Send another" : "Back to the email"}
            </button>
            <button type="button" autoFocus onClick={onClose} className="h-10 rounded-xl gradient-gold px-5 text-[13px] font-bold text-[#0F172A] hover:shadow-gold">Done</button>
          </div>
        </div>
      </div>
    );
  })();

  // On document.body: the phone layout animates its <main> with a transform,
  // which would otherwise pin the modal under the app bar and the tab bar.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center sm:items-center sm:p-6">
      <div aria-hidden className="absolute inset-0 bg-[#0F172A]/55 backdrop-blur-sm animate-fade-in" onClick={requestClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`} tabIndex={-1} onKeyDown={trapTab}
        className="relative flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl outline-none animate-scale-in sm:h-[calc(100dvh-3rem)] sm:max-h-[900px] sm:rounded-2xl">
        <div className="flex shrink-0 items-center gap-3 border-b border-[#F1F5F9] px-4 py-3.5 sm:px-6">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7]"><Mail size={18} className="text-[#B45309]" /></span>
          <div className="min-w-0 flex-1">
            <h2 id={`${uid}-title`} className="truncate font-display text-[16px] font-bold text-[#0F172A]">Email {toName || "customer"}</h2>
            <p className="truncate text-[12.5px] text-[#64748B]">Pick an email, check the preview, then send. It goes out in the DigitalCarda design.</p>
          </div>
          <button type="button" onClick={requestClose} disabled={sending} aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] disabled:opacity-40"><X size={18} /></button>
        </div>

        {resultView || (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:overflow-hidden">
              <div className="space-y-5 p-4 sm:p-5 lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-[#F1F5F9]">
                {recipientCard}
                {left}
                {history && <div className="hidden lg:block">{history}</div>}
              </div>
              {previewPane}
              {history && <div className="p-4 sm:p-5 lg:hidden">{history}</div>}
            </div>
            {footer}
          </>
        )}

        {askDiscard && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0F172A]/30 p-4 animate-fade-in">
            <div ref={discardRef} role="alertdialog" aria-modal="true" aria-labelledby={`${uid}-discard`} aria-describedby={`${uid}-discard-text`}
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl animate-scale-in">
              <p id={`${uid}-discard`} className="font-display text-[15px] font-bold text-[#0F172A]">Discard your message?</p>
              <p id={`${uid}-discard-text`} className="mt-1 text-[13px] leading-relaxed text-[#64748B]">What you wrote to {first} isn&apos;t saved anywhere.</p>
              <div className="mt-4 flex gap-2">
                <button type="button" autoFocus onClick={() => setAskDiscard(false)}
                  className="h-10 flex-1 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC]">Keep writing</button>
                <button type="button" onClick={onClose}
                  className="h-10 flex-1 rounded-xl bg-[#DC2626] text-[13px] font-bold text-white transition-colors hover:bg-[#B91C1C]">Discard</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
