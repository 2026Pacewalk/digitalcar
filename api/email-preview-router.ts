import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery } from "./middleware";
import type { Email } from "./lib/email/kit";
import { previews as account } from "./lib/email/previews/account";
import { previews as lifecycle } from "./lib/email/previews/lifecycle";
import { previews as billing } from "./lib/email/previews/billing";
import { previews as nfc } from "./lib/email/previews/nfc";
import { previews as leads } from "./lib/email/previews/leads";
import { previews as referral } from "./lib/email/previews/referral";
import { previews as reseller } from "./lib/email/previews/reseller";
import { previews as admin } from "./lib/email/previews/admin";
import { previews as marketing } from "./lib/email/previews/marketing";

/* Admin → Email previews: every template rendered with the fictional sample
   data in api/lib/email/previews/, so the owner can see what customers get
   without sending anything. Read-only — nothing is emailed, logged or stored,
   and render() only takes an id from the list, never template input. */

type Audience = "customer" | "admin" | "visitor" | "reseller" | "prospect";
type Preview = { name: string; module: string; audience: Audience; variant?: string; render: () => Email };

// Menu order: what customers see first, owner alerts and marketing last.
const SOURCES: Preview[][] = [account, lifecycle, billing, nfc, leads, referral, reseller, admin, marketing];

/* Ids are built once from the static arrays, so they stay the same across
   restarts and a bookmarked ?id= keeps pointing at the same email. */
const REGISTRY: (Preview & { id: string })[] = (() => {
  const seen = new Set<string>();
  const out: (Preview & { id: string })[] = [];
  for (const list of SOURCES) {
    for (const p of list) {
      const base = `${p.module}.${p.name}.${p.variant || "default"}`;
      let id = base;
      for (let n = 2; seen.has(id); n++) id = `${base}-${n}`;
      seen.add(id);
      out.push({ ...p, id });
    }
  }
  return out;
})();

const BY_ID = new Map(REGISTRY.map((p) => [p.id, p]));

// A template that throws must not take the whole gallery down with it.
function renderSafe(p: Preview): Email & { error?: string } {
  try {
    return p.render();
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { kind: undefined, subject: `(failed to render: ${error})`, html: "", text: "", error };
  }
}

/* The list renders every preview to get its subject. Templates are pure
   functions of fixed sample data, so this is computed once per process. */
let listCache: { id: string; name: string; kind: string | null; module: string; audience: Audience; variant: string | null; subject: string }[] | null = null;

export const emailPreviewRouter = createRouter({
  list: adminQuery.query(() => {
    listCache ??= REGISTRY.map((p) => {
      const email = renderSafe(p);
      return {
        id: p.id, name: p.name, kind: email.kind ?? null, module: p.module,
        audience: p.audience, variant: p.variant ?? null, subject: email.subject,
      };
    });
    return listCache;
  }),

  render: adminQuery
    .input(z.object({ id: z.string().max(200) }))
    .query(({ input }) => {
      const p = BY_ID.get(input.id);
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "No preview with that id." });
      const email = renderSafe(p);
      return { subject: email.subject, html: email.html, text: email.text, kind: email.kind ?? null, error: email.error ?? null };
    }),
});
