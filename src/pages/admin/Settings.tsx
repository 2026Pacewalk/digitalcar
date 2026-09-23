import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  Save, Building2, Mail, Shield, BellRing, CreditCard, Palette, CheckCircle2, XCircle, Send, Loader2,
  AlertTriangle, Plus, X, Undo2, Phone, MessageCircle, Receipt, KeyRound, Timer, Globe2,
  Lock, Sparkles, ArrowRight,
} from "lucide-react";
import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import PaymentSettingsPanel from "@/components/admin/PaymentSettingsPanel";
import {
  ALERT_KINDS, DEFAULT_SETTINGS, isEmail, isIpOrCidr,
  type AlertKind, type PlatformSettings, type SettingsSection,
} from "@contracts/settings";

/* Admin → Settings. Everything here is stored in the database and read by
   something real: the website's contact details, the mailer, the sign-in
   limits, and what a new customer starts with. Each panel saves on its own. */

type TabId = SettingsSection | "cards" | "payment";

const TABS: { id: TabId; label: string; blurb: string; icon: typeof Building2; tint: string }[] = [
  { id: "business", label: "Business", blurb: "Name, contact details, invoice info", icon: Building2, tint: "from-[#F7B31C] to-[#F59E0B]" },
  { id: "email", label: "Email", blurb: "Sender, reply-to, delivery status", icon: Mail, tint: "from-[#38BDF8] to-[#0284C7]" },
  { id: "alerts", label: "Alerts", blurb: "What the team is told, and where", icon: BellRing, tint: "from-[#34D399] to-[#059669]" },
  { id: "security", label: "Security", blurb: "Sign-in limits and admin access", icon: Shield, tint: "from-[#F472B6] to-[#BE185D]" },
  { id: "cards", label: "Card defaults", blurb: "Trial length and starting design", icon: Palette, tint: "from-[#A78BFA] to-[#6D28D9]" },
  { id: "payment", label: "Payments", blurb: "Razorpay, UPI and bank details", icon: CreditCard, tint: "from-[#FBBF24] to-[#B45309]" },
];

/* ── Small building blocks ─────────────────────────────────────────────── */

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="block text-[12px] font-semibold text-[#334155]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] leading-snug text-[#94A3B8]">{hint}</span>}
    </label>
  );
}

const inputCls = "mt-1 h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15";

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[#16A34A]" : "bg-[#CBD5E1]"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Stepper({ value, onChange, min, max, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; suffix: string }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="mt-1 inline-flex items-center rounded-xl border border-[#E2E8F0] bg-white">
      <button type="button" onClick={() => onChange(clamp(value - 1))} aria-label="Less" className="h-11 w-10 text-lg font-bold text-[#64748B] hover:text-[#0F172A]">−</button>
      <span className="min-w-[92px] text-center text-sm font-bold tabular-nums text-[#0F172A]">{value} <span className="font-medium text-[#94A3B8]">{suffix}</span></span>
      <button type="button" onClick={() => onChange(clamp(value + 1))} aria-label="More" className="h-11 w-10 text-lg font-bold text-[#64748B] hover:text-[#0F172A]">+</button>
    </div>
  );
}

/** An editable list of short values (emails, IP addresses) shown as chips. */
function ChipList({ items, onChange, placeholder, validate, invalidMessage, addLabel }: {
  items: string[]; onChange: (v: string[]) => void; placeholder: string;
  validate: (v: string) => boolean; invalidMessage: string; addLabel?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!validate(v)) { toast.error(invalidMessage); return; }
    if (items.includes(v)) { setDraft(""); return; }
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <div className="mt-1">
      <div className="flex flex-wrap gap-2">
        {items.map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5 rounded-lg bg-[#F1F5F9] py-1.5 pl-3 pr-1.5 text-[13px] font-medium text-[#0F172A]">
            {v}
            <button type="button" onClick={() => onChange(items.filter((x) => x !== v))} aria-label={`Remove ${v}`}
              className="flex h-5 w-5 items-center justify-center rounded-md text-[#94A3B8] hover:bg-white hover:text-[#B91C1C]"><X size={13} /></button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder} className={`${inputCls} mt-0 flex-1`} />
        <button type="button" onClick={add} className="h-11 shrink-0 rounded-xl border border-[#E2E8F0] px-4 text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] inline-flex items-center gap-1.5">
          <Plus size={15} /> {addLabel ?? "Add"}
        </button>
      </div>
    </div>
  );
}

