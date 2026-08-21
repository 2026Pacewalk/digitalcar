import { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import {
  Mail, Lock, Eye, EyeOff, LogIn, Loader2, ArrowLeft, AlertCircle,
  ChevronDown, MessageCircle, WifiOff, CreditCard, ShieldCheck, Check,
} from "lucide-react";
import SignInPanel from "@/components/auth/SignInPanel";
import AdminPanel from "@/components/auth/AdminPanel";
import { SUPPORT, AUTH_TRUST } from "@/components/auth/authMockData";
import { DEMO_USERS } from "@/hooks/useAuth";
import { getToken, getSessionUser, setSession, clearSession } from "@/lib/session";

/* Social sign-in is not wired to anything yet. Rather than show a button that
   only produces a "coming soon" toast in the most valuable slot on the page,
   the block is compiled out. Flip this when OAuth actually lands. */
const SOCIAL_ENABLED = false;

/* Remembers the IDENTIFIER only — never the password. Opt-in, cleared the
   moment the box is unchecked. */
const REMEMBER_KEY = "dc_login_id";

const inputCls =
  "h-12 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-3 text-[16px] sm:text-sm text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/25 focus:bg-white transition-all placeholder:text-[#64748B]";
const iconCls = "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none";
const labelCls = "block text-xs font-semibold text-[#334155] mb-1.5";

type FormError = { title: string; hint?: string } | null;

/* Turn a thrown error into a title the user already knows plus a hint that tells
   them what to actually do next. The titles reuse the exact strings the app
   already shows, so nothing changes meaning. */
function classifyError(msg: string): { title: string; hint: string } {
  if (/too many|rate limit/i.test(msg)) {
    return {
      title: "Too many attempts. Please wait about a minute and try again.",
      hint: "Your account is safe — this is an automatic security pause.",
    };
  }
  if (/suspend|disabled|blocked/i.test(msg)) {
    return {
      title: "Account suspended. Contact support.",
      hint: `Message us on WhatsApp at ${SUPPORT.whatsappLabel.replace("WhatsApp ", "")} and we'll sort it out.`,
    };
  }
  // NOTE: "users" is deliberately NOT in this list — see the comment below.
  if (/Failed query|fetch|ECONNREFUSED|NetworkError|Failed to fetch/i.test(msg)) {
    return {
      title: "Server is temporarily unavailable. Please try again shortly.",
      hint: "Nothing has changed on your card — it is still live for your customers.",
    };
  }
  return {
    title: msg || "Invalid email or password",
    hint: "Check the ID you used — your registered email address and mobile number both work here.",
  };
}

export default function Login({ adminMode = false }: { adminMode?: boolean }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");
  // Only same-site paths. "//evil.com" and "/\evil.com" are browser-protocol
  // relative URLs — they start with "/" but navigate OFF-SITE, so a crafted
  // ?next= could bounce a freshly-authenticated user to an attacker's page.
  const next =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.startsWith("/\\")
      ? nextPath : "";
  const loginMut = trpc.auth.login.useMutation();
  const slot = adminMode ? "admin" : "main"; // this login page's portal

  // Already signed in and sent here to reactivate → go straight to the target.
  useEffect(() => {
    if (next && getToken(slot) && getSessionUser(slot)) navigate(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<FormError>(null);
  const [capsOn, setCapsOn] = useState(false);
  const [remember, setRemember] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && navigator.onLine === false);

  const idRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  // Restore a remembered identifier and send focus straight to the password.
  useEffect(() => {
    let saved = "";
    try { saved = localStorage.getItem(REMEMBER_KEY) || ""; } catch { /* storage blocked */ }
    if (saved) { setEmail(saved); setSavedId(saved); setRemember(true); }
    // Desktop only: focusing an input on mobile throws up the keyboard and hides
    // the page before the user has read a word of it.
    const isDesktop = typeof window !== "undefined" && window.matchMedia?.("(min-width:1024px)").matches;
    if (!isDesktop) return;
    if (saved) pwRef.current?.focus();
    else idRef.current?.focus();
  }, []);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const routeFor = (role: string) => {
    if (role === "super_admin") return "/admin";
    if (role === "reseller") return "/reseller";
    return "/dashboard";
  };

  // Portal gate: super-admins may ONLY sign in from the admin URL, and the admin
  // URL is admins-only. Clears the just-set session and blocks navigation on a
  // mismatch. Returns true if the login may proceed.
  const gateOk = (role: string): boolean => {
    if (!adminMode && role === "super_admin") {
      clearSession("main");
      toast.error("Administrator accounts must sign in from the admin portal.");
      return false;
    }
    if (adminMode && role !== "super_admin") {
      clearSession("admin");
      toast.error("This is the admin portal. Please use the main sign-in page.");
      setTimeout(() => navigate("/login"), 1400);
      return false;
    }
    return true;
  };

  const rememberId = (mail: string) => {
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, mail.trim());
      else localStorage.removeItem(REMEMBER_KEY);
    } catch { /* storage blocked — sign-in still works */ }
  };

  // Try the real backend; if the DB/server is unavailable, fall back to the
  // built-in demo accounts so the app is fully usable in local dev without MySQL.
  const demoLogin = (mail: string, pass: string) => {
    // Only in local dev — never allow the built-in demo credentials in production.
    if (!import.meta.env.DEV) return false;
    const entry = DEMO_USERS[mail.toLowerCase().trim()];
    if (!entry || entry.password !== pass) return false;
    setSession("demo_token_" + entry.user.id, entry.user, slot);
    if (!gateOk(entry.user.role)) return true; // handled (rejected) — don't fall through
    toast.success("Welcome back! (demo mode)");
    navigate(next || routeFor(entry.user.role));
    return true;
  };

  const doLogin = async (mail: string, pass: string) => {
    setLoading(true);
    try {
      const res = await loginMut.mutateAsync({ email: mail.trim(), password: pass });
      setSession(res.token, res.user, slot);
      // gateOk rejecting does NOT navigate, so the spinner has to be released
      // here — otherwise a super-admin who signs in at /login is left staring at
      // a disabled "Signing in…" button forever.
      if (!gateOk(res.user.role)) { setLoading(false); return; }
      rememberId(mail);
      toast.success("Welcome back!");
      navigate(next || routeFor(res.user.role));
    } catch (err) {
      if (demoLogin(mail, pass)) { setLoading(false); return; }
      const msg = err instanceof Error ? err.message : "";
      // NOTE: "users" was previously in this list, which meant any error whose
      // text merely contained that word (e.g. a validation message) was reported
      // to the customer as a server outage. Match transport failures only.
      const backendDown = /Failed query|fetch|ECONNREFUSED|NetworkError|Failed to fetch/i.test(msg);
      toast.error(backendDown ? "Server is temporarily unavailable. Please try again shortly." : (msg || "Invalid email or password"));
      setFormError(classifyError(backendDown ? "Failed to fetch" : msg));
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // The server rate-limits login at 8/min per IP and 10/5min per identifier
    // (auth-router.ts:326,328). A double Enter must not burn two attempts.
    if (loading) return;
    setFormError(null);
    if (!email || !password) {
      toast.error("Please fill in all fields");
      setFormError({ title: "Please fill in all fields", hint: "Enter your email or mobile number, then your password." });
      return;
    }
    doLogin(email, password);
  };

  /* Toggling the password type resets the caret to the end in every browser.
     Save it and put it back on the next frame so a long password stays editable
     where the user actually was. */
  const togglePassword = () => {
    const el = pwRef.current;
    const pos = el?.selectionStart ?? null;
    setShowPassword((v) => !v);
    if (el && pos != null) {
      requestAnimationFrame(() => { try { el.setSelectionRange(pos, pos); el.focus(); } catch { /* ignore */ } });
    }
  };

  const onCaps = (e: React.KeyboardEvent<HTMLInputElement>) => {
    try { setCapsOn(e.getModifierState?.("CapsLock") ?? false); } catch { /* ignore */ }
  };

  const forgetMe = () => {
    try { localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ }
    setSavedId(""); setRemember(false); setEmail(""); setPassword("");
    idRef.current?.focus();
  };

  const socialSoon = () => toast.info("Social sign-in is coming soon — use email for now.");

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <a
        href="#login-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:rounded-lg focus:bg-[#0F172A] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to sign in
      </a>

      {adminMode ? <AdminPanel /> : <SignInPanel />}

      <main id="login-main" className="flex-1 relative flex flex-col items-center justify-center overflow-y-auto px-4 py-10 sm:px-8 lg:px-10">
        <div aria-hidden="true" className="absolute inset-0 bg-dots opacity-60 pointer-events-none lg:hidden" />

        <Link to="/" className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
          <ArrowLeft size={16} aria-hidden="true" /> Home
        </Link>

        <div className="w-full max-w-[420px] min-w-0 relative">
          <div className="lg:hidden flex items-center gap-2.5 mb-7 justify-center">
            <span className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center"><CreditCard size={18} className="text-[#0F172A]" aria-hidden="true" /></span>
            <span className="text-xl font-bold text-[#0F172A]">Digital<span className="text-gradient-gold">Carda</span></span>
          </div>

          {/* THE FORM CARD — "the back of the card", where the owner writes. The
              5px edge bar is the one piece of art direction a 320px phone sees,
              and it rhymes with the mockup's gold header on the panel. */}
          <div className="relative rounded-[24px] bg-white border border-[#E2E8F0] shadow-premium-lg overflow-hidden">
            <div aria-hidden="true" className={`h-[5px] w-full ${adminMode ? "bg-[#334155]" : "gradient-gold"}`} />

            <div className="p-5 sm:p-7">
              <div className="text-center mb-5">
                <h1 className="text-[22px] sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
                  {adminMode ? "Admin sign in" : "Sign in to your account"}
                </h1>
                <p className="text-sm text-[#64748B] mt-1">
                  {adminMode ? "Restricted area — authorised staff only" : "Access your dashboard and digital cards"}
                </p>
              </div>

              {adminMode && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] px-3.5 py-2.5">
                  <ShieldCheck size={15} className="text-[#475569] mt-0.5 shrink-0" aria-hidden="true" />
                  <p className="text-[12.5px] leading-snug text-[#475569]">Customer and reseller accounts must use the main sign-in page.</p>
                </div>
              )}

              {!adminMode && next && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-3.5 py-2.5">
                  <Check size={15} className="text-[#B45309] mt-0.5 shrink-0" aria-hidden="true" />
                  <p className="text-[12.5px] leading-snug text-[#92400E]">Sign in to reactivate this card — your link and QR stay exactly the same.</p>
                </div>
              )}

              {!adminMode && savedId && (
                <div className="mb-4 flex items-center justify-between gap-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2.5">
                  <p className="text-[12.5px] text-[#475569] truncate">Signing in as <span className="font-semibold text-[#0F172A]">{savedId}</span></p>
                  <button type="button" onClick={forgetMe} className="text-[12px] font-semibold text-[#B45309] hover:text-[#92400E] shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                    Not you?
                  </button>
                </div>
              )}

              {offline && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-2.5" role="status">
                  <WifiOff size={15} className="text-[#B91C1C] mt-0.5 shrink-0" aria-hidden="true" />
                  <p className="text-[12.5px] leading-snug text-[#991B1B]">You&apos;re offline — check your connection and try again.</p>
                </div>
              )}

              {SOCIAL_ENABLED && !adminMode && (
                <button onClick={socialSoon} type="button" className="w-full h-11 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-center gap-2.5 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors mb-5">
                  Continue with Google
                </button>
              )}

              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="login-id" className={labelCls}>Email or mobile number</label>
                  <div className="relative">
                    <Mail size={16} className={iconCls} aria-hidden="true" />
                    {/* type stays "text": resolveLoginUser (auth-router.ts:159)
                        accepts an email OR a phone number, and type="email"
                        would reject a mobile at the browser level. */}
                    <input
                      id="login-id" name="username" ref={idRef} type="text" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@yourbusiness.in"
                      autoComplete="username" autoCapitalize="none" autoCorrect="off"
                      spellCheck={false} enterKeyHint="next"
                      aria-describedby="login-id-help"
                      className={inputCls}
                    />
                  </div>
                  <p id="login-id-help" className="text-[11.5px] text-[#94A3B8] mt-1.5">Your registered mobile number works here too.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="text-xs font-semibold text-[#334155]">Password</label>
                    <Link to="/forgot-password" className="text-xs text-[#B45309] hover:text-[#92400E] font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Lock size={16} className={iconCls} aria-hidden="true" />
                    <input
                      id="login-password" name="password" ref={pwRef}
                      type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={onCaps} onKeyDown={onCaps} onBlur={() => setCapsOn(false)}
                      placeholder="Enter your password"
                      autoComplete="current-password" enterKeyHint="go"
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button" onClick={togglePassword}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Reserved height: the warning must never shift the layout
                      under a user who is mid-password. */}
                  <div className="min-h-[18px] mt-1.5">
                    {capsOn && (
                      <p className="dc-rise text-[11.5px] font-medium text-[#B45309] flex items-center gap-1.5">
                        <AlertCircle size={12} aria-hidden="true" /> Caps Lock is on.
                      </p>
                    )}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox" checked={remember}
                    onChange={(e) => { setRemember(e.target.checked); if (!e.target.checked) { try { localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ } setSavedId(""); } }}
                    className="rounded border-[#E2E8F0] accent-[#F7B31C] w-4 h-4"
                  />
                  <span className="text-xs text-[#64748B]">
                    Remember my email<span className="hidden min-[360px]:inline"> on this device</span>
                  </span>
                </label>

                {/* Persistent, two-part error: the title is what went wrong, the
                    hint is what to do about it. Deliberately NO shake — the form
                    holds the focused input, and shaking delays the re-read. */}
                {formError && (
                  <div role="alert" className="dc-rise rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-3">
                    <p className="text-[13px] font-semibold text-[#991B1B] flex items-start gap-2">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{formError.title}</span>
                    </p>
                    {formError.hint && <p className="text-[12px] text-[#B91C1C] mt-1.5 pl-6 leading-snug">{formError.hint}</p>}
                  </div>
                )}

                <button
                  type="submit" disabled={loading || offline} aria-busy={loading}
                  className={`w-full h-12 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${adminMode ? "bg-[#0F172A] hover:bg-[#1E293B] text-white" : "gradient-gold text-[#0F172A] hover:shadow-gold"}`}
                >
                  {loading
                    ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Signing in…<span className="sr-only">Signing in, please wait</span></>
                    : <><LogIn size={18} aria-hidden="true" /> Sign In</>}
                </button>
              </form>
            </div>
          </div>

          {/* Help lives OUTSIDE the card — the card holds only the task. */}
          <div className="mt-5">
            <button
              type="button" onClick={() => setHelpOpen((v) => !v)} aria-expanded={helpOpen} aria-controls="login-help"
              className="w-full flex items-center justify-between gap-2 text-[13px] font-semibold text-[#475569] hover:text-[#0F172A] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] px-1 py-1"
            >
              Trouble signing in?
              <ChevronDown size={15} className={`transition-transform duration-200 ${helpOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            <div id="login-help" className={`dc-collapse grid ${helpOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div className={helpOpen ? "pt-3" : "pt-3 invisible"} {...(helpOpen ? {} : { inert: "" as unknown as boolean })}>
                  <p className="text-[12px] font-semibold text-[#334155]">Any of these works as your sign-in ID</p>
                  <ul className="mt-2 space-y-1.5 text-[12.5px] text-[#64748B]">
                    <li className="flex gap-2"><span className="text-[#F7B31C]" aria-hidden="true">•</span> The email address you registered with</li>
                    <li className="flex gap-2"><span className="text-[#F7B31C]" aria-hidden="true">•</span> Your registered mobile number</li>
                    <li className="flex gap-2"><span className="text-[#F7B31C]" aria-hidden="true">•</span> Long-standing customers can also use their username or card link</li>
                  </ul>
                  <p className="text-[12.5px] text-[#64748B] mt-3 leading-snug">
                    {adminMode
                      ? <>Staff accounts: reset your password or email <a href={`mailto:${SUPPORT.email}`} className="font-semibold text-[#B45309] hover:text-[#92400E]">{SUPPORT.email}</a>.</>
                      : <>Still stuck? <Link to="/forgot-password" className="font-semibold text-[#B45309] hover:text-[#92400E]">Reset password</Link>, or <a href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#B45309] hover:text-[#92400E] inline-flex items-center gap-1"><MessageCircle size={12} aria-hidden="true" /> WhatsApp us</a> — we&apos;ll get you back in.</>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {!adminMode && (
            <p className="mt-6 text-center text-sm text-[#64748B]">
              Don&apos;t have an account? <Link to="/signup" className="text-[#B45309] hover:text-[#92400E] font-semibold">Sign Up Free</Link>
            </p>
          )}

          {/* Mobile-only trust ribbon — the panel's job, done in one line for the
              60–70% who never see the panel. */}
          {!adminMode && (
            <div className="lg:hidden mt-8 text-center">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11.5px] font-medium text-[#64748B]">
                <span className="inline-flex items-center gap-1"><Check size={12} className="text-[#16A34A]" aria-hidden="true" /> 30-Day Free Trial</span>
                <span className="inline-flex items-center gap-1"><Check size={12} className="text-[#16A34A]" aria-hidden="true" /> No credit card</span>
                <span className="inline-flex items-center gap-1"><Check size={12} className="text-[#16A34A]" aria-hidden="true" /> Your QR never changes</span>
              </div>
              <p className="text-[11.5px] text-[#94A3B8] mt-2">Trusted by <span className="font-semibold text-[#475569]">{AUTH_TRUST.businesses}</span> businesses</p>
            </div>
          )}

          {import.meta.env.DEV && !adminMode && (
            <button
              type="button"
              onClick={() => { setEmail("demo@digitalcarda.com"); setPassword("demo123"); }}
              className="mt-6 w-full text-[11px] font-medium text-[#94A3B8] hover:text-[#64748B] border border-dashed border-[#E2E8F0] rounded-lg py-2"
            >
              Dev only — fill demo customer account
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
