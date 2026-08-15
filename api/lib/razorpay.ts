/* Razorpay Standard Checkout — backend helper.
   Dependency-free (native fetch + Node crypto), mirroring this codebase's
   preference for not pulling in an SDK for a couple of HTTP calls.

   Credentials are passed IN by the caller (the payment router resolves them from
   admin-set DB settings, falling back to env) so the same functions serve both
   test and live keys. The KEY_SECRET is only ever used server-side to authenticate
   the order call and sign/verify the payment signature — it never leaves the server. */
import crypto from "node:crypto";

const API_BASE = "https://api.razorpay.com/v1";

export type RazorpayCreds = { keyId: string; keySecret: string };

/** Credentials from the process environment (the fallback / bootstrap source). */
export const envRazorpayCreds = (): RazorpayCreds => ({
  keyId: process.env.RAZORPAY_KEY_ID ?? "",
  keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
});

/** True only when both halves of a credential pair are present. */
export const credsComplete = (c: RazorpayCreds): boolean => !!c.keyId && !!c.keySecret;

/** "live" vs "test" inferred from the key id prefix (rzp_live_… / rzp_test_…). */
export const inferMode = (keyId: string): "live" | "test" => (keyId.startsWith("rzp_live") ? "live" : "test");

export type RazorpayOrder = {
  id: string;
  amount: number;   // paise
  currency: string;
  receipt?: string;
  status: string;
};

/** Create an order via POST https://api.razorpay.com/v1/orders (HTTP Basic auth). */
export async function createRazorpayOrder(
  params: { amount: number; currency?: string; receipt?: string; notes?: Record<string, string> },
  creds: RazorpayCreds,
): Promise<RazorpayOrder> {
  if (!credsComplete(creds)) {
    throw new Error("Razorpay is not configured (key id / secret missing).");
  }
  const amount = Math.round(params.amount);
  if (!Number.isFinite(amount) || amount < 100) {
    throw new Error("Amount must be at least 100 paise (₹1).");
  }

  const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64");
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      amount,
      currency: params.currency ?? "INR",
      receipt: params.receipt,
      notes: params.notes,
      payment_capture: 1, // auto-capture on successful authorization
    }),
  });

  if (!res.ok) {
    // Surface auth vs. other API failures so the router can map the HTTP status.
    let detail = "";
    try { detail = JSON.stringify(await res.json()); } catch { /* body not JSON */ }
    const err = new Error(`Razorpay order creation failed (${res.status}): ${detail}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as RazorpayOrder;
}

/** Verify the checkout signature: HMAC_SHA256(order_id + "|" + payment_id, keySecret).
    Constant-time compare so a mismatch can't be timing-probed. */
export function verifyRazorpaySignature(
  input: { orderId: string; paymentId: string; signature: string },
  keySecret: string,
): boolean {
  if (!keySecret || !input.orderId || !input.paymentId || !input.signature) return false;
  return timingSafeHexEqual(
    crypto.createHmac("sha256", keySecret).update(`${input.orderId}|${input.paymentId}`).digest("hex"),
    input.signature,
  );
}

/** Verify a webhook: HMAC_SHA256(rawBody, webhookSecret) must equal the
    X-Razorpay-Signature header. The webhook secret is set in the Razorpay
    dashboard when creating the webhook — it is NOT the API key secret. */
export function verifyRazorpayWebhook(rawBody: string, signature: string | undefined, webhookSecret: string): boolean {
  if (!webhookSecret || !signature || !rawBody) return false;
  return timingSafeHexEqual(
    crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex"),
    signature,
  );
}

function timingSafeHexEqual(expectedHex: string, givenHex: string): boolean {
  const a = Buffer.from(expectedHex);
  const b = Buffer.from(givenHex);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type RazorpayOrderFull = RazorpayOrder & { notes?: Record<string, string> };

/** Fetch a single order (to read the notes we stashed at creation time — userId,
    packageId, billingCycle, planName — when activating from a webhook). */
export async function fetchRazorpayOrder(orderId: string, creds: RazorpayCreds): Promise<RazorpayOrderFull> {
  if (!credsComplete(creds)) throw new Error("Razorpay is not configured.");
  const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64");
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Razorpay order fetch failed (${res.status})`);
  return (await res.json()) as RazorpayOrderFull;
}
