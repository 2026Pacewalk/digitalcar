import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { nfcOrders, publishedCards, users, type NfcOrder } from "@db/schema";
import { resolveRazorpay, getSettings as getPaySettings } from "./payment-router";
import { createRazorpayOrder, verifyRazorpaySignature, fetchRazorpayOrder, type RazorpayOrderFull } from "./lib/razorpay";
import { sendEmail, ownerAddress } from "./lib/mail";
import {
  nfcOrderConfirmedEmail, nfcOrderShippedEmail, nfcOrderAdminEmail, nfcOrderReceivedEmail,
  nfcOrderDeliveredEmail, nfcOrderCancelledEmail, type Email, type NfcPaymentDetails,
} from "./lib/email-templates";
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

/* The same row, field by field, for the emails: the printed words (so title and
   company land in the right place in the drawing), the product line, the parcel. */
const printOf = (o: NfcOrder) => ({ name: o.printName, title: o.printTitle, company: o.printCompany, phone: o.printPhone });
const itemOf = (o: NfcOrder) => {
  const product = nfcProduct(o.product);
  return {
    product: o.product,
    name: product?.name ?? o.product,
    print: product?.print ?? "",
    quantity: o.quantity,
    unitPrice: Number(o.unitPrice),
    amount: Number(o.amount),
  };
};
const shipOf = (o: NfcOrder) => ({
  name: o.shipName, phone: o.shipPhone, line1: o.shipLine1, line2: o.shipLine2,
  city: o.shipCity, state: o.shipState, pincode: o.shipPincode,
});

type Customer = { id: number; fullName: string; email: string };

/* One email to the team per checkout, however many products it holds. */
function notifyTeam(rows: NfcOrder[], opts: { paid: boolean; paymentId?: string | null; customer?: Customer | null; customerEmailed?: boolean }) {
  const sorted = [...rows].sort((a, b) => a.id - b.id);
  const first = sorted[0];
  if (!first) return;
  return sendEmail(ownerAddress(), nfcOrderAdminEmail({
    ids: sorted.map((r) => r.id),
    paid: opts.paid,
    paymentId: opts.paymentId,
    items: sorted.map(itemOf),
    printLines: printLinesOf(first),
    print: printOf(first),
    cardUrl: first.cardUrl,
    // Most logos are embedded in the card rather than hosted, so usually none
    // comes with the order — the card itself is the source.
    logoUrl: first.logoUrl,
    ship: shipOf(first),
    customer: opts.customer ? { id: opts.customer.id, name: opts.customer.fullName, email: opts.customer.email } : null,
    delivery: { label: NFC_DELIVERY.label, maxDays: NFC_DELIVERY.maxDays },
    customerEmailed: opts.customerEmailed,
  }));
}

/** Confirm a paid online NFC checkout: mark its orders paid, then email the
    customer and the team. Shared by the in-browser verify and the Razorpay
    webhook, so a checkout whose tab closed after paying is confirmed the same
    way, and the two together confirm it once.
    The caller has already proven the payment genuine (checkout or webhook
    signature). `gatewayOrder` is Razorpay's own copy of the order: its notes
    must name this user and these orders, and its amount must equal theirs,
    or this throws a TRPCError. `confirmed` is false when the orders were
    already paid — nothing is marked or sent again. */
