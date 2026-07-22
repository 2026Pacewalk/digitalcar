import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  CalendarClock, MessageSquare, Eye, Pencil, MessageCircle,
  Copy, Check, ShieldAlert, ChevronRight, CreditCard,
} from "lucide-react";
import type { ComponentType } from "react";
import { toast } from "sonner";
import { loadNewEnquiries } from "@/hooks/useEnquiryNotifications";
import { readCustomer } from "@/hooks/useCustomer";

/* Glass action button for the dark hero card (icon + tiny label) */
function GlassAction({ icon: Icon, label, onClick, tone = "default", active = false }: {
  icon: ComponentType<{ size?: number; className?: string }>; label: string; onClick: () => void;
  tone?: "default" | "green"; active?: boolean;
}) {
  const cls = active
    ? "bg-emerald-400/20 text-emerald-200 ring-emerald-300/30"
    : tone === "green"
      ? "bg-emerald-400/15 text-emerald-200 ring-white/10 hover:bg-emerald-400/25"
      : "bg-white/10 text-white/90 ring-white/10 hover:bg-white/20";
  return (
    <button onClick={onClick} title={label} aria-label={label}
      className={`flex-1 h-11 rounded-xl ring-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 ${cls}`}>
      <Icon size={16} />
      <span className="text-[9px] font-semibold tracking-wide">{label}</span>
    </button>
  );
}

type Customer = {
  id: number; name: string; username: string; email: string;
  mobile1: string; mobile2: string; slug: string; package_id: number;
  views: number; expired_on: string | null; email_verify: number;
};

const DEFAULT: Customer = {
  id: 8, name: "Aarav Sharma", username: "acme-digital", email: "hello@acmedigital.example",
  mobile1: "+91 98765 43210", mobile2: "919876543210", slug: "acme-digital",
  package_id: 6, views: 1284, expired_on: "2028-06-30", email_verify: 0,
};

const PKG: Record<number, { name: string; amount: number; days: number }> = {
  7: { name: "TRIAL", amount: 0, days: 7 },
  5: { name: "STARTER", amount: 1499, days: 365 },
  6: { name: "STANDARD", amount: 2499, days: 1095 },
};
const PLAN_LIST = [
  { id: 7, name: "Trial", amount: "0/-", days: "7 Days" },
  { id: 5, name: "STARTER", amount: "1499/-", days: "365 Days" },
  { id: 6, name: "STANDARD", amount: "2499/-", days: "1095 Days" },
];

