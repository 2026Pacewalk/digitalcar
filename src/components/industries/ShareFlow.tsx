/* "How a {client} reaches you": a four-frame storyboard for the page's
   ShareFlowKind, drawn from ind.sample (never numbers) inside a phone, with
   the four SHARE_STEPS beside it. The page renders the h2 above this.

   Motion is one 12 s CSS loop (industryCss.ts): each frame holds 3 s, the
   step beside it is tinted, its progress bar fills and a dot under the phone
   lights up, and the pieces inside a frame (buttons, bubbles, bars, the
   saved-contact sheet) share the frame's clock, so they spring in as it
   rises. The loop runs only while the block is in view (an IntersectionObserver
   toggles data-play on the root in an effect; it is never part of the render),
   pauses on hover or focus, and shows frame 1 at rest. With reduced motion
   nothing moves and every step reads as highlighted. */
import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  BatteryFull, ChartColumn, Check, CheckCheck, ContactRound, Image as ImageIcon, Inbox, MessageCircle, Mic, Nfc, Phone,
  Search, Signal, UserRound, Wifi,
} from "lucide-react";
import { SHARE_STEPS, fillTokens } from "@/data/industries";
import type { IndustryPage } from "@/data/industries";
import { Avatar, SampleQr } from "./HeroCard";

/* ── shared pieces ─────────────────────────────────────────────────────── */

function StatusBar({ light }: { light?: boolean }) {
  return (
    <div className="relative h-6 shrink-0">
      <span className="absolute left-1/2 top-[6px] h-[12px] w-[46px] -translate-x-1/2 rounded-full bg-[#0B1120]" />
      <span className={`absolute right-3 top-[6px] flex items-center gap-1 ${light ? "text-white/90" : "text-[#0F172A]"}`}>
        <Signal size={9} /><Wifi size={9} /><BatteryFull size={11} />
      </span>
    </div>
  );
}

function Frame({ n, className = "", children }: { n: number; className?: string; children: ReactNode }) {
  return (
    <div className={`dc-ind-frame absolute inset-0 flex flex-col ${className}`} data-n={n}>
      {children}
    </div>
  );
}

function Skeleton({ rows = 2, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-2 rounded-xl bg-white p-2.5 ring-1 ring-[#E2E8F0]">
          <span className="h-8 w-8 shrink-0 rounded-full bg-[#F1F5F9]" />
          <span className="flex-1">
            <span className="block h-[6px] w-1/2 rounded-full bg-[#E2E8F0]" />
            <span className="mt-1.5 block h-[5px] w-3/4 rounded-full bg-[#F1F5F9]" />
          </span>
        </div>
      ))}
    </div>
  );
}

/** The card header: accent band with avatar, name, role and organisation. */
function CardTop({ ind, fx }: { ind: IndustryPage; fx?: boolean }) {
  const { accent, ink } = ind.theme;
  const s = ind.sample;
  return (
    <div className="rounded-b-[22px] px-3 pb-3 text-white" style={{ background: `linear-gradient(165deg, ${accent}, ${ink} 55%)` }}>
      <StatusBar light />
      <div className="mt-1 flex items-center gap-2.5">
        <Avatar name={s.name} className={`h-10 w-10 text-[13px] ring-[3px] ring-white/40 ${fx ? "dc-ind-fx dc-ind-fx-pop-a" : ""}`} style={{ color: ink }} />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold leading-tight">{s.name}</p>
          <p className="truncate text-[9px] text-white/85">{s.role}</p>
          <p className="truncate text-[9px] text-white/70">{s.org}</p>
        </div>
      </div>
    </div>
  );
}

const GALLERY_TINTS: [string, string][] = [["33", "99"], ["4D", "B3"], ["26", "80"]];

/** The card below its header: Call / WhatsApp / Save, services and a gallery
    row. With `fx`, the pieces spring in on the frame's clock. */
