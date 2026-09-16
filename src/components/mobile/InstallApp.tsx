import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import AppSheet from "@/components/mobile/AppSheet";
import { haptic, useInstallPrompt } from "@/lib/nativeApp";

const DISMISS_KEY = "dc_install_dismissed_at";
const SNOOZE_DAYS = 21;

function snoozed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < SNOOZE_DAYS * 86_400_000;
  } catch { return false; }
}

/** Runs the one-tap install where the browser supports it, otherwise opens the
    iPhone steps. Shared by the banner and the More-menu row. */
function useInstallAction() {
  const { canPrompt, needsIosSteps, installed, install } = useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);
  const run = async () => {
    haptic();
    if (canPrompt) {
      const r = await install();
      if (r === "accepted") { haptic("success"); toast.success("DigitalCarda is on your home screen"); }
      return r;
    }
    if (needsIosSteps) setIosOpen(true);
    return "unavailable" as const;
  };
  const sheet = <IosInstallSheet open={iosOpen} onClose={() => setIosOpen(false)} />;
  return { available: !installed && (canPrompt || needsIosSteps), run, sheet };
}

/* Offered once the user has spent a little time in the dashboard — never on the
   first second of the first visit, and snoozed for three weeks when declined. */
export function InstallAppBanner({ hidden = false }: { hidden?: boolean }) {
  const { available, run, sheet } = useInstallAction();
  const [ready, setReady] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (snoozed()) return;
    const t = window.setTimeout(() => setReady(true), 12_000);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setGone(true);
  };

  const show = available && ready && !gone && !hidden;
  return (
    <>
      {show && (
        <div className="fixed inset-x-3 z-40 animate-fade-in-up" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}>
          <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-[#0F172A] p-3 pr-2 text-white shadow-[0_18px_40px_-16px_rgba(2,6,23,0.7)]">
            <img src="/icons/app-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl ring-1 ring-white/10" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold leading-tight">Get the DigitalCarda app</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-[#94A3B8]">Your card, leads and QR — one tap from your home screen.</p>
            </div>
            <button type="button" onClick={async () => { const r = await run(); if (r !== "unavailable") setGone(true); }}
              className="dc-press h-9 shrink-0 rounded-xl bg-[#F7B31C] px-3.5 text-[13px] font-bold text-[#0F172A]">
              Install
            </button>
            <button type="button" onClick={dismiss} aria-label="Not now" className="flex h-9 w-8 shrink-0 items-center justify-center text-[#64748B]">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      {sheet}
    </>
  );
}

/** A row for the More menu. Renders nothing once installed. */
export function InstallAppRow() {
  const { available, run, sheet } = useInstallAction();
  if (!available) return sheet;
  return (
    <>
      <button type="button" onClick={run}
        className="dc-press flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-[#0F172A] to-[#1E293B] p-3 text-left text-white">
        <img src="/icons/app-192.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold">Install the app</span>
          <span className="block text-[11.5px] text-[#94A3B8]">Opens full-screen, works like any phone app</span>
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7B31C] text-[#0F172A]"><Download size={15} /></span>
      </button>
      {sheet}
    </>
  );
}

function IosInstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const steps = [
    { icon: Share, text: <>Tap the <b>Share</b> button — at the bottom in Safari, beside the address bar in Chrome</> },
    { icon: SquarePlus, text: <>Scroll down and choose <b>Add to Home Screen</b></> },
    { icon: Check, text: <>Tap <b>Add</b> — DigitalCarda appears with your other apps</> },
  ];
  return (
    <AppSheet open={open} onClose={onClose} title="Add DigitalCarda to your iPhone">
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#E7EAF0]">
        <img src="/icons/app-192.png" alt="" className="h-12 w-12 rounded-xl" />
        <div>
          <p className="text-[14px] font-bold text-[#0F172A]">DigitalCarda</p>
          <p className="text-[12px] text-[#64748B]">Full-screen, no App Store needed</p>
        </div>
      </div>
      <ol className="mt-3 overflow-hidden rounded-2xl bg-white ring-1 ring-[#E7EAF0]">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 border-b border-[#F1F5F9] px-3.5 py-3 last:border-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]"><s.icon size={16} /></span>
            <span className="flex-1 text-[13.5px] leading-snug text-[#334155]">{s.text}</span>
            <ChevronRight size={15} className="text-[#CBD5E1]" />
          </li>
        ))}
      </ol>
      <p className="mt-3 px-1 text-center text-[11.5px] text-[#94A3B8]">Don’t see “Add to Home Screen”? Update iOS, or open this page in Safari.</p>
    </AppSheet>
  );
}
