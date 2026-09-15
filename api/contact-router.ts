import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, asc } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { leads, users } from "@db/schema";
import { sendEmail, ownerAddress } from "./lib/mail";
import { contactReceivedEmail } from "./lib/email-templates";
import { enforceRateLimit, clientIp } from "./lib/rate-limit";

/* Public contact enquiries (the /contact form). Three things happen:

     1. Stored in the leads table with source "website", owned by the
        super-admin account, so it appears on the admin Leads page (see
        websiteEnquiries in api/boot.ts) and in that account's CRM.
     2. Emailed to the team inbox, with the sender set as reply-to.
     3. A confirmation is sent to the person who wrote in.

   The enquiry counts as received if it was stored OR delivered to the team;
   only when both fail does the visitor see an error.

   The confirmation deliberately does NOT repeat what the visitor typed. The
   form accepts any email address, and echoing free text back would let anyone
   send their own words to a stranger from our domain. */
const REQUIREMENTS: Record<string, string> = {
  digital_card: "Digital Business Card",
  bulk: "Bulk Cards for a Team",
  reseller: "Reseller Programme",
  custom_domain: "Custom Domain",
  enterprise: "Enterprise Setup",
  support: "Technical Support",
  other: "Other",
};

type ContactInput = {
  name: string; email: string; phone?: string; businessName?: string; requirement?: string; message?: string;
};

async function storeEnquiry(input: ContactInput, requirement: string | null, ip: string): Promise<boolean> {
  try {
    const db = getDb();
    const owner = await db.query.users.findFirst({
      where: eq(users.role, "super_admin"), orderBy: [asc(users.id)], columns: { id: true },
    });
    if (!owner) {
      console.error("[contact] no super-admin account to own the enquiry — not stored");
      return false;
    }
    const message = [requirement ? `Requirement: ${requirement}` : "", input.message || ""].filter(Boolean).join("\n");
    await db.insert(leads).values({
      userId: owner.id,
      fullName: input.name,
      email: input.email,
      phone: input.phone || null,
      company: input.businessName || null,
      message: message || null,
      source: "website",
      ipAddress: ip ? ip.slice(0, 45) : null,
    });
    return true;
  } catch (e) {
    console.error("[contact] could not store enquiry:", (e as Error).message);
    return false;
  }
}

export const contactRouter = createRouter({
  send: publicQuery
    .input(z.object({
      name: z.string().trim().min(1, "Name is required").max(255),
      email: z.string().trim().email("Enter a valid email").max(255),
      phone: z.string().trim().max(50).optional(),
      businessName: z.string().trim().max(255).optional(),
      requirement: z.string().trim().max(50).optional(),
      message: z.string().trim().max(4000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Each submission emails whatever address was typed, so cap how often
      // one visitor can send it.
      const ip = clientIp(ctx.req);
      enforceRateLimit(`contact:${ip}`, 5, 10 * 60_000);

      const userId = (ctx.user?.id as number | undefined) ?? null;
      const requirement = input.requirement ? (REQUIREMENTS[input.requirement] ?? input.requirement) : null;
      const lines = [
        `Name: ${input.name}`,
        `Email: ${input.email}`,
        `Phone: ${input.phone || "-"}`,
        `Business: ${input.businessName || "-"}`,
        `Requirement: ${requirement || "-"}`,
        input.message ? `Message: ${input.message}` : "",
        userId ? `From logged-in user #${userId}` : "From a guest",
      ].filter(Boolean);

      const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

      const stored = await storeEnquiry(input, requirement, ip);

      // sendEmail never throws — it reports failure in its return value.
      const team = await sendEmail(ownerAddress(), {
        kind: "contactEnquiryAdmin",
        subject: `New enquiry — ${input.name}${input.businessName ? ` (${input.businessName})` : ""}`,
        text: lines.join("\n"),
        html: `<h2>New website enquiry</h2><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`
          + (stored ? `<p>Also saved to Admin → Leads.</p>` : `<p><strong>Not saved to Admin → Leads</strong> — this email is the only record.</p>`),
      }, input.email);

      if (!stored && !team.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "We could not deliver your enquiry just now. Please reach us on WhatsApp or email instead.",
        });
      }

      // The visitor's confirmation. Best effort: the enquiry is already safe,
      // so a mail hiccup here must not turn into an error on their screen.
      void sendEmail(input.email, contactReceivedEmail({ name: input.name, requirement }), ownerAddress());

      return { ok: true };
    }),
});
