import { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import {
  Mail, Lock, Eye, EyeOff, LogIn, Loader2, ArrowLeft, AlertCircle, Phone,
  ChevronDown, MessageCircle, WifiOff, ShieldCheck, Check, KeyRound, Link2, QrCode, Inbox, Sparkles,
} from "lucide-react";
import SignInPanel from "@/components/auth/SignInPanel";
import AdminPanel from "@/components/auth/AdminPanel";
import { SUPPORT, AUTH_TRUST } from "@/components/auth/authMockData";
import { DEMO_USERS } from "@/hooks/useAuth";
import { getToken, getSessionUser, setSession, clearSession } from "@/lib/session";
import GoogleSignInButton, { useGoogleClientId, type GoogleSignInResult } from "@/components/auth/GoogleSignInButton";
import { EMAIL_RE, emailSuggestion } from "@/lib/emailHelpers";

/* Remembers the IDENTIFIER only — never the password. Opt-in, cleared the
   moment the box is unchecked. The first name rides along only so the page can
   say "Welcome back, Rahul" next time; it's removed together with the ID. */
const REMEMBER_KEY = "dc_login_id";
const REMEMBER_NAME_KEY = "dc_login_name";
/* How this browser last signed in ("google" | "password"), so a Google user
   isn't left guessing which button they used. Not personal data. */
const LAST_METHOD_KEY = "dc_login_method";

const inputBase =
  "h-12 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-3 text-[16px] sm:text-sm text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/25 focus:bg-white transition-all placeholder:text-[#94A3B8]";
const iconCls = "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none transition-colors";
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

/* What the visitor is typing in the ID field, so the icon, keyboard hint and
   helper line can follow along. Purely presentational — the server resolves
   the identifier the same way whatever this says. */
function identifierKind(v: string): "email" | "phone" | "empty" | "other" {
  const t = v.trim();
  if (!t) return "empty";
  if (t.includes("@")) return "email";
  if (/^[+\d][\d\s()-]*$/.test(t) && t.replace(/\D/g, "").length >= 3) return "phone";
  return "other";
}

const readLS = (k: string) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };

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
  const googleClientId = useGoogleClientId();
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
  const [savedName, setSavedName] = useState("");
  const [lastMethod] = useState(() => (adminMode ? "" : readLS(LAST_METHOD_KEY)));
  const [helpOpen, setHelpOpen] = useState(false);
  const [failures, setFailures] = useState(0);
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && navigator.onLine === false);

  const idRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  // Restore a remembered identifier and send focus straight to the password.
  useEffect(() => {
    const saved = adminMode ? "" : readLS(REMEMBER_KEY);
    if (saved) {
      setEmail(saved); setSavedId(saved); setRemember(true);
      setSavedName(readLS(REMEMBER_NAME_KEY));
    }
    // Desktop only: focusing an input on mobile throws up the keyboard and hides
    // the page before the user has read a word of it.
    const isDesktop = typeof window !== "undefined" && window.matchMedia?.("(min-width:1024px)").matches;
    if (!isDesktop) return;
    if (saved) pwRef.current?.focus();
    else idRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const routeFor = (role: string) => {
    if (role === "super_admin" || role === "staff") return "/admin";
    if (role === "reseller") return "/reseller";
    return "/dashboard";
  };

  // Portal gate: super-admins may ONLY sign in from the admin URL, and the admin
  // URL is admins-only. Clears the just-set session and blocks navigation on a
  // mismatch. Returns true if the login may proceed.
  const gateOk = (role: string): boolean => {
    if (!adminMode && (role === "super_admin" || role === "staff")) {
      clearSession("main");
      toast.error("Administrator accounts must sign in from the admin portal.");
      return false;
    }
    if (adminMode && role !== "super_admin" && role !== "staff") {
      clearSession("admin");
      toast.error("This is the admin portal. Please use the main sign-in page.");
      setTimeout(() => navigate("/login"), 1400);
      return false;
    }
    return true;
  };

  const rememberId = (mail: string, fullName?: string) => {
    if (adminMode) return; // staff sign-ins are never remembered on shared machines
    try {
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, mail.trim());
        const first = String(fullName || "").trim().split(/\s+/)[0] || "";
        if (first) localStorage.setItem(REMEMBER_NAME_KEY, first.slice(0, 40));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
        localStorage.removeItem(REMEMBER_NAME_KEY);
      }
    } catch { /* storage blocked — sign-in still works */ }
  };

  const noteMethod = (m: "google" | "password") => {
    if (adminMode) return;
    try { localStorage.setItem(LAST_METHOD_KEY, m); } catch { /* ignore */ }
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
      rememberId(mail, res.user.fullName);
      noteMethod("password");
      const first = String(res.user.fullName || "").trim().split(/\s+/)[0];
      toast.success(first && !adminMode ? `Welcome back, ${first}!` : "Welcome back!");
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
      if (!backendDown) setFailures((n) => n + 1);
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
      (!email ? idRef : pwRef).current?.focus();
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
    try { localStorage.removeItem(REMEMBER_KEY); localStorage.removeItem(REMEMBER_NAME_KEY); } catch { /* ignore */ }
    setSavedId(""); setSavedName(""); setRemember(false); setEmail(""); setPassword("");
    idRef.current?.focus();
  };

  /* Signed in with Google. The server refuses administrator accounts, and a
     first-time Google user gets a new account and lands in the card builder. */
  const handleGoogle = (res: GoogleSignInResult) => {
    setSession(res.token, res.user, slot);
    if (!gateOk(res.user.role)) return;
    noteMethod("google");
    toast.success(res.created ? "Account created! Welcome to DigitalCarda." : "Welcome back!");
    navigate(res.created ? "/dashboard/build" : next || routeFor(res.user.role));
  };

  const kind = identifierKind(email);
  const suggestion = kind === "email" ? emailSuggestion(email) : "";
  const IdIcon = kind === "phone" ? Phone : Mail;
  const resetHref = `/forgot-password${EMAIL_RE.test(email.trim()) ? `?email=${encodeURIComponent(email.trim())}` : ""}`;
  const firstName = savedName;

  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:flex lg:items-start">
      <a
        href="#login-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:rounded-lg focus:bg-[#0F172A] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to sign in
      </a>

      {adminMode ? <AdminPanel /> : <SignInPanel firstName={firstName} />}

      <div className="flex-1 min-w-0">
        {/* ── Branded header for phones & tablets (the desktop panel is hidden there) ── */}
        <header className="lg:hidden relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] px-4 sm:px-8 pt-4 pb-24">
          <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
          {!adminMode && <div aria-hidden="true" className="absolute -top-20 -right-16 w-72 h-72 rounded-full blur-3xl bg-[#F7B31C]/20" />}
          {!adminMode && <div aria-hidden="true" className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full blur-3xl bg-[#14B8A6]/15" />}

          <div className="relative max-w-[460px] mx-auto">
            <div className="flex items-center justify-between">
              <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#CBD5E1] hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                <ArrowLeft size={15} aria-hidden="true" /> Home
              </Link>
              <Link to="/" aria-label="DigitalCarda home" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                <img src="/logo.png" alt="" className="h-8 w-auto object-contain" />
              </Link>
              {adminMode
                ? <span className="w-[52px]" aria-hidden="true" />
                : <Link to="/signup" className="text-[13px] font-semibold text-[#FCD34D] hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">Join free</Link>}
            </div>

            {adminMode ? (
              <div className="mt-7 flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-[#334155] flex items-center justify-center shrink-0"><ShieldCheck size={21} className="text-[#CBD5E1]" aria-hidden="true" /></span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#94A3B8]">Restricted area</p>
                  <p className="font-display text-[1.45rem] font-extrabold text-white tracking-tight leading-tight">Admin console</p>
                </div>
              </div>
            ) : (
              <>
                <p className="dc-enter mt-6 text-[13px] font-semibold text-[#FCD34D]">
                  {firstName ? `Welcome back, ${firstName} 👋` : "Welcome back 👋"}
                </p>
                <p className="dc-enter dc-enter-1 font-display mt-1.5 text-[1.7rem] sm:text-[2rem] leading-[1.1] font-extrabold text-white tracking-tight">
                  Your card never went <span className="text-gradient-gold">offline.</span>
                </p>
                {/* What kept working while they were away — the reassurance the
                    desktop panel gives, as three chips. */}
                <ul className="dc-enter dc-enter-2 mt-4 flex flex-wrap gap-2">
                  {[{ i: Link2, t: "Link live" }, { i: QrCode, t: "QR working" }, { i: Inbox, t: "Enquiries saved" }].map((c) => (
                    <li key={c.t} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/10 px-3 py-1.5 text-[12px] font-medium text-[#E2E8F0]">
                      <span className="dc-live-dot h-1.5 w-1.5 rounded-full bg-[#14B8A6]" aria-hidden="true" />
                      <c.i size={12} className="text-[#94A3B8]" aria-hidden="true" /> {c.t}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </header>

        <main id="login-main" className="relative px-4 sm:px-8 lg:px-10 pb-12 -mt-14 lg:mt-0 lg:min-h-screen lg:flex lg:flex-col lg:justify-center lg:py-12">
          <div aria-hidden="true" className="hidden lg:block absolute inset-0 bg-dots opacity-50 pointer-events-none" />

          <div className="hidden lg:flex relative items-center justify-between max-w-[440px] w-full mx-auto mb-5">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
              <ArrowLeft size={16} aria-hidden="true" /> Home
            </Link>
            {!adminMode && (
              <p className="text-sm text-[#64748B]">New here? <Link to="/signup" className="font-semibold text-[#B45309] hover:text-[#92400E]">Create a free card</Link></p>
            )}
          </div>

          <div className="relative max-w-[440px] w-full mx-auto">
            {/* THE FORM CARD — "the back of the card", where the owner writes. */}
            <div className="dc-enter relative rounded-[24px] bg-white border border-[#E2E8F0] shadow-premium-lg overflow-hidden">
              <div aria-hidden="true" className={`h-[5px] w-full ${adminMode ? "bg-[#334155]" : "gradient-gold"}`} />

              <div className="p-5 sm:p-8">
                <div className="flex items-start gap-3 mb-6">
                  <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${adminMode ? "bg-[#0F172A]" : "gradient-gold shadow-gold"}`}>
                    {adminMode ? <ShieldCheck size={20} className="text-white" aria-hidden="true" /> : <KeyRound size={20} className="text-[#0F172A]" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0">
                    <h1 className="font-display text-[1.45rem] sm:text-[1.6rem] font-extrabold text-[#0F172A] tracking-tight leading-tight">
                      {adminMode ? "Admin sign in" : "Sign in to your account"}
                    </h1>
                    <p className="text-sm text-[#64748B] mt-0.5">
                      {adminMode ? "Restricted area — authorised staff only" : "Manage your card, leads and analytics"}
                    </p>
                  </div>
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
                  <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#FFFBEB] to-[#F8FAFC] border border-[#FDE68A] px-3 py-2.5">
                    <span className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center text-[14px] font-extrabold text-[#0F172A] shrink-0" aria-hidden="true">
                      {(firstName || savedId).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-[#0F172A] truncate">{firstName ? `Continue as ${firstName}` : "Signing in as"}</p>
                      <p className="text-[11.5px] text-[#64748B] truncate">{savedId}</p>
                    </div>
                    <button type="button" onClick={forgetMe} className="text-[12px] font-semibold text-[#B45309] hover:text-[#92400E] shrink-0 rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
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

                {/* Google sign-in — shown only once GOOGLE_CLIENT_ID is set on the server. */}
                {googleClientId && !adminMode && (
                  <div className="mb-5">
                    {lastMethod === "google" && (
                      <p className="mb-2 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-[#16A34A]">
                        <Sparkles size={12} aria-hidden="true" /> You last signed in with Google
                      </p>
                    )}
                    <GoogleSignInButton clientId={googleClientId} mode="signin" onSignedIn={handleGoogle} />
                    <div className="mt-5 flex items-center gap-3">
                      <span className="h-px flex-1 bg-[#E2E8F0]" />
                      <span className="text-xs text-[#94A3B8]">or sign in with email or mobile</span>
                      <span className="h-px flex-1 bg-[#E2E8F0]" />
                    </div>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="login-id" className={labelCls}>Email or mobile number</label>
                    <div className="relative">
                      <IdIcon size={16} className={`${iconCls} ${kind === "phone" || kind === "email" ? "text-[#B45309]" : ""}`} aria-hidden="true" />
                      {/* type stays "text": resolveLoginUser (auth-router.ts)
                          accepts an email OR a phone number, and type="email"
                          would reject a mobile at the browser level. */}
                      <input
                        id="login-id" name="username" ref={idRef} type="text" value={email}
                        onChange={(e) => { setEmail(e.target.value); if (formError) setFormError(null); }}
                        placeholder="you@yourbusiness.in or 98765 43210"
                        autoComplete="username" autoCapitalize="none" autoCorrect="off"
                        spellCheck={false} enterKeyHint="next"
                        inputMode={kind === "phone" ? "tel" : "email"}
                        aria-describedby="login-id-help"
                        className={inputBase}
                      />
                    </div>
                    <p id="login-id-help" className="text-[11.5px] mt-1.5 min-h-[17px]" aria-live="polite">
                      {suggestion ? (
                        <span className="text-[#B45309]">
                          Did you mean{" "}
                          <button type="button" onClick={() => { setEmail(suggestion); pwRef.current?.focus(); }}
                            className="font-semibold underline underline-offset-2 hover:text-[#92400E] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                            {suggestion}
                          </button>?
                        </span>
                      ) : kind === "phone" ? (
                        <span className="text-[#64748B]">Signing in with your registered mobile number.</span>
                      ) : (
                        <span className="text-[#94A3B8]">Your registered email or mobile number both work.</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="login-password" className="text-xs font-semibold text-[#334155]">Password</label>
                      <Link to={resetHref} className="text-xs text-[#B45309] hover:text-[#92400E] font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">Forgot password?</Link>
                    </div>
                    <div className="relative">
                      <Lock size={16} className={iconCls} aria-hidden="true" />
                      <input
                        id="login-password" name="password" ref={pwRef}
                        type={showPassword ? "text" : "password"} value={password}
                        onChange={(e) => { setPassword(e.target.value); if (formError) setFormError(null); }}
                        onKeyUp={onCaps} onKeyDown={onCaps} onBlur={() => setCapsOn(false)}
                        placeholder="Enter your password"
                        autoComplete="current-password" enterKeyHint="go"
                        className={`${inputBase} pr-12`}
                      />
                      <button
                        type="button" onClick={togglePassword}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#334155] hover:bg-[#F1F5F9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
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

                  {!adminMode && (
                    <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                      <input
                        type="checkbox" checked={remember}
                        onChange={(e) => { setRemember(e.target.checked); if (!e.target.checked) { try { localStorage.removeItem(REMEMBER_KEY); localStorage.removeItem(REMEMBER_NAME_KEY); } catch { /* ignore */ } setSavedId(""); setSavedName(""); } }}
                        className="rounded border-[#CBD5E1] accent-[#F7B31C] w-4 h-4"
                      />
                      <span className="text-[12.5px] text-[#475569]">
                        Remember me<span className="hidden min-[360px]:inline"> on this device</span>
                      </span>
                    </label>
                  )}

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

                  {/* After a couple of wrong passwords, offer the fastest way out
                      before the server's security pause kicks in. */}
                  {failures >= 2 && !adminMode && (
                    <div className="dc-rise rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-3.5 py-3 flex items-center gap-3">
                      <KeyRound size={16} className="text-[#B45309] shrink-0" aria-hidden="true" />
                      <p className="text-[12.5px] text-[#92400E] leading-snug flex-1">Can&apos;t remember it? Setting a new password takes about a minute.</p>
                      <Link to={resetHref} className="shrink-0 rounded-lg bg-[#0F172A] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                        Reset
                      </Link>
                    </div>
                  )}

                  <button
                    type="submit" disabled={loading || offline} aria-busy={loading}
                    className={`group w-full h-[52px] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${adminMode ? "bg-[#0F172A] hover:bg-[#1E293B] text-white" : "gradient-gold text-[#0F172A] hover:shadow-gold"}`}
                  >
                    {loading
                      ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Signing in…<span className="sr-only">Signing in, please wait</span></>
                      : <><LogIn size={18} aria-hidden="true" /> {firstName && !adminMode ? `Sign in as ${firstName}` : "Sign in"}</>}
                  </button>

                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-1 text-[11.5px] text-[#64748B]">
                    <span className="inline-flex items-center gap-1"><ShieldCheck size={13} className="text-[#16A34A]" aria-hidden="true" /> Secure encrypted sign-in</span>
                    {!adminMode && <span className="inline-flex items-center gap-1"><Check size={13} className="text-[#16A34A]" aria-hidden="true" /> Your link &amp; QR never change</span>}
                  </div>
                </form>
              </div>
            </div>

            {/* Help lives OUTSIDE the card — the card holds only the task. */}
            <div className="dc-enter dc-enter-1 mt-4 rounded-2xl bg-white/70 border border-[#E2E8F0] px-4 py-3">
              <button
                type="button" onClick={() => setHelpOpen((v) => !v)} aria-expanded={helpOpen} aria-controls="login-help"
                className="w-full flex items-center justify-between gap-2 text-[13px] font-semibold text-[#475569] hover:text-[#0F172A] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
              >
                <span className="inline-flex items-center gap-2"><MessageCircle size={14} className="text-[#94A3B8]" aria-hidden="true" /> Trouble signing in?</span>
                <ChevronDown size={15} className={`transition-transform duration-200 ${helpOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              <div id="login-help" className={`dc-collapse grid ${helpOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <div className={helpOpen ? "pt-3" : "pt-3 invisible"} {...(helpOpen ? {} : { inert: true })}>
                    <p className="text-[12px] font-semibold text-[#334155]">Any of these works as your sign-in ID</p>
                    <ul className="mt-2 space-y-1.5 text-[12.5px] text-[#64748B]">
                      <li className="flex gap-2"><span className="text-[#F7B31C]" aria-hidden="true">•</span> The email address you registered with</li>
                      <li className="flex gap-2"><span className="text-[#F7B31C]" aria-hidden="true">•</span> Your registered mobile number</li>
                      <li className="flex gap-2"><span className="text-[#F7B31C]" aria-hidden="true">•</span> Long-standing customers can also use their username or card link</li>
                    </ul>
                    {adminMode ? (
                      <p className="text-[12.5px] text-[#64748B] mt-3 leading-snug">
                        Staff accounts: reset your password or email <a href={`mailto:${SUPPORT.email}`} className="font-semibold text-[#B45309] hover:text-[#92400E]">{SUPPORT.email}</a>.
                      </p>
                    ) : (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Link to={resetHref} className="h-10 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-[#334155] hover:bg-[#F8FAFC]">
                          <KeyRound size={14} aria-hidden="true" /> Reset password
                        </Link>
                        <a href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer" className="h-10 rounded-xl bg-[#DCFCE7] flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-[#166534] hover:bg-[#BBF7D0]">
                          <MessageCircle size={14} aria-hidden="true" /> WhatsApp us
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!adminMode && (
              <p className="dc-enter dc-enter-2 lg:hidden mt-6 text-center text-sm text-[#64748B]">
                New here? <Link to="/signup" className="text-[#B45309] hover:text-[#92400E] font-semibold">Create a free card</Link>
              </p>
            )}

            {!adminMode && (
              <p className="dc-enter dc-enter-2 lg:hidden mt-3 text-center text-[11.5px] text-[#94A3B8]">
                Trusted by <span className="font-semibold text-[#475569]">{AUTH_TRUST.businesses}</span> businesses · ★ {AUTH_TRUST.rating}
              </p>
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
    </div>
  );
}
