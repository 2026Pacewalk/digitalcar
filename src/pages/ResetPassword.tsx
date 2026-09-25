import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Loader2, ShieldAlert, KeyRound, Wand2, Copy, Check, X, AlertCircle, ArrowRight, PartyPopper, RotateCw } from "lucide-react";
import RecoveryLayout from "@/components/auth/RecoveryLayout";
import { passwordProblems, passwordChecks, generateStrongPassword } from "@/lib/password";

const STRENGTH = [
  { label: "", color: "#94A3B8" },
  { label: "Weak", color: "#EF4444" },
  { label: "Fair", color: "#F59E0B" },
  { label: "Good", color: "#3B82F6" },
  { label: "Strong", color: "#16A34A" },
];

type View = "form" | "done" | "badLink";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  // A new partner's set-password link carries for=partner (api/reseller-router.ts).
  const signInTo = params.get("for") === "partner" ? "/resellers-login" : "/login";
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>(token ? "form" : "badLink");
  const [badLinkReason, setBadLinkReason] = useState(token ? "" : "This link is missing part of its address — it may have been cut off when copied.");
  const [countdown, setCountdown] = useState(6);
  const pwRef = useRef<HTMLInputElement>(null);

  const reset = trpc.auth.resetPassword.useMutation();

  // After success, head to sign-in on our own — but show it, and let them go now.
  useEffect(() => {
    if (view !== "done") return;
    if (countdown <= 0) { navigate(signInTo); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [view, countdown, navigate, signInTo]);

  const checks = passwordChecks(pwd);
  const passed = checks.filter((c) => c.ok).length;
  const strength = !pwd ? 0 : Math.max(1, passed);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reset.isPending) return;
    // Check the SAME rules the server enforces. This page used to test only the
    // length, so "password123" passed here and then failed on the server with a
    // raw validation error.
    const probs = passwordProblems(pwd);
    if (!pwd) { setError("Choose a new password."); pwRef.current?.focus(); return; }
    if (probs.length) { setError(`Add ${probs.join(", ")}.`); pwRef.current?.focus(); return; }
    setError("");
    try {
      await reset.mutateAsync({ token, newPassword: pwd });
      setView("done");
      toast.success("Password updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/invalid|expired/i.test(msg)) {
        setBadLinkReason("This link is invalid or has expired — reset links work for 1 hour.");
        setView("badLink");
      } else if (/already been used/i.test(msg)) {
        setBadLinkReason("This link has already been used. Each link works only once.");
        setView("badLink");
      } else if (/too many/i.test(msg)) {
        setError("Too many attempts from this connection. Please wait a few minutes and try again.");
      } else {
        setError("We couldn't update your password. Please try again.");
      }
    }
  };

  const generate = () => {
    setPwd(generateStrongPassword(16));
    setShow(true); setCopied(false); setError("");
  };

  const copy = async () => {
    if (!pwd) return;
    let ok = false;
    try { await navigator.clipboard.writeText(pwd); ok = true; } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = pwd; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy"); document.body.removeChild(ta);
      } catch { ok = false; }
    }
    if (ok) { setCopied(true); toast.success("Password copied"); setTimeout(() => setCopied(false), 2000); }
    else toast.error("Couldn't copy — select the password and copy it manually.");
  };

  if (view === "done") {
    return (
      <RecoveryLayout step={3} eyebrow="All sorted 🎉" headline={<>You&apos;re <span className="text-gradient-gold">back in business.</span></>}>
        <div className="text-center" role="status">
          <span className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#DCFCE7] to-[#BBF7D0] flex items-center justify-center">
            <PartyPopper size={36} className="text-[#16A34A]" aria-hidden="true" />
          </span>
          <h1 className="font-display mt-5 text-[1.45rem] sm:text-[1.6rem] font-extrabold text-[#0F172A] tracking-tight">Password updated</h1>
          <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
            Sign in with your new password. We&apos;ve also emailed you a confirmation — if you didn&apos;t make this change, reply to it straight away.
          </p>
        </div>
        <Link to={signInTo} className="group mt-6 w-full h-[52px] rounded-2xl gradient-gold text-[#0F172A] font-bold text-[15px] flex items-center justify-center gap-2 hover:shadow-gold active:scale-[0.98] transition-all">
          Sign in now <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
        <p className="mt-3 text-center text-[12px] text-[#94A3B8]">Taking you to sign in in {countdown}s…</p>
      </RecoveryLayout>
    );
  }

  if (view === "badLink") {
    return (
      <RecoveryLayout step={2} eyebrow="That link didn't work" headline={<>Let&apos;s send you a <span className="text-gradient-gold">fresh one.</span></>}>
        <div className="text-center">
          <span className="w-20 h-20 mx-auto rounded-3xl bg-[#FEF3C7] flex items-center justify-center">
            <ShieldAlert size={34} className="text-[#B45309]" aria-hidden="true" />
          </span>
          <h1 className="font-display mt-5 text-[1.45rem] sm:text-[1.6rem] font-extrabold text-[#0F172A] tracking-tight">This reset link can&apos;t be used</h1>
          <p className="mt-2 text-sm text-[#64748B] leading-relaxed">{badLinkReason} Your password hasn&apos;t changed.</p>
        </div>
        <Link to="/forgot-password" className="group mt-6 w-full h-[52px] rounded-2xl gradient-gold text-[#0F172A] font-bold text-[15px] flex items-center justify-center gap-2 hover:shadow-gold active:scale-[0.98] transition-all">
          <RotateCw size={17} aria-hidden="true" /> Send me a new link
        </Link>
        <p className="mt-6 text-center text-sm text-[#64748B]">
          Remembered it? <Link to="/login" className="font-semibold text-[#B45309] hover:text-[#92400E]">Back to sign in</Link>
        </p>
      </RecoveryLayout>
    );
  }

  return (
    <RecoveryLayout step={3} eyebrow="Almost there ✨" headline={<>Choose a new <span className="text-gradient-gold">password.</span></>}>
      <div className="flex items-start gap-3 mb-6">
        <span className="w-11 h-11 rounded-2xl gradient-gold shadow-gold flex items-center justify-center shrink-0">
          <KeyRound size={20} className="text-[#0F172A]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-[1.45rem] sm:text-[1.6rem] font-extrabold text-[#0F172A] tracking-tight leading-tight">Set a new password</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Pick one you don&apos;t use anywhere else.</p>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label htmlFor="rp-password" className="text-xs font-semibold text-[#334155]">New password</label>
          <button type="button" onClick={generate}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -mr-2 text-[12px] font-semibold text-[#B45309] hover:bg-[#FEF3C7] hover:text-[#92400E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
            <Wand2 size={13} aria-hidden="true" /> Generate strong password
          </button>
        </div>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" aria-hidden="true" />
          <input
            id="rp-password" ref={pwRef} name="new-password" autoComplete="new-password"
            type={show ? "text" : "password"} value={pwd}
            onChange={(e) => { setPwd(e.target.value); setCopied(false); if (error) setError(""); }}
            onKeyUp={(e) => setCapsOn(e.getModifierState?.("CapsLock") ?? false)} onBlur={() => setCapsOn(false)}
            placeholder="Create a strong password" enterKeyHint="done"
            aria-invalid={!!error} aria-describedby="rp-rules"
            className={`h-12 w-full rounded-xl bg-[#F8FAFC] border pl-10 ${pwd ? "pr-[76px]" : "pr-11"} text-[16px] sm:text-sm text-[#0F172A] outline-none focus:ring-2 focus:bg-white transition-all placeholder:text-[#94A3B8] ${error ? "border-[#FCA5A5] focus:border-[#EF4444] focus:ring-[#EF4444]/15" : "border-[#E2E8F0] focus:border-[#F7B31C] focus:ring-[#F7B31C]/25"}`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {pwd && (
              <button type="button" onClick={copy} aria-label={copied ? "Password copied" : "Copy password"} title={copied ? "Copied" : "Copy password"}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${copied ? "text-[#16A34A] bg-[#DCFCE7]" : "text-[#94A3B8] hover:text-[#334155] hover:bg-[#F1F5F9]"}`}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            )}
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#334155] hover:bg-[#F1F5F9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="mt-2.5" id="rp-rules">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-1" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className="h-1.5 flex-1 rounded-full transition-colors duration-300" style={{ background: n <= strength ? STRENGTH[strength].color : "#E2E8F0" }} />
              ))}
            </div>
            <span className="text-[11px] font-semibold w-14 text-right" style={{ color: STRENGTH[strength].color }}>{pwd ? STRENGTH[strength].label : ""}</span>
          </div>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
            {checks.map((c) => (
              <li key={c.label} className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium transition-colors ${c.ok ? "text-[#16A34A]" : "text-[#94A3B8]"}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${c.ok ? "bg-[#DCFCE7]" : "bg-[#F1F5F9]"}`}>
                  {c.ok ? <Check size={10} aria-hidden="true" /> : <X size={10} aria-hidden="true" />}
                </span>
                {c.label}
              </li>
            ))}
          </ul>
          {capsOn && <p className="dc-rise mt-2 text-[11.5px] font-medium text-[#B45309] flex items-center gap-1.5"><AlertCircle size={12} aria-hidden="true" /> Caps Lock is on.</p>}
        </div>

        {error && (
          <div role="alert" className="dc-rise mt-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-3 text-[13px] font-medium text-[#991B1B] flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
          </div>
        )}

        <button
          type="submit" disabled={reset.isPending} aria-busy={reset.isPending}
          className="group mt-5 w-full h-[52px] rounded-2xl gradient-gold text-[#0F172A] font-bold text-[15px] flex items-center justify-center gap-2 hover:shadow-gold active:scale-[0.98] disabled:opacity-60 transition-all"
        >
          {reset.isPending
            ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Updating…</>
            : <>Update password <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></>}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#64748B]">
        Remembered it? <Link to="/login" className="font-semibold text-[#B45309] hover:text-[#92400E]">Back to sign in</Link>
      </p>
    </RecoveryLayout>
  );
}
