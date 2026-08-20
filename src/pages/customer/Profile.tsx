import { useState } from "react";
import { useNavigate, Navigate } from "react-router";
import { toast } from "sonner";
import {
  User, Eye, EyeOff, Copy, Check, Mail, AtSign, Lock, Link2, Phone,
  Package as PackageIcon, Pencil, KeyRound, ChevronRight, CheckCircle2, XCircle, ShieldCheck, Sparkles,
} from "lucide-react";
import ModuleShell from "@/components/customer/ModuleShell";
import { useCustomer, getAuthUser } from "@/hooks/useCustomer";
import { useValidityDays } from "@/hooks/useValidityDays";

const PKG: Record<number, { name: string; amount: number; days: number }> = {
  7: { name: "Trial", amount: 0, days: 7 },
  5: { name: "Gold", amount: 999, days: 365 },
  6: { name: "Platinum", amount: 1999, days: 365 },
};

/* Compact settings-style row: icon · label · value · optional action */
function Row({ icon: Icon, label, value, action }: {
  icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0"><Icon size={15} className="text-[#64748B]" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-[#94A3B8]">{label}</p>
        <div className="text-[13px] font-medium text-[#0F172A] truncate">{value}</div>
      </div>
      {action}
    </div>
  );
}

export default function CustomerProfile() {
  const { data } = useCustomer();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied] = useState("");

  const slug = String(data.slug || "");
  const cardUrl = `https://digitalcarda.in/${slug}`;
  const pkg = PKG[Number(data.package_id)] || PKG[7];
  // Server trial clock while on trial, else stored plan expiry — matches the
  // Dashboard & Card Builder so "days left" is identical everywhere.
  const { days: daysLeft, active } = useValidityDays(data.expired_on, pkg.days, [5, 6].includes(Number(data.package_id)));
  const pctLeft = Math.min(100, Math.round((daysLeft / pkg.days) * 100));
  // Staff accounts (super-admin / reseller) aren't card customers — send them to
  // their own area instead of the customer card profile. (Impersonated clients
  // have role "customer", so they're unaffected.)
  const role = getAuthUser()?.role || "customer";
  const isStaff = role === "super_admin" || role === "reseller";
  const staffLabel = role === "super_admin" ? "Admin" : "Reseller";
  const initial = (String(data.name)[0] || "U").toUpperCase();
  const pwd = String(data.password || "");

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); toast.success("Copied"); setTimeout(() => setCopied(""), 1500); }
    catch { toast.error("Copy failed"); }
  };
  const CopyBtn = ({ text, k }: { text: string; k: string }) => (
    <button onClick={() => copy(text, k)} className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#0F172A] flex items-center justify-center shrink-0" aria-label="Copy">
      {copied === k ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );

  const quickActions = [
    { icon: Pencil, label: "Edit business details", onClick: () => navigate("/dashboard/home") },
    { icon: KeyRound, label: "Change password", onClick: () => navigate("/dashboard/settings?tab=password") },
    { icon: ShieldCheck, label: "SEO & theme settings", onClick: () => navigate("/dashboard/settings?tab=seo") },
    { icon: Eye, label: "View live card", onClick: () => navigate("/dashboard/view") },
  ];

  // A real admin/reseller has no public card — bounce them to their own profile
  // rather than showing the customer card-builder view (card link, edit card, etc.).
  if (role === "super_admin") return <Navigate to="/admin/profile" replace />;
  if (role === "reseller") return <Navigate to="/reseller/profile" replace />;

  return (
    <ModuleShell title="Profile" subtitle="Account & subscription" icon={User}
      actions={<a href={cardUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all whitespace-nowrap"><Eye size={16} /> View</a>}>

      {/* ─── Profile header (centered) ─── */}
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5 text-center">
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-[#14243E] to-[#243b63]" />
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-md mx-auto">
            <div className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-[#F7B31C] to-[#D97706] flex items-center justify-center">
              {data.logo ? <img src={String(data.logo)} alt={String(data.name)} referrerPolicy="no-referrer" className="w-full h-full object-contain bg-white" /> : <span className="text-white text-2xl font-bold">{initial}</span>}
            </div>
          </div>
          <h2 className="text-base font-bold text-[#0F172A] mt-3 truncate">{String(data.name) || "Your Name"}</h2>
          <p className="text-[11px] text-[#64748B] truncate">{String(data.designation) || "—"}{data.company_name ? ` · ${data.company_name}` : ""}</p>
          <div className="flex items-center justify-center gap-1.5 mt-3 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-[#FEF3C7] text-[#92400E]"><AtSign size={10} /> {String(data.username || slug)}</span>
            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${isStaff ? "bg-[#14243E] text-white" : "bg-[#EEF2F7] text-[#334155]"}`}>{isStaff ? staffLabel : pkg.name}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${(isStaff || active) ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>{(isStaff || active) ? <CheckCircle2 size={10} /> : <XCircle size={10} />} {isStaff ? "Full access" : active ? "Active" : "Expired"}</span>
          </div>
          <button onClick={() => copy(cardUrl, "hero")} className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors">
            {copied === "hero" ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />} Copy card link
          </button>
        </div>
      </div>

      {/* ─── Subscription / staff access (compact) ─── */}
      {isStaff ? (
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#14243E] text-white flex items-center justify-center shrink-0"><ShieldCheck size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#0F172A]">{staffLabel} account</p>
            <p className="text-[11px] text-[#64748B]">Full platform access — no plan or trial needed.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4">
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}><PackageIcon size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#0F172A]">{pkg.name} Plan</p>
              <p className="text-[11px] text-[#64748B]">{active ? "Active" : "Expired"} · {daysLeft.toLocaleString("en-IN")} days left</p>
            </div>
            <button onClick={() => navigate("/dashboard/subscription")} className="h-9 px-3.5 rounded-xl gradient-gold text-[#0F172A] text-xs font-bold hover:shadow-gold transition-all shrink-0 inline-flex items-center gap-1.5"><Sparkles size={13} /> Upgrade</button>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctLeft}%`, background: active ? "linear-gradient(90deg,#F7B31C,#D97706)" : "#EF4444" }} />
          </div>
        </div>
      )}

      {/* ─── Account details (settings list) ─── */}
      <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
        <p className="px-4 pt-3.5 pb-1 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Account</p>
        <div className="divide-y divide-[#F1F5F9]">
          <Row icon={Mail} label="Email" value={String(data.email) || "—"} action={data.email ? <CopyBtn text={String(data.email)} k="email" /> : undefined} />
          <Row icon={AtSign} label="Username" value={String(data.username || slug) || "—"} />
          <Row icon={Lock} label="Password"
            value={<span className="font-mono">{pwd ? (showPwd ? pwd : "•".repeat(Math.min(10, pwd.length || 6))) : "—"}</span>}
            action={pwd ? (
              <div className="flex items-center">
                <button onClick={() => setShowPwd((s) => !s)} className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#0F172A] flex items-center justify-center shrink-0" aria-label="Toggle password">{showPwd ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                <CopyBtn text={pwd} k="pwd" />
              </div>
            ) : undefined} />
          <Row icon={Link2} label="Card link" value={<span className="text-[#F7B31C]">@{slug}</span>} action={<CopyBtn text={cardUrl} k="link" />} />
          <Row icon={Phone} label="Contact" value={data.mobile1 ? <a href={`tel:${data.mobile1}`} className="hover:text-[#F7B31C]">{String(data.mobile1)}</a> : "—"} action={data.mobile1 ? <CopyBtn text={String(data.mobile1)} k="phone" /> : undefined} />
        </div>
      </div>

      {/* ─── Quick actions (list rows) ─── */}
      <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
        <p className="px-4 pt-3.5 pb-1 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Manage</p>
        <div className="divide-y divide-[#F1F5F9]">
          {quickActions.map((a) => (
            <button key={a.label} onClick={a.onClick} className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#F8FAFC] transition-colors text-left">
              <span className="w-8 h-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0"><a.icon size={15} className="text-[#F7B31C]" /></span>
              <span className="text-[13px] font-medium text-[#0F172A] flex-1">{a.label}</span>
              <ChevronRight size={16} className="text-[#CBD5E1] shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </ModuleShell>
  );
}
