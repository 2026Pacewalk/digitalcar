import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cardBlocks, cards } from "@db/schema";
import { eq, and, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const BLOCK_TYPES = [
  { id: "profile_header", name: "Profile Header", icon: "User", description: "Name, photo, title, and company", category: "header" },
  { id: "cover_image", name: "Cover Image", icon: "Image", description: "Large banner image at top", category: "header" },
  { id: "contact_info", name: "Contact Info", icon: "Phone", description: "Phone, email, address, website", category: "contact" },
  { id: "about_us", name: "About Us", icon: "FileText", description: "Business description and bio", category: "content" },
  { id: "services", name: "Services", icon: "Briefcase", description: "List of services offered", category: "content" },
  { id: "products", name: "Products", icon: "ShoppingBag", description: "Showcase products with prices", category: "content" },
  { id: "gallery", name: "Gallery", icon: "Grid3X3", description: "Photo gallery with lightbox", category: "media" },
  { id: "video", name: "Video", icon: "Play", description: "Embedded video player", category: "media" },
  { id: "pdf_brochure", name: "PDF Brochure", icon: "FileDown", description: "Downloadable PDF document", category: "media" },
  { id: "payment_qr", name: "Payment QR", icon: "QrCode", description: "QR code for payments", category: "business" },
  { id: "social_links", name: "Social Links", icon: "Share2", description: "Links to social profiles", category: "social" },
  { id: "website_link", name: "Website Link", icon: "Link", description: "Link to external website", category: "social" },
  { id: "business_hours", name: "Business Hours", icon: "Clock", description: "Opening hours schedule", category: "business" },
  { id: "map", name: "Map", icon: "MapPin", description: "Google Maps embed", category: "business" },
  { id: "testimonials", name: "Testimonials", icon: "Star", description: "Customer reviews carousel", category: "content" },
  { id: "enquiry_form", name: "Enquiry Form", icon: "MessageSquare", description: "Contact form for leads", category: "advanced" },
  { id: "whatsapp_button", name: "WhatsApp Button", icon: "MessageCircle", description: "Direct WhatsApp chat button", category: "contact" },
  { id: "custom_html", name: "Custom HTML", icon: "Code", description: "Custom code block", category: "advanced" },
];

export const blockRouter = createRouter({
  list: authedQuery
    .input(z.object({ cardId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const card = await db.query.cards.findFirst({
        where: and(eq(cards.id, input.cardId), eq(cards.userId, ctx.user.id)),
      });
      if (!card) throw new TRPCError({ code: "NOT_FOUND" });

      return db.query.cardBlocks.findMany({
        where: eq(cardBlocks.cardId, input.cardId),
        orderBy: [asc(cardBlocks.position)],
      });
    }),

  listTypes: authedQuery.query(() => {
    return BLOCK_TYPES;
  }),

  create: authedQuery
    .input(
      z.object({
        cardId: z.number(),
        type: z.string(),
        position: z.number(),
        config: z.record(z.string(), z.any()).optional(),
        content: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const card = await db.query.cards.findFirst({
        where: and(eq(cards.id, input.cardId), eq(cards.userId, ctx.user.id)),
      });
      if (!card) throw new TRPCError({ code: "NOT_FOUND" });

      const existingBlocks = await db.query.cardBlocks.findMany({
        where: eq(cardBlocks.cardId, input.cardId),
        orderBy: [asc(cardBlocks.position)],
      });

      for (const block of existingBlocks) {
        if (block.position >= input.position) {
          await db.update(cardBlocks)
            .set({ position: block.position + 1 })
            .where(eq(cardBlocks.id, block.id));
        }
      }

      const result = await db.insert(cardBlocks).values({
        cardId: input.cardId,
        type: input.type,
        position: input.position,
        config: input.config || {},
        content: input.content || getDefaultContent(input.type),
      }).$returningId();

      return db.query.cardBlocks.findFirst({
        where: eq(cardBlocks.id, result[0].id),
      });
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        position: z.number().optional(),
        isActive: z.boolean().optional(),
        config: z.record(z.string(), z.any()).optional(),
        content: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;

      const block = await db.query.cardBlocks.findFirst({
        where: eq(cardBlocks.id, id),
      });
      if (!block) throw new TRPCError({ code: "NOT_FOUND" });

      const card = await db.query.cards.findFirst({
        where: and(eq(cards.id, block.cardId), eq(cards.userId, ctx.user.id)),
      });
      if (!card) throw new TRPCError({ code: "FORBIDDEN" });

      await db.update(cardBlocks).set(data).where(eq(cardBlocks.id, id));
      return db.query.cardBlocks.findFirst({ where: eq(cardBlocks.id, id) });
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const block = await db.query.cardBlocks.findFirst({
        where: eq(cardBlocks.id, input.id),
      });
      if (!block) throw new TRPCError({ code: "NOT_FOUND" });

      const card = await db.query.cards.findFirst({
        where: and(eq(cards.id, block.cardId), eq(cards.userId, ctx.user.id)),
      });
      if (!card) throw new TRPCError({ code: "FORBIDDEN" });

      await db.delete(cardBlocks).where(eq(cardBlocks.id, input.id));
      return { success: true };
    }),

  reorder: authedQuery
    .input(
      z.object({
        cardId: z.number(),
        blockIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const card = await db.query.cards.findFirst({
        where: and(eq(cards.id, input.cardId), eq(cards.userId, ctx.user.id)),
      });
      if (!card) throw new TRPCError({ code: "NOT_FOUND" });

      for (let i = 0; i < input.blockIds.length; i++) {
        await db.update(cardBlocks)
          .set({ position: i })
          .where(eq(cardBlocks.id, input.blockIds[i]));
      }

      return db.query.cardBlocks.findMany({
        where: eq(cardBlocks.cardId, input.cardId),
        orderBy: [asc(cardBlocks.position)],
      });
    }),
});

function getDefaultContent(type: string): Record<string, unknown> {
  switch (type) {
    case "profile_header": return { name: "", title: "", company: "", bio: "" };
    case "contact_info": return { phone: "", email: "", address: "", website: "" };
    case "about_us": return { text: "" };
    case "services": return { items: [] };
    case "products": return { items: [] };
    case "gallery": return { images: [] };
    case "video": return { url: "" };
    case "pdf_brochure": return { title: "", fileUrl: "", fileSize: "" };
    case "payment_qr": return { paymentApp: "", upiId: "", qrImageUrl: "" };
    case "social_links": return { links: [] };
    case "website_link": return { url: "", label: "Visit Website" };
    case "business_hours": return { timezone: "", hours: [] };
    case "map": return { address: "", lat: null, lng: null };
    case "testimonials": return { items: [] };
    case "enquiry_form": return { title: "Get in Touch", fields: ["name", "email", "phone", "message"] };
    case "whatsapp_button": return { phone: "", message: "Hi, I found your card!" };
    case "custom_html": return { html: "" };
    default: return {};
  }
}
