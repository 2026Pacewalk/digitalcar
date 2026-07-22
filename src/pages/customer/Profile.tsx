import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  User, Eye, EyeOff, Copy, Check, Mail, AtSign, Lock, Link2, Phone,
  Package as PackageIcon, Calendar, Pencil, KeyRound, ExternalLink, CheckCircle2, XCircle, IndianRupee, ShieldCheck,
} from "lucide-react";
import ModuleShell, { Panel } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";

const PKG: Record<number, { name: string; amount: number }> = {
  7: { name: "Trial", amount: 0 },
  5: { name: "Starter", amount: 1499 },
  6: { name: "Standard", amount: 2499 },
};

const fmtDate = (s: unknown) => {
  const v = String(s ?? "");
  if (!v || v === "0000-00-00") return "—";
  const d = new Date(v.replace(" ", "T"));
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-GB").replace(/\//g, "-");
};

function InfoRow({ icon: Icon, label, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0"><Icon size={16} className="text-[#64748B]" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-[#94A3B8]">{label}</p>
        <div className="text-sm font-medium text-[#0F172A] mt-0.5 break-words">{children}</div>
      </div>
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
  const daysLeft = (() => {
    const exp = String(data.expired_on || "");
    if (!exp || exp === "0000-00-00") return 0;
    const d = new Date(exp.replace(" ", "T"));
    return isNaN(d.getTime()) ? 0 : Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
  })();
  const active = daysLeft > 0;
  const initial = (String(data.name)[0] || "U").toUpperCase();

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); toast.success("Copied"); setTimeout(() => setCopied(""), 1500); }
    catch { toast.error("Copy failed"); }
  };

  const CopyBtn = ({ text, k }: { text: string; k: string }) => (
    <button onClick={() => copy(text, k)} className="w-7 h-7 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#0F172A] flex items-center justify-center shrink-0" aria-label="Copy">
      {copied === k ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );

  const pwd = String(data.password || "");

  return (
    <ModuleShell title="User Profile" subtitle="Your account & subscription details" icon={User}
      actions={<a href={cardUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all"><Eye size={16} /> View Card</a>}>

      {/* Hero */}
      <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-[#14243E] to-[#243b63]" />
        <div className="px-5 sm:px-6 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-md shrink-0 -mt-14 sm:-mt-12">
              <div className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-[#F7B31C] to-[#D97706] flex items-center justify-center">
                {data.logo ? <img src={String(data.logo)} alt={String(data.name)} referrerPolicy="no-referrer" className="w-full h-full object-contain bg-white" /> : <span className="text-white text-2xl font-bold">{initial}</span>}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-[#0F172A] truncate">{String(data.name) || "Your Name"}</h2>
              <p className="text-xs text-[#64748B] truncate">{String(data.designation) || "—"}{data.company_name ? ` · ${data.company_name}` : ""}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-[#FEF3C7] text-[#92400E]"><AtSign size={10} /> {String(data.username || slug)}</span>
                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-[#EEF2F7] text-[#334155]">{pkg.name}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${active ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>{active ? <CheckCircle2 size={10} /> : <XCircle size={10} />} {active ? "Active" : "Expired"}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => copy(cardUrl, "hero")} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC]">{copied === "hero" ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />} Copy Link</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Account Information */}
        <Panel title="Account Information" subtitle="Your login & contact details">
          <div className="divide-y divide-[#F1F5F9]">
            <InfoRow icon={User} label="Name">{String(data.name) || "—"}</InfoRow>
            <InfoRow icon={Mail} label="Email">
              <div className="flex items-center gap-1.5"><span className="truncate">{String(data.email) || "—"}</span>{data.email ? <CopyBtn text={String(data.email)} k="email" /> : null}</div>
            </InfoRow>
            <InfoRow icon={AtSign} label="Username">{String(data.username || slug) || "—"}</InfoRow>
            <InfoRow icon={Lock} label="Password">
              <div className="flex items-center gap-1.5">
                <span className="font-mono">{pwd ? (showPwd ? pwd : "•".repeat(Math.min(10, pwd.length || 6))) : "—"}</span>
                {pwd && <button onClick={() => setShowPwd((s) => !s)} className="w-7 h-7 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#0F172A] flex items-center justify-center shrink-0" aria-label="Toggle password">{showPwd ? <EyeOff size={14} /> : <Eye size={14} />}</button>}
                {pwd && <CopyBtn text={pwd} k="pwd" />}
              </div>
            </InfoRow>
            <InfoRow icon={Link2} label="Card Link">
              <div className="flex items-center gap-1.5">
                <a href={cardUrl} target="_blank" rel="noreferrer" className="text-[#F7B31C] hover:underline truncate inline-flex items-center gap-1">{cardUrl} <ExternalLink size={12} className="shrink-0" /></a>
                <CopyBtn text={cardUrl} k="link" />
              </div>
            </InfoRow>
            <InfoRow icon={Phone} label="Contact">
              <div className="flex items-center gap-1.5">{data.mobile1 ? <a href={`tel:${data.mobile1}`} className="hover:text-[#F7B31C]">{String(data.mobile1)}</a> : "—"}{data.mobile1 ? <CopyBtn text={String(data.mobile1)} k="phone" /> : null}</div>
            </InfoRow>
          </div>
        </Panel>

        {/* Subscription */}
        <Panel title="Subscription" subtitle="Your active plan & validity">
          <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] mb-4">
            <div className={`px-5 py-4 text-white ${active ? "bg-gradient-to-r from-[#16A34A] to-[#22C55E]" : "bg-gradient-to-r from-[#EF4444] to-[#F97316]"}`}>
              <p className="text-2xl font-extrabold uppercase leading-none">{pkg.name}</p>
              <p className="text-sm font-medium mt-1 opacity-90">{active ? "Active" : "Expired"} · {daysLeft.toLocaleString("en-IN")} days remaining</p>
            </div>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            <InfoRow icon={PackageIcon} label="Package Name">{pkg.name}</InfoRow>
            <InfoRow icon={IndianRupee} label="Amount">₹{pkg.amount.toLocaleString("en-IN")}</InfoRow>
            <InfoRow icon={Calendar} label="Activated On">{fmtDate(data.activated_on)}</InfoRow>
            <InfoRow icon={Calendar} label="Expire On">{fmtDate(data.expired_on)}</InfoRow>
          </div>
          <div className="flex justify-end mt-4"><button onClick={() => navigate("/dashboard/subscription")} className="inline-flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold"><PackageIcon size={15} /> Upgrade / Renew</button></div>
        </Panel>
      </div>

      {/* Quick actions */}
      <Panel title="Quick Actions" subtitle="Manage your card & account">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Pencil, label: "Edit Details", desc: "Business info", onClick: () => navigate("/dashboard/home") },
            { icon: KeyRound, label: "Change Password", desc: "Update login", onClick: () => navigate("/dashboard/settings") },
            { icon: ShieldCheck, label: "SEO & Theme", desc: "Card settings", onClick: () => navigate("/dashboard/settings") },
            { icon: Eye, label: "View Card", desc: "Live preview", onClick: () => navigate("/dashboard/view") },
          ].map((a) => (
            <button key={a.label} onClick={a.onClick} className="flex flex-col items-start gap-2 p-4 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#F7B31C]/50 hover:shadow-gold/10 hover:-translate-y-0.5 transition-all text-left">
              <span className="w-9 h-9 rounded-lg bg-[#FEF3C7] flex items-center justify-center"><a.icon size={17} className="text-[#F7B31C]" /></span>
              <span><span className="block text-sm font-semibold text-[#0F172A]">{a.label}</span><span className="block text-[11px] text-[#94A3B8]">{a.desc}</span></span>
            </button>
          ))}
        </div>
      </Panel>
    </ModuleShell>
  );
}
