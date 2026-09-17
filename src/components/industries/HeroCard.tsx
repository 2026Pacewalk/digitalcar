/* The sample phone card on an industry page.
   - mode "hero": in the hero column; the card assembles itself once
     (dc-ind-build in industryCss.ts: each section rises in after a dashed
     ghost outline and its buttons, rows, tiles and icons spring in behind it;
     then the screen peeks down to the rest of the card while the enquiry
     form, the QR (printed band by band, then scanned) and the socials
     assemble, comes back to the top, and one light sweep closes the show).
   - mode "annotate": beside the checklist; the part named in `highlight`
     gets an accent ring and lifts while the rest dims (data-hl on the root).
   Pure HTML/CSS from ind.sample: no screenshot, no network and nothing
   random, so the server and the browser draw the same pixels. Every section
   carries data-part and --i (its index in CARD_PARTS) for the build stagger. */
import { useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  BatteryFull, Check, ContactRound, Facebook, Image as ImageIcon, Instagram, Linkedin, MapPin, MessageCircle, Phone, Send,
  Share2, Signal, Wifi, Youtube,
} from "lucide-react";
import type { CardPart, IndustryPage } from "@/data/industries";
import IndustryArt from "./IndustryArt";
import { CARD_PARTS } from "./industryCss";

type Props = { ind: IndustryPage; mode: "hero" | "annotate"; highlight?: CardPart | null };

/** Inline style with CSS custom properties (--i, --j, --scan). */
const css = (o: Record<string, string | number | undefined>) => o as CSSProperties;

/* ── decorative QR: a 21×21 grid seeded from the slug ─────────────────── */
const QR_N = 21;

/** FNV-1a of the seed, then an LCG: the same slug always gives the same grid. */
function qrModules(seed: string): boolean[][] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  let s = h >>> 0 || 1;
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const g: boolean[][] = [];
  for (let y = 0; y < QR_N; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < QR_N; x++) {
      // finder zones (with their light separators) are stamped afterwards
      if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) { row.push(false); continue; }
      if (y === 6 || x === 6) { row.push((x + y) % 2 === 0); continue; } // timing pattern
      row.push(next() < 0.45);
    }
    g.push(row);
  }
  const finder = (ox: number, oy: number) => {
    for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) {
      const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      g[oy + dy][ox + dx] = ring === 3 || ring <= 1;
    }
  };
  finder(0, 0); finder(14, 0); finder(0, 14);
  g[13][8] = true; // the dark module every QR carries
  return g;
}

function bandPath(g: boolean[][], from: number, to: number): string {
  let d = "";
  for (let y = from; y <= to; y++) for (let x = 0; x < QR_N; x++) if (g[y][x]) d += `M${x} ${y}h1v1h-1z`;
  return d;
}

/** A decorative QR (never scannable) seeded from `seed`. With `bands`, the
    grid is split into three paths (class dc-ind-band, --j 0..2) so the hero
    build can "print" it top to bottom. */
export function SampleQr({ seed, bands, className }: { seed: string; bands?: boolean; className?: string }) {
  const grid = useMemo(() => qrModules(seed), [seed]);
  const ranges: [number, number][] = bands ? [[0, 6], [7, 13], [14, 20]] : [[0, 20]];
  return (
    <svg viewBox={`0 0 ${QR_N} ${QR_N}`} className={className} shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false">
      {ranges.map(([a, b], j) => (
        <path key={a} d={bandPath(grid, a, b)} className={bands ? "dc-ind-band" : undefined} style={bands ? css({ "--j": j }) : undefined} />
      ))}
    </svg>
  );
}

/** "Dr. Anita Sharma" → "AS": honorifics (tokens ending in a dot) are skipped. */
function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && !w.endsWith("."));
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
}