export async function fulfilNfcPayment(
  db: ReturnType<typeof getDb>,
  { userId, razorpayOrderId, paymentId, gatewayOrder }: { userId: number; razorpayOrderId: string; paymentId: string; gatewayOrder: RazorpayOrderFull },
): Promise<{ orderIds: number[]; confirmed: boolean }> {
  const notes = gatewayOrder.notes || {};
  if (String(notes.userId || "") !== String(userId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This payment belongs to another account." });
  }

  // Every order row this payment covers (one, or card + standee together).
  // Orders created before combined checkout only carry nfcOrderId.
  const ids = String(notes.nfcOrderIds || notes.nfcOrderId || "")
    .split(",").map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0);
  const rows = ids.length
    ? await db.select().from(nfcOrders).where(and(inArray(nfcOrders.id, ids), eq(nfcOrders.userId, userId)))
    : [];
  if (!rows.length || rows.length !== ids.length || rows.some((r) => r.razorpayOrderId !== razorpayOrderId)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This payment doesn't match an order. Contact support with your payment ID." });
  }
  const totalPaise = rows.reduce((sum, r) => sum + Math.round(Number(r.amount) * 100), 0);
  if (totalPaise !== Number(gatewayOrder.amount)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The paid amount doesn't match this order. Contact support with your payment ID." });
  }

  // Idempotent: the conditional update is the claim. Whether it's a repeated
  // verify, a webhook retry, or the verify and the webhook arriving together,
  // only the call that moves the orders out of pending_payment sends email.
  const claim = await db.update(nfcOrders)
    .set({ status: "paid", razorpayPaymentId: paymentId, paidAt: new Date() })
    .where(and(inArray(nfcOrders.id, ids), eq(nfcOrders.status, "pending_payment")));
  const affected = (claim as unknown as { affectedRows?: number }[])?.[0]?.affectedRows
    ?? (claim as unknown as { affectedRows?: number })?.affectedRows ?? 0;
  if (affected === 0) return { orderIds: ids, confirmed: false };

  const [customer] = await db.select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users).where(eq(users.id, userId));
  const paid = (await db.select().from(nfcOrders).where(inArray(nfcOrders.id, ids))).sort((a, b) => a.id - b.id);
  const first = paid[0];
  if (first) {
    const product = nfcProduct(first.product);
    if (customer?.email) {
      void sendEmail(customer.email, nfcOrderConfirmedEmail({
        name: first.shipName,
        orderId: first.id,
        productName: product?.name ?? first.product,
        quantity: first.quantity,
        items: paid.map(itemOf),
        ids: paid.map((p) => p.id),
        amount: paid.reduce((sum, p) => sum + Number(p.amount), 0),
        printLines: printLinesOf(first),
        print: printOf(first),
        logoUrl: first.logoUrl,
        address: `${first.shipName}, ${addressOf(first)} · ${first.shipPhone}`,
        ship: shipOf(first),
        cardUrl: first.cardUrl,
        deliveryDays: NFC_DELIVERY.label,
        paymentId,
      }), ownerAddress());
    }
    void notifyTeam(paid, { paid: true, paymentId, customer: customer ?? null });
  }
  return { orderIds: ids, confirmed: true };
}

/* Manual checkout (online payment off): tell the customer the order is in and
   how to pay, then alert the team. The payment details are the same UPI / bank
   settings the plan checkout shows; with none (or a failed read) the email says
   the team will be in touch. Run fire-and-forget — nothing here may fail the order. */
async function notifyManualCheckout(db: ReturnType<typeof getDb>, rows: NfcOrder[], customer: Customer) {
  const sorted = [...rows].sort((a, b) => a.id - b.id);
  const first = sorted[0];
  if (!first) return;
  const s = await getPaySettings(db).catch(() => null);
  const upiQr = s?.upiQr.trim() ?? "";
  const payment: NfcPaymentDetails | null = s ? {
    upiId: s.upiId.trim() || null,
    payeeName: s.upiName.trim() || null,
    upiQrUrl: /^https?:\/\//i.test(upiQr) ? upiQr : null,
    bank: s.bankAccount.trim()
      ? { name: s.bankName.trim() || null, account: s.bankAccount.trim(), ifsc: s.bankIfsc.trim() || null, holder: s.bankHolder.trim() || null }
      : null,
    note: s.note.trim() || null,
  } : null;
  let emailedHowToPay = false;
  try {
    void sendEmail(customer.email, nfcOrderReceivedEmail({
      name: first.shipName,
      ids: sorted.map((r) => r.id),
      items: sorted.map(itemOf),
      total: sorted.reduce((sum, r) => sum + Number(r.amount), 0),
      deliveryLabel: NFC_DELIVERY.label,
      printLines: printLinesOf(first),
      print: printOf(first),
      logoUrl: first.logoUrl,
      cardUrl: first.cardUrl,
      ship: shipOf(first),
      payment,
    }), ownerAddress());
    // The team's alert says "the customer has been emailed how to pay" only when it's true.
    emailedHowToPay = !!(payment?.upiId || payment?.bank);
  } catch { /* the team alert below must still go out */ }
  void notifyTeam(sorted, { paid: false, customer, customerEmailed: emailedHowToPay });
}

