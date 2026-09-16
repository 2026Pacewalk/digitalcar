import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  PenLine, Copy, Check, Code2, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight,
  ExternalLink, RotateCcw, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";
import ModuleShell from "@/components/customer/ModuleShell";
import { useCustomer, getActiveCardId, scopedKey, readCustomer } from "@/hooks/useCustomer";
import { trpc } from "@/providers/trpc";
import { readSocialLinks, SOCIAL_BY_KEY, type SocialPlatform } from "@/lib/socialPlatforms";
import { imgUrl } from "@/lib/cardContent";
import { copyRichHtml, copyText } from "@/lib/clipboard";
import FitToWidth from "@/components/mobile/FitToWidth";
import { haptic, useKeyboardOpen } from "@/lib/nativeApp";
import {
  SIGNATURE_TEMPLATES, buildSignature, buildSignatureText,
  type SignatureData, type SignatureOptions,
} from "@/lib/emailSignature";

const ORIGIN = "https://digitalcarda.in";
const ACCENTS = ["#E8590C", "#F7B31C", "#0F172A", "#1D4ED8", "#0F766E", "#7C3AED", "#DC2626", "#16A34A", "#DB2777"];
const SOCIAL_KEYS = ["facebook", "instagram", "linkedin", "x", "youtube", "whatsapp"];

const DEFAULT_DISCLAIMER =
  "This email and any files sent with it are confidential and meant only for the person or organisation " +
  "it is addressed to. If it reached you by mistake, please let the sender know and delete it. Please don't " +
  "copy, forward or share its contents without permission.";

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
    "OK. If the layout shifts, try Classic or Plain text — Outlook's Word renderer is the fussiest.",
  ]},
  { client: "Apple Mail (Mac)", steps: [
    "Mail → Settings → Signatures.",
    "Pick your account, press + for a new signature.",
    "Untick \"Always match my default message font\", then paste.",
  ]},
];

type Picture = "photo" | "logo" | "link" | "none";
type Fields = {
  first: string; last: string; email: string;
  picture: Picture; pictureLink: string;
  company: string; designation: string;
  phone: string; whatsapp: string; address: string; website: string;
  socials: Record<string, string>;
  tagline: string; disclaimer: string;
};
type Saved = {
  v: 1;
  fields: Fields;
  templateId: string;
  accent: string;
  showPhoto: boolean; showLogo: boolean; showQr: boolean;
  showSocials: boolean; showAddress: boolean; showDisclaimer: boolean;
};

const str = (v: unknown) => String(v ?? "").trim();

/* Everything starts from the card, so a customer sees their own signature the
   moment the page opens — then any field can be changed for the signature
   alone, without touching the card. */
function fromCard(c: Record<string, unknown>): Saved {
  const [first = "", ...rest] = str(c.name).split(/\s+/).filter(Boolean);
  const socials: Record<string, string> = {};
  for (const l of readSocialLinks(c)) if (l.url && !socials[l.platform]) socials[l.platform] = l.url;
  return {
    v: 1,
    fields: {
      first, last: rest.join(" "), email: str(c.email),
      picture: str(c.photo) ? "photo" : str(c.logo) ? "logo" : "none", pictureLink: "",
      company: str(c.company_name), designation: str(c.designation),
      phone: str(c.mobile1), whatsapp: str(c.mobile2) || str(c.mobile1),
      address: str(c.address), website: str(c.url),
      socials,
      tagline: "Save my contact, see my services and pay — all from one link.",
      disclaimer: DEFAULT_DISCLAIMER,
    },
    templateId: "classic",
    accent: "#E8590C",
    showPhoto: true, showLogo: true, showQr: false,
    showSocials: true, showAddress: true, showDisclaimer: true,
  };
}

function loadSaved(key: string): Saved | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && p.v === 1 && p.fields ? (p as Saved) : null;
  } catch { return null; }
}

/* Mail clients refuse data: URIs in <img>, and uploaded card images are stored
   as data: URIs. Point the signature at the server's copy of the SAME image
   (/sig-img), versioned by content so a new upload is never served stale. */
