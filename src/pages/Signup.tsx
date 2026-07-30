import { useMemo, useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import {
  User, Building2, Mail, Phone, Lock, Eye, EyeOff, UserPlus,
  Check, ShieldCheck, ArrowLeft, Loader2, Gift, X,
} from "lucide-react";
import AuthBrandPanel from "@/components/AuthBrandPanel";
import { passwordProblems, passwordChecks } from "@/lib/password";
import { slugifyUsername } from "@/lib/username";
import { scopedKey, DEFAULT_CUSTOMER } from "@/hooks/useCustomer";
import { buildCardThumb } from "@/card-template/buildCard";
import { logFunnel } from "@/lib/funnel";

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

const STRENGTH = [
  { label: "", color: "" },
  { label: "Weak", color: "#EF4444" },
  { label: "Fair", color: "#F59E0B" },
  { label: "Good", color: "#3B82F6" },
  { label: "Strong", color: "#22C55E" },
];

const inputCls =
  "h-11 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-3 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all placeholder:text-[#CBD5E1]";
const iconCls = "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const productSlug = searchParams.get("product") || "";
  const registerMut = trpc.auth.register.useMutation();
  const utils = trpc.useUtils();
  const { data: refInfo } = trpc.referral.validate.useQuery({ code: referralCode }, { enabled: !!referralCode });
  const refDiscount = refInfo?.valid ? refInfo.discountPercent : 0;
  // The card the visitor chose in the marketplace — carried through signup so
  // their new card starts on that design and they land in customisation (§32).
  const { data: selectedProduct } = trpc.product.bySlug.useQuery({ slug: productSlug }, { enabled: !!productSlug });
  const productThumb = useMemo(
    () => (selectedProduct ? buildCardThumb({ ...DEFAULT_CUSTOMER, color: selectedProduct.primaryColor || "#F7B31C", color2: selectedProduct.secondaryColor || "" }, selectedProduct.styleNumber) : ""),
    [selectedProduct],
  );
  useEffect(() => { if (productSlug) logFunnel("try_free", productSlug); }, [productSlug]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    fullName: "", businessName: "", email: "", mobile: "",
    password: "", confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const strength = useMemo(() => {
    const pw = form.password;
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return Math.min(s, 4);
  }, [form.password]);

  const matches = form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      toast.error("Please fill in all required fields"); return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match"); return;
    }
    const pwProblems = passwordProblems(form.password);
    if (pwProblems.length) {
      toast.error(`Password needs ${pwProblems.join(", ")}.`); return;
    }
    setLoading(true);
    try {
      // Block duplicate email / mobile before creating the account.
      const avail = await utils.auth.checkAvailability.fetch({
        email: form.email.trim(),
        phone: form.mobile.trim() || undefined,
      });
      if (avail.email) { toast.error("This email is already registered — please sign in instead."); setLoading(false); return; }
      if (avail.phone) { toast.error("This mobile number is already registered to another account."); setLoading(false); return; }

      const res = await registerMut.mutateAsync({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.mobile.trim() || undefined,
        role: "customer",
        companyName: form.businessName.trim() || undefined,
        referralCode: referralCode || undefined,
      });
      localStorage.setItem("auth_token", res.token);
      localStorage.setItem("digitalcarda_user", JSON.stringify(res.user));
      logFunnel("registration", productSlug || undefined, res.user?.id);
      // Auto-derive the card username from the business name (fall back to full
      // name, then email). The user can change it later from their dashboard.
      const handle = slugifyUsername(form.businessName || form.fullName || form.email.split("@")[0]);
      if (res.user?.id) {
        try {
          const key = scopedKey("dc_customer");
          const existing = JSON.parse(localStorage.getItem(key) || "{}");
          const next: Record<string, unknown> = { ...existing };
          if (handle) { next.username = handle; next.slug = handle; }
          // Start the new card on the chosen product's design + record the product.
          if (selectedProduct) {
            next.theme = selectedProduct.styleNumber;
            next.color = selectedProduct.primaryColor || existing.color || "#F7B31C";
            next.color2 = selectedProduct.secondaryColor || existing.color2 || "";
            next.product_id = selectedProduct.id;
            next.product_slug = selectedProduct.slug;
          }
          // Hydrate the new card from the AI Card Generator draft, if the user
          // came from there — so their AI-made card is saved to their account.
          try {
            const draftRaw = localStorage.getItem("dc_ai_draft");
            if (draftRaw) {
              const draft = JSON.parse(draftRaw) as { form?: Record<string, string>; gen?: Record<string, unknown> };
              const af = draft.form || {}; const g = draft.gen;
              if (g) {
                if (af.businessName) { next.name = af.businessName; next.company_name = af.businessName; }
                if (af.profession) next.designation = af.profession;
                if (af.city) { next.address = af.city; next.city = af.city; }
                if (af.phone) { next.mobile1 = af.phone; }
                next.about = g.about; next.about_on = 1;
                next.specialities = Array.isArray(g.services) ? (g.services as { name: string }[]).map((s) => s.name).join(", ") : next.specialities;
                next.social_title = g.tagline;
                next.theme = g.theme; next.color = g.color; next.color2 = g.color2;
                next.seo_title = g.seoTitle; next.seo_description = g.seoDescription;
              }
              localStorage.removeItem("dc_ai_draft");
            }
          } catch { /* non-critical */ }
          localStorage.setItem(key, JSON.stringify(next));
        } catch { /* non-critical — dashboard will seed a default */ }
      }
      // Trial does NOT start here — it begins on first publish (§5, Phase 13).
      // Land the user straight in customisation when they picked a card (§32).
      if (selectedProduct) {
        toast.success(`Account created! Let's make your ${selectedProduct.name} yours.`);
        navigate("/dashboard/build");
      } else {
        toast.success("Account created! Welcome to DigitalCarda.");
        navigate("/dashboard/build");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
      setLoading(false);
    }
  };

  const socialSoon = () => toast.info("Social sign-up is coming soon — use email for now.");

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <AuthBrandPanel
        heading="Create your free digital card"
        subtitle="Join thousands of businesses on DigitalCarda. Start a 30-day free trial that requires no credit card details upfront and publish a professional card in minutes."
        footer={
          <div className="grid grid-cols-2 gap-2.5">
            {[
              "30-Day Free Trial", "No credit card", "Instant setup", "Share anywhere",
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px] text-[#CBD5E1]">
                <span className="w-4 h-4 rounded-full bg-[#F7B31C]/20 flex items-center justify-center shrink-0"><Check size={10} className="text-[#F7B31C]" /></span>
                {t}
              </div>
            ))}
          </div>
        }
      />

      {/* Form side */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto relative">
        <div className="absolute inset-0 bg-dots opacity-60 pointer-events-none lg:hidden" />
        <Link to="/" className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors">
          <ArrowLeft size={16} /> Home
        </Link>

        <div className="w-full max-w-md py-10 relative">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <span className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center"><UserPlus size={18} className="text-[#0F172A]" /></span>
            <span className="text-xl font-bold text-[#0F172A]">Digital<span className="text-gradient-gold">Carda</span></span>
          </div>

          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-3">
              <ShieldCheck size={12} /> 30 Days Free Cardless Trial
            </span>
            <h1 className="text-2xl sm:text-[1.7rem] font-extrabold text-[#0F172A] tracking-tight">Create Your Account</h1>
            <p className="text-sm text-[#64748B] mt-1">No credit card required · Cancel anytime</p>
          </div>

          {selectedProduct && (
            <div className="flex items-center gap-3 rounded-2xl bg-white border border-[#E2E8F0] px-3 py-3 mb-5 shadow-premium">
              <div className="w-[68px] h-[101px] rounded-lg overflow-hidden border border-[#E2E8F0] shrink-0 bg-white relative">
                <iframe srcDoc={productThumb} title="Selected design" scrolling="no" tabIndex={-1}
                  style={{ width: 375, height: 560, border: 0, transform: "scale(0.1813)", transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-[#F7B31C] uppercase tracking-wide">You're creating</p>
                <p className="text-sm font-bold text-[#0F172A] leading-tight line-clamp-2">{selectedProduct.name}</p>
                <p className="text-[11px] text-[#64748B] mt-1">₹{Number(selectedProduct.salePrice || selectedProduct.price).toLocaleString("en-IN")}/yr · {selectedProduct.trialDays}-day free trial · no card</p>
              </div>
            </div>
          )}

          {referralCode && (
            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#FEF3C7] to-[#FFF7E6] border border-[#FDE68A] px-4 py-3 mb-5">
              <span className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center shrink-0"><Gift size={17} className="text-[#0F172A]" /></span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#92400E]">{refDiscount > 0 ? `You've been referred — get ${refDiscount}% off!` : "You were invited by a friend 🎉"}</p>
                <p className="text-[11px] text-[#B45309]">Referral <b className="uppercase">{referralCode}</b> applied{refDiscount > 0 ? ` — ${refDiscount}% off your first paid plan.` : " — welcome to DigitalCarda."}</p>
              </div>
            </div>
          )}

          {/* Social */}
          <button onClick={socialSoon} type="button" className="w-full h-11 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-center gap-2.5 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors">
            <GoogleIcon /> Continue with Google
          </button>
          <div className="flex items-center gap-3 my-5">
            <span className="h-px flex-1 bg-[#E2E8F0]" />
            <span className="text-xs text-[#94A3B8]">or sign up with email</span>
            <span className="h-px flex-1 bg-[#E2E8F0]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">Full Name *</label>
                <div className="relative"><User size={16} className={iconCls} /><input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="John Doe" className={inputCls} /></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">Business Name</label>
                <div className="relative"><Building2 size={16} className={iconCls} /><input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="Your Business" className={inputCls} /></div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Email *</label>
              <div className="relative"><Mail size={16} className={iconCls} /><input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" type="email" className={inputCls} /></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Mobile Number</label>
              <div className="relative"><Phone size={16} className={iconCls} /><input value={form.mobile} onChange={(e) => update("mobile", e.target.value)} placeholder="+91 XXXXX XXXXX" className={inputCls} /></div>
              <p className="text-[11px] text-[#94A3B8] mt-1.5">Your card link is created automatically from your business name — you can customise it later in your dashboard.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">Password *</label>
                <div className="relative">
                  <Lock size={16} className={iconCls} />
                  <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 8 characters" className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">Confirm Password *</label>
                <div className="relative">
                  <Lock size={16} className={iconCls} />
                  <input type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Repeat password" className={`${inputCls} pr-10`} />
                  {matches
                    ? <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                    : <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">{showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
                </div>
              </div>
            </div>

            {/* Password strength meter */}
            {form.password && (
              <div className="-mt-1">
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((n) => (
                    <span key={n} className="h-1.5 flex-1 rounded-full transition-colors duration-300" style={{ background: n <= strength ? STRENGTH[strength].color : "#E2E8F0" }} />
                  ))}
                </div>
                <p className="text-[11px] mt-1.5 font-medium" style={{ color: STRENGTH[strength].color || "#94A3B8" }}>
                  {strength > 0 ? `${STRENGTH[strength].label} password` : "Too short"}
                  {form.confirmPassword && !matches && <span className="text-[#EF4444]"> · passwords don't match</span>}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {passwordChecks(form.password).map((c) => (
                    <span key={c.label} className={`inline-flex items-center gap-1 text-[10px] font-medium ${c.ok ? "text-emerald-600" : "text-[#94A3B8]"}`}>
                      {c.ok ? <Check size={11} /> : <X size={11} />} {c.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <input type="checkbox" className="rounded border-[#E2E8F0] mt-0.5 accent-[#F7B31C]" required />
              <span className="text-xs text-[#64748B]">
                I agree to the <Link to="/terms-of-service" className="text-[#F7B31C] hover:text-[#D97706] font-medium">Terms</Link> and{" "}
                <Link to="/privacy" className="text-[#F7B31C] hover:text-[#D97706] font-medium">Privacy Policy</Link>
              </span>
            </label>

            <button type="submit" disabled={loading} className="w-full h-12 gradient-gold text-[#0F172A] rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98] disabled:opacity-60">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Creating account…</> : <><UserPlus size={18} /> Start 30-Day Free Trial</>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#64748B]">
            Already have an account? <Link to="/login" className="text-[#F7B31C] hover:text-[#D97706] font-semibold">Sign In</Link>
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#94A3B8]">
            <ShieldCheck size={13} className="text-emerald-500" /> Secured with 256-bit SSL encryption
          </div>
        </div>
      </div>
    </div>
  );
}
