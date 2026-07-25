import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import { Download, QrCode, ExternalLink, Copy, Check, MessageCircle, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useCustomer } from "@/hooks/useCustomer";

const ORIGIN = "https://digitalcarda.in";

export default function CustomerQR() {
  const { data } = useCustomer();
  const { data: mine } = trpc.publish.mine.useQuery(undefined, { retry: false });
  const slug = String(mine?.slug || data.slug || "");
  // The QR targets the PERMANENT /q/<public_id> link when the card has been
  // published — so re-designing the card never breaks a printed code (§14).
  const qrTarget = mine?.publicId ? `${ORIGIN}/q/${mine.publicId}` : `${ORIGIN}/${slug}`;
  const shareUrl = `${ORIGIN}/${slug}`;

  const [color, setColor] = useState("#0F172A");
  const [bg, setBg] = useState("#FFFFFF");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");

  const colors = ["#0F172A", "#F7B31C", "#14B8A6", "#3B82F6", "#EF4444", "#8B5CF6"];
  const bgs = ["#FFFFFF", "#F8FAFC", "#FEF3C7", "#E0F2FE"];

  const qrSrc = (size: number, fmt = "png") =>
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&format=${fmt}&data=${encodeURIComponent(qrTarget)}&color=${color.replace("#", "")}&bgcolor=${bg.replace("#", "")}`;

  const copy = async () => { try { await navigator.clipboard.writeText(shareUrl); setCopied(true); toast.success("Card link copied"); setTimeout(() => setCopied(false), 1800); } catch { toast.error("Copy failed"); } };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Here's my digital business card 👉 ${shareUrl}`)}`, "_blank");
  const nativeShare = async () => { if (navigator.share) { try { await navigator.share({ title: String(data.name || "My card"), url: shareUrl }); } catch { /* cancelled */ } } else copy(); };

  const download = async (fmt: "png" | "svg") => {
    setBusy(fmt);
    try {
      const res = await fetch(qrSrc(1000, fmt));
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `digitalcarda-qr-${slug || "card"}.${fmt}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(a.href);
      toast.success(`QR downloaded (${fmt.toUpperCase()})`);
    } catch { toast.error("Download failed — check your connection"); }
    finally { setBusy(""); }
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="QR & Share" subtitle="Your permanent QR code and share tools" /></div>
      <div className="p-4 sm:p-6 space-y-5">
        {!slug ? (
          <div className="bg-white rounded-2xl p-12 shadow-premium border border-[#F1F5F9] text-center">
            <QrCode size={40} className="text-[#CBD5E1] mx-auto mb-4" />
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No card link yet</h3>
            <p className="text-sm text-[#94A3B8]">Finish and publish your card to get a QR.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* QR preview */}
            <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] flex flex-col items-center">
              <div className="p-4 rounded-2xl" style={{ background: bg }}>
                <img src={qrSrc(280)} alt="Your card QR code" width={240} height={240} className="rounded-lg" referrerPolicy="no-referrer" />
              </div>
              {mine?.publicId && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"><ShieldCheck size={13} /> Permanent QR — redesign your card anytime, it keeps working</p>
              )}
              <div className="mt-4 w-full flex items-center gap-2 p-2.5 bg-[#F8FAFC] rounded-xl">
                <span className="text-xs text-[#64748B] truncate flex-1">{shareUrl.replace(/^https?:\/\//, "")}</span>
                <button onClick={copy} className="p-1.5 rounded-lg hover:bg-[#E2E8F0] text-[#64748B]">{copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}</button>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Style</h3>
                <label className="block text-xs text-[#64748B] mb-1.5">QR colour</label>
                <div className="flex gap-2 flex-wrap mb-4">
                  {colors.map((c) => <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-lg border-2 transition-all ${color === c ? "border-[#0F172A] scale-110" : "border-transparent"}`} style={{ background: c }} />)}
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded-lg border border-[#E2E8F0] cursor-pointer bg-transparent" />
                </div>
                <label className="block text-xs text-[#64748B] mb-1.5">Background</label>
                <div className="flex gap-2">
                  {bgs.map((c) => <button key={c} onClick={() => setBg(c)} className={`w-8 h-8 rounded-lg border-2 transition-all ${bg === c ? "border-[#0F172A] scale-110" : "border-[#E2E8F0]"}`} style={{ background: c }} />)}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Download</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => download("png")} disabled={!!busy} className="flex items-center justify-center gap-2 h-11 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all disabled:opacity-60"><Download size={16} /> PNG</button>
                  <button onClick={() => download("svg")} disabled={!!busy} className="flex items-center justify-center gap-2 h-11 border border-[#E2E8F0] text-[#334155] rounded-xl text-sm font-semibold hover:bg-[#F8FAFC] transition-all disabled:opacity-60"><Download size={16} /> SVG</button>
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-2">High-resolution — perfect for visiting cards, brochures, signage and packaging.</p>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Share</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={whatsapp} className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#DCFCE7] text-[#166534] text-[13px] font-semibold hover:bg-[#BBF7D0] transition-colors"><MessageCircle size={15} /> WhatsApp</button>
                  <button onClick={nativeShare} className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#F1F5F9] text-[#334155] text-[13px] font-semibold hover:bg-[#E2E8F0] transition-colors"><Share2 size={15} /> Share</button>
                  <button onClick={copy} className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#F1F5F9] text-[#334155] text-[13px] font-semibold hover:bg-[#E2E8F0] transition-colors"><Copy size={15} /> Copy link</button>
                  <a href={shareUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#F1F5F9] text-[#334155] text-[13px] font-semibold hover:bg-[#E2E8F0] transition-colors"><ExternalLink size={15} /> View card</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
