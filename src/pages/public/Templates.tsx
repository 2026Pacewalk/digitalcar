import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Eye, ArrowRight, Palette, X, Sparkles, Check, Phone, ShoppingBag,
  QrCode, ImageIcon, Star, MessageSquare, Share2, Download, Wallet,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { buildCardThumb, buildCardHtml } from "@/card-template/buildCard";
import { DEFAULT_CUSTOMER } from "@/hooks/useCustomer";

type Preset = { id: number; name: string; style: number; primary: string; secondary: string; active: boolean };

/* Everything every card comes with — shown next to the preview */
const CARD_FEATURES = [
  { icon: Phone, label: "Click-to-call & WhatsApp" },
  { icon: ShoppingBag, label: "Products / Services" },
  { icon: Wallet, label: "Payments & UPI" },
  { icon: QrCode, label: "Payment QR codes" },
  { icon: ImageIcon, label: "Photo & video gallery" },
  { icon: Star, label: "Google reviews" },
  { icon: MessageSquare, label: "Enquiry form" },
  { icon: Share2, label: "Social links" },
  { icon: Download, label: "Save to contacts (vCard)" },
];

/* A polished sample business shown inside every template preview */
const DEMO = {
  ...DEFAULT_CUSTOMER,
  name: "Aarav Sharma", designation: "Founder & CEO", company_name: "Acme Digital",
  mobile1: "+91 98765 43210", email: "hello@acmedigital.example", url: "https://acmedigital.example",
  address: "MG Road, Bengaluru, Karnataka 560001",
  about_us: "Acme Digital is a full-service marketing agency helping brands grow online.",
  facebook: "#", instagram: "#", youtube: "#", linkedin: "#",
};

