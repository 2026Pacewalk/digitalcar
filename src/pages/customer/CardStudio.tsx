import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Wand2, User, Building2, Phone, MessageCircle, Mail, Globe, MapPin, Info, Palette,
  Eye, Check, Loader2, CloudOff, Rocket, X, ChevronRight, Gift, CalendarClock, Copy, Link2,
} from "lucide-react";
import ModuleShell, { Panel, Field, fieldCls, areaCls, ImagePick } from "@/components/customer/ModuleShell";
import PublishModal from "@/components/customer/PublishModal";
import { useCustomer, useLocalList, getActiveCardId } from "@/hooks/useCustomer";
import { useValidityDays } from "@/hooks/useValidityDays";
import { contentSeeder } from "@/lib/cardContent";
import { buildCardHtml } from "@/card-template/buildCard";
import { trpc } from "@/providers/trpc";
import { logFunnel } from "@/lib/funnel";

type Product = { id: number; name: string; filename: string; price: string; offer_price: string; description: string; button: string; button_title: string };
type Gallery = { id: number; name: string; filename: string };
type Vid = { id: number; title: string; url: string };
type Offer = { id: number; title: string; description: string; valid: string; filename: string };
type Qr = { id: number; name: string; filename: string };

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

  // A paid-plan account (Gold/Platinum) shows its plan, not the trial banner —
  // matching the Profile page. Days-left comes from the shared validity source.
  const pkgId = Number(data.package_id);
  const paidPlanName = pkgId === 6 ? "Platinum" : pkgId === 5 ? "Gold" : null;
  const { days: validityDays, active: validityActive } = useValidityDays(data.expired_on, pkgId === 7 ? 30 : 365, !!paidPlanName);

  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showPreview, setShowPreview] = useState(false);
  type TrialInfo = { daysLeft: number; endsAt: string | Date | null; status: string } | undefined;
  const [publishInfo, setPublishInfo] = useState<{ first: boolean; trial: TrialInfo } | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const timer = useRef<number | null>(null);
  const formRef = useRef(form); formRef.current = form;

  const val = (k: string) => (form[k] !== undefined ? form[k] : String(data[k] ?? ""));
  // Autosave: persist to storage a moment after the last keystroke (§31).
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

  // Live preview — rebuilt a beat after edits so typing stays smooth.
  const merged = useMemo(() => ({ ...data, ...form, referral_code: program?.code || "" }), [data, form, program?.code]);
  useEffect(() => {
    const t = setTimeout(() => {
      setPreviewHtml(buildCardHtml(merged as Parameters<typeof buildCardHtml>[0], products.items, gallery.items, videos.items, offers.items, qrcodes.items, []));
    }, 300);
    return () => clearTimeout(t);
  }, [merged, products.items, gallery.items, videos.items, offers.items, qrcodes.items]);

  const progress = useMemo(() => {
    const filled = PROGRESS_FIELDS.filter((k) => String((form[k] ?? data[k]) || "").trim()).length;
    return Math.round((filled / PROGRESS_FIELDS.length) * 100);
  }, [form, data]);

  const cur = (k: string) => String((form[k] ?? data[k]) || "").trim();
  const slug = String(data.slug || data.username || "your-card");
  const cardUrl = `https://digitalcarda.in/${slug}`;
  const [linkCopied, setLinkCopied] = useState(false);
  const copyLink = async () => { try { await navigator.clipboard.writeText(cardUrl); setLinkCopied(true); toast.success("Card link copied"); setTimeout(() => setLinkCopied(false), 1800); } catch { toast.error("Copy failed"); } };

  // First publish is the primary activation event (§34): validate, START THE
  // TRIAL server-side (§5), then celebrate.
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
    // Snapshot the card to the server so the PUBLIC /slug page can render it
    // (content otherwise lives only in this browser).
    try {
      await saveSnapshot.mutateAsync({ slug, cardId: getActiveCardId(), data: {
        customer: { ...data, ...formRef.current, referral_code: program?.code || "" },
        products: products.items, gallery: gallery.items, videos: videos.items, offers: offers.items, qrcodes: qrcodes.items,
      } });
    } catch (e) {
      // A taken slug is the one error worth surfacing — the public URL must be unique.
      const msg = (e as { message?: string })?.message || "";
      if (/taken/i.test(msg)) { toast.error("That card link is already taken — pick another in Settings."); return; }
      /* otherwise best-effort — publish still succeeds */
    }
    // The trial clock is authoritative on the server — start it on first publish.
    let trial: TrialInfo;
    try {
      const res = await startTrial.mutateAsync({ productId: Number(data.product_id) || undefined });
      trial = { daysLeft: res.daysLeft, endsAt: res.endsAt, status: res.status };
      utils.trial.me.invalidate();
    } catch { /* trial display is best-effort; publish still succeeds */ }
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
    <button onClick={publish} className={`inline-flex items-center justify-center gap-2 ${full ? "flex-1 h-11" : "h-10 px-4"} gradient-gold text-[#0F172A] rounded-xl text-sm font-bold hover:shadow-gold transition-all active:scale-[0.98]`}>
      <Rocket size={16} /> Publish
    </button>
  );

  return (
    <ModuleShell title="Card Builder" subtitle="Fill your details — your card updates live" icon={Wand2}
      actions={<div className="hidden sm:flex items-center gap-3"><SaveStatus /><PublishBtn /></div>}>

      {/* Progress */}
      <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-semibold text-[#0F172A]">Your card is {progress}% ready</p>
          <p className="text-[11px] text-[#94A3B8]">{progress < 100 ? "Fill the highlighted basics to finish" : "Looking great — ready to publish!"}</p>
        </div>
        <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#F7B31C,#D97706)" }} />
        </div>
        {paidPlanName ? (
          <div className="mt-3 pt-3 border-t border-[#F1F5F9] text-[12px] font-semibold">
            {validityActive
              ? <span className="inline-flex items-center gap-1.5 text-[#92400E]"><Gift size={14} className="text-[#F7B31C]" /> {paidPlanName} plan active · {validityDays} day{validityDays === 1 ? "" : "s"} left</span>
              : <span className="inline-flex items-center gap-1.5 text-red-600"><CalendarClock size={14} /> {paidPlanName} plan expired — renew to keep your card live</span>}
          </div>
        ) : trialState && trialState.status !== "not_started" ? (
          <div className="mt-3 pt-3 border-t border-[#F1F5F9] text-[12px] font-semibold">
            {trialState.status === "expired"
              ? <span className="inline-flex items-center gap-1.5 text-red-600"><CalendarClock size={14} /> Free trial ended — activate your plan to keep your card live</span>
              : <span className="inline-flex items-center gap-1.5 text-[#92400E]"><Gift size={14} className="text-[#F7B31C]" /> Free trial active · {trialState.daysLeft} day{trialState.daysLeft === 1 ? "" : "s"} left</span>}
          </div>
        ) : null}
      </div>

      {/* Card link — the public URL for the card being edited */}
      <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-3.5 flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0"><Link2 size={17} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#94A3B8]">Your card link</p>
          <a href={cardUrl} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-[#0F172A] truncate block hover:text-[#F7B31C] transition-colors">{cardUrl.replace(/^https?:\/\//, "")}</a>
        </div>
        <button onClick={copyLink} className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] inline-flex items-center gap-1.5 shrink-0">{linkCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} Copy</button>
        <button onClick={() => navigate("/dashboard/settings?tab=password")} className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shrink-0 hidden sm:block">Edit link</button>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        {/* ── Form ── */}
        <div className="space-y-5 order-2 lg:order-1">
          <Panel title="The basics" subtitle="Who you are">
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="flex flex-col items-center sm:items-start gap-2 mx-auto sm:mx-0">
                <ImagePick value={val("logo")} onChange={(u) => set("logo", u)} className="w-24 h-24" label="Logo / Photo" fit="contain" />
                <div>
                  <span className="block text-[10px] font-medium text-[#94A3B8] mb-1">Logo shape</span>
                  <div className="inline-flex rounded-lg border border-[#E2E8F0] overflow-hidden text-[11px] font-semibold">
                    {([["square", "Square"], ["round", "Round"], ["plain", "Plain PNG"]] as const).map(([v, label]) => {
                      const active = (val("logo_shape") || "square") === v;
                      return <button key={v} type="button" onClick={() => set("logo_shape", v)} className={`px-3 h-7 transition-colors ${active ? "bg-[#0F172A] text-white" : "bg-white text-[#64748B] hover:bg-[#F8FAFC]"}`}>{label}</button>;
                    })}
                  </div>
                  <span className="block text-[10px] text-[#94A3B8] mt-1 max-w-[190px] leading-snug">Plain removes the circle/background so a transparent PNG shows on its own.</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 flex-1 min-w-0">
                <Field label="Name"><div className="relative"><User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("name")} onChange={(e) => set("name", e.target.value)} className={`${fieldCls} pl-9`} placeholder="Full name" /></div></Field>
                <Field label="Designation"><input value={val("designation")} onChange={(e) => set("designation", e.target.value)} className={fieldCls} placeholder="e.g. Founder / Managing Director" /></Field>
                <Field label="Company"><div className="relative"><Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("company_name")} onChange={(e) => set("company_name", e.target.value)} className={`${fieldCls} pl-9`} placeholder="Your company" /></div></Field>
              </div>
            </div>
          </Panel>

          <Panel title="How people reach you" subtitle="Only fill what you want shown">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Call number"><div className="relative"><Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("mobile1")} onChange={(e) => set("mobile1", e.target.value)} className={`${fieldCls} pl-9`} placeholder="+91 XXXXX XXXXX" /></div></Field>
              <Field label="WhatsApp number"><div className="relative"><MessageCircle size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("mobile2")} onChange={(e) => set("mobile2", e.target.value)} className={`${fieldCls} pl-9`} placeholder="+91 XXXXX XXXXX" /></div></Field>
              <Field label="Email" full><div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("email")} onChange={(e) => set("email", e.target.value)} className={`${fieldCls} pl-9`} placeholder="you@example.com" /></div></Field>
              <Field label="Website" full><div className="relative"><Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("url")} onChange={(e) => set("url", e.target.value)} className={`${fieldCls} pl-9`} placeholder="https://yourbusiness.com" /></div></Field>
              <Field label="Address" full><div className="relative"><MapPin size={15} className="absolute left-3 top-3 text-[#94A3B8]" /><textarea value={val("address")} onChange={(e) => set("address", e.target.value)} className={`${areaCls} pl-9`} placeholder="Business address" /></div></Field>
            </div>
          </Panel>

          <Panel title="About your business" subtitle="Optional — helps visitors trust you">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Business nature"><div className="relative"><Info size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("nature")} onChange={(e) => set("nature", e.target.value)} className={`${fieldCls} pl-9`} placeholder="e.g. Real Estate Advisory" /></div></Field>
              <Field label="About us"><textarea value={val("about_us")} onChange={(e) => set("about_us", e.target.value)} className={areaCls} placeholder="A short line about what you do and why customers love you." /></Field>
            </div>
          </Panel>

          <Panel title="Design" subtitle="Colours update instantly — full templates in Templates">
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} onClick={() => set("color", c)} className={`w-9 h-9 rounded-xl ring-2 transition-all ${val("color").toLowerCase() === c.toLowerCase() ? "ring-[#0F172A] scale-110" : "ring-transparent"}`} style={{ background: c }} aria-label={`Colour ${c}`} />
              ))}
              <button onClick={() => navigate("/dashboard/templates")} className="h-9 px-3 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] inline-flex items-center gap-1.5">More designs <ChevronRight size={14} /></button>
            </div>
            {(Number(data.package_id) === 5 || Number(data.package_id) === 6) && (
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#F1F5F9]">
                <button onClick={() => set("badge_on", val("badge_on") === "0" ? "1" : "0")} className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${val("badge_on") !== "0" ? "bg-[#F7B31C]" : "bg-[#E2E8F0]"}`} aria-label="Toggle plan badge">
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${val("badge_on") !== "0" ? "left-[22px]" : "left-0.5"}`} />
                </button>
                <div>
                  <span className="text-sm font-medium text-[#0F172A]">Plan badge</span>
                  <p className="text-[11px] text-[#94A3B8]">Show your {Number(data.package_id) === 6 ? "Platinum" : "Gold"} badge on your card logo.</p>
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* ── Live preview (desktop sticky) ── */}
        <div className="hidden lg:block order-1 lg:order-2 sticky top-4">
          <div className="rounded-[28px] bg-[#0F172A] p-2 shadow-premium-lg">
            <iframe srcDoc={previewHtml} title="Live preview" className="w-full h-[600px] rounded-[22px] bg-white border-0" />
          </div>
          <p className="text-center text-[11px] text-[#94A3B8] mt-2">Live preview · updates as you type</p>
        </div>
      </div>

      {/* ── Mobile: floating preview + sticky publish bar ── */}
      <button onClick={() => setShowPreview(true)} className="lg:hidden fixed right-4 bottom-24 z-30 w-14 h-14 rounded-full bg-[#0F172A] text-white shadow-premium-lg flex items-center justify-center active:scale-95" aria-label="Preview card"><Eye size={22} /></button>

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-[#E2E8F0] px-4 py-3 flex items-center gap-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <SaveStatus />
        <PublishBtn full />
      </div>

      {showPreview && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-[#0F172A] flex flex-col animate-fade-in">
          <div className="flex items-center justify-between h-14 px-4 shrink-0">
            <p className="text-sm font-bold text-white">Live Preview</p>
            <button onClick={() => setShowPreview(false)} className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center"><X size={18} /></button>
          </div>
          <iframe srcDoc={previewHtml} title="Live preview" className="flex-1 w-full bg-white border-0" />
        </div>
      )}

      <div className="h-16 lg:hidden" />

      {publishInfo && (
        <PublishModal url={cardUrl} name={cur("name")} first={publishInfo.first} trial={publishInfo.trial}
          onClose={() => setPublishInfo(null)}
          onView={() => { setPublishInfo(null); navigate("/dashboard/view"); }} />
      )}
    </ModuleShell>
  );
}
