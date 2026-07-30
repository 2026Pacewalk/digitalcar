import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  CalendarClock, MessageSquare, Eye, Pencil, MessageCircle,
  Copy, Check, ShieldAlert, ChevronRight, CreditCard, Wallet, Gift,
  ShoppingBag, ImageIcon, Share2, Star, Upload, QrCode, Info, Home as HomeIcon,
  Sparkles, ArrowRight, TrendingUp, Layers, PhoneCall,
} from "lucide-react";
import type { ComponentType } from "react";
import { toast } from "sonner";
import { loadNewEnquiries, type Enq } from "@/hooks/useEnquiryNotifications";
import { readCustomer, scopedKey, getAuthUser } from "@/hooks/useCustomer";
import { useValidityDays } from "@/hooks/useValidityDays";
import { fetchMyLeads } from "@/lib/adminData";
import { trpc } from "@/providers/trpc";
import TrialBanner from "@/components/customer/TrialBanner";
import TrialLifecycleBanner from "@/components/customer/TrialLifecycleBanner";
import LeadReminder from "@/components/customer/LeadReminder";
import OnboardingGuide, { type GuideStep } from "@/components/customer/OnboardingGuide";

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
  logo: string; about_us: string; address: string; url: string;
  upi: string; bank_name: string; google_review: string;
  facebook: string; twitter: string; instagram: string; youtube: string; pinterest: string; linkedin: string;
};

const EMPTY: Customer = {
  id: 0, name: "", username: "", email: "", mobile1: "", mobile2: "", slug: "",
  package_id: 7, views: 0, expired_on: null, email_verify: 0,
  logo: "", about_us: "", address: "", url: "", upi: "", bank_name: "", google_review: "",
  facebook: "", twitter: "", instagram: "", youtube: "", pinterest: "", linkedin: "",
};

const PKG: Record<number, { name: string; amount: number; days: number }> = {
  7: { name: "TRIAL", amount: 0, days: 30 },
  5: { name: "GOLD", amount: 999, days: 365 },
  6: { name: "PLATINUM", amount: 1999, days: 365 },
};
const PLAN_LIST = [
  { id: 7, name: "Trial", amount: "0/-", days: "30 Days" },
  { id: 5, name: "GOLD", amount: "999/-", days: "365 Days" },
  { id: 6, name: "PLATINUM", amount: "1999/-", days: "365 Days" },
];

