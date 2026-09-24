import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  boolean,
  decimal,
  bigint,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ─── Users ──────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  avatar: varchar("avatar", { length: 500 }),
  // "staff" = a team member in the admin portal with only the modules the
  // super admin granted them (see staff_access).
  role: mysqlEnum("role", ["super_admin", "reseller", "customer", "staff"]).notNull().default("customer"),
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).notNull().default("active"),
  // Email verification. Defaults true so migrated/existing accounts aren't
  // disrupted; new signups are inserted with false and get a verification email.
  emailVerified: boolean("email_verified").notNull().default(true),
  emailVerifiedAt: timestamp("email_verified_at"),
  // Super-admin per-user card-limit override (null = use the plan default).
  cardLimit: int("card_limit"),
  resellerId: bigint("reseller_id", { mode: "number", unsigned: true }),
  referralCode: varchar("referral_code", { length: 50 }),
  referredById: bigint("referred_by_id", { mode: "number", unsigned: true }),
  walletBalance: decimal("wallet_balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("reseller_id_idx").on(table.resellerId),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Reseller Profiles ──────────────────────────────────────────
export const resellerProfiles = mysqlTable("reseller_profiles", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull().unique(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("10.00"),
  totalCustomers: int("total_customers").notNull().default(0),
  totalEarnings: decimal("total_earnings", { precision: 12, scale: 2 }).notNull().default("0.00"),
  pendingPayout: decimal("pending_payout", { precision: 12, scale: 2 }).notNull().default("0.00"),
  whiteLabelEnabled: boolean("white_label_enabled").notNull().default(false),
  customDomain: varchar("custom_domain", { length: 255 }),
  brandingLogo: varchar("branding_logo", { length: 500 }),
  brandingColor: varchar("branding_color", { length: 7 }).default("#D4AF37"),
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ResellerProfile = typeof resellerProfiles.$inferSelect;

// ─── Subscription Packages ──────────────────────────────────────
export const subscriptionPackages = mysqlTable("subscription_packages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  yearlyPrice: decimal("yearly_price", { precision: 10, scale: 2 }).notNull(),
  threeYearPrice: decimal("three_year_price", { precision: 10, scale: 2 }).notNull().default("0"),
  trialDays: int("trial_days").notNull().default(30),
  maxCards: int("max_cards").notNull().default(1),
  maxProducts: int("max_products").notNull().default(0),
  maxGalleryImages: int("max_gallery_images").notNull().default(0),
  maxVideos: int("max_videos").notNull().default(0),
  storageLimitMB: int("storage_limit_mb").notNull().default(100),
  featureCustomDomain: boolean("feature_custom_domain").notNull().default(false),
  featureSEO: boolean("feature_seo").notNull().default(false),
  featureAnalytics: boolean("feature_analytics").notNull().default(false),
  featureLeadCapture: boolean("feature_lead_capture").notNull().default(false),
  featureRemoveBranding: boolean("feature_remove_branding").notNull().default(false),
  featureWhiteLabel: boolean("feature_white_label").notNull().default(false),
  featurePrioritySupport: boolean("feature_priority_support").notNull().default(false),
  featureAI: boolean("feature_ai").notNull().default(false),
  featureMultilingual: boolean("feature_multilingual").notNull().default(false),
  featureCRM: boolean("feature_crm").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: int("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type SubscriptionPackage = typeof subscriptionPackages.$inferSelect;

// ─── Subscriptions ──────────────────────────────────────────────
export const subscriptions = mysqlTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  packageId: bigint("package_id", { mode: "number", unsigned: true }).notNull(),
  status: mysqlEnum("status", ["trial", "active", "cancelled", "expired", "suspended"]).notNull().default("trial"),
  billingCycle: mysqlEnum("billing_cycle", ["monthly", "yearly", "triennial"]).notNull().default("monthly"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  paymentGateway: varchar("payment_gateway", { length: 50 }),
  gatewaySubscriptionId: varchar("gateway_subscription_id", { length: 255 }),
  autoRenew: boolean("auto_renew").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("sub_user_id_idx").on(table.userId),
  index("sub_package_id_idx").on(table.packageId),
]);

export type Subscription = typeof subscriptions.$inferSelect;

// ─── Card Add-ons (ID Card / Membership Card) ───────────────────
// Paid extras a user adds ON TOP of their subscription — ₹299/year each
// (÷12 on a monthly plan). One active row per (user, type).
export const cardAddons = mysqlTable("card_addons", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  type: mysqlEnum("type", ["id_card", "membership"]).notNull(),
  billingCycle: mysqlEnum("billing_cycle", ["monthly", "yearly"]).notNull().default("yearly"),
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("addon_user_idx").on(table.userId),
  uniqueIndex("uq_addon_user_type").on(table.userId, table.type),
]);

export type CardAddon = typeof cardAddons.$inferSelect;

// One row per Razorpay order whose purchase has been fulfilled, for purchases
// with no order table of their own (card add-ons). The in-browser verify and
// the Razorpay webhook both claim the order here first, so one payment grants
// once however many times either arrives. Created at boot by api/boot.ts if missing.
export const razorpayFulfilments = mysqlTable("razorpay_fulfilments", {
  razorpayOrderId: varchar("razorpay_order_id", { length: 64 }).primaryKey(),
  kind: varchar("kind", { length: 32 }).notNull(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("rzp_fulfil_user_idx").on(table.userId),
]);

// Physical NFC products (PVC card, standee) ordered from the dashboard. Prices
// are copied onto the order at checkout, so a later price change never rewrites
// history. Fulfilment: pending_payment → paid → in_production → shipped →
// delivered (or cancelled). Created at boot by api/boot.ts if missing.
export const nfcOrders = mysqlTable("nfc_orders", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  product: mysqlEnum("product", ["nfc_card", "nfc_standee"]).notNull(),
  quantity: int("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  printName: varchar("print_name", { length: 120 }).notNull(),
  printTitle: varchar("print_title", { length: 120 }),
  printCompany: varchar("print_company", { length: 160 }),
  printPhone: varchar("print_phone", { length: 40 }),
  cardUrl: varchar("card_url", { length: 255 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  shipName: varchar("ship_name", { length: 120 }).notNull(),
  shipPhone: varchar("ship_phone", { length: 20 }).notNull(),
  shipLine1: varchar("ship_line1", { length: 255 }).notNull(),
  shipLine2: varchar("ship_line2", { length: 255 }),
  shipCity: varchar("ship_city", { length: 100 }).notNull(),
  shipState: varchar("ship_state", { length: 100 }).notNull(),
  shipPincode: varchar("ship_pincode", { length: 10 }).notNull(),
  status: mysqlEnum("status", ["pending_payment", "paid", "in_production", "shipped", "delivered", "cancelled"]).notNull().default("pending_payment"),
  razorpayOrderId: varchar("razorpay_order_id", { length: 64 }),
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 64 }),
  tracking: varchar("tracking", { length: 255 }),
  adminNote: varchar("admin_note", { length: 500 }),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("nfc_user_idx").on(table.userId),
  index("nfc_status_idx").on(table.status),
  index("nfc_rzp_order_idx").on(table.razorpayOrderId),
]);

export type NfcOrder = typeof nfcOrders.$inferSelect;

// Discount coupons for plan purchases (never add-ons). Rules in api/lib/coupons.ts.
// Created at boot by api/boot.ts if missing.
export const coupons = mysqlTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  discountType: mysqlEnum("discount_type", ["percent", "flat"]).notNull().default("percent"),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
  minAmount: decimal("min_amount", { precision: 10, scale: 2 }),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  usageLimit: int("usage_limit"),
  perUserLimit: int("per_user_limit").notNull().default(1),
  planIds: varchar("plan_ids", { length: 255 }),
  cycles: varchar("cycles", { length: 60 }),
  active: boolean("active").notNull().default(true),
  usedCount: int("used_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("coupon_active_idx").on(table.active),
]);

export type Coupon = typeof coupons.$inferSelect;

// One row per order that used a coupon: pending (manual payment awaiting
// verification), completed (paid) or cancelled (payment rejected).
export const couponRedemptions = mysqlTable("coupon_redemptions", {
  id: serial("id").primaryKey(),
  couponId: bigint("coupon_id", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  packageId: bigint("package_id", { mode: "number", unsigned: true }).notNull(),
  paymentOrderId: bigint("payment_order_id", { mode: "number", unsigned: true }),
  paymentRef: varchar("payment_ref", { length: 64 }),
  amountBefore: decimal("amount_before", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "cancelled"]).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("cr_coupon_idx").on(table.couponId),
  index("cr_user_idx").on(table.userId),
  index("cr_order_idx").on(table.paymentOrderId),
]);

// Offer / festival announcement popups run by the super-admin.
export const announcements = mysqlTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 120 }).notNull(),
  message: varchar("message", { length: 500 }),
  kind: mysqlEnum("kind", ["offer", "teaser", "info"]).notNull().default("offer"),
  theme: mysqlEnum("theme", ["diwali", "holi", "newyear", "festive", "brand", "dark"]).notNull().default("festive"),
  badge: varchar("badge", { length: 40 }),
  couponId: bigint("coupon_id", { mode: "number", unsigned: true }),
  ctaLabel: varchar("cta_label", { length: 40 }),
  ctaUrl: varchar("cta_url", { length: 255 }),
  showFrom: timestamp("show_from"),
  showUntil: timestamp("show_until"),
  countdownTo: timestamp("countdown_to"),
  audience: mysqlEnum("audience", ["public", "dashboard", "both"]).notNull().default("both"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Announcement = typeof announcements.$inferSelect;

// Reseller accounts — offline card orders and the cash/UPI/bank/cheque payments
// resellers make to the super-admin (api/reseller-ledger-router.ts). An account
// may be linked to a reseller login, but doesn't have to be (legacy retailers).
// Created at boot by api/boot.ts if missing.
export const resellerAccounts = mysqlTable("reseller_accounts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  company: varchar("company", { length: 160 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 160 }),
  resellerUserId: bigint("reseller_user_id", { mode: "number", unsigned: true }),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("10.00"),
  openingBalance: decimal("opening_balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  notes: varchar("notes", { length: 500 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("ra_user_idx").on(table.resellerUserId),
]);

export const resellerOrders = mysqlTable("reseller_orders", {
  id: serial("id").primaryKey(),
  accountId: bigint("account_id", { mode: "number", unsigned: true }).notNull(),
  orderDate: timestamp("order_date").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  plan: varchar("plan", { length: 100 }),
  quantity: int("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  grossAmount: decimal("gross_amount", { precision: 12, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).notNull(),
  customerNames: varchar("customer_names", { length: 1000 }),
  status: mysqlEnum("status", ["pending", "in_progress", "delivered", "cancelled"]).notNull().default("pending"),
  notes: varchar("notes", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("ro_account_idx").on(table.accountId),
]);

export const resellerPayments = mysqlTable("reseller_payments", {
  id: serial("id").primaryKey(),
  accountId: bigint("account_id", { mode: "number", unsigned: true }).notNull(),
  orderId: bigint("order_id", { mode: "number", unsigned: true }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: mysqlEnum("method", ["cash", "upi", "bank", "cheque", "other"]).notNull(),
  reference: varchar("reference", { length: 120 }),
  paidOn: timestamp("paid_on").notNull(),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("rp_account_idx").on(table.accountId),
  index("rp_order_idx").on(table.orderId),
]);




// ─── Invoices ───────────────────────────────────────────────────
export const invoices = mysqlTable("invoices", {
  id: serial("id").primaryKey(),
  subscriptionId: bigint("subscription_id", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  status: mysqlEnum("status", ["pending", "paid", "failed", "refunded", "cancelled"]).notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  dueDate: timestamp("due_date").notNull(),
  gateway: varchar("gateway", { length: 50 }),
  gatewayPaymentId: varchar("gateway_payment_id", { length: 255 }),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("inv_user_id_idx").on(table.userId),
]);

export type Invoice = typeof invoices.$inferSelect;

// ─── Cards ──────────────────────────────────────────────────────
export const cards = mysqlTable("cards", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  templateId: bigint("template_id", { mode: "number", unsigned: true }),
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  customDomain: varchar("custom_domain", { length: 255 }),
  language: varchar("language", { length: 10 }).notNull().default("en"),
  isPrimary: boolean("is_primary").notNull().default(false),
  viewCount: bigint("view_count", { mode: "number", unsigned: true }).notNull().default(0),
  uniqueViewCount: bigint("unique_view_count", { mode: "number", unsigned: true }).notNull().default(0),
  leadCount: int("lead_count").notNull().default(0),
  settings: json("settings"),
  seoSettings: json("seo_settings"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("card_user_id_idx").on(table.userId),
  index("card_slug_idx").on(table.slug),
]);

export type Card = typeof cards.$inferSelect;

// ─── Card Blocks ────────────────────────────────────────────────
export const cardBlocks = mysqlTable("card_blocks", {
  id: serial("id").primaryKey(),
  cardId: bigint("card_id", { mode: "number", unsigned: true }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  position: int("position").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  config: json("config").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("block_card_id_idx").on(table.cardId),
]);

export type CardBlock = typeof cardBlocks.$inferSelect;

// ─── Templates ──────────────────────────────────────────────────
export const templates = mysqlTable("templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  previewUrl: varchar("preview_url", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  settings: json("settings"),
  minPackage: varchar("min_package", { length: 50 }).default("starter"),
  displayOrder: int("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Template = typeof templates.$inferSelect;

// ─── Products (ecommerce catalogue) ─────────────────────────────
// A sellable listing. Distinct from a template (design) and a card
// (instance): a product wraps a design with a name, price, category,
// images and SEO — what the customer browses and tries. Section 15.
export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 191 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  tagline: varchar("tagline", { length: 255 }),
  description: text("description"),
  styleNumber: int("style_number").notNull().default(1), // design 1..44 (CSS/link-bio)
  category: varchar("category", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0.00"),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  trialDays: int("trial_days").notNull().default(30),
  primaryColor: varchar("primary_color", { length: 7 }),
  secondaryColor: varchar("secondary_color", { length: 7 }),
  images: json("images"), // string[] of image URLs
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: varchar("seo_description", { length: 500 }),
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
  // Template category — the same taxonomy the Templates page filters by, so a
  // design is managed in ONE place (product = template).
  templateCategory: mysqlEnum("template_category", ["basic", "modern", "bio", "professional", "premium"]).notNull().default("modern"),
  isFeatured: boolean("is_featured").notNull().default(false),
  displayOrder: int("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("product_status_idx").on(table.status),
  index("product_category_idx").on(table.category),
]);

export type Product = typeof products.$inferSelect;

// ─── Card Trials (backend-authoritative 30-day trial) ───────────
// A signup publishes the account's starter card, so the trial clock and the
// live card start together; trial.start on a later publish is idempotent. This
// row is the source of truth for a card's live status. Dates come from the
// server clock — never a frontend timer (Section 5). Keyed by user for now (one
// card per user); moves to card_id when the card-instance migration runs.
export const cardTrials = mysqlTable("card_trials", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull().unique(),
  productId: bigint("product_id", { mode: "number", unsigned: true }),
  status: mysqlEnum("status", ["not_started", "active", "expiring_soon", "expired", "converted", "cancelled", "grace"]).notNull().default("active"),
  startedAt: timestamp("started_at"),
  endsAt: timestamp("ends_at"),
  publishedAt: timestamp("published_at"),
  // How this trial was started: the voucher (FREE30D) and where it came from.
  couponCode: varchar("coupon_code", { length: 40 }),
  activationSource: varchar("activation_source", { length: 40 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type CardTrial = typeof cardTrials.$inferSelect;

// ─── Published Cards (server snapshot for the public URL) ───────
// When a user publishes from the builder, we snapshot their card (profile +
// content) here so the PUBLIC /slug page can render it server-side — the
// content no longer lives only in the browser. A pragmatic bridge until the
// full card_blocks migration; keyed by user, looked up by slug.
export const publishedCards = mysqlTable("published_cards", {
  id: serial("id").primaryKey(),
  // One row PER PUBLISHED CARD. A user can publish several (multi-card plans),
  // so user_id is NOT unique; cardId is the owner's local card id (1 = primary).
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  cardId: int("card_id").notNull().default(1), // owner-scoped local card id (1 = primary)
  slug: varchar("slug", { length: 191 }).notNull(),
  publicId: varchar("public_id", { length: 16 }).unique(), // permanent QR/redirect id
  data: json("data").notNull(),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("pubcard_slug_idx").on(table.slug),
  uniqueIndex("uq_pubcard_user_card").on(table.userId, table.cardId),
]);

export type PublishedCard = typeof publishedCards.$inferSelect;

// ─── Card Events (real engagement analytics, slug-keyed) ────────
// Lightweight event log for the PUBLIC card: views, QR scans, and every action
// tap (call / whatsapp / email / website / directions / save-contact). Keyed by
// slug so it works for both snapshot and legacy cards. Never fabricated (§36).
// Every column beyond (slug, type, created_at) is NULLABLE and was added later —
// old rows simply have NULLs and every query tolerates that. Nothing here is
// personal data: `visitorId` is a rotating salted hash (never an IP, never
// cross-site), and geo is coarse country/city taken from the CDN edge headers.
export const cardEvents = mysqlTable("card_events", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 191 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  // WHICH thing was acted on — product name, social platform, section id,
  // video title, share channel. This is what turns "a tap happened" into
  // "3 people tapped your Gold Plan".
  label: varchar("label", { length: 191 }),
  // Which of the owner's cards (multi-card accounts).
  cardId: int("card_id"),
  // Anonymous, rotating, salted daily hash → unique vs returning visitors
  // without storing anything that identifies a person.
  visitorId: varchar("visitor_id", { length: 64 }),
  // Groups the events of a single visit together (journey + time on card).
  sessionId: varchar("session_id", { length: 64 }),
  device: varchar("device", { length: 16 }),   // mobile | tablet | desktop
  os: varchar("os", { length: 24 }),
  browser: varchar("browser", { length: 24 }),
  // Where the visit came from: whatsapp, qr, instagram, facebook, google,
  // linkedin, direct… Derived from the referrer plus the ?src= tag we put on
  // QR/share links.
  source: varchar("source", { length: 32 }),
  referrer: varchar("referrer", { length: 255 }),
  country: varchar("country", { length: 2 }),
  city: varchar("city", { length: 64 }),
  // For time-on-card / dwell events, in milliseconds.
  durationMs: int("duration_ms"),
  meta: json("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("cardev_slug_idx").on(table.slug),
  index("cardev_type_idx").on(table.type),
  // Range + breakdown queries always filter by slug and a date window.
  index("cardev_slug_created_idx").on(table.slug, table.createdAt),
  index("cardev_slug_type_created_idx").on(table.slug, table.type, table.createdAt),
  index("cardev_visitor_idx").on(table.visitorId),
]);

export type CardEvent = typeof cardEvents.$inferSelect;

// ─── Funnel Events (conversion funnel analytics) ───────────────
// One row per funnel step a visitor/user reaches: product_view → demo_view →
// try_free → registration → published → payment. Powers the admin funnel view
// so drop-off is visible (§62). Product-scoped where relevant.
export const funnelEvents = mysqlTable("funnel_events", {
  id: serial("id").primaryKey(),
  stage: varchar("stage", { length: 40 }).notNull(),
  productSlug: varchar("product_slug", { length: 191 }),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("funnel_stage_idx").on(table.stage),
  index("funnel_product_idx").on(table.productSlug),
]);

export type FunnelEvent = typeof funnelEvents.$inferSelect;

// ─── AI Card Generator usage log (who's trying the feature) ─────
export const aiGenerations = mysqlTable("ai_generations", {
  id: serial("id").primaryKey(),
  businessName: varchar("business_name", { length: 120 }),
  profession: varchar("profession", { length: 80 }),
  city: varchar("city", { length: 80 }),
  phone: varchar("phone", { length: 30 }),
  source: varchar("source", { length: 16 }),
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("aigen_created_idx").on(table.createdAt),
  index("aigen_phone_idx").on(table.phone),
]);
export type AiGeneration = typeof aiGenerations.$inferSelect;

// ─── Companies / Teams (corporate accounts) ────────────────────
// A company buys many cards; a company admin governs branding + approved
// designs; employees get cards under that identity (§56). Foundation layer.
export const companies = mysqlTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  adminUserId: bigint("admin_user_id", { mode: "number", unsigned: true }).notNull(),
  logo: varchar("logo", { length: 500 }),
  brandColor: varchar("brand_color", { length: 7 }),
  brandColor2: varchar("brand_color2", { length: 7 }),
  approvedStyles: json("approved_styles"),   // number[] — templates employees may use
  mandatoryFields: json("mandatory_fields"), // string[] — fields employees must fill
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const companyMembers = mysqlTable("company_members", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull().unique(),
  role: mysqlEnum("role", ["admin", "employee"]).notNull().default("employee"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("companymember_company_idx").on(table.companyId),
]);

export type Company = typeof companies.$inferSelect;
export type CompanyMember = typeof companyMembers.$inferSelect;

// ─── Leads ──────────────────────────────────────────────────────
export const leads = mysqlTable("leads", {
  id: serial("id").primaryKey(),
  cardId: bigint("card_id", { mode: "number", unsigned: true }), // nullable: snapshot cards have no DB card row
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  message: text("message"),
  source: varchar("source", { length: 50 }).notNull().default("card"),
  status: mysqlEnum("status", ["new", "contacted", "interested", "follow_up", "converted", "not_interested", "closed"]).notNull().default("new"),
  notes: text("notes"),
  followUpDate: timestamp("follow_up_date"),
  ipAddress: varchar("ip_address", { length: 45 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  device: varchar("device", { length: 50 }),
  browser: varchar("browser", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("lead_card_id_idx").on(table.cardId),
  index("lead_user_id_idx").on(table.userId),
  index("lead_status_idx").on(table.status),
]);

export type Lead = typeof leads.$inferSelect;

// ─── Bulk-order requests (buy bulk cards → team invoices) ───────
// A logged-in user (or guest) asks to buy a bulk-card bundle; the team follows
// up with an invoice (no upfront payment). Captured here + emailed to the owner.
export const bulkOrderRequests = mysqlTable("bulk_order_requests", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }), // nullable: guests too
  company: varchar("company", { length: 255 }),
  contactName: varchar("contact_name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  quantity: int("quantity").notNull().default(0),
  pricePerCard: decimal("price_per_card", { precision: 10, scale: 2 }).notNull().default("0"),
  totalEstimate: decimal("total_estimate", { precision: 10, scale: 2 }).notNull().default("0"),
  packageName: varchar("package_name", { length: 50 }),
  note: text("note"),
  status: mysqlEnum("status", ["new", "contacted", "won", "lost"]).notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("bulkreq_user_idx").on(table.userId),
  index("bulkreq_status_idx").on(table.status),
]);

export type BulkOrderRequest = typeof bulkOrderRequests.$inferSelect;

// ─── Analytics Events ───────────────────────────────────────────
export const analyticsEvents = mysqlTable("analytics_events", {
  id: serial("id").primaryKey(),
  cardId: bigint("card_id", { mode: "number", unsigned: true }).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventData: json("event_data"),
  visitorId: varchar("visitor_id", { length: 64 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  device: varchar("device", { length: 50 }),
  browser: varchar("browser", { length: 100 }),
  referrer: varchar("referrer", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ae_card_id_idx").on(table.cardId),
  index("ae_event_type_idx").on(table.eventType),
  index("ae_created_idx").on(table.createdAt),
]);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// ─── Media Library ──────────────────────────────────────────────
export const mediaLibrary = mysqlTable("media_library", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileType: mysqlEnum("file_type", ["image", "video", "pdf", "audio"]).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: int("file_size").notNull(),
  width: int("width"),
  height: int("height"),
  duration: int("duration"),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  usedIn: json("used_in"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("media_user_id_idx").on(table.userId),
]);

export type MediaItem = typeof mediaLibrary.$inferSelect;

// ─── Payment Gateways ───────────────────────────────────────────
export const paymentGateways = mysqlTable("payment_gateways", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(false),
  config: json("config").notNull(),
  isSandbox: boolean("is_sandbox").notNull().default(true),
  displayOrder: int("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PaymentGateway = typeof paymentGateways.$inferSelect;

// ─── AI Usage Logs ──────────────────────────────────────────────
export const aiUsageLogs = mysqlTable("ai_usage_logs", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  promptType: varchar("prompt_type", { length: 50 }).notNull(),
  prompt: text("prompt").notNull(),
  response: text("response"),
  tokensUsed: int("tokens_used"),
  status: mysqlEnum("status", ["success", "error", "timeout"]).notNull().default("success"),
  creditsUsed: int("credits_used").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ai_user_id_idx").on(table.userId),
]);

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;

// ─── Audit Logs ─────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: bigint("entity_id", { mode: "number", unsigned: true }),
  oldValues: json("old_values"),
  newValues: json("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audit_user_id_idx").on(table.userId),
  index("audit_entity_idx").on(table.entityType, table.entityId),
]);

export type AuditLog = typeof auditLogs.$inferSelect;

// ─── Notifications ──────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  link: varchar("link", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("notif_user_id_idx").on(table.userId),
  index("notif_read_idx").on(table.isRead),
]);

export type Notification = typeof notifications.$inferSelect;

// ─── Referrals (Refer & Earn) ───────────────────────────────────
// status flow:
//   pending  → someone opened the link but no account yet (rarely used)
//   joined   → the referee created an account (no reward yet)
//   rewarded → the referee bought a paid plan and admin credited the reward
export const referrals = mysqlTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: bigint("referrer_id", { mode: "number", unsigned: true }).notNull(),
  refereeId: bigint("referee_id", { mode: "number", unsigned: true }),
  refereeEmail: varchar("referee_email", { length: 255 }),
  code: varchar("code", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["pending", "joined", "rewarded"]).notNull().default("pending"),
  rewardAmount: decimal("reward_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  rewardedAt: timestamp("rewarded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ref_referrer_idx").on(table.referrerId),
  index("ref_code_idx").on(table.code),
]);

export type Referral = typeof referrals.$inferSelect;

// ─── Wallet Transactions (referral earnings statement) ──────────
export const walletTransactions = mysqlTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  type: mysqlEnum("type", ["reward", "withdrawal", "adjustment"]).notNull(),
  // positive = credit into wallet, negative = debit out of wallet
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "reversed"]).notNull().default("completed"),
  referralId: bigint("referral_id", { mode: "number", unsigned: true }),
  withdrawalId: bigint("withdrawal_id", { mode: "number", unsigned: true }),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("wtx_user_idx").on(table.userId),
  index("wtx_type_idx").on(table.type),
]);

export type WalletTransaction = typeof walletTransactions.$inferSelect;

// ─── Withdrawal Requests (payout to bank / UPI) ─────────────────
export const withdrawalRequests = mysqlTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: mysqlEnum("method", ["bank", "upi"]).notNull(),
  destination: varchar("destination", { length: 500 }).notNull(), // UPI id or bank account snapshot
  accountName: varchar("account_name", { length: 255 }),
  ifsc: varchar("ifsc", { length: 20 }),
  status: mysqlEnum("status", ["pending", "paid", "rejected"]).notNull().default("pending"),
  adminNote: varchar("admin_note", { length: 500 }),
  reference: varchar("reference", { length: 255 }), // admin's payout txn reference
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("wr_user_idx").on(table.userId),
  index("wr_status_idx").on(table.status),
]);

export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;

// ─── Payment Orders (manual UPI/bank payment, admin-verified) ───
export const paymentOrders = mysqlTable("payment_orders", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  packageId: bigint("package_id", { mode: "number", unsigned: true }).notNull(),
  planName: varchar("plan_name", { length: 100 }),
  billingCycle: mysqlEnum("billing_cycle", ["monthly", "yearly", "triennial"]).notNull().default("monthly"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: mysqlEnum("method", ["upi", "bank"]).notNull(),
  // How the order was paid: "manual" = user-submitted UPI/bank proof (admin verifies);
  // "razorpay" = online checkout (auto-verified by signature). Added for the Payment
  // Orders module so revenue can be split by gateway. Defaults to manual so every
  // pre-existing row is correct without a backfill.
  gateway: mysqlEnum("gateway", ["manual", "razorpay"]).notNull().default("manual"),
  reference: varchar("reference", { length: 255 }).notNull(), // UTR / txn id (or razorpay payment id)
  status: mysqlEnum("status", ["pending", "verified", "rejected"]).notNull().default("pending"),
  adminNote: varchar("admin_note", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
}, (table) => [
  index("po_user_idx").on(table.userId),
  index("po_status_idx").on(table.status),
]);

export type PaymentOrder = typeof paymentOrders.$inferSelect;

// ─── App Settings (key/value config, e.g. referral commission %) ─
export const appSettings = mysqlTable("app_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type AppSetting = typeof appSettings.$inferSelect;

// ─── Reseller Applications (partner requests → admin approval) ───
export const resellerApplications = mysqlTable("reseller_applications", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  companyName: varchar("company_name", { length: 255 }),
  message: text("message"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  adminNote: text("admin_note"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ra_status_idx").on(table.status),
  index("ra_email_idx").on(table.email),
]);

export type ResellerApplication = typeof resellerApplications.$inferSelect;

// ─── Custom Domains ─────────────────────────────────────────────
// Maps a customer/reseller domain (e.g. card.acme.com) to a published card
// (userId + owner-local cardId → published_cards.slug). One authoritative table
// so the domain→card resolver, the Caddy on-demand-TLS "ask" endpoint, and the
// admin/reseller/customer UIs all share one source of truth. Additive & safe.
export const customDomains = mysqlTable("custom_domains", {
  id: serial("id").primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull().unique(), // lower-cased hostname
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  cardId: int("card_id").notNull().default(1), // owner-local card id (1 = primary)
  status: mysqlEnum("status", ["pending", "active", "disabled"]).notNull().default("pending"),
  verifyToken: varchar("verify_token", { length: 64 }).notNull(),
  addedByRole: mysqlEnum("added_by_role", ["admin", "reseller", "customer"]).notNull().default("admin"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("cd_user_card_idx").on(table.userId, table.cardId),
  index("cd_status_idx").on(table.status),
]);

export type CustomDomain = typeof customDomains.$inferSelect;

// ─── Email log ──────────────────────────────────────────────────
// One row per outbound email, written by sendEmail(). Support's answer to
// "did they get their login?" without digging through the SMTP provider.
// No body is stored — welcome mails contain a plaintext password.
export const emailLogs = mysqlTable("email_logs", {
  id: serial("id").primaryKey(),
  toEmail: varchar("to_email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 300 }).notNull(),
  kind: varchar("kind", { length: 64 }),          // template name, e.g. accountDetailsEmail
  replyTo: varchar("reply_to", { length: 255 }),
  status: mysqlEnum("status", ["sent", "failed", "skipped"]).notNull().default("sent"),
  error: varchar("error", { length: 500 }),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("emlog_created_idx").on(table.createdAt),
  index("emlog_to_idx").on(table.toEmail),
  index("emlog_status_idx").on(table.status),
  index("emlog_kind_idx").on(table.kind),
]);

export type EmailLog = typeof emailLogs.$inferSelect;

// ─── Mobile app: signed-in devices ──────────────────────────────
// One row per app sign-in. The refresh token itself is never stored — only a
// SHA-256 hash of the current one (and the previous one, so a replayed old
// token can be detected and the session ended). Access tokens issued for a
// session carry its id (`sid`), and requests are refused once it's revoked.
export const appSessions = mysqlTable("app_sessions", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  prevTokenHash: varchar("prev_token_hash", { length: 64 }),
  platform: varchar("platform", { length: 16 }).notNull().default("unknown"), // ios | android | web
  deviceName: varchar("device_name", { length: 120 }),
  appVersion: varchar("app_version", { length: 32 }),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("app_sessions_token_hash_unique").on(table.tokenHash),
  index("app_sessions_user_idx").on(table.userId),
]);

export type AppSession = typeof appSessions.$inferSelect;

// ─── Mobile app: push notification tokens ───────────────────────
export const pushTokens = mysqlTable("push_tokens", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  sessionId: bigint("session_id", { mode: "number", unsigned: true }),
  token: varchar("token", { length: 255 }).notNull(), // Expo push token
  platform: varchar("platform", { length: 16 }).notNull().default("unknown"),
  disabledAt: timestamp("disabled_at"),              // set when the device stops accepting pushes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("push_tokens_token_unique").on(table.token),
  index("push_tokens_user_idx").on(table.userId),
]);

export type PushToken = typeof pushTokens.$inferSelect;

// ─── Account deletion requests (App Store / Play requirement) ───
// Requesting deletion signs the account out everywhere and pauses its card at
// once. Nothing is erased automatically: the team completes the deletion after
// the grace period, and a request can still be cancelled before then.
export const accountDeletionRequests = mysqlTable("account_deletion_requests", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  reason: varchar("reason", { length: 500 }),
  source: varchar("source", { length: 16 }).notNull().default("app"),   // app | web
  status: mysqlEnum("status", ["pending", "cancelled", "completed"]).notNull().default("pending"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("adr_user_idx").on(table.userId),
  index("adr_status_idx").on(table.status),
]);

// ─── Mobile app: one-time links that open the website already signed in ──
// The app asks for a link to a dashboard page (plan checkout, NFC orders…);
// only a hash of the code is stored, the page it opens is fixed server-side,
// and a code works once, within two minutes.
export const appWebLinks = mysqlTable("app_web_links", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  codeHash: varchar("code_hash", { length: 64 }).notNull(),
  next: varchar("next", { length: 200 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("app_web_links_code_unique").on(table.codeHash),
  index("app_web_links_user_idx").on(table.userId),
]);

// ─── What we're allowed to tell an owner about ──────────────────
// One row per owner, written from the app's Alerts screen. The same choice
// governs push and email for that kind of message, so turning "tips" off stops
// both. A missing row means everything is on (see api/lib/notify-prefs.ts).
// Account, security and payment-receipt emails are never governed by this.
export const notificationPrefs = mysqlTable("notification_prefs", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull().unique(),
  enquiries: boolean("enquiries").notNull().default(true),   // a new enquiry on the card
  followUps: boolean("follow_ups").notNull().default(true),  // follow-up reminders
  plan: boolean("plan").notNull().default(true),             // trial and plan reminders
  rewards: boolean("rewards").notNull().default(true),       // referral rewards and payouts
  tips: boolean("tips").notNull().default(true),             // tips, product news, digests
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type NotificationPrefs = typeof notificationPrefs.$inferSelect;

export type AccountDeletionRequest = typeof accountDeletionRequests.$inferSelect;

// ─── Staff: which admin modules a team member may use ───────────
// One row per staff account. permissions maps a module key (contracts/staff.ts)
// to "view" or "manage"; a missing key means no access.
export const staffAccess = mysqlTable("staff_access", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  jobTitle: varchar("job_title", { length: 120 }),
  permissions: json("permissions").notNull(),
  canImpersonate: boolean("can_impersonate").notNull().default(false),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("staff_access_user_unique").on(table.userId),
]);

export type StaffAccess = typeof staffAccess.$inferSelect;

// ─── Admin activity: what happened in the admin portal, and who did it ───
// Every change made by staff or the super admin, every staff sign-in, page
// visit and refused attempt. The actor's name is copied in so the history
// still reads correctly after a staff account is removed. Inputs are stored
// only as a short, redacted summary — never passwords, tokens or images.
export const adminActivity = mysqlTable("admin_activity", {
  id: serial("id").primaryKey(),
  actorId: bigint("actor_id", { mode: "number", unsigned: true }),
  actorName: varchar("actor_name", { length: 255 }).notNull(),
  actorRole: varchar("actor_role", { length: 20 }).notNull(),
  module: varchar("module", { length: 40 }),
  action: varchar("action", { length: 80 }).notNull(),
  summary: varchar("summary", { length: 300 }),
  target: varchar("target", { length: 191 }),
  status: mysqlEnum("status", ["ok", "denied", "error"]).notNull().default("ok"),
  error: varchar("error", { length: 300 }),
  ip: varchar("ip", { length: 64 }),
  userAgent: varchar("user_agent", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("admact_created_idx").on(table.createdAt),
  index("admact_actor_idx").on(table.actorId, table.createdAt),
  index("admact_module_idx").on(table.module, table.createdAt),
  index("admact_status_idx").on(table.status),
]);

export type AdminActivity = typeof adminActivity.$inferSelect;
