import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  ArrowLeft, ArrowRight, CalendarCheck, Check, Link2, Sparkles,
  Scissors, Coffee, Smile, Dumbbell, Camera, Building2, UtensilsCrossed, Sofa, Shirt, GraduationCap, Flower2, Gem,
  PhoneCall, QrCode, Inbox, BarChart3, Tag, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { buildCardHtml } from "@/card-template/buildCard";
import { demoForProduct } from "@/lib/demoData";
import { logFunnel } from "@/lib/funnel";
import { withoutScrollbars } from "@/components/customer/PhoneMockup";
import { DEMO_INDUSTRIES, DEMO_PALETTES, industryForNature, showcaseFor, showcaseName, type DemoIndustry } from "@/lib/demoShowcase";

type Icon = ComponentType<{ size?: number; className?: string }>;

const INDUSTRY_ICONS: Record<DemoIndustry["icon"], Icon> = {
  scissors: Scissors, coffee: Coffee, smile: Smile, dumbbell: Dumbbell, camera: Camera, building: Building2,
  utensils: UtensilsCrossed, sofa: Sofa, shirt: Shirt, graduation: GraduationCap, flower: Flower2, gem: Gem,
};

/* A feature built into a design, pointed out beside its demo (by design number).
   `target` is the section of the demo card the "try it" button scrolls to. */
type Highlight = {
  icon: Icon;
  eyebrow: string; title: string; text: string; points: string[];
  cta: string; target: string; tryHint: string;
};
const HIGHLIGHTS: Record<number, Highlight> = {
  52: {
    icon: CalendarCheck,
    eyebrow: "Built into this design",
    title: "Appointment booking",
    text: "Visitors pick a service, a date and a time slot right on your card — no app, no back-and-forth calls.",
    points: [
      "A Book Now button at the top of your card",
      "Service, date and time-slot picker",
      "Every request lands in your Leads with an instant alert",
      "Visitors can confirm on WhatsApp in one tap",
    ],
    cta: "Try the booking form",
    target: "enquiry-section",
    tryHint: "try Book Now, Call or WhatsApp",
  },
};

/* What every card includes — shown beside the demo. */
const EVERY_CARD: { icon: Icon; label: string }[] = [
  { icon: PhoneCall, label: "One-tap call & WhatsApp" },
  { icon: QrCode, label: "QR code & share link" },
  { icon: Inbox, label: "Enquiries to your Leads" },
  { icon: BarChart3, label: "Visitor analytics" },
  { icon: Tag, label: "Services, prices & offers" },
  { icon: RefreshCw, label: "Update anytime, no reprint" },
];

const eyebrow = "text-[10.5px] font-bold uppercase tracking-[0.16em]";

/* Live Demo — a full, interactive card on a showroom "stage", shown for a
   fictional sample business in the industry and colours the visitor picks.
   Never shows a real customer or a real business. */
