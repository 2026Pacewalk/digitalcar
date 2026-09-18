import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiGet, errorMessage, errorTag, trpc } from "./trpc";
import { SNAPSHOT_KEY, type CardSnapshot } from "./card";

/* Every change the app makes to the card goes through here, one at a time.

   A change is a function from the card as it is now to the card as it should
   be ("add this service", "set these three fields"), not a finished copy of the
   whole card. So when the server says the card moved on since the app last
   saw it — edited on the website or another phone — the app fetches the latest
   card and applies the same change to that. Both sides' edits survive; only
   two edits of the very same field end with the later one winning. */

export type CardData = CardSnapshot["data"];
/** Returns the new card data, or null when there is nothing to change. */
export type CardChange = (data: CardData) => CardData | null;
export type UpdateResult = { ok: true } | { ok: false; message: string };

let queue: Promise<unknown> = Promise.resolve();
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function useCardUpdate() {
  const qc = useQueryClient();
  const utils = trpc.useUtils();

  /** `slug` moves the card to a new address (checked by the server). */
  return useCallback((change: CardChange, opts: { slug?: string } = {}): Promise<UpdateResult> => {
    const latest = async () => {
      const fresh = await apiGet<CardSnapshot | null>("/api/my/snapshot");
      qc.setQueryData(SNAPSHOT_KEY, fresh);
      return fresh;
    };

    const run = async (): Promise<UpdateResult> => {
      try {
        let base = qc.getQueryData<CardSnapshot | null>(SNAPSHOT_KEY) ?? await latest();
        for (let attempt = 0; attempt < 3; attempt++) {
          if (!base) return { ok: false, message: "Your card isn't published yet. Publish it on digitalcarda.in first." };
          const next = change(copy(base.data));
          if (!next) return { ok: true };
          try {
            const res = await utils.client.publish.saveSnapshot.mutate({
              slug: opts.slug ?? base.slug, cardId: base.cardId || 1, data: next,
              // The version this change was applied to; the server refuses the
              // save if the card changed since, and we apply it again below.
              baseTs: base.updatedAt ?? undefined,
            });
            qc.setQueryData<CardSnapshot>(SNAPSHOT_KEY, { ...base, slug: opts.slug ?? base.slug, data: next, updatedAt: res.updatedAt ?? base.updatedAt });
            return { ok: true };
          } catch (e) {
            if (errorTag(e) !== "SNAPSHOT_STALE") return { ok: false, message: errorMessage(e, "Couldn't save. Check your connection and try again.") };
            base = await latest();
          }
        }
        return { ok: false, message: "Your card keeps changing on another device. Try again in a moment." };
      } catch (e) {
        return { ok: false, message: errorMessage(e, "Couldn't save. Check your connection and try again.") };
      }
    };

    const result = queue.then(run, run);
    queue = result.catch(() => undefined);
    return result;
  }, [qc, utils]);
}

/** Card-level fields (on `customer`) as one change. */
export const setFields = (patch: Record<string, unknown>): CardChange => (d) => ({ ...d, customer: { ...d.customer, ...patch } });

/* ── Plan limits — the same table the website enforces (src/hooks/useCustomer.ts). ── */

type LimitKey = "product" | "offer" | "gallery" | "video" | "qrcode";
const LIMITS: Record<number, Record<LimitKey, number>> = {
  7: { product: 50, offer: 15, gallery: 20, video: 8, qrcode: 5 },    // Trial (Gold features)
  5: { product: 50, offer: 15, gallery: 20, video: 8, qrcode: 5 },    // Gold
  6: { product: 100, offer: 50, gallery: 60, video: 25, qrcode: 10 }, // Platinum
};
export function planLimit(data: CardData | undefined, key: LimitKey): number {
  const pkg = Number(data?.customer?.package_id) || 7;
  return (LIMITS[pkg] ?? LIMITS[7])[key];
}

/** Next id for an item list, as the website numbers them. */
export const nextId = (items: { id?: unknown }[]) => Math.max(0, ...items.map((i) => Number(i.id) || 0)) + 1;

/** A section's on/off flag with the website's defaults (offers and uploads start hidden). */
const SECTION_DEFAULTS: Record<string, number> = { offer_on: 0, uploads_on: 0, feedback_on: 0 };
export const sectionOn = (data: CardData | undefined, flag: string) =>
  Number(data?.customer?.[flag] ?? SECTION_DEFAULTS[flag] ?? 1) === 1;
