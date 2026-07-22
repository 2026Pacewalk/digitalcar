import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Database, MessageSquare, Eye, Pencil, MessageCircle,
  Copy, Check, ShieldAlert, ArrowRight, Share2,
} from "lucide-react";
import { toast } from "sonner";

type Customer = {
  id: number; name: string; username: string; email: string;
  mobile1: string; mobile2: string; slug: string; package_id: number;
  views: number; expired_on: string | null; email_verify: number;
};

const DEFAULT: Customer = {
  id: 8, name: "Shekhar Jain", username: "pacewalk", email: "md@pacewalk.com",
  mobile1: "+919988144844", mobile2: "919988144844", slug: "pacewalk",
  package_id: 6, views: 5627, expired_on: "2028-06-30", email_verify: 0,
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
    try {
      const raw = localStorage.getItem("dc_customer");
      if (raw) {
        const c = JSON.parse(raw);
        setCustomer({
          id: c.id, name: c.name || "Customer", username: c.username || c.slug,
          email: c.email || "", mobile1: c.mobile1 || "", mobile2: c.mobile2 || c.mobile1 || "",
          slug: c.slug || "", package_id: Number(c.package_id) || 7,
          views: Number(c.views) || 0, expired_on: c.expired_on, email_verify: Number(c.email_verify) || 0,
        });
      }
    } catch { /* keep default */ }
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

  // enquiries count for this card
  useEffect(() => {
    if (!slug) { setEnquiries(0); return; }
    fetch("/enquiries.json")
      .then((r) => r.json())
      .then((d: { uname: string }[]) => setEnquiries(d.filter((e) => e.uname === slug).length))
      .catch(() => setEnquiries(0));
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

  const tiles = [
    { title: pkg.name, sub: active ? "Active" : "Expired", foot: `${daysPending.toLocaleString("en-IN")} Days Pending`, icon: Database, from: "#16A34A", to: "#22C55E" },
    { title: enquiries === null ? "…" : String(enquiries), sub: "Enquiries", foot: "Click here to view", icon: MessageSquare, from: "#D97706", to: "#F59E0B", onClick: () => navigate("/dashboard/leads") },
    { title: customer.views.toLocaleString("en-IN"), sub: "Total Views", foot: " ", icon: Eye, from: "#0891B2", to: "#06B6D4" },
  ];

  return (
    <ResponsiveDashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
        {/* Greeting */}
        <p className="text-sm text-[#14243E]">
          <b>Dear Customer,</b><br />
          If this is your first login, click <b>Home / Edit</b> and fill in your business details step by step.
        </p>

        {/* Stat tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tiles.map((t, i) => (
            <button key={i} onClick={t.onClick} disabled={!t.onClick}
              className="relative rounded-2xl p-5 text-white text-left overflow-hidden shadow-premium disabled:cursor-default transition-transform enabled:hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}>
              <t.icon size={54} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-25" />
              <p className="text-3xl font-extrabold leading-none">{t.title}</p>
              <p className="text-lg font-semibold mt-1">{t.sub}</p>
              <p className="text-xs opacity-90 mt-2">{t.foot}</p>
            </button>
          ))}
        </div>

        {/* Two panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card details */}
          <div className="rounded-2xl border border-[#14243E]/15 bg-white overflow-hidden shadow-premium">
            <div className="bg-[#14243E] text-white text-center py-3 font-semibold">View Your Digital Business Card Details</div>
            <div className="p-5 space-y-5">
              <div>
                <h4 className="text-[#F7B31C] font-bold text-sm mb-3">View &amp; Edit Your Digital Business Card</h4>
                <div className="flex flex-wrap gap-2.5">
                  <a href={cardUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#14243E] hover:bg-[#F8FAFC] transition-colors">
                    <Eye size={15} /> View Your Digital Business Card
                  </a>
                  <Link to="/dashboard/builder" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#14243E] hover:bg-[#F8FAFC] transition-colors">
                    <Pencil size={15} /> Edit Your Digital Business Card
                  </Link>
                </div>
              </div>
              <hr className="border-[#F1F5F9]" />
              <div>
                <h4 className="text-[#F7B31C] font-bold text-sm mb-3">Share Your Digital Business Card on WhatsApp</h4>
                <button onClick={shareWhatsApp} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#14243E] hover:bg-[#DCFCE7] hover:border-[#22C55E]/40 transition-colors">
                  <MessageCircle size={15} className="text-[#22C55E]" /> Get Your Card Link to Your WhatsApp Number
                </button>
              </div>
              <hr className="border-[#F1F5F9]" />
              <div>
                <h4 className="text-[#F7B31C] font-bold text-sm mb-2">Your Digital Business Card Link</h4>
                <p className="text-sm font-semibold text-[#14243E] break-all mb-3">{cardUrl}</p>
                <button onClick={copyLink} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#14243E] hover:bg-[#F8FAFC] transition-colors">
                  {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />} {copied ? "Copied!" : "Copy Your Business Card Link"}
                </button>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-2xl border border-[#14243E]/15 bg-white overflow-hidden shadow-premium">
            <div className="bg-[#14243E] text-white text-center py-3 font-semibold">Select Your Pricing Plan &amp; Buy Now</div>
            <div className="p-5">
              <p className="text-sm font-semibold text-[#14243E] mb-4">Select Your Plan <span className="font-normal text-[#64748B]">(Inclusive of all taxes)</span></p>
              <div className="grid grid-cols-3 gap-3">
                {PLAN_LIST.map((p) => {
                  const isActive = p.id === customer.package_id;
                  return (
                    <div key={p.id} className="rounded-xl overflow-hidden border border-[#E2E8F0] flex flex-col">
                      <div className="bg-[#14243E] text-center py-4 px-2">
                        <p className="text-[#14B8A6] font-bold text-sm leading-tight">{p.name}</p>
                        <p className="text-white font-extrabold text-lg mt-1">{p.amount}</p>
                      </div>
                      <div className="bg-[#EAF1F8] text-center py-2 text-xs font-semibold text-[#14243E]">{p.days}</div>
                      <div className="p-2.5 text-center mt-auto">
                        {isActive
                          ? <span className="inline-block w-full py-1.5 rounded-lg gradient-gold text-[#0F172A] text-[11px] font-bold">ACTIVE</span>
                          : <button onClick={() => navigate("/dashboard/subscription")} className="w-full py-1.5 rounded-lg bg-[#14243E] text-white text-[11px] font-bold hover:bg-[#1E293B] transition-colors">BUY NOW</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-center mt-6">
                <p className="text-sm font-semibold text-[#14243E]">Share &amp; Send Your Business Card to Your Customers and Grow Your Business</p>
                <p className="text-[#F7B31C] font-bold text-sm mt-1 flex items-center justify-center gap-1"><Share2 size={13} /> More Leads = More Customers = More Business</p>
              </div>
            </div>
          </div>
        </div>

        {/* Email verify alert */}
        {customer.email_verify === 0 && (
          <div className="rounded-2xl bg-[#F87171] text-white p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="text-sm flex items-start gap-2 flex-1">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              Email address not verified. Please verify your email by clicking the link in the email. To resend the link, click the button.
            </p>
            <button onClick={() => toast.success("Verification link resent to " + customer.email)} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#14243E] text-white text-sm font-semibold hover:bg-[#0F172A] transition-colors shrink-0">
              <ArrowRight size={15} /> Resend Link
            </button>
          </div>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
