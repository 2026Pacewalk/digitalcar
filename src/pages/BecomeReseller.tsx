import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import {
  ArrowLeft, ArrowRight, Loader2, UserRound, Mail, Phone, Building2, Printer, Handshake, Globe,
  Sparkles, Check, MessageCircle, AlertCircle, Wallet, KeyRound, Clock, BadgePercent, IndianRupee, Store,
} from "lucide-react";
import PartnerPass from "@/components/auth/PartnerPass";
import { SUPPORT } from "@/components/auth/authMockData";
import { emailSuggestion } from "@/lib/emailHelpers";
import { readableError } from "@/lib/errors";
import { seoForPath } from "@/lib/publicSeo";

/* /become-reseller — the reseller application.

   The page is built around one object: the applicant's partner pass, which
   prints itself from the form as they type and gets stamped when they send it.
   It makes a five-field form feel like the start of something, which is what
   an application is.

   Every promise here is one the programme keeps today, and matches /resellers:
   20% on every plan (the default rate at approval, api/reseller-router.ts),
   renewals included, Rs. 0 to join, withdrawals any time, a human review in
   1–2 business days, and a set-password email on approval. White-label is an
   add-on the team sets up by hand: Rs. 50,000 / US$499 one-time — keep the
   price in step with the /resellers FAQ. No rate bands. */

const WHITE_LABEL_PRICE = "Rs. 50,000 (US$499)";

const KINDS = [
  { label: "Digital agency", icon: Building2 },
  { label: "Printer / card shop", icon: Printer },
  { label: "Freelancer / consultant", icon: Handshake },
  { label: "IT / software reseller", icon: Globe },
  { label: "Something else", icon: Sparkles },
] as const;

const FACTS = [
  { icon: BadgePercent, v: "20%", t: "on every plan" },
  { icon: IndianRupee, v: "Rs. 0", t: "to join" },
  { icon: Wallet, v: "Any time", t: "withdrawals" },
];

const STEPS = [
  { icon: Clock, title: "We review your application", text: "A real person reads every one — usually within 1–2 business days." },
  { icon: KeyRound, title: "You get your partner login", text: "We email you when it's ready — with a link to set your password if you're new to DigitalCarda." },
  { icon: Wallet, title: "You add customers and earn", text: "20% on every plan they buy, renewals included. Withdraw to bank or UPI." },
];

/* The same rules as the API's z.string().email() (zod 4), so an address the
   page accepts is never bounced by the server: no dot at either end of the
   name, no double dots, and a real top-level domain. The looser EMAIL_RE in
   lib/emailHelpers would let "rahul.@gmail.com" through. */
const APPLY_EMAIL_RE = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

const MSG_MAX = 900; // the API takes 1000; the business type is added in front

const inputCls = (bad: boolean) =>
  `h-12 w-full rounded-xl bg-[#F8FAFC] border pl-10 pr-3 text-[16px] sm:text-sm text-[#0F172A] outline-none focus:ring-2 focus:bg-white transition-all placeholder:text-[#94A3B8] ${
    bad ? "border-[#FCA5A5] focus:border-[#EF4444] focus:ring-[#EF4444]/20" : "border-[#E2E8F0] focus:border-[#F7B31C] focus:ring-[#F7B31C]/25"}`;

