import { useState } from "react";
import {
  Phone, MessageCircle, Mail, MapPin, Download, Globe, Eye, Share2, Star,
  Facebook, Twitter, Instagram, Youtube, Linkedin, Play, User, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import type { CustomerRecord } from "@/hooks/useCustomer";

type Product = { id: number; name: string; filename: string; price: string; offer_price: string; description: string; button: string; button_title: string };
type Gallery = { id: number; name: string; filename: string };
type Vid = { id: number; title: string; url: string };

const ytId = (url: string) => (url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/) || [])[1] || "";
const s = (v: unknown) => String(v ?? "").trim();
const on = (v: unknown) => Number(v ?? 1) === 1;

function downloadVCard(c: CustomerRecord) {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${s(c.name)}`, `ORG:${s(c.company_name)}`, `TITLE:${s(c.designation)}`,
    `TEL;TYPE=CELL:${s(c.mobile1)}`, `EMAIL:${s(c.email)}`, `URL:${s(c.url)}`, `ADR:;;${s(c.address)};;;;`, "END:VCARD"];
  const blob = new Blob([lines.join("\n")], { type: "text/vcard" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `${s(c.slug) || "card"}.vcf`; a.click();
}

const SOCIALS = [
  { k: "facebook", icon: Facebook, color: "#1877F2" }, { k: "instagram", icon: Instagram, color: "#E4405F" },
  { k: "twitter", icon: Twitter, color: "#0F172A" }, { k: "youtube", icon: Youtube, color: "#FF0000" },
  { k: "linkedin", icon: Linkedin, color: "#0A66C2" }, { k: "pinterest", icon: Star, color: "#BD081C" },
];

/* Gold section header bar, matching the real card */
function Head({ title, accent }: { title: string; accent: string }) {
  return <div className="text-center py-2.5 rounded-md font-bold text-sm text-white uppercase tracking-wide mb-3" style={{ background: accent }}>{title}</div>;
}
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_10px_1fr] gap-1 py-1.5 border-b border-[#F1F5F9] last:border-0 text-xs">
      <span className="font-semibold text-[#334155]">{label}</span><span className="text-[#94A3B8]">:</span>
      <span className="text-[#475569] break-words">{value}</span>
    </div>
  );
}

export default function CardRenderer({ c, products, gallery, videos }: {
  c: CustomerRecord; products: Product[]; gallery: Gallery[]; videos: Vid[];
}) {
  const accent = s(c.color) || "#F7B31C";
  const [sent, setSent] = useState(false);
  const wa = s(c.mobile2 || c.mobile1).replace(/[^\d]/g, "");
  const specs = s(c.specialities).split(",").map((x) => x.trim()).filter(Boolean);
  const hasSocial = SOCIALS.some((x) => s(c[x.k]));
  const cardUrl = `https://digitalcarda.in/${s(c.slug)}`;
  const upis = [s(c.upi), s(c.paytm_number), s(c.phone_pe), s(c.google_pay)].filter(Boolean);
  const hasBank = s(c.account_number) || s(c.bank_name);

  return (
    <div className="bg-white h-full overflow-y-auto scrollbar-hide" style={{ fontFamily: "'Open Sans', 'Inter', sans-serif" }}>
      {/* Header banner */}
      <div className="relative px-5 pt-4 pb-14 text-white" style={{ background: `linear-gradient(160deg, ${accent}, ${accent}cc)` }}>
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="flex items-center gap-1"><Eye size={12} /> {Number(c.views ?? 0).toLocaleString("en-IN")}</span>
          <button onClick={() => { navigator.clipboard?.writeText(cardUrl); toast.success("Link copied"); }} className="flex items-center gap-1 px-2 h-6 rounded-full bg-white/20"><Share2 size={11} /> Follow Us</button>
        </div>
      </div>

      {/* Profile */}
      <div className="px-5 -mt-10">
        <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
          <div className="w-20 h-20 rounded-2xl mx-auto -mt-14 mb-3 ring-4 ring-white bg-[#F8FAFC] overflow-hidden flex items-center justify-center">
            {s(c.logo) ? <img src={s(c.logo)} alt={s(c.name)} className="w-full h-full object-cover" /> : <User size={30} className="text-[#CBD5E1]" />}
          </div>
          <h2 className="text-lg font-extrabold text-[#0F172A] uppercase">{s(c.name) || "Your Name"}</h2>
          {s(c.designation) && <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>{s(c.designation)}</p>}
          <div className="mt-3 space-y-1.5 text-xs text-[#475569]">
            {s(c.mobile1) && <a href={`tel:${s(c.mobile1)}`} className="flex items-center justify-center gap-1.5"><Phone size={12} style={{ color: accent }} /> {s(c.mobile1)}</a>}
            {s(c.url) && <a href={s(c.url)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5"><Globe size={12} style={{ color: accent }} /> {s(c.url)}</a>}
            {s(c.email) && <a href={`mailto:${s(c.email)}`} className="flex items-center justify-center gap-1.5"><Mail size={12} style={{ color: accent }} /> {s(c.email)}</a>}
            {s(c.address) && <p className="flex items-start justify-center gap-1.5 px-2"><MapPin size={12} className="mt-0.5 shrink-0" style={{ color: accent }} /> {s(c.address)}</p>}
          </div>
        </div>
      </div>

      {/* Call / WhatsApp */}
      <div className="px-5 mt-4 grid grid-cols-2 gap-2">
        {s(c.mobile1) && <a href={`tel:${s(c.mobile1)}`} className="h-11 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2" style={{ background: accent }}><Phone size={16} /> CALL</a>}
        {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="h-11 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 bg-[#25D366]"><MessageCircle size={16} /> WHATSAPP</a>}
      </div>

      <div className="p-5 space-y-6">
        {/* About Us */}
        {on(c.about_on) && (s(c.company_name) || s(c.about_us)) && (
          <section>
            <Head title={s(c.about) || "About Us"} accent={accent} />
            <div className="bg-white rounded-xl border border-[#F1F5F9] p-3.5">
              {s(c.company_name) && <DetailRow label="Company Name" value={s(c.company_name)} />}
              {s(c.gst) && <DetailRow label="GST Number" value={s(c.gst)} />}
              {s(c.establishment) && <DetailRow label="Year of Est." value={s(c.establishment)} />}
              {s(c.nature) && <DetailRow label="Nature of Business" value={s(c.nature)} />}
              {s(c.about_us) && <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-wrap mt-3 pt-3 border-t border-[#F1F5F9]">{s(c.about_us)}</p>}
            </div>
          </section>
        )}

        {/* Specialties */}
        {specs.length > 0 && (
          <section>
            <Head title={s(c.specialties_title) || "Our Specialties"} accent={accent} />
            <div className="flex flex-wrap gap-2 justify-center">
              {specs.map((sp, i) => <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium border" style={{ borderColor: accent, color: accent }}>{sp}</span>)}
            </div>
          </section>
        )}

        {/* Services / Products */}
        {on(c.product_on) && products.length > 0 && (
          <section>
            <Head title={s(c.product) || "Services"} accent={accent} />
            <div className="space-y-3">
              {products.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-[#F1F5F9] overflow-hidden shadow-sm">
                  {p.filename && <div className="h-32 bg-[#F8FAFC] overflow-hidden"><img src={p.filename} alt={p.name} className="w-full h-full object-cover" /></div>}
                  <div className="p-3.5">
                    <h4 className="text-sm font-bold text-[#0F172A]">{p.name}</h4>
                    {(p.price || p.offer_price) && (
                      <p className="text-sm mt-1 font-semibold">
                        Price {p.price && p.offer_price && <span className="line-through text-[#94A3B8] font-normal">₹{p.price}</span>} <span style={{ color: accent }}>₹{p.offer_price || p.price}</span>
                      </p>
                    )}
                    {p.description && (
                      <div className="mt-2 text-xs text-[#475569]">
                        <p className="font-semibold text-[#334155] mb-0.5">Other Detail</p>
                        <p className="whitespace-pre-wrap leading-relaxed">{p.description}</p>
                      </div>
                    )}
                    <a href={p.button || "#"} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold" style={{ color: accent }}>{p.button_title || "Know More"} <ChevronRight size={13} /></a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Payment details */}
        {on(c.payment_on) && upis.length > 0 && (
          <section>
            <Head title="Payment Details" accent={accent} />
            <div className="bg-white rounded-xl border border-[#F1F5F9] p-3.5 space-y-1.5">
              {[["UPI ID", s(c.upi)], ["Paytm", s(c.paytm_number)], ["PhonePe", s(c.phone_pe)], ["Google Pay", s(c.google_pay)]].filter(([, v]) => v).map(([l, v]) => <DetailRow key={l} label={l} value={v} />)}
            </div>
          </section>
        )}

        {/* Bank account */}
        {on(c.payment_on) && hasBank && (
          <section>
            <Head title="Bank Account Details" accent={accent} />
            <div className="bg-white rounded-xl border border-[#F1F5F9] p-3.5">
              {s(c.bank_name) && <DetailRow label="Bank Name" value={s(c.bank_name)} />}
              {s(c.ifsc) && <DetailRow label="IFSC Code" value={s(c.ifsc)} />}
              {s(c.account_holder) && <DetailRow label="A/c Holder" value={s(c.account_holder)} />}
              {s(c.account_number) && <DetailRow label="Account No." value={s(c.account_number)} />}
              {s(c.account_type) && <DetailRow label="Account Type" value={s(c.account_type)} />}
            </div>
          </section>
        )}

        {/* QR code */}
        {on(c.qrcode_on) && s(c.slug) && (
          <section>
            <Head title="QR Code" accent={accent} />
            <div className="bg-white rounded-xl border border-[#F1F5F9] p-4 flex flex-col items-center">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(cardUrl)}`} alt="QR code" className="w-40 h-40" />
              <p className="text-xs text-[#64748B] mt-2">Scan to view this card</p>
            </div>
          </section>
        )}

        {/* Gallery */}
        {on(c.gallery_on) && gallery.length > 0 && (
          <section>
            <Head title={s(c.gallery) || "Graphic Portfolio"} accent={accent} />
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((g) => <div key={g.id} className="aspect-square rounded-lg overflow-hidden"><img src={g.filename} alt={g.name} className="w-full h-full object-cover" /></div>)}
            </div>
          </section>
        )}

        {/* Videos */}
        {on(c.video_on) && videos.length > 0 && (
          <section>
            <Head title={s(c.video) || "Video Portfolio"} accent={accent} />
            <div className="space-y-2.5">
              {videos.map((v) => (
                <a key={v.id} href={v.url} target="_blank" rel="noreferrer" className="block relative rounded-xl overflow-hidden aspect-video bg-black">
                  <img src={`https://img.youtube.com/vi/${ytId(v.url)}/hqdefault.jpg`} alt={v.title} className="w-full h-full object-cover opacity-90" />
                  <span className="absolute inset-0 flex items-center justify-center"><span className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center"><Play size={18} className="text-[#0F172A] ml-0.5" /></span></span>
                  <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs font-medium p-2">{v.title}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Social */}
        {hasSocial && (
          <section>
            <Head title={s(c.social_title) || "Follow Us"} accent={accent} />
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {SOCIALS.filter((x) => s(c[x.k])).map((x) => (
                <a key={x.k} href={s(c[x.k])} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: x.color }}><x.icon size={17} /></a>
              ))}
            </div>
          </section>
        )}

        {/* Enquiry */}
        {on(c.enquiry_on) && (
          <section>
            <Head title={s(c.enquiry) || "Enquiry Form"} accent={accent} />
            {sent ? (
              <p className="text-xs text-emerald-600 font-medium text-center py-4">✓ Thank you! We'll get back to you shortly.</p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSent(true); toast.success("Enquiry sent"); }} className="space-y-2.5 bg-white rounded-xl border border-[#F1F5F9] p-3.5">
                <input required placeholder="Your Name" className="w-full h-10 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-xs outline-none" />
                <input required placeholder="Contact Number" className="w-full h-10 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-xs outline-none" />
                <textarea placeholder="Your requirement" className="w-full min-h-[70px] rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 text-xs outline-none" />
                <button type="submit" className="w-full h-10 rounded-lg text-white text-xs font-bold" style={{ background: accent }}>Send Enquiry</button>
              </form>
            )}
          </section>
        )}

        {/* Save contact */}
        <button onClick={() => downloadVCard(c)} className="w-full h-11 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center justify-center gap-2"><Download size={15} /> Save Contact in Your Phonebook</button>

        <p className="text-center text-[10px] text-[#94A3B8] pt-1">Powered by <span className="font-bold text-[#0F172A]">DigitalCarda</span></p>
      </div>
    </div>
  );
}
