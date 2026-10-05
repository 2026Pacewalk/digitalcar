import { useState } from "react";
import { useNavigate } from "react-router";
import { User, Settings, KeyRound, HelpCircle, LogOut, ArrowLeft, Wallet, FileText } from "lucide-react";
import { useAuth, useSessionRole } from "@/hooks/useAuth";
import { getToken, clearSession, adminReturnPath } from "@/lib/session";
import { finishSaves } from "@/hooks/useAutoPublish";

/* Role-aware profile / account dropdown — used in the desktop header and the mobile app bar. */
export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const role = useSessionRole();
  const base = role === "super_admin" || role === "staff" ? "/admin" : role === "reseller" ? "/reseller" : "/dashboard";
  const profile = `${base}/profile`;
  const settings = role === "reseller" || role === "staff" ? profile : `${base}/settings`;
  const initial = (user?.fullName || "U").charAt(0).toUpperCase();

  // A super-admin using "Login as Client" keeps their admin session in the admin
  // slot while viewing the customer portal — offer a clean way back.
  const impersonating = typeof window !== "undefined" && !window.location.pathname.startsWith("/admin") && !!getToken("admin");
  // Leaving signs the customer out of this browser, and nothing is saved for
  // them after that: an edit still waiting to go out is sent first. If it
  // doesn't go through the admin stays here, with the message that says why.
  const [leaving, setLeaving] = useState(false);
  const returnToAdmin = async () => {
    if (leaving) return;
    setLeaving(true);
    const to = adminReturnPath();
    if (!(await finishSaves())) { setLeaving(false); return; }
    clearSession("main");
    window.location.href = to;
  };

  // A partner gets partner pages only: profile, money, and the real support page.
  const items = role === "reseller" ? [
    { icon: User, label: "My Profile", path: "/reseller/profile" },
    { icon: KeyRound, label: "Change Password", path: "/reseller/profile#password" },
    { icon: Wallet, label: "Earnings & Payouts", path: "/reseller/earnings" },
    { icon: FileText, label: "Account statement", path: "/reseller/statement" },
    { icon: HelpCircle, label: "Help & Support", path: "/contact" },
  ] : [
    { icon: User, label: "My Profile", path: profile },
    ...(role !== "staff" ? [{ icon: Settings, label: "Account Settings", path: settings }] : []),
    ...(role === "customer" ? [{ icon: KeyRound, label: "Change Password", path: "/dashboard/settings?tab=password" }] : []),
    { icon: HelpCircle, label: "Help & Support", path: settings },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center shrink-0 active:scale-95 transition-transform"
        aria-label="Profile menu"
      >
        <span className="text-[#0F172A] text-xs font-bold">{initial}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-[60] w-60 bg-white rounded-2xl shadow-premium-lg border border-[#F1F5F9] p-2 animate-fade-in">
            {/* User header */}
            <div className="flex items-center gap-3 px-2 py-2 border-b border-[#F1F5F9] mb-1">
              <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shrink-0">
                <span className="text-[#0F172A] text-sm font-bold">{initial}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0F172A] truncate">{user?.fullName || "User"}</p>
                <p className="text-[11px] text-[#94A3B8] truncate">{user?.email || ""}</p>
              </div>
            </div>
            {impersonating && (
              <button onClick={returnToAdmin} disabled={leaving} className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[13px] font-bold text-[#0F172A] bg-[#FEF3C7] hover:brightness-105 transition-all text-left mb-1 disabled:opacity-70">
                <span className="w-8 h-8 rounded-lg bg-[#F7B31C] flex items-center justify-center shrink-0"><ArrowLeft size={15} className="text-[#0F172A]" /></span>
                {leaving ? "Saving changes…" : "Return to admin"}
              </button>
            )}
            {items.map((m) => (
              <button key={m.label} onClick={() => { setOpen(false); navigate(m.path); }} className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[13px] font-medium text-[#334155] hover:bg-[#F8FAFC] active:bg-[#F8FAFC] transition-colors text-left">
                <span className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0"><m.icon size={15} className="text-[#64748B]" /></span>
                {m.label}
              </button>
            ))}
            <div className="border-t border-[#F1F5F9] mt-1 pt-1">
              <button onClick={() => { setOpen(false); logout(); }} className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-50 active:bg-red-50 transition-colors text-left">
                <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0"><LogOut size={15} /></span>
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
