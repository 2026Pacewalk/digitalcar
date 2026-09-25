import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Mail, Loader2, AlertCircle, ArrowRight, MailCheck, RotateCw, ExternalLink, Pencil, Inbox, Clock, ShieldCheck } from "lucide-react";
import RecoveryLayout from "@/components/auth/RecoveryLayout";
import { EMAIL_RE, emailSuggestion, inboxFor } from "@/lib/emailHelpers";

/* The server allows 4 reset requests per 5 minutes per connection, so the
   resend button waits a minute between sends — enough to stay well inside it. */
const RESEND_SECONDS = 60;

const readRemembered = () => {
  try {
    const v = (localStorage.getItem("dc_login_id") || "").trim();
    return EMAIL_RE.test(v) ? v : "";
  } catch { return ""; }
};

export default function ForgotPassword() {
  // Prefilled from the sign-in page's "Reset password" shortcut (?email=), or
  // from the email this browser remembered at sign-in.
  const [params] = useSearchParams();
  // Opened from the partner sign-in page: send "Back to sign in" there.
  const signInTo = params.get("for") === "partner" ? "/resellers-login" : "/login";
  const [email, setEmail] = useState(() => {
    const e = (params.get("email") || "").trim();
    return EMAIL_RE.test(e) ? e.slice(0, 254) : readRemembered();
  });
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const req = trpc.auth.requestPasswordReset.useMutation();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async (address: string, isResend = false) => {
    const clean = address.trim().toLowerCase();
    if (!clean) { setError("Enter the email address you use to sign in."); inputRef.current?.focus(); return; }
    if (!EMAIL_RE.test(clean)) { setError("That doesn't look like a complete email address."); inputRef.current?.focus(); return; }
    setError("");
    try {
      await req.mutateAsync({ email: clean });
      setSentTo(clean);
      setCooldown(RESEND_SECONDS);
      if (isResend) toast.success("We've sent another link.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const friendly = /too many/i.test(msg)
        ? "You've asked for a few links in a row. Please wait a few minutes, then try again — the links already sent still work."
        : /fetch|network|ECONNREFUSED/i.test(msg)
          ? "We couldn't reach the server. Check your connection and try again."
          : "Something went wrong sending the link. Please try again.";
      if (isResend) toast.error(friendly); else setError(friendly);
    }
  };

  const suggestion = emailSuggestion(email);
  const inbox = sentTo ? inboxFor(sentTo) : null;

  if (sentTo) {
    return (
      <RecoveryLayout step={2} eyebrow="Link on its way 📬" headline={<>Check your <span className="text-gradient-gold">inbox.</span></>}>
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto">
            <span aria-hidden="true" className="absolute inset-0 rounded-3xl bg-[#DCFCE7] motion-safe:animate-ping [animation-duration:2.4s] opacity-60" />
            <span className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-[#DCFCE7] to-[#BBF7D0] flex items-center justify-center">
              <MailCheck size={36} className="text-[#16A34A]" aria-hidden="true" />
            </span>
          </div>
          <h1 className="font-display mt-5 text-[1.45rem] sm:text-[1.6rem] font-extrabold text-[#0F172A] tracking-tight">Reset link sent</h1>
          {/* Deliberately "if an account exists": the server never reveals whether
              an address is registered, so the page mustn't either. */}
          <p className="mt-2 text-sm text-[#64748B] leading-relaxed" role="status">
            If <span className="font-semibold text-[#0F172A] break-all">{sentTo}</span> has a DigitalCarda account, a link to reset your password is on its way.
          </p>
        </div>

        {inbox && (
          <a href={inbox.href} target="_blank" rel="noopener noreferrer"
            className="group mt-6 w-full h-[52px] rounded-2xl gradient-gold text-[#0F172A] font-bold text-[15px] flex items-center justify-center gap-2 hover:shadow-gold active:scale-[0.98] transition-all">
            <Inbox size={18} aria-hidden="true" /> {inbox.label} <ExternalLink size={15} className="opacity-70" aria-hidden="true" />
          </a>
        )}

        <ul className="mt-6 space-y-2.5 rounded-2xl bg-[#F8FAFC] border border-[#F1F5F9] p-4">
          {[
            { icon: Clock, text: <>The link works for <b>1 hour</b> and can be used once.</> },
            { icon: Inbox, text: <>Not there in a minute? Check <b>Spam</b> or <b>Promotions</b>.</> },
            { icon: ShieldCheck, text: <>Didn&apos;t ask for this? Ignore the email — your password stays the same.</> },
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[12.5px] text-[#475569] leading-snug">
              <t.icon size={15} className="text-[#94A3B8] mt-px shrink-0" aria-hidden="true" /> <span>{t.text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button" onClick={() => send(sentTo, true)} disabled={cooldown > 0 || req.isPending}
            className="h-11 rounded-xl border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#334155] flex items-center justify-center gap-1.5 hover:bg-[#F8FAFC] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
          >
            {req.isPending
              ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Sending…</>
              : cooldown > 0
                ? <><RotateCw size={14} aria-hidden="true" /> Resend in {cooldown}s</>
                : <><RotateCw size={14} aria-hidden="true" /> Resend link</>}
          </button>
          <button
            type="button" onClick={() => { setSentTo(""); setCooldown(0); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="h-11 rounded-xl border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#334155] flex items-center justify-center gap-1.5 hover:bg-[#F8FAFC] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
          >
            <Pencil size={14} aria-hidden="true" /> Different email
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-[#64748B]">
          Remembered it? <Link to={signInTo} className="font-semibold text-[#B45309] hover:text-[#92400E]">Back to sign in</Link>
        </p>
      </RecoveryLayout>
    );
  }

  return (
    <RecoveryLayout step={1} eyebrow="Locked out? It happens 🔑" headline={<>Let&apos;s get you <span className="text-gradient-gold">back in.</span></>}>
      <div className="flex items-start gap-3 mb-6">
        <span className="w-11 h-11 rounded-2xl gradient-gold shadow-gold flex items-center justify-center shrink-0">
          <Mail size={20} className="text-[#0F172A]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-[1.45rem] sm:text-[1.6rem] font-extrabold text-[#0F172A] tracking-tight leading-tight">Reset your password</h1>
          <p className="text-sm text-[#64748B] mt-0.5">We&apos;ll email you a secure link to choose a new one.</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (!req.isPending) send(email); }} noValidate>
        <label htmlFor="fp-email" className="block text-xs font-semibold text-[#334155] mb-1.5">Account email</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" aria-hidden="true" />
          <input
            id="fp-email" ref={inputRef} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
            value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
            placeholder="you@yourbusiness.in" enterKeyHint="send"
            aria-invalid={!!error} aria-describedby="fp-email-help"
            className={`h-12 w-full rounded-xl bg-[#F8FAFC] border pl-10 pr-3 text-[16px] sm:text-sm text-[#0F172A] outline-none focus:ring-2 focus:bg-white transition-all placeholder:text-[#94A3B8] ${error ? "border-[#FCA5A5] focus:border-[#EF4444] focus:ring-[#EF4444]/15" : "border-[#E2E8F0] focus:border-[#F7B31C] focus:ring-[#F7B31C]/25"}`}
          />
        </div>
        <div id="fp-email-help" className="mt-1.5 min-h-[18px] text-[11.5px]" aria-live="polite">
          {error ? (
            <p className="dc-rise font-medium text-[#DC2626] flex items-start gap-1"><AlertCircle size={12} className="mt-px shrink-0" aria-hidden="true" /> {error}</p>
          ) : suggestion ? (
            <p className="text-[#B45309]">
              Did you mean{" "}
              <button type="button" onClick={() => setEmail(suggestion)} className="font-semibold underline underline-offset-2 hover:text-[#92400E] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">{suggestion}</button>?
            </p>
          ) : (
            <p className="text-[#94A3B8]">Use the email you signed up with.</p>
          )}
        </div>

        <button
          type="submit" disabled={req.isPending} aria-busy={req.isPending}
          className="group mt-4 w-full h-[52px] rounded-2xl gradient-gold text-[#0F172A] font-bold text-[15px] flex items-center justify-center gap-2 hover:shadow-gold active:scale-[0.98] disabled:opacity-60 transition-all"
        >
          {req.isPending
            ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Sending link…</>
            : <>Send reset link <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></>}
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] text-[#64748B]">
          <ShieldCheck size={13} className="text-[#16A34A]" aria-hidden="true" /> Secure link · works once · expires in 1 hour
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-[#64748B]">
        Remembered it? <Link to={signInTo} className="font-semibold text-[#B45309] hover:text-[#92400E]">Back to sign in</Link>
      </p>
    </RecoveryLayout>
  );
}