/** Round initials badge for the sample persona. */
export function Avatar({ name, className = "", style }: { name: string; className?: string; style?: CSSProperties }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-white font-extrabold ${className}`} style={style}>
      {initialsOf(name)}
    </span>
  );
}

/* ── card pieces ───────────────────────────────────────────────────────── */
const GALLERY_TINTS: [string, string][] = [["33", "99"], ["4D", "B3"], ["26", "80"]];
const SOCIALS = [Instagram, Facebook, Youtube, Linkedin];

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-1 text-[7.5px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">{children}</p>;
}

export default function HeroCard({ ind, mode, highlight }: Props) {
  const { accent, ink, motif } = ind.theme;
  const s = ind.sample;
  const hero = mode === "hero";
  // Accent across the status bar, ink from just above the avatar down: the
  // white name and role sit on ink (≥ 4.5:1 on every palette), not on the
  // lighter accents (gold, teal, orange), which white text fails on.
  const band = `linear-gradient(165deg, ${accent}, ${ink} 55%)`;

  /** A card section: data-part + --i for the build stagger and the highlight ring. */
  const part = (p: CardPart, children: ReactNode, className = "") => (
    <div data-part={p} className={className} style={css({ "--i": CARD_PARTS.indexOf(p) })}>
      <div className="dc-ind-part">{children}</div>
    </div>
  );

  const actions: { Icon: typeof Phone; label: string; color: string }[] = [
    { Icon: Phone, label: "Call", color: ink },
    { Icon: MessageCircle, label: "WhatsApp", color: "#25D366" },
    { Icon: ContactRound, label: "Save", color: ink },
    { Icon: MapPin, label: "Directions", color: ink },
  ];

  return (
    <div
      className={`dc-ind-card relative w-full select-none ${hero ? "dc-ind-build aspect-[9/19]" : ""}`}
      data-hl={highlight ?? ""}
      data-mode={mode}
      role="img"
      aria-label={`Sample digital visiting card for ${s.name}, ${s.role} at ${s.org}. Fictional details.`}
    >
      <div className="relative h-full rounded-[36px] bg-[#0B1120] p-[7px] shadow-[0_30px_60px_-24px_rgba(15,23,42,0.55)] ring-1 ring-white/10">
        {/* the screen; in hero mode it is a size container so the peek can
            scroll its content (.dc-ind-peek) exactly to the bottom */}
        <div className="dc-ind-screen relative h-full overflow-hidden rounded-[30px] bg-[#F8FAFC]">
          <div className="dc-ind-peek flex flex-col">
            {/* profile: accent band, status bar, ribbon, avatar, name */}
            {part("profile", (
              <div className="relative overflow-hidden rounded-b-[24px] px-3 pb-3 text-white" style={{ background: band }}>
                <IndustryArt motif={motif} className="pointer-events-none absolute -right-10 -top-2 h-auto w-[170%] text-white opacity-[0.18]" />
                <div className="relative h-6">
                  <span className="absolute left-1/2 top-[7px] h-[13px] w-[52px] -translate-x-1/2 rounded-full bg-[#0B1120]" />
                  <span className="absolute right-1 top-[7px] flex items-center gap-1 text-white/90">
                    <Signal size={9} /><Wifi size={9} /><BatteryFull size={12} />
                  </span>
                </div>
                <p className="relative mx-auto mt-1 w-max rounded-full bg-white/95 px-2 py-[2px] text-[7.5px] font-bold uppercase tracking-[0.08em]" style={{ color: ink }}>
                  Sample card · fictional details
                </p>
                <Avatar name={s.name} className="dc-ind-pop relative mx-auto mt-2.5 h-11 w-11 text-[14px] ring-[3px] ring-white/40" style={css({ color: ink, "--j": 0 })} />
                <p className="relative mt-1.5 text-center text-[13px] font-bold leading-tight">{s.name}</p>
                <p className="relative text-center text-[9.5px] text-white/85">{s.role}</p>
                <p className="relative text-center text-[9px] text-white/70">{s.org}</p>
              </div>
            ))}

            <div className="flex flex-col gap-2 px-2.5 pb-3 pt-2.5">
              {/* actions: the four buttons every card has */}
              {part("actions", (
                <div className="grid grid-cols-4 gap-1.5">
                  {actions.map(({ Icon, label, color }, j) => (
                    <span key={label} className="dc-ind-pop flex flex-col items-center gap-0.5 rounded-xl bg-white py-1.5 ring-1 ring-[#E2E8F0]" style={css({ "--j": j })}>
                      <Icon size={13} style={{ color }} />
                      <span className="text-[7.5px] font-semibold text-[#334155]">{label}</span>
                    </span>
                  ))}
                </div>
              ))}

              {/* about: one real line, then text placeholders */}
              {part("about", (
                <div className="rounded-xl bg-white p-2 ring-1 ring-[#E2E8F0]">
                  <Label>About</Label>
                  <p className="truncate text-[9px] leading-snug text-[#334155]">{s.role} · {s.org}</p>
                  <span className="mt-1.5 block h-[5px] w-[92%] rounded-full bg-[#E2E8F0]" />
                  <span className="mt-1 block h-[5px] w-[68%] rounded-full bg-[#E2E8F0]" />
                </div>
              ))}

              {/* services: the three from the sample persona */}
              {part("services", (
                <div>
                  <Label>Services</Label>
                  <div className="space-y-1">
                    {s.services.map((name, j) => (
                      <div key={name} className="dc-ind-row flex items-center gap-1.5 rounded-xl bg-white px-2 py-1.5 ring-1 ring-[#E2E8F0]" style={css({ "--j": j })}>
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md" style={{ background: `${accent}1A` }}>
                          <Check size={10} strokeWidth={3} style={{ color: ink }} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[9px] font-semibold text-[#0F172A]">{name}</span>
                        <MessageCircle size={11} className="shrink-0 text-[#25D366]" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* gallery: tinted placeholders, no photos to load */}
              {part("gallery", (
                <div>
                  <Label>Gallery</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {GALLERY_TINTS.map(([a, b], j) => (
                      <span key={j} className="dc-ind-tile flex aspect-[4/3] items-center justify-center rounded-lg" style={css({ background: `linear-gradient(135deg, ${accent}${a}, ${ink}${b})`, "--j": j })}>
                        <ImageIcon size={12} className="text-white/85" />
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {/* enquiry: the form fields and the send button */}
              {part("enquiry", (
                <div className="rounded-xl bg-white p-2 ring-1 ring-[#E2E8F0]">
                  <Label>Send an enquiry</Label>
                  <span className="flex h-[18px] items-center rounded-md bg-[#F8FAFC] px-1.5 text-[8px] text-[#94A3B8] ring-1 ring-[#E2E8F0]">Your name</span>
                  <span className="mt-1 flex h-[18px] items-center rounded-md bg-[#F8FAFC] px-1.5 text-[8px] text-[#94A3B8] ring-1 ring-[#E2E8F0]">Phone number</span>
                  <span className="dc-ind-pop mt-1.5 flex h-[20px] items-center justify-center gap-1 rounded-md text-[8.5px] font-bold text-white" style={css({ background: ink, "--j": 2 })}>
                    <Send size={9} /> Send enquiry
                  </span>
                </div>
              ))}

              {/* qr: the decorative code with its scan line */}
              {part("qr", (
                <div className="flex items-center gap-2.5 rounded-xl bg-white p-2 ring-1 ring-[#E2E8F0]">
                  <span className="relative block h-[58px] w-[58px] shrink-0 rounded-lg p-[3px] ring-1 ring-[#E2E8F0]" style={css({ "--scan": "50px" })}>
                    <SampleQr seed={ind.slug} bands className="h-full w-full text-[#0F172A]" />
                    <span className="dc-ind-scan absolute inset-x-[3px] top-[3px] h-[2px] rounded-full" style={{ background: accent, boxShadow: `0 0 8px 1px ${accent}` }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[9.5px] font-bold text-[#0F172A]">Scan to save</span>
                    <span className="block truncate text-[8.5px] text-[#64748B]">{s.org}</span>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-[2px] text-[7.5px] font-semibold" style={{ background: `${accent}1A`, color: ink }}>
                      <Share2 size={8} /> Share
                    </span>
                  </span>
                </div>
              ))}

              {/* socials */}
              {part("socials", (
                <div className="flex items-center justify-between rounded-xl bg-white px-2 py-1.5 ring-1 ring-[#E2E8F0]">
                  <span className="text-[7.5px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">Follow</span>
                  <span className="flex gap-1.5">
                    {SOCIALS.map((Icon, j) => (
                      <span key={j} className="dc-ind-pop flex h-6 w-6 items-center justify-center rounded-full text-[#475569] ring-1 ring-[#E2E8F0]" style={css({ "--j": j })}>
                        <Icon size={11} />
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>

          </div>
          {hero && <span className="dc-ind-fade pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-12 bg-gradient-to-t from-[#F8FAFC] to-transparent" />}
          <span className="dc-ind-shine pointer-events-none absolute inset-y-0 left-0 z-[2] w-[45%] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      </div>
    </div>
  );
}
