import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import { Download, QrCode, ExternalLink, Copy, Check, MessageCircle, Share2, ShieldCheck, Printer, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useCustomer, getActiveCardId } from "@/hooks/useCustomer";
import { STANDEE_STYLES, standeeMarkup, escapeHtml } from "@/lib/standee";

const ORIGIN = "https://digitalcarda.in";

export default function CustomerQR() {
  const { data } = useCustomer();
  const { data: mine } = trpc.publish.mine.useQuery({ cardId: getActiveCardId() }, { retry: false });
  const slug = String(mine?.slug || data.slug || "");
  // The QR targets the PERMANENT /q/<public_id> link when the card has been
  // published — so re-designing the card never breaks a printed code (§14).
  const qrTarget = mine?.publicId ? `${ORIGIN}/q/${mine.publicId}` : `${ORIGIN}/${slug}`;
  const shareUrl = `${ORIGIN}/${slug}`;

  const [color, setColor] = useState("#0F172A");
  const [bg, setBg] = useState("#FFFFFF");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");
  const [showUsername, setShowUsername] = useState(false);

  const colors = ["#0F172A", "#F7B31C", "#14B8A6", "#3B82F6", "#EF4444", "#8B5CF6"];
  const bgs = ["#FFFFFF", "#F8FAFC", "#FEF3C7", "#E0F2FE"];

  // Branding shown on the printable standee — the PERSON leads (like the card's
  // name banner), with their role and company beneath. Falls back to the company
  // name as the headline only when there's no person name.
  const personName = String(data.name || "").trim();
  const company = String(data.company_name || "").trim();
  const desig = String(data.designation || data.nature || "").trim();
  const brandName = personName || company || "My Business";
  const subtitle = [desig, personName && company ? company : ""].filter(Boolean).join(" · ");
  const phone = String(data.mobile1 || "");
  const linkText = `${ORIGIN}/${slug}`.replace(/^https?:\/\//, "");

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

  /* ── Branded standee: shared markup for the on-screen preview AND the print
     window (and the public homepage), so all stay identical. See lib/standee. ── */
  const standeeStyles = STANDEE_STYLES;
  const standeeInner = () => standeeMarkup({ brandName, subtitle, phone, linkText, qrSrc: qrSrc(440), username: showUsername ? slug : undefined });

  const printStandee = () => {
    const w = window.open("", "_blank", "width=520,height=760");
    if (!w) { toast.error("Allow pop-ups to print"); return; }
    w.document.write(`<!doctype html><html><head><title>${escapeHtml(brandName)} — QR</title>
      <meta charset="utf-8"/>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>@page{size:A6;margin:10mm;}body{margin:0;padding:24px;display:flex;justify-content:center;background:#fff;}${standeeStyles}</style>
      </head><body>${standeeInner()}
      <script>window.onload=function(){setTimeout(function(){window.focus();window.print();},400);};<\/script>
      </body></html>`);
    w.document.close();
  };

  // High-resolution PNG of the standee, composed on a canvas (no libraries).
  const downloadStandee = async () => {
    setBusy("poster");
    try {
      const S = 3; // scale for crisp print (≈1260×1740)
      const W = 420 * S, H = 580 * S;
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d")!;
      const rr = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
      };
      // card background
      ctx.fillStyle = "#fff"; rr(0, 0, W, H, 26 * S); ctx.fill();
      // gold header
      const hh = 150 * S;
      const g = ctx.createLinearGradient(0, 0, W, hh);
      g.addColorStop(0, "#F7B31C"); g.addColorStop(1, "#EA9A08");
      ctx.save(); rr(0, 0, W, hh, 26 * S); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, hh); ctx.restore();
      ctx.textAlign = "center";
      // Real DigitalCarda logo on a dark chip (same-origin /logo.png → no canvas taint).
      const logoImg = await loadImg("/logo.png").catch(() => null);
      if (logoImg) {
        const lh = 20 * S, lw = lh * (logoImg.width / logoImg.height), chipW = lw + 26 * S, chipH = 32 * S, chipY = 16 * S;
        ctx.fillStyle = "#0F172A"; rr(W / 2 - chipW / 2, chipY, chipW, chipH, 11 * S); ctx.fill();
        ctx.drawImage(logoImg, W / 2 - lw / 2, chipY + (chipH - lh) / 2, lw, lh);
      }
      ctx.fillStyle = "#0F172A"; ctx.font = `800 ${26 * S}px Inter, sans-serif`;
      wrapText(ctx, brandName, W / 2, 82 * S, W - 60 * S, 30 * S);
      if (subtitle) { ctx.fillStyle = "rgba(15,23,42,.72)"; ctx.font = `600 ${13 * S}px Inter, sans-serif`; ctx.fillText(clip(subtitle, 42), W / 2, 118 * S); }
      if (showUsername && slug) { ctx.fillStyle = "rgba(15,23,42,.62)"; ctx.font = `700 ${12.5 * S}px Inter, sans-serif`; ctx.fillText("@" + slug, W / 2, 137 * S); }
      // SCAN ME pill
      const pillY = 168 * S;
      ctx.fillStyle = "#0F172A"; rr(W / 2 - 55 * S, pillY - 15 * S, 110 * S, 28 * S, 14 * S); ctx.fill();
      ctx.fillStyle = "#F7B31C"; ctx.font = `800 ${12 * S}px Inter, sans-serif`; ctx.fillText("S C A N   M E", W / 2, pillY + 3 * S);
      // QR frame + image
      const frame = 252 * S, fx = (W - frame) / 2, fy = 200 * S;
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#EEF2F7"; ctx.lineWidth = 1 * S;
      rr(fx, fy, frame, frame, 20 * S); ctx.fill(); ctx.stroke();
      const qrImg = await loadImg(qrSrc(600));
      const q = frame - 32 * S; ctx.drawImage(qrImg, fx + 16 * S, fy + 16 * S, q, q);
      // prompt
      ctx.fillStyle = "#0F172A"; ctx.font = `700 ${15 * S}px Inter, sans-serif`;
      ctx.fillText("Scan to view my digital card", W / 2, fy + frame + 34 * S);
      ctx.fillStyle = "#64748B"; ctx.font = `500 ${12 * S}px Inter, sans-serif`;
      ctx.fillText("Save my contact · See products · Get directions", W / 2, fy + frame + 56 * S);
      // link pill
      const ly = fy + frame + 82 * S;
      ctx.font = `700 ${13 * S}px Inter, sans-serif`;
      const lw = ctx.measureText(linkText).width + 32 * S;
      ctx.fillStyle = "#F1F5F9"; rr(W / 2 - lw / 2, ly - 15 * S, lw, 30 * S, 10 * S); ctx.fill();
      ctx.fillStyle = "#0F172A"; ctx.fillText(linkText, W / 2, ly + 4 * S);
      if (phone) { ctx.fillStyle = "#334155"; ctx.font = `600 ${13 * S}px Inter, sans-serif`; ctx.fillText("📞 " + phone, W / 2, ly + 34 * S); }
      // footer
      ctx.fillStyle = "#0F172A"; ctx.fillRect(0, H - 40 * S, W, 40 * S);
      ctx.save(); rr(0, 0, W, H, 26 * S); ctx.clip();
      ctx.fillStyle = "#0F172A"; ctx.fillRect(0, H - 40 * S, W, 40 * S); ctx.restore();
      ctx.fillStyle = "#94A3B8"; ctx.font = `500 ${11 * S}px Inter, sans-serif`;
      ctx.fillText("Powered by DigitalCarda · Your smart digital business card", W / 2, H - 16 * S);

      cv.toBlob((blob) => {
        if (!blob) { toast.error("Could not create image"); return; }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `digitalcarda-standee-${slug || "card"}.png`;
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
        toast.success("Standee downloaded");
      }, "image/png");
    } catch { toast.error("Download failed — check your connection"); }
    finally { setBusy(""); }
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="QR & Share" subtitle="A print-ready, branded QR standee for your desk & counter" /></div>
      <style>{standeeStyles}</style>
      <div className="p-4 sm:p-6 space-y-5">
        {!slug ? (
          <div className="bg-white rounded-2xl p-12 shadow-premium border border-[#F1F5F9] text-center">
            <QrCode size={40} className="text-[#CBD5E1] mx-auto mb-4" />
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No card link yet</h3>
            <p className="text-sm text-[#94A3B8]">Finish and publish your card to get a QR.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Branded standee preview */}
            <div className="bg-gradient-to-b from-[#F8FAFC] to-[#EEF2F7] rounded-2xl p-6 sm:p-8 shadow-premium border border-[#F1F5F9] flex flex-col items-center">
              <div className="w-full max-w-[420px]" dangerouslySetInnerHTML={{ __html: standeeInner() }} />
              {mine?.publicId && (
                <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"><ShieldCheck size={13} /> Permanent QR — redesign your card anytime, it keeps working</p>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-1">Print-ready standee</h3>
                <p className="text-[12px] text-[#94A3B8] mb-3">Download or print this branded card and stand it on your desk, shop counter or reception.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={downloadStandee} disabled={!!busy} className="flex items-center justify-center gap-2 h-11 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all disabled:opacity-60"><ImageIcon size={16} /> {busy === "poster" ? "Preparing…" : "Download PNG"}</button>
                  <button onClick={printStandee} disabled={!!busy} className="flex items-center justify-center gap-2 h-11 border border-[#E2E8F0] text-[#334155] rounded-xl text-sm font-semibold hover:bg-[#F8FAFC] transition-all disabled:opacity-60"><Printer size={16} /> Print / PDF</button>
                </div>
                <button type="button" onClick={() => setShowUsername((v) => !v)} className="flex items-center gap-2.5 mt-3 pt-3 border-t border-[#F1F5F9] w-full text-left">
                  <span className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${showUsername ? "bg-[#F7B31C]" : "bg-[#E2E8F0]"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${showUsername ? "left-[18px]" : "left-0.5"}`} />
                  </span>
                  <span className="text-[13px] font-medium text-[#334155]">Show my <b className="text-[#0F172A]">@{slug || "username"}</b> on the standee</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-3">QR colour</h3>
                <label className="block text-xs text-[#64748B] mb-1.5">Code colour</label>
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
                <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Just the QR</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => download("png")} disabled={!!busy} className="flex items-center justify-center gap-2 h-11 bg-[#0F172A] text-white rounded-xl text-sm font-semibold hover:bg-[#1E293B] transition-all disabled:opacity-60"><Download size={16} /> PNG</button>
                  <button onClick={() => download("svg")} disabled={!!busy} className="flex items-center justify-center gap-2 h-11 border border-[#E2E8F0] text-[#334155] rounded-xl text-sm font-semibold hover:bg-[#F8FAFC] transition-all disabled:opacity-60"><Download size={16} /> SVG</button>
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-2">High-resolution — for visiting cards, brochures, signage & packaging.</p>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
                <div className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] rounded-xl mb-3">
                  <span className="text-xs text-[#64748B] truncate flex-1">{linkText}</span>
                  <button onClick={copy} className="p-1.5 rounded-lg hover:bg-[#E2E8F0] text-[#64748B]">{copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}</button>
                </div>
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

/* ── helpers ─────────────────────────────────────────────────────────── */
function clip(s: string, n: number): string { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  let line = "", lines: string[] = [];
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  lines = lines.slice(0, 2);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
}
