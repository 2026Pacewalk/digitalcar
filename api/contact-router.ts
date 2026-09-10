import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { sendEmail, ownerAddress } from "./lib/mail";

/* Public contact enquiries.
   The /contact form used to do nothing but flip a local "submitted" flag, so
   every enquiry it collected was thrown away. This delivers them to the team
   inbox with the sender set as reply-to, so a reply goes straight back to the
   person who wrote in.

   Deliberately email-only: storing these would need a new table, and a schema
   change on the live database is not worth the risk to stop the bleeding. If
   the enquiries should also appear in the admin panel, that is a small
   additive migration on top of this. */
const REQUIREMENTS: Record<string, string> = {
  digital_card: "Digital Business Card",
  bulk: "Bulk Cards for a Team",
  reseller: "Reseller Programme",
  custom_domain: "Custom Domain",
  enterprise: "Enterprise Setup",
  support: "Technical Support",
  other: "Other",
};

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
      const userId = (ctx.user?.id as number | undefined) ?? null;
      const req = input.requirement ? (REQUIREMENTS[input.requirement] ?? input.requirement) : "-";
      const lines = [
        `Name: ${input.name}`,
        `Email: ${input.email}`,
        `Phone: ${input.phone || "-"}`,
        `Business: ${input.businessName || "-"}`,
        `Requirement: ${req}`,
        input.message ? `Message: ${input.message}` : "",
        userId ? `From logged-in user #${userId}` : "From a guest",
      ].filter(Boolean);

      const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

      // sendEmail never throws — it reports failure in its return value — so
      // check it. Without this the visitor gets a success screen for an
      // enquiry that was never delivered, which is the exact bug this
      // endpoint exists to fix.
      const res = await sendEmail(ownerAddress(), {
        subject: `New enquiry — ${input.name}${input.businessName ? ` (${input.businessName})` : ""}`,
        text: lines.join("\n"),
        html: `<h2>New website enquiry</h2><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`,
      }, input.email);

      if (!res.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "We could not deliver your enquiry just now. Please reach us on WhatsApp or email instead.",
        });
      }

      return { ok: true };
    }),
});
