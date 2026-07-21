import { useState, useRef } from "react";
import {
  Phone, MessageCircle, Mail, MapPin, Globe, Star, QrCode,
  Building2, Scissors, Sparkles, Home, ShoppingBag, Calendar,
  GraduationCap, Briefcase, Camera, UtensilsCrossed, Wifi,
  Stethoscope, Check, Clock, ChevronLeft, ChevronRight, Heart,
  Facebook, Instagram, Youtube, Twitter, Linkedin,
} from "lucide-react";

/* ─── Social Bar ─── */
function SocialBar({ variant = "gold" }: { variant?: string }) {
  const icons = [Facebook, Instagram, Youtube, Twitter, Linkedin];
  const bg = variant === "dark" ? "bg-[#0F172A]" : "bg-[#F7B31C]";
  return (
    <div className="flex justify-center gap-2 mt-3">
      {icons.map((Icon, i) => (
        <span key={i} className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center cursor-pointer hover:scale-110 transition-transform`}>
          <Icon size={11} className={variant === "dark" ? "text-[#F7B31C]" : "text-white"} />
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   12 TEMPLATE DESIGNS
   ═══════════════════════════════════════ */

function CorporateCard() {
  return (
    <div className="w-full bg-white rounded-[24px] shadow-premium-lg overflow-hidden border border-[#E2E8F0]">
      <div className="bg-[#0F172A] px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#F7B31C] flex items-center justify-center"><Building2 size={18} className="text-[#0F172A]" /></div>
            <div><p className="text-sm font-bold text-white">VERTEX CORP</p><p className="text-[9px] text-[#94A3B8]">Global Consulting</p></div>
          </div>
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-semibold rounded-full">Open</span>
        </div>
        <SocialBar />
      </div>
      <div className="px-5 py-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-[#0F172A] flex items-center justify-center mx-auto mb-3 border-4 border-[#F7B31C]">
            <span className="text-xl font-bold text-[#F7B31C]">AK</span>
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">Ankit Khurana</h3>
          <p className="text-xs text-[#64748B]">Managing Director</p>
        </div>
        <div className="mt-4 space-y-2">
          {[
            { i: Phone, t: "+91 98100 11223", c: "text-emerald-600" },
            { i: Mail, t: "ceo@vertexcorp.com", c: "text-blue-600" },
            { i: Globe, t: "www.vertexcorp.com", c: "text-purple-600" },
            { i: MapPin, t: "BKC, Mumbai, Maharashtra", c: "text-red-500" },
          ].map((row, j) => (
            <div key={j} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAFC]">
              <row.i size={14} className={row.c} /><span className="text-xs text-[#64748B]">{row.t}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="h-9 bg-[#0F172A] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"><Phone size={12} /> Call Now</button>
          <button className="h-9 bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"><MessageCircle size={12} /> WhatsApp</button>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-[#FEF3C7]">
          <p className="text-[10px] text-[#92400E] font-medium text-center">Corporate advisory, M&amp;A, Strategy &amp; Risk Consulting</p>
        </div>
      </div>
    </div>
  );
}

function FreelancerCard() {
  return (
    <div className="w-full bg-gradient-to-b from-[#1E1B4B] to-[#312E81] rounded-[24px] shadow-premium-lg overflow-hidden border border-indigo-500/20">
      <div className="px-5 pt-6 pb-4 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#F7B31C] to-[#D97706] flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Camera size={32} className="text-white" />
        </div>
        <h3 className="text-lg font-bold text-white">Neha Gupta</h3>
        <p className="text-xs text-indigo-300">UI/UX Designer &amp; Brand Strategist</p>
        <SocialBar variant="dark" />
      </div>
      <div className="px-5 pb-5 space-y-3">
        {[
          { i: Phone, t: "+91 98765 12345" },
          { i: Mail, t: "hello@nehagupta.design" },
          { i: Globe, t: "behance.net/nehagupta" },
          { i: MapPin, t: "Indiranagar, Bangalore" },
        ].map((row, j) => (
          <div key={j} className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <row.i size={14} className="text-[#F7B31C]" /><span className="text-xs text-indigo-200 flex-1">{row.t}</span>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {["Brand Identity", "Web Design", "Mobile Apps"].map((s, i) => (
            <span key={i} className="text-center py-1.5 rounded-lg bg-white/10 text-[9px] font-medium text-indigo-200">{s}</span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button className="h-10 bg-[#F7B31C] text-[#0F172A] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"><MessageCircle size={14} /> WhatsApp</button>
          <button className="h-10 bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"><Globe size={14} /> Portfolio</button>
        </div>
      </div>
    </div>
  );
}

function DoctorCard() {
  return (
    <div className="w-full bg-white rounded-[24px] shadow-premium-lg overflow-hidden border border-[#E2E8F0]">
      <div className="h-20 bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] relative">
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-16 h-16 rounded-full bg-white p-1 shadow-lg">
            <div className="w-full h-full rounded-full bg-[#0C4A6E] flex items-center justify-center">
              <Stethoscope size={22} className="text-white" />
            </div>
          </div>
        </div>
      </div>
      <div className="pt-10 pb-5 px-5 text-center">
        <h3 className="text-base font-bold text-[#0C4A6E]">Dr. Priya Patel</h3>
        <p className="text-xs text-[#64748B]">MD (Cardiology) · 15 Years Exp.</p>
        <div className="flex justify-center gap-1 mt-2">
          {[1,2,3,4,5].map((s) => <Star key={s} size={12} className="text-[#F7B31C] fill-[#F7B31C]" />)}
          <span className="text-[10px] text-[#64748B] ml-1">(324 reviews)</span>
        </div>
        <div className="mt-4 space-y-2 text-left">
          {[
            { i: Clock, t: "Mon-Sat: 9:00 AM - 7:00 PM" },
            { i: Phone, t: "+91 98250 33445" },
            { i: MapPin, t: "Apollo Hospital, Jubilee Hills, Hyderabad" },
          ].map((row, j) => (
            <div key={j} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F0F9FF]">
              <row.i size={14} className="text-[#0369A1]" /><span className="text-xs text-[#64748B]">{row.t}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-xl bg-[#F0F9FF]">
          <p className="text-[10px] text-[#0369A1] font-medium">Cardiology · Echocardiography · Hypertension · Preventive Care</p>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="h-9 bg-[#0C4A6E] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"><Phone size={12} /> Book Appt</button>
          <button className="h-9 bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"><MessageCircle size={12} /> WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

function RealEstateCard() {
  return (
    <div className="w-full bg-white rounded-[24px] shadow-premium-lg overflow-hidden border border-[#E2E8F0]">
      <div className="h-28 bg-gradient-to-br from-[#064E3B] to-[#065F46] relative p-4 flex items-end">
        <div className="absolute bottom-3 right-3 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"><Home size={22} className="text-white" /></div>
        <div><p className="text-sm font-bold text-white">DREAMHOMES</p><p className="text-[9px] text-emerald-300">Premium Properties Since 2008</p></div>
      </div>
      <div className="px-5 -mt-6 relative z-10 flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-[#064E3B] flex items-center justify-center border-3 border-white shadow-lg"><span className="text-white font-bold text-sm">AK</span></div>
        <div><h3 className="text-sm font-bold text-[#0F172A]">Amit Khanna</h3><p className="text-[10px] text-[#64748B]">Senior Property Consultant</p></div>
      </div>
      <div className="px-5 py-4 space-y-2">
        {[
          { i: Phone, t: "+91 98102 33445", c: "text-emerald-600" },
          { i: Mail, t: "amit@dreamhomes.in", c: "text-blue-600" },
          { i: Globe, t: "www.dreamhomes.in", c: "text-purple-600" },
          { i: MapPin, t: "Sector 62, Gurugram, Haryana", c: "text-red-500" },
        ].map((row, j) => (
          <div key={j} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#ECFDF5]">
            <row.i size={14} className={row.c} /><span className="text-xs text-[#64748B]">{row.t}</span>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {["Luxury Villas", "Commercial", "Apartments", "Plots"].map((t, i) => (
            <div key={i} className="flex items-center gap-1.5 p-2 rounded-lg bg-[#ECFDF5]"><Check size={11} className="text-emerald-600" /><span className="text-[10px] text-[#64748B]">{t}</span></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="h-9 bg-[#064E3B] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><Phone size={12} /> Call</button>
          <button className="h-9 bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><MessageCircle size={12} /> WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

function AgencyCard() {
  return (
    <div className="w-full bg-gradient-to-b from-[#0F172A] to-[#1E293B] rounded-[24px] shadow-premium-lg overflow-hidden border border-[#334155]">
      <div className="px-5 pt-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F7B31C] to-[#D97706] flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Sparkles size={28} className="text-[#0F172A]" />
        </div>
        <h3 className="text-lg font-bold text-white">PIXELCRAFT</h3>
        <p className="text-xs text-[#94A3B8]">Digital Marketing Agency</p>
        <SocialBar />
      </div>
      <div className="px-5 py-4">
        <div className="relative bg-[#F7B31C] py-3 px-4 text-center" style={{ clipPath: "polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)" }}>
          <p className="text-sm font-bold text-[#0F172A]">RAJ SHARMA</p>
          <p className="text-[10px] text-[#0F172A]/70 font-semibold">FOUNDER &amp; CEO</p>
        </div>
        <div className="mt-4 space-y-2">
          {[
            { i: Phone, t: "+91 99881 44844" },
            { i: Globe, t: "https://pixelcraft.in" },
            { i: Mail, t: "hello@pixelcraft.in" },
            { i: MapPin, t: "SCO-209, Zirakpur, Punjab" },
          ].map((row, j) => (
            <div key={j} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#374151]">
              <div className="w-7 h-7 rounded-lg bg-[#F7B31C] flex items-center justify-center shrink-0"><row.i size={12} className="text-white" /></div>
              <span className="text-xs text-white/80">{row.t}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-0 mt-4 rounded-xl overflow-hidden">
          <button className="h-10 bg-[#F7B31C] flex items-center justify-center gap-2 hover:bg-[#D97706] transition-colors"><Phone size={14} className="text-white" /><span className="text-xs font-bold text-white">CALL</span></button>
          <button className="h-10 bg-[#F7B31C] flex items-center justify-center gap-2 border-l border-white/20 hover:bg-[#D97706] transition-colors"><MessageCircle size={14} className="text-white" /><span className="text-xs font-bold text-white">WHATSAPP</span></button>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-[#334155]">
          <p className="text-[10px] text-[#94A3B8] font-medium text-center">SEO · PPC · Social Media · Web Development · Branding</p>
        </div>
      </div>
    </div>
  );
}

function RetailCard() {
  return (
    <div className="w-full bg-white rounded-[24px] shadow-premium-lg overflow-hidden border border-[#E2E8F0]">
      <div className="h-24 bg-gradient-to-br from-[#9A3412] to-[#C2410C] p-4 flex items-end">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center"><ShoppingBag size={22} className="text-[#C2410C]" /></div>
          <div><p className="text-sm font-bold text-white">STYLEHUB</p><p className="text-[9px] text-orange-200">Fashion &amp; Lifestyle</p></div>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-[#C2410C] flex items-center justify-center"><span className="text-white font-bold text-sm">VM</span></div>
          <div><h3 className="text-sm font-bold text-[#0F172A]">Vikram Mehta</h3><p className="text-[10px] text-[#64748B]">Store Owner</p></div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {["Menswear", "Womenswear", "Accessories"].map((c, i) => (
            <div key={i} className="text-center p-2 rounded-xl bg-[#FFF7ED]"><ShoppingBag size={14} className="text-[#C2410C] mx-auto mb-1" /><span className="text-[8px] font-medium text-[#0F172A]">{c}</span></div>
          ))}
        </div>
        <div className="space-y-2">
          {[
            { i: Phone, t: "+91 98111 22333" },
            { i: MapPin, t: "Linking Road, Bandra West, Mumbai" },
            { i: Clock, t: "10:00 AM - 10:00 PM" },
          ].map((row, j) => (
            <div key={j} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FFF7ED]"><row.i size={14} className="text-[#C2410C]" /><span className="text-xs text-[#64748B]">{row.t}</span></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="h-9 bg-[#C2410C] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><Phone size={12} /> Call</button>
          <button className="h-9 bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><MessageCircle size={12} /> WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

function SalonCard() {
  return (
    <div className="w-full bg-gradient-to-b from-[#831843] to-[#BE185D] rounded-[24px] shadow-premium-lg overflow-hidden">
      <div className="px-5 pt-6 text-center">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-lg"><Scissors size={26} className="text-[#BE185D]" /></div>
        <h3 className="text-lg font-bold text-white">GLAM STUDIO</h3>
        <p className="text-xs text-pink-200">Salon &amp; Spa</p>
        <div className="flex justify-center gap-1 mt-2">
          {[1,2,3,4,5].map((s) => <Star key={s} size={10} className="text-[#F7B31C] fill-[#F7B31C]" />)}
        </div>
      </div>
      <div className="px-5 py-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {["Haircut", "Facial", "Makeup", "Nails", "Spa", "Bridal"].map((s, i) => (
            <div key={i} className="p-2 rounded-xl bg-white/10 text-center"><span className="text-[9px] font-medium text-white">{s}</span></div>
          ))}
        </div>
        <div className="mt-2 space-y-2">
          {[
            { i: Phone, t: "+91 98765 99888" },
            { i: MapPin, t: "Koramangala, Bangalore" },
            { i: Clock, t: "10:00 AM - 8:00 PM" },
          ].map((row, j) => (
            <div key={j} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/10"><row.i size={14} className="text-pink-200" /><span className="text-xs text-pink-100">{row.t}</span></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="h-10 bg-white text-[#BE185D] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"><Phone size={14} /> Book Now</button>
          <button className="h-10 bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"><MessageCircle size={14} /> WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

function RestaurantCard() {
  return (
    <div className="w-full bg-white rounded-[24px] shadow-premium-lg overflow-hidden border border-[#E2E8F0]">
      <div className="h-28 bg-gradient-to-br from-[#713F12] to-[#A16207] p-4 flex items-end relative">
        <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-500 rounded-lg"><span className="text-[9px] font-bold text-white">OPEN NOW</span></div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center"><UtensilsCrossed size={22} className="text-[#A16207]" /></div>
          <div><p className="text-sm font-bold text-white">SPICE GARDEN</p><p className="text-[9px] text-amber-200">Multi-Cuisine Restaurant</p></div>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-[#A16207] flex items-center justify-center"><span className="text-white font-bold text-sm">CS</span></div>
          <div><h3 className="text-sm font-bold text-[#0F172A]">Chef Sanjay</h3><p className="text-[10px] text-[#64748B]">Head Chef &amp; Owner</p></div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {["North Indian", "Chinese", "Continental", "Biryani"].map((c, i) => (
            <div key={i} className="text-center p-1.5 rounded-lg bg-[#FEF3C7]"><span className="text-[8px] font-medium text-[#92400E]">{c}</span></div>
          ))}
        </div>
        {[
          { i: Phone, t: "+91 98123 44556" },
          { i: MapPin, t: "Connaught Place, New Delhi" },
          { i: Clock, t: "11:00 AM - 11:00 PM" },
        ].map((row, j) => (
          <div key={j} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FEF3C7] mb-2"><row.i size={14} className="text-[#A16207]" /><span className="text-xs text-[#64748B]">{row.t}</span></div>
        ))}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <button className="h-9 bg-[#A16207] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><Phone size={11} /> Call</button>
          <button className="h-9 bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><MessageCircle size={11} /> Order</button>
          <button className="h-9 bg-[#F7B31C] text-[#0F172A] rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><QrCode size={11} /> Menu</button>
        </div>
      </div>
    </div>
  );
}

function ConsultantCard() {
  return (
    <div className="w-full bg-white rounded-[24px] shadow-premium-lg overflow-hidden border-2 border-[#164E63]">
      <div className="bg-[#164E63] px-5 py-4 text-center">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-2"><Briefcase size={24} className="text-[#164E63]" /></div>
        <h3 className="text-base font-bold text-white">Dr. Anjali Rao</h3>
        <p className="text-xs text-sky-200">Business Strategist &amp; Coach</p>
      </div>
      <div className="px-5 py-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {["Strategy", "Leadership", "Finance", "Operations", "Growth", "Training"].map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 p-2 rounded-lg bg-[#F0F9FF]"><Check size={11} className="text-[#164E63]" /><span className="text-[10px] text-[#0F172A] font-medium">{s}</span></div>
          ))}
        </div>
        <div className="mt-2 space-y-2">
          {[
            { i: Phone, t: "+91 98450 66778" },
            { i: Mail, t: "anjali@strategyfirst.com" },
            { i: Globe, t: "www.strategyfirst.com" },
          ].map((row, j) => (
            <div key={j} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F0F9FF]"><row.i size={14} className="text-[#164E63]" /><span className="text-xs text-[#64748B]">{row.t}</span></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="h-9 bg-[#164E63] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><Phone size={12} /> Book Session</button>
          <button className="h-9 bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><MessageCircle size={12} /> WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

function EducationCard() {
  return (
    <div className="w-full bg-white rounded-[24px] shadow-premium-lg overflow-hidden border border-[#E2E8F0]">
      <div className="h-20 bg-gradient-to-r from-[#365314] to-[#4D7C0F] flex items-center px-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center"><GraduationCap size={20} className="text-[#4D7C0F]" /></div>
          <div><p className="text-sm font-bold text-white">EDUQUEST</p><p className="text-[9px] text-lime-200">Learning Center</p></div>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-[#4D7C0F] flex items-center justify-center"><span className="text-white font-bold text-sm">PK</span></div>
          <div><h3 className="text-sm font-bold text-[#0F172A]">Prof. Kumar</h3><p className="text-[10px] text-[#64748B]">Director</p></div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {["JEE", "NEET", "UPSC", "Banking", "CA/CS", "English"].map((c, i) => (
            <div key={i} className="text-center py-1.5 rounded-lg bg-[#F7FEE7]"><span className="text-[9px] font-medium text-[#365314]">{c}</span></div>
          ))}
        </div>
        {[
          { i: Phone, t: "+91 98140 55667" },
          { i: MapPin, t: "Lakshmi Nagar, New Delhi" },
          { i: Clock, t: "7:00 AM - 8:00 PM" },
        ].map((row, j) => (
          <div key={j} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F7FEE7] mb-2"><row.i size={14} className="text-[#4D7C0F]" /><span className="text-xs text-[#64748B]">{row.t}</span></div>
        ))}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button className="h-9 bg-[#4D7C0F] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><Phone size={12} /> Enquire</button>
          <button className="h-9 bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><MessageCircle size={12} /> WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

function EventPlannerCard() {
  return (
    <div className="w-full bg-gradient-to-b from-[#581C87] to-[#7E22CE] rounded-[24px] shadow-premium-lg overflow-hidden">
      <div className="px-5 pt-6 text-center">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-lg"><Calendar size={26} className="text-[#7E22CE]" /></div>
        <h3 className="text-lg font-bold text-white">ROYALE EVENTS</h3>
        <p className="text-xs text-purple-200">Wedding &amp; Corporate Planner</p>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center"><span className="text-[#7E22CE] font-bold text-sm">SR</span></div>
          <div><h3 className="text-sm font-bold text-white">Sneha Reddy</h3><p className="text-[10px] text-purple-200">Founder &amp; Creative Head</p></div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {["Weddings", "Corporate", "Birthdays", "Destination", "Engagement", "Baby Shower"].map((e, i) => (
            <div key={i} className="text-center p-1.5 rounded-lg bg-white/10"><span className="text-[8px] font-medium text-white">{e}</span></div>
          ))}
        </div>
        <div className="space-y-2">
          {[
            { i: Phone, t: "+91 99662 77889" },
            { i: MapPin, t: "Jubilee Hills, Hyderabad" },
            { i: Globe, t: "www.royaleevents.in" },
          ].map((row, j) => (
            <div key={j} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/10"><row.i size={14} className="text-purple-200" /><span className="text-xs text-purple-100">{row.t}</span></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="h-10 bg-white text-[#7E22CE] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"><Phone size={14} /> Book Now</button>
          <button className="h-10 bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"><MessageCircle size={14} /> WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

function ServiceBusinessCard() {
  return (
    <div className="w-full bg-white rounded-[24px] shadow-premium-lg overflow-hidden border border-[#E2E8F0]">
      <div className="h-20 bg-gradient-to-r from-[#1E3A5F] to-[#2D5A8E] flex items-center px-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center"><Wifi size={20} className="text-[#2D5A8E]" /></div>
          <div><p className="text-sm font-bold text-white">QUICKFIX</p><p className="text-[9px] text-blue-200">Home Services</p></div>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-[#2D5A8E] flex items-center justify-center"><span className="text-white font-bold text-sm">RK</span></div>
          <div><h3 className="text-sm font-bold text-[#0F172A]">Rahul Kumar</h3><p className="text-[10px] text-[#64748B]">Service Manager</p></div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {["AC Repair", "Plumbing", "Electrical", "Carpentry", "Painting", "Cleaning"].map((s, i) => (
            <div key={i} className="text-center p-1.5 rounded-lg bg-[#EFF6FF]"><span className="text-[8px] font-medium text-[#1E3A5F]">{s}</span></div>
          ))}
        </div>
        <div className="p-3 rounded-xl bg-[#EFF6FF] mb-3">
          <div className="flex items-center gap-2 mb-1"><Check size={12} className="text-emerald-500" /><span className="text-[10px] text-[#0F172A] font-medium">Same Day Service</span></div>
          <div className="flex items-center gap-2 mb-1"><Check size={12} className="text-emerald-500" /><span className="text-[10px] text-[#0F172A] font-medium">Verified Professionals</span></div>
          <div className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /><span className="text-[10px] text-[#0F172A] font-medium">Warranty on Repairs</span></div>
        </div>
        {[
          { i: Phone, t: "+91 98150 22334" },
          { i: MapPin, t: "Whitefield, Bangalore" },
          { i: Clock, t: "8:00 AM - 9:00 PM" },
        ].map((row, j) => (
          <div key={j} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#EFF6FF] mb-2"><row.i size={14} className="text-[#2D5A8E]" /><span className="text-xs text-[#64748B]">{row.t}</span></div>
        ))}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button className="h-9 bg-[#2D5A8E] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><Phone size={12} /> Book Service</button>
          <button className="h-9 bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><MessageCircle size={12} /> WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Card Data
   ═══════════════════════════════════════ */

const cards = [
  { name: "Corporate", Card: CorporateCard, color: "bg-[#0F172A]", textColor: "text-white", desc: "Navy gold, CEO profile, M&A consulting" },
  { name: "Freelancer", Card: FreelancerCard, color: "bg-[#1E1B4B]", textColor: "text-white", desc: "Indigo gradient, portfolio link, skill tags" },
  { name: "Doctor", Card: DoctorCard, color: "bg-[#0C4A6E]", textColor: "text-white", desc: "Medical blue, 5-star reviews, clinic hours" },
  { name: "Real Estate", Card: RealEstateCard, color: "bg-[#064E3B]", textColor: "text-white", desc: "Emerald green, property types, locations" },
  { name: "Digital Agency", Card: AgencyCard, color: "bg-[#0F172A]", textColor: "text-white", desc: "Gold trapezoid, dark rows, social icons" },
  { name: "Retail Store", Card: RetailCard, color: "bg-[#C2410C]", textColor: "text-white", desc: "Orange theme, product categories" },
  { name: "Salon & Beauty", Card: SalonCard, color: "bg-[#BE185D]", textColor: "text-white", desc: "Pink gradient, 6 beauty services" },
  { name: "Restaurant", Card: RestaurantCard, color: "bg-[#A16207]", textColor: "text-white", desc: "Amber theme, cuisine tags, menu QR" },
  { name: "Consultant", Card: ConsultantCard, color: "bg-[#164E63]", textColor: "text-white", desc: "Sky blue border, 6 specialty areas" },
  { name: "Education", Card: EducationCard, color: "bg-[#4D7C0F]", textColor: "text-white", desc: "Green theme, 6 exam courses" },
  { name: "Event Planner", Card: EventPlannerCard, color: "bg-[#7E22CE]", textColor: "text-white", desc: "Purple gradient, 6 event types" },
  { name: "Service Business", Card: ServiceBusinessCard, color: "bg-[#2D5A8E]", textColor: "text-white", desc: "Steel blue, 6 home services" },
];

/* ═══════════════════════════════════════
   Main Page
   ═══════════════════════════════════════ */

export default function SampleCards() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = 340 + 24; // card width + gap
    el.scrollBy({ left: dir === "left" ? -cardW : cardW, behavior: "smooth" });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = 340 + 24;
    const idx = Math.round(el.scrollLeft / cardW);
    setActiveIdx(Math.min(Math.max(idx, 0), cards.length - 1));
  };

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4">Sample Cards</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A]">Explore Sample Digital Cards</h1>
          <p className="mt-3 text-sm text-[#94A3B8]">12 unique designs for every business type. Scroll to browse all templates.</p>
        </div>

        {/* Scroll Controls */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => scroll("left")}
            className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] hover:border-[#F7B31C] transition-all shadow-premium"
          >
            <ChevronLeft size={18} className="text-[#64748B]" />
          </button>
          <div className="flex gap-1.5">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  const el = scrollRef.current;
                  if (el) el.scrollTo({ left: i * (340 + 24), behavior: "smooth" });
                }}
                className={`h-2 rounded-full transition-all ${i === activeIdx ? "w-8 bg-[#F7B31C]" : "w-2 bg-[#E2E8F0] hover:bg-[#CBD5E1]"}`}
              />
            ))}
          </div>
          <button
            onClick={() => scroll("right")}
            className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] hover:border-[#F7B31C] transition-all shadow-premium"
          >
            <ChevronRight size={18} className="text-[#64748B]" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 pb-3 mb-4 justify-center flex-wrap">
          {cards.map((cat, i) => (
            <button
              key={i}
              onClick={() => {
                const el = scrollRef.current;
                if (el) el.scrollTo({ left: i * (340 + 24), behavior: "smooth" });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeIdx === i
                  ? `${cat.color} ${cat.textColor} shadow-premium`
                  : "bg-white text-[#64748B] border border-[#E2E8F0] hover:border-[#F7B31C]"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Horizontal Scrolling Cards — Fixed Height */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-6 overflow-x-auto pb-6 pt-2 px-2 snap-x snap-mandatory scrollbar-hide"
        >
          {cards.map((cat, i) => (
            <div
              key={i}
              className="snap-center shrink-0 w-[340px] h-[700px] flex flex-col"
            >
              {/* Category Label */}
              <div className="text-center mb-3 shrink-0">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${cat.color} ${cat.textColor}`}>{cat.name}</span>
                <p className="text-[10px] text-[#94A3B8] mt-1">{cat.desc}</p>
              </div>
              {/* Card — Fixed height with scroll */}
              <div className="flex-1 overflow-y-auto rounded-[24px] scrollbar-hide">
                <cat.Card />
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-10 sm:p-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Create Your Own Digital Card</h2>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-lg mx-auto">Start your 7-day free trial and create a professional digital card for your business.</p>
          <button className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">Start Free Trial <ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}
