/* Loads Razorpay's checkout.js on demand and exposes a tiny typed wrapper around
   the global `Razorpay` constructor. The script is injected once and cached, so
   repeated checkouts don't re-download it. The Key ID is public; the secret only
   ever lives on the server. */

export type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayOptions = {
  key: string;
  amount: number; // paise
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", cb: (resp: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loader: Promise<boolean> | null = null;

/** Ensure checkout.js is loaded. Resolves true when window.Razorpay is available. */
export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loader) return loader;
  loader = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(!!window.Razorpay));
      existing.addEventListener("error", () => { loader = null; resolve(false); });
      if (window.Razorpay) resolve(true);
      return;
    }
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve(!!window.Razorpay);
    s.onerror = () => { loader = null; resolve(false); };
    document.body.appendChild(s);
  });
  return loader;
}

/** Open the Razorpay checkout modal. Returns the instance so callers can hook events. */
export async function openRazorpayCheckout(options: RazorpayOptions): Promise<RazorpayInstance> {
  const ready = await loadRazorpay();
  if (!ready || !window.Razorpay) throw new Error("Could not load the payment gateway. Check your connection and try again.");
  const rzp = new window.Razorpay(options);
  rzp.open();
  return rzp;
}
