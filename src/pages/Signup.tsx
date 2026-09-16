import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import {
  User, Building2, Mail, Lock, Eye, EyeOff, Check, ShieldCheck, ArrowLeft, ArrowRight,
  Loader2, Gift, X, Globe, AlertCircle, Sparkles, CreditCard, Wand2, Copy, BadgeCheck,
} from "lucide-react";
import SignupPanel from "@/components/auth/SignupPanel";
import SignupLiveCard from "@/components/auth/SignupLiveCard";
import { passwordProblems, passwordChecks, generateStrongPassword } from "@/lib/password";
import { slugifyUsername } from "@/lib/username";
import { scopedKey, DEFAULT_CUSTOMER } from "@/hooks/useCustomer";
import { buildCardThumb } from "@/card-template/buildCard";
import { logFunnel } from "@/lib/funnel";
import { setSession } from "@/lib/session";
import GoogleSignInButton, { useGoogleClientId, type GoogleSignInResult } from "@/components/auth/GoogleSignInButton";

/** The free-trial voucher applied to every new account (see /pricing). */
const TRIAL_PROMO = "FREE30D";

const STRENGTH = [
  { label: "Too short", color: "#94A3B8" },
  { label: "Weak", color: "#EF4444" },
  { label: "Fair", color: "#F59E0B" },
  { label: "Good", color: "#3B82F6" },
  { label: "Strong", color: "#16A34A" },
];

const inputBase =
  "h-12 w-full rounded-xl bg-[#F8FAFC] border pl-10 pr-3 text-[16px] sm:text-sm text-[#0F172A] outline-none focus:ring-2 focus:bg-white transition-all placeholder:text-[#94A3B8]";
const inputCls = (bad?: boolean) =>
  `${inputBase} ${bad ? "border-[#FCA5A5] focus:border-[#EF4444] focus:ring-[#EF4444]/15" : "border-[#E2E8F0] focus:border-[#F7B31C] focus:ring-[#F7B31C]/25"}`;
const iconCls = "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none";
const labelCls = "block text-xs font-semibold text-[#334155] mb-1.5";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Indian mobile: keep only the 10-digit national number. A pasted "+91 98…"
   or "098…" is normalised rather than rejected. */
function mobileDigits(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}
const fmtMobile = (d: string) => (d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d);

type Field = "fullName" | "businessName" | "email" | "mobile" | "password" | "agreed";
type Errors = Partial<Record<Field, string>>;