/* Fixed-width preview that shows the COMPLETE first page (375×560 → scaled to fit) */
const CARD_W = 210, SCALE = CARD_W / 375, CARD_H = Math.round(560 * SCALE);
function Thumb({ style, primary, secondary }: { style: number; primary: string; secondary: string }) {
  const html = useMemo(() => buildCardThumb({ ...DEMO, color: primary, color2: secondary }, style), [style, primary, secondary]);
  return (
    <div className="relative overflow-hidden bg-[#F8FAFC] pointer-events-none" style={{ width: CARD_W, height: CARD_H }}>
      <iframe title={`Style ${style}`} srcDoc={html} scrolling="no" tabIndex={-1} loading="lazy"
        style={{ width: "375px", height: "560px", border: 0, transform: `scale(${SCALE})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}

export default function Templates() {
  const { data } = trpc.template.presets.useQuery();
  const presets = useMemo(() => ((data?.list ?? []) as Preset[]).filter((p) => p.active), [data]);
  const [preview, setPreview] = useState<Preset | null>(null);

  const previewHtml = useMemo(
    () => (preview ? buildCardHtml({ ...DEMO, color: preview.primary, color2: preview.secondary }, [], [], [], [], [], []) : ""),
    [preview]
  );

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4">Templates</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A]">{presets.length || 31} Ready-to-Use Card Designs</h1>
          <p className="mt-4 text-base text-[#64748B]">
            Every design comes with its own colour combination. Pick one, add your details, and publish your digital card in minutes — or fine-tune the colours to match your brand.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">Start free <ArrowRight size={16} /></Link>
            <Link to="/pricing" className="btn-ghost h-12 px-8 inline-flex items-center justify-center gap-2 border border-[#E2E8F0]">View pricing</Link>
          </div>
        </div>

        {/* Grid */}
        {presets.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-premium border border-[#F1F5F9] text-center">
            <Palette size={32} className="text-[#CBD5E1] mx-auto mb-3" />
            <p className="text-sm text-[#94A3B8]">Loading templates…</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {presets.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden group card-hover" style={{ width: CARD_W }}>
                <div className="relative">
                  <Thumb style={p.style} primary={p.primary} secondary={p.secondary} />
                  <div className="absolute inset-0 bg-[#0F172A]/0 group-hover:bg-[#0F172A]/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                    <button onClick={() => setPreview(p)} className="h-9 px-4 bg-white text-[#0F172A] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg hover:scale-105 transition-transform"><Eye size={14} /> Preview</button>
                  </div>
                </div>
                <div className="p-3 border-t border-[#F1F5F9]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ background: p.primary }} />
                    <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ background: p.secondary }} />
                    <h3 className="text-[13px] font-semibold text-[#0F172A] truncate">{p.name}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-10 sm:p-14">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#F7B31C] mb-3"><Sparkles size={13} /> AI powered</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Can&apos;t find the perfect template?</h2>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-lg mx-auto">Let our AI Card Generator build a custom card tailored to your business and industry.</p>
          <Link to="/ai-card-generator" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">Try AI Card Generator <ArrowRight size={16} /></Link>
        </div>
      </div>

      {/* Preview modal — phone mockup + features */}
      {preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-[#0F172A]/75 backdrop-blur-sm" onClick={() => setPreview(null)} />
          <div className="relative z-10 w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-8">
            <button onClick={() => setPreview(null)} className="absolute top-4 right-4 z-20 w-9 h-9 rounded-xl bg-[#0F172A]/5 hover:bg-[#0F172A]/10 text-[#0F172A] flex items-center justify-center"><X size={18} /></button>
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Phone mockup */}
              <div className="bg-gradient-to-br from-[#0F172A] via-[#172033] to-[#1E293B] p-6 sm:p-8 flex justify-center relative overflow-hidden">
                <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-[#F7B31C]/20 blur-3xl pointer-events-none" />
                {/* Samsung Galaxy Note mockup */}
                <div className="relative w-[236px] shrink-0" style={{ height: "500px" }}>
                  {/* side buttons */}
                  <div className="absolute -right-[2px] top-28 w-[3px] h-9 rounded-r-sm bg-[#2a2f3a]" />
                  <div className="absolute -right-[2px] top-44 w-[3px] h-14 rounded-r-sm bg-[#2a2f3a]" />
                  <div className="absolute -left-[2px] top-40 w-[3px] h-11 rounded-l-sm bg-[#2a2f3a]" />
                  {/* body — slim symmetric bezel, softly squared corners */}
                  <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-[#20242e] to-[#0a0c11] p-[5px] shadow-2xl ring-1 ring-white/10">
                    <div className="relative w-full h-full rounded-[1.7rem] overflow-hidden bg-white ring-1 ring-black/50">
                      {/* Infinity-O centre punch-hole camera */}
                      <div className="absolute top-[7px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#05070b] z-20 ring-[1.5px] ring-[#11141b] shadow-inner" />
                      <iframe title={preview.name} srcDoc={previewHtml} style={{ width: "375px", height: "780px", border: 0, transform: "scale(0.6)", transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preview.primary }} />
                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preview.secondary }} />
                  <h3 className="text-xl font-bold text-[#0F172A]">{preview.name}</h3>
                </div>
                <p className="text-[13px] text-[#64748B] mb-5">A one-page digital card with its own colour combination — packed with everything you need to convert visitors.</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2.5">What's included</p>
                <div className="grid grid-cols-1 gap-2 mb-6">
                  {CARD_FEATURES.map((f) => (
                    <div key={f.label} className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0"><f.icon size={14} className="text-[#D97706]" /></span>
                      <span className="text-[13px] text-[#334155] font-medium">{f.label}</span>
                      <Check size={14} className="text-emerald-500 ml-auto shrink-0" />
                    </div>
                  ))}
                </div>
                <Link to="/signup" className="btn-gold h-12 w-full inline-flex items-center justify-center gap-2">Use this template <ArrowRight size={16} /></Link>
                <p className="text-[11px] text-[#94A3B8] text-center mt-2">Free 7-day trial · no card required</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
