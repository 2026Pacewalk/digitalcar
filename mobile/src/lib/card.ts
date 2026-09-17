import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, trpc } from "./trpc";

/* The owner's card as the server has it. The server is the source of truth:
   the app reads the published snapshot, edits it, and saves it back with the
   version it started from, so web and app never silently overwrite each other. */

export type CardCustomer = Record<string, unknown> & {
  name?: string; designation?: string; company_name?: string; nature?: string;
  mobile1?: string; mobile2?: string; email?: string; url?: string; address?: string;
  about_us?: string; photo?: string; logo?: string; slug?: string; expired_on?: string;
};

export type CardSnapshot = {
  slug: string;
  cardId: number;
  updatedAt: string | null;
  data: {
    customer: CardCustomer;
    products?: unknown[];
    gallery?: unknown[];
    videos?: unknown[];
    offers?: unknown[];
    [key: string]: unknown;
  };
};

export const SNAPSHOT_KEY = ["card-snapshot"] as const;

export function useSnapshot() {
  return useQuery({
    queryKey: SNAPSHOT_KEY,
    queryFn: () => apiGet<CardSnapshot | null>("/api/my/snapshot"),
  });
}

export function useRefreshCard() {
  const qc = useQueryClient();
  const utils = trpc.useUtils();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: SNAPSHOT_KEY }),
      utils.invalidate(),
    ]);
  };
}

const str = (v: unknown) => String(v ?? "").trim();

/** Only real images: http(s) URLs or data URIs. */
export const imageOf = (v: unknown) => {
  const s = str(v);
  return /^(https?:|data:image\/)/i.test(s) ? s : "";
};

type Step = { key: string; label: string; hint: string; done: boolean; inApp: boolean };

/** Same idea as the web dashboard's "finish your card" list. `inApp` marks the
    steps this build can complete; the rest open the web editor. */
export function completeness(snap: CardSnapshot | null | undefined) {
  const c = snap?.data?.customer ?? {};
  const socials = ["facebook", "instagram", "linkedin", "youtube", "twitter"].some((k) => str(c[k]));
  const steps: Step[] = [
    { key: "photo", label: "Add your photo or logo", hint: "Faces and logos make cards easy to recognise.", done: !!(imageOf(c.photo) || imageOf(c.logo)), inApp: false },
    { key: "role", label: "Add your role and business", hint: "Tell people what you do in one line.", done: !!(str(c.designation) || str(c.company_name)), inApp: true },
    { key: "contact", label: "Add phone and WhatsApp", hint: "One tap to call or message you.", done: !!str(c.mobile1), inApp: true },
    { key: "email", label: "Add your email", hint: "For people who prefer email.", done: !!str(c.email), inApp: true },
    { key: "about", label: "Write a short About", hint: "Two or three lines on why customers choose you.", done: str(c.about_us).length > 20, inApp: true },
    { key: "address", label: "Add your address", hint: "Shows directions on your card.", done: !!str(c.address), inApp: true },
    { key: "services", label: "Add your services or products", hint: "Visitors enquire about what they can see.", done: (snap?.data?.products?.length ?? 0) > 0, inApp: false },
    { key: "social", label: "Link your social profiles", hint: "Let people follow you.", done: socials, inApp: false },
  ];
  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100), next: steps.find((s) => !s.done) ?? null };
}
