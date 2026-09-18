import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { setSession } from "@/lib/session";
import { Loader2, ShieldAlert } from "lucide-react";

/* Opened by the mobile app ("Choose a plan", "Order an NFC card"…) with a
   one-time code. The code is swapped for a normal website session and the page
   the app asked for opens — the owner isn't asked to sign in again. The page
   comes from the server, never from this URL, so the link can't be pointed
   anywhere else. */
export default function AppLink() {
  const [params] = useSearchParams();
  const code = params.get("code") || "";
  const redeem = trpc.mobile.redeemWebLink.useMutation();
  const ran = useRef(false);
  const [failed, setFailed] = useState(!code);

  // The code works once, so it is sent once — and its answer is handled by the
  // promise itself, which (unlike per-call callbacks) still settles if React
  // remounts this page in development.
  useEffect(() => {
    if (!code || ran.current) return;
    ran.current = true;
    redeem.mutateAsync({ code })
      .then((res) => {
        setSession(res.token, res.user, "main");
        // A full load, so nothing from an earlier session in this browser lingers.
        window.location.replace(res.next);
      })
      .catch(() => setFailed(true));
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#14243E] to-[#0F172A] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="text-2xl font-bold text-[#0F172A] mb-6">Digital<span className="text-[#F7B31C]">Carda</span></div>
        {!failed ? (
          <>
            <div className="w-14 h-14 rounded-full bg-[#EFF6FF] flex items-center justify-center mx-auto mb-4"><Loader2 className="text-[#3B82F6] animate-spin" size={28} /></div>
            <h1 className="text-lg font-bold text-[#0F172A]">Opening your dashboard…</h1>
            <p className="text-sm text-[#64748B] mt-2">Signing you in from the DigitalCarda app.</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><ShieldAlert className="text-red-500" size={28} /></div>
            <h1 className="text-lg font-bold text-[#0F172A]">This link has expired</h1>
            <p className="text-sm text-[#64748B] mt-2">
              Links from the app work once, for two minutes. Go back to the app and open the page again, or sign in here.
            </p>
            <Link to="/login" className="inline-flex items-center justify-center w-full h-11 mt-6 bg-[#0F172A] text-white rounded-xl text-sm font-bold hover:bg-[#1E293B]">
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