const IS_LOCAL = typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const IMG_BASE = IS_LOCAL ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/sig-img` : `${ORIGIN}/sig-img`;

function contentVersion(v: string): string {
  let h = 5381;
  const t = `${v.length}:${v.slice(0, 256)}${v.slice(-256)}`;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function webImage(value: string, slug: string, kind: "photo" | "logo"): string {
  const v = str(value);
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^data:image\//i.test(v)) {
    return slug ? `${IMG_BASE}/${encodeURIComponent(slug)}/${kind}.${kind === "photo" ? "jpg" : "png"}?v=${contentVersion(v)}` : "";
  }
  return kind === "logo" ? imgUrl("home", v) : "";
}

/* ── Compact form pieces ─────────────────────────────────────────────────────
   Defined outside the page component so typing never remounts an input (which
   would drop focus after every keystroke). Sized for density: the panel sits
   beside a large preview, so it should show as many fields as possible at once. */
const inputCls = "w-full bg-transparent text-[13px] leading-5 text-[#0F172A] outline-none placeholder:text-[#A0AEC0]";
const boxCls = "block rounded-lg border border-[#D9E0EA] bg-white px-2.5 pb-1.5 pt-1 transition focus-within:border-[#F7B31C] focus-within:ring-2 focus-within:ring-[#F7B31C]/20";

function TextBox({ label, value, onChange, placeholder, type = "text", className = "" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <label className={`${boxCls} ${className}`}>
      <span className="block text-[10px] font-semibold leading-4 text-[#64748B]">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </label>
  );
}

function AreaBox({ label, value, onChange, placeholder, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <label className={boxCls}>
      <span className="block text-[10px] font-semibold leading-4 text-[#64748B]">{label}</span>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`${inputCls} resize-y`} />
    </label>
  );
}

function Group({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <div className="flex min-h-[20px] items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function MiniSwitch({ on }: { on: boolean }) {
  return (
    <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${on ? "bg-[#F7B31C]" : "bg-[#CBD5E1]"}`}>
      <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${on ? "left-[14px]" : "left-0.5"}`} />
    </span>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className="flex h-8 items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-left transition-colors hover:border-[#CBD5E1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
      <span className="truncate text-[11.5px] font-medium text-[#334155]">{label}</span>
      <MiniSwitch on={on} />
    </button>
  );
}

function BrandIcon({ p, size }: { p: SocialPlatform; size: number }) {
  if (p.svg) {
    return <span style={{ width: size, height: size, display: "inline-flex" }}
      dangerouslySetInnerHTML={{ __html: p.svg.replace("<svg", `<svg width="${size}" height="${size}"`) }} />;
  }
  return <i className={p.fa} style={{ fontSize: size }} aria-hidden />;
}

/* One social link: the brand mark stands in for the label. */
function SocialBox({ p, value, onChange }: { p: SocialPlatform; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex h-9 items-center gap-2 rounded-lg border border-[#D9E0EA] bg-white pl-1.5 pr-2 transition focus-within:border-[#F7B31C] focus-within:ring-2 focus-within:ring-[#F7B31C]/20">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: p.color, color: p.fg || "#FFFFFF" }}>
        <BrandIcon p={p} size={11} />
      </span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={p.label} aria-label={`${p.label} link`}
        className="min-w-0 flex-1 bg-transparent text-[12px] text-[#0F172A] outline-none placeholder:text-[#A0AEC0]" />
    </label>
  );
}

export default function CustomerSignature() {
  const { data } = useCustomer();
  const rec = data as unknown as Record<string, unknown>;
  const { data: mine } = trpc.publish.mine.useQuery({ cardId: getActiveCardId() }, { retry: false });

  const storeKey = scopedKey("dc_signature_v1");
  const [st, setSt] = useState<Saved>(() => loadSaved(storeKey) ?? fromCard(readCustomer() as unknown as Record<string, unknown>));
  const [copied, setCopied] = useState<"rich" | "html" | null>(null);
  const [openHelp, setOpenHelp] = useState<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const typing = useKeyboardOpen();

  // Edits persist in this browser; the card itself is never changed from here.
  useEffect(() => {
    try { localStorage.setItem(storeKey, JSON.stringify(st)); } catch { /* storage full — keep in memory */ }
  }, [st, storeKey]);

  const f = st.fields;
  const setField = <K extends keyof Fields>(k: K, v: Fields[K]) => setSt((p) => ({ ...p, fields: { ...p.fields, [k]: v } }));
  const setSocial = (k: string, v: string) => setSt((p) => ({ ...p, fields: { ...p.fields, socials: { ...p.fields.socials, [k]: v } } }));
  const setOpt = <K extends keyof Saved>(k: K, v: Saved[K]) => setSt((p) => ({ ...p, [k]: v }));
  const resetToCard = () => {
    setSt((p) => ({ ...fromCard(readCustomer() as unknown as Record<string, unknown>), templateId: p.templateId, accent: p.accent }));
    toast.success("Details filled in again from your card");
  };

  const slug = str(mine?.slug || rec.slug);
  const cardUrl = slug ? `${ORIGIN}/${slug}` : "";
  const cardPhoto = webImage(str(rec.photo), slug, "photo");
  const cardLogo = webImage(str(rec.logo), slug, "logo");
  const picture = f.picture === "photo" ? cardPhoto : f.picture === "logo" ? cardLogo : f.picture === "link" ? str(f.pictureLink) : "";

  const socialKeys = useMemo(
    () => [...new Set([...SOCIAL_KEYS, ...Object.keys(f.socials)])].filter((k) => k !== "website" && !!SOCIAL_BY_KEY[k]),
    [f.socials],
  );

  const sig: SignatureData = useMemo(() => ({
    name: `${f.first} ${f.last}`.trim(),
    designation: f.designation, company: f.company,
    phone: f.phone, whatsapp: f.whatsapp, email: f.email, website: f.website, address: f.address,
    logo: cardLogo,
    photo: picture,
    cardUrl,
    qrSrc: cardUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=${encodeURIComponent(cardUrl)}` : "",
    socials: socialKeys
      .filter((k) => str(f.socials[k]))
      .map((k) => ({ platform: k, label: SOCIAL_BY_KEY[k]?.label || k, url: str(f.socials[k]) }))
      .slice(0, 6),
  }), [f, cardLogo, picture, cardUrl, socialKeys]);

  const opts: SignatureOptions = useMemo(() => ({
    accent: st.accent,
    showLogo: st.showLogo,
    showQr: st.showQr && !!cardUrl,
    showSocials: st.showSocials,
    showAddress: st.showAddress,
    showPhoto: st.showPhoto,
    tagline: str(f.tagline),
    disclaimer: st.showDisclaimer ? str(f.disclaimer) : "",
  }), [st.accent, st.showLogo, st.showQr, st.showSocials, st.showAddress, st.showPhoto, st.showDisclaimer, f.tagline, f.disclaimer, cardUrl]);

  const html = useMemo(() => buildSignature(st.templateId, sig, opts), [st.templateId, sig, opts]);
  const plain = useMemo(() => buildSignatureText(sig, opts), [sig, opts]);
  const designs = useMemo(() => SIGNATURE_TEMPLATES.map((t) => ({ ...t, html: buildSignature(t.id, sig, opts) })), [sig, opts]);
  const active = SIGNATURE_TEMPLATES.find((t) => t.id === st.templateId) || SIGNATURE_TEMPLATES[0];

  // Bring the chosen design into view in the strip on first load.
  useEffect(() => {
    const box = strip.current;
    const el = box?.querySelector<HTMLElement>(`[data-design="${st.templateId}"]`);
    if (box && el) box.scrollLeft = Math.max(0, el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missing = [!sig.name && "your name", !sig.phone && !sig.email && "a phone number or email"].filter(Boolean) as string[];

  const doCopy = async () => {
    if (await copyRichHtml(html, plain)) {
      setCopied("rich"); haptic("success"); toast.success("Signature copied — paste it into your email settings");
      setTimeout(() => setCopied(null), 2200);
    } else toast.error("Copy failed — use Copy HTML code instead");
  };
  const doCopyHtml = async () => {
    if (await copyText(html)) {
      setCopied("html"); haptic("success"); toast.success("HTML code copied");
      setTimeout(() => setCopied(null), 2200);
    } else toast.error("Copy failed");
  };
  const scrollStrip = (dir: number) => strip.current?.scrollBy({ left: dir * 520, behavior: "smooth" });

  const PICTURE_CHOICES: [Picture, string, boolean][] = [
    ["photo", "Photo", !cardPhoto],
    ["logo", "Logo", !cardLogo],
    ["link", "Link", false],
    ["none", "None", false],
  ];

  return (
    <ModuleShell title="Email Signature" subtitle="Put your card link at the bottom of every email you send" icon={PenLine}
      /* The signature is the preview here; a phone mock-up beside it would compete with it. */
      preview={false} wide>

      <p className="-mt-1 mb-4 hidden text-[13px] leading-relaxed text-[#475569] md:block">
        Build a professional email signature from your card. Change any detail, pick a design, then copy it into Gmail, Outlook or Apple Mail.
      </p>

      {missing.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#DC2626]" />
          <p className="text-xs text-[#991B1B]">
            Add {missing.join(" and ")} below — or <Link to="/dashboard/build" className="font-semibold underline">complete your card</Link> and press “Reset”.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-5">

        {/* ── Details (compact) ── */}
        <aside className="order-2 rounded-2xl border border-[#EEF2F7] bg-[#FBFCFE] p-3 lg:sticky lg:top-4 lg:order-1 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight text-[#0F172A]">Your details</p>
              <p className="truncate text-[10.5px] text-[#94A3B8]">Changes here affect only the signature</p>
            </div>
            <button type="button" onClick={resetToCard} title="Fill every field in again from your card"
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2 text-[11px] font-semibold text-[#334155] hover:border-[#F7B31C] hover:text-[#92400E]">
              <RotateCcw size={11} /> Reset
            </button>
          </div>

          <div className="space-y-3.5">
            <Group title="You">
              <div className="grid grid-cols-2 gap-1.5">
                <TextBox label="First name" value={f.first} onChange={(v) => setField("first", v)} placeholder="First" />
                <TextBox label="Last name" value={f.last} onChange={(v) => setField("last", v)} placeholder="Last" />
                <TextBox label="Designation" value={f.designation} onChange={(v) => setField("designation", v)} placeholder="Founder" />
                <TextBox label="Organisation" value={f.company} onChange={(v) => setField("company", v)} placeholder="Company" />
              </div>
            </Group>

            <Group title="Display picture">
              <div className="rounded-lg border border-[#D9E0EA] bg-white p-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#F1F5F9] ring-1 ring-[#E2E8F0]">
                    {picture ? <img src={picture} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={15} className="text-[#94A3B8]" />}
                  </span>
                  <div className="grid flex-1 grid-cols-4 gap-1 rounded-lg bg-[#F1F5F9] p-0.5" role="radiogroup" aria-label="Display picture">
                    {PICTURE_CHOICES.map(([k, label, disabled]) => {
                      const on = f.picture === k;
                      return (
                        <button key={k} type="button" role="radio" aria-checked={on} disabled={disabled}
                          title={disabled ? `Your card has no ${label.toLowerCase()} yet` : undefined}
                          onClick={() => setField("picture", k)}
                          className={`h-7 rounded-md text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            on ? "bg-[#0F172A] text-white shadow-sm" : "text-[#475569] hover:bg-white"}`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {f.picture === "link" && (
                  <input value={f.pictureLink} onChange={(e) => setField("pictureLink", e.target.value)}
                    placeholder="https://… public link to your photo" aria-label="Picture link"
                    className="mt-1.5 h-8 w-full rounded-md border border-[#E2E8F0] px-2.5 text-[12px] outline-none focus:border-[#F7B31C]" />
                )}
                {(f.picture === "photo" || f.picture === "logo") && (
                  <p className="mt-1.5 text-[10px] leading-snug text-[#94A3B8]">From your published card, so it shows in every inbox.</p>
                )}
              </div>
            </Group>

            <Group title="Contact">
              <TextBox label="Email" type="email" value={f.email} onChange={(v) => setField("email", v)} placeholder="you@business.com" />
              <div className="grid grid-cols-2 gap-1.5">
                <TextBox label="Phone" type="tel" value={f.phone} onChange={(v) => setField("phone", v)} placeholder="+91 …" />
                <TextBox label="WhatsApp" type="tel" value={f.whatsapp} onChange={(v) => setField("whatsapp", v)} placeholder="If different" />
              </div>
              <TextBox label="Website" value={f.website} onChange={(v) => setField("website", v)} placeholder="https://…" />
              <AreaBox label="Address" value={f.address} onChange={(v) => setField("address", v)} placeholder="Office address" rows={2} />
            </Group>

            <Group title="Social links">
              <div className="grid grid-cols-2 gap-1.5">
                {socialKeys.map((k) => SOCIAL_BY_KEY[k] && (
                  <SocialBox key={k} p={SOCIAL_BY_KEY[k]} value={f.socials[k] || ""} onChange={(v) => setSocial(k, v)} />
                ))}
              </div>
            </Group>

            <Group title="Disclaimer" right={
              <button type="button" role="switch" aria-checked={st.showDisclaimer} aria-label="Show disclaimer"
                onClick={() => setOpt("showDisclaimer", !st.showDisclaimer)} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                <MiniSwitch on={st.showDisclaimer} />
              </button>
            }>
              {st.showDisclaimer
                ? <AreaBox label="Confidentiality note" value={f.disclaimer} onChange={(v) => setField("disclaimer", v)} rows={3} />
                : <p className="text-[11px] text-[#94A3B8]">Off — no note under your signature.</p>}
            </Group>

            <Group title="Style">
              <div className="flex flex-wrap gap-2 md:gap-1.5">
                {ACCENTS.map((c) => (
                  <button key={c} type="button" onClick={() => setOpt("accent", c)} aria-label={`Accent colour ${c}`} aria-pressed={st.accent === c}
                    className={`h-8 w-8 rounded-lg transition-transform md:h-6 md:w-6 md:rounded-md ${st.accent === c ? "scale-105 ring-2 ring-[#0F172A] ring-offset-1" : "ring-1 ring-[#E2E8F0] hover:scale-105"}`}
                    style={{ background: c }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Toggle label="Picture" on={st.showPhoto} onChange={(v) => setOpt("showPhoto", v)} />
                <Toggle label="Logo" on={st.showLogo} onChange={(v) => setOpt("showLogo", v)} />
                <Toggle label="QR code" on={st.showQr} onChange={(v) => setOpt("showQr", v)} />
                <Toggle label="Social icons" on={st.showSocials} onChange={(v) => setOpt("showSocials", v)} />
                <Toggle label="Address" on={st.showAddress} onChange={(v) => setOpt("showAddress", v)} />
              </div>
              <TextBox label="Line under the card button" value={f.tagline} onChange={(v) => setField("tagline", v)} placeholder="Leave empty to hide" />
            </Group>
          </div>
        </aside>

        {/* ── Preview canvas + designs ── */}
        <section className="order-1 min-w-0 overflow-hidden rounded-2xl bg-[#ECEFF4] lg:order-2">
          <div className="px-2.5 pb-4 pt-3 sm:px-8 sm:pb-5 sm:pt-8">
            <div className="mx-auto max-w-[720px]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#334155] ring-1 ring-[#E2E8F0]">{active.name}</span>
                <span className="text-[11px] text-[#64748B]"><span className="md:hidden">Shown to fit · </span>Exactly what lands in the inbox</span>
              </div>
              <div className="rounded-xl bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_14px_34px_-14px_rgba(15,23,42,0.22)] sm:p-7">
                <FitToWidth>
                  <div dangerouslySetInnerHTML={{ __html: html }} />
                </FitToWidth>
              </div>

              <div className="mt-4 hidden flex-wrap items-center justify-center gap-2 md:flex">
                <button onClick={doCopy} type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-xl gradient-gold px-5 text-sm font-bold text-[#0F172A] transition-all hover:shadow-gold active:scale-[0.98]">
                  {copied === "rich" ? <><Check size={16} /> Copied — now paste it</> : <><Copy size={16} /> Copy signature</>}
                </button>
                <button onClick={doCopyHtml} type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-[#334155] ring-1 ring-[#E2E8F0] transition-colors hover:ring-[#CBD5E1]">
                  {copied === "html" ? <Check size={15} className="text-emerald-500" /> : <Code2 size={15} />} Copy HTML code
                </button>
                {cardUrl && (
                  <a href={cardUrl} target="_blank" rel="noreferrer"
                    className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold text-[#475569] hover:text-[#0F172A]">
                    <ExternalLink size={15} /> Open my card
                  </a>
                )}
              </div>
              <p className="mt-3 text-center text-[12px] leading-relaxed text-[#64748B]">
                Your edits are saved in this browser and change only the signature — your card stays as it is.
              </p>
            </div>
          </div>

          <div className="border-t border-[#DDE2EA] bg-white/70 pb-3 pt-3">
            <div className="mb-2 flex items-center justify-between px-4">
              <p className="text-[12px] font-bold text-[#0F172A]">
                Designs <span className="font-normal text-[#94A3B8]">· {SIGNATURE_TEMPLATES.length}</span>
              </p>
              <div className="hidden gap-1.5 md:flex">
                <button type="button" onClick={() => scrollStrip(-1)} aria-label="Previous designs"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#334155] ring-1 ring-[#E2E8F0] hover:ring-[#CBD5E1]"><ChevronLeft size={16} /></button>
                <button type="button" onClick={() => scrollStrip(1)} aria-label="More designs"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#334155] ring-1 ring-[#E2E8F0] hover:ring-[#CBD5E1]"><ChevronRight size={16} /></button>
              </div>
            </div>
            <div ref={strip} className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-smooth px-4 pb-1" role="listbox" aria-label="Signature designs">
              {designs.map((t) => {
                const on = t.id === st.templateId;
                return (
                  <button key={t.id} type="button" data-design={t.id} role="option" aria-selected={on} title={t.blurb}
                    onClick={() => setOpt("templateId", t.id)}
                    className={`w-[236px] shrink-0 snap-start overflow-hidden rounded-xl bg-white text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${
                      on ? "shadow-md ring-2 ring-[#F7B31C]" : "ring-1 ring-[#E2E8F0] hover:shadow hover:ring-[#CBD5E1]"}`}>
                    <div className="relative h-[146px] overflow-hidden border-b border-[#F1F5F9]">
                      {/* A real render of THEIR signature, scaled down — picked by looking. */}
                      <div className="pointer-events-none absolute left-0 top-0 origin-top-left"
                        style={{ width: 590, padding: 18, transform: "scale(0.4)" }}
                        dangerouslySetInnerHTML={{ __html: t.html }} />
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="truncate text-[12px] font-semibold text-[#0F172A]">{t.name}</span>
                      {on && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#F7B31C]"><Check size={10} className="text-[#0F172A]" /></span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-5 rounded-2xl border border-[#F1F5F9] bg-white px-4 shadow-premium">
        <p className="pb-1 pt-3 text-[13px] font-bold text-[#0F172A]">Where to paste it</p>
        <div className="divide-y divide-[#F1F5F9]">
          {HOW_TO.map((h, i) => (
            <div key={h.client}>
              <button type="button" onClick={() => setOpenHelp(openHelp === i ? null : i)} aria-expanded={openHelp === i}
                className="flex w-full items-center justify-between py-3 text-left">
                <span className="text-[13px] font-semibold text-[#334155]">{h.client}</span>
                <ChevronDown size={16} className={`text-[#94A3B8] transition-transform ${openHelp === i ? "rotate-180" : ""}`} />
              </button>
              {openHelp === i && (
                <ol className="space-y-1.5 pb-3 pl-1">
                  {h.steps.map((s, k) => (
                    <li key={k} className="flex gap-2.5 text-[12px] leading-snug text-[#475569]">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[10px] font-bold text-[#64748B]">{k + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Room so the last section isn't hidden behind the action bar */}
      <div className="h-16 md:hidden" />
      <div className={`dc-bar fixed inset-x-0 z-40 px-3 md:hidden ${typing ? "dc-bar-hidden" : ""}`}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 70px)" }}>
        <div className="mx-auto flex max-w-lg items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-[0_14px_36px_-14px_rgba(2,6,23,0.45)] ring-1 ring-[#E2E8F0] backdrop-blur-xl">
          <button onClick={doCopy} type="button"
            className="dc-press inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl gradient-gold text-[14px] font-bold text-[#0F172A]">
            {copied === "rich" ? <><Check size={16} /> Copied — now paste it</> : <><Copy size={16} /> Copy signature</>}
          </button>
          <button onClick={doCopyHtml} type="button" aria-label="Copy HTML code"
            className="dc-press inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#F1F5F9] px-3 text-[13px] font-semibold text-[#334155]">
            {copied === "html" ? <Check size={15} className="text-emerald-500" /> : <Code2 size={15} />} HTML
          </button>
          {cardUrl && (
            <a href={cardUrl} target="_blank" rel="noreferrer" aria-label="Open my card"
              className="dc-press inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#334155]">
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
    </ModuleShell>
  );
}
