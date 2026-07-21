import { relations } from "drizzle-orm";
import {
  users,
  resellerProfiles,
  subscriptionPackages,
  subscriptions,
  invoices,
  cards,
  cardBlocks,
  templates,
  leads,
  analyticsEvents,
  mediaLibrary,
  aiUsageLogs,
  notifications,
} from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  resellerProfile: one(resellerProfiles, {
    fields: [users.id],
    references: [resellerProfiles.userId],
  }),
  cards: many(cards),
  subscriptions: many(subscriptions),
  media: many(mediaLibrary),
  aiUsage: many(aiUsageLogs),
  notifications: many(notifications),
}));

export const resellerProfilesRelations = relations(resellerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [resellerProfiles.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  package: one(subscriptionPackages, {
    fields: [subscriptions.packageId],
    references: [subscriptionPackages.id],
  }),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  user: one(users, {
    fields: [cards.userId],
    references: [users.id],
  }),
  template: one(templates, {
    fields: [cards.templateId],
    references: [templates.id],
  }),
  blocks: many(cardBlocks),
  leads: many(leads),
  analytics: many(analyticsEvents),
}));

export const cardBlocksRelations = relations(cardBlocks, ({ one }) => ({
  card: one(cards, {
    fields: [cardBlocks.cardId],
    references: [cards.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  card: one(cards, {
    fields: [leads.cardId],
    references: [cards.id],
  }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  card: one(cards, {
    fields: [analyticsEvents.cardId],
    references: [cards.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
}));
