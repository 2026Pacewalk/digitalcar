/* "Share it everywhere": the dark bento of the ways a card gets handed over
   (blueprint §4b-7). Six tiles. The first, wide one goes to the NFC standee
   when the profession works from a counter (ind.nfcFit), otherwise to the
   short link. The last tile is team cards for bulkFit pages and WhatsApp
   message templates for the rest.

   Bento grid: one column on phones; two on sm, where the first and last tiles
   span both (four full rows); three on lg, where the first tile is 2×2 and
   the other five fill the remaining cells (three full rows, no orphan).

   Prices are read from src/lib/nfcProducts by id, never by index, and are
   omitted (not invented) if a product id ever disappears. The two small
   illustrations are drawn in CSS with em units, so one font-size scales them
   for the bigger lg tile. */
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowUpRight, FileText, Link2, Mail, Nfc, QrCode, SmartphoneNfc, Users } from "lucide-react";
import { Reveal, SectionHeading } from "@/components/public/Reveal";
import { inr, type IndustryPage } from "@/data/industries";
import { nfcProduct, type NfcProductId } from "@/lib/nfcProducts";

type TileId = "qr" | "nfcCard" | "nfcStandee" | "shareLink" | "emailSignature" | "bulkCards" | "whatsappTemplates";
type Tile = { id: TileId; title: string; text: string; href: string; meta: string; cta: string; price?: string; icon: ReactNode };

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]";
const priceOf = (id: NfcProductId) => { const p = nfcProduct(id); return p ? inr(p.price) : undefined; };

/* The 5×5 pattern of the decorative QR in the standee tile: hard-coded, so
   the server and the browser draw the same squares. */
const QR_BITS = [
  1, 1, 1, 0, 1,
  1, 0, 1, 1, 0,
  1, 1, 1, 0, 1,
  0, 0, 0, 1, 0,
  1, 0, 1, 1, 1,
];

function tilesFor(ind: IndustryPage): Tile[] {
  const standeeFor = ind.nfcFit ? `your ${ind.shareFlow.where}` : "a counter, desk or reception";
  const all: Tile[] = [
    {
      id: "qr", title: "QR code", meta: "All plans", cta: "See how it works", href: "/features", icon: <QrCode size={18} />,
      text: "Your QR as PNG or SVG in your colours, plus a printable counter standee. The link behind it never changes.",
    },
    {
      id: "nfcCard", title: "NFC card", meta: "Add-on", cta: "See pricing", price: priceOf("nfc_card"), href: "/pricing", icon: <Nfc size={18} />,
      text: "A PVC card with an NFC chip. Tap it on a phone, or scan the printed QR on the back, and your card opens.",
    },
    {
      id: "nfcStandee", title: "NFC standee", meta: "Add-on", cta: "See pricing", price: priceOf("nfc_standee"), href: "/pricing", icon: <SmartphoneNfc size={18} />,
      text: `A counter standee for ${standeeFor}. Customers tap their phone on it, or scan the printed QR, to open your card.`,
    },
    {
      id: "shareLink", title: "Short link & share menu", meta: "All plans", cta: "See how it works", href: "/features", icon: <Link2 size={18} />,
      text: "A digitalcarda.in/yourname link with a share menu for WhatsApp, Telegram, LinkedIn, Facebook, X, SMS and email, and a proper preview when it is pasted.",
    },
    {
      id: "emailSignature", title: "Email signature", meta: "Free tool", cta: "Open the free tool", href: "/email-signature-generator", icon: <Mail size={18} />,
      text: "Make a free email signature that links to your card, for Gmail, Outlook and Apple Mail.",
    },
    ind.bulkFit
      ? {
          id: "bulkCards", title: "Cards for your team", meta: "Teams", cta: "See team pricing", href: "/bulk-cards", icon: <Users size={18} />,
          text: "For 10 or more staff: add the team, pick one design and get volume pricing per card per year.",
        }
      : {
          id: "whatsappTemplates", title: "WhatsApp message templates", meta: "Free tool", cta: "Open the free tool", href: "/whatsapp-message-templates", icon: <FileText size={18} />,
          text: "Ready-to-copy WhatsApp Business messages that include your card link.",
        },
  ];
  const wideId: TileId = ind.nfcFit ? "nfcStandee" : "shareLink";
  const wide = all.find((t) => t.id === wideId)!;
  return [wide, ...all.filter((t) => t.id !== wideId)];
}

export default function ShareEverywhere({ ind }: { ind: IndustryPage }) {
  const tiles = tilesFor(ind);
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-[#0B1120] px-5 py-12 ring-1 ring-white/10 sm:px-10 sm:py-16">
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-30" />
      {/* Two static glows: one in the page accent, one gold. Nothing animates here. */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-[-10%] h-80 w-80 rounded-full opacity-60 blur-3xl" style={{ background: `${ind.theme.accent}33` }} />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-[-10%] h-72 w-72 rounded-full bg-[#F7B31C]/10 blur-3xl" />
      <div className="relative">
        <SectionHeading
          light
          eyebrow="Share it everywhere"
          title="One link, handed over any way you like"
          subtitle="The same card opens from a QR code, an NFC tap, a WhatsApp message or your email signature. Change your details once and every copy is up to date."
        />
        <Reveal stagger className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t, i) => (
            <BentoTile key={t.id} tile={t} wide={i === 0} last={i === tiles.length - 1} accent={ind.theme.accent} />
          ))}
        </Reveal>
      </div>
    </div>
  );
}

