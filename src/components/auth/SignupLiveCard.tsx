import { Phone, Mail, Globe, MessageCircle, Share2, UserPlus } from "lucide-react";

/* The signup page's live card: it builds itself from what the visitor types
   (name, business, mobile, email, colour, card link) so they see the product
   while they sign up, instead of a form with a picture beside it.

   Until something is typed each line shows a neutral placeholder — never a
   sample person or business: resellers sell this platform under their own
   names and don't want anyone else's brand on it. */

export type LiveCardData = {
  name: string;
  business: string;
  phone: string;   // already formatted for display, or ""
  email: string;
  slug: string;    // "" while unknown
  color: string;   // hex accent
};

/* Dark text on light accents (gold, sky), white on dark ones — so a customer
   picking any colour still gets a readable header. */
export function readableOn(hex: string): string {
  const h = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return "#0F172A";
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#0F172A" : "#FFFFFF";
}

function initials(name: string, business: string): string {
  const src = (name || business).trim();
  if (!src) return "";
  const parts = src.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

const ghost = "text-[#CBD5E1]";

export default function SignupLiveCard({ data, compact = false }: { data: LiveCardData; compact?: boolean }) {
  const ink = readableOn(data.color);
  const ini = initials(data.name, data.business);
  const link = `digitalcarda.in/${data.slug || "your-business"}`;

  if (compact) {
    return (
      <div aria-hidden="true" className="rounded-2xl bg-white/95 shadow-[0_18px_40px_-20px_rgba(2,6,23,0.6)] ring-1 ring-white/20 p-3 flex items-center gap-3">
        <span
          className="w-12 h-12 rounded-xl flex items-center justify-center text-[15px] font-extrabold shrink-0 transition-colors duration-300"
          style={{ background: data.color, color: ink }}
        >
          {ini || <UserPlus size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[14px] font-bold leading-tight truncate ${data.name ? "text-[#0F172A]" : ghost}`}>{data.name || "Your Name"}</p>
          <p className={`text-[11.5px] leading-tight truncate mt-0.5 ${data.business ? "text-[#475569]" : ghost}`}>{data.business || "Your Business"}</p>
          <p className="text-[11px] leading-tight truncate mt-1 flex items-center gap-1 text-[#64748B]">
            <Globe size={11} className="shrink-0" style={{ color: data.color }} />
            <span className="truncate">{link}</span>
          </p>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#16A34A] bg-[#DCFCE7] rounded-full px-2 py-1 shrink-0 self-start">Live</span>
      </div>
    );
  }

  const rows = [
    { icon: Phone, value: data.phone, ph: "+91 XXXXX XXXXX" },
    { icon: Mail, value: data.email, ph: "you@yourbusiness.in" },
    { icon: Globe, value: data.slug ? link : "", ph: link },
  ];

  return (
    <div aria-hidden="true" className="w-[290px] rounded-[30px] bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.65)] ring-1 ring-black/5 overflow-hidden">
      <div className="relative h-[104px] transition-colors duration-300" style={{ background: data.color }}>
        <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: `radial-gradient(${ink} 1px, transparent 1px)`, backgroundSize: "14px 14px" }} />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
          <span className="text-[9.5px] font-bold text-[#0F172A] uppercase tracking-wider">Live preview</span>
        </div>
        <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
          <Share2 size={13} className="text-[#0F172A]" />
        </span>
      </div>

      <div className="relative z-10 -mt-11 flex flex-col items-center px-5 text-center">
        <span
          className="w-[84px] h-[84px] rounded-[22px] ring-4 ring-white shadow-lg flex items-center justify-center text-[26px] font-extrabold transition-colors duration-300"
          style={{ background: data.color, color: ink }}
        >
          {ini || <UserPlus size={30} />}
        </span>
        <p className={`font-display mt-3 text-[18px] font-extrabold leading-tight tracking-tight break-words max-w-full ${data.name ? "text-[#0F172A]" : ghost}`}>
          {data.name || "Your Name"}
        </p>
        <p className={`mt-1 text-[12.5px] font-medium leading-snug break-words max-w-full ${data.business ? "text-[#475569]" : ghost}`}>
          {data.business || "Your Business"}
        </p>
      </div>

      <div className="px-4 mt-4 space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl bg-[#F8FAFC] px-2.5 py-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300" style={{ background: `${data.color}22`, color: data.color }}>
              <r.icon size={13} />
            </span>
            <span className={`text-[11.5px] truncate ${r.value ? "text-[#334155] font-medium" : ghost}`}>{r.value || r.ph}</span>
          </div>
        ))}
      </div>

      <div className="px-4 mt-3 grid grid-cols-2 gap-2">
        <span className="h-9 rounded-xl flex items-center justify-center gap-1.5 text-[12px] font-bold transition-colors duration-300" style={{ background: data.color, color: ink }}>
          <Phone size={13} /> Call
        </span>
        <span className="h-9 rounded-xl bg-[#22C55E] flex items-center justify-center gap-1.5 text-[12px] font-bold text-white">
          <MessageCircle size={13} /> WhatsApp
        </span>
      </div>
      <div className="px-4 pt-2 pb-5">
        <span className="h-9 rounded-xl border border-[#E2E8F0] flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#334155]">
          <UserPlus size={13} /> Save contact
        </span>
      </div>
    </div>
  );
}
