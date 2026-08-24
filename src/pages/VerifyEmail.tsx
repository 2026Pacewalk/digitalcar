import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { CheckCircle2, Loader2, ShieldAlert, ArrowRight } from "lucide-react";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const verify = trpc.auth.verifyEmail.useMutation();
  const ran = useRef(false);

  // Auto-confirm the token once on load.
  useEffect(() => {
    if (token && !ran.current) { ran.current = true; verify.mutate({ token }); }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const state: "notoken" | "loading" | "success" | "error" =
    !token ? "notoken" : verify.isPending || verify.isIdle ? "loading" : verify.isSuccess ? "success" : "error";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#14243E] to-[#0F172A] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="text-2xl font-bold text-[#0F172A] mb-6">Digital<span className="text-[#F7B31C]">Carda</span></div>

        {state === "loading" && (
          <>
            <div className="w-14 h-14 rounded-full bg-[#EFF6FF] flex items-center justify-center mx-auto mb-4"><Loader2 className="text-[#3B82F6] animate-spin" size={28} /></div>
            <h1 className="text-lg font-bold text-[#0F172A]">Verifying your email…</h1>
            <p className="text-sm text-[#64748B] mt-2">Just a moment while we confirm your address.</p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="text-emerald-500" size={34} /></div>
            <h1 className="text-xl font-bold text-[#0F172A]">{verify.data?.already ? "Already verified" : "Email verified 🎉"}</h1>
            <p className="text-sm text-[#64748B] mt-2">
              {verify.data?.already
                ? "Your email address was already confirmed — you're all set."
                : "Thanks! Your email address is now confirmed and your account is secure."}
            </p>
            <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 w-full h-11 mt-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold hover:shadow-gold transition-all">
              Go to my dashboard <ArrowRight size={16} />
            </Link>
          </>
        )}

        {(state === "error" || state === "notoken") && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><ShieldAlert className="text-red-500" size={28} /></div>
            <h1 className="text-lg font-bold text-[#0F172A]">{state === "notoken" ? "Invalid verification link" : "Couldn't verify your email"}</h1>
            <p className="text-sm text-[#64748B] mt-2">
              {state === "notoken"
                ? "This link is missing its token."
                : verify.error?.message || "This verification link is invalid or has expired."}
            </p>
            <p className="text-sm text-[#64748B] mt-1">You can request a fresh link from your dashboard.</p>
            <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 w-full h-11 mt-6 bg-[#0F172A] text-white rounded-xl text-sm font-bold hover:bg-[#1E293B] transition-all">
              Go to dashboard
            </Link>
            <Link to="/login" className="block mt-4 text-sm font-semibold text-[#64748B] hover:text-[#0F172A]">Back to sign in</Link>
          </>
        )}
      </div>
    </div>
  );
}
