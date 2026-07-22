import { Eye, ExternalLink, Copy, Check, RefreshCw, ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import ModuleShell from "@/components/customer/ModuleShell";
import { useCustomer, useLocalList } from "@/hooks/useCustomer";
import { contentSeeder } from "@/lib/cardContent";
import { buildCardHtml } from "@/card-template/buildCard";
import { trpc } from "@/providers/trpc";

type Product = { id: number; name: string; filename: string; price: string; offer_price: string; description: string; button: string; button_title: string };
type Gallery = { id: number; name: string; filename: string };
type Vid = { id: number; title: string; url: string };
type Offer = { id: number; title: string; description: string; valid: string; filename: string };
type Qr = { id: number; name: string; filename: string };

export default function CustomerViewCard() {
  const navigate = useNavigate();
  const { data } = useCustomer();
  const products = useLocalList<Product>("dc_products", [], contentSeeder("products"));
  const gallery = useLocalList<Gallery>("dc_gallery", [], contentSeeder("gallery"));
  const videos = useLocalList<Vid>("dc_videos", [], contentSeeder("videos"));
  const offers = useLocalList<Offer>("dc_offers", [], contentSeeder("offers"));
  const qrcodes = useLocalList<Qr>("dc_qrcode", [], contentSeeder("qrcodes"));
  const { data: program } = trpc.referral.myProgram.useQuery();
  const [copied, setCopied] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const slug = String(data.slug || "acme-digital");
  const url = `https://digitalcarda.in/${slug}`;

  const html = useMemo(
    () => buildCardHtml({ ...data, referral_code: program?.code || "" }, products.items, gallery.items, videos.items, offers.items, qrcodes.items),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, program?.code, products.items, gallery.items, videos.items, offers.items, qrcodes.items, nonce]
  );

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); toast.success("Link copied"); setTimeout(() => setCopied(false), 1600); }
    catch { toast.error("Copy failed"); }
  };
  const refresh = () => { setNonce((n) => n + 1); toast.success("Preview refreshed"); };

  const iconBtn = "inline-flex items-center justify-center w-9 h-9 rounded-xl border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] transition-colors";

  /* ── Mobile: clean full-screen card (bypasses the app shell) ── */
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[70] bg-[#f1f1f1] flex flex-col">
        <header className="flex items-center gap-1.5 h-14 px-3 bg-white border-b border-[#F1F5F9] shrink-0">
          <button onClick={() => navigate("/dashboard")} className={iconBtn} aria-label="Back"><ArrowLeft size={17} /></button>
          <div className="flex-1 min-w-0 px-1">
            <p className="text-sm font-bold text-[#0F172A] leading-none">Your Card</p>
            <p className="text-[11px] text-[#94A3B8] truncate">/{slug}</p>
          </div>
          <button onClick={refresh} className={iconBtn} aria-label="Refresh"><RefreshCw size={16} /></button>
          <button onClick={copy} className={iconBtn} aria-label="Copy link">{copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}</button>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-9 h-9 rounded-xl gradient-gold text-[#0F172A]" aria-label="Open live"><ExternalLink size={16} /></a>
        </header>
        <iframe key={nonce} srcDoc={html} title="Card preview" className="flex-1 w-full border-0 bg-white" />
      </div>
    );
  }

  /* ── Desktop: sidebar + phone frame ── */
  return (
    <ModuleShell title="View Card" subtitle="Exact live preview of your digital business card" icon={Eye}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors"><RefreshCw size={15} /> Refresh</button>
          <button onClick={copy} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors">{copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />} Copy</button>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl gradient-gold text-[#0F172A] text-sm font-semibold"><ExternalLink size={15} /> Live</a>
        </div>
      }>
      <p className="text-center text-xs text-[#64748B]">Rendered with the real DigitalCarda card template — updates instantly from your module edits.</p>
      <div className="flex justify-center">
        <div className="w-full max-w-[400px] h-[760px] rounded-[36px] bg-[#0F172A] p-2.5 shadow-premium-lg shrink-0">
          <iframe key={nonce} srcDoc={html} title="Card preview" className="w-full h-full rounded-[28px] bg-white border-0" />
        </div>
      </div>
    </ModuleShell>
  );
}