function CardBody({ ind, fx }: { ind: IndustryPage; fx?: boolean }) {
  const { accent, ink } = ind.theme;
  const buttons: { Icon: typeof Phone; label: string; color: string; k: "a" | "b" | "c" }[] = [
    { Icon: Phone, label: "Call", color: ink, k: "a" },
    { Icon: MessageCircle, label: "WhatsApp", color: "#25D366", k: "b" },
    { Icon: ContactRound, label: "Save", color: ink, k: "c" },
  ];
  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 px-3 pt-3">
        {buttons.map(({ Icon, label, color, k }) => (
          <span key={label} className={`${fx ? `dc-ind-fx dc-ind-fx-pop-${k}` : ""} flex flex-col items-center gap-1 rounded-xl bg-white py-2 ring-1 ring-[#E2E8F0]`}>
            <Icon size={14} style={{ color }} />
            <span className="text-[8px] font-semibold text-[#334155]">{label}</span>
          </span>
        ))}
      </div>
      <div className="mt-3 px-3">
        <p className="mb-1 text-[7.5px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">Services</p>
        <div className="space-y-1.5">
          {ind.sample.services.map((sv) => (
            <div key={sv} className="flex items-center gap-1.5 rounded-xl bg-white px-2 py-1.5 ring-1 ring-[#E2E8F0]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
              <span className="truncate text-[9px] font-semibold text-[#0F172A]">{sv}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={`${fx ? "dc-ind-fx dc-ind-fx-rise-c" : ""} mt-3 px-3`}>
        <p className="mb-1 text-[7.5px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">Gallery</p>
        <div className="grid grid-cols-3 gap-1.5">
          {GALLERY_TINTS.map(([a, b], j) => (
            <span key={j} className="flex aspect-[4/3] items-center justify-center rounded-lg" style={{ background: `linear-gradient(135deg, ${accent}${a}, ${ink}${b})` }}>
              <ImageIcon size={12} className="text-white/85" />
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 px-3">
        <div className="rounded-xl bg-white p-2 ring-1 ring-[#E2E8F0]">
          <p className="mb-1 text-[7.5px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">Send an enquiry</p>
          <span className="block h-[16px] rounded-md bg-[#F8FAFC] ring-1 ring-[#E2E8F0]" />
        </div>
      </div>
    </>
  );
}

/** Frame 1 everywhere: the card opens. */
function CompactCard({ ind, n }: { ind: IndustryPage; n: number }) {
  return (
    <Frame n={n} className="bg-[#F8FAFC]">
      <CardTop ind={ind} fx />
      <CardBody ind={ind} fx />
    </Frame>
  );
}

/** "Contact saved": the phone's bottom sheet slides up over the dimmed card. */
function SavedSheet({ ind, n }: { ind: IndustryPage; n: number }) {
  const { ink } = ind.theme;
  const s = ind.sample;
  return (
    <Frame n={n} className="bg-[#F8FAFC]">
      <div className="opacity-40">
        <CardTop ind={ind} />
        <CardBody ind={ind} />
      </div>
      <div className="absolute inset-0 bg-[#0F172A]/20" />
      <div className="dc-ind-fx dc-ind-fx-sheet absolute inset-x-0 bottom-0 rounded-t-[22px] bg-white px-4 pb-5 pt-3 shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.35)]">
        <span className="mx-auto block h-1 w-9 rounded-full bg-[#E2E8F0]" />
        <div className="mt-3 flex items-center gap-2.5">
          <span className="dc-ind-fx dc-ind-fx-pop-c flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white">
            <Check size={16} strokeWidth={3} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#0F172A]">Contact saved</p>
            <p className="truncate text-[9px] text-[#64748B]">{s.name} · {s.org}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <span className="rounded-lg py-1.5 text-center text-[8.5px] font-bold text-white" style={{ background: ink }}>Open contact</span>
          <span className="rounded-lg py-1.5 text-center text-[8.5px] font-bold text-[#334155] ring-1 ring-[#E2E8F0]">Done</span>
        </div>
      </div>
    </Frame>
  );
}

/* ── counter-qr ────────────────────────────────────────────────────────── */

/** The visitor's camera pointed at the standee. */
function Standee({ ind }: { ind: IndustryPage }) {
  const { accent, ink } = ind.theme;
  return (
    <Frame n={0} className="bg-[#0F172A]">
      <StatusBar light />
      <div className="relative flex flex-1 flex-col items-center justify-center px-5 pb-4">
        <span className="pointer-events-none absolute inset-x-5 bottom-10 top-3 rounded-[20px] border-2 border-white/20" />
        <span className="pointer-events-none absolute left-8 top-6 h-5 w-5 rounded-tl-md border-l-2 border-t-2" style={{ borderColor: accent }} />
        <span className="pointer-events-none absolute right-8 top-6 h-5 w-5 rounded-tr-md border-r-2 border-t-2" style={{ borderColor: accent }} />
        <span className="pointer-events-none absolute bottom-[52px] left-8 h-5 w-5 rounded-bl-md border-b-2 border-l-2" style={{ borderColor: accent }} />
        <span className="pointer-events-none absolute bottom-[52px] right-8 h-5 w-5 rounded-br-md border-b-2 border-r-2" style={{ borderColor: accent }} />
        <div className="dc-ind-fx dc-ind-fx-rise-a relative w-[138px] rounded-t-2xl rounded-b-md bg-white p-3 text-center shadow-[0_20px_40px_-16px_rgba(0,0,0,0.7)]">
          <p className="text-[7.5px] font-bold uppercase tracking-[0.1em]" style={{ color: ink }}>Scan to save</p>
          <p className="truncate text-[10px] font-extrabold text-[#0F172A]">{ind.sample.org}</p>
          <span className="relative mx-auto mt-2 block h-[84px] w-[84px] rounded-md p-1 ring-1 ring-[#E2E8F0]" style={{ "--scan": "76px" } as CSSProperties}>
            <SampleQr seed={ind.slug} className="h-full w-full text-[#0F172A]" />
            <span className="dc-ind-fx dc-ind-fx-scan absolute inset-x-1 top-1 h-[2px] rounded-full" style={{ background: accent, boxShadow: `0 0 10px 1px ${accent}` }} />
          </span>
          <p className="mt-2 text-[7.5px] text-[#64748B]">Point your camera here</p>
        </div>
        <span className="h-2 w-[114px] rounded-b-lg bg-[#CBD5E1]" />
        <p className="mt-4 text-[9px] text-white/70">At your {ind.shareFlow.where}</p>
      </div>
    </Frame>
  );
}

/** The owner's Leads list with the new enquiry on top. */
function LeadsRow({ ind }: { ind: IndustryPage }) {
  const { accent, ink } = ind.theme;
  return (
    <Frame n={3} className="bg-[#F8FAFC]">
      <StatusBar />
      <div className="flex items-center gap-2 px-3 pt-1">
        <Inbox size={13} style={{ color: ink }} />
        <p className="text-[11px] font-bold text-[#0F172A]">Leads</p>
        <span className="ml-auto rounded-full px-1.5 py-[2px] text-[7.5px] font-bold" style={{ background: `${accent}1A`, color: ink }}>From your card</span>
      </div>
      <div className="mt-3 px-3">
        <p className="mb-1.5 text-[7.5px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">Today</p>
        <div className="dc-ind-fx dc-ind-fx-rise-a flex items-center gap-2 rounded-xl bg-white p-2.5" style={{ boxShadow: `0 0 0 1.5px ${accent}, 0 12px 28px -12px ${accent}` }}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: `${accent}1A`, color: ink }}>
            <UserRound size={14} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold text-[#0F172A]">A visitor</span>
            <span className="block truncate text-[8.5px] text-[#64748B]">Enquiry from your card</span>
          </span>
          <span className="dc-ind-fx dc-ind-fx-pop-c rounded-full px-1.5 py-[2px] text-[7.5px] font-bold text-white" style={{ background: ink }}>New</span>
        </div>
        <p className="mb-1.5 mt-3 text-[7.5px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">Earlier</p>
        <Skeleton rows={2} className="opacity-60" />
      </div>
      <div className="mt-auto grid grid-cols-2 gap-1.5 px-3 pb-4">
        <span className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-[8.5px] font-bold text-white" style={{ background: ink }}><Phone size={9} /> Call back</span>
        <span className="flex items-center justify-center gap-1 rounded-lg bg-[#25D366] py-1.5 text-[8.5px] font-bold text-white"><MessageCircle size={9} /> WhatsApp</span>
      </div>
    </Frame>
  );
}

/* ── whatsapp-link ─────────────────────────────────────────────────────── */

function ChatHeader({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#075E54] px-3 pb-2 text-white">
      <StatusBar light />
      <div className="mt-0.5 flex items-center gap-2">{children}</div>
    </div>
  );
}

/** Earlier messages in the chat, as shapes: a date pill and two bubbles. */
function ChatHistory() {
  return (
    <>
      <span className="mx-auto rounded-md bg-white/70 px-2 py-[2px] text-[7px] font-semibold text-[#64748B]">Today</span>
      <div className="mr-auto w-[58%] rounded-xl rounded-tl-sm bg-white p-2 shadow-sm">
        <span className="block h-[6px] w-4/5 rounded-full bg-[#E2E8F0]" />
        <span className="mt-1.5 block h-[6px] w-1/2 rounded-full bg-[#E2E8F0]" />
      </div>
      <div className="ml-auto w-[48%] rounded-xl rounded-tr-sm bg-[#DCF8C6] p-2 shadow-sm">
        <span className="block h-[6px] w-3/4 rounded-full bg-[#BBE5A6]" />
      </div>
      <div className="mr-auto w-[62%] rounded-xl rounded-tl-sm bg-white p-2 shadow-sm">
        <span className="block h-[6px] w-4/5 rounded-full bg-[#E2E8F0]" />
        <span className="mt-1.5 block h-[6px] w-2/5 rounded-full bg-[#E2E8F0]" />
      </div>
    </>
  );
}

/** The owner sends the card link; the chat shows its preview. */
function ChatLink({ ind }: { ind: IndustryPage }) {
  const { accent } = ind.theme;
  const s = ind.sample;
  return (
    <Frame n={0} className="bg-[#EFE7DD]">
      <ChatHeader>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20"><UserRound size={13} /></span>
        <span className="min-w-0">
          <span className="block truncate text-[10px] font-bold capitalize leading-tight">{ind.shareFlow.client}</span>
          <span className="block text-[7.5px] text-white/75">online</span>
        </span>
      </ChatHeader>
      <div className="flex flex-1 flex-col justify-end gap-2 px-3 pb-3">
        <ChatHistory />
        <div className="dc-ind-fx dc-ind-fx-pop-a ml-auto w-[86%] origin-bottom-right rounded-xl rounded-tr-sm bg-[#DCF8C6] p-1.5 shadow-sm">
          <div className="flex gap-2 rounded-lg bg-white/70 p-1.5">
            <span className="w-1 shrink-0 rounded-full" style={{ background: accent }} />
            <span className="min-w-0">
              <span className="block truncate text-[9px] font-bold text-[#0F172A]">{s.org}</span>
              <span className="block truncate text-[8px] text-[#475569]">{s.name} · {s.role}</span>
              <span className="block text-[7.5px] text-[#94A3B8]">digitalcarda.in</span>
            </span>
          </div>
          <p className="mt-1 truncate text-[8.5px] text-[#1D4ED8]">digitalcarda.in/…</p>
          <span className="flex justify-end text-[#53BDEB]"><CheckCheck size={10} /></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex-1 rounded-full bg-white px-3 py-1.5 text-[8px] text-[#94A3B8]">Message</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00A884] text-white"><Mic size={11} /></span>
        </div>
      </div>
    </Frame>
  );
}

/** The client tapped a service button: WhatsApp opens with the text typed. */
function ChatReply({ ind }: { ind: IndustryPage }) {
  const { ink } = ind.theme;
  const s = ind.sample;
  return (
    <Frame n={2} className="bg-[#EFE7DD]">
      <ChatHeader>
        <Avatar name={s.name} className="h-7 w-7 text-[9px]" style={{ color: ink }} />
        <span className="min-w-0">
          <span className="block truncate text-[10px] font-bold leading-tight">{s.name}</span>
          <span className="block truncate text-[7.5px] text-white/75">{s.org}</span>
        </span>
      </ChatHeader>
      <div className="flex flex-1 flex-col justify-end gap-2 px-3 pb-3">
        <span className="mx-auto rounded-md bg-white/70 px-2 py-[2px] text-[7px] font-semibold text-[#64748B]">Today</span>
        <div className="dc-ind-fx dc-ind-fx-pop-a ml-auto w-[88%] origin-bottom-right rounded-xl rounded-tr-sm bg-[#DCF8C6] p-2 shadow-sm">
          <p className="text-[9px] leading-snug text-[#0F172A]">Hi, I'm interested in "{s.services[0]}"</p>
          <span className="flex justify-end text-[#53BDEB]"><CheckCheck size={10} /></span>
        </div>
        <div className="dc-ind-fx dc-ind-fx-rise-c mr-auto flex w-max items-center gap-1 rounded-xl rounded-tl-sm bg-white px-2.5 py-2 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" /><span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" /><span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex-1 rounded-full bg-white px-3 py-1.5 text-[8px] text-[#94A3B8]">Message</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00A884] text-white"><Mic size={11} /></span>
        </div>
      </div>
    </Frame>
  );
}

/** Visits & taps: three bars of fixed relative height, deliberately unlabelled with numbers. */
function Analytics({ ind }: { ind: IndustryPage }) {
  const { accent, ink } = ind.theme;
  const bars: { label: string; h: string; k: "a" | "b" | "c"; bg: string }[] = [
    { label: "Opened from WhatsApp", h: "100%", k: "a", bg: accent },
    { label: "WhatsApp tap", h: "68%", k: "b", bg: `${accent}B3` },
    { label: "Call tap", h: "44%", k: "c", bg: `${accent}80` },
  ];
  return (
    <Frame n={3} className="bg-[#F8FAFC]">
      <StatusBar />
      <div className="flex items-center gap-2 px-3 pt-1">
        <ChartColumn size={13} style={{ color: ink }} />
        <p className="text-[11px] font-bold text-[#0F172A]">Visits & taps</p>
        <span className="ml-auto text-[7.5px] font-semibold text-[#64748B]">This week</span>
      </div>
      <div className="mx-3 mt-3 rounded-2xl bg-white p-3 ring-1 ring-[#E2E8F0]">
        <p className="text-[7.5px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">Where visitors came from</p>
        <div className="mt-3 flex h-[72px] items-end gap-2">
          {bars.map((b) => (
            <span key={b.k} className={`dc-ind-fx dc-ind-fx-grow-${b.k} block flex-1 rounded-t-md`} style={{ height: b.h, background: b.bg }} />
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-2 border-t border-[#F1F5F9] pt-1.5">
          {bars.map((b) => (
            <span key={b.k} className="text-center text-[7px] font-semibold leading-tight text-[#475569]">{b.label}</span>
          ))}
        </div>
      </div>
      <div className="dc-ind-fx dc-ind-fx-rise-c mx-3 mt-2 rounded-2xl bg-white p-3 ring-1 ring-[#E2E8F0]">
        <p className="text-[7.5px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">Most tapped</p>
        <div className="mt-2 space-y-1.5">
          {[["WhatsApp", "84%"], ["Call", "58%"], ["Save contact", "40%"]].map(([label, w]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-[52px] truncate text-[8px] font-semibold text-[#334155]">{label}</span>
              <span className="h-1.5 flex-1 rounded-full bg-[#F1F5F9]"><span className="block h-full rounded-full" style={{ width: w, background: `${accent}99` }} /></span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1 px-3">
        {["Opened from WhatsApp", "WhatsApp tap", "Call tap"].map((c) => (
          <span key={c} className="rounded-full bg-white px-2 py-[3px] text-[7.5px] font-semibold text-[#334155] ring-1 ring-[#E2E8F0]">{c}</span>
        ))}
      </div>
    </Frame>
  );
}

/* ── handover-nfc ──────────────────────────────────────────────────────── */

/** The NFC card comes up to the phone; ripples show the tap. */
function NfcTap({ ind }: { ind: IndustryPage }) {
  const { accent, ink } = ind.theme;
  const s = ind.sample;
  return (
    <Frame n={0} className="bg-[#0F172A]">
      <StatusBar light />
      <div className="relative flex flex-1 flex-col items-center px-4 pt-1 text-center">
        <p className="text-[10px] font-bold text-white">Tap to open</p>
        <p className="text-[8px] text-white/60">or scan the QR on the back</p>
        <span className="relative mt-5 flex h-16 w-16 items-center justify-center">
          <span className="dc-ind-fx dc-ind-fx-ripple-a absolute inset-0 rounded-full border-2" style={{ borderColor: accent }} />
          <span className="dc-ind-fx dc-ind-fx-ripple-b absolute inset-0 rounded-full border-2" style={{ borderColor: accent }} />
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20"><Nfc size={20} /></span>
        </span>
        <span className="mt-2 h-10 w-px border-l border-dashed border-white/25" />
        <div className="dc-ind-fx dc-ind-fx-rise-a mb-4 mt-auto w-[164px]">
          <div style={{ transform: "rotate(-7deg)" }}>
            <div className="dc-ind-fx dc-ind-fx-tap relative aspect-[1.586] rounded-xl p-2.5 text-left text-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]" style={{ background: `linear-gradient(165deg, ${accent}, ${ink} 45%)` }}>
              <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
              <span className="flex items-center justify-between">
                <Nfc size={12} className="opacity-90" />
                <span className="text-[6.5px] font-semibold uppercase tracking-[0.12em] opacity-80">Tap or scan</span>
              </span>
              <p className="mt-3 truncate text-[10.5px] font-extrabold">{s.org}</p>
              <p className="truncate text-[7.5px] opacity-80">{s.name} · {s.role}</p>
              <span className="absolute bottom-2 right-2 rounded-[3px] bg-white p-[2px]">
                <SampleQr seed={ind.slug} className="block h-5 w-5 text-[#0F172A]" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Every third letter of the alphabet, chosen so the persona's initial is one
    of them: nine index letters instead of the full column (fewer nodes). */
function indexLetters(initial: string): string[] {
  const at = Math.max(0, ALPHABET.indexOf(initial));
  return [...ALPHABET].filter((_, i) => (i - at) % 3 === 0);
}

/** Later, the client finds the owner in their phonebook. */
function Phonebook({ ind }: { ind: IndustryPage }) {
  const { accent, ink } = ind.theme;
  const s = ind.sample;
  // the surname's initial, skipping an honorific ("Dr. Anita Sharma" → "A")
  const initial = s.name.replace(/^\w+\.\s*/, "")[0]?.toUpperCase() ?? "A";
  return (
    <Frame n={3} className="bg-[#F8FAFC]">
      <StatusBar />
      <div className="relative px-3 pr-6">
        <p className="text-[11px] font-bold text-[#0F172A]">Contacts</p>
        <div className="dc-ind-fx dc-ind-fx-pop-a mt-2 flex origin-left items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 ring-1 ring-[#E2E8F0]">
          <Search size={10} className="text-[#94A3B8]" />
          <span className="truncate text-[9px] text-[#0F172A]">{s.name}</span>
          <span className="ml-auto h-[10px] w-[1.5px] shrink-0 bg-[#0F172A]" />
        </div>
        <div className="dc-ind-fx dc-ind-fx-rise-b mt-3 flex items-center gap-2 rounded-2xl bg-white p-2.5 shadow-premium ring-1 ring-[#E2E8F0]">
          <Avatar name={s.name} className="h-8 w-8 text-[10px]" style={{ background: `${accent}1A`, color: ink }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[9.5px] font-bold text-[#0F172A]">{s.name}</span>
            <span className="block truncate text-[8px] text-[#64748B]">{s.role} · {s.org}</span>
          </span>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: ink }}><Phone size={10} /></span>
        </div>
        <Skeleton rows={2} className="mt-2 opacity-50" />
        <span className="absolute right-1.5 top-8 flex flex-col items-center gap-[3px] text-[5.5px] font-semibold text-[#94A3B8]" aria-hidden="true">
          {indexLetters(initial).map((l) => <span key={l} style={l === initial ? { color: ink, fontWeight: 800 } : undefined}>{l}</span>)}
        </span>
      </div>
    </Frame>
  );
}

/* ── the storyboard ────────────────────────────────────────────────────── */

function Frames({ ind }: { ind: IndustryPage }) {
  switch (ind.shareFlow.kind) {
    case "counter-qr":
      return <><Standee ind={ind} /><CompactCard ind={ind} n={1} /><SavedSheet ind={ind} n={2} /><LeadsRow ind={ind} /></>;
    case "whatsapp-link":
      return <><ChatLink ind={ind} /><CompactCard ind={ind} n={1} /><ChatReply ind={ind} /><Analytics ind={ind} /></>;
    case "handover-nfc":
      return <><NfcTap ind={ind} /><CompactCard ind={ind} n={1} /><SavedSheet ind={ind} n={2} /><Phonebook ind={ind} /></>;
    default:
      return null;
  }
}

export default function ShareFlow({ ind }: { ind: IndustryPage }) {
  const ref = useRef<HTMLDivElement>(null);
  const { accent, ink } = ind.theme;
  const steps = SHARE_STEPS[ind.shareFlow.kind];

  /* data-play is never rendered (the server and the first client render
     agree on "paused at frame 1"); the observer toggles it on the DOM node
     itself, so being in view costs no React re-render. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.setAttribute("data-play", "");
      return () => el.removeAttribute("data-play");
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => el.toggleAttribute("data-play", e.isIntersecting));
    }, { threshold: 0.35 });
    io.observe(el);
    return () => {
      io.disconnect();
      el.removeAttribute("data-play");
    };
  }, []);

  return (
    <div ref={ref} className="dc-ind-flow lg:grid lg:grid-cols-12 lg:items-center lg:gap-10" data-kind={ind.shareFlow.kind}>
      {/* stage */}
      <div className="lg:order-2 lg:col-span-7">
        <div className="relative mx-auto w-[220px] lg:w-[250px]" aria-hidden="true">
          <span className="pointer-events-none absolute inset-4 rounded-full opacity-70 blur-2xl" style={{ background: `${accent}40` }} />
          <div className="relative aspect-[9/19] rounded-[34px] bg-[#0B1120] p-[7px] shadow-[0_30px_60px_-24px_rgba(15,23,42,0.55)] ring-1 ring-white/10">
            <div className="relative h-full overflow-hidden rounded-[28px] bg-[#F8FAFC]">
              <Frames ind={ind} />
            </div>
          </div>
        </div>
        {/* step dots: the same 12 s clock as the frames */}
        <div className="mt-5 flex justify-center gap-2" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className="relative h-2 w-2 rounded-full bg-[#CBD5E1]">
              <span className="dc-ind-hl absolute inset-0 rounded-full" data-n={i} style={{ background: accent, boxShadow: `0 0 0 3px ${accent}33` }} />
            </span>
          ))}
        </div>
        <p className="mt-3 text-center text-[12px] text-[#475569]">Sample card · fictional details</p>
      </div>

      {/* steps */}
      <ol className="mt-8 list-none space-y-3 lg:order-1 lg:col-span-5 lg:mt-0">
        {steps.map((step, i) => (
          <li key={i} className="relative rounded-2xl p-4 pl-[60px]">
            <span className="dc-ind-hl absolute inset-0 rounded-2xl" data-n={i} style={{ background: `${accent}14`, boxShadow: `inset 0 0 0 1px ${accent}33` }} aria-hidden="true" />
            <span className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#64748B] ring-1 ring-[#E2E8F0]" aria-hidden="true">
              {i + 1}
              <span className="dc-ind-hl absolute inset-0 flex items-center justify-center rounded-full text-white" data-n={i} style={{ background: ink }}>{i + 1}</span>
            </span>
            <p className="relative text-[15px] leading-snug text-[#475569]">
              <strong className="font-bold text-[#0F172A]">{fillTokens(step.title, ind)}</strong>{" "}
              {fillTokens(step.text, ind)}
            </p>
            <span className="dc-ind-bar absolute bottom-0 left-4 right-4 h-[3px] rounded-full" data-n={i} style={{ background: accent }} aria-hidden="true" />
          </li>
        ))}
      </ol>
    </div>
  );
}