function BentoTile({ tile, wide, last, accent }: { tile: Tile; wide: boolean; last: boolean; accent: string }) {
  const span = wide ? "sm:col-span-2 sm:p-6 lg:row-span-2 lg:p-8" : last ? "sm:col-span-2 lg:col-span-1" : "";
  return (
    <Link
      to={tile.href}
      className={`group relative flex min-h-[132px] overflow-hidden rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/[0.07] hover:ring-[#F7B31C]/40 active:scale-[0.995] motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none ${FOCUS} ${span}`}
    >
      {/* A soft gold sheen fades in at the top-right corner on hover (opacity only). */}
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#F7B31C]/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none" />
      <div className={`relative flex w-full flex-col ${wide ? "sm:flex-row sm:items-center sm:gap-8 lg:items-stretch" : ""}`}>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7B31C]/15 text-[#F7B31C] ring-1 ring-[#F7B31C]/20 transition-all duration-300 group-hover:bg-[#F7B31C] group-hover:text-[#0F172A] motion-safe:group-hover:-rotate-6 motion-reduce:transition-none"
              aria-hidden="true"
            >
              {tile.icon}
            </span>
            <span className="flex flex-wrap items-center justify-end gap-2">
              {tile.price && (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-bold tabular-nums text-[#FCD34D] ring-1 ring-white/10">{tile.price}</span>
              )}
              <span className="rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#94A3B8] ring-1 ring-white/10">{tile.meta}</span>
            </span>
          </div>
          <h3 className={`mt-4 font-display font-extrabold leading-tight text-white ${wide ? "text-[18px] lg:text-[22px]" : "text-[16px]"}`}>{tile.title}</h3>
          <p className={`mt-1.5 leading-relaxed text-[#94A3B8] ${wide ? "text-[14px] lg:max-w-[36ch] lg:text-[15px]" : "text-[13.5px]"}`}>{tile.text}</p>
          <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-[#F7B31C]">
            {tile.cta}
            <ArrowUpRight size={14} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </span>
        </div>
        {wide && (
          <div className="hidden shrink-0 sm:flex sm:items-center" aria-hidden="true">
            {tile.id === "nfcStandee" ? <StandeeArt accent={accent} /> : <LinkArt accent={accent} />}
          </div>
        )}
      </div>
    </Link>
  );
}

/** A small counter standee with a decorative QR, drawn in CSS. Sizes are in
    em, so the root font-size scales the whole drawing (bigger on lg). A gold
    ring pulses out of the NFC badge like the tap signal (Tailwind's ping:
    transform + opacity only; off under reduced motion). */
function StandeeArt({ accent }: { accent: string }) {
  return (
    <div className="relative w-[15em] text-[10px] transition-transform duration-500 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:rotate-1 lg:text-[13px]">
      <div className="mx-auto w-[11.8em] rounded-2xl bg-white p-[1.2em] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/20">
        <div className="text-center text-[0.85em] font-bold uppercase tracking-[0.12em] text-[#0F172A]">Tap or scan</div>
        <div className="mx-auto mt-[0.8em] grid w-[6.4em] grid-cols-5 gap-[0.3em] rounded-md p-[0.6em] ring-1 ring-[#E2E8F0]">
          {QR_BITS.map((b, i) => (
            <span key={i} className="aspect-square rounded-[1.5px]" style={{ background: b ? "#0F172A" : "transparent" }} />
          ))}
        </div>
        <div className="mt-[0.8em] h-[0.6em] w-full rounded-full" style={{ background: accent }} />
        <div className="mx-auto mt-[0.6em] h-[0.6em] w-2/3 rounded-full bg-[#E2E8F0]" />
      </div>
      <div className="mx-auto -mt-[0.4em] h-[1.2em] w-[8.6em] rounded-b-xl bg-[#CBD5E1]" />
      <span className="absolute -right-[0.4em] top-[2.4em] flex items-center justify-center transition-transform duration-500 motion-safe:group-hover:translate-x-1">
        <span className="absolute inset-0 rounded-full bg-[#F7B31C]/50 animate-ping [animation-duration:2.6s] motion-reduce:animate-none" />
        <span className="relative rounded-full bg-[#0F172A] px-[0.8em] py-[0.2em] text-[1em] font-bold text-[#F7B31C] ring-1 ring-white/20">NFC</span>
      </span>
    </div>
  );
}

/** A link pill with the share destinations underneath; the chips rise one
    after another on hover. */
function LinkArt({ accent }: { accent: string }) {
  return (
    <div className="w-[19em] text-[10px] transition-transform duration-500 motion-safe:group-hover:-translate-y-1 lg:text-[12.5px]">
      <div className="flex items-center gap-[0.8em] rounded-xl bg-white px-[1.2em] py-[0.8em] text-[1.2em] font-semibold text-[#0F172A] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8)]">
        <span className="h-[0.7em] w-[0.7em] shrink-0 rounded-full" style={{ background: accent }} />
        <Link2 className="h-[1.1em] w-[1.1em] shrink-0 text-[#64748B]" />
        <span className="truncate">digitalcarda.in/<span className="text-[#B45309]">yourname</span></span>
      </div>
      <div className="mt-[0.8em] flex flex-wrap gap-[0.6em]">
        {["WhatsApp", "Telegram", "LinkedIn", "SMS", "Email"].map((s, i) => (
          <span
            key={s}
            className="rounded-full bg-white/10 px-[0.8em] py-[0.25em] text-[1.05em] font-semibold text-[#E2E8F0] ring-1 ring-white/10 transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5"
            style={{ transitionDelay: `${i * 40}ms` }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
