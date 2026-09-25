import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  resellerAccounts, resellerOrders, resellerPayments, resellerProfiles, users,
  resellerCommissions, resellerApplications,
} from "@db/schema";

/* Reseller accounts — the super-admin's book of card orders that resellers
   place offline (phone, WhatsApp, in person) and pay for by cash, UPI, bank
   transfer or cheque.

   Money model, per order:
     order value   = quantity × price per card
     commission    = order value × the reseller's commission %   (their earning)
     due to you    = order value − commission                    (what they owe)
   Balance = opening balance + due on every non-cancelled order − payments.

   Amounts are always worked out here on the server from quantity, price and
   rate — never taken from the browser. */

type Db = ReturnType<typeof getDb>;
const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
const num = (v: unknown) => Number(v ?? 0) || 0;

async function accountTotals(db: Db, accountIds: number[]) {
  const orders = accountIds.length
    ? await db.select().from(resellerOrders).where(inArray(resellerOrders.accountId, accountIds))
    : [];
  const payments = accountIds.length
    ? await db.select().from(resellerPayments).where(inArray(resellerPayments.accountId, accountIds))
    : [];
  const out = new Map<number, { orders: number; cards: number; gross: number; commission: number; due: number; received: number; lastPayment: Date | null }>();
  for (const id of accountIds) out.set(id, { orders: 0, cards: 0, gross: 0, commission: 0, due: 0, received: 0, lastPayment: null });
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const t = out.get(o.accountId)!;
    t.orders++; t.cards += o.quantity; t.gross += num(o.grossAmount); t.commission += num(o.commissionAmount); t.due += num(o.netAmount);
  }
  for (const p of payments) {
    const t = out.get(p.accountId)!;
    t.received += num(p.amount);
    if (!t.lastPayment || p.paidOn > t.lastPayment) t.lastPayment = p.paidOn;
  }
  return out;
}

const accountInput = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(160),
  company: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(160).optional(),
  resellerUserId: z.number().int().positive().nullable().optional(),
  commissionRate: z.number().min(0).max(100),
  openingBalance: z.number().min(-10_000_000).max(10_000_000).default(0),
  notes: z.string().trim().max(500).optional(),
  active: z.boolean().default(true),
});

const orderInput = z.object({
  id: z.number().int().positive().optional(),
  accountId: z.number().int().positive(),
  orderDate: z.coerce.date(),
  title: z.string().trim().min(2).max(200),
  plan: z.string().trim().max(100).optional(),
  quantity: z.number().int().min(1).max(100_000),
  unitPrice: z.number().min(0).max(1_000_000),
  // Per-order override; empty uses the account's current rate.
  commissionRate: z.number().min(0).max(100).nullable().optional(),
  customerNames: z.string().trim().max(1000).optional(),
  status: z.enum(["pending", "in_progress", "delivered", "cancelled"]).default("pending"),
  notes: z.string().trim().max(500).optional(),
});

const paymentInput = z.object({
  accountId: z.number().int().positive(),
  orderId: z.number().int().positive().nullable().optional(),
  amount: z.number().positive().max(10_000_000),
  method: z.enum(["cash", "upi", "bank", "cheque", "other"]),
  reference: z.string().trim().max(120).optional(),
  paidOn: z.coerce.date(),
  note: z.string().trim().max(500).optional(),
});