export default function CardDemo() {
  const { slug = "" } = useParams();
  const { data: product, isLoading } = trpc.product.bySlug.useQuery({ slug }, { enabled: !!slug });
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Industry + colour the demo is shown in (kept in the URL so a sample can be shared).
  const [params, setParams] = useSearchParams();
  const colourChosen = useRef(false);
  const ownIndustry = product ? industryForNature(demoForProduct(product).customer.nature) : "";
  const industry = DEMO_INDUSTRIES.some((i) => i.id === params.get("industry")) ? String(params.get("industry")) : ownIndustry;
  const paletteId = DEMO_PALETTES.some((p) => p.id === params.get("colour")) ? String(params.get("colour")) : "original";
  const setQuery = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    setParams(next, { replace: true, preventScrollReset: true });
  };
  // Picking an industry also shows it in that industry's colours — unless the
  // visitor has picked a colour themselves.
  const pickIndustry = (id: string) => {
    const ind = DEMO_INDUSTRIES.find((i) => i.id === id);
    setQuery({ industry: id, ...(colourChosen.current || !ind ? {} : { colour: ind.palette }) });
  };
  const pickColour = (id: string) => { colourChosen.current = true; setQuery({ colour: id }); };

  const palettes = useMemo(() => [
    { id: "original", name: "Original", primary: product?.primaryColor || "#F7B31C", secondary: product?.secondaryColor || product?.primaryColor || "#0F172A" },
    ...DEMO_PALETTES,
  ], [product?.primaryColor, product?.secondaryColor]);
  const palette = palettes.find((p) => p.id === paletteId) ?? palettes[0];

  const html = useMemo(() => {
    if (!product) return "";
    const colours = paletteId === "original"
      ? { color: product.primaryColor || "#F7B31C", color2: product.secondaryColor || "" }
      : { color: palette.primary, color2: palette.secondary };
    const sc = showcaseFor(industry);
    const base = sc ?? { ...demoForProduct(product), offers: [], gallery: [] };
    const rec = { ...base.customer, slug: "demo", theme: product.styleNumber, ...colours } as unknown as Parameters<typeof buildCardHtml>[0];
    // No desktop scrollbar inside the phone: a phone scrolls with an overlay one.
    return withoutScrollbars(buildCardHtml(
      rec,
      base.products as Parameters<typeof buildCardHtml>[1],
      base.gallery as Parameters<typeof buildCardHtml>[2],
      [],
      base.offers as Parameters<typeof buildCardHtml>[4],
      [], [],
    ));
  }, [product, industry, paletteId, palette.primary, palette.secondary]);

  // The screen fades between samples instead of flashing white while reloading.
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(false); }, [html]);

  useEffect(() => {
    if (product) { document.title = `Live Demo — ${product.name} | DigitalCarda`; logFunnel("demo_view", product.slug); }
  }, [product]);

  if (isLoading) return <div className="min-h-screen bg-[#0B1120] pt-28 text-center text-[#64748B]">Loading demo…</div>;
  if (!product || product.status !== "published") return (
    <div className="pt-32 pb-24 text-center px-4">
      <p className="text-lg font-bold text-[#0F172A]">Demo not available</p>
      <Link to="/digital-business-cards-templates" className="inline-flex items-center gap-2 mt-5 h-11 px-5 rounded-xl gradient-gold text-[#0F172A] font-bold">Browse cards <ArrowRight size={16} /></Link>
    </div>
  );

  const hl = HIGHLIGHTS[product.styleNumber];
  const HlIcon = hl?.icon;
  const ind = DEMO_INDUSTRIES.find((i) => i.id === industry);
  const bizName = showcaseName(industry);
  const designName = product.name.replace(/\s*(Digital Business Card|Link-in-Bio Card)$/i, "") || product.name;

  // Every button in the demo works, but its enquiries/bookings and analytics
  // must not reach a real inbox or the stats: answer them inside the demo.
  const onFrameLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const w = e.currentTarget.contentWindow as (Window & typeof globalThis) | null;
      if (w) {
        const realFetch = w.fetch.bind(w);
        w.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
          /\/api\/(enquiry|track)/.test(String(input instanceof w.Request ? input.url : input))
            ? Promise.resolve(new w.Response('{"ok":true}', { status: 200, headers: { "Content-Type": "application/json" } }))
            : realFetch(input, init)) as typeof fetch;
        if ("sendBeacon" in w.navigator) Object.defineProperty(w.navigator, "sendBeacon", { value: () => true, configurable: true });
      }
    } catch { /* same-origin demo; guard anyway */ }
    setReady(true);
  };
  // Scroll the demo card (only the card, not this page) to the feature, then
  // bring the whole phone into view below the sticky header on small screens.
  const tryIt = () => {
    const frame = frameRef.current;
    if (!hl || !frame) return;
    try {
      const w = frame.contentWindow;
      const el = w?.document.getElementById(hl.target);
      if (w && el) w.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + w.scrollY - 8), behavior: "smooth" });
    } catch { /* the demo is same-origin; guard anyway */ }
    const top = frame.getBoundingClientRect().top;
    const HEADER = 136; // site header + demo banner
    if (top < HEADER || top > window.innerHeight * 0.5) window.scrollTo({ top: Math.max(0, window.scrollY + top - HEADER - 8), behavior: "smooth" });
  };
  const shareSample = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success("Link to this sample copied"); }
    catch { toast.error("Couldn't copy the link"); }
  };

  const industryButtons = (compact: boolean) => DEMO_INDUSTRIES.map((i) => {
    const Ico = INDUSTRY_ICONS[i.icon];
    const on = i.id === industry;
    if (compact) {
      return (
        <button key={i.id} type="button" aria-pressed={on} onClick={() => pickIndustry(i.id)}
          className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${on ? "bg-[#F7B31C] border-[#F7B31C] text-[#0F172A]" : "border-white/10 bg-white/[0.04] text-[#CBD5E1] hover:bg-white/[0.09] hover:text-white"}`}>
          <Ico size={14} /> {i.label}
        </button>
      );
    }
    return (
      <button key={i.id} type="button" aria-pressed={on} onClick={() => pickIndustry(i.id)}
        className={`group w-full flex items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${on ? "bg-white/[0.08]" : "hover:bg-white/[0.045]"}`}>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${on ? "bg-[#F7B31C] text-[#0F172A]" : "bg-white/[0.06] text-[#94A3B8] group-hover:text-white"}`}><Ico size={16} /></span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[13px] font-semibold leading-tight ${on ? "text-white" : "text-[#CBD5E1]"}`}>{i.label}</span>
          <span className="block truncate text-[11.5px] text-[#64748B] mt-0.5">{showcaseName(i.id)}</span>
        </span>
        {on && <Check size={15} className="text-[#F7B31C] shrink-0" />}
      </button>
    );
  });

  const swatches = () => palettes.map((p) => {
    const on = p.id === palette.id;
    return (
      <button key={p.id} type="button" role="radio" aria-checked={on} aria-label={`${p.name} colours`} title={p.name} onClick={() => pickColour(p.id)}
        className={`relative w-8 h-8 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] ${on ? "scale-110" : "hover:scale-105"}`}
        style={{ background: `linear-gradient(135deg, ${p.primary} 0 50%, ${p.secondary} 50% 100%)`, boxShadow: on ? `0 0 0 2px #0B1120, 0 0 0 4px ${p.primary}` : "inset 0 0 0 1px rgba(255,255,255,.12)" }}>
        {on && <Check size={13} className="absolute inset-0 m-auto text-white drop-shadow" strokeWidth={3} />}
      </button>
    );
  });

  return (
    <div className="relative min-h-screen bg-[#0B1120] pt-16 overflow-x-clip">
      {/* Atmosphere: a faint dot grid that fades out from the stage */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(148,163,184,0.09)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,black,transparent)]" />

      {/* Demo banner — makes it unmistakable this is sample data */}
      <div className="sticky top-16 z-30 bg-[#0B1120]/90 backdrop-blur border-b border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link to={`/digital-business-cards-templates/${product.slug}`} aria-label="Back to the design" className="w-9 h-9 rounded-xl bg-white/[0.07] text-white flex items-center justify-center hover:bg-white/[0.14] shrink-0"><ArrowLeft size={16} /></Link>
            <div className="min-w-0">
              <p className={`${eyebrow} text-[#F7B31C] flex items-center gap-1`}><Sparkles size={11} /> Live demo<span className="hidden sm:inline">&nbsp;· Sample business</span></p>
              <p className="font-display text-[15px] font-bold text-white truncate">{designName}</p>
            </div>
          </div>
          <Link to={`/signup?product=${encodeURIComponent(product.slug)}`} className="shrink-0 h-10 px-4 sm:px-5 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold flex items-center gap-2 hover:shadow-gold transition-all">
            <span className="hidden sm:inline">Use this design free</span><span className="sm:hidden">Try Free</span> <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <main className="relative max-w-7xl mx-auto px-4 pt-4 pb-28 lg:pt-8 lg:pb-14">
        {/* Phones & tablets: industries as one swipeable row */}
        {DEMO_INDUSTRIES.length > 0 && (
          <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1" aria-label="Sample industry">{industryButtons(true)}</div>
        )}

        <div className="mt-4 lg:mt-0 lg:grid lg:grid-cols-[270px_minmax(0,1fr)_290px] xl:grid-cols-[300px_minmax(0,1fr)_320px] lg:gap-8 xl:gap-12 lg:items-start">
          {/* Configure (desktop) */}
          <aside className="hidden lg:block sticky top-36 dc-enter rounded-3xl border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-sm">
            <div className="px-1.5">
              <p className={`${eyebrow} text-[#64748B]`}>Configure</p>
              <h2 className="font-display mt-1.5 text-[17px] font-bold text-white leading-snug">See it for your business</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#94A3B8]">Pick an industry and a colour — the card updates live.</p>
            </div>
            {DEMO_INDUSTRIES.length > 0 && (
              <div className="mt-3 space-y-0.5 max-h-[calc(100vh-420px)] min-h-[180px] overflow-y-auto no-scrollbar -mx-0.5 px-0.5" aria-label="Sample industry">{industryButtons(false)}</div>
            )}
            <div className="mt-4 pt-4 border-t border-white/[0.07] px-1.5">
              <div className="flex items-center justify-between">
                <p className={`${eyebrow} text-[#64748B]`}>Colour</p>
                <span className="text-[12px] font-semibold text-[#CBD5E1]">{palette.name}</span>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-3 justify-items-center" role="radiogroup" aria-label="Card colours">{swatches()}</div>
            </div>
          </aside>

          {/* The stage */}
          <section className="relative flex flex-col items-center dc-enter dc-enter-1" aria-label="Live card">
            <div className="hidden lg:inline-flex items-center gap-2 mb-5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12px] text-[#CBD5E1]">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 motion-reduce:animate-none" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
              <span className="font-semibold text-white">{bizName || designName}</span>
              {ind && <><span className="text-[#475569]">·</span>{ind.label}</>}
            </div>

            <div className="relative w-full max-w-[390px]">
              {/* Spotlight in the card's own colour */}
              <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[42%] h-[520px] w-[520px] max-w-[130vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.32] blur-[90px] transition-[background-color] duration-700" style={{ backgroundColor: palette.primary }} />

              {/* Device */}
              <div className="relative rounded-[3rem] p-[10px] bg-gradient-to-b from-[#303a50] via-[#161d2d] to-[#0a0f1b] shadow-[0_50px_90px_-40px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                <span aria-hidden="true" className="absolute -left-[3px] top-[110px] h-9 w-[3px] rounded-l-sm bg-[#2b3447]" />
                <span aria-hidden="true" className="absolute -left-[3px] top-[160px] h-14 w-[3px] rounded-l-sm bg-[#2b3447]" />
                <span aria-hidden="true" className="absolute -right-[3px] top-[140px] h-20 w-[3px] rounded-r-sm bg-[#2b3447]" />
                <div className="relative overflow-hidden rounded-[2.4rem] bg-[#0B1120] h-[min(calc(100dvh_-_300px),760px)] min-h-[470px] lg:h-[min(calc(100vh_-_250px),760px)] lg:min-h-[560px]">
                  <span aria-hidden="true" className="absolute left-1/2 top-2 z-10 h-[24px] w-[92px] -translate-x-1/2 rounded-full bg-black/90" />
                  <iframe ref={frameRef} srcDoc={html} title={`${product.name} demo`} onLoad={onFrameLoad}
                    className={`block w-full h-full border-0 bg-white transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`} />
                </div>
              </div>
              {/* Floor shadow */}
              <div aria-hidden="true" className="mx-auto mt-5 h-5 w-[72%] rounded-[50%] bg-black/70 blur-xl" />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button type="button" onClick={shareSample} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-white/10 bg-white/[0.04] text-[12.5px] font-semibold text-[#CBD5E1] hover:bg-white/[0.09] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                <Link2 size={14} /> Share this sample
              </button>
            </div>

            {/* Phones & tablets: colours under the phone */}
            <div className="lg:hidden mt-5 w-full max-w-[390px]">
              <div className="flex items-center justify-between px-1">
                <p className={`${eyebrow} text-[#64748B]`}>Colour</p>
                <span className="text-[12px] font-semibold text-[#CBD5E1]">{palette.name}</span>
              </div>
              <div className="mt-3 flex flex-wrap justify-between gap-y-3 px-1" role="radiogroup" aria-label="Card colours">{swatches()}</div>
            </div>

            <p className="text-[12px] text-[#64748B] mt-5 text-center max-w-sm leading-relaxed">A fictional sample business with sample photos. Every button works — {hl ? hl.tryHint : "try Call, WhatsApp or Save Contact"}. Your card uses your own details.</p>
          </section>

          {/* What's special + get started */}
          <aside className="mt-8 lg:mt-0 lg:sticky lg:top-36 space-y-4 w-full max-w-[420px] mx-auto dc-enter dc-enter-2">
            {hl && HlIcon && (
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5">
                <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl opacity-30 transition-[background-color] duration-700" style={{ backgroundColor: palette.primary }} />
                <p className={`${eyebrow} text-[#F7B31C] flex items-center gap-1`}><Sparkles size={11} /> {hl.eyebrow}</p>
                <h2 className="font-display mt-3 flex items-center gap-2.5 text-[19px] font-bold text-white">
                  <span className="w-10 h-10 rounded-2xl bg-[#F7B31C]/15 text-[#F7B31C] flex items-center justify-center shrink-0"><HlIcon size={19} /></span>
                  {hl.title}
                </h2>
                <p className="mt-2.5 text-[13px] leading-relaxed text-[#94A3B8]">{hl.text}</p>
                <ul className="mt-4 space-y-2.5">
                  {hl.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[13px] leading-snug text-[#E2E8F0]"><span className="mt-0.5 w-4 h-4 rounded-full bg-[#F7B31C]/15 flex items-center justify-center shrink-0"><Check size={11} className="text-[#F7B31C]" strokeWidth={3} /></span>{p}</li>
                  ))}
                </ul>
                <button type="button" onClick={tryIt}
                  className="mt-5 w-full h-11 rounded-xl border border-[#F7B31C]/40 text-[#F7B31C] text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-[#F7B31C]/10 transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                  {hl.cta} <ArrowRight size={15} />
                </button>
              </div>
            )}

            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5">
              <p className={`${eyebrow} text-[#64748B]`}>In every DigitalCarda card</p>
              <ul className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-3">
                {EVERY_CARD.map(({ icon: I, label }) => (
                  <li key={label} className="flex items-start gap-2 text-[12.5px] leading-snug text-[#CBD5E1]"><I size={15} className="text-[#F7B31C] shrink-0 mt-px" /> {label}</li>
                ))}
              </ul>
              <Link to={`/signup?product=${encodeURIComponent(product.slug)}`}
                className="mt-5 w-full h-12 rounded-xl gradient-gold text-[#0F172A] text-[14px] font-bold inline-flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98]">
                Use {designName} free <ArrowRight size={16} />
              </Link>
              <p className="mt-2.5 text-center text-[11.5px] text-[#64748B]">30-day free trial · Your details, your colours</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
