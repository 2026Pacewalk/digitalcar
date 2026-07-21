import { Link } from "react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  CreditCard, Eye, Share2, Phone, Globe, Mail, MessageCircle, Star,
} from "lucide-react";

export default function AuthBrandPanel({
  heading,
  subtitle,
  footer,
}: {
  heading: string;
  subtitle: string;
  footer?: ReactNode;
}) {
  const [logoOk, setLogoOk] = useState(true);

  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] items-center justify-center p-12">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-grid-dark opacity-40" />
      <div className="absolute top-0 right-0 w-[440px] h-[440px] bg-[#F7B31C]/12 rounded-full blur-3xl -translate-y-1/4 translate-x-1/4 animate-aurora-drift" />
      <div className="absolute bottom-0 left-0 w-[380px] h-[380px] bg-[#14B8A6]/10 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4 animate-aurora-drift" style={{ animationDelay: "3s" }} />

      <div className="relative z-10 max-w-md w-full">
        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-3 mb-8" aria-label="DigitalCarda home">
          {logoOk ? (
            <img src="/logo.png" alt="DigitalCarda" className="h-9 w-auto object-contain" onError={() => setLogoOk(false)} />
          ) : (
            <>
              <span className="w-11 h-11 rounded-2xl gradient-gold flex items-center justify-center"><CreditCard size={22} className="text-[#0F172A]" /></span>
              <span className="text-2xl font-bold text-white">Digital<span className="text-gradient-gold">Carda</span></span>
            </>
          )}
        </Link>

        <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight leading-tight">{heading}</h2>
        <p className="text-[#94A3B8] leading-relaxed mb-8">{subtitle}</p>

        {/* Live card mockup */}
        <div className="relative flex justify-center mb-8">
          <div className="relative w-[240px] animate-float">
            <div className="rounded-[22px] bg-white/[0.06] backdrop-blur-sm border border-white/10 shadow-2xl overflow-hidden">
              <div className="bg-[#F7B31C] px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white flex items-center gap-1"><Eye size={11} /> 5,173</span>
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><Share2 size={11} className="text-white" /></span>
              </div>
              <div className="p-4">
                <div className="text-center mb-3">
                  <p className="text-sm font-bold text-white tracking-wide">SHEKHAR JAIN</p>
                  <p className="text-[9px] text-[#F7B31C] font-medium mt-0.5">DIRECTOR · PACEWALK</p>
                </div>
                <div className="space-y-1.5">
                  {[{ i: Phone, t: "+91 99881 44844" }, { i: Globe, t: "pacewalk.com" }, { i: Mail, t: "md@pacewalk.com" }].map((r, k) => (
                    <div key={k} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5">
                      <span className="w-6 h-6 rounded-md bg-[#F7B31C] flex items-center justify-center shrink-0"><r.i size={11} className="text-[#0F172A]" /></span>
                      <span className="text-[10px] text-white/80 truncate">{r.t}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <div className="h-8 rounded-lg bg-[#F7B31C] flex items-center justify-center gap-1"><Phone size={11} className="text-[#0F172A]" /><span className="text-[10px] font-bold text-[#0F172A]">Call</span></div>
                  <div className="h-8 rounded-lg bg-[#22C55E] flex items-center justify-center gap-1"><MessageCircle size={11} className="text-white" /><span className="text-[10px] font-bold text-white">Chat</span></div>
                </div>
              </div>
            </div>

            {/* Floating chips */}
            <div className="absolute -left-6 top-10 bg-white rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-1.5 animate-float" style={{ animationDelay: "0.6s" }}>
              <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
              <span className="text-[10px] font-bold text-[#0F172A]">QR +128</span>
            </div>
            <div className="absolute -right-5 bottom-14 bg-white rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-1.5 animate-float" style={{ animationDelay: "1.4s" }}>
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              <span className="text-[10px] font-bold text-[#0F172A]">New lead</span>
            </div>
          </div>
        </div>

        {/* Trust */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {["#F7B31C", "#14B8A6", "#8B5CF6", "#3B82F6"].map((c, i) => (
              <span key={i} className="w-8 h-8 rounded-full ring-2 ring-[#1E293B] flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c }}>{["A", "B", "E", "S"][i]}</span>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} size={11} className="fill-[#F7B31C] text-[#F7B31C]" />)}
              <span className="ml-1 text-[11px] font-bold text-white">4.9</span>
            </div>
            <p className="text-[11px] text-[#94A3B8]">Trusted by <span className="text-white font-semibold">1,456+</span> businesses</p>
          </div>
        </div>

        {footer && <div className="mt-8 pt-6 border-t border-white/10">{footer}</div>}
      </div>
    </div>
  );
}
