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
} from "drizzle-orm/mysql-core";

// ─── Users ──────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  avatar: varchar("avatar", { length: 500 }),
  role: mysqlEnum("role", ["super_admin", "reseller", "customer"]).notNull().default("customer"),
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).notNull().default("active"),
  resellerId: bigint("reseller_id", { mode: "number", unsigned: true }),
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
  trialDays: int("trial_days").notNull().default(7),
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
  billingCycle: mysqlEnum("billing_cycle", ["monthly", "yearly"]).notNull().default("monthly"),
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

// ─── Leads ──────────────────────────────────────────────────────
export const leads = mysqlTable("leads", {
  id: serial("id").primaryKey(),
  cardId: bigint("card_id", { mode: "number", unsigned: true }).notNull(),
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
