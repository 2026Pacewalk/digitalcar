/* The pieces that make the website behave like an installed phone app:
 *
 *  - haptic()          a short vibration on taps that change something (Android;
 *                      iPhones ignore it silently)
 *  - install prompt    Chrome's "Install app" event is caught at startup and held
 *                      until the dashboard offers it; iPhones get instructions
 *  - service worker    registered on the real site only — offline pages + fast
 *                      repeat opens (public/sw.js)
 *  - edge-to-edge      viewport-fit=cover on app screens, so bars sit clear of the
 *                      notch and home indicator
 *  - keyboard open     hides bottom bars while the user is typing
 */
import { useEffect, useState, useSyncExternalStore } from "react";

type Vibe = "tap" | "success" | "warning";
const PATTERNS: Record<Vibe, number | number[]> = { tap: 8, success: [10, 40, 16], warning: [24, 60, 24] };

export function haptic(kind: Vibe = "tap") {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(PATTERNS[kind]);
  } catch { /* not supported */ }
}

/** Opened from the home-screen icon (no browser toolbar). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/* ── Install prompt ─────────────────────────────────────────────────────────── */

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let deferred: PromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Call once at startup — the browser fires the event early, before React mounts. */
export function captureInstallPrompt() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const snapshot = () => (installed ? "installed" : deferred ? "ready" : "none");

export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribe, snapshot, () => "none");
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => { setStandalone(isStandalone()); setIos(isIOS()); }, []);

  const install = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferred) return "unavailable";
    const ev = deferred;
    deferred = null;
    emit();
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    return outcome;
  };

  return {
    /** Chrome/Edge/Samsung Internet can install with one tap. */
    canPrompt: state === "ready",
    /** iPhone/iPad Safari: installing is manual (Share → Add to Home Screen). */
    needsIosSteps: ios && !standalone && state !== "installed",
    installed: standalone || state === "installed",
    install,
  };
}

/* ── Service worker ─────────────────────────────────────────────────────────── */

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const host = window.location.hostname;
  // Only the DigitalCarda site itself — never a customer's own card domain.
  if (host !== "digitalcarda.in" && host !== "www.digitalcarda.in") return;
  const go = () => navigator.serviceWorker.register("/service-worker", { scope: "/" }).catch(() => { /* site still works without it */ });
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}

/* ── Edge-to-edge on app screens ────────────────────────────────────────────── */

/** Lets the page draw under the notch/home indicator while mounted; the bars use
    env(safe-area-inset-*) to stay clear. Card pages keep the default viewport. */
export function useEdgeToEdge() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta) return;
    const before = meta.content;
    if (!/viewport-fit=cover/.test(before)) meta.content = `${before}, viewport-fit=cover`;
    return () => { meta.content = before; };
  }, []);
}

/* ── On-screen keyboard ─────────────────────────────────────────────────────── */

// Selects open a picker, not the keyboard, so they don't count.
const isField = (el: Element | null) =>
  !!el && (el instanceof HTMLTextAreaElement || (el as HTMLElement).isContentEditable
    || (el instanceof HTMLInputElement && !/^(checkbox|radio|button|submit|reset|range|color|file|image)$/.test(el.type)));

/** True while a text field has focus — bottom bars step aside for the keyboard. */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let t = 0;
    const check = () => {
      window.clearTimeout(t);
      // Focus moves between fields through `body` for a moment; wait it out so
      // the bar doesn't flicker when tapping from one input to the next.
      t = window.setTimeout(() => setOpen(isField(document.activeElement)), 60);
    };
    document.addEventListener("focusin", check);
    document.addEventListener("focusout", check);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("focusin", check);
      document.removeEventListener("focusout", check);
    };
  }, []);
  return open;
}
