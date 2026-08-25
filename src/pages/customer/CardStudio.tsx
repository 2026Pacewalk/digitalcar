import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Wand2, User, Building2, Phone, MessageCircle, Mail, Globe, MapPin, Info, Palette,
  Eye, Check, Loader2, CloudOff, Rocket, X, ChevronRight, Gift, CalendarClock, Copy, Link2,
  Image as ImageIcon, LayoutGrid, Sparkles, Circle, Square, Briefcase,
} from "lucide-react";
import ModuleShell, { Field, fieldCls, areaCls, ImagePick } from "@/components/customer/ModuleShell";
import PublishModal from "@/components/customer/PublishModal";
import { useCustomer, useLocalList, getActiveCardId } from "@/hooks/useCustomer";
import { useValidityDays } from "@/hooks/useValidityDays";
import { contentSeeder } from "@/lib/cardContent";
import { buildCardHtml } from "@/card-template/buildCard";
import { BG_PRESETS } from "@/card-template/cardBackground";
import SectionArranger from "@/components/customer/SectionArranger";
import { extractBrandColors, brandSecondaryFor } from "@/lib/brandColors";
import { trpc } from "@/providers/trpc";
import { logFunnel } from "@/lib/funnel";

type Product = { id: number; name: string; filename: string; price: string; offer_price: string; description: string; button: string; button_title: string };
type Gallery = { id: number; name: string; filename: string };
type Vid = { id: number; title: string; url: string };
type Offer = { id: number; title: string; description: string; valid: string; filename: string };
type Qr = { id: number; name: string; filename: string };

type ToolKey = "basics" | "contact" | "about" | "design" | "background" | "sections";

const PROGRESS_FIELDS = ["logo", "name", "designation", "company_name", "mobile1", "email", "address", "about_us"];
const COLORS = ["#F7B31C", "#3B82F6", "#16A34A", "#A21CAF", "#EF4444", "#06B6D4", "#F97316", "#EC4899", "#0F172A"];

