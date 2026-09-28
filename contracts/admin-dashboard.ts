/* The super admin dashboard — one payload, built on the server by
   api/lib/admin-dashboard.ts (analytics.adminDashboard) and drawn by
   src/pages/admin/Dashboard.tsx.

   Every amount is in rupees. Months and days are India time (IST). A section
   is null when the viewer (a staff member) doesn't have the module it belongs
   to — the page simply leaves it out. */

import type { StaffModule } from "./staff";

/** Where money comes in. Cash basis: counted when it was actually paid. */
export type RevenueStream = "plans_online" | "plans_manual" | "nfc" | "addons" | "domains" | "reseller_cash";

/* Drawn on the navy revenue card, so every colour is a light tint that stays
   apart from its neighbours there (the two plan streams differ by lightness). */
export const REVENUE_STREAMS: { key: RevenueStream; label: string; hint: string; color: string }[] = [
  { key: "plans_online", label: "Plans · online", hint: "Plan payments through Razorpay", color: "#F7B31C" },
  { key: "plans_manual", label: "Plans · UPI / bank", hint: "Plan payments verified by the team", color: "#FDE68A" },
  { key: "nfc", label: "NFC cards & standees", hint: "Paid NFC product orders", color: "#22D3EE" },
  { key: "addons", label: "Card add-ons", hint: "ID card and membership add-ons", color: "#A78BFA" },
  { key: "domains", label: "Custom domains", hint: "Custom domain add-on", color: "#F472B6" },
  { key: "reseller_cash", label: "Reseller payments", hint: "Cash, UPI and bank payments from resellers", color: "#34D399" },
];

export type MonthPoint = { ym: string; label: string };

export type RevenueSection = {
  allTime: number;
  today: number;
  last7: number;
  thisMonth: number;
  lastMonth: number;
  /** Last month up to the same day — a fair comparison for a month in progress. */
  sameDaysLastMonth: number;
  /** thisMonth vs sameDaysLastMonth; null when there's nothing to compare with. */
  growthPct: number | null;
  paidOrders: number;
  avgOrder: number;
  byStream: { key: RevenueStream; allTime: number; thisMonth: number; count: number }[];
  /** The last 12 months, oldest first, every month present. */
  months: (MonthPoint & { total: number } & Record<RevenueStream, number>)[];
  moneyOut: {
    /** Commission earned by resellers on their customers' online plan payments. */
    resellerCommission: number;
    referralRewards: number;
    thisMonth: number;
    /** Payouts actually sent to resellers and referrers. */
    payoutsPaid: number;
    /** Still owed: wallet balances + payout requests in progress. */
    owedNow: number;
  };
  net: { allTime: number; thisMonth: number };
  /** Custom-domain add-ons sold before sales were dated — counted in allTime only. */
  undatedDomainSales: number;
};

export type ResellerRow = {
  accountId: number | null;
  userId: number | null;
  name: string;
  company: string | null;
  rate: number;
  hasLogin: boolean;
  active: boolean;
  /** Offline book: cards they bought from us. */
  orderValue: number;
  commission: number;
  dueToUs: number;
  /** Carried over from before the ledger: positive = they owed us, negative = in credit. */
  openingBalance: number;
  /** Everything they've been billed: opening balance + dueToUs. */
  payable: number;
  received: number;
  /** payable − received: positive = still to collect, negative = in credit. */
  outstanding: number;
  lastPaymentAt: string | null;
  /** Online: their customers paying us directly for plans. */
  customers: number;
  onlineSales: number;
  onlineCommission: number;
};

export type ResellerSection = {
  partners: number;
  withLogin: number;
  active: number;
  pendingApplications: number;
  offline: {
    orders: number; cards: number; orderValue: number; commission: number; dueToUs: number;
    /** Sum of opening balances (signed). */
    opening: number;
    /** opening + dueToUs — the denominator for "received of …". */
    payable: number;
    received: number;
    /** Signed net across partners (payable − received). */
    outstanding: number;
    /** Only what partners still owe: the sum of positive balances. Use this for "still to collect". */
    toCollect: number;
    /** Partners in credit: the sum of negative balances, as a positive number. */
    credit: number;
  };
  online: { customers: number; sales: number; commission: number; owedNow: number };
  /** Everything sold through resellers (offline order value + online plan sales). */
  channelSales: number;
  /** What DigitalCarda keeps: offline due + online sales − online commission. */
  ourShare: number;
  months: (MonthPoint & { dueToUs: number; received: number; onlineSales: number })[];
  /** Up to 8, biggest first. */
  top: ResellerRow[];
};

export type ActionKey =
  | "payments_to_verify" | "nfc_to_print" | "nfc_to_ship" | "nfc_awaiting_payment" | "bulk_new"
  | "payouts_pending" | "reseller_applications" | "deletions_due" | "domains_pending"
  | "emails_failed" | "plans_expiring" | "trials_ending";

export type ActionItem = {
  key: ActionKey;
  label: string;
  /** One short line: what doing it means. */
  hint: string;
  count: number;
  amount: number | null;
  link: string;
  module: StaffModule;
  /** red = money or people waiting on us; amber = soon; blue = keep an eye on. */
  tone: "red" | "amber" | "blue";
  oldestAt: string | null;
};

export type CustomerSection = {
  total: number;
  /** Accounts on this platform vs. customers carried over from the old site. */
  platform: number;
  oldSite: number;
  newToday: number;
  new7: number;
  new30: number;
  prev30: number;
  /** The last 30 days, oldest first, every day present. */
  signups: { date: string; label: string; count: number }[];
  plans: { packageId: number; name: string; platform: number; oldSite: number }[];
  paidActive: number;
  trialsActive: number;
  trialConversion: { converted: number; total: number };
  expiring7: number;
  publishedCards: number;
  published30: number;
};

export type EngagementSection = {
  views30: number;
  viewsPrev30: number;
  visitors30: number;
  actions30: number;
  actionsPrev30: number;
  leads30: number;
  leadsPrev30: number;
  /** The last 30 days, oldest first, every day present. */
  daily: { date: string; label: string; views: number; visitors: number; actions: number }[];
  topCards: { slug: string; name: string | null; views: number; actions: number; url: string }[];
  sources: { key: string; count: number }[];
  devices: { key: string; count: number }[];
  actionTypes: { key: string; label: string; count: number }[];
};

export type FunnelStage = { stage: string; label: string; count: number };
export type ProductRow = { productId: number; name: string; views: number; demos: number; tries: number };

export type ActivityItem = { id: number; type: string; category: string; title: string; message: string | null; link: string | null; createdAt: string };

export type SignupRow = { id: number; name: string; email: string; role: string; createdAt: string; plan: string | null };

export type HealthSection = {
  smtp: boolean;
  razorpay: { enabled: boolean; mode: string };
  emailsFailed24h: number;
  emailsSent24h: number;
  lifecycleLastRun: string | null;
  trialOfferOn: boolean;
};

export type AdminDashboard = {
  generatedAt: string;
  revenue: RevenueSection | null;
  resellers: ResellerSection | null;
  /** Only the modules this viewer may open; count 0 means all clear. */
  actions: ActionItem[];
  customers: CustomerSection | null;
  engagement: EngagementSection | null;
  funnel: FunnelStage[] | null;
  products: ProductRow[] | null;
  activity: ActivityItem[];
  recentSignups: SignupRow[] | null;
  health: HealthSection | null;
  /** Sections that failed to load this time (a server error, not missing access) — shown as "couldn't load". */
  failed: ("revenue" | "resellers" | "actions" | "customers" | "engagement" | "funnel" | "products" | "activity" | "recentSignups" | "health")[];
};
