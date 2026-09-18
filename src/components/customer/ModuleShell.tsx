import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { ImagePlus, Lightbulb, Eye, EyeOff, Smartphone, ChevronUp, ChevronDown, Move, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { fileToDataUrl, useCustomer, scopedKey } from "@/hooks/useCustomer";
import ImageAdjuster, { type AdjustOptions } from "@/components/customer/ImageAdjuster";
import NotificationBell from "@/components/NotificationBell";
import ProfileMenu from "@/components/ProfileMenu";
import CardSwitcher from "@/components/customer/CardSwitcher";
import { useMobileChrome } from "@/components/layout/MobileDashboardLayout";
import { JourneyStrip, JourneyContinue } from "@/components/customer/EditCardJourney";
import LivePreview from "@/components/customer/LivePreview";
import AppSheet from "@/components/mobile/AppSheet";
import { haptic, useKeyboardOpen } from "@/lib/nativeApp";

/* Auto-save status pill for module pages (no Save buttons — edits persist
   automatically; this shows the user that it happened). */
export function AutoSaveBadge({ status }: { status: "idle" | "saving" | "saved" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold border whitespace-nowrap shrink-0 ${
      status === "saving" ? "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]"
      : status === "saved" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : "bg-white border-[#E2E8F0] text-[#94A3B8]"}`}>
      {status === "saving" ? <><span className="w-3 h-3 border-2 border-[#D97706] border-t-transparent rounded-full animate-spin" /> Saving…</>
        : status === "saved" ? <>✓ Saved</>
        : "Auto-save on"}
    </span>
  );
}

/* Show/hide toggle for the card section this module edits — the same *_on flag
   as Settings → Card Sections, surfaced where the user is actually editing so
   they never have to hunt for it. Saves instantly (auto-publish picks it up). */
export function SectionToggle({ flag, label, def = 1 }: { flag: string; label: string; def?: 0 | 1 }) {
  const { data, update } = useCustomer();
  const on = Number((data as Record<string, unknown>)[flag] ?? def) === 1;
  return (
    <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 transition-colors ${on ? "bg-white border-[#F1F5F9] shadow-premium" : "bg-[#F8FAFC] border-dashed border-[#CBD5E1]"}`}>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${on ? "bg-emerald-50 text-emerald-600" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
        {on ? <Eye size={17} /> : <EyeOff size={17} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#0F172A]">{label}</p>
        <p className={`text-[11px] ${on ? "text-emerald-600" : "text-[#94A3B8]"}`}>{on ? "Visible on your card" : "Hidden from your card — turn on to show it"}</p>
      </div>
      <button
        type="button"
        onClick={() => update({ [flag]: on ? 0 : 1 })}
        role="switch"
        aria-checked={on}
        aria-label={`${on ? "Hide" : "Show"} ${label}`}
        className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${on ? "bg-[#F7B31C]" : "bg-[#E2E8F0]"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

/* Reusable smart-tip banner shown at the top of a module. */
export function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-[#FEF3C7]/60 border border-[#FDE68A] px-4 py-3">
      <Lightbulb size={15} className="text-[#B45309] mt-0.5 shrink-0" />
      <p className="text-xs text-[#92400E] leading-relaxed">{children}</p>
    </div>
  );
}

/* Sits inside the mobile layout so it can push this page's primary action
   into the native app bar. Renders nothing itself. */
function MobileChromeRegistrar({ action }: { action: ReactNode }) {
  useMobileChrome(null, action);
  return null;
}

/* Phone width (the mobile app shell). Hidden previews are not mounted there —
   each one is a live iframe of the whole card. */
const onResize = (cb: () => void) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); };
const usePhone = () => useSyncExternalStore(onResize, () => window.innerWidth < 768, () => false);

export const fieldCls =
  "h-10 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-[13px] text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all placeholder:text-[#94A3B8]";
export const areaCls = fieldCls.replace("h-10", "min-h-[84px] py-2.5");

export function Field({ label, children, hint, full }: { label: string; children: ReactNode; hint?: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-[11px] font-medium text-[#64748B] mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[#94A3B8] mt-1">{hint}</p>}
    </div>
  );
}

export function LimitBar({ used, limit, unit = "items" }: { used: number; limit: number; unit?: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const full = used >= limit;
  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[#334155]">{unit} used <span className="text-[#94A3B8] font-normal">(package limit)</span></p>
        <p className={`text-sm font-bold tabular-nums ${full ? "text-red-500" : "text-[#0F172A]"}`}>{used} / {limit}</p>
      </div>
      <div className="h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: full ? "#EF4444" : "linear-gradient(90deg,#F7B31C,#D97706)" }} />
      </div>
      {full && <p className="text-[11px] text-red-500 mt-1.5">Limit reached — upgrade your package to add more.</p>}
    </div>
  );
}

/* Inside a surface that is already a box (the Card Builder's editor panel),
   Panels drop their own box and become plain sections split by a hairline, so
   the editor reads as ONE box instead of boxes inside a box. */
const PanelFlatContext = createContext(false);
export function PanelFlat({ children }: { children: ReactNode }) {
  return <PanelFlatContext.Provider value={true}>{children}</PanelFlatContext.Provider>;
}

export function Panel({ title, subtitle, children, right, icon: Icon, hideTitleWhenFlat }: {
  title: string; subtitle?: string; children: ReactNode; right?: ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  /** When flat, skip the heading (e.g. it repeats the surrounding panel's title). */
  hideTitleWhenFlat?: boolean;
}) {
  const flat = useContext(PanelFlatContext);
  if (flat) {
    const showTitle = !hideTitleWhenFlat;
    return (
      <section className="border-t border-[#F1F5F9] pt-5 first:border-t-0 first:pt-0">
        {(showTitle || right) && (
          <div className={`flex items-center gap-3 mb-3.5 ${showTitle ? "justify-between" : "justify-end"}`}>
            {showTitle && (
              <div className="flex items-center gap-2.5 min-w-0">
                {Icon && <span className="w-8 h-8 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><Icon size={15} className="text-[#B45309]" /></span>}
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold text-[#0F172A] truncate">{title}</h3>
                  {subtitle && <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">{subtitle}</p>}
                </div>
              </div>
            )}
            {right}
          </div>
        )}
        {children}
      </section>
    );
  }
  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden transition-shadow hover:shadow-premium-lg">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && <span className="w-8 h-8 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><Icon size={15} className="text-[#B45309]" /></span>}
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-[#0F172A] truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

/* Identity of an image string, without hashing megabytes of base64. */
const imgId = (s: string) => `${s.length}:${s.slice(0, 48)}:${s.slice(-48)}`;

export function ImagePick({ value, onChange, className = "w-24 h-24", label = "Upload", fit = "cover", adjust, removable, what = "image" }: {
  value?: string; onChange: (dataUrl: string) => void; className?: string; label?: string; fit?: "cover" | "contain";
  /** Adds an Adjust button (position / zoom / rotate) under the picker. */
  adjust?: AdjustOptions;
  /** Adds a × on the image to remove it (with Undo), for images that are optional. */
  removable?: boolean;
  /** What the image is, for the remove button and its notice: "logo", "photo"… */
  what?: string;
}) {
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const slot = (part: string) => (adjust ? scopedKey(`dc_img_${adjust.key}_${part}`) : "");

  /* Remember the untouched upload, so adjusting again starts from the FULL image
     rather than re-cropping the last crop (which could only ever zoom further
     in). Browser-only and best effort: never published, and a full storage
     quota just means the next adjustment starts from the current image. */
  const remember = (original: string, current: string) => {
    if (!adjust) return;
    try {
      if (original.length > 1_500_000) { localStorage.removeItem(slot("orig")); return; }
      localStorage.setItem(slot("orig"), original);
      localStorage.setItem(slot("for"), imgId(current));
    } catch { /* quota - skip */ }
  };
  const openAdjust = () => {
    if (!value) return;
    let src = value;
    try {
      const original = localStorage.getItem(slot("orig"));
      // Only when that original is what produced the image showing now.
      if (original && localStorage.getItem(slot("for")) === imgId(value)) src = original;
    } catch { /* use the current image */ }
    setAdjusting(src);
  };
  const remove = () => {
    const prev = value;
    if (!prev) return;
    onChange("");
    if (adjust) { try { localStorage.removeItem(slot("orig")); localStorage.removeItem(slot("for")); } catch { /* ignore */ } }
    toast(`${what.charAt(0).toUpperCase()}${what.slice(1)} removed`, { action: { label: "Undo", onClick: () => onChange(prev) } });
  };

  const picker = (
    <label className={`${className} rounded-xl border-2 border-dashed border-[#E2E8F0] hover:border-[#F7B31C] ${fit === "contain" ? "bg-white p-1.5" : "bg-[#F8FAFC]"} flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors shrink-0`}>
      {value ? (
        <img src={value} alt="preview" referrerPolicy="no-referrer" className={`w-full h-full ${fit === "contain" ? "object-contain" : "object-cover"}`} />
      ) : (
        <span className="flex flex-col items-center gap-1 text-[#94A3B8]">
          <ImagePlus size={20} /><span className="text-[10px] font-medium">{label}</span>
        </span>
      )}
      <input
        type="file" accept="image/*" className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.currentTarget.value = "";
          if (!f) return;
          const url = await fileToDataUrl(f);
          onChange(url);
          remember(url, url);
        }}
      />
    </label>
  );

  // The × sits on the image's corner, outside the <label> so it doesn't open the file picker.
  const framed = removable && value ? (
    <div className={`relative w-fit shrink-0 ${/(^|\s)mx-auto(\s|$)/.test(className) ? "mx-auto" : ""}`}>
      {picker}
      <button type="button" onClick={remove} aria-label={`Remove ${what}`} title={`Remove ${what}`}
        className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center text-[#64748B] hover:text-red-600 hover:border-red-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
        <X size={13} strokeWidth={2.5} />
      </button>
    </div>
  ) : picker;

  if (!adjust) return framed;
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      {framed}
      {value && (
        <button type="button" onClick={openAdjust}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[11px] font-semibold text-[#334155] hover:border-[#F7B31C] hover:text-[#92400E] transition-colors">
          <Move size={12} /> Adjust
        </button>
      )}
      {adjusting && (
        <ImageAdjuster
          src={adjusting}
          options={adjust}
          onCancel={() => setAdjusting(null)}
          onSave={(out) => { const original = adjusting; onChange(out); remember(original, out); setAdjusting(null); }}
        />
      )}
    </div>
  );
}

export default function ModuleShell({
  title, subtitle, icon: Icon, children, actions, preview = true, wide = false,
}: {
  title: string; subtitle?: string; icon: React.ComponentType<{ size?: number; className?: string }>;
  children: ReactNode; actions?: ReactNode;
  /* Set false for pages that render their own preview (the Card Builder). */
  preview?: boolean;
  /* Use the full-width canvas even without the built-in preview column. */
  wide?: boolean;
}) {
  // Mobile "canvas": the card stays pinned above the form while you edit, the
  // way a design tool keeps the artboard in view. Remembered across pages.
  const [canvas, setCanvas] = useState(() => {
    try { return localStorage.getItem("dc_preview_open") !== "0"; } catch { return true; }
  });
  // Phones: the card opens full-height in a sheet from a floating button, so
  // the form gets the whole screen instead of sharing it with a cropped card.
  const [sheet, setSheet] = useState(false);
  const phone = usePhone();
  const typing = useKeyboardOpen();
  const toggleCanvas = () => setCanvas((v) => {
    const n = !v;
    try { localStorage.setItem("dc_preview_open", n ? "1" : "0"); } catch { /* ignore */ }
    return n;
  });
  return (
    <ResponsiveDashboardLayout>
      {/* Rendered below MobileDashboardLayout's provider, so it can hoist this
          page's Save action into the native app bar on mobile. */}
      <MobileChromeRegistrar action={actions ?? null} />
      <div className={`px-4 pt-3 pb-4 sm:p-6 mx-auto w-full ${preview || wide ? "max-w-[1360px]" : "max-w-4xl"}`}>
        {/* Desktop header (hidden on mobile — the app bar shows the title instead) */}
        <header className="hidden md:flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><Icon size={20} className="text-[#F7B31C]" /></div>
            <div>
              <h1 className="text-base font-bold text-[#0F172A] tracking-tight">{title}</h1>
              {subtitle && <p className="text-[11px] text-[#64748B]">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CardSwitcher />
            {actions}
            <NotificationBell />
            <ProfileMenu />
          </div>
        </header>

        <div className={preview ? "grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start" : ""}>
          <div className="min-w-0 space-y-4 sm:space-y-5">
            {/* Mobile/tablet: sticky live canvas — edit below, watch it change */}
            {preview && (
              <div
                className="hidden md:block xl:hidden sticky z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-1.5 pb-2 bg-[#F8FAFC]/95 backdrop-blur-md border-b border-[#E2E8F0]"
                style={{ top: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
              >
                <button type="button" onClick={toggleCanvas} aria-expanded={canvas}
                  className="w-full flex items-center justify-between gap-2 py-1">
                  <span className="inline-flex items-center gap-2 text-[12px] font-bold text-[#0F172A]">
                    <span className="w-5 h-5 rounded-md bg-[#0F172A] flex items-center justify-center">
                      <Smartphone size={11} className="text-[#F7B31C]" />
                    </span>
                    Live card
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> updates as you edit
                    </span>
                  </span>
                  {canvas ? <ChevronUp size={16} className="text-[#94A3B8] shrink-0" /> : <ChevronDown size={16} className="text-[#94A3B8] shrink-0" />}
                </button>
                {canvas && !phone && <div className="mt-1.5"><LivePreview height={200} frame={false} /></div>}
              </div>
            )}
            <JourneyStrip />
            {children}
            <JourneyContinue />
          </div>

          {/* Desktop: the card updates as you edit, right beside the form */}
          {preview && (
            <aside className="hidden xl:block sticky top-6">
              {!phone && <LivePreview height={620} />}
            </aside>
          )}
        </div>
      </div>

      {preview && (
        <>
          <button type="button" onClick={() => { haptic(); setSheet(true); }}
            className={`dc-bar md:hidden fixed right-4 z-40 inline-flex h-11 items-center gap-2 rounded-full bg-[#0F172A] pl-3 pr-4 text-[13px] font-bold text-white shadow-[0_12px_28px_-10px_rgba(2,6,23,0.65)] active:scale-95 ${typing ? "dc-bar-hidden" : ""}`}
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F7B31C]"><Smartphone size={13} className="text-[#0F172A]" /></span>
            Preview
          </button>
          <AppSheet open={sheet} onClose={() => setSheet(false)} tall
            title={<span className="inline-flex items-center gap-2">Live card <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> updates as you edit</span></span>}
            footer={
              <Link to="/dashboard/view" onClick={() => setSheet(false)}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0F172A] text-[14px] font-semibold text-white active:scale-[0.98]">
                <ExternalLink size={15} /> Open full card
              </Link>
            }>
            {sheet && <div className="overflow-hidden rounded-2xl"><LivePreview height="calc(92dvh - 170px)" frame={false} /></div>}
          </AppSheet>
        </>
      )}
    </ResponsiveDashboardLayout>
  );
}