const CARD_BASE = "https://digitalcarda.in/";
const inr = (v: number) => "₹" + (Number(v) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

/* Read a user-scoped localStorage list length (products, gallery, …) */
function listCount(base: string): number {
  try {
    const raw = localStorage.getItem(scopedKey(base));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.length : 0;
  } catch { return 0; }
}

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer>(EMPTY);
  const [counts, setCounts] = useState({ products: 0, offers: 0, gallery: 0, videos: 0, uploads: 0, qrcodes: 0, upi: 0, banks: 0 });
  const [enquiries, setEnquiries] = useState<number | null>(null);
  const [recentEnqs, setRecentEnqs] = useState<Enq[]>([]);
  const [copied, setCopied] = useState(false);

  // Refer & Earn wallet — live from the backend for the signed-in user
  const { data: program } = trpc.referral.myProgram.useQuery(undefined, { retry: false });
  // Server-verified published card identity — the source of truth for MY link,
  // so copy/share can never surface another account's (or a stale local) slug.
  const { data: mine } = trpc.publish.mine.useQuery(undefined, { retry: false });
  const { data: followUps } = trpc.lead.followUps.useQuery(undefined, { retry: false });
  const dueFollowUps = (followUps ?? []).filter((l) => {
    if (!l.followUpDate) return false;
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return new Date(l.followUpDate).getTime() <= end.getTime();
  }).slice(0, 4);

  useEffect(() => {
    const c = readCustomer(); // scoped to the logged-in user
    setCustomer({
      ...EMPTY,
      id: c.id, name: c.name || "Customer", username: (c.username as string) || c.slug,
      email: c.email || "", mobile1: (c.mobile1 as string) || "", mobile2: (c.mobile2 as string) || (c.mobile1 as string) || "",
      slug: c.slug || "", package_id: Number(c.package_id) || 7,
      views: Number(c.views) || 0, expired_on: (c.expired_on as string) || null, email_verify: Number(c.email_verify) || 0,
      logo: (c.logo as string) || "", about_us: (c.about_us as string) || "", address: (c.address as string) || "",
      url: (c.url as string) || "", upi: (c.upi as string) || "", bank_name: (c.bank_name as string) || "",
      google_review: (c.google_review as string) || "",
      facebook: (c.facebook as string) || "", twitter: (c.twitter as string) || "", instagram: (c.instagram as string) || "",
      youtube: (c.youtube as string) || "", pinterest: (c.pinterest as string) || "", linkedin: (c.linkedin as string) || "",
    });
    const products = listCount("dc_products");
    let offers = 0;
    try {
      const raw = localStorage.getItem(scopedKey("dc_products"));
      offers = raw ? (JSON.parse(raw) as { isOffer?: boolean }[]).filter((p) => p.isOffer).length : 0;
    } catch { /* 0 */ }
    setCounts({
      products: products - offers, offers,
      gallery: listCount("dc_gallery"), videos: listCount("dc_videos"),
      uploads: listCount("dc_uploads"), qrcodes: listCount("dc_qrcode"),
      upi: listCount("dc_upi"), banks: listCount("dc_banks"),
    });
  }, []);

  // Prefer the slug of MY published card (server truth, per signed-in account);
  // fall back to the local record for cards not yet published.
  const slug = mine?.slug || customer.slug || "";
  const cardUrl = CARD_BASE + slug;
  const pkg = PKG[customer.package_id] || PKG[7];

  // Single source of truth (server trial clock while on trial, else stored plan
  // expiry) — keeps the Dashboard, Card Builder, Profile & Settings all in sync.
  const { days: daysPending, active, onTrial } = useValidityDays(customer.expired_on, pkg.days);

  // live enquiries count = historical + card submissions − deleted
  useEffect(() => {
    if (!slug) { setEnquiries(0); return; }
    let baseIds: string[] = [];
    const deletedSet = () => { try { return new Set(JSON.parse(localStorage.getItem("dc_deleted_enquiries") || "[]")); } catch { return new Set<string>(); } };
    const recount = () => {
      const del = deletedSet();
      const fresh = loadNewEnquiries(slug);
      const freshIds = fresh.map((e) => e.id);
      const all = new Set([...baseIds, ...freshIds]);
      setEnquiries([...all].filter((id) => !del.has(id)).length);
      setRecentEnqs(fresh.filter((e) => !del.has(e.id)).slice(-3).reverse());
    };
    fetchMyLeads<{ id: string; uname: string }[]>()
      .then((d) => { const sl = slug.toLowerCase(); baseIds = d.filter((e) => String(e.uname ?? "").toLowerCase() === sl).map((e) => String(e.id)); recount(); })
      .catch(() => recount());
    const onStorage = () => recount();
    window.addEventListener("storage", onStorage);
    window.addEventListener("dc:new-enquiry", onStorage as EventListener);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("dc:new-enquiry", onStorage as EventListener); };
  }, [slug]);

  /* ─── Smart completion score ─── */
  const hasSocial = !!(customer.facebook || customer.twitter || customer.instagram || customer.youtube || customer.pinterest || customer.linkedin);
  const hasPayments = counts.upi > 0 || counts.banks > 0 || !!customer.upi || !!customer.bank_name || counts.qrcodes > 0;
  const guideSteps: GuideStep[] = [
    { key: "logo", done: !!customer.logo, icon: HomeIcon, title: "Add your logo / photo", impact: "A logo makes your card instantly recognisable and trusted.", path: "/dashboard/home" },
    { key: "contact", done: !!(customer.mobile1 && customer.address), icon: MessageCircle, title: "Complete contact details", impact: "One-tap call & directions — never miss an enquiry.", path: "/dashboard/home" },
    { key: "about", done: !!customer.about_us, icon: Info, title: "Write your About Us", impact: "Tell your story so visitors know why to choose you.", path: "/dashboard/about" },
    { key: "products", done: counts.products + counts.offers > 0, icon: ShoppingBag, title: "Add products / services", impact: "Cards with a catalogue get far more enquiries.", path: "/dashboard/products?tab=products" },
    { key: "payments", done: hasPayments, icon: Wallet, title: "Add payment details", impact: "Add UPI/bank so customers can pay you on the spot.", path: "/dashboard/payments" },
    { key: "gallery", done: counts.gallery + counts.videos > 0, icon: ImageIcon, title: "Add photos & videos", impact: "Visuals build trust and keep visitors on your card longer.", path: "/dashboard/media" },
    { key: "social", done: hasSocial, icon: Share2, title: "Link social profiles", impact: "Turn every card view into a new follower.", path: "/dashboard/social" },
    { key: "reviews", done: !!customer.google_review, icon: Star, title: "Add Google review link", impact: "Star reviews are the #1 reason new customers say yes.", path: "/dashboard/reviews" },
    { key: "uploads", done: counts.uploads > 0, icon: Upload, title: "Upload your eBrochure", impact: "Share a brochure/menu customers can keep for later.", path: "/dashboard/uploads" },
  ];

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(cardUrl); setCopied(true); toast.success("Card link copied"); setTimeout(() => setCopied(false), 1800); }
    catch { toast.error("Copy failed — select and copy manually"); }
  };
  const shareWhatsApp = () => {
    // No recipient prefilled — WhatsApp opens its contact picker so the user
    // chooses who to send to. (Prefilling the card owner's own number opened a
    // chat with themselves — the "shares to its own number" bug.)
    const text = encodeURIComponent(`Here is my digital business card: ${cardUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };
  const copyRefLink = async () => {
    if (!program?.code) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${program.code}`); toast.success("Referral link copied"); }
    catch { toast.error("Copy failed"); }
  };

  const stats = [
    { icon: CalendarClock, value: daysPending.toLocaleString("en-IN"), label: !active ? "Plan expired" : onTrial ? "Trial days left" : "Days left", bg: active ? "#DCFCE7" : "#FEE2E2", fg: active ? "#16A34A" : "#DC2626", onClick: () => navigate("/dashboard/settings?tab=package") },
    { icon: MessageSquare, value: enquiries === null ? "…" : String(enquiries), label: "Enquiries", bg: "#FEF3C7", fg: "#D97706", onClick: () => navigate("/dashboard/enquiry") },
    { icon: Eye, value: customer.views.toLocaleString("en-IN"), label: "Total Views", bg: "#CFFAFE", fg: "#0891B2", onClick: () => navigate("/dashboard/analytics") },
    { icon: Wallet, value: inr(program?.wallet?.balance ?? 0), label: "Wallet", bg: "#EDE9FE", fg: "#7C3AED", onClick: () => navigate("/dashboard/refer") },
  ];

  /* ─── Module grid: every card module with a live count/state ─── */
  const modules = [
    { icon: HomeIcon, label: "Profile", value: customer.logo ? "Ready" : "Set up", ok: !!customer.logo, path: "/dashboard/home" },
    { icon: Info, label: "About Us", value: customer.about_us ? "Added" : "Write", ok: !!customer.about_us, path: "/dashboard/about" },
    { icon: ShoppingBag, label: "Products", value: String(counts.products), ok: counts.products > 0, path: "/dashboard/products?tab=products" },
    { icon: Sparkles, label: "Offers", value: String(counts.offers), ok: counts.offers > 0, path: "/dashboard/products?tab=offers" },
    { icon: Wallet, label: "Payments", value: hasPayments ? "Ready" : "Add", ok: hasPayments, path: "/dashboard/payments" },
    { icon: QrCode, label: "QR Codes", value: String(counts.qrcodes), ok: counts.qrcodes > 0, path: "/dashboard/payments" },
    { icon: ImageIcon, label: "Gallery", value: String(counts.gallery + counts.videos), ok: counts.gallery + counts.videos > 0, path: "/dashboard/media" },
    { icon: Share2, label: "Social", value: hasSocial ? "Linked" : "Link", ok: hasSocial, path: "/dashboard/social" },
    { icon: Star, label: "Reviews", value: customer.google_review ? "Linked" : "Add", ok: !!customer.google_review, path: "/dashboard/reviews" },
    { icon: Upload, label: "Uploads", value: String(counts.uploads), ok: counts.uploads > 0, path: "/dashboard/uploads" },
    { icon: Layers, label: "Bulk Create", value: "Team", ok: true, path: "/dashboard/bulk" },
    { icon: Gift, label: "Refer & Earn", value: program ? `${program.stats.joined} joined` : "Share", ok: true, path: "/dashboard/refer" },
  ];

  return (
    <ResponsiveDashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">

        {/* ─── Trial lifecycle banner (server-authoritative) ─── */}
        <TrialLifecycleBanner paidPlan={customer.package_id === 5 || customer.package_id === 6} />

        {/* ─── Follow-up reminder (mini-CRM) ─── */}
        <LeadReminder />

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
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/10 text-[#F7B31C] uppercase tracking-wide shrink-0">{pkg.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <GlassAction icon={Eye} label="View" onClick={() => navigate("/dashboard/view")} />
              <GlassAction icon={Pencil} label="Edit" onClick={() => navigate("/dashboard/home")} />
              <GlassAction icon={copied ? Check : Copy} label={copied ? "Copied" : "Copy"} onClick={copyLink} active={copied} />
              <GlassAction icon={MessageCircle} label="Share" onClick={shareWhatsApp} tone="green" />
            </div>
          </div>
        </div>

        {/* ─── Trial / expiry FOMO ─── */}
        <TrialBanner isTrial={customer.package_id === 7 && getAuthUser()?.role === "customer"} expiredOn={customer.expired_on} days={daysPending} views={customer.views} leads={enquiries ?? 0} />

        {/* ─── Guided onboarding: what to add next & why it wins leads ─── */}
        <OnboardingGuide
          steps={guideSteps}
          firstName={(customer.name || "there").split(" ")[0]}
          onNavigate={navigate}
          onShare={shareWhatsApp}
        />

        {/* ─── Stats ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <div key={i} onClick={s.onClick}
              className="relative overflow-hidden bg-white rounded-2xl border border-[#F1F5F9] shadow-premium p-4 cursor-pointer active:scale-[0.98] transition-transform">
              <s.icon className="absolute -right-2 -bottom-2 opacity-[0.06]" size={64} style={{ color: s.fg }} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg, color: s.fg }}>
                    <s.icon size={16} />
                  </span>
                  <ChevronRight size={14} className="text-[#CBD5E1]" />
                </div>
                <p className="text-xl font-bold text-[#0F172A] mt-3 leading-none tabular-nums truncate">{s.value}</p>
                <p className="text-[11px] text-[#64748B] mt-1 truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Modules grid ─── */}
        <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-premium p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#0F172A]">Your modules</p>
            <button onClick={() => navigate("/dashboard/settings?tab=module")} className="text-[11px] font-semibold text-[#F7B31C] hover:text-[#D97706] transition-colors">Manage</button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {modules.map((m) => (
              <button key={m.label} onClick={() => navigate(m.path)}
                className="group relative rounded-xl border border-[#F1F5F9] hover:border-[#F7B31C]/40 hover:shadow-premium bg-[#FAFBFC] hover:bg-white p-3 text-center transition-all active:scale-[0.97]">
                <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${m.ok ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span className="w-9 h-9 rounded-xl bg-white group-hover:bg-[#FEF3C7] border border-[#F1F5F9] flex items-center justify-center mx-auto transition-colors">
                  <m.icon size={16} className="text-[#64748B] group-hover:text-[#D97706] transition-colors" />
                </span>
                <p className="text-[10px] font-semibold text-[#0F172A] mt-1.5 truncate">{m.label}</p>
                <p className={`text-[9px] mt-0.5 truncate ${m.ok ? "text-[#94A3B8]" : "text-amber-600 font-semibold"}`}>{m.value}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Follow-ups due (only when there are any) ─── */}
        {dueFollowUps.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#FDE68A] shadow-premium overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between bg-gradient-to-r from-[#FFFBEB] to-white">
              <p className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                <CalendarClock size={14} className="text-[#D97706]" /> Follow-ups due
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">{dueFollowUps.length}</span>
              </p>
              <button onClick={() => navigate("/dashboard/leads")} className="text-[11px] font-semibold text-[#F7B31C] hover:text-[#D97706] transition-colors">View all</button>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {dueFollowUps.map((l) => {
                const digits = (l.phone || "").replace(/\D/g, "");
                const wa = digits.length === 10 ? `91${digits}` : digits;
                return (
                  <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center shrink-0 text-[#0F172A] text-[11px] font-bold">{(l.fullName || "?").charAt(0).toUpperCase()}</span>
                    <button onClick={() => navigate("/dashboard/leads")} className="min-w-0 flex-1 text-left">
                      <p className="text-[12px] font-semibold text-[#0F172A] truncate">{l.fullName}</p>
                      <p className="text-[10px] text-[#D97706] truncate">Due {new Date(l.followUpDate!).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                    </button>
                    {l.phone && <a href={`tel:${l.phone}`} className="w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shrink-0" aria-label="Call"><PhoneCall size={13} /></a>}
                    {l.phone && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-[#14B8A6] text-white flex items-center justify-center shrink-0" aria-label="WhatsApp"><MessageSquare size={13} /></a>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Recent enquiries + Refer strip ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent enquiries */}
          <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-premium overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
              <p className="text-xs font-semibold text-[#0F172A]">Recent enquiries</p>
              <button onClick={() => navigate("/dashboard/enquiry")} className="text-[11px] font-semibold text-[#F7B31C] hover:text-[#D97706] transition-colors">View all</button>
            </div>
            {recentEnqs.length === 0 ? (
              <div className="p-6 text-center">
                <span className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-2"><MessageSquare size={18} className="text-[#94A3B8]" /></span>
                <p className="text-[12px] font-medium text-[#0F172A]">No new enquiries</p>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Share your card to start receiving leads.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {recentEnqs.map((e) => (
                  <button key={e.id} onClick={() => navigate("/dashboard/enquiry")} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAFBFC] transition-colors text-left">
                    <span className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center shrink-0 text-[#0F172A] text-[11px] font-bold">{(e.name || "?").charAt(0).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-[#0F172A] truncate">{e.name || "Visitor"}</p>
                      <p className="text-[10px] text-[#94A3B8] truncate">{e.contact || e.email || "—"}</p>
                    </span>
                    <ChevronRight size={14} className="text-[#CBD5E1] shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refer & Earn */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#172033] to-[#1E293B] p-4 shadow-premium">
            <Gift className="absolute -right-3 -bottom-4 text-[#F7B31C] opacity-10" size={96} />
            <div className="relative">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F7B31C]/15 text-[#F7B31C] ring-1 ring-[#F7B31C]/20"><TrendingUp size={10} /> Earn {program?.commissionPercent ?? 15}% cash</span>
              <p className="text-[14px] font-bold text-white mt-2">Refer friends, fill your wallet</p>
              <p className="text-[11px] text-white/55 mt-0.5 leading-snug">They save {program?.discountPercent ?? 15}% — you earn {program?.commissionPercent ?? 15}% of every paid plan.</p>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={copyRefLink} disabled={!program}
                  className="flex-1 h-9 rounded-lg bg-white/10 ring-1 ring-white/10 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-white/20 transition-colors disabled:opacity-40 truncate px-2">
                  <Copy size={12} /> {program?.code || "…"}
                </button>
                <button onClick={() => navigate("/dashboard/refer")} className="h-9 px-3.5 rounded-lg gradient-gold text-[#0F172A] text-[11px] font-bold flex items-center gap-1 hover:shadow-gold transition-all">
                  Open <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
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
