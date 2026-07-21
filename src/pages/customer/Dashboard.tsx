import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import {
  Eye, UserCheck, MousePointer, MessageSquare, CreditCard,
  ExternalLink, Share2, Download, Zap, ArrowRight, TrendingUp,
  Plus, Sparkles, QrCode, Users, Phone, Globe, Mail, MapPin,
  ChevronRight, Bell,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SkeletonStats, SkeletonChart, SkeletonCard } from "@/components/mobile/SkeletonLoader";

const chartData = [
  { day: "Mon", views: 45 }, { day: "Tue", views: 62 }, { day: "Wed", views: 38 },
  { day: "Thu", views: 78 }, { day: "Fri", views: 91 }, { day: "Sat", views: 56 }, { day: "Sun", views: 43 },
];

const RECENT_LEADS = [
  { id: 1, name: "Rahul Sharma", phone: "+91 98765 43210", source: "WhatsApp", date: "2 min ago", status: "new" },
  { id: 2, name: "Priya Patel", phone: "+91 99887 66554", source: "QR Scan", date: "15 min ago", status: "new" },
  { id: 3, name: "Amit Kumar", phone: "+91 98123 45678", source: "Website", date: "1 hour ago", status: "contacted" },
  { id: 4, name: "Sneha Gupta", phone: "+91 98765 11223", source: "Direct", date: "3 hours ago", status: "followup" },
];

/* ─── Mobile Stats Card ─── */
function StatCard({ label, value, icon: Icon, color, delay, onClick }: { label: string; value: string; icon: any; color: string; delay: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] active:scale-[0.98] transition-transform animate-fade-in-up text-left w-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-2.5`}>
        <Icon size={16} />
      </div>
      <p className="text-xl font-bold text-[#0F172A]">{value}</p>
      <p className="text-[11px] text-[#94A3B8] mt-0.5">{label}</p>
    </button>
  );
}

/* ─── Quick Action Button ─── */
function QuickAction({ icon: Icon, label, onClick, color }: { icon: any; label: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 py-2 px-3 rounded-2xl active:scale-[0.95] transition-transform">
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shadow-sm`}>
        <Icon size={18} className="text-white" />
      </div>
      <span className="text-[10px] font-medium text-[#64748B]">{label}</span>
    </button>
  );
}

