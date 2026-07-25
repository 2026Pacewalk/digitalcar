import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Rocket, X, ExternalLink, MessageCircle, Share2, QrCode, Gift } from "lucide-react";

type Trial = { daysLeft: number; endsAt: string | Date | null; status: string } | undefined;

/* Shown the moment a card goes live. The "first publish" is the primary
   activation event (§34) — so we make it a celebration and hand straight off
   to sharing (copy link, WhatsApp, native share, QR). */
export default function PublishModal({ url, name, first, trial, onClose, onView }: {
  url: string; name: string; first: boolean; trial?: Trial; onClose: () => void; onView: () => void;
}) {
  const trialEnds = trial?.endsAt ? new Date(trial.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
  const [copied, setCopied] = useState(false);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(url)}`;

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); toast.success("Link copied"); setTimeout(() => setCopied(false), 1600); }
    catch { toast.error("Copy failed"); }
  };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out my digital business card 👉 ${url}`)}`, "_blank");
  const nativeShare = async () => {
    if (navigator.share) { try { await navigator.share({ title: name || "My DigitalCarda", text: "Here's my digital business card", url }); } catch { /* cancelled */ } }
    else copy();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-scale-in overflow-hidden">
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] flex items-center justify-center z-10"><X size={16} /></button>

        {/* Celebration header */}
        <div className="relative bg-gradient-to-br from-[#14243E] to-[#243b63] px-6 pt-7 pb-6 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(70% 90% at 50% 0%, rgba(247,179,28,.35), transparent)" }} />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center mx-auto shadow-gold"><Rocket size={26} className="text-[#0F172A]" /></div>
            <h3 className="text-xl font-extrabold text-white mt-3">{first ? "🎉 Your card is live!" : "Card updated"}</h3>
            <p className="text-[13px] text-[#CBD5E1] mt-1">{first ? "Share it and start getting noticed." : "Your changes are now live."}</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Trial line — the server-authoritative clock started on this publish */}
          {trial && trial.status !== "not_started" && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] px-3.5 py-2.5">
              <span className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center shrink-0"><Gift size={16} className="text-[#0F172A]" /></span>
              <p className="text-[12.5px] font-semibold text-[#92400E] leading-tight">
                Your free trial is active — <b>{trial.daysLeft} day{trial.daysLeft === 1 ? "" : "s"} left</b>{trialEnds ? <span className="font-normal"> · ends {trialEnds}</span> : ""}
              </p>
            </div>
          )}

          {/* QR */}
          <div className="flex flex-col items-center">
            <div className="p-2 rounded-2xl border border-[#F1F5F9] shadow-premium bg-white">
              <img src={qr} alt="Card QR code" width={140} height={140} className="rounded-lg" referrerPolicy="no-referrer" />
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-2 flex items-center gap-1"><QrCode size={12} /> Scan to open your card</p>
          </div>

          {/* URL + copy */}
          <div className="flex items-stretch gap-2">
            <div className="flex-1 flex items-center h-11 rounded-xl bg-[#F1F5F9] px-3 text-[13px] font-medium text-[#334155] min-w-0"><span className="truncate">{url.replace(/^https?:\/\//, "")}</span></div>
            <button onClick={copy} className="w-11 h-11 rounded-xl border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] flex items-center justify-center shrink-0">{copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}</button>
          </div>

          {/* Share row */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={whatsapp} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#DCFCE7] text-[#166534] text-[11px] font-semibold hover:bg-[#BBF7D0] transition-colors"><MessageCircle size={17} /> WhatsApp</button>
            <button onClick={copy} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#F1F5F9] text-[#334155] text-[11px] font-semibold hover:bg-[#E2E8F0] transition-colors"><Copy size={17} /> Copy link</button>
            <button onClick={nativeShare} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#F1F5F9] text-[#334155] text-[11px] font-semibold hover:bg-[#E2E8F0] transition-colors"><Share2 size={17} /> Share</button>
          </div>

          {/* CTAs */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="h-11 px-4 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Done</button>
            <button onClick={onView} className="flex-1 h-11 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold flex items-center justify-center gap-2 hover:shadow-gold transition-all"><ExternalLink size={16} /> View my card</button>
          </div>
        </div>
      </div>
    </div>
  );
}