const CARD_BASE = "https://digitalcarda.in/";

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer>(DEFAULT);
  const [enquiries, setEnquiries] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const c = readCustomer(); // scoped to the logged-in user (seeded from their account)
    setCustomer({
      id: c.id, name: c.name || "Customer", username: (c.username as string) || c.slug,
      email: c.email || "", mobile1: (c.mobile1 as string) || "", mobile2: (c.mobile2 as string) || (c.mobile1 as string) || "",
      slug: c.slug || "", package_id: Number(c.package_id) || 7,
      views: Number(c.views) || 0, expired_on: c.expired_on as string, email_verify: Number(c.email_verify) || 0,
    });
  }, []);

  const slug = customer.slug || "";
  const cardUrl = CARD_BASE + slug;
  const pkg = PKG[customer.package_id] || PKG[7];

  const daysPending = useMemo(() => {
    if (!customer.expired_on || customer.expired_on === "0000-00-00") return pkg.days;
    const d = new Date(String(customer.expired_on).replace(" ", "T"));
    if (isNaN(d.getTime())) return pkg.days;
    return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
  }, [customer.expired_on, pkg.days]);
  const active = daysPending > 0;

  // live enquiries count = historical + card submissions − deleted
  useEffect(() => {
    if (!slug) { setEnquiries(0); return; }
    let baseIds: string[] = [];
    const deletedSet = () => { try { return new Set(JSON.parse(localStorage.getItem("dc_deleted_enquiries") || "[]")); } catch { return new Set<string>(); } };
    const recount = () => {
      const del = deletedSet();
      const freshIds = loadNewEnquiries(slug).map((e) => e.id);
      const all = new Set([...baseIds, ...freshIds]);
      setEnquiries([...all].filter((id) => !del.has(id)).length);
    };
    fetch("/enquiries.json")
      .then((r) => r.json())
      .then((d: { id: string; uname: string }[]) => { baseIds = d.filter((e) => e.uname === slug).map((e) => String(e.id)); recount(); })
      .catch(() => setEnquiries(0));
    const onStorage = () => recount();
    window.addEventListener("storage", onStorage);
    window.addEventListener("dc:new-enquiry", onStorage as EventListener);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("dc:new-enquiry", onStorage as EventListener); };
  }, [slug]);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(cardUrl); setCopied(true); toast.success("Card link copied"); setTimeout(() => setCopied(false), 1800); }
    catch { toast.error("Copy failed — select and copy manually"); }
  };
  const shareWhatsApp = () => {
    const num = (customer.mobile2 || customer.mobile1 || "").replace(/[^\d]/g, "");
    const text = encodeURIComponent(`Here is my digital business card: ${cardUrl}`);
    window.open(num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`, "_blank");
  };

  const stats = [
    { icon: CalendarClock, value: daysPending.toLocaleString("en-IN"), label: active ? "Days left" : "Plan expired", bg: active ? "#DCFCE7" : "#FEE2E2", fg: active ? "#16A34A" : "#DC2626" },
    { icon: MessageSquare, value: enquiries === null ? "…" : String(enquiries), label: "Enquiries", bg: "#FEF3C7", fg: "#D97706", onClick: () => navigate("/dashboard/enquiry") },
    { icon: Eye, value: customer.views.toLocaleString("en-IN"), label: "Total Views", bg: "#CFFAFE", fg: "#0891B2" },
  ];

  return (
    <ResponsiveDashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">

        {/* ─── Hero: your digital card ─── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#172033] to-[#1E293B] p-5 shadow-premium-lg ring-1 ring-black/5">
          <div className="absolute -right-10 -top-14 w-44 h-44 rounded-full bg-[#F7B31C]/25 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-16 w-40 h-40 rounded-full bg-[#14B8A6]/15 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl gradient-gold flex items-center justify-center shrink-0 shadow-gold">
                <CreditCard size={20} className="text-[#0F172A]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Your card · Live</p>
                </div>
                <p className="text-[15px] font-bold text-white truncate mt-0.5">@{slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <GlassAction icon={Eye} label="View" onClick={() => navigate("/dashboard/view")} />
              <GlassAction icon={Pencil} label="Edit" onClick={() => navigate("/dashboard/home")} />
              <GlassAction icon={copied ? Check : Copy} label={copied ? "Copied" : "Copy"} onClick={copyLink} active={copied} />
              <GlassAction icon={MessageCircle} label="Share" onClick={shareWhatsApp} tone="green" />
            </div>
          </div>
        </div>

        {/* ─── Stats ─── */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <div key={i} onClick={s.onClick}
              className={`relative overflow-hidden bg-white rounded-2xl border border-[#F1F5F9] shadow-premium p-4 ${s.onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}>
              <s.icon className="absolute -right-2 -bottom-2 opacity-[0.06]" size={64} style={{ color: s.fg }} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg, color: s.fg }}>
                    <s.icon size={16} />
                  </span>
                  {s.onClick && <ChevronRight size={14} className="text-[#CBD5E1]" />}
                </div>
                <p className="text-2xl font-bold text-[#0F172A] mt-3 leading-none tabular-nums">{s.value}</p>
                <p className="text-[11px] text-[#64748B] mt-1 truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Plans ─── */}
        <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-premium p-4">
          <p className="text-xs font-semibold text-[#0F172A] mb-3">Plans <span className="text-[#94A3B8] font-normal">· incl. taxes</span></p>
          <div className="grid grid-cols-3 gap-2.5">
            {PLAN_LIST.map((p) => {
              const isActive = p.id === customer.package_id;
              return (
                <div key={p.id} className={`relative rounded-xl border overflow-hidden flex flex-col transition-shadow ${isActive ? "border-[#F7B31C] bg-gradient-to-b from-[#FFFBEB] to-white shadow-[0_4px_16px_-8px_rgba(247,179,28,0.5)]" : "border-[#E2E8F0]"}`}>
                  <div className="text-center pt-3 pb-2 px-2">
                    <p className="text-[11px] font-bold text-[#14B8A6] leading-none">{p.name}</p>
                    <p className="text-lg font-extrabold text-[#0F172A] mt-1.5 leading-none">{p.amount}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-1">{p.days}</p>
                  </div>
                  <div className="p-2 mt-auto">
                    {isActive
                      ? <span className="flex items-center justify-center w-full py-1.5 rounded-lg bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold tracking-wide">ACTIVE</span>
                      : <button onClick={() => navigate("/dashboard/subscription")} className="w-full py-1.5 rounded-lg bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white text-[10px] font-bold hover:opacity-90 transition-opacity">BUY</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Email verify alert ─── */}
        {customer.email_verify === 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-[#FEF2F2] to-[#FFF7F7] border border-red-100 p-3.5 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-red-100 text-red-500 flex items-center justify-center shrink-0"><ShieldAlert size={17} /></span>
            <p className="text-xs text-[#991B1B] flex-1 leading-snug">Email not verified. Check your inbox for the verification link.</p>
            <button onClick={() => toast.success("Verification link resent to " + customer.email)} className="h-9 px-3.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] transition-colors shrink-0">
              Resend
            </button>
          </div>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
