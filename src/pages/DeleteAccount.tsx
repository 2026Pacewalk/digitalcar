import { useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { clearSession, getSessionUser, getToken } from "@/lib/session";
import { CONTACT } from "@/lib/publicNav";

/* Delete your account without the app (Google Play asks every app for such a
   page). Signing in happens on the normal sign-in page, which brings people
   back here; then the password is confirmed once more, exactly as in the app's
   More → Delete account. The server does the rest (api/lib/account-deletion.ts). */

const fmt = (d: string | Date) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default function DeleteAccount() {
  const user = getToken("main") ? getSessionUser<{ email?: string; fullName?: string; role?: string }>("main") : null;
  const request = trpc.auth.requestAccountDeletion.useMutation();
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [done, setDone] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) { setError("Enter your password."); return; }
    if (!understood) { setError("Tick the box to confirm you understand what happens."); return; }
    try {
      const r = await request.mutateAsync({ password, reason: reason.trim() || undefined });
      // The account is switched off now, so this browser's sign-in no longer works.
      clearSession("main");
      setDone(new Date(r.scheduledFor));
    } catch (err) {
      setError((err as { message?: string })?.message || "Couldn't send your request. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F9] px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <Link to="/" className="inline-block text-2xl font-bold text-[#0F172A] mb-8">Digital<span className="text-[#F7B31C]">Carda</span></Link>

        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6 sm:p-8">
          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="text-emerald-600" size={28} /></div>
              <h1 className="text-xl font-bold text-[#0F172A]">Your account is scheduled for deletion</h1>
              <p className="text-sm text-[#475569] mt-3 leading-relaxed">
                It&apos;s switched off and your card is paused. Everything will be erased on <b>{fmt(done)}</b>.
                Changed your mind before then? Email <a className="font-semibold text-[#B45309] underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or
                message us on <a className="font-semibold text-[#B45309] underline" href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp</a> and we&apos;ll restore it.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#0F172A] text-balance">Delete your DigitalCarda account</h1>
              <p className="text-sm text-[#64748B] mt-2">Using the app? You can also do this in the app, under More → Delete account.</p>

              <h2 className="text-sm font-semibold text-[#0F172A] mt-6 mb-2">What happens</h2>
              <ul className="space-y-2 text-sm text-[#334155] leading-relaxed">
                <li className="flex gap-2.5"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#F7B31C] shrink-0" />Straight away, your account is switched off, you&apos;re signed out everywhere and your card shows as paused.</li>
                <li className="flex gap-2.5"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#F7B31C] shrink-0" />After 30 days we erase your cards, photos, enquiries and personal details.</li>
                <li className="flex gap-2.5"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#F7B31C] shrink-0" />Payment and tax records stay, as the law requires, without your name or contact details.</li>
                <li className="flex gap-2.5"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#F7B31C] shrink-0" />Changed your mind within the 30 days? Contact us and we&apos;ll restore everything.</li>
              </ul>

              {!user ? (
                <div className="mt-7 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
                  <p className="text-sm text-[#334155]">Sign in first, so we know it&apos;s your account.</p>
                  <Link to="/login?next=/account/delete" className="mt-3 inline-flex items-center justify-center h-11 px-5 rounded-xl bg-[#0F172A] text-white text-sm font-bold hover:bg-[#1E293B]">
                    Sign in to continue
                  </Link>
                  <p className="text-xs text-[#64748B] mt-3">Can&apos;t sign in? Email <a className="font-semibold underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> from your account&apos;s email address and we&apos;ll handle it.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="mt-7 space-y-4">
                  <p className="text-sm text-[#334155]">Signed in as <b>{user.email}</b>.</p>
                  <label className="block">
                    <span className="block text-xs font-semibold text-[#334155] mb-1.5">Password</span>
                    <input type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      className="w-full h-11 rounded-xl border border-[#E2E8F0] px-3.5 text-sm outline-none focus:border-[#F7B31C]" />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-semibold text-[#334155] mb-1.5">Why are you leaving? (optional)</span>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 500))} rows={3}
                      className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2.5 text-sm outline-none focus:border-[#F7B31C]" />
                  </label>
                  <label className="flex items-start gap-2.5 text-sm text-[#334155] cursor-pointer">
                    <input type="checkbox" checked={understood} onChange={(e) => { setUnderstood(e.target.checked); setError(null); }} className="mt-0.5 w-4 h-4 accent-red-600" />
                    <span>I understand my card goes offline now and my data is erased after 30 days.</span>
                  </label>
                  {error ? <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p> : null}
                  <button type="submit" disabled={request.isPending}
                    className="w-full h-11 rounded-xl bg-red-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-60">
                    {request.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete my account
                  </button>
                </form>
              )}
            </>
          )}
        </div>
        <p className="text-xs text-[#94A3B8] mt-6 text-center">
          See our <Link to="/privacy" className="underline">privacy policy</Link> for how we handle your data.
        </p>
      </div>
    </div>
  );
}