function Field({ id, label, optional, icon: Icon, error, hint, children }: {
  id: string; label: string; optional?: boolean; icon: typeof Mail; error?: string; hint?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between text-xs font-semibold text-[#334155] mb-1.5">
        <span>{label}</span>
        {optional && <span className="text-[11px] font-normal text-[#94A3B8]">Optional</span>}
      </label>
      <div className="relative">
        <Icon size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${error ? "text-[#EF4444]" : "text-[#94A3B8]"}`} aria-hidden="true" />
        {children}
      </div>
      <p id={`${id}-msg`} className="min-h-[18px] mt-1 text-[11.5px] leading-snug" aria-live="polite">
        {error ? <span className="inline-flex items-center gap-1 text-[#B91C1C]"><AlertCircle size={11} aria-hidden="true" /> {error}</span> : hint}
      </p>
    </div>
  );
}

function Steps({ tone }: { tone: "dark" | "light" }) {
  const dark = tone === "dark";
  return (
    <ol className="relative space-y-4">
      <span aria-hidden="true" className={`absolute left-[17px] top-3 bottom-3 w-px ${dark ? "bg-gradient-to-b from-[#F7B31C]/60 via-white/15 to-transparent" : "bg-gradient-to-b from-[#F7B31C] via-[#E2E8F0] to-transparent"}`} />
      {STEPS.map((s, i) => (
        <li key={s.title} className="relative flex gap-3.5">
          <span className={`relative z-10 w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-[13px] font-extrabold ${
            i === 0 ? "gradient-gold text-[#0F172A] shadow-gold" : dark ? "bg-[#1E293B] ring-1 ring-white/15 text-[#FCD34D]" : "bg-white ring-1 ring-[#E2E8F0] text-[#B45309]"}`}>
            {i + 1}
          </span>
          <div className="pt-0.5 min-w-0">
            <p className={`text-[13.5px] font-semibold ${dark ? "text-white" : "text-[#0F172A]"}`}>{s.title}</p>
            <p className={`text-[12.5px] leading-snug mt-0.5 ${dark ? "text-[#94A3B8]" : "text-[#64748B]"}`}>{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function BecomeReseller() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", companyName: "", message: "" });
  const [kind, setKind] = useState("");
  const [whiteLabel, setWhiteLabel] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const apply = trpc.reseller.submitApplication.useMutation({
    onSuccess: () => {
      setDone(true);
      // The stamp lands on the pass at the top of the page — take them to it.
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* ignore */ }
    },
  });
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  // The form (and its focused button) is gone once it's sent; put focus on the
  // confirmation so keyboard and screen-reader users land where the news is.
  useEffect(() => { if (done) doneRef.current?.focus({ preventScroll: true }); }, [done]);

  // Rendered outside PublicLayout, so set the tab title ourselves.
  useEffect(() => {
    const seo = seoForPath("/become-reseller");
    if (seo) document.title = seo.title;
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const touch = (k: string) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  const email = form.email.trim();
  const phoneDigits = form.phone.replace(/\D/g, "");
  const errors = {
    fullName: form.fullName.trim().length < 2 ? "Enter your full name" : "",
    email: !email ? "Enter your email address" : !APPLY_EMAIL_RE.test(email) ? "That email address doesn't look right — check for a stray dot or a missing part" : "",
    phone: form.phone.trim() && phoneDigits.length < 10 ? "Enter a 10-digit mobile number" : "",
  };
  const show = (k: keyof typeof errors) => (touched[k] ? errors[k] : "");
  const suggestion = APPLY_EMAIL_RE.test(email) ? emailSuggestion(email) : "";

  const filled = [
    form.fullName.trim().length >= 2, APPLY_EMAIL_RE.test(email), phoneDigits.length >= 10, form.companyName.trim().length >= 2, !!kind,
  ].filter(Boolean).length;

  const serverError = apply.error
    ? /too many|rate limit/i.test(apply.error.message)
      ? "You've sent a few applications from here already. Please try again in an hour, or WhatsApp us and we'll help straight away."
      : /fetch|network|ECONNREFUSED/i.test(apply.error.message)
        ? "We couldn't reach the server. Check your connection and try again."
        : readableError(apply.error, "We couldn't send your application. Please try again.")
    : "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apply.isPending) return;
    setTouched({ fullName: true, email: true, phone: true });
    const firstBad = errors.fullName ? nameRef : errors.email ? emailRef : errors.phone ? phoneRef : null;
    if (firstBad) { firstBad.current?.focus(); return; }
    const message = [
      kind && `Business type: ${kind}`,
      whiteLabel && `Interested in white-label (${WHITE_LABEL_PRICE} one-time)`,
      form.message.trim(),
    ].filter(Boolean).join("\n\n");
    apply.mutate({
      fullName: form.fullName.trim(),
      email,
      phone: form.phone.trim() || undefined,
      companyName: form.companyName.trim() || undefined,
      message: message || undefined,
    });
  };

  const first = form.fullName.trim().split(/\s+/)[0] || "";
  const pass = { name: form.fullName, company: form.companyName, email: form.email, phone: form.phone, kind: kind === "Something else" ? "" : kind };
  const focusRing = "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]";

  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:flex lg:items-start">
      {/* ── The story + the live pass (a header band on phones, a sticky panel on desktop) ── */}
      <aside className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white lg:w-[48%] lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
        <div aria-hidden="true" className="absolute -top-24 -right-20 w-[420px] h-[420px] rounded-full blur-3xl bg-[#F7B31C]/15 animate-aurora-drift" />
        <div aria-hidden="true" className="absolute -bottom-28 -left-20 w-[380px] h-[380px] rounded-full blur-3xl bg-[#14B8A6]/[0.12] animate-aurora-drift" style={{ animationDelay: "3s" }} />
        <div aria-hidden="true" className="hidden lg:block absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#F7B31C]/45 to-transparent" />

        <div className="relative px-4 sm:px-8 lg:px-12 pt-4 lg:pt-10 pb-28 lg:pb-10 max-w-[560px] mx-auto lg:min-h-full lg:flex lg:flex-col">
          <div className="flex items-center justify-between">
            <Link to="/" aria-label="DigitalCarda home" className={focusRing}>
              <img src="/logo.png" alt="" className="h-8 lg:h-9 w-auto object-contain" />
            </Link>
            <Link to="/resellers-login" className={`lg:hidden text-[13px] font-semibold text-[#FCD34D] hover:text-white ${focusRing}`}>Partner sign in</Link>
          </div>

          <p className="dc-enter mt-7 lg:mt-10 self-start w-fit inline-flex items-center gap-2 rounded-full bg-[#F7B31C]/10 border border-[#F7B31C]/30 px-3 py-1 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FCD34D]">
            <Store size={12} aria-hidden="true" /> Reseller partner programme
          </p>
          <h1 className="dc-enter dc-enter-1 font-display mt-4 text-[1.9rem] sm:text-[2.4rem] leading-[1.08] font-extrabold tracking-tight [text-wrap:balance]">
            Sell the business card that <span className="text-gradient-gold">never runs out.</span>
          </h1>
          <p className="dc-enter dc-enter-2 mt-3 text-[14.5px] sm:text-[15px] leading-relaxed text-[#94A3B8] max-w-[460px]">
            Bring local businesses onto DigitalCarda digital cards and earn <strong className="font-semibold text-white">20% on every plan they buy</strong> — renewals included.
          </p>

          <div className="dc-enter dc-enter-3 mt-8 flex flex-col items-center lg:items-start">
            <PartnerPass data={pass} stamped={done} className="max-w-[330px] sm:max-w-[360px]" />
            <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-[#94A3B8]">
              {done
                ? <><Check size={13} className="text-[#2DD4BF]" aria-hidden="true" /> Stamped and with our partner team.</>
                : <><Sparkles size={13} className="text-[#FCD34D]" aria-hidden="true" /> Your partner pass — it fills in as you type.</>}
            </p>
          </div>

          <ul className="hidden sm:grid mt-8 grid-cols-3 gap-2.5 max-w-[460px]">
            {FACTS.map((f) => (
              <li key={f.t} className="rounded-2xl bg-white/[0.05] border border-white/10 px-3 py-3">
                <f.icon size={15} className="text-[#FCD34D]" aria-hidden="true" />
                <p className="mt-1.5 font-display text-[1.1rem] font-extrabold text-white leading-none">{f.v}</p>
                <p className="mt-1 text-[11px] text-[#94A3B8]">{f.t}</p>
              </li>
            ))}
          </ul>

          <p className="mt-4 sm:mt-5 max-w-[460px] text-[12.5px] leading-relaxed text-[#94A3B8]">
            Want it under your own brand? Add <span className="font-semibold text-[#FCD34D]">white-label</span> — your domain, logo and colours — for {WHITE_LABEL_PRICE}, one-time.
          </p>

          {!done && (
            <div className="hidden lg:block mt-9 pt-7 border-t border-white/10">
              <p className="mb-4 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#94A3B8]">What happens after you apply</p>
              <Steps tone="dark" />
            </div>
          )}
        </div>
      </aside>

      {/* ── The application ── */}
      <main id="apply" className="relative flex-1 min-w-0 px-4 sm:px-8 lg:px-12 -mt-20 lg:mt-0 pb-12 lg:min-h-screen lg:flex lg:flex-col lg:justify-center lg:py-12">
        <div aria-hidden="true" className="hidden lg:block absolute inset-0 bg-dots opacity-50 pointer-events-none" />

        <div className="hidden lg:flex relative items-center justify-between max-w-[480px] w-full mx-auto mb-5">
          <Link to="/resellers" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
            <ArrowLeft size={16} aria-hidden="true" /> Reseller programme
          </Link>
          <p className="text-sm text-[#64748B]">Already a partner? <Link to="/resellers-login" className="font-semibold text-[#B45309] hover:text-[#92400E]">Sign in</Link></p>
        </div>

        <div className="relative max-w-[480px] w-full mx-auto">
          {done ? (
            <div className="dc-enter rounded-[24px] bg-white border border-[#E2E8F0] shadow-premium-lg overflow-hidden">
              <div aria-hidden="true" className="h-[5px] w-full gradient-gold" />
              <div className="p-6 sm:p-8" role="status">
                <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#CCFBF1] to-[#99F6E4] flex items-center justify-center">
                  <Check size={28} strokeWidth={3} className="text-[#0F766E]" aria-hidden="true" />
                </span>
                <h2 ref={doneRef} tabIndex={-1} className="font-display mt-5 text-[1.5rem] sm:text-[1.65rem] font-extrabold text-[#0F172A] tracking-tight leading-tight outline-none">
                  Application received{first ? `, ${first}` : ""}.
                </h2>
                <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                  We&apos;ll email you at <strong className="font-semibold text-[#0F172A] break-all">{email}</strong> as soon as it&apos;s reviewed. Here&apos;s what happens next:
                </p>
                <div className="mt-6"><Steps tone="light" /></div>
                <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a href="/resellers#earnings" className="h-11 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors">
                    See what you could earn <ArrowRight size={14} aria-hidden="true" />
                  </a>
                  <a href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer" className="h-11 rounded-xl bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#166534] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors">
                    <MessageCircle size={14} aria-hidden="true" /> Talk to us sooner
                  </a>
                </div>
                <Link to="/" className="mt-5 block text-center text-[13px] font-semibold text-[#64748B] hover:text-[#0F172A]">Back to home</Link>
              </div>
            </div>
          ) : (
            <div className="dc-enter rounded-[24px] bg-white border border-[#E2E8F0] shadow-premium-lg overflow-hidden">
              {/* The strip doubles as a progress bar — it fills as the application does. */}
              <div aria-hidden="true" className="h-[5px] w-full bg-[#F1F5F9]">
                <div className="h-full gradient-gold transition-[width] duration-500 ease-out" style={{ width: `${Math.max(8, (filled / 5) * 100)}%` }} />
              </div>

              <div className="p-5 sm:p-8">
                <div className="flex items-start gap-3 mb-6">
                  <span className="w-11 h-11 rounded-2xl gradient-gold shadow-gold flex items-center justify-center shrink-0">
                    <Handshake size={20} className="text-[#0F172A]" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-[1.4rem] sm:text-[1.55rem] font-extrabold text-[#0F172A] tracking-tight leading-tight">Your partner application</h2>
                    <p className="text-sm text-[#64748B] mt-0.5">Two minutes. A real person reads it.</p>
                  </div>
                </div>

                <form onSubmit={submit} noValidate className="space-y-1.5">
                  <Field id="ra-name" label="Full name" icon={UserRound} error={show("fullName")}>
                    <input id="ra-name" ref={nameRef} value={form.fullName} maxLength={120}
                      onChange={(e) => set("fullName", e.target.value)} onBlur={() => touch("fullName")}
                      autoComplete="name" placeholder="Your name" aria-invalid={!!show("fullName")} aria-describedby="ra-name-msg"
                      className={inputCls(!!show("fullName"))} />
                  </Field>

                  <Field id="ra-email" label="Email" icon={Mail} error={show("email")}
                    hint={suggestion ? (
                      <span className="text-[#B45309]">Did you mean{" "}
                        <button type="button" onClick={() => set("email", suggestion)} className="font-semibold underline underline-offset-2 hover:text-[#92400E]">{suggestion}</button>?
                      </span>
                    ) : <span className="text-[#94A3B8]">Your partner login will be sent here.</span>}>
                    <input id="ra-email" ref={emailRef} type="email" value={form.email} maxLength={160}
                      onChange={(e) => set("email", e.target.value)} onBlur={() => touch("email")}
                      autoComplete="email" autoCapitalize="none" spellCheck={false} inputMode="email"
                      placeholder="you@yourbusiness.in" aria-invalid={!!show("email")} aria-describedby="ra-email-msg"
                      className={inputCls(!!show("email"))} />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                    <Field id="ra-phone" label="Mobile" optional icon={Phone} error={show("phone")}>
                      <input id="ra-phone" ref={phoneRef} type="tel" value={form.phone} maxLength={30}
                        onChange={(e) => set("phone", e.target.value)} onBlur={() => touch("phone")}
                        autoComplete="tel" inputMode="tel" placeholder="98765 43210"
                        aria-invalid={!!show("phone")} aria-describedby="ra-phone-msg"
                        className={inputCls(!!show("phone"))} />
                    </Field>
                    <Field id="ra-company" label="Business / agency" optional icon={Building2}>
                      <input id="ra-company" value={form.companyName} maxLength={160}
                        onChange={(e) => set("companyName", e.target.value)}
                        autoComplete="organization" placeholder="Business name" aria-describedby="ra-company-msg"
                        className={inputCls(false)} />
                    </Field>
                  </div>

                  <fieldset className="pb-4">
                    <legend className="flex w-full items-baseline justify-between text-xs font-semibold text-[#334155] mb-2">
                      <span>What kind of business are you?</span>
                      <span className="text-[11px] font-normal text-[#94A3B8]">Optional</span>
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {KINDS.map((k) => {
                        const on = kind === k.label;
                        return (
                          <button key={k.label} type="button" aria-pressed={on}
                            onClick={() => setKind(on ? "" : k.label)}
                            className={`h-9 px-3 rounded-full border text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${
                              on ? "bg-[#FFFBEB] border-[#F7B31C] text-[#92400E] shadow-[0_0_0_3px_rgba(247,179,28,0.15)]" : "bg-white border-[#E2E8F0] text-[#475569] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"}`}>
                            {on ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : <k.icon size={13} className="text-[#94A3B8]" aria-hidden="true" />}
                            {k.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <label className={`mb-4 flex items-start gap-3 rounded-2xl border px-3.5 py-3 cursor-pointer transition-colors ${
                    whiteLabel ? "border-[#F7B31C] bg-[#FFFBEB]" : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1]"}`}>
                    <input type="checkbox" checked={whiteLabel} onChange={(e) => setWhiteLabel(e.target.checked)}
                      className="mt-0.5 w-4 h-4 shrink-0 rounded border-[#CBD5E1] accent-[#F7B31C]" />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#0F172A]">I&apos;m interested in white-label</span>
                      <span className="block text-[12px] text-[#64748B] leading-snug mt-0.5">Your own domain, logo and colours · {WHITE_LABEL_PRICE} one-time</span>
                    </span>
                  </label>

                  <div className="pb-2">
                    <label htmlFor="ra-message" className="flex items-baseline justify-between text-xs font-semibold text-[#334155] mb-1.5">
                      <span>How do you plan to sell it?</span>
                      <span className="text-[11px] font-normal text-[#94A3B8] tabular-nums">{form.message.length}/{MSG_MAX}</span>
                    </label>
                    <textarea id="ra-message" value={form.message} maxLength={MSG_MAX} rows={3}
                      onChange={(e) => set("message", e.target.value)}
                      placeholder="Your clients, your city, how many businesses you could bring on…"
                      className="w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-3 text-[16px] sm:text-sm text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/25 focus:bg-white transition-all resize-none placeholder:text-[#94A3B8]" />
                  </div>

                  {serverError && (
                    <div role="alert" className="dc-rise rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-3 mb-3">
                      <p className="text-[13px] font-semibold text-[#991B1B] flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> <span>{serverError}</span>
                      </p>
                    </div>
                  )}

                  <button type="submit" disabled={apply.isPending} aria-busy={apply.isPending}
                    className="group w-full h-[52px] rounded-2xl gradient-gold text-[#0F172A] font-bold text-[15px] flex items-center justify-center gap-2 hover:shadow-gold active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2">
                    {apply.isPending
                      ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Sending…</>
                      : <>Send my application <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></>}
                  </button>

                  <p className="pt-3 text-center text-[11.5px] text-[#94A3B8] leading-snug">
                    {filled < 5
                      ? `${filled} of 5 details added — the more you tell us, the quicker we can review it.`
                      : "Everything's here. Send it whenever you're ready."}
                  </p>
                </form>
              </div>
            </div>
          )}

          {!done && (
            <div className="lg:hidden mt-8 rounded-2xl bg-white border border-[#E2E8F0] p-5">
              <p className="mb-4 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#64748B]">What happens after you apply</p>
              <Steps tone="light" />
            </div>
          )}

          <div className={`mt-6 flex-col sm:flex-row items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-[#64748B] ${done ? "hidden" : "flex"}`}>
            <a href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-[#166534] hover:text-[#14532D]">
              <MessageCircle size={14} aria-hidden="true" /> Questions first? WhatsApp us
            </a>
            <span className="lg:hidden">Already a partner? <Link to="/resellers-login" className="font-semibold text-[#B45309] hover:text-[#92400E]">Sign in</Link></span>
          </div>
        </div>
      </main>
    </div>
  );
}