/* Settle a fast-changing value (typing) before firing a network check. */
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const productSlug = searchParams.get("product") || "";
  /* The free-trial voucher. Nobody has to type it: every signup carries FREE30D
     unless a campaign link names another code. It is only a record — the server
     alone decides the trial length, and an unusable code never blocks signup. */
  const promo = (searchParams.get("promo") || searchParams.get("coupon") || TRIAL_PROMO).toUpperCase();
  const registerMut = trpc.auth.register.useMutation();
  const utils = trpc.useUtils();
  const { data: refInfo } = trpc.referral.validate.useQuery({ code: referralCode }, { enabled: !!referralCode });
  const refDiscount = refInfo?.valid ? refInfo.discountPercent : 0;
  // The card the visitor chose in the marketplace — carried through signup so
  // their new card starts on that design and they land in customisation (§32).
  const { data: selectedProduct } = trpc.product.bySlug.useQuery({ slug: productSlug }, { enabled: !!productSlug });
  // A design can also arrive from the Templates gallery as ?theme=&color=&color2=.
  const themeParam = Number(searchParams.get("theme")) || 0;
  const colorParam = searchParams.get("color") || "";
  const color2Param = searchParams.get("color2") || "";
  const productThumb = useMemo(() => {
    if (selectedProduct) return buildCardThumb({ ...DEFAULT_CUSTOMER, color: selectedProduct.primaryColor || "#F7B31C", color2: selectedProduct.secondaryColor || "" }, selectedProduct.styleNumber);
    if (themeParam > 0) return buildCardThumb({ ...DEFAULT_CUSTOMER, color: colorParam || "#F7B31C", color2: color2Param }, themeParam);
    return "";
  }, [selectedProduct, themeParam, colorParam, color2Param]);
  useEffect(() => { if (productSlug) logFunnel("try_free", productSlug); }, [productSlug]);

  const [form, setForm] = useState({ fullName: "", businessName: "", email: "", mobile: "", password: "" });
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [pwCopied, setPwCopied] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [taken, setTaken] = useState<{ email?: boolean; mobile?: boolean }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const pwRef = useRef<HTMLInputElement>(null);

  const cardColor = selectedProduct?.primaryColor || (themeParam > 0 && colorParam) || "#F7B31C";

  const update = (key: keyof typeof form, val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
    // Editing a field clears its own error — never nag while someone is fixing it.
    if (errors[key as Field]) setErrors((e) => ({ ...e, [key]: undefined }));
    if (key === "email" && taken.email) setTaken((t) => ({ ...t, email: false }));
    if (key === "mobile" && taken.mobile) setTaken((t) => ({ ...t, mobile: false }));
    if (formError) setFormError("");
  };

  /* One tap to a strong password. It's shown (not masked) so the person can see
     what they got, and it meets every rule the server enforces. */
  const generatePassword = () => {
    update("password", generateStrongPassword(16));
    setShowPassword(true);
    setPwCopied(false);
    setErrors((e) => ({ ...e, password: undefined }));
    toast.success("Strong password created — copy it, or let your browser save it.");
  };

  const copyPassword = async () => {
    if (!form.password) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(form.password);
      ok = true;
    } catch {
      // Older browsers / insecure contexts: fall back to a hidden textarea.
      try {
        const ta = document.createElement("textarea");
        ta.value = form.password;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch { ok = false; }
    }
    if (ok) {
      setPwCopied(true);
      toast.success("Password copied");
      window.setTimeout(() => setPwCopied(false), 2000);
    } else {
      toast.error("Couldn't copy — select the password and copy it manually.");
    }
  };

  /* Live card link — the exact link the server will create (business name first,
     then -2, -3… if it's taken), so what we preview is what they get. */
  const linkSource = useDebounced({ b: form.businessName.trim(), n: form.fullName.trim() }, 350);
  const { data: linkPreview, isFetching: linkChecking } = trpc.auth.previewCardLink.useQuery(
    { businessName: linkSource.b, fullName: linkSource.n },
    { enabled: !!(linkSource.b || linkSource.n), staleTime: 30_000, retry: false, placeholderData: (prev) => prev },
  );
  const typedSlug = slugifyUsername(form.businessName || form.fullName);
  const linkIsFresh = !!linkPreview && linkPreview.base === typedSlug;
  const shownSlug = linkIsFresh ? linkPreview!.slug : typedSlug;

  /* Password strength on the same 4 rules the server enforces. */
  const checks = passwordChecks(form.password);
  const passed = checks.filter((c) => c.ok).length;
  const strength = !form.password ? 0 : Math.max(1, passed);
  const pwStrong = passwordProblems(form.password).length === 0;

  const digits = mobileDigits(form.mobile);
  const validity = {
    fullName: form.fullName.trim().length >= 2,
    businessName: form.businessName.trim().length >= 2,
    email: EMAIL_RE.test(form.email.trim()) && !taken.email,
    mobile: /^[6-9]\d{9}$/.test(digits) && !taken.mobile,
    password: pwStrong,
    agreed,
  };
  const progress = Math.round((Object.values(validity).filter(Boolean).length / 6) * 100);

  const validate = (only?: Field, value?: string): Errors => {
    const e: Errors = {};
    const want = (f: Field) => !only || only === f;
    const val = (f: keyof typeof form) => (only === f && value !== undefined ? value : form[f]);
    if (want("fullName") && val("fullName").trim().length < 2) e.fullName = "Enter your full name.";
    if (want("email")) {
      const em = val("email").trim();
      if (!em) e.email = "Enter your email address.";
      else if (!EMAIL_RE.test(em)) e.email = "That doesn't look like a valid email address.";
    }
    if (want("mobile")) {
      const md = mobileDigits(val("mobile"));
      if (md && !/^[6-9]\d{9}$/.test(md)) e.mobile = "Enter a 10-digit Indian mobile number.";
    }
    if (want("password")) {
      const pw = val("password");
      if (!pw) e.password = "Choose a password.";
      else if (passwordProblems(pw).length) e.password = `Add ${passwordProblems(pw).join(", ")}.`;
    }
    if (want("agreed") && !only && !agreed) e.agreed = "Please accept the Terms and Privacy Policy to continue.";
    return e;
  };

  /* `value` is read from the input itself at blur time: browser autofill and
     very fast typing can blur the field before React has re-rendered, and the
     render-time `form` would then check the previous (often empty) value. */
  const onBlurField = async (f: Field, value?: string) => {
    const v = value ?? (f in form ? form[f as keyof typeof form] : "");
    const e = validate(f, v);
    setErrors((prev) => ({ ...prev, [f]: e[f] }));
    // Catch an already-registered email / mobile as soon as the field is left,
    // not after the visitor has filled in the whole form.
    try {
      if (f === "email" && !e.email && v.trim()) {
        const r = await utils.auth.checkAvailability.fetch({ email: v.trim() });
        setTaken((t) => ({ ...t, email: r.email }));
      }
      const d = f === "mobile" ? mobileDigits(v) : "";
      if (f === "mobile" && !e.mobile && d.length === 10) {
        const r = await utils.auth.checkAvailability.fetch({ phone: d });
        setTaken((t) => ({ ...t, mobile: r.phone }));
      }
    } catch { /* the submit-time check below still guards this */ }
  };

  const focusFirst = (e: Errors) => {
    const order: Field[] = ["fullName", "businessName", "email", "mobile", "password", "agreed"];
    const first = order.find((f) => e[f]);
    if (first) document.getElementById(`su-${first}`)?.focus();
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (loading) return;
    setFormError("");
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      focusFirst(e);
      toast.error("Please check the highlighted fields.");
      return;
    }
    setLoading(true);
    try {
      // Block duplicate email / mobile before creating the account.
      const avail = await utils.auth.checkAvailability.fetch({
        email: form.email.trim(),
        phone: digits || undefined,
      });
      if (avail.email || avail.phone) {
        setTaken({ email: avail.email, mobile: avail.phone });
        const msg = avail.email
          ? "This email is already registered — please sign in instead."
          : "This mobile number is already registered to another account.";
        toast.error(msg);
        document.getElementById(avail.email ? "su-email" : "su-mobile")?.focus();
        setLoading(false);
        return;
      }

      const cardSeed = buildCardSeed();
      const res = await registerMut.mutateAsync({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: digits ? `+91 ${fmtMobile(digits)}` : undefined,
        role: "customer",
        companyName: form.businessName.trim() || undefined,
        referralCode: referralCode || undefined,
        promo,
        card: cardSeed as never,
      });
      setSession(res.token, res.user, "main");
      logFunnel("registration", productSlug || undefined, res.user?.id);
      // Seed the dashboard with the link the SERVER actually created.
      seedNewCard(res.user?.id, res.cardSlug || form.businessName || form.fullName || form.email.split("@")[0], {
        name: form.fullName.trim(),
        company_name: form.businessName.trim(),
        email: form.email.trim(),
        mobile1: digits ? `+91 ${fmtMobile(digits)}` : "",
      }, cardSeed);
      toast.success(selectedProduct ? `Account created! Let's make your ${selectedProduct.name} yours.` : "Account created! Welcome to DigitalCarda.");
      navigate("/dashboard/build");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create account";
      setFormError(/too many|rate limit/i.test(msg) ? "Too many attempts from this connection. Please wait a few minutes and try again." : msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  /* Signed in with Google. A brand-new account starts its card exactly as an
     email signup does; an existing account is simply signed in. */
  const handleGoogle = (res: GoogleSignInResult) => {
    setSession(res.token, res.user, "main");
    if (!res.created) {
      toast.success("Welcome back! You already had an account, so we signed you in.");
      navigate(res.user.role === "reseller" ? "/reseller" : "/dashboard");
      return;
    }
    logFunnel("registration", productSlug || undefined, res.user.id);
    seedNewCard(res.user.id, res.cardSlug || res.user.fullName || res.user.email.split("@")[0], {}, buildCardSeed());
    toast.success(selectedProduct ? `Account created! Let's make your ${selectedProduct.name} yours.` : "Account created! Welcome to DigitalCarda.");
    navigate("/dashboard/build");
  };

  /* The design + content the visitor chose BEFORE signing up: the product or
     Templates-gallery design, the colour picked here, and any AI Card Generator
     draft. Sent to the server so the starter card (the card's primary copy) is
     created that way, and mirrored locally so the dashboard opens on it at once.
     Every value is cleaned to the server's rules first — an odd value is simply
     left out, never allowed to fail the sign-up. */
  function buildCardSeed(): Record<string, unknown> {
    const seed: Record<string, unknown> = {};
    const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : undefined);
    const txt = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
    const theme = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 1 && n <= 500 ? n : undefined; };
    const put = (k: string, v: unknown) => { if (v !== undefined) seed[k] = v; };

    if (selectedProduct) {
      put("theme", theme(selectedProduct.styleNumber));
      put("color", hex(selectedProduct.primaryColor) || "#F7B31C");
      put("color2", hex(selectedProduct.secondaryColor) ?? "");
      if (Number(selectedProduct.id) > 0) put("product_id", Number(selectedProduct.id));
      put("product_slug", txt(selectedProduct.slug, 191));
    } else if (themeParam > 0) {
      // Chosen from the public Templates gallery → /signup?theme=&color=&color2=
      put("theme", theme(themeParam));
      put("color", hex(colorParam));
      if (searchParams.get("color2") !== null) put("color2", hex(color2Param) ?? "");
    }

    // AI Card Generator draft (from /ai-card-generator) — its design wins.
    try {
      const draftRaw = localStorage.getItem("dc_ai_draft");
      if (draftRaw) {
        const draft = JSON.parse(draftRaw) as { form?: Record<string, unknown>; gen?: Record<string, unknown> };
        const af = draft.form || {}; const g = draft.gen;
        if (g) {
          put("designation", txt(af.profession, 191));
          put("address", txt(af.city, 500));
          put("city", txt(af.city, 120));
          put("about", txt(g.about, 4000));
          if (Array.isArray(g.services)) put("specialities", txt((g.services as { name?: string }[]).map((x) => x?.name).filter(Boolean).join(", "), 2000));
          put("social_title", txt(g.tagline, 300));
          put("seo_title", txt(g.seoTitle, 191));
          put("seo_description", txt(g.seoDescription, 500));
          put("theme", theme(g.theme));
          put("color", hex(g.color));
          if (g.color2 !== undefined) put("color2", hex(g.color2) ?? "");
        }
      }
    } catch { /* a broken draft is ignored */ }
    return seed;
  }

  /* Mirror the new card into the dashboard's local storage right away (the
     server has already created it from the same seed), so the builder opens on
     the chosen design and the details typed here, even before any refresh. */
  function seedNewCard(userId: number | undefined, handleSource: string, typed: Record<string, string>, seed: Record<string, unknown>) {
    const handle = slugifyUsername(handleSource);
    if (!userId) return;
    try {
      const key = scopedKey("dc_customer");
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      const next: Record<string, unknown> = { ...existing, ...seed };
      if (handle) { next.username = handle; next.slug = handle; }
      for (const [k, v] of Object.entries(typed)) if (v && !existing[k]) next[k] = v;
      if (seed.about) next.about_on = 1;
      localStorage.setItem(key, JSON.stringify(next));
      localStorage.removeItem("dc_ai_draft");
    } catch { /* non-critical — dashboard hydrates from the server card */ }
  }

  const googleClientId = useGoogleClientId();

  const liveCard = {
    name: form.fullName.trim(),
    business: form.businessName.trim(),
    phone: digits ? `+91 ${fmtMobile(digits)}` : "",
    email: form.email.trim(),
    slug: typedSlug ? shownSlug : "",
    color: cardColor,
  };

  const FieldError = ({ id, msg }: { id: string; msg?: string }) =>
    msg ? <p id={id} className="dc-rise mt-1.5 text-[11.5px] font-medium text-[#DC2626] flex items-start gap-1"><AlertCircle size={12} className="mt-px shrink-0" aria-hidden="true" />{msg}</p> : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:flex lg:items-start">
      <a href="#signup-main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:rounded-lg focus:bg-[#0F172A] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        Skip to sign up
      </a>

      <SignupPanel card={liveCard} />

      <div className="flex-1 min-w-0">
        {/* ── Branded header for phones & tablets (the desktop panel is hidden there) ── */}
        <header className="lg:hidden relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] px-4 sm:px-8 pt-4 pb-24">
          <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
          <div aria-hidden="true" className="absolute -top-20 -right-16 w-72 h-72 rounded-full blur-3xl bg-[#F7B31C]/20" />
          <div aria-hidden="true" className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full blur-3xl opacity-30 transition-colors duration-500" style={{ background: cardColor }} />

          <div className="relative max-w-[520px] mx-auto">
            <div className="flex items-center justify-between">
              <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#CBD5E1] hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                <ArrowLeft size={15} aria-hidden="true" /> Home
              </Link>
              <Link to="/" aria-label="DigitalCarda home" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                <img src="/logo.png" alt="" className="h-8 w-auto object-contain" />
              </Link>
              <Link to="/login" className="text-[13px] font-semibold text-[#FCD34D] hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                Sign in
              </Link>
            </div>

            <span className="dc-enter mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#F7B31C]/12 border border-[#F7B31C]/30 px-3 py-1 text-[11.5px] font-semibold text-[#FCD34D]">
              <Sparkles size={12} aria-hidden="true" /> 30-day free trial · ₹0 today
            </span>
            <p className="dc-enter dc-enter-1 font-display mt-3 text-[1.7rem] sm:text-[2rem] leading-[1.1] font-extrabold text-white tracking-tight">
              Your card is <span className="text-gradient-gold">taking shape.</span>
            </p>
            <p className="dc-enter dc-enter-2 mt-2 text-[13.5px] text-[#94A3B8]">Watch it build itself as you type below.</p>
            <div className="dc-enter dc-enter-3 mt-5">
              <SignupLiveCard data={liveCard} compact />
            </div>
          </div>
        </header>

        <main id="signup-main" className="relative px-4 sm:px-8 lg:px-10 xl:px-16 pb-12 -mt-14 lg:mt-0 lg:min-h-screen lg:flex lg:flex-col lg:justify-center lg:py-12">
          <div className="hidden lg:flex items-center justify-between max-w-[560px] w-full mx-auto mb-5">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
              <ArrowLeft size={16} aria-hidden="true" /> Home
            </Link>
            <p className="text-sm text-[#64748B]">Already have an account? <Link to="/login" className="font-semibold text-[#B45309] hover:text-[#92400E]">Sign in</Link></p>
          </div>

          <div className="relative max-w-[560px] w-full mx-auto rounded-[24px] bg-white border border-[#E2E8F0] shadow-premium-lg overflow-hidden">
            {/* The gold edge doubles as progress: it fills as the form gets done. */}
            <div className="h-[5px] w-full bg-[#F1F5F9]" role="progressbar" aria-label="Sign-up progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <div className="h-full gradient-gold transition-[width] duration-500 ease-out" style={{ width: `${Math.max(progress, 6)}%` }} />
            </div>

            <div className="p-5 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-[11.5px] font-semibold text-[#92400E]">
                  <ShieldCheck size={12} aria-hidden="true" /> No payment details needed
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-3 py-1 text-[11.5px] font-semibold text-[#166534]" title="Free-trial voucher applied automatically">
                  <BadgeCheck size={12} aria-hidden="true" /> {promo} applied
                </span>
                <span className="ml-auto text-[11.5px] font-semibold text-[#64748B] tabular-nums">{progress}% done</span>
              </div>

              <h1 className="font-display text-[1.6rem] sm:text-[1.85rem] font-extrabold text-[#0F172A] tracking-tight leading-tight">Create your free card</h1>
              <p className="text-sm text-[#64748B] mt-1">₹0 for 30 days · Live in minutes · Cancel anytime</p>

              {selectedProduct && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-3">
                  <div className="w-[68px] h-[101px] rounded-lg overflow-hidden border border-[#E2E8F0] shrink-0 bg-white relative">
                    <iframe srcDoc={productThumb} title="Selected design" scrolling="no" tabIndex={-1}
                      style={{ width: 375, height: 560, border: 0, transform: "scale(0.1813)", transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[#B45309] uppercase tracking-wide">You&apos;re creating</p>
                    <p className="text-sm font-bold text-[#0F172A] leading-tight line-clamp-2">{selectedProduct.name}</p>
                    <p className="text-[11px] text-[#64748B] mt-1">₹{Number(selectedProduct.salePrice || selectedProduct.price).toLocaleString("en-IN")}/yr · {selectedProduct.trialDays}-day free trial · no card</p>
                  </div>
                </div>
              )}
              {!selectedProduct && themeParam > 0 && productThumb && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-3">
                  <div className="w-[68px] h-[101px] rounded-lg overflow-hidden border border-[#E2E8F0] shrink-0 bg-white relative">
                    <iframe srcDoc={productThumb} title="Selected design" scrolling="no" tabIndex={-1}
                      style={{ width: 375, height: 560, border: 0, transform: "scale(0.1813)", transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[#B45309] uppercase tracking-wide">Your chosen design</p>
                    <p className="text-sm font-bold text-[#0F172A] leading-tight">Your card will start on this template</p>
                    <p className="text-[11px] text-[#64748B] mt-1">You can switch designs any time from your dashboard.</p>
                  </div>
                </div>
              )}

              {/* Only claim a referral is applied once the server has confirmed it. */}
              {referralCode && refInfo && !refInfo.valid && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3">
                  <span className="w-9 h-9 rounded-xl bg-[#E2E8F0] flex items-center justify-center shrink-0"><Gift size={17} className="text-[#64748B]" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#334155]">We couldn&apos;t find that referral code</p>
                    <p className="text-[11px] text-[#64748B]"><b>{referralCode}</b> isn&apos;t a code we recognise — you can still create your account below.</p>
                  </div>
                </div>
              )}
              {referralCode && refInfo?.valid && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#FEF3C7] to-[#FFF7E6] border border-[#FDE68A] px-4 py-3">
                  <span className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center shrink-0"><Gift size={17} className="text-[#0F172A]" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#92400E]">{refDiscount > 0 ? `You've been referred — get ${refDiscount}% off!` : "You were invited by a friend 🎉"}</p>
                    <p className="text-[11px] text-[#B45309]">
                      Referred by <b>{refInfo.referrerName || referralCode}</b>
                      {refDiscount > 0 ? ` — ${refDiscount}% off your first paid plan.` : " — welcome to DigitalCarda."}
                    </p>
                  </div>
                </div>
              )}

              {/* Google sign-up — shown only once GOOGLE_CLIENT_ID is set on the server. */}
              {googleClientId && (
                <div className="mt-6">
                  <GoogleSignInButton clientId={googleClientId} mode="signup" referralCode={referralCode} promo={promo} card={buildCardSeed()} onSignedIn={handleGoogle} />
                  <div className="flex items-center gap-3 mt-5">
                    <span className="h-px flex-1 bg-[#E2E8F0]" />
                    <span className="text-xs text-[#94A3B8]">or sign up with email</span>
                    <span className="h-px flex-1 bg-[#E2E8F0]" />
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
                {/* ── 1. You & your business ── */}
                <fieldset className="space-y-4">
                  <legend className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8] mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#0F172A] text-white text-[10px] flex items-center justify-center">1</span> You &amp; your business
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="su-fullName" className={labelCls}>Full name <span className="text-[#DC2626]">*</span></label>
                      <div className="relative">
                        <User size={16} className={iconCls} aria-hidden="true" />
                        <input id="su-fullName" name="name" autoComplete="name" value={form.fullName}
                          onChange={(e) => update("fullName", e.target.value)} onBlur={(e) => onBlurField("fullName", e.currentTarget.value)}
                          placeholder="e.g. Rahul Sharma" aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "su-fullName-err" : undefined}
                          className={inputCls(!!errors.fullName)} />
                      </div>
                      <FieldError id="su-fullName-err" msg={errors.fullName} />
                    </div>
                    <div>
                      <label htmlFor="su-businessName" className={labelCls}>Business name</label>
                      <div className="relative">
                        <Building2 size={16} className={iconCls} aria-hidden="true" />
                        <input id="su-businessName" name="organization" autoComplete="organization" value={form.businessName}
                          onChange={(e) => update("businessName", e.target.value)}
                          placeholder="e.g. Sharma Sweets" className={inputCls()} />
                      </div>
                    </div>
                  </div>

                  {/* Live card link — what their QR and printed material will point to. */}
                  <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#FCFCFD] px-3.5 py-3" aria-live="polite">
                    <p className="text-[11px] font-semibold text-[#64748B] flex items-center gap-1.5"><Globe size={12} aria-hidden="true" /> Your card link</p>
                    <p className="mt-1 text-[14px] font-semibold text-[#0F172A] break-all">
                      <span className="text-[#94A3B8] font-medium">digitalcarda.in/</span>{typedSlug ? shownSlug : <span className="text-[#CBD5E1]">your-business</span>}
                    </p>
                    <p className="mt-1 text-[11.5px] min-h-[17px]">
                      {!typedSlug
                        ? <span className="text-[#94A3B8]">Built from your business name — change it any time later.</span>
                        : (linkChecking || !linkIsFresh)
                          ? <span className="text-[#94A3B8] inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" aria-hidden="true" /> Checking…</span>
                          : linkPreview!.available
                            ? <span className="text-[#16A34A] font-medium inline-flex items-center gap-1"><Check size={12} aria-hidden="true" /> Available</span>
                            : <span className="text-[#B45309] font-medium">digitalcarda.in/{linkPreview!.base} is taken, so yours will be the link above — you can change it later.</span>}
                    </p>
                  </div>
                </fieldset>

                {/* ── 2. Contact ── */}
                <fieldset className="space-y-4">
                  <legend className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8] mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#0F172A] text-white text-[10px] flex items-center justify-center">2</span> How customers reach you
                  </legend>
                  <div>
                    <label htmlFor="su-email" className={labelCls}>Email <span className="text-[#DC2626]">*</span></label>
                    <div className="relative">
                      <Mail size={16} className={iconCls} aria-hidden="true" />
                      <input id="su-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
                        value={form.email} onChange={(e) => update("email", e.target.value)} onBlur={(e) => onBlurField("email", e.currentTarget.value)}
                        placeholder="you@yourbusiness.in" aria-invalid={!!errors.email || !!taken.email}
                        aria-describedby={errors.email || taken.email ? "su-email-err" : undefined}
                        className={`${inputCls(!!errors.email || !!taken.email)} pr-10`} />
                      {validity.email && <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#16A34A]" aria-hidden="true" />}
                    </div>
                    <FieldError id="su-email-err" msg={errors.email} />
                    {!errors.email && taken.email && (
                      <p id="su-email-err" className="dc-rise mt-1.5 text-[11.5px] font-medium text-[#DC2626]">
                        This email already has an account. <Link to="/login" className="underline font-semibold text-[#B45309]">Sign in instead</Link>
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="su-mobile" className={labelCls}>Mobile number <span className="text-[#94A3B8] font-normal">(for WhatsApp &amp; calls)</span></label>
                    <div className={`flex h-12 rounded-xl border bg-[#F8FAFC] focus-within:bg-white focus-within:ring-2 transition-all overflow-hidden ${errors.mobile || taken.mobile ? "border-[#FCA5A5] focus-within:ring-[#EF4444]/15" : "border-[#E2E8F0] focus-within:border-[#F7B31C] focus-within:ring-[#F7B31C]/25"}`}>
                      <span className="flex items-center gap-1.5 pl-3 pr-2.5 border-r border-[#E2E8F0] text-sm font-semibold text-[#334155] shrink-0" aria-hidden="true">+91</span>
                      <input id="su-mobile" name="tel" type="tel" inputMode="numeric" autoComplete="tel-national"
                        value={fmtMobile(digits)} onChange={(e) => update("mobile", mobileDigits(e.target.value))} onBlur={(e) => onBlurField("mobile", e.currentTarget.value)}
                        placeholder="98765 43210" aria-invalid={!!errors.mobile || !!taken.mobile}
                        aria-describedby={errors.mobile || taken.mobile ? "su-mobile-err" : undefined}
                        className="flex-1 min-w-0 bg-transparent px-3 text-[16px] sm:text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] tabular-nums tracking-wide" />
                      {validity.mobile && <Check size={16} className="self-center mr-3 text-[#16A34A] shrink-0" aria-hidden="true" />}
                    </div>
                    <FieldError id="su-mobile-err" msg={errors.mobile} />
                    {!errors.mobile && taken.mobile && (
                      <p id="su-mobile-err" className="dc-rise mt-1.5 text-[11.5px] font-medium text-[#DC2626]">
                        This number is already linked to another account. <Link to="/login" className="underline font-semibold text-[#B45309]">Sign in instead</Link>
                      </p>
                    )}
                  </div>

                </fieldset>

                {/* ── 3. Secure the account ── */}
                <fieldset className="space-y-3">
                  <legend className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8] mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#0F172A] text-white text-[10px] flex items-center justify-center">3</span> Secure your account
                  </legend>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label htmlFor="su-password" className="text-xs font-semibold text-[#334155]">Password <span className="text-[#DC2626]">*</span></label>
                      <button type="button" onClick={generatePassword}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -mr-2 text-[12px] font-semibold text-[#B45309] hover:bg-[#FEF3C7] hover:text-[#92400E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                        <Wand2 size={13} aria-hidden="true" /> Generate strong password
                      </button>
                    </div>
                    <div className="relative">
                      <Lock size={16} className={iconCls} aria-hidden="true" />
                      <input id="su-password" ref={pwRef} name="new-password" autoComplete="new-password"
                        type={showPassword ? "text" : "password"} value={form.password}
                        onChange={(e) => { update("password", e.target.value); setPwCopied(false); }} onBlur={(e) => { setCapsOn(false); if (e.currentTarget.value) onBlurField("password", e.currentTarget.value); }}
                        onKeyUp={(e) => setCapsOn(e.getModifierState?.("CapsLock") ?? false)}
                        placeholder="Create a strong password" aria-invalid={!!errors.password}
                        aria-describedby="su-password-rules"
                        className={`${inputCls(!!errors.password)} ${form.password ? "pr-[76px]" : "pr-11"}`} />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        {form.password && (
                          <button type="button" onClick={copyPassword} aria-label={pwCopied ? "Password copied" : "Copy password"} title={pwCopied ? "Copied" : "Copy password"}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${pwCopied ? "text-[#16A34A] bg-[#DCFCE7]" : "text-[#94A3B8] hover:text-[#334155] hover:bg-[#F1F5F9]"}`}>
                            {pwCopied ? <Check size={15} /> : <Copy size={15} />}
                          </button>
                        )}
                        <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#334155] hover:bg-[#F1F5F9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5" id="su-password-rules">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1 flex-1" aria-hidden="true">
                          {[1, 2, 3, 4].map((n) => (
                            <span key={n} className="h-1.5 flex-1 rounded-full transition-colors duration-300" style={{ background: n <= strength ? STRENGTH[strength].color : "#E2E8F0" }} />
                          ))}
                        </div>
                        <span className="text-[11px] font-semibold w-14 text-right" style={{ color: form.password ? STRENGTH[strength].color : "#94A3B8" }}>
                          {form.password ? STRENGTH[strength].label : ""}
                        </span>
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
                    <FieldError id="su-password-err" msg={errors.password} />
                  </div>
                </fieldset>

                <div>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input id="su-agreed" type="checkbox" checked={agreed}
                      onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setErrors((x) => ({ ...x, agreed: undefined })); }}
                      className="mt-0.5 w-4 h-4 rounded border-[#CBD5E1] accent-[#F7B31C] shrink-0"
                      aria-invalid={!!errors.agreed} aria-describedby={errors.agreed ? "su-agreed-err" : undefined} />
                    <span className="text-[12.5px] text-[#475569] leading-snug">
                      I agree to the <Link to="/terms-of-service" target="_blank" className="font-semibold text-[#B45309] hover:text-[#92400E] underline-offset-2 hover:underline">Terms</Link> and{" "}
                      <Link to="/privacy" target="_blank" className="font-semibold text-[#B45309] hover:text-[#92400E] underline-offset-2 hover:underline">Privacy Policy</Link>
                    </span>
                  </label>
                  <FieldError id="su-agreed-err" msg={errors.agreed} />
                </div>

                {formError && (
                  <div role="alert" className="dc-rise rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-3 text-[13px] font-medium text-[#991B1B] flex items-start gap-2">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> {formError}
                  </div>
                )}

                <button type="submit" disabled={loading} aria-busy={loading}
                  className="group w-full h-[52px] gradient-gold text-[#0F172A] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading
                    ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Creating your card…</>
                    : <>Create my free card <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></>}
                </button>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11.5px] text-[#64748B]">
                  <span className="inline-flex items-center gap-1"><ShieldCheck size={13} className="text-[#16A34A]" aria-hidden="true" /> Secure SSL sign-up</span>
                  <span className="inline-flex items-center gap-1"><CreditCard size={13} className="text-[#16A34A]" aria-hidden="true" /> No payment details</span>
                  <span className="inline-flex items-center gap-1"><Check size={13} className="text-[#16A34A]" aria-hidden="true" /> Cancel anytime</span>
                </div>
              </form>
            </div>
          </div>

          <p className="lg:hidden mt-6 text-center text-sm text-[#64748B]">
            Already have an account? <Link to="/login" className="text-[#B45309] hover:text-[#92400E] font-semibold">Sign in</Link>
          </p>
        </main>
      </div>
    </div>
  );
}
