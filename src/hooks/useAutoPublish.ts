import { useEffect, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { readCustomer, scopedKey, getActiveCardId } from "@/hooks/useCustomer";

/* Auto-publish: keep a LIVE card's public page in step with dashboard edits.

   When the owner of an already-live card (a published new-flow card, or a legacy
   customers.json card that is status:1) adds or edits content, re-snapshot it to
   the server so /slug updates without a manual "Publish" click. Debounced so a
   burst of edits results in one save. Brand-new, never-published cards are left
   alone until their owner does the first intentional Publish (which also starts
   their trial) — we never auto-activate a card.

   Mount once, high in the dashboard tree (ResponsiveDashboardLayout). */
export function useAutoPublish(): void {
  const saveSnapshot = trpc.publish.saveSnapshot.useMutation();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cache of "is this slug a live legacy card?" (undefined = not yet checked).
  const legacyLive = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const readList = (base: string) => {
      try { return JSON.parse(localStorage.getItem(scopedKey(base)) || "[]"); }
      catch { return []; }
    };

    const isLive = async (data: Record<string, unknown>, slug: string): Promise<boolean> => {
      if (Number(data.published) === 1 || Number(data.status) === 1) return true;
      // Fall back to a one-time server check: a live legacy card exists at /api/card/:slug.
      if (legacyLive.current === undefined) {
        try {
          const r = await fetch(`/api/card/${encodeURIComponent(slug)}`);
          legacyLive.current = r.ok && !!(await r.json())?.name;
        } catch { legacyLive.current = false; }
      }
      return legacyLive.current === true;
    };

    const run = async () => {
      const data = readCustomer();
      const slug = String(data.slug || data.username || "").trim().toLowerCase();
      if (slug.length < 3) return;
      if (!(await isLive(data, slug))) return; // never auto-activate a fresh card
      saveSnapshot.mutate({
        slug,
        cardId: getActiveCardId(),
        data: {
          customer: data,
          products: readList("dc_products"),
          gallery: readList("dc_gallery"),
          videos: readList("dc_videos"),
          offers: readList("dc_offers"),
          qrcodes: readList("dc_qrcode"),
        },
      });
    };

    const onChange = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { void run(); }, 1500);
    };

    window.addEventListener("dc:content-changed", onChange);
    return () => {
      window.removeEventListener("dc:content-changed", onChange);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [saveSnapshot]);
}