export const resellerLedgerRouter = createRouter({
  // Every reseller in one list: their offline book (orders, payments, what they
  // owe) and, if they have a login, their online side (customers, commission
  // earned, wallet). Plus reseller logins that aren't linked to anyone yet.
  overview: adminQuery.query(async () => {
    const db = getDb();
    const accounts = await db.select().from(resellerAccounts).orderBy(asc(resellerAccounts.name));
    const totals = await accountTotals(db, accounts.map((a) => a.id));
    const resellerUsers = await db.select({
      id: users.id, fullName: users.fullName, email: users.email, status: users.status,
      lastLoginAt: users.lastLoginAt, walletBalance: users.walletBalance,
    }).from(users).where(eq(users.role, "reseller"));
    const ids = resellerUsers.map((u) => u.id);
    const profiles = ids.length
      ? await db.select({ userId: resellerProfiles.userId, companyName: resellerProfiles.companyName, commissionRate: resellerProfiles.commissionRate })
        .from(resellerProfiles).where(inArray(resellerProfiles.userId, ids))
      : [];
    const customers = ids.length
      ? await db.select({ resellerId: users.resellerId, n: sql<number>`count(*)` }).from(users)
        .where(inArray(users.resellerId, ids)).groupBy(users.resellerId)
      : [];
    const earned = ids.length
      ? await db.select({ resellerId: resellerCommissions.resellerUserId, total: sql<string>`sum(${resellerCommissions.amount})` })
        .from(resellerCommissions).where(inArray(resellerCommissions.resellerUserId, ids)).groupBy(resellerCommissions.resellerUserId)
      : [];
    const pendingApps = await db.select({ n: sql<number>`count(*)` }).from(resellerApplications)
      .where(eq(resellerApplications.status, "pending"));
    const linkedIds = new Set(accounts.map((a) => a.resellerUserId).filter((v): v is number => v != null));

    const online = (userId: number) => {
      const u = resellerUsers.find((x) => x.id === userId);
      if (!u) return null;
      return {
        userId, email: u.email, status: u.status, lastLoginAt: u.lastLoginAt,
        walletBalance: num(u.walletBalance),
        customers: Number(customers.find((c) => c.resellerId === userId)?.n ?? 0),
        commissionEarned: num(earned.find((e) => e.resellerId === userId)?.total),
      };
    };

    return {
      accounts: accounts.map((a) => {
        const t = totals.get(a.id)!;
        return {
          ...a,
          commissionRate: num(a.commissionRate),
          openingBalance: num(a.openingBalance),
          totals: { ...t, outstanding: num(a.openingBalance) + t.due - t.received },
          login: a.resellerUserId ? online(a.resellerUserId) : null,
        };
      }),
      // Only logins not already linked — those are the ones that can still be.
      resellerUsers: resellerUsers.filter((u) => !linkedIds.has(u.id)).map((u) => {
        const p = profiles.find((x) => x.userId === u.id);
        return { id: u.id, fullName: u.fullName, email: u.email, companyName: p?.companyName ?? null, commissionRate: p ? num(p.commissionRate) : null };
      }),
      pendingApplications: Number(pendingApps[0]?.n ?? 0),
    };
  }),

  account: adminQuery.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = getDb();
    const [account] = await db.select().from(resellerAccounts).where(eq(resellerAccounts.id, input.id));
    if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Reseller account not found." });
    const orders = await db.select().from(resellerOrders).where(eq(resellerOrders.accountId, input.id)).orderBy(desc(resellerOrders.orderDate), desc(resellerOrders.id));
    const payments = await db.select().from(resellerPayments).where(eq(resellerPayments.accountId, input.id)).orderBy(desc(resellerPayments.paidOn), desc(resellerPayments.id));
    const totals = (await accountTotals(db, [input.id])).get(input.id)!;
    return {
      account: { ...account, commissionRate: num(account.commissionRate), openingBalance: num(account.openingBalance) },
      orders: orders.map((o) => ({ ...o, unitPrice: num(o.unitPrice), grossAmount: num(o.grossAmount), commissionRate: num(o.commissionRate), commissionAmount: num(o.commissionAmount), netAmount: num(o.netAmount) })),
      payments: payments.map((p) => ({ ...p, amount: num(p.amount) })),
      totals: { ...totals, outstanding: num(account.openingBalance) + totals.due - totals.received },
    };
  }),

  saveAccount: adminQuery.input(accountInput).mutation(async ({ input }) => {
    const db = getDb();
    if (input.resellerUserId) {
      const clash = await db.select({ id: resellerAccounts.id }).from(resellerAccounts)
        .where(eq(resellerAccounts.resellerUserId, input.resellerUserId)).limit(1);
      if (clash[0] && clash[0].id !== input.id) {
        throw new TRPCError({ code: "CONFLICT", message: "That reseller login is already linked to another account." });
      }
    }
    const values = {
      name: input.name,
      company: input.company || null,
      phone: input.phone || null,
      email: input.email || null,
      resellerUserId: input.resellerUserId ?? null,
      commissionRate: money(input.commissionRate),
      openingBalance: money(input.openingBalance),
      notes: input.notes || null,
      active: input.active,
    };
    let id = input.id;
    if (id) await db.update(resellerAccounts).set(values).where(eq(resellerAccounts.id, id));
    else {
      const [res] = await db.insert(resellerAccounts).values(values);
      id = Number(res.insertId);
    }
    // Keep the rate used for ONLINE plan commissions in step with this one.
    if (input.resellerUserId) {
      await db.update(resellerProfiles).set({ commissionRate: money(input.commissionRate) })
        .where(eq(resellerProfiles.userId, input.resellerUserId));
    }
    return { ok: true, id };
  }),

  saveOrder: adminQuery.input(orderInput).mutation(async ({ input }) => {
    const db = getDb();
    const [account] = await db.select().from(resellerAccounts).where(eq(resellerAccounts.id, input.accountId));
    if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Reseller account not found." });
    const rate = input.commissionRate ?? num(account.commissionRate);
    const gross = input.quantity * input.unitPrice;
    const commission = (gross * rate) / 100;
    const values = {
      accountId: input.accountId,
      orderDate: input.orderDate,
      title: input.title,
      plan: input.plan || null,
      quantity: input.quantity,
      unitPrice: money(input.unitPrice),
      grossAmount: money(gross),
      commissionRate: money(rate),
      commissionAmount: money(commission),
      netAmount: money(gross - commission),
      customerNames: input.customerNames || null,
      status: input.status,
      notes: input.notes || null,
    };
    if (input.id) {
      await db.update(resellerOrders).set(values).where(and(eq(resellerOrders.id, input.id), eq(resellerOrders.accountId, input.accountId)));
      return { ok: true, id: input.id };
    }
    const [res] = await db.insert(resellerOrders).values(values);
    return { ok: true, id: Number(res.insertId) };
  }),

  setOrderStatus: adminQuery
    .input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "in_progress", "delivered", "cancelled"]) }))
    .mutation(async ({ input }) => {
      await getDb().update(resellerOrders).set({ status: input.status }).where(eq(resellerOrders.id, input.id));
      return { ok: true };
    }),

  deleteOrder: adminQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = getDb();
    // Payments stay on the account (they were real money); they just lose the order link.
    await db.update(resellerPayments).set({ orderId: null }).where(eq(resellerPayments.orderId, input.id));
    await db.delete(resellerOrders).where(eq(resellerOrders.id, input.id));
    return { ok: true };
  }),

  addPayment: adminQuery.input(paymentInput).mutation(async ({ input }) => {
    const db = getDb();
    const [account] = await db.select({ id: resellerAccounts.id }).from(resellerAccounts).where(eq(resellerAccounts.id, input.accountId));
    if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Reseller account not found." });
    if (input.orderId) {
      const [order] = await db.select({ id: resellerOrders.id }).from(resellerOrders)
        .where(and(eq(resellerOrders.id, input.orderId), eq(resellerOrders.accountId, input.accountId)));
      if (!order) throw new TRPCError({ code: "BAD_REQUEST", message: "That order belongs to a different reseller." });
    }
    const [res] = await db.insert(resellerPayments).values({
      accountId: input.accountId,
      orderId: input.orderId ?? null,
      amount: money(input.amount),
      method: input.method,
      reference: input.reference || null,
      paidOn: input.paidOn,
      note: input.note || null,
    });
    return { ok: true, id: Number(res.insertId) };
  }),

  deletePayment: adminQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await getDb().delete(resellerPayments).where(eq(resellerPayments.id, input.id));
    return { ok: true };
  }),
});
