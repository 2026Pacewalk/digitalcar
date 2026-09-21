import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { nfcOrders, publishedCards, users, type NfcOrder } from "@db/schema";
import { resolveRazorpay } from "./payment-router";
import { createRazorpayOrder, verifyRazorpaySignature, fetchRazorpayOrder } from "./lib/razorpay";
import { sendEmail, ownerAddress } from "./lib/mail";
import { nfcOrderConfirmedEmail, nfcOrderShippedEmail, nfcOrderAdminEmail } from "./lib/email-templates";
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

const lineInput = z.object({
  product: z.enum(["nfc_card", "nfc_standee"]),
  quantity: z.number().int().min(1).max(NFC_MAX_QTY),
});

const orderInput = z.preprocess(
  // A dashboard tab opened before combined orders shipped still sends one
  // { product, quantity } — treat it as a one-item order.
  (v) => {
    const o = v as Record<string, unknown> | null;
    return o && !o.items && o.product ? { ...o, items: [{ product: o.product, quantity: o.quantity }] } : v;
  },
  z.object({
    // One or both products, each once. Each becomes its own order row (so the team
    // can print and ship them separately), all paid with ONE Razorpay payment.
    items: z.array(lineInput).min(1).max(NFC_PRODUCTS.length)
      .refine((l) => new Set(l.map((i) => i.product)).size === l.length, "Each product can only be added once."),
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
  }),
);

const STATUSES = ["pending_payment", "paid", "in_production", "shipped", "delivered", "cancelled"] as const;

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

/* One email to the team per checkout, however many products it holds. */
function notifyTeam(rows: NfcOrder[], opts: { paid: boolean; paymentId?: string | null; customer?: { id: number; fullName: string; email: string } | null }) {
  const sorted = [...rows].sort((a, b) => a.id - b.id);
  const first = sorted[0];
  if (!first) return;
  return sendEmail(ownerAddress(), nfcOrderAdminEmail({
    ids: sorted.map((r) => r.id),
    paid: opts.paid,
    paymentId: opts.paymentId,
    items: sorted.map((r) => {
      const product = nfcProduct(r.product);
      return {
        product: r.product,
        name: product?.name ?? r.product,
        print: product?.print ?? "",
        quantity: r.quantity,
        unitPrice: Number(r.unitPrice),
        amount: Number(r.amount),
      };
    }),
    printLines: printLinesOf(first),
    cardUrl: first.cardUrl,
    // Most logos are embedded in the card rather than hosted, so usually none
    // comes with the order — the card itself is the source.
    logoUrl: first.logoUrl,
    ship: {
      name: first.shipName, phone: first.shipPhone, line1: first.shipLine1, line2: first.shipLine2,
      city: first.shipCity, state: first.shipState, pincode: first.shipPincode,
    },
    customer: opts.customer ? { id: opts.customer.id, name: opts.customer.fullName, email: opts.customer.email } : null,
    delivery: { label: NFC_DELIVERY.label, maxDays: NFC_DELIVERY.maxDays },
  }));
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
    if (input.items.some((i) => !nfcProduct(i.product))) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown product." });

    const cardUrl = await cardUrlFor(db, ctx.user.id);
    if (!cardUrl) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Publish your card first — the NFC chip and QR code open your card link." });
    }

    const logoUrl = input.print.logoUrl && /^https:\/\//i.test(input.print.logoUrl) ? input.print.logoUrl : null;
    // One order row per product; they share the print + shipping details and,
    // when paid online, a single Razorpay order.
    const lines = input.items.map((i) => ({ product: nfcProduct(i.product)!, quantity: i.quantity }));
    const amount = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
    const orderIds: number[] = [];
    for (const l of lines) {
      const [inserted] = await db.insert(nfcOrders).values({
        userId: ctx.user.id,
        product: l.product.id,
        quantity: l.quantity,
        unitPrice: l.product.price.toFixed(2),
        amount: (l.product.price * l.quantity).toFixed(2),
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
      orderIds.push(Number(inserted.insertId));
    }
    const orderId = orderIds[0];

    const cr = await resolveRazorpay(db);
    if (!cr.enabled) {
      const rows = await db.select().from(nfcOrders).where(inArray(nfcOrders.id, orderIds));
      void notifyTeam(rows, { paid: false, customer: ctx.user });
      return { manual: true as const, orderId, orderIds };
    }

    const rzp = await createRazorpayOrder({
      amount: amount * 100,
      currency: "INR",
      receipt: `nfc_${orderIds.join("_")}`.slice(0, 40),
      notes: {
        userId: String(ctx.user.id),
        // Single-item orders keep the original note shape.
        nfcOrderId: String(orderId),
        nfcOrderIds: orderIds.join(","),
        items: lines.map((l) => `${l.quantity}x${l.product.id}`).join(","),
      },
    }, cr);
    await db.update(nfcOrders).set({ razorpayOrderId: rzp.id }).where(inArray(nfcOrders.id, orderIds));

    return {
      orderId,
      orderIds,
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

      // Every order row this payment covers (one, or card + standee together).
      // Orders created before combined checkout only carry nfcOrderId.
      const ids = String(notes.nfcOrderIds || notes.nfcOrderId || "")
        .split(",").map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0);
      const rows = ids.length
        ? await db.select().from(nfcOrders).where(and(inArray(nfcOrders.id, ids), eq(nfcOrders.userId, ctx.user.id)))
        : [];
      if (!rows.length || rows.length !== ids.length || rows.some((r) => r.razorpayOrderId !== input.razorpayOrderId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This payment doesn't match an order. Contact support with your payment ID." });
      }
      const totalPaise = rows.reduce((sum, r) => sum + Math.round(Number(r.amount) * 100), 0);
      if (totalPaise !== Number(gatewayOrder.amount)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The paid amount doesn't match this order. Contact support with your payment ID." });
      }

      // Idempotent: a repeated verify (double click, retry) confirms once.
      if (rows.some((r) => r.status === "pending_payment")) {
        await db.update(nfcOrders)
          .set({ status: "paid", razorpayPaymentId: input.razorpayPaymentId, paidAt: new Date() })
          .where(and(inArray(nfcOrders.id, ids), eq(nfcOrders.status, "pending_payment")));
        const paid = (await db.select().from(nfcOrders).where(inArray(nfcOrders.id, ids))).sort((a, b) => a.id - b.id);
        const first = paid[0];
        if (first) {
          const product = nfcProduct(first.product);
          void sendEmail(ctx.user.email, nfcOrderConfirmedEmail({
            name: first.shipName,
            orderId: first.id,
            productName: product?.name ?? first.product,
            quantity: first.quantity,
            items: paid.map((p) => ({ name: nfcProduct(p.product)?.name ?? p.product, quantity: p.quantity })),
            amount: paid.reduce((sum, p) => sum + Number(p.amount), 0),
            printLines: printLinesOf(first),
            address: `${first.shipName}, ${addressOf(first)} · ${first.shipPhone}`,
            cardUrl: first.cardUrl,
            deliveryDays: NFC_DELIVERY.label,
          }), ownerAddress());
          void notifyTeam(paid, { paid: true, paymentId: input.razorpayPaymentId, customer: ctx.user });
        }
      }
      return { ok: true, orderId: ids[0], orderIds: ids };
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
