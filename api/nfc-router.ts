import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { nfcOrders, publishedCards, users, type NfcOrder } from "@db/schema";
import { resolveRazorpay } from "./payment-router";
import { createRazorpayOrder, verifyRazorpaySignature, fetchRazorpayOrder } from "./lib/razorpay";
import { sendEmail, ownerAddress } from "./lib/mail";
import { nfcOrderConfirmedEmail, nfcOrderShippedEmail } from "./lib/email-templates";
import { enforceRateLimit, clientIp } from "./lib/rate-limit";
import { NFC_PRODUCTS, NFC_DELIVERY, NFC_MAX_QTY, nfcProduct } from "../src/lib/nfcProducts";

/* Physical NFC products — the PVC card and the standee — ordered from the
   customer dashboard and printed + shipped by the team.

   Money rules:
     · The price comes from src/lib/nfcProducts.ts on the server; the browser
       only says which product and how many.
     · An order is created as "pending_payment" with a Razorpay order whose
       notes carry the user and order id. It only becomes "paid" when the
       payment signature verifies AND the gateway's own order (its notes and
       amount) matches this order — so one payment can't be replayed against
       another order or account.
     · Without online payment switched on, the order is still saved and the
       team is emailed to arrange payment. */

const SITE = "https://digitalcarda.in";

const text = (max: number) => z.string().trim().max(max);
const indianMobile = z.string().trim()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+?91)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"));

const orderInput = z.object({
  product: z.enum(["nfc_card", "nfc_standee"]),
  quantity: z.number().int().min(1).max(NFC_MAX_QTY),
  print: z.object({
    name: text(120).min(1, "Add the name to print"),
    title: text(120).optional(),
    company: text(160).optional(),
    phone: text(40).optional(),
    logoUrl: text(500).optional(),
  }),
  shipping: z.object({
    name: text(120).min(2, "Add the recipient's name"),
    phone: indianMobile,
    line1: text(255).min(5, "Add the street address"),
    line2: text(255).optional(),
    city: text(100).min(2, "Add the city"),
    state: text(100).min(2, "Choose the state"),
    pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
  }),
});

const STATUSES = ["pending_payment", "paid", "in_production", "shipped", "delivered", "cancelled"] as const;

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string));
const money = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;

/** The link the NFC chip and printed QR open: the account's primary published card. */
async function cardUrlFor(db: ReturnType<typeof getDb>, userId: number): Promise<string | null> {
  try {
    const rows = await db.select({ slug: publishedCards.slug }).from(publishedCards)
      .where(eq(publishedCards.userId, userId)).orderBy(asc(publishedCards.cardId)).limit(1);
    return rows[0]?.slug ? `${SITE}/${rows[0].slug}` : null;
  } catch {
    return null;
  }
}

const addressOf = (o: NfcOrder) =>
  [o.shipLine1, o.shipLine2, o.shipCity, `${o.shipState} ${o.shipPincode}`].filter(Boolean).join(", ");

const printLinesOf = (o: NfcOrder) =>
  [o.printName, o.printTitle, o.printCompany, o.printPhone].filter((x): x is string => !!x);

function notifyTeam(o: NfcOrder, headline: string) {
  const product = nfcProduct(o.product);
  const lines = [
    `Order #${o.id}`,
    `${o.quantity} × ${product?.name ?? o.product} (${product?.print ?? ""}) = ${money(Number(o.amount))}`,
    `Print: ${printLinesOf(o).join(" · ")}`,
    `NFC chip + QR open: ${o.cardUrl}`,
    o.logoUrl ? `Logo: ${o.logoUrl}` : "Logo: none on the card",
    `Ship to: ${o.shipName}, ${o.shipPhone}`,
    `Address: ${addressOf(o)}`,
    `Promised delivery: ${NFC_DELIVERY.label}, free`,
  ];
  return sendEmail(ownerAddress(), {
    kind: "nfcOrderAdmin",
    subject: `NFC order #${o.id} — ${o.quantity} × ${product?.name ?? o.product} (${headline})`,
    text: [headline, ...lines].join("\n"),
    html: `<h2>${esc(headline)}</h2><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p>Manage it in Admin → NFC Orders.</p>`,
  });
}