/* ─── Lead Card (Mobile) ─── */
function LeadCard({ lead, index }: { lead: typeof RECENT_LEADS[0]; index: number }) {
  const statusColors: Record<string, string> = {
    new: "bg-[#DBEAFE] text-[#1E40AF]",
    contacted: "bg-[#D1FAE5] text-[#065F46]",
    followup: "bg-[#FEF3C7] text-[#92400E]",
  };
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-premium border border-[#F1F5F9] active:scale-[0.98] transition-transform animate-fade-in-up" style={{ animationDelay: `${300 + index * 50}ms` }}>
      <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shrink-0">
        <span className="text-[#0F172A] text-xs font-bold">{lead.name.charAt(0)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[#0F172A] truncate">{lead.name}</p>
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColors[lead.status] || "bg-[#F1F5F9] text-[#64748B]"}`}>{lead.status}</span>
        </div>
        <p className="text-[11px] text-[#94A3B8]">{lead.phone} &middot; {lead.source} &middot; {lead.date}</p>
      </div>
      <button className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8] shrink-0">
        <Phone size={14} />
      </button>
    </div>
  );
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleShare = () => {
    const url = `${window.location.origin}/c/demo`;
    if (navigator.share) { navigator.share({ title: "My Digital Card", url }); }
    else { alert("Link copied: " + url); }
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="space-y-4 pb-4 md:pb-0">

        {/* Welcome Card */}
        <div className="relative bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-2xl p-5 overflow-hidden animate-fade-in-up">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F7B31C]/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-10 w-24 h-24 bg-[#14B8A6]/10 rounded-full blur-xl" />
          <div className="relative">
            <p className="text-[11px] text-[#94A3B8] font-medium">Welcome back</p>
            <h2 className="text-lg font-bold text-white mt-0.5">{user?.fullName?.split(" ")[0] || "User"}</h2>
            <p className="text-xs text-[#94A3B8] mt-1">Your card has 413 views this week</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => navigate("/dashboard/builder")} className="h-9 px-4 gradient-gold text-[#0F172A] font-semibold rounded-xl text-xs flex items-center gap-1.5 active:scale-[0.96] transition-transform">
                <Plus size={14} /> Create Card
              </button>
              <button onClick={handleShare} className="h-9 px-4 bg-white/10 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 active:scale-[0.96] transition-transform backdrop-blur-sm">
                <Share2 size={14} /> Share
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-3">
            <div className="flex items-center justify-around">
              <QuickAction icon={Eye} label="Preview" onClick={() => navigate("/c/demo")} color="bg-[#0F172A]" />
              <QuickAction icon={Share2} label="Share" onClick={handleShare} color="bg-[#14B8A6]" />
              <QuickAction icon={QrCode} label="QR Code" onClick={() => navigate("/dashboard/qr")} color="bg-[#8B5CF6]" />
              <QuickAction icon={Sparkles} label="AI Tools" onClick={() => navigate("/dashboard/settings")} color="bg-[#EC4899]" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {loading ? <SkeletonStats /> : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Card Views" value="1,247" icon={Eye} color="bg-[#FEF3C7] text-[#92400E]" delay={0} onClick={() => navigate("/dashboard/analytics")} />
            <StatCard label="Visitors" value="892" icon={UserCheck} color="bg-[#D1FAE5] text-[#065F46]" delay={50} onClick={() => navigate("/dashboard/analytics")} />
            <StatCard label="Clicks" value="346" icon={MousePointer} color="bg-[#DBEAFE] text-[#1E40AF]" delay={100} onClick={() => navigate("/dashboard/analytics")} />
            <StatCard label="Leads" value="28" icon={MessageSquare} color="bg-[#FCE7F3] text-[#9D174D]" delay={150} onClick={() => navigate("/dashboard/leads")} />
          </div>
        )}

        {/* Chart */}
        {loading ? <SkeletonChart /> : (
          <button onClick={() => navigate("/dashboard/analytics")} className="w-full bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] animate-fade-in-up active:scale-[0.98] transition-transform text-left" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A]">Views This Week</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <TrendingUp size={12} className="text-emerald-500" />
                  <span className="text-[10px] text-emerald-500 font-medium">+24% vs last week</span>
                </div>
              </div>
              <span className="text-lg font-bold text-[#0F172A]">413</span>
            </div>
            <div className="h-44 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mobileGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F7B31C" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F7B31C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "11px" }} />
                  <Area type="monotone" dataKey="views" stroke="#F7B31C" strokeWidth={2.5} fill="url(#mobileGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </button>
        )}

        {/* My Card Preview */}
        <div className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-[#0F172A]">My Digital Card</h2>
            <button onClick={() => navigate("/dashboard/builder")} className="text-[10px] font-semibold text-[#F7B31C]">Edit</button>
          </div>
          <button onClick={() => navigate("/c/demo")} className="w-full bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] active:scale-[0.98] transition-transform text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center shrink-0">
                <span className="text-[#0F172A] text-lg font-bold">S</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Smith Digital Solutions</p>
                <p className="text-[11px] text-[#94A3B8]">John Smith &middot; Founder & CEO</p>
              </div>
              <div className="ml-auto p-2 rounded-xl bg-[#F8FAFC] text-[#64748B]">
                <ExternalLink size={14} />
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { icon: Phone, value: "+91 98765 43210" },
                { icon: Mail, value: "john@smith.com" },
                { icon: Globe, value: "www.smith.com" },
                { icon: MapPin, value: "Mumbai, India" },
              ].map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 p-2 rounded-xl bg-[#F8FAFC]">
                  <div className="w-8 h-8 rounded-lg bg-[#F7B31C] flex items-center justify-center">
                    <item.icon size={12} className="text-white" />
                  </div>
                  <span className="text-[8px] text-[#94A3B8] text-center leading-tight truncate w-full">{item.value}</span>
                </div>
              ))}
            </div>
          </button>
        </div>

        {/* Recent Leads */}
        <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-[#0F172A]">Recent Leads</h2>
            <button onClick={() => navigate("/dashboard/leads")} className="text-[10px] font-semibold text-[#F7B31C] flex items-center gap-0.5">View All <ChevronRight size={12} /></button>
          </div>
          {loading ? (
            <div className="space-y-2"><SkeletonCard /><SkeletonCard /></div>
          ) : (
            <div className="space-y-2">
              {RECENT_LEADS.map((lead, i) => (
                <LeadCard key={lead.id} lead={lead} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Subscription Banner */}
        <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FEF9C3] rounded-2xl p-4 border border-[#FDE68A] animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F7B31C] flex items-center justify-center shrink-0">
              <Zap size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#0F172A]">Starter Plan Active</p>
              <p className="text-[10px] text-[#92400E] mt-0.5">Renews on Jan 15, 2027</p>
            </div>
            <button onClick={() => navigate("/pricing")} className="h-8 px-3 bg-[#0F172A] text-white rounded-xl text-[10px] font-semibold active:scale-[0.96] transition-transform">
              Upgrade
            </button>
          </div>
        </div>

        {/* Bottom Spacer for Bottom Nav */}
        <div className="h-4" />
      </div>
    </ResponsiveDashboardLayout>
  );
}
