import { useEffect, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { readCustomer, scopedKey, getActiveCardId } from "@/hooks/useCustomer";
import { pullLatestSnapshot } from "@/hooks/useCardHydration";
import { healUploadUrl } from "@/lib/img";

// Remember the last slug we did an initial sync for, so navigating between
// dashboard pages doesn't re-snapshot on every mount — only once per card.
let initialSyncedSlug: string | null = null;

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
  // `useMutation()` returns a NEW object every render, so it must NOT be an effect
  // dependency — otherwise every re-render tears the effect down and clears the
  // pending debounce timer, cancelling the save. Editing content inherently
  // re-renders (state change + toast), so a `[saveSnapshot]` dep meant the
  // debounced auto-publish was almost always cancelled before it fired (a card
  // edit never reached the public page). Keep the latest `mutate` in a ref and
  // set the listener up ONCE (empty deps) instead.
  const saveRef = useRef(saveSnapshot);
  saveRef.current = saveSnapshot;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cache of "is this slug a live legacy card?" (undefined = not yet checked).
  const legacyLive = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const readList = (base: string) => {
      try {
        const arr = JSON.parse(localStorage.getItem(scopedKey(base)) || "[]");
        // Heal stale image hosts so the published snapshot never carries a dead
        // (e.g. old dev-host) URL — see healUploadUrl.
        return Array.isArray(arr)
          ? arr.map((it) => (it && typeof it.filename === "string" ? { ...it, filename: healUploadUrl(it.filename) } : it))
          : [];
      } catch { return []; }
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
      // Don't publish until first-load hydration has SETTLED. useCardHydration
      // sets this marker when it finishes (or when it deliberately skips because
      // a local card already exists). Publishing before then can snapshot a
      // half-hydrated readCustomer() — name + phone present but company, title,
      // website, address and the products/gallery/videos lists still blank — and
      // silently overwrite a good public snapshot with that stub. Gate on it.
      const data = readCustomer();
      const slug = String(data.slug || data.username || "").trim().toLowerCase();
      if (slug.length < 3) return;
      if (localStorage.getItem(scopedKey("dc_hydrated")) !== "1") return;
      if (!(await isLive(data, slug))) return; // never auto-activate a fresh card

      const products = readList("dc_products"), gallery = readList("dc_gallery"),
        videos = readList("dc_videos"), offers = readList("dc_offers"), qrcodes = readList("dc_qrcode");

      // SAFETY NET: never let auto-publish REPLACE a live card with a stub.
      // The signup seed leaves name + account email + phone and nothing else; a
      // card that is already live was published with more than that. If all the
      // "substance" fields are empty AND there is no content at all, treat this
      // as a half-loaded state rather than a real edit and skip the publish.
      // (A manual Publish still works — this only guards the automatic path.)
      const filled = (k: string) => String((data as Record<string, unknown>)[k] ?? "").trim().length > 0;
      const hasSubstance =
        ["company_name", "designation", "about_us", "address", "url", "nature"].some(filled) ||
        products.length || gallery.length || videos.length || offers.length || qrcodes.length;
      if (!hasSubstance) return;
      saveRef.current.mutate({
        slug,
        cardId: getActiveCardId(),
        data: { customer: data, products, gallery, videos, offers, qrcodes },
        // Optimistic-concurrency base: the server rejects this save if the card
        // was published from another device since this browser last synced —
        // a stale browser can never silently roll the live card back.
        baseTs: localStorage.getItem(scopedKey("dc_snap_ts")) || undefined,
      }, {
        onSuccess: (res) => {
          const ts = (res as { updatedAt?: string | null })?.updatedAt;
          if (ts) { try { localStorage.setItem(scopedKey("dc_snap_ts"), ts); } catch { /* ignore */ } }
        },
        onError: (err) => {
          // Rejected as stale → the server snapshot is authoritative. Pull it
          // down and RELOAD so the open pages' React state matches the fresh
          // storage — otherwise the stale in-memory data would just be pushed
          // again on the next edit. Rare (another device published, or local
          // dev re-imported the live DB), so a one-off reload is fine.
          if (String((err as { message?: string })?.message || "").includes("SNAPSHOT_STALE")) {
            void pullLatestSnapshot().then((pulled) => {
              if (pulled) window.location.reload();
            });
          }
        },
      });
    };

    const onChange = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { void run(); }, 1500);
    };

    window.addEventListener("dc:content-changed", onChange);

    // Initial sync: push whatever is already in the dashboard for a live card,
    // so content added before this ran (or in another browser) reaches the
    // public page without needing a fresh edit. Delayed so first-load hydration
    // finishes first; guarded to run once per card per page-load.
    const initial = setTimeout(() => {
      const slug = String(readCustomer().slug || readCustomer().username || "").trim().toLowerCase();
      if (slug.length >= 3 && initialSyncedSlug !== slug) {
        initialSyncedSlug = slug;
        void run();
      }
    }, 2500);

    return () => {
      window.removeEventListener("dc:content-changed", onChange);
      // Flush a pending debounced save instead of dropping it, so an edit made
      // right before navigating away (e.g. leaving the dashboard to view the
      // public card) still reaches the server.
      if (timer.current) { clearTimeout(timer.current); void run(); }
      clearTimeout(initial);
    };
    // Mount-once: the listener + debounce must survive re-renders (see saveRef).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