export const nfcRouter = createRouter({
  // Products, whether online payment is on, the link that will be printed, and
  // the signed-in user's orders.
  mine: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const cr = await resolveRazorpay(db);
    let orders: NfcOrder[] = [];
    try {
      orders = await db.select().from(nfcOrders).where(eq(nfcOrders.userId, ctx.user.id))
        .orderBy(desc(nfcOrders.createdAt)).limit(50);
    } catch { orders = []; }
    return {
      products: NFC_PRODUCTS,
      delivery: NFC_DELIVERY,
      onlinePay: cr.enabled,
      cardUrl: await cardUrlFor(db, ctx.user.id),
      // An online checkout that was opened and closed without paying isn't an
      // order the customer placed — leave those out of their list.
      orders: orders.filter((o) => o.status !== "pending_payment" || !o.razorpayOrderId),
    };
  }),

  checkout: authedQuery.input(orderInput).mutation(async ({ ctx, input }) => {
    enforceRateLimit(`nfc:${clientIp(ctx.req)}`, 10, 10 * 60_000);
    const db = getDb();
    const product = nfcProduct(input.product);
    if (!product) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown product." });

    const cardUrl = await cardUrlFor(db, ctx.user.id);
    if (!cardUrl) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Publish your card first — the NFC chip and QR code open your card link." });
    }

    const amount = product.price * input.quantity;
    const logoUrl = input.print.logoUrl && /^https:\/\//i.test(input.print.logoUrl) ? input.print.logoUrl : null;
    const [inserted] = await db.insert(nfcOrders).values({
      userId: ctx.user.id,
      product: product.id,
      quantity: input.quantity,
      unitPrice: product.price.toFixed(2),
      amount: amount.toFixed(2),
      printName: input.print.name,
      printTitle: input.print.title || null,
      printCompany: input.print.company || null,
      printPhone: input.print.phone || null,
      cardUrl,
      logoUrl,
      shipName: input.shipping.name,
      shipPhone: input.shipping.phone,
      shipLine1: input.shipping.line1,
      shipLine2: input.shipping.line2 || null,
      shipCity: input.shipping.city,
      shipState: input.shipping.state,
      shipPincode: input.shipping.pincode,
      status: "pending_payment",
    });
    const orderId = Number(inserted.insertId);

    const cr = await resolveRazorpay(db);
    if (!cr.enabled) {
      const [order] = await db.select().from(nfcOrders).where(eq(nfcOrders.id, orderId));
      if (order) void notifyTeam(order, "Awaiting payment — contact the customer to collect it");
      return { manual: true as const, orderId };
    }

    const rzp = await createRazorpayOrder({
      amount: amount * 100,
      currency: "INR",
      receipt: `nfc_${orderId}`,
      notes: { userId: String(ctx.user.id), nfcOrderId: String(orderId), product: product.id, quantity: String(input.quantity) },
    }, cr);
    await db.update(nfcOrders).set({ razorpayOrderId: rzp.id }).where(eq(nfcOrders.id, orderId));

    return {
      orderId,
      keyId: cr.keyId,
      razorpayOrderId: rzp.id,
      amount: rzp.amount,
      currency: rzp.currency,
      prefill: { name: input.shipping.name, contact: input.shipping.phone, email: ctx.user.email },
    };
  }),

  verify: authedQuery
    .input(z.object({
      razorpayOrderId: z.string().min(1),
      razorpayPaymentId: z.string().min(1),
      razorpaySignature: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const cr = await resolveRazorpay(db);
      const genuine = verifyRazorpaySignature(
        { orderId: input.razorpayOrderId, paymentId: input.razorpayPaymentId, signature: input.razorpaySignature },
        cr.keySecret,
      );
      if (!genuine) throw new TRPCError({ code: "BAD_REQUEST", message: "Payment verification failed." });

      let gatewayOrder;
      try {
        gatewayOrder = await fetchRazorpayOrder(input.razorpayOrderId, cr);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not confirm this payment with the gateway. If you were charged, contact support with your payment ID." });
      }
      const notes = gatewayOrder.notes || {};
      if (String(notes.userId || "") !== String(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This payment belongs to another account." });
      }

      const [order] = await db.select().from(nfcOrders)
        .where(and(eq(nfcOrders.id, Number(notes.nfcOrderId)), eq(nfcOrders.userId, ctx.user.id)));
      if (!order || order.razorpayOrderId !== input.razorpayOrderId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This payment doesn't match an order. Contact support with your payment ID." });
      }
      if (Math.round(Number(order.amount) * 100) !== Number(gatewayOrder.amount)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The paid amount doesn't match this order. Contact support with your payment ID." });
      }

      // Idempotent: a repeated verify (double click, retry) confirms once.
      if (order.status === "pending_payment") {
        await db.update(nfcOrders)
          .set({ status: "paid", razorpayPaymentId: input.razorpayPaymentId, paidAt: new Date() })
          .where(and(eq(nfcOrders.id, order.id), eq(nfcOrders.status, "pending_payment")));
        const [paid] = await db.select().from(nfcOrders).where(eq(nfcOrders.id, order.id));
        if (paid) {
          const product = nfcProduct(paid.product);
          void sendEmail(ctx.user.email, nfcOrderConfirmedEmail({
            name: paid.shipName,
            orderId: paid.id,
            productName: product?.name ?? paid.product,
            quantity: paid.quantity,
            amount: Number(paid.amount),
            printLines: printLinesOf(paid),
            address: `${paid.shipName}, ${addressOf(paid)} · ${paid.shipPhone}`,
            cardUrl: paid.cardUrl,
            deliveryDays: NFC_DELIVERY.label,
          }), ownerAddress());
          void notifyTeam(paid, "Paid online — ready to print");
        }
      }
      return { ok: true, orderId: order.id };
    }),

  // ── Admin ──
  list: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(nfcOrders).orderBy(desc(nfcOrders.createdAt)).limit(500);
    const ids = [...new Set(rows.map((r) => r.userId))];
    const people = ids.length
      ? await db.select({ id: users.id, email: users.email, fullName: users.fullName }).from(users).where(inArray(users.id, ids))
      : [];
    return rows.map((r) => ({ ...r, customer: people.find((u) => u.id === r.userId) ?? null }));
  }),

  // Paid orders not yet in production — for the admin sidebar badge.
  newCount: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({ id: nfcOrders.id }).from(nfcOrders).where(eq(nfcOrders.status, "paid"));
    return { count: rows.length };
  }),

  update: adminQuery
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(STATUSES),
      tracking: z.string().trim().max(255).optional(),
      adminNote: z.string().trim().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [prev] = await db.select().from(nfcOrders).where(eq(nfcOrders.id, input.id));
      if (!prev) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      await db.update(nfcOrders).set({
        status: input.status,
        ...(input.tracking !== undefined ? { tracking: input.tracking || null } : {}),
        ...(input.adminNote !== undefined ? { adminNote: input.adminNote || null } : {}),
      }).where(eq(nfcOrders.id, input.id));

      // Tell the customer when it ships (once).
      if (input.status === "shipped" && prev.status !== "shipped") {
        const [owner] = await db.select({ email: users.email }).from(users).where(eq(users.id, prev.userId));
        if (owner?.email) {
          const product = nfcProduct(prev.product);
          void sendEmail(owner.email, nfcOrderShippedEmail({
            name: prev.shipName,
            orderId: prev.id,
            productName: product?.name ?? prev.product,
            quantity: prev.quantity,
            tracking: input.tracking ?? prev.tracking,
          }), ownerAddress());
        }
      }
      return { ok: true };
    }),
});
