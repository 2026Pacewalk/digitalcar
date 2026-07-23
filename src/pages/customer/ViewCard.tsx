import { Eye, ExternalLink, Copy, Check, RefreshCw, ArrowLeft, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import ModuleShell from "@/components/customer/ModuleShell";
import { useCustomer, useLocalList } from "@/hooks/useCustomer";
import { contentSeeder } from "@/lib/cardContent";
import { buildCardHtml, buildPausedHtml } from "@/card-template/buildCard";
import { trpc } from "@/providers/trpc";

type Product = { id: number; name: string; filename: string; price: string; offer_price: string; description: string; button: string; button_title: string };
type Gallery = { id: number; name: string; filename: string };
type Vid = { id: number; title: string; url: string };
type Offer = { id: number; title: string; description: string; valid: string; filename: string };
type Qr = { id: number; name: string; filename: string };
type Review = { id: number; name: string; rating: number; text: string; date?: string };

export default function CustomerViewCard() {
  const navigate = useNavigate();
  const { data } = useCustomer();
  const products = useLocalList<Product>("dc_products", [], contentSeeder("products"));
  const gallery = useLocalList<Gallery>("dc_gallery", [], contentSeeder("gallery"));
  const videos = useLocalList<Vid>("dc_videos", [], contentSeeder("videos"));
  const offers = useLocalList<Offer>("dc_offers", [], contentSeeder("offers"));
  const qrcodes = useLocalList<Qr>("dc_qrcode", [], contentSeeder("qrcodes"));
  const reviews = useLocalList<Review>("dc_reviews", []);
  const { data: program } = trpc.referral.myProgram.useQuery();
  const { data: siteConfig } = trpc.template.siteConfig.useQuery();
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
  const url = `https://digitalcarda.in/c/${slug}`;

  // Trial/plan expired → the public card is paused for visitors.
  const isTrial = Number(data.package_id) === 7;
  const expiredOn = String(data.expired_on || "");
  const daysLeft = (() => {
    if (!expiredOn || expiredOn === "0000-00-00") return 999;
    const d = new Date(expiredOn.replace(" ", "T"));
    return isNaN(d.getTime()) ? 999 : Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  })();
  const isExpired = isTrial && daysLeft <= 0;

  // Users who haven't picked their own template fall back to the super-admin default.
  const chose = !!String(data.theme || "");
  const themed = chose ? data : {
    ...data,
    theme: siteConfig?.defaultId ?? data.theme,
    color: data.color || siteConfig?.defaultColor,
    color2: data.color2 || siteConfig?.defaultSecondary,
  };

  const html = useMemo(
    () => isExpired
      ? buildPausedHtml({ ...themed, referral_code: program?.code || "" })
      : buildCardHtml({ ...themed, referral_code: program?.code || "" }, products.items, gallery.items, videos.items, offers.items, qrcodes.items, reviews.items),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themed, isExpired, program?.code, products.items, gallery.items, videos.items, offers.items, qrcodes.items, reviews.items, nonce]
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
      {isExpired ? (
        <div className="rounded-2xl bg-gradient-to-r from-[#FEF2F2] to-[#FFF7F7] border border-red-200 p-3.5 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-red-100 text-red-500 flex items-center justify-center shrink-0"><Lock size={17} /></span>
          <p className="text-xs text-[#991B1B] flex-1 leading-snug"><b>This is exactly what visitors see now.</b> Your trial ended, so your public card is paused. Reactivate to bring it back online instantly.</p>
          <button onClick={() => navigate("/dashboard/subscription")} className="h-9 px-3.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shrink-0">Reactivate</button>
        </div>
      ) : (
        <p className="text-center text-xs text-[#64748B]">Rendered with the real DigitalCarda card template — updates instantly from your module edits.</p>
      )}
      <div className="flex justify-center">
        <div className="w-full max-w-[400px] h-[760px] rounded-[36px] bg-[#0F172A] p-2.5 shadow-premium-lg shrink-0">
          <iframe key={nonce} srcDoc={html} title="Card preview" className="w-full h-full rounded-[28px] bg-white border-0" />
        </div>
      </div>
    </ModuleShell>
  );
}
