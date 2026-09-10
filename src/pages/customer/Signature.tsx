import { useMemo, useRef, useState } from "react";
import { PenLine, Copy, Check, Code2, AlertTriangle, ChevronDown, Info, Mail, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";
import ModuleShell, { Panel, Field, fieldCls, Tip } from "@/components/customer/ModuleShell";
import { useCustomer, getActiveCardId } from "@/hooks/useCustomer";
import { trpc } from "@/providers/trpc";
import { readSocialLinks, SOCIAL_BY_KEY } from "@/lib/socialPlatforms";
import {
  SIGNATURE_TEMPLATES, buildSignature, buildSignatureText,
  type SignatureData, type SignatureOptions,
} from "@/lib/emailSignature";

const ORIGIN = "https://digitalcarda.in";
const ACCENTS = ["#F7B31C", "#0F172A", "#14B8A6", "#3B82F6", "#8B5CF6", "#EF4444", "#16A34A", "#EC4899"];

/* Copy the signature as RICH TEXT.

   navigator.clipboard.writeText() would paste the HTML *source* into the
   signature box — the classic way this feature ships broken. We put a real
   text/html flavour on the clipboard (plus text/plain for plain-text
   composers). Where ClipboardItem isn't available we select the rendered node
   and use execCommand("copy"), which also yields rich text. */
async function copyRichHtml(html: string, plain: string): Promise<boolean> {
  try {
    if (navigator.clipboard && "write" in navigator.clipboard && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
  } catch { /* fall through to the selection-based copy */ }

  try {
    const host = document.createElement("div");
    host.setAttribute("contenteditable", "true");
    host.style.cssText = "position:fixed;left:-99999px;top:0;white-space:normal;";
    host.innerHTML = html;
    document.body.appendChild(host);
    const range = document.createRange();
    range.selectNodeContents(host);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    const ok = document.execCommand("copy");
    sel?.removeAllRanges();
    document.body.removeChild(host);
    return ok;
  } catch { return false; }
}

const HOW_TO: { client: string; steps: string[] }[] = [
  { client: "Gmail (web)", steps: [
    "Settings (gear) → See all settings → General tab.",
    "Scroll to Signature → Create new (or pick an existing one).",
    "Click into the signature box and paste (Ctrl+V / ⌘V).",
    "Scroll to the bottom → Save Changes.",
  ]},
  { client: "Outlook (web / new Outlook)", steps: [
    "Settings (gear) → Mail → Compose and reply.",
    "Under Email signature, click into the box and paste.",
    "Tick which messages it should appear on, then Save.",
  ]},
  { client: "Outlook (desktop, Windows)", steps: [
    "File → Options → Mail → Signatures.",
    "New (or select a signature), click into the edit box and paste.",
    "OK. If the layout shifts, use the Classic or Plain text design — Outlook's Word renderer is the fussiest.",
  ]},
  { client: "Apple Mail (Mac)", steps: [
    "Mail → Settings → Signatures.",
    "Pick your account, press + for a new signature.",
    "Untick \"Always match my default message font\", then paste.",
  ]},
];

export default function CustomerSignature() {
  const { data } = useCustomer();
  const { data: mine } = trpc.publish.mine.useQuery({ cardId: getActiveCardId() }, { retry: false });

  const [templateId, setTemplateId] = useState("corporate");
  const [accent, setAccent] = useState("#F7B31C");
  const [showLogo, setShowLogo] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [showSocials, setShowSocials] = useState(true);
  const [showAddress, setShowAddress] = useState(false);
  const [tagline, setTagline] = useState("Save my contact, see my services and pay — all from one link.");
  const [copied, setCopied] = useState<"rich" | "html" | null>(null);
  const [openHelp, setOpenHelp] = useState<number | null>(0);
  const previewRef = useRef<HTMLDivElement>(null);

  const slug = String(mine?.slug || data.slug || "");
  const cardUrl = `${ORIGIN}/${slug}`;
  const logo = String(data.logo || "");
  const logoIsEmbedded = /^data:/i.test(logo);

  const sig: SignatureData = useMemo(() => ({
    name: String(data.name || ""),
    designation: String(data.designation || ""),
    company: String(data.company_name || ""),
    phone: String(data.mobile1 || ""),
    whatsapp: String(data.mobile2 || data.mobile1 || ""),
    email: String(data.email || ""),
    website: String(data.url || ""),
    address: String(data.address || ""),
    logo,
    cardUrl,
    qrSrc: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=${encodeURIComponent(cardUrl)}`,
    socials: readSocialLinks(data as Record<string, unknown>)
      .map((l) => ({ platform: l.platform, label: SOCIAL_BY_KEY[l.platform]?.label || l.platform, url: l.url }))
      .slice(0, 6),
  }), [data, logo, cardUrl]);

  const opts: SignatureOptions = { accent, showLogo, showQr, showSocials, showAddress, tagline: tagline.trim() };
  const html = useMemo(() => buildSignature(templateId, sig, opts), [templateId, sig, accent, showLogo, showQr, showSocials, showAddress, tagline]);
  const plain = useMemo(() => buildSignatureText(sig, opts), [sig, showAddress, showSocials, tagline]);
  const active = SIGNATURE_TEMPLATES.find((t) => t.id === templateId);

  /* Every design rendered at once for the picker thumbnails. Cheap — these are
     string builds, not network calls — and it means the grid shows the customer
     THEIR signature in each layout, with their own colour and toggles applied,
     instead of a stock screenshot that never matches what they get. */
  const thumbs = useMemo(() => Object.fromEntries(
    SIGNATURE_TEMPLATES.map((t) => [t.id, buildSignature(t.id, sig, opts)]),
  ) as Record<string, string>, [sig, accent, showLogo, showQr, showSocials, showAddress, tagline]);

  // A signature with no name/contact is worse than none — point them at the editor.
  const missing = [!sig.name && "your name", !sig.phone && "a phone number", !sig.email && "an email"].filter(Boolean) as string[];

  const doCopy = async () => {
    const ok = await copyRichHtml(html, plain);
    if (ok) { setCopied("rich"); toast.success("Signature copied — now paste it into your email settings"); setTimeout(() => setCopied(null), 2200); }
    else toast.error("Copy failed — use \"Copy HTML\" and paste that instead");
  };

  const doCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied("html"); toast.success("HTML copied"); setTimeout(() => setCopied(null), 2200);
    } catch { toast.error("Copy failed"); }
  };

  const Toggle = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => (
    <button onClick={() => set(!on)} type="button"
      className={`flex items-center gap-2 h-9 px-3 rounded-xl text-[13px] font-semibold transition-colors ${on ? "bg-[#FEF3C7] text-[#92400E] ring-1 ring-[#FDE68A]" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}>
      <span className={`w-4 h-4 rounded-md flex items-center justify-center ${on ? "bg-[#F7B31C]" : "bg-white ring-1 ring-[#CBD5E1]"}`}>
        {on && <Check size={11} className="text-[#0F172A]" />}
      </span>
      {label}
    </button>
  );

  return (
    <ModuleShell title="Email Signature" subtitle="Put your card link at the bottom of every email you send" icon={PenLine}
      /* No phone preview: this page shows the signature itself, and a card
         mock-up beside it competes with the thing being previewed. */
      preview={false} wide>

      {missing.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3">
          <AlertTriangle size={16} className="text-[#DC2626] mt-0.5 shrink-0" />
          <p className="text-xs text-[#991B1B]">
            Your card is still missing {missing.join(", ")}. The signature is built from your card, so
            {" "}<Link to="/dashboard/build" className="underline font-semibold">fill that in first</Link>.
          </p>
        </div>
      )}

      {/* Two columns on desktop: choose on the left, the live result stays put
          on the right. Picking a design is a compare-and-contrast job, so the
          preview must never scroll out of view while you browse. */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_430px] gap-4 sm:gap-5 items-start">

        {/* ── Left: designs and options ── */}
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <Panel title="Choose a design" subtitle={`${SIGNATURE_TEMPLATES.length} layouts, every one built from the details already on your card`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SIGNATURE_TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => setTemplateId(t.id)}
                  aria-pressed={templateId === t.id}
                  className={`group text-left rounded-2xl overflow-hidden transition-all ${
                    templateId === t.id
                      ? "ring-2 ring-[#F7B31C] bg-[#FFFBEB] shadow-premium"
                      : "ring-1 ring-[#E2E8F0] bg-white hover:ring-[#F7B31C]/60 hover:shadow-premium"}`}>
                  {/* A real, scaled-down render — you pick by looking, not by
                      reading a description of what it might look like. */}
                  <div className="h-[132px] bg-white border-b border-[#F1F5F9] overflow-hidden relative">
                    <div className="absolute inset-0 origin-top-left pointer-events-none"
                      style={{ transform: "scale(0.46)", width: "217%", padding: "14px 16px" }}
                      dangerouslySetInnerHTML={{ __html: thumbs[t.id] }} />
                  </div>
                  <div className="px-3 py-2.5 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-[#0F172A] leading-tight">{t.name}</p>
                      <p className="text-[11px] text-[#64748B] leading-snug mt-0.5">{t.blurb}</p>
                    </div>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      templateId === t.id ? "bg-[#F7B31C]" : "bg-[#F1F5F9] group-hover:bg-[#E2E8F0]"}`}>
                      {templateId === t.id && <Check size={12} className="text-[#0F172A]" />}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="What to include">
            <div className="flex flex-wrap gap-2">
              <Toggle on={showLogo} set={setShowLogo} label="Logo" />
              <Toggle on={showQr} set={setShowQr} label="QR code" />
              <Toggle on={showSocials} set={setShowSocials} label="Social links" />
              <Toggle on={showAddress} set={setShowAddress} label="Address" />
            </div>

            {showLogo && logoIsEmbedded && (
              <div className="flex items-start gap-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2.5 mt-3">
                <Info size={14} className="text-[#B45309] mt-0.5 shrink-0" />
                <p className="text-[11px] text-[#92400E] leading-snug">
                  Your logo is stored inside the card rather than as a web address. Gmail and Apple Mail usually
                  re-upload it when you paste, but Outlook may drop it — if it disappears, turn the logo off or
                  use the Plain text design.
                </p>
              </div>
            )}

            <div className="mt-4">
              <p className="text-[11px] font-semibold text-[#334155] mb-2">Accent colour</p>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((c) => (
                  <button key={c} type="button" onClick={() => setAccent(c)} aria-label={`Accent ${c}`}
                    className={`w-8 h-8 rounded-lg transition-transform ${accent === c ? "ring-2 ring-offset-2 ring-[#0F172A] scale-105" : "ring-1 ring-[#E2E8F0] hover:scale-105"}`}
                    style={{ background: c }} />
                ))}
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-2">Monochrome ignores this — that design is black and white by definition.</p>
            </div>

            <div className="mt-4 max-w-lg">
              <Field label="Tagline under the link" hint="Leave empty to hide it">
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={fieldCls} maxLength={90} />
              </Field>
            </div>
          </Panel>

          <Panel title="Where to paste it" subtitle="One-time setup per email account">
            <div className="divide-y divide-[#F1F5F9]">
              {HOW_TO.map((h, i) => (
                <div key={h.client}>
                  <button type="button" onClick={() => setOpenHelp(openHelp === i ? null : i)}
                    className="w-full flex items-center justify-between py-3 text-left">
                    <span className="text-[13px] font-semibold text-[#0F172A]">{h.client}</span>
                    <ChevronDown size={16} className={`text-[#94A3B8] transition-transform ${openHelp === i ? "rotate-180" : ""}`} />
                  </button>
                  {openHelp === i && (
                    <ol className="pb-3 pl-1 space-y-1.5">
                      {h.steps.map((s, k) => (
                        <li key={k} className="flex gap-2.5 text-[12px] text-[#475569] leading-snug">
                          <span className="w-4 h-4 rounded-full bg-[#F1F5F9] text-[#64748B] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{k + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ── Right: the result, pinned ── */}
        <aside className="xl:sticky xl:top-6 space-y-3">
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0">
                  <Mail size={14} className="text-[#B45309]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#0F172A] truncate">{active?.name}</p>
                  <p className="text-[10px] text-[#94A3B8]">Exactly what lands in the inbox</p>
                </div>
              </div>
            </div>

            {/* A faux message footer, so it is judged in context. */}
            <div className="p-4 overflow-x-auto">
              <p className="text-[13px] text-[#94A3B8] mb-2">Thanks and regards,</p>
              <div ref={previewRef} dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </div>

          <button onClick={doCopy} type="button"
            className="w-full h-12 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98]">
            {copied === "rich" ? <><Check size={17} /> Copied — now paste it</> : <><Copy size={17} /> Copy signature</>}
          </button>

          <div className="flex gap-2">
            <button onClick={doCopyHtml} type="button"
              className="flex-1 h-10 rounded-xl bg-[#F1F5F9] text-[#334155] text-[12px] font-semibold flex items-center justify-center gap-2 hover:bg-[#E2E8F0] transition-colors">
              {copied === "html" ? <Check size={14} className="text-emerald-500" /> : <Code2 size={14} />} Copy HTML
            </button>
            <a href={cardUrl} target="_blank" rel="noreferrer"
              className="flex-1 h-10 rounded-xl bg-[#F1F5F9] text-[#334155] text-[12px] font-semibold flex items-center justify-center gap-2 hover:bg-[#E2E8F0] transition-colors">
              <ExternalLink size={14} /> Open my card
            </a>
          </div>

          <p className="text-[11px] text-[#94A3B8] leading-snug">
            “Copy signature” keeps the formatting — paste it straight into your email signature box.
            “Copy HTML” is the raw code, for signature editors that ask for HTML.
          </p>
        </aside>
      </div>
    </ModuleShell>
  );
}
