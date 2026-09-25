import { useMemo } from "react";
import { Nfc } from "lucide-react";

/* The DigitalCarda partner pass — the reseller programme's one visual.

   On /become-reseller it is a live preview: it fills in from what the
   applicant types and gets a rubber stamp when the application is sent. On the
   partner sign-in page it is shown `blank`, with bars where the details go.

   Always decorative (aria-hidden): everything on it is already in the form, and
   a screen reader shouldn't hear it twice. Placeholders are generic words, never
   a sample person or business. The "QR" is a pattern seeded from the typed
   name — it looks like a code and deliberately isn't one. */

export type PassData = { name: string; company: string; email: string; phone: string; kind: string };

const N = 21; // modules per side, like a version-1 QR

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  if (!h) h = 1;
  return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h; };
}

const inFinder = (x: number, y: number) =>
  (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);

function modulesPath(seed: string): string {
  const next = seeded(seed || "digitalcarda");
  let d = "";
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (inFinder(x, y)) continue;
      if (next() % 100 < 47) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return d;
}

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="7" height="7" rx="1.2" fill="#0F172A" />
      <rect x={x + 1} y={y + 1} width="5" height="5" rx="0.8" fill="#FFFFFF" />
      <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.6" fill="#F7B31C" />
    </g>
  );
}

/* A contact chip, as on a payment card — the pass is an NFC card, after all. */
function Chip() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" fill="none">
      <defs>
        <linearGradient id="dcChip" x1="0" y1="0" x2="34" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE68A" /><stop offset="0.5" stopColor="#F7B31C" /><stop offset="1" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="33" height="25" rx="5" fill="url(#dcChip)" stroke="#92400E" strokeOpacity="0.35" />
      <path d="M0.5 9h9.5v8H0.5M33.5 9H24v8h9.5M10 0.5v25M24 0.5v25M10 13h14" stroke="#92400E" strokeOpacity="0.45" />
    </svg>
  );
}

function Bar({ w, tone = "bg-white/20" }: { w: string; tone?: string }) {
  return <span className={`block h-2 rounded-full ${tone} ${w}`} />;
}

export default function PartnerPass({
  data, blank = false, stamped = false, className = "",
}: { data?: PassData; blank?: boolean; stamped?: boolean; className?: string }) {
  const d = data ?? { name: "", company: "", email: "", phone: "", kind: "" };
  const seed = `${d.company.trim().toLowerCase()}|${d.name.trim().toLowerCase()}`;
  const path = useMemo(() => modulesPath(blank ? "" : seed), [blank, seed]);
  const contact = [d.email.trim(), d.phone.trim()].filter(Boolean).join("  ·  ");

  return (
    <div aria-hidden="true" className={`relative w-full max-w-[360px] ${className}`}>
      {/* Gold halo behind the pass */}
      <div className="absolute -inset-5 rounded-[40px] bg-[#F7B31C]/15 blur-2xl" />

      <div className="dc-foil relative aspect-[1.586/1] rounded-[22px] overflow-hidden border border-white/10 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.7)]
                      bg-[radial-gradient(120%_130%_at_0%_0%,#2B3B57_0%,#172338_48%,#0B1322_100%)]">
        {/* Guilloché rings — the engraved look of a certificate or a banknote */}
        <svg className="absolute -right-20 -bottom-24 w-[280px] h-[280px]" viewBox="0 0 200 200" fill="none">
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} cx="100" cy="100" r={28 + i * 9} stroke="#F7B31C" strokeOpacity={0.05 + i * 0.012} strokeWidth="1" />
          ))}
        </svg>
        <div className="absolute inset-x-0 top-0 h-[3px] gradient-gold" />

        <div className="absolute top-[7%] left-[6%] right-[6%] flex items-center justify-between">
          <img src="/logo.png" alt="" className="h-[18px] w-auto object-contain" />
          <span className="rounded-full border border-[#F7B31C]/40 bg-[#F7B31C]/10 px-2 py-0.5 text-[8.5px] font-bold tracking-[0.2em] text-[#FCD34D]">
            RESELLER PARTNER
          </span>
        </div>

        <div className="absolute left-[6%] top-[31%] flex items-center gap-2">
          <Chip />
          <Nfc size={18} className="text-white/45" />
        </div>

        <div className="absolute left-[6%] right-[31%] bottom-[9%] min-w-0">
          {blank ? (
            <div className="space-y-2"><Bar w="w-36" tone="bg-white/30" /><Bar w="w-24" /><Bar w="w-28" tone="bg-white/10" /></div>
          ) : (
            <>
              <p className={`font-display text-[16px] sm:text-[17px] leading-tight font-extrabold truncate ${d.company.trim() ? "text-white" : "text-white/30"}`}>
                {d.company.trim() || "Your business"}
              </p>
              <p className={`mt-0.5 text-[11px] truncate ${d.name.trim() ? "text-[#E2E8F0]" : "text-white/30"}`}>
                {d.name.trim() || "Your name"}
                {d.kind && <span className="text-[#FCD34D]"> · {d.kind}</span>}
              </p>
              <p className={`mt-1.5 text-[9.5px] tracking-wide truncate ${contact ? "text-[#94A3B8]" : "text-white/25"}`}>
                {contact || "you@yourbusiness.in"}
              </p>
            </>
          )}
        </div>

        <div className="absolute right-[5%] bottom-[8%] w-[22%] aspect-square rounded-[10px] bg-white p-[5%] shadow-lg">
          <svg viewBox={`0 0 ${N} ${N}`} className="w-full h-full" shapeRendering="crispEdges">
            <path d={path} fill="#0F172A" />
            <Finder x={0} y={0} /><Finder x={N - 7} y={0} /><Finder x={0} y={N - 7} />
          </svg>
        </div>
      </div>

      {stamped && (
        <div className="dc-stamp absolute right-[8%] top-[20%] rounded-xl border-[3px] border-dashed border-[#2DD4BF] bg-[#0F172A]/55 px-3.5 py-1.5 text-center backdrop-blur-[2px]">
          <p className="text-[9px] font-black tracking-[0.24em] text-[#5EEAD4]">APPLICATION</p>
          <p className="text-[14px] font-black tracking-[0.14em] text-[#5EEAD4] leading-none mt-0.5">RECEIVED</p>
        </div>
      )}
    </div>
  );
}
