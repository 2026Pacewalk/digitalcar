/* "Share it everywhere": the ways a card gets handed over, as one compact grid
   of six equal tiles (icon beside the text) on a light, warm panel. The NFC standee
   leads when the profession works from a counter (ind.nfcFit), otherwise the
   short link. The last tile is team cards for bulkFit pages and WhatsApp
   message templates for the rest.

   A swipeable row on phones (six stacked tiles were ~1,400px tall), two
   columns on sm, three on lg (two full rows).

   Prices are read from src/lib/nfcProducts by id, never by index, and are
   omitted (not invented) if a product id ever disappears. */
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowUpRight, FileText, Link2, Mail, Nfc, QrCode, Sparkles, SmartphoneNfc, Users } from "lucide-react";
import { Reveal } from "@/components/public/Reveal";
import { inr, type IndustryPage } from "@/data/industries";
import { nfcProduct, type NfcProductId } from "@/lib/nfcProducts";

type TileId = "qr" | "nfcCard" | "nfcStandee" | "shareLink" | "emailSignature" | "bulkCards" | "whatsappTemplates";
type Tile = { id: TileId; title: string; text: string; href: string; meta: string; cta: string; price?: string; icon: ReactNode };

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]";
const priceOf = (id: NfcProductId) => { const p = nfcProduct(id); return p ? inr(p.price) : undefined; };

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
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#FFFBEB] via-white to-[#F8FAFC] px-5 py-8 ring-1 ring-[#F3E6C4] sm:px-8 sm:py-10">
      <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-70 [mask-image:radial-gradient(ellipse_at_top,black_35%,transparent_80%)]" />
      {/* Two soft static glows: one in the page accent, one gold. Nothing animates here. */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-[-10%] h-72 w-72 rounded-full opacity-70 blur-3xl" style={{ background: `${ind.theme.accent}1f` }} />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-[-10%] h-64 w-64 rounded-full bg-[#F7B31C]/15 blur-3xl" />
      <div className="relative">
        <Reveal className="mx-auto mb-7 max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E] ring-1 ring-[#FDE68A]">
            <Sparkles size={12} aria-hidden="true" /> Share it everywhere
          </span>
          <h2 className="mt-3 font-display text-[1.6rem] font-extrabold leading-tight tracking-tight text-[#0F172A] sm:text-[2rem]">One link, handed over any way you like</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[#64748B]">A QR code, an NFC tap, a WhatsApp message or your email signature — change your details once and every copy is up to date.</p>
        </Reveal>
        <Reveal stagger className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar scroll-px-5 px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {tiles.map((t) => <ShareTile key={t.id} tile={t} />)}
        </Reveal>
      </div>
    </div>
  );
}

function ShareTile({ tile }: { tile: Tile }) {
  return (
    <Link
      to={tile.href}
      className={`group relative flex w-[80%] shrink-0 snap-start gap-3.5 overflow-hidden rounded-2xl sm:w-auto bg-white p-4 ring-1 ring-[#E9EDF3] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.3)] hover:ring-[#F7B31C]/60 active:scale-[0.995] motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none ${FOCUS}`}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#B45309] ring-1 ring-[#FDE68A] transition-all duration-300 group-hover:bg-[#F7B31C] group-hover:text-[#0F172A] motion-safe:group-hover:-rotate-6 motion-reduce:transition-none"
        aria-hidden="true"
      >
        {tile.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-display text-[15px] font-extrabold leading-tight text-[#0F172A]">{tile.title}</h3>
          {tile.price && <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#92400E] ring-1 ring-[#FDE68A]">{tile.price}</span>}
          <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#64748B] ring-1 ring-[#E2E8F0]">{tile.meta}</span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-[#475569]">{tile.text}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#B45309]">
          {tile.cta}
          <ArrowUpRight size={13} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
