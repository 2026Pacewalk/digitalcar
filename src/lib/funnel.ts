/* Fire-and-forget funnel step logging (Phase 23). Beacon so it never blocks
   navigation; safe to call on mount. */
export function logFunnel(stage: string, productSlug?: string, userId?: number) {
  try {
    const payload = JSON.stringify({ stage, productSlug, userId });
    const blob = new Blob([payload], { type: "application/json" });
    if (!navigator.sendBeacon || !navigator.sendBeacon("/api/funnel", blob)) throw new Error("beacon failed");
  } catch {
    try { fetch("/api/funnel", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage, productSlug, userId }) }); } catch { /* ignore */ }
  }
}