/* The customer email for an admin status change, or null when there isn't one.
   Sent per order row, like the shipped email always has been. */
function statusEmail(prev: NfcOrder, status: NfcOrder["status"], tracking: string | null | undefined): Email | null {
  const product = nfcProduct(prev.product);
  const ids = [prev.id];
  const items = [itemOf(prev)];
  if (status === "shipped") {
    return nfcOrderShippedEmail({
      name: prev.shipName,
      orderId: prev.id,
      productName: product?.name ?? prev.product,
      quantity: prev.quantity,
      tracking,
      ids, items, ship: shipOf(prev), cardUrl: prev.cardUrl,
    });
  }
  // A manual payment has reached the team: the confirmation an online payment gets at verify.
  if (status === "paid" && prev.status === "pending_payment") {
    return nfcOrderConfirmedEmail({
      name: prev.shipName,
      orderId: prev.id,
      productName: product?.name ?? prev.product,
      quantity: prev.quantity,
      items, ids,
      amount: Number(prev.amount),
      printLines: printLinesOf(prev),
      print: printOf(prev),
      logoUrl: prev.logoUrl,
      address: `${prev.shipName}, ${addressOf(prev)} · ${prev.shipPhone}`,
      ship: shipOf(prev),
      cardUrl: prev.cardUrl,
      deliveryDays: NFC_DELIVERY.label,
      paymentId: prev.razorpayPaymentId,
    });
  }
  if (status === "delivered") {
    return nfcOrderDeliveredEmail({ name: prev.shipName, ids, items, cardUrl: prev.cardUrl });
  }
  if (status === "cancelled") {
    // An online checkout closed without paying was never an order the customer
    // placed (it's hidden from their list), and once it has shipped the email's
    // "won't be printed or shipped" is no longer true.
    if (prev.status === "pending_payment" && prev.razorpayOrderId) return null;
    if (prev.status === "shipped" || prev.status === "delivered") return null;
    // adminNote is the team's internal note, so it is not quoted to the customer.
    return nfcOrderCancelledEmail({
      name: prev.shipName, ids, items,
      amount: Number(prev.amount),
      paid: prev.status !== "pending_payment",
      paymentId: prev.razorpayPaymentId,
    });
  }
  return null;
}

async function emailStatusChange(db: ReturnType<typeof getDb>, prev: NfcOrder, status: NfcOrder["status"], tracking: string | null | undefined) {
  const email = statusEmail(prev, status, tracking);
  if (!email) return;
  const [owner] = await db.select({ email: users.email }).from(users).where(eq(users.id, prev.userId));
  if (owner?.email) await sendEmail(owner.email, email, ownerAddress());
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
      void notifyManualCheckout(db, rows, ctx.user).catch(() => {});
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
      const { orderIds: ids } = await fulfilNfcPayment(db, {
        userId: ctx.user.id,
        razorpayOrderId: input.razorpayOrderId,
        paymentId: input.razorpayPaymentId,
        gatewayOrder,
      });
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
      const changes = {
        status: input.status,
        ...(input.tracking !== undefined ? { tracking: input.tracking || null } : {}),
        ...(input.adminNote !== undefined ? { adminNote: input.adminNote || null } : {}),
      };
      // A status change is written only while the row still has the status we
      // read, so of two overlapping saves (a double click) exactly one "moves"
      // it and emails. Anything else is saved as before, unconditionally.
      let moved = false;
      if (input.status !== prev.status) {
        const res = await db.update(nfcOrders).set(changes)
          .where(and(eq(nfcOrders.id, input.id), eq(nfcOrders.status, prev.status)));
        moved = ((res as unknown as { affectedRows?: number }[])?.[0]?.affectedRows
          ?? (res as unknown as { affectedRows?: number })?.affectedRows ?? 0) > 0;
      }
      if (!moved) await db.update(nfcOrders).set(changes).where(eq(nfcOrders.id, input.id));

      // Tell the customer on the first move into shipped, paid (manual payment),
      // delivered or cancelled. Non-blocking: the save never waits on email.
      if (moved) void emailStatusChange(db, prev, input.status, input.tracking ?? prev.tracking).catch(() => {});
      return { ok: true };
    }),
});