export default function CardStudio() {
  const navigate = useNavigate();
  const { data, update } = useCustomer();
  const products = useLocalList<Product>("dc_products", [], contentSeeder("products"));
  const gallery = useLocalList<Gallery>("dc_gallery", [], contentSeeder("gallery"));
  const videos = useLocalList<Vid>("dc_videos", [], contentSeeder("videos"));
  const offers = useLocalList<Offer>("dc_offers", [], contentSeeder("offers"));
  const qrcodes = useLocalList<Qr>("dc_qrcode", [], contentSeeder("qrcodes"));
  const { data: program } = trpc.referral.myProgram.useQuery();
  const { data: trialState } = trpc.trial.me.useQuery(undefined, { retry: false });
  const startTrial = trpc.trial.start.useMutation();
  const saveSnapshot = trpc.publish.saveSnapshot.useMutation();
  const utils = trpc.useUtils();

  const pkgId = Number(data.package_id);
  const paidPlanName = pkgId === 6 ? "Platinum" : pkgId === 5 ? "Gold" : null;
  const { days: validityDays, active: validityActive } = useValidityDays(data.expired_on, pkgId === 7 ? 30 : 365, !!paidPlanName);

  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showPreview, setShowPreview] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolKey>("basics");
  const [sheetOpen, setSheetOpen] = useState(false);
  type TrialInfo = { daysLeft: number; endsAt: string | Date | null; status: string } | undefined;
  const [publishInfo, setPublishInfo] = useState<{ first: boolean; trial: TrialInfo } | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [realViews, setRealViews] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
  const formRef = useRef(form); formRef.current = form;

  const val = (k: string) => (form[k] !== undefined ? form[k] : String(data[k] ?? ""));
  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try { update(formRef.current); setStatus("saved"); }
      catch { setStatus("error"); }
    }, 700);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Live preview — rebuilt a beat after edits so typing stays smooth. Uses the
  // REAL view count (base + tracked, from /api/views) so the preview matches the
  // public card rather than the raw stored field.
  const merged = useMemo(() => ({ ...data, ...form, referral_code: program?.code || "", ...(realViews != null ? { views: realViews } : {}) }), [data, form, program?.code, realViews]);
  useEffect(() => {
    const t = setTimeout(() => {
      setPreviewHtml(buildCardHtml(merged as Parameters<typeof buildCardHtml>[0], products.items, gallery.items, videos.items, offers.items, qrcodes.items, []));
    }, 300);
    return () => clearTimeout(t);
  }, [merged, products.items, gallery.items, videos.items, offers.items, qrcodes.items]);

  // Learn brand colours from the uploaded logo (client-side).
  const logoVal = val("logo");
  useEffect(() => {
    if (!logoVal) return;
    let cancelled = false;
    extractBrandColors(logoVal).then((cols) => {
      if (cancelled || !cols.length) return;
      const joined = cols.join(",");
      if (formRef.current.brand_colors === joined || String(data.brand_colors || "") === joined) return;
      set("brand_colors", joined);
    });
    return () => { cancelled = true; };
  }, [logoVal]); // eslint-disable-line react-hooks/exhaustive-deps
  const brandColors = String(val("brand_colors") || "").split(",").map((x) => x.trim()).filter(Boolean);

  const progress = useMemo(() => {
    const filled = PROGRESS_FIELDS.filter((k) => String((form[k] ?? data[k]) || "").trim()).length;
    return Math.round((filled / PROGRESS_FIELDS.length) * 100);
  }, [form, data]);

  const cur = (k: string) => String((form[k] ?? data[k]) || "").trim();
  const slug = String(data.slug || data.username || "your-card");
  // Real view total (base + tracked) so the preview count matches the live card.
  useEffect(() => {
    if (!slug || slug === "your-card") return;
    let cancelled = false;
    fetch(`/api/views/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j && typeof j.views === "number") setRealViews(j.views); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug]);
  const cardUrl = `https://digitalcarda.in/${slug}`;
  const [linkCopied, setLinkCopied] = useState(false);
  const copyLink = async () => { try { await navigator.clipboard.writeText(cardUrl); setLinkCopied(true); toast.success("Card link copied"); setTimeout(() => setLinkCopied(false), 1800); } catch { toast.error("Copy failed"); } };

  const publish = async () => {
    if (!cur("name")) { toast.error("Add your name before publishing."); return; }
    if (!["mobile1", "mobile2", "email"].some((k) => cur(k))) {
      toast.error("Add at least one contact — phone, WhatsApp or email — before publishing."); return;
    }
    const first = Number(data.published) !== 1;
    if (timer.current) clearTimeout(timer.current);
    update({ ...formRef.current, published: 1, published_on: String(data.published_on || new Date().toISOString().slice(0, 10)) });
    setStatus("saved");
    if (first) logFunnel("published", String(data.product_slug || ""));
    try {
      await saveSnapshot.mutateAsync({ slug, cardId: getActiveCardId(), data: {
        customer: { ...data, ...formRef.current, referral_code: program?.code || "" },
        products: products.items, gallery: gallery.items, videos: videos.items, offers: offers.items, qrcodes: qrcodes.items,
      } });
    } catch (e) {
      const msg = (e as { message?: string })?.message || "";
      if (/taken/i.test(msg)) { toast.error("That card link is already taken — pick another in Settings."); return; }
    }
    let trial: TrialInfo;
    try {
      const res = await startTrial.mutateAsync({ productId: Number(data.product_id) || undefined });
      trial = { daysLeft: res.daysLeft, endsAt: res.endsAt, status: res.status };
      utils.trial.me.invalidate();
    } catch { /* best-effort */ }
    setPublishInfo({ first, trial });
  };

  const SaveStatus = () => (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
      {status === "saving" ? <><Loader2 size={13} className="animate-spin text-[#94A3B8]" /> <span className="text-[#94A3B8]">Saving…</span></>
        : status === "error" ? <><CloudOff size={13} className="text-red-500" /> <span className="text-red-500">Unable to save</span></>
        : status === "saved" ? <><Check size={13} className="text-emerald-500" /> <span className="text-emerald-600">Saved</span></>
        : <span className="text-[#CBD5E1]">Auto-save on</span>}
    </span>
  );

  const PublishBtn = ({ full }: { full?: boolean }) => (
    <button onClick={publish} className={`inline-flex items-center justify-center gap-2 ${full ? "flex-1 h-11" : "h-9 px-4"} gradient-gold text-[#0F172A] rounded-xl text-sm font-bold hover:shadow-gold transition-all active:scale-[0.98]`}>
      <Rocket size={15} /> Publish
    </button>
  );

  /* ── Tool panels — one focused tool at a time (Canva-style) ── */

  const SHAPES: [string, string, typeof Circle][] = [["square", "Square", Square], ["round", "Round", Circle], ["plain", "Plain", Sparkles]];
  const bigField = "h-11 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[14px] text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all placeholder:text-[#94A3B8]";

  const renderBasics = () => (
    <div className="space-y-5">
      {/* Logo card (horizontal) */}
      <div className="rounded-2xl border border-[#EEF2F7] bg-[#F8FAFC] p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="flex flex-col items-center gap-2 shrink-0 mx-auto sm:mx-0">
          <div className="rounded-2xl ring-4 ring-white shadow-sm"><ImagePick value={val("logo")} onChange={(u) => set("logo", u)} className="w-24 h-24 rounded-2xl" label="Add logo" fit="contain" /></div>
          <span className="text-[11px] font-semibold text-[#64748B]">Logo or photo</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wide mb-1.5">Shape</span>
          <div className="grid grid-cols-3 gap-1.5 max-w-[300px]">
            {SHAPES.map(([v, label, Icon]) => {
              const on = (val("logo_shape") || "square") === v;
              return (
                <button key={v} type="button" onClick={() => set("logo_shape", v)} className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] font-semibold transition-all ${on ? "border-[#0F172A] bg-white text-[#0F172A] shadow-sm" : "border-[#E2E8F0] bg-white text-[#94A3B8] hover:border-[#CBD5E1]"}`}>
                  <Icon size={15} /> {label}
                </button>
              );
            })}
          </div>
          <div className="mt-3.5 max-w-[300px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wide">Logo size</span>
              <span className="text-[11px] font-bold text-[#0F172A] tabular-nums px-1.5 py-0.5 rounded-md bg-[#FEF3C7]">{val("logo_size") || 100}%</span>
            </div>
            <input type="range" min={70} max={160} value={Number(val("logo_size") || 100)} onChange={(e) => set("logo_size", e.target.value)} className="w-full accent-[#F7B31C]" aria-label="Logo size" />
            <p className="text-[10px] text-[#94A3B8] mt-1 leading-snug">Plain shows a transparent PNG; shrink so the full logo fits the shape.</p>
          </div>
        </div>
      </div>

      {/* Fields (full width) */}
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-[#334155] mb-1.5">Full name</label>
          <div className="relative"><User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("name")} onChange={(e) => set("name", e.target.value)} className={`${bigField} pl-10 pr-3 font-semibold`} placeholder="e.g. Shekhar Jain" /></div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#334155] mb-1.5">Designation</label>
          <div className="relative"><Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("designation")} onChange={(e) => set("designation", e.target.value)} className={`${bigField} pl-10 pr-3`} placeholder="e.g. Managing Director" /></div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#334155] mb-1.5">Company</label>
          <div className="relative"><Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("company_name")} onChange={(e) => set("company_name", e.target.value)} className={`${bigField} pl-10 pr-3`} placeholder="Your company name" /></div>
        </div>
        <p className="text-[11px] text-[#94A3B8] flex items-start gap-1.5"><Sparkles size={12} className="text-[#F7B31C] mt-0.5 shrink-0" /> Your name &amp; company show on the card banner — keep them short and clear.</p>
      </div>

      {/* Photo & card details — for the premium Business / ID / Membership card designs */}
      <div className="pt-4 border-t border-[#F1F5F9]">
        <span className="block text-[12px] font-bold text-[#0F172A]">Photo &amp; card details</span>
        <p className="text-[11px] text-[#94A3B8] mt-0.5 mb-3">For the premium Business / ID / Membership card designs.</p>
        <div className="flex items-start gap-4">
          <ImagePick value={val("photo")} onChange={(u) => set("photo", u)} className="w-20 h-20 rounded-xl" label="Photo" fit="cover" />
          <p className="flex-1 text-[11px] text-[#64748B] pt-0.5 min-w-0 leading-relaxed">A clear headshot shown on the ID, Membership &amp; Business-card designs. Your <b>company logo</b> is set above — both appear together on the card.</p>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8] mt-4 mb-2">ID card details</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Employee ID"><input value={val("employee_id")} onChange={(e) => set("employee_id", e.target.value)} className={fieldCls} placeholder="DBT001" /></Field>
          <Field label="Blood Group"><input value={val("blood_group")} onChange={(e) => set("blood_group", e.target.value)} className={fieldCls} placeholder="O+" /></Field>
          <Field label="Joining Date"><input value={val("joining_date")} onChange={(e) => set("joining_date", e.target.value)} className={fieldCls} placeholder="01 Jan 2020" /></Field>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8] mt-4 mb-2">Membership card details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Membership ID"><input value={val("membership_id")} onChange={(e) => set("membership_id", e.target.value)} className={fieldCls} placeholder="MEM2025" /></Field>
          <Field label="Membership Type"><input value={val("membership_type")} onChange={(e) => set("membership_type", e.target.value)} className={fieldCls} placeholder="Premium" /></Field>
          <Field label="Member Since"><input value={val("member_since")} onChange={(e) => set("member_since", e.target.value)} className={fieldCls} placeholder="01 Jan 2025" /></Field>
          <Field label="Valid Till"><input value={val("valid_till")} onChange={(e) => set("valid_till", e.target.value)} className={fieldCls} placeholder="31 Dec 2025" /></Field>
        </div>
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Call number"><div className="relative"><Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("mobile1")} onChange={(e) => set("mobile1", e.target.value)} className={`${fieldCls} pl-9`} placeholder="+91 XXXXX XXXXX" /></div></Field>
      <Field label="WhatsApp number"><div className="relative"><MessageCircle size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("mobile2")} onChange={(e) => set("mobile2", e.target.value)} className={`${fieldCls} pl-9`} placeholder="+91 XXXXX XXXXX" /></div></Field>
      <Field label="Email" full><div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("email")} onChange={(e) => set("email", e.target.value)} className={`${fieldCls} pl-9`} placeholder="you@example.com" /></div></Field>
      <Field label="Website" full><div className="relative"><Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("url")} onChange={(e) => set("url", e.target.value)} className={`${fieldCls} pl-9`} placeholder="https://yourbusiness.com" /></div></Field>
      <Field label="Address" full><div className="relative"><MapPin size={15} className="absolute left-3 top-3 text-[#94A3B8]" /><textarea value={val("address")} onChange={(e) => set("address", e.target.value)} className={`${areaCls} pl-9`} placeholder="Business address" /></div></Field>
    </div>
  );

  const renderAbout = () => (
    <div className="grid grid-cols-1 gap-4">
      <Field label="Business nature"><div className="relative"><Info size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("nature")} onChange={(e) => set("nature", e.target.value)} className={`${fieldCls} pl-9`} placeholder="e.g. Real Estate Advisory" /></div></Field>
      <Field label="About us"><textarea value={val("about_us")} onChange={(e) => set("about_us", e.target.value)} className={areaCls} placeholder="A short line about what you do and why customers love you." /></Field>
    </div>
  );

  const renderDesign = () => (
    <div>
      {brandColors.length > 0 && (
        <div className="mb-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3">
          <div className="flex items-center gap-2 mb-2"><Sparkles size={14} className="text-[#B45309]" /><span className="text-[12px] font-semibold text-[#92400E]">Brand colours from your logo</span></div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              {brandColors.map((c) => (
                <button key={c} type="button" onClick={() => set("color", c)} title={c} className={`w-8 h-8 rounded-lg ring-2 transition-all ${val("color").toLowerCase() === c.toLowerCase() ? "ring-[#0F172A] scale-110" : "ring-white"}`} style={{ background: c }} aria-label={`Brand colour ${c}`} />
              ))}
            </div>
            <button type="button" onClick={() => { set("color", brandColors[0]); set("color2", brandSecondaryFor(brandColors[0], brandColors[1])); toast.success("Applied your brand colours"); }} className="h-9 px-3.5 rounded-lg bg-[#0F172A] text-white text-[12px] font-semibold hover:bg-[#1E293B] transition-colors">Use my brand colours</button>
          </div>
          <p className="text-[11px] text-[#B45309] mt-2">Tap a swatch to apply, or preview every template in your brand colours from <button type="button" onClick={() => navigate("/dashboard/templates?brand=1")} className="underline font-semibold">Templates</button>.</p>
        </div>
      )}
      <span className="block text-[11px] font-medium text-[#64748B] mb-1.5">Card colour</span>
      <div className="flex items-center gap-2 flex-wrap">
        {COLORS.map((c) => (
          <button key={c} onClick={() => set("color", c)} className={`w-9 h-9 rounded-xl ring-2 transition-all ${val("color").toLowerCase() === c.toLowerCase() ? "ring-[#0F172A] scale-110" : "ring-transparent"}`} style={{ background: c }} aria-label={`Colour ${c}`} />
        ))}
        <button onClick={() => navigate("/dashboard/templates")} className="h-9 px-3 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] inline-flex items-center gap-1.5">More designs <ChevronRight size={14} /></button>
      </div>

      <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[12px] font-semibold text-[#0F172A]">Text &amp; icon colours</span>
          {(val("text_color") || val("icon_color")) && (
            <button type="button" onClick={() => { set("text_color", ""); set("icon_color", ""); }} className="text-[11px] font-semibold text-[#94A3B8] hover:text-[#475569]">Reset to auto</button>
          )}
        </div>
        <div className="flex flex-wrap gap-5">
          {([["text_color", "Text"], ["icon_color", "Icons"]] as const).map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 text-[12px] font-medium text-[#64748B]">
              {label}
              <input type="color" value={val(field) || "#0F172A"} onChange={(e) => set(field, e.target.value)} className="w-9 h-8 rounded-lg border border-[#E2E8F0] bg-white cursor-pointer p-1" aria-label={`${label} colour`} />
              {!val(field) && <span className="text-[10px] text-[#94A3B8]">Auto</span>}
            </label>
          ))}
        </div>
        <p className="text-[11px] text-[#94A3B8] mt-2 leading-snug">Use these if any text or icon is hard to read after applying brand colours. “Auto” keeps each template's own colours.</p>
      </div>

      <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0"><span className="text-[12px] font-semibold text-[#0F172A]">Card layout</span><p className="text-[11px] text-[#94A3B8] mt-0.5 max-w-[230px] leading-snug">Compact collapses sections into tap-to-open accordions so a long card stays short.</p></div>
          <div className="inline-flex rounded-lg border border-[#E2E8F0] overflow-hidden text-[11px] font-semibold shrink-0">
            {([["", "Full"], ["compact", "Compact"]] as const).map(([v, label]) => {
              const active = (val("layout_mode") || "") === v;
              return <button key={v || "full"} type="button" onClick={() => set("layout_mode", v)} className={`px-3.5 h-8 transition-colors ${active ? "bg-[#0F172A] text-white" : "bg-white text-[#64748B] hover:bg-[#F8FAFC]"}`}>{label}</button>;
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#F1F5F9] space-y-3.5">
        {(() => {
          const paid = Number(data.package_id) === 5 || Number(data.package_id) === 6;
          const rows: [string, string, string, string][] = [
            ["views_on", "1", "View count", "Show how many times your card has been viewed."],
            ["cardqr_on", "1", "QR code", "Show a scannable QR of your card so visitors can open & save it."],
            ["share_on", "1", "Share button", "Show a share icon so visitors can send your card to others."],
          ];
          if (paid) rows.push(["badge_on", "1", "Plan badge", `Show your ${Number(data.package_id) === 6 ? "Platinum" : "Gold"} badge on your card logo.`]);
          return rows.map(([field, def, title, desc]) => {
            const on = (val(field) || def) !== "0";
            return (
              <div key={field} className="flex items-center gap-3">
                <button type="button" onClick={() => set(field, on ? "0" : "1")} className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${on ? "bg-[#F7B31C]" : "bg-[#E2E8F0]"}`} aria-label={`Toggle ${title}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                </button>
                <div><span className="text-sm font-medium text-[#0F172A]">{title}</span><p className="text-[11px] text-[#94A3B8]">{desc}</p></div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );

  const renderBackground = () => {
    const bgType = val("bg_type") || "theme";
    const TYPES = [["theme", "Template"], ["preset", "Presets"], ["solid", "Solid"], ["gradient", "Gradient"], ["image", "Photo"]] as const;
    const setType = (t: string) => set("bg_type", t === "theme" ? "" : t);
    const slider = (k: string, label: string, min: number, max: number, def: number, suffix: string) => (
      <div>
        <div className="flex items-center justify-between mb-1"><span className="text-[11px] font-medium text-[#64748B]">{label}</span><span className="text-[11px] tabular-nums text-[#94A3B8]">{val(k) || def}{suffix}</span></div>
        <input type="range" min={min} max={max} value={Number(val(k) || def)} onChange={(e) => set(k, e.target.value)} className="w-full accent-[#F7B31C]" />
      </div>
    );
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(([t, label]) => (
            <button key={t} type="button" onClick={() => setType(t)} className={`px-3 h-8 rounded-lg text-[12px] font-semibold transition-colors ${bgType === t ? "bg-[#0F172A] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}>{label}</button>
          ))}
        </div>
        {bgType === "theme" && <p className="text-[12px] text-[#94A3B8]">Using the template's built-in background. Pick another option above to customise it.</p>}
        {bgType === "preset" && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
            {BG_PRESETS.map((p) => {
              const active = val("bg_preset") === p.key;
              return (
                <button key={p.key} type="button" onClick={() => set("bg_preset", p.key)} title={p.label} className={`group relative rounded-xl overflow-hidden aspect-square ring-2 transition-all ${active ? "ring-[#0F172A] scale-[1.03]" : "ring-transparent hover:ring-[#CBD5E1]"}`}>
                  <span className="absolute inset-0" style={{ background: p.bg, backgroundSize: "cover" }} />
                  {active && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center"><Check size={11} className="text-[#0F172A]" /></span>}
                </button>
              );
            })}
          </div>
        )}
        {bgType === "solid" && (
          <div className="flex items-center gap-3">
            <input type="color" value={val("bg_color1") || "#0F172A"} onChange={(e) => set("bg_color1", e.target.value)} className="w-12 h-10 rounded-lg border border-[#E2E8F0] bg-white cursor-pointer p-1" />
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => set("bg_color1", c)} className={`w-8 h-8 rounded-lg ring-2 transition-all ${(val("bg_color1") || "").toLowerCase() === c.toLowerCase() ? "ring-[#0F172A] scale-110" : "ring-transparent"}`} style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </div>
        )}
        {bgType === "gradient" && (
          <div className="space-y-3">
            <div className="h-16 rounded-xl border border-[#E2E8F0]" style={{ background: `linear-gradient(${Number(val("bg_angle") || 160)}deg, ${val("bg_color1") || "#6d28d9"} 0%, ${val("bg_color2") || "#db2777"} 100%)` }} />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-[11px] font-medium text-[#64748B]">Start <input type="color" value={val("bg_color1") || "#6d28d9"} onChange={(e) => set("bg_color1", e.target.value)} className="w-10 h-9 rounded-lg border border-[#E2E8F0] bg-white cursor-pointer p-1" /></label>
              <label className="flex items-center gap-2 text-[11px] font-medium text-[#64748B]">End <input type="color" value={val("bg_color2") || "#db2777"} onChange={(e) => set("bg_color2", e.target.value)} className="w-10 h-9 rounded-lg border border-[#E2E8F0] bg-white cursor-pointer p-1" /></label>
            </div>
            {slider("bg_angle", "Direction", 0, 360, 160, "°")}
          </div>
        )}
        {bgType === "image" && (
          <div className="flex flex-col sm:flex-row gap-4">
            <ImagePick value={val("bg_image")} onChange={(u) => set("bg_image", u)} className="w-24 h-32" label="Upload photo" fit="cover" />
            <div className="flex-1 space-y-3 min-w-0">
              {slider("bg_dim", "Darken", 0, 80, 35, "%")}
              {slider("bg_blur", "Blur", 0, 24, 0, "px")}
              <p className="text-[11px] text-[#94A3B8]">A little darken keeps your name and buttons readable over the photo.</p>
            </div>
          </div>
        )}
        {bgType !== "theme" && <p className="text-[11px] text-[#94A3B8]">Custom backgrounds apply to the minimal “link-in-bio” templates. Buttons and text auto-adjust to stay readable.</p>}
      </div>
    );
  };

  const renderSections = () => (
    <div>
      <SectionArranger value={val("section_order")} onChange={(v) => set("section_order", v)} />
      <p className="text-[11px] text-[#94A3B8] mt-3">Order applies to full-page templates. Empty sections are skipped automatically; toggle sections on/off in Settings → Card Sections.</p>
    </div>
  );

  const TOOLS: { key: ToolKey; label: string; icon: typeof User; render: () => ReactNode }[] = [
    { key: "basics", label: "Basics", icon: User, render: renderBasics },
    { key: "contact", label: "Contact", icon: Phone, render: renderContact },
    { key: "about", label: "About", icon: Info, render: renderAbout },
    { key: "design", label: "Design", icon: Palette, render: renderDesign },
    { key: "background", label: "Background", icon: ImageIcon, render: renderBackground },
    { key: "sections", label: "Sections", icon: LayoutGrid, render: renderSections },
  ];
  const active = TOOLS.find((t) => t.key === activeTool) || TOOLS[0];
  const ActiveIcon = active.icon;

  const phoneMock = (h: number) => (
    <div className="relative rounded-[44px] bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-[9px] shadow-premium-lg ring-1 ring-black/5">
      <div className="absolute top-[9px] left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 h-6 px-4 rounded-b-2xl bg-[#0F172A]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#334155]" />
        <span className="w-12 h-1 rounded-full bg-[#334155]" />
      </div>
      <iframe srcDoc={previewHtml} title="Live preview" className="w-full rounded-[34px] bg-white border-0 block" style={{ height: h }} />
    </div>
  );

  return (
    <ModuleShell title="Card Builder" subtitle="Design your card — updates live" icon={Wand2}
      actions={<div className="flex items-center gap-3"><span className="hidden sm:inline-flex"><SaveStatus /></span><PublishBtn /></div>}>

      {/* Progress + card link (compact) */}
      <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold text-[#0F172A]">Your card is {progress}% ready</p>
            <p className="text-[11px] text-[#94A3B8]">{progress < 100 ? "Fill the basics to finish" : "Looking great — ready to publish!"}</p>
          </div>
          <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#F7B31C,#D97706)" }} />
          </div>
        </div>
        {paidPlanName ? (
          <div className="text-[12px] font-semibold">
            {validityActive
              ? <span className="inline-flex items-center gap-1.5 text-[#92400E]"><Gift size={14} className="text-[#F7B31C]" /> {paidPlanName} plan active · {validityDays} day{validityDays === 1 ? "" : "s"} left</span>
              : <span className="inline-flex items-center gap-1.5 text-red-600"><CalendarClock size={14} /> {paidPlanName} plan expired — renew to keep your card live</span>}
          </div>
        ) : trialState && trialState.status !== "not_started" ? (
          <div className="text-[12px] font-semibold">
            {trialState.status === "expired"
              ? <span className="inline-flex items-center gap-1.5 text-red-600"><CalendarClock size={14} /> Free trial ended — activate your plan to keep your card live</span>
              : <span className="inline-flex items-center gap-1.5 text-[#92400E]"><Gift size={14} className="text-[#F7B31C]" /> Free trial active · {trialState.daysLeft} day{trialState.daysLeft === 1 ? "" : "s"} left</span>}
          </div>
        ) : null}
        <div className="flex items-center gap-3 pt-1 border-t border-[#F1F5F9]">
          <span className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0 mt-3"><Link2 size={17} /></span>
          <div className="min-w-0 flex-1 mt-3">
            <p className="text-[11px] text-[#94A3B8]">Your card link</p>
            <a href={cardUrl} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-[#0F172A] truncate block hover:text-[#F7B31C] transition-colors">{cardUrl.replace(/^https?:\/\//, "")}</a>
          </div>
          <button onClick={copyLink} className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] inline-flex items-center gap-1.5 shrink-0 mt-3">{linkCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} Copy</button>
        </div>
      </div>

      {/* Canva-style editor */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-5 items-start">
        {/* Editor column */}
        <div className="order-2 lg:order-1 min-w-0 space-y-4">
          {/* Mobile canvas (tap for full preview) */}
          <div className="lg:hidden">
            <div className="mx-auto w-full max-w-[360px]">{phoneMock(500)}</div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <button onClick={() => setShowPreview(true)} className="text-[11px] font-semibold text-[#64748B] inline-flex items-center gap-1"><Eye size={12} /> Full preview</button>
              <span className="text-[#CBD5E1]">·</span>
              <a href={cardUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-[#64748B]">Open card</a>
            </div>
          </div>

          {/* Desktop tool tabs */}
          <div className="hidden lg:flex flex-wrap gap-1.5">
            {TOOLS.map((t) => {
              const on = t.key === active.key;
              const Icon = t.icon;
              return <button key={t.key} onClick={() => setActiveTool(t.key)} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-semibold transition-all ${on ? "bg-[#0F172A] text-white shadow-sm" : "bg-white border border-[#E2E8F0] text-[#475569] hover:border-[#CBD5E1]"}`}><Icon size={14} /> {t.label}</button>;
            })}
          </div>

          {/* Desktop active panel */}
          <div className="hidden lg:block bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#F1F5F9]">
              <span className="w-8 h-8 rounded-xl bg-[#FEF3C7] flex items-center justify-center"><ActiveIcon size={15} className="text-[#B45309]" /></span>
              <h3 className="text-[14px] font-bold text-[#0F172A]">{active.label}</h3>
            </div>
            {active.render()}
          </div>
        </div>

        {/* Desktop sticky preview */}
        <div className="hidden lg:block order-1 lg:order-2 sticky top-[100px]">
          <div className="mx-auto w-full max-w-[420px]">{phoneMock(720)}</div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live preview</span>
            <span className="text-[#CBD5E1]">·</span>
            <a href={cardUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-[#64748B] hover:text-[#F7B31C] inline-flex items-center gap-1">Open card <ChevronRight size={12} /></a>
          </div>
        </div>
      </div>

      {/* Mobile tool bar (fixed) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-[#E2E8F0]" style={{ paddingBottom: "max(0.3rem, env(safe-area-inset-bottom))" }}>
        <div className="flex gap-1 overflow-x-auto no-scrollbar px-2 pt-1.5">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const on = t.key === activeTool && sheetOpen;
            return (
              <button key={t.key} onClick={() => { setActiveTool(t.key); setSheetOpen(true); }} className="flex flex-col items-center gap-1 shrink-0 min-w-[62px] py-1.5">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${on ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#F1F5F9] text-[#64748B]"}`}><Icon size={17} /></span>
                <span className={`text-[10px] font-semibold ${on ? "text-[#B45309]" : "text-[#64748B]"}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div className={`lg:hidden fixed inset-0 z-[60] ${sheetOpen ? "" : "pointer-events-none"}`}>
        <div onClick={() => setSheetOpen(false)} className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${sheetOpen ? "opacity-100" : "opacity-0"}`} />
        <div className={`absolute bottom-0 inset-x-0 bg-[#F8FAFC] rounded-t-3xl shadow-premium-lg flex flex-col max-h-[85vh] transition-transform duration-300 ${sheetOpen ? "translate-y-0" : "translate-y-full"}`}>
          <div className="pt-3 flex justify-center shrink-0"><span className="w-10 h-1.5 rounded-full bg-[#CBD5E1]" /></div>
          <div className="px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-xl bg-[#FEF3C7] flex items-center justify-center"><ActiveIcon size={15} className="text-[#B45309]" /></span><h3 className="text-[15px] font-bold text-[#0F172A]">{active.label}</h3></div>
            <button onClick={() => setSheetOpen(false)} className="h-9 px-4 rounded-lg bg-[#0F172A] text-white text-[13px] font-semibold">Done</button>
          </div>
          <div className="overflow-y-auto px-4 pb-8 pt-1">{active.render()}</div>
        </div>
      </div>

      {/* Fullscreen preview */}
      {showPreview && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-[#0F172A] flex flex-col animate-fade-in">
          <div className="flex items-center justify-between h-14 px-4 shrink-0">
            <p className="text-sm font-bold text-white">Live Preview</p>
            <button onClick={() => setShowPreview(false)} className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center"><X size={18} /></button>
          </div>
          <iframe srcDoc={previewHtml} title="Live preview" className="flex-1 w-full bg-white border-0" />
        </div>
      )}

      {/* Clears the fixed mobile tool bar */}
      <div className="h-20 lg:hidden" />

      {publishInfo && (
        <PublishModal url={cardUrl} name={cur("name")} first={publishInfo.first} trial={publishInfo.trial}
          onClose={() => setPublishInfo(null)}
          onView={() => { setPublishInfo(null); navigate("/dashboard/view"); }} />
      )}
    </ModuleShell>
  );
}
