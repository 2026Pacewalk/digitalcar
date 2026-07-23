import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const req = trpc.auth.requestPasswordReset.useMutation({ onSuccess: () => setSent(true) });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#14243E] to-[#0F172A] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-[#0F172A]">Digital<span className="text-[#F7B31C]">Carda</span></div>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="text-emerald-500" size={28} /></div>
            <h1 className="text-lg font-bold text-[#0F172A]">Check your email</h1>
            <p className="text-sm text-[#64748B] mt-2">If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. It expires in 60 minutes.</p>
            <Link to="/login" className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-[#0F172A] hover:text-[#F7B31C]"><ArrowLeft size={15} /> Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-[#0F172A] text-center">Forgot your password?</h1>
            <p className="text-sm text-[#64748B] text-center mt-1.5 mb-6">Enter your account email and we'll send you a reset link.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (email.includes("@")) req.mutate({ email: email.trim() }); }}>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full h-11 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-3 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all" />
              </div>
              <button type="submit" disabled={req.isPending} className="w-full h-11 mt-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:shadow-gold disabled:opacity-50 transition-all">
                {req.isPending ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : "Send reset link"}
              </button>
            </form>
            <Link to="/login" className="flex items-center justify-center gap-2 mt-5 text-sm font-semibold text-[#64748B] hover:text-[#0F172A]"><ArrowLeft size={15} /> Back to sign in</Link>
          </>
        )}
      </div>
    </div>
  );
}
