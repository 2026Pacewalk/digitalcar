import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, MailCheck, Loader2 } from "lucide-react";
import { trpc } from "@/providers/trpc";

/*
 * Real email-verification banner. Shows only when the signed-in account's email
 * is unverified (per the server), and the "Resend" button actually sends the
 * branded verification email. After a send it shows a confirmation + a short
 * cooldown so people don't spam the button.
 */
export default function EmailVerifyBanner() {
  const { data } = trpc.auth.verificationStatus.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const [cooldown, setCooldown] = useState(0);
  const resend = trpc.auth.resendVerification.useMutation({
    onSuccess: (r) => {
      toast.success(`Verification link sent to ${r.email}. Check your inbox (and spam).`);
      setCooldown(45);
    },
    onError: (e) => toast.error(e.message || "Couldn't send the email — please try again."),
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Hidden while loading, or once verified.
  if (!data || data.verified) return null;

  const busy = resend.isPending;
  return (
    <div className="rounded-2xl bg-gradient-to-r from-[#FEF2F2] to-[#FFF7F7] border border-red-100 p-3.5 flex items-center gap-3">
      <span className="w-9 h-9 rounded-xl bg-red-100 text-red-500 flex items-center justify-center shrink-0"><ShieldAlert size={17} /></span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#991B1B] leading-snug">Verify your email address</p>
        <p className="text-[11px] text-[#B45309] leading-snug mt-0.5 truncate">We sent a verification link to {data.email}. Please confirm it to secure your account.</p>
      </div>
      <button
        onClick={() => resend.mutate()}
        disabled={busy || cooldown > 0}
        className="h-9 px-3.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] transition-colors shrink-0 inline-flex items-center gap-1.5 disabled:opacity-60"
      >
        {busy ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
          : cooldown > 0 ? <><MailCheck size={13} /> Sent · {cooldown}s</>
          : "Resend link"}
      </button>
    </div>
  );
}
