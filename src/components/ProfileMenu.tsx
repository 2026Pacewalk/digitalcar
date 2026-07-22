import { useState } from "react";
import { useNavigate } from "react-router";
import { User, Settings, KeyRound, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/* Role-aware profile / account dropdown — used in the desktop header and the mobile app bar. */
export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const role = user?.role || "customer";
  const base = role === "super_admin" ? "/admin" : role === "reseller" ? "/reseller" : "/dashboard";
  const profile = `${base}/profile`;
  const settings = role === "reseller" ? profile : `${base}/settings`;
  const initial = (user?.fullName || "U").charAt(0).toUpperCase();

  const items = [
    { icon: User, label: "My Profile", path: profile },
    ...(role !== "reseller" ? [{ icon: Settings, label: "Account Settings", path: settings }] : []),
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
