import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, ShieldAlert } from "lucide-react";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: () => { toast.success("Password updated — please sign in."); navigate("/login"); },
    onError: (e) => toast.error(e.message || "Could not reset password"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (pwd !== confirm) { toast.error("Passwords do not match"); return; }
    reset.mutate({ token, newPassword: pwd });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#14243E] to-[#0F172A] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-[#0F172A]">Digital<span className="text-[#F7B31C]">Carda</span></div>
        </div>

        {!token ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><ShieldAlert className="text-red-500" size={28} /></div>
            <h1 className="text-lg font-bold text-[#0F172A]">Invalid reset link</h1>
            <p className="text-sm text-[#64748B] mt-2">This link is missing its token. Please request a new password reset.</p>
            <Link to="/forgot-password" className="inline-block mt-6 text-sm font-semibold text-[#0F172A] hover:text-[#F7B31C]">Request a new link</Link>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-[#0F172A] text-center">Set a new password</h1>
            <p className="text-sm text-[#64748B] text-center mt-1.5 mb-6">Choose a strong password you don't use elsewhere.</p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">New password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input type={show ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Min 8 characters"
                    className="w-full h-11 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-10 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">Confirm new password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password"
                    className="w-full h-11 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-3 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all" />
                </div>
              </div>
              <button type="submit" disabled={reset.isPending} className="w-full h-11 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:shadow-gold disabled:opacity-50 transition-all">
                {reset.isPending ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : "Reset password"}
              </button>
            </form>
            <Link to="/login" className="flex items-center justify-center gap-2 mt-5 text-sm font-semibold text-[#64748B] hover:text-[#0F172A]"><ArrowLeft size={15} /> Back to sign in</Link>
          </>
        )}
      </div>
    </div>
  );
}