function Panel({ title, description, children, footer }: { title: string; description: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E9EDF4] bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_36px_-28px_rgba(15,23,42,.35)]">
      <header className="border-b border-[#F1F5F9] px-5 py-4 sm:px-6">
        <h2 className="text-[15.5px] font-bold text-[#0F172A]">{title}</h2>
        <p className="mt-0.5 text-[12.5px] text-[#64748B]">{description}</p>
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
      {footer && <div className="border-t border-[#F1F5F9] bg-[#FBFCFE] px-5 py-3 sm:px-6">{footer}</div>}
    </section>
  );
}

export default function AdminSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") || "business") as TabId;
  const setTab = (id: TabId) => setSearchParams(id === "business" ? {} : { tab: id });

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.settings.all.useQuery();
  const { data: smtp, isLoading: smtpLoading } = trpc.settings.smtpStatus.useQuery();
  const save = trpc.settings.save.useMutation();

  // Draft copies: each panel edits its own and saves it.
  const [draft, setDraft] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    if (data) setDraft({ business: data.business, alerts: data.alerts, email: data.email, security: data.security });
  }, [data]);

  const dirty = (s: SettingsSection) => !!data && JSON.stringify(draft[s]) !== JSON.stringify(data[s]);
  const set = <S extends SettingsSection>(section: S, values: Partial<PlatformSettings[S]>) =>
    setDraft((d) => ({ ...d, [section]: { ...d[section], ...values } }));
  const reset = (s: SettingsSection) => data && setDraft((d) => ({ ...d, [s]: data[s] }));

  const commit = async (section: SettingsSection) => {
    try {
      await save.mutateAsync({ section, values: draft[section] } as Parameters<typeof save.mutateAsync>[0]);
      await Promise.all([utils.settings.all.invalidate(), utils.settings.smtpStatus.invalidate(), utils.settings.getPublic.invalidate()]);
      toast.success("Saved — live everywhere now");
    } catch (e) { toast.error((e as Error).message); }
  };

  // Ctrl/⌘+S saves whatever panel is open and has changes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        const s = tab as SettingsSection;
        if (["business", "email", "alerts", "security"].includes(s) && dirty(s)) { e.preventDefault(); void commit(s); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const SaveBar = ({ section }: { section: SettingsSection }) => (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[12px] text-[#94A3B8]">{dirty(section) ? "Unsaved changes" : "Everything saved"}</p>
      <div className="flex items-center gap-2">
        {dirty(section) && (
          <button onClick={() => reset(section)} className="h-10 rounded-xl px-3 text-[13px] font-semibold text-[#64748B] hover:bg-[#F1F5F9] inline-flex items-center gap-1.5">
            <Undo2 size={14} /> Undo
          </button>
        )}
        <button onClick={() => commit(section)} disabled={!dirty(section) || save.isPending}
          className="h-10 rounded-xl gradient-gold px-5 text-[13px] font-bold text-[#0F172A] inline-flex items-center gap-2 disabled:opacity-45">
          {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save changes
        </button>
      </div>
    </div>
  );

  /* Health chips in the header: the three things that silently break. */
  const health = useMemo(() => {
    const mailOk = smtp?.configured;
    const alertsTo = data?.alerts.recipients.length ? data.alerts.recipients.length : (data?.env.leadNotifyTo ? 1 : 0);
    const alertsOff = data ? ALERT_KINDS.filter((a) => data.alerts.enabled[a.key] === false).length : 0;
    return [
      { label: mailOk ? "Email sending" : smtp?.mode === "preview" ? "Email in test mode" : "Email not set up", ok: !!mailOk, warn: smtp?.mode === "preview" },
      { label: alertsTo ? `Alerts to ${alertsTo} ${alertsTo === 1 ? "address" : "addresses"}` : "No alert recipients", ok: alertsTo > 0, warn: alertsOff > 0 },
      { label: data?.security.adminIpAllowlist.length ? "Admin locked to your networks" : "Admin open from anywhere", ok: true, warn: !data?.security.adminIpAllowlist.length },
    ];
  }, [data, smtp]);

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Settings" subtitle="How the platform behaves — all of it saved to the database" /></div>
      <div className="p-4 sm:p-6">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#16223B] to-[#0B1120] px-5 py-6 text-white sm:px-8 sm:py-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#F7B31C]/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-[#38BDF8]/10 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#F7B31C]"><Sparkles size={13} /> Platform settings</p>
              <h1 className="mt-2 text-[24px] font-extrabold tracking-tight sm:text-[28px]">Run DigitalCarda your way</h1>
              <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-[#94A3B8]">
                Contact details on the website, who gets told what, how sign-in is protected and what new customers start with.
                Every change here takes effect immediately.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {health.map((h) => (
                <span key={h.label} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                  h.ok && !h.warn ? "bg-[#16A34A]/15 text-[#4ADE80]" : h.warn ? "bg-[#F7B31C]/15 text-[#FBBF24]" : "bg-[#DC2626]/15 text-[#FCA5A5]"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${h.ok && !h.warn ? "bg-[#4ADE80]" : h.warn ? "bg-[#FBBF24]" : "bg-[#FCA5A5]"}`} /> {h.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row">
          {/* Section rail */}
          <nav className="lg:w-[272px] lg:shrink-0" aria-label="Settings sections">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:flex-col lg:overflow-visible lg:pb-0">
              {TABS.map((t) => {
                const on = tab === t.id;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)} aria-current={on ? "page" : undefined}
                    className={`group flex shrink-0 items-center gap-3 rounded-2xl border p-3 text-left transition-all lg:w-full ${
                      on ? "border-[#0F172A] bg-white shadow-[0_10px_24px_-18px_rgba(15,23,42,.8)]" : "border-[#E9EDF4] bg-white/70 hover:border-[#CBD5E1]"}`}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.tint} text-white shadow-sm`}>
                      <t.icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[13.5px] font-bold ${on ? "text-[#0F172A]" : "text-[#334155]"}`}>{t.label}</span>
                      <span className="hidden text-[11.5px] leading-snug text-[#94A3B8] lg:block">{t.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Panels */}
          <div className="min-w-0 flex-1 space-y-5">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#E9EDF4] bg-white p-12 text-sm text-[#64748B]">
                <Loader2 size={16} className="animate-spin" /> Loading settings…
              </div>
            )}

            {!isLoading && tab === "business" && (
              <>
                <Panel title="Business details" description="Shown on your website and on customer invoices." footer={<SaveBar section="business" />}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Brand name" hint="Appears as the sender name on every email.">
                      <input value={draft.business.brandName} onChange={(e) => set("business", { brandName: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Support email" hint="Website footer, menus and the contact page.">
                      <input type="email" value={draft.business.supportEmail} onChange={(e) => set("business", { supportEmail: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Support phone" hint="Shown exactly as you type it.">
                      <input value={draft.business.supportPhone} onChange={(e) => set("business", { supportPhone: e.target.value })} className={inputCls} placeholder="+91 95177 22444" />
                    </Field>
                    <Field label="WhatsApp number" hint="Digits with country code — powers every “Chat on WhatsApp” button.">
                      <input value={draft.business.whatsappNumber} onChange={(e) => set("business", { whatsappNumber: e.target.value.replace(/\D/g, "") })} className={inputCls} placeholder="919517722444" inputMode="numeric" />
                    </Field>
                    <Field label="Registered name" hint="For invoices. Leave blank to use the brand name.">
                      <input value={draft.business.legalName} onChange={(e) => set("business", { legalName: e.target.value })} className={inputCls} placeholder="Pacewalk Private Limited" />
                    </Field>
                    <Field label="GSTIN" hint="Printed on invoices when filled.">
                      <input value={draft.business.gstin} onChange={(e) => set("business", { gstin: e.target.value.toUpperCase() })} className={inputCls} placeholder="03AABCU9603R1ZX" />
                    </Field>
                    <Field label="Business address" hint="Printed on invoices." wide>
                      <textarea rows={2} value={draft.business.address} onChange={(e) => set("business", { address: e.target.value })} className={`${inputCls} h-auto resize-none py-2.5`} />
                    </Field>
                  </div>
                </Panel>

                {/* What the visitor actually sees, from the values above */}
                <Panel title="How this looks on your website" description="A live preview of the contact details in your footer and menus.">
                  <div className="rounded-2xl bg-[#0B1120] p-5 text-white">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F7B31C]">{draft.business.brandName || "DigitalCarda"}</p>
                    <ul className="mt-3 space-y-2 text-[13px]">
                      <li className="flex items-center gap-2.5 text-[#CBD5E1]"><Mail size={14} className="text-[#64748B]" /> {draft.business.supportEmail || "—"}</li>
                      <li className="flex items-center gap-2.5 text-[#CBD5E1]"><Phone size={14} className="text-[#64748B]" /> {draft.business.supportPhone || "—"}</li>
                      <li className="flex items-center gap-2.5 text-[#CBD5E1]"><MessageCircle size={14} className="text-[#25D366]" /> wa.me/{draft.business.whatsappNumber || "—"}</li>
                      {(draft.business.legalName || draft.business.address || draft.business.gstin) && (
                        <li className="flex items-start gap-2.5 pt-1 text-[12px] text-[#94A3B8]">
                          <Receipt size={14} className="mt-0.5 shrink-0 text-[#64748B]" />
                          <span>{[draft.business.legalName, draft.business.address, draft.business.gstin && `GSTIN ${draft.business.gstin}`].filter(Boolean).join(" · ")}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </Panel>
              </>
            )}

            {!isLoading && tab === "email" && (
              <>
                <Panel title="Delivery status" description="SMTP credentials live in the server's .env file and are never stored here.">
                  {smtpLoading ? (
                    <div className="flex items-center gap-2 text-sm text-[#64748B]"><Loader2 size={16} className="animate-spin" /> Checking…</div>
                  ) : smtp?.configured ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-4">
                      <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#16A34A]" />
                      <div className="text-sm">
                        <p className="font-semibold text-[#166534]">Emails are going out.</p>
                        <p className="mt-0.5 text-[12.5px] text-[#15803D]">Through <b>{smtp.host}</b> · From <b>{smtp.from}</b> · Alerts to <b>{smtp.notifyTo}</b></p>
                        {smtp.misaligned && (
                          <p className="mt-2 text-[12px] leading-relaxed text-[#B45309]">
                            <b>Heads up:</b> you send as <b>{smtp.misaligned.from}</b> through <b>{smtp.misaligned.via}</b>. The provider usually rewrites
                            the From address; if it doesn't, the mail fails SPF and lands in spam.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : smtp?.mode === "preview" ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
                      <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#B45309]" />
                      <div className="text-sm">
                        <p className="font-semibold text-[#92400E]">Test mode — emails are captured, not delivered.</p>
                        <p className="mt-1 text-[12.5px] text-[#B45309]">No SMTP credentials here, so every email goes to a throwaway preview mailbox. The preview link is printed in the terminal.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
                      <XCircle size={20} className="mt-0.5 shrink-0 text-[#DC2626]" />
                      <div className="text-sm">
                        <p className="font-semibold text-[#991B1B]">Not set up — automated emails are skipped.</p>
                        <p className="mt-1 text-[12.5px] text-[#B91C1C]">Add <code>SMTP_HOST</code>, <code>SMTP_USER</code> and <code>SMTP_PASS</code> to the server <code>.env</code>, then restart.</p>
                      </div>
                    </div>
                  )}
                </Panel>

                <Panel title="Sender" description="How your emails appear in the recipient's inbox." footer={<SaveBar section="email" />}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Sender name" hint="Blank uses the brand name.">
                      <input value={draft.email.fromName} onChange={(e) => set("email", { fromName: e.target.value })} className={inputCls} placeholder={draft.business.brandName} />
                    </Field>
                    <Field label="Reply-to address" hint="Optional. Where replies go if it isn't the sending mailbox.">
                      <input type="email" value={draft.email.replyTo} onChange={(e) => set("email", { replyTo: e.target.value })} className={inputCls} placeholder="support@yourdomain.com" />
                    </Field>
                  </div>
                  <div className="mt-4 rounded-2xl border border-[#E9EDF4] bg-[#F8FAFC] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">Inbox preview</p>
                    <p className="mt-2 text-[14px] font-bold text-[#0F172A]">{(draft.email.fromName || draft.business.brandName || "DigitalCarda")}</p>
                    <p className="text-[12.5px] text-[#64748B]">Your card is live 🎉</p>
                    <p className="mt-1 text-[11.5px] text-[#94A3B8]">{data?.env.mailFrom}{draft.email.replyTo ? ` · replies to ${draft.email.replyTo}` : ""}</p>
                  </div>
                </Panel>

                <Panel title="Send a test" description="Checks the whole path — server, credentials and inbox placement.">
                  <TestEmail defaultTo={smtp?.notifyTo || ""} />
                </Panel>
              </>
            )}

            {!isLoading && tab === "alerts" && (
              <Panel title="Team alerts" description="The emails DigitalCarda sends you about your own business. Customer emails are never affected." footer={<SaveBar section="alerts" />}>
                <Field label="Send alerts to" hint={data?.env.leadNotifyTo ? `Leave empty to use the server default (${data.env.leadNotifyTo}).` : "Add one or more addresses."}>
                  <ChipList
                    items={draft.alerts.recipients}
                    onChange={(recipients) => set("alerts", { recipients })}
                    placeholder="you@yourcompany.com"
                    validate={isEmail}
                    invalidMessage="That doesn't look like an email address."
                  />
                </Field>

                <div className="mt-5 space-y-2">
                  {ALERT_KINDS.map((a) => {
                    const on = draft.alerts.enabled[a.key as AlertKind] !== false;
                    return (
                      <div key={a.key} className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-colors ${on ? "border-[#E9EDF4] bg-white" : "border-[#F1F5F9] bg-[#F8FAFC]"}`}>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13.5px] font-semibold ${on ? "text-[#0F172A]" : "text-[#64748B]"}`}>{a.label}</p>
                          <p className="text-[12px] text-[#94A3B8]">{a.hint}</p>
                        </div>
                        <Switch on={on} label={a.label} onChange={(v) => set("alerts", { enabled: { ...draft.alerts.enabled, [a.key]: v } })} />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11.5px] leading-relaxed text-[#94A3B8]">
                  Switched-off alerts aren't sent at all, and appear in the Email Log as skipped so you can see what you're missing.
                </p>
              </Panel>
            )}

            {!isLoading && tab === "security" && (
              <>
                <Panel title="Sign-in protection" description="Applies to every portal — customers, resellers and admin." footer={<SaveBar section="security" />}>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Tries per minute from one network" hint="Wrong passwords from the same internet connection.">
                      <Stepper value={draft.security.attemptsPerIp} min={3} max={60} suffix="tries" onChange={(attemptsPerIp) => set("security", { attemptsPerIp })} />
                    </Field>
                    <Field label="Tries per account in 5 minutes" hint="Protects one customer from being guessed at.">
                      <Stepper value={draft.security.attemptsPerAccount} min={3} max={60} suffix="tries" onChange={(attemptsPerAccount) => set("security", { attemptsPerAccount })} />
                    </Field>
                    <Field label="Admin stays signed in for" hint="Applies to new admin and staff sign-ins.">
                      <Stepper value={draft.security.adminSessionDays} min={1} max={90} suffix="days" onChange={(adminSessionDays) => set("security", { adminSessionDays })} />
                    </Field>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#E9EDF4] p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FEF2F2] text-[#BE123C]"><Lock size={16} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-bold text-[#0F172A]">Limit the admin portal to your networks</p>
                        <p className="text-[12px] text-[#64748B]">Empty means anyone with the password can sign in from anywhere. Add your office or home address to lock it down.</p>
                        <ChipList
                          items={draft.security.adminIpAllowlist}
                          onChange={(adminIpAllowlist) => set("security", { adminIpAllowlist })}
                          placeholder="49.36.1.20 or 49.36.0.0/16"
                          validate={isIpOrCidr}
                          invalidMessage="Enter an IP address, or a range like 49.36.0.0/16."
                        />
                        {data?.env.yourIp && data.env.yourIp !== "unknown" && !draft.security.adminIpAllowlist.includes(data.env.yourIp) && (
                          <button type="button" onClick={() => set("security", { adminIpAllowlist: [...draft.security.adminIpAllowlist, data.env.yourIp] })}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#EEF2FF] px-3 py-1.5 text-[12px] font-semibold text-[#3730A3]">
                            <Plus size={13} /> Add the address you're on now ({data.env.yourIp})
                          </button>
                        )}
                        <p className="mt-2 text-[11.5px] text-[#B45309]">
                          Saving a list that doesn't include your own address is refused, so you can't lock yourself out.
                        </p>
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Good to know" description="Facts about this install, not settings.">
                  <ul className="space-y-2.5 text-[13px] text-[#334155]">
                    <li className="flex items-start gap-2.5"><KeyRound size={15} className="mt-0.5 shrink-0 text-[#94A3B8]" /> Admin sign-in page: <code className="rounded bg-[#F1F5F9] px-1.5">/{data?.env.adminLoginPath}</code></li>
                    <li className="flex items-start gap-2.5"><Timer size={15} className="mt-0.5 shrink-0 text-[#94A3B8]" /> Customer sessions last 7 days; phone-app sessions can be signed out per device.</li>
                    <li className="flex items-start gap-2.5"><Globe2 size={15} className="mt-0.5 shrink-0 text-[#94A3B8]" /> You're signed in from <b className="font-semibold">{data?.env.yourIp}</b>.</li>
                    <li className="flex items-start gap-2.5"><Shield size={15} className="mt-0.5 shrink-0 text-[#94A3B8]" /> Staff access and the full activity log live on their own pages under Team.</li>
                  </ul>
                </Panel>
              </>
            )}

            {!isLoading && tab === "cards" && <CardDefaults />}

            {tab === "payment" && (
              <Panel title="Payments" description="Razorpay online checkout and manual UPI / bank details. Each card below saves on its own.">
                <PaymentSettingsPanel />
              </Panel>
            )}
          </div>
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}

/* ── Test email ─────────────────────────────────────────────────────────── */
function TestEmail({ defaultTo }: { defaultTo: string }) {
  const [to, setTo] = useState("");
  const sendTest = trpc.settings.sendTestEmail.useMutation({
    onSuccess: (r) => (r.ok ? toast.success(`Test email sent to ${r.to} 🎉`) : toast.error(r.error || "It didn't send")),
    onError: (e) => toast.error(e.message),
  });
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder={defaultTo || "you@example.com"} className={`${inputCls} mt-0 sm:max-w-sm`} />
        <button onClick={() => sendTest.mutate({ to: to.trim() || undefined })} disabled={sendTest.isPending}
          className="h-11 shrink-0 rounded-xl gradient-gold px-5 text-sm font-bold text-[#0F172A] inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {sendTest.isPending ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Send size={15} /> Send test email</>}
        </button>
      </div>
      <p className="mt-2 text-[11.5px] text-[#94A3B8]">Leave blank to send to your alert address. Check spam if it doesn't arrive.</p>
    </div>
  );
}

/* ── Card defaults: trial length + the design new cards start on ───────── */
function CardDefaults() {
  const utils = trpc.useUtils();
  const { data: trial } = trpc.trial.config.useQuery();
  const { data: presets } = trpc.template.presets.useQuery();
  const setDays = trpc.trial.setDays.useMutation();
  const setDefault = trpc.template.setDefaultPreset.useMutation();
  const [days, setDays_] = useState<number | null>(null);
  useEffect(() => { if (trial && days === null) setDays_(trial.trialDays); }, [trial, days]);

  const value = days ?? trial?.trialDays ?? 30;
  const dirty = !!trial && value !== trial.trialDays;

  const saveDays = async () => {
    try {
      await setDays.mutateAsync({ days: value });
      await utils.trial.config.invalidate();
      toast.success(`New sign-ups now get ${value} days free`);
    } catch (e) { toast.error((e as Error).message); }
  };

  const choose = async (id: number, name: string) => {
    try {
      await setDefault.mutateAsync({ id });
      await utils.template.presets.invalidate();
      toast.success(`New cards will start on ${name}`);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <>
      <Panel title="Free trial" description="How long a new customer's card stays live before they need a plan."
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-[#94A3B8]">{dirty ? "Unsaved change" : `Currently ${trial?.trialDays ?? "—"} days`}</p>
            <button onClick={saveDays} disabled={!dirty || setDays.isPending}
              className="h-10 rounded-xl gradient-gold px-5 text-[13px] font-bold text-[#0F172A] inline-flex items-center gap-2 disabled:opacity-45">
              {setDays.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
            </button>
          </div>
        }>
        <Field label="Trial length" hint="Existing trials keep the length they started with.">
          <Stepper value={value} min={1} max={365} suffix="days" onChange={setDays_} />
        </Field>
        {trial && (
          <p className="mt-4 text-[12.5px] text-[#64748B]">
            After it ends: <b className="text-[#0F172A]">{trial.expiryMode === "deactivate" ? "the card is paused" : trial.expiryMode}</b>
            {trial.graceEnabled ? <> · {trial.graceDays} grace {trial.graceDays === 1 ? "day" : "days"} first</> : null}
          </p>
        )}
      </Panel>

      <Panel title="Starting design" description="The design a brand-new card opens with. Customers can change it any time.">
        {!presets?.list?.length ? (
          <p className="text-[13px] text-[#64748B]">No saved designs yet — create one in <b>Admin → Templates</b>.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {presets.list.map((p) => {
              const on = presets.defaultId === p.id;
              return (
                <button key={p.id} onClick={() => choose(p.id, p.name)} disabled={setDefault.isPending}
                  className={`rounded-2xl border p-4 text-left transition-all ${on ? "border-[#F7B31C] bg-[#FFFBEB] shadow-[0_10px_24px_-20px_rgba(247,179,28,.9)]" : "border-[#E9EDF4] bg-white hover:border-[#CBD5E1]"}`}>
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg" style={{ background: `linear-gradient(135deg, ${p.primary || "#F7B31C"}, ${p.secondary || "#0F172A"})` }} />
                    <span className="text-[13.5px] font-bold text-[#0F172A]">{p.name}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-[#94A3B8]">Design #{p.style}{p.category ? ` · ${p.category}` : ""}</p>
                  <p className={`mt-2 inline-flex items-center gap-1 text-[11.5px] font-bold ${on ? "text-[#B45309]" : "text-[#64748B]"}`}>
                    {on ? <>In use <CheckCircle2 size={12} /></> : <>Use this <ArrowRight size={12} /></>}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </>
  );
}
