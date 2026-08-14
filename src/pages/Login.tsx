import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import {
  Mail, Lock, Eye, EyeOff, LogIn,
  Loader2, ArrowLeft,
} from "lucide-react";
import AuthBrandPanel from "@/components/AuthBrandPanel";
import { DEMO_USERS } from "@/hooks/useAuth";
import { getToken, getSessionUser, setSession, clearSession } from "@/lib/session";

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

const inputCls =
  "h-11 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-3 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all placeholder:text-[#94A3B8]";
const iconCls = "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none";

export default function Login({ adminMode = false }: { adminMode?: boolean }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");
  const next = nextPath && nextPath.startsWith("/") ? nextPath : "";
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
      if (!gateOk(res.user.role)) return;
      toast.success("Welcome back!");
      navigate(next || routeFor(res.user.role));
    } catch (err) {
      if (demoLogin(mail, pass)) return;
      const msg = err instanceof Error ? err.message : "";
      const backendDown = /Failed query|fetch|ECONNREFUSED|NetworkError|Failed to fetch|users/i.test(msg);
      toast.error(backendDown ? "Server is temporarily unavailable. Please try again shortly." : (msg || "Invalid email or password"));
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    doLogin(email, password);
  };

  const socialSoon = () => toast.info("Social sign-in is coming soon — use email for now.");

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <AuthBrandPanel
        heading="Welcome back to DigitalCarda"
        subtitle="Sign in to manage your cards, track leads, view analytics, and grow your business — all in one place."
      />

      {/* Form side */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative">
        <div className="absolute inset-0 bg-dots opacity-60 pointer-events-none lg:hidden" />
        <Link to="/" className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors">
          <ArrowLeft size={16} /> Home
        </Link>

        <div className="w-full max-w-md relative">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <span className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center"><LogIn size={18} className="text-[#0F172A]" /></span>
            <span className="text-xl font-bold text-[#0F172A]">Digital<span className="text-gradient-gold">Carda</span></span>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-[1.7rem] font-extrabold text-[#0F172A] tracking-tight">{adminMode ? "Admin sign in" : "Sign in to your account"}</h1>
            <p className="text-sm text-[#64748B] mt-1">{adminMode ? "Restricted area — authorised staff only" : "Access your dashboard and digital cards"}</p>
          </div>

          {/* Social — hidden on the admin portal */}
          {!adminMode && (
            <>
              <button onClick={socialSoon} type="button" className="w-full h-11 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-center gap-2.5 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors">
                <GoogleIcon /> Continue with Google
              </button>
              <div className="flex items-center gap-3 my-5">
                <span className="h-px flex-1 bg-[#E2E8F0]" />
                <span className="text-xs text-[#94A3B8]">or sign in with email</span>
                <span className="h-px flex-1 bg-[#E2E8F0]" />
              </div>
            </>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Email / Username</label>
              <div className="relative">
                <Mail size={16} className={iconCls} />
                <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email or username" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className={iconCls} />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-[#E2E8F0] accent-[#F7B31C]" />
                <span className="text-xs text-[#64748B]">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-xs text-[#F7B31C] hover:text-[#D97706] font-semibold">Forgot Password?</Link>
            </div>
            <button type="submit" disabled={loading} className="w-full h-12 gradient-gold text-[#0F172A] rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98] disabled:opacity-60">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in…</> : <><LogIn size={18} /> Sign In</>}
            </button>
          </form>

          {!adminMode && (
            <p className="mt-6 text-center text-sm text-[#64748B]">
              Don&apos;t have an account? <Link to="/signup" className="text-[#F7B31C] hover:text-[#D97706] font-semibold">Sign Up Free</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
