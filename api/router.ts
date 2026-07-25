import { authRouter } from "./auth-router";
import { userRouter } from "./user-router";
import { packageRouter } from "./package-router";
import { subscriptionRouter } from "./subscription-router";
import { cardRouter } from "./card-router";
import { blockRouter } from "./block-router";
import { templateRouter } from "./template-router";
import { productRouter } from "./product-router";
import { trialRouter } from "./trial-router";
import { publishRouter } from "./publish-router";
import { companyRouter } from "./company-router";
import { leadRouter } from "./lead-router";
import { analyticsRouter } from "./analytics-router";
import { settingsRouter } from "./settings-router";
import { referralRouter } from "./referral-router";
import { notificationRouter } from "./notification-router";
import { paymentRouter } from "./payment-router";
import { resellerRouter } from "./reseller-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  user: userRouter,
  package: packageRouter,
  subscription: subscriptionRouter,
  card: cardRouter,
  block: blockRouter,
  template: templateRouter,
  product: productRouter,
  trial: trialRouter,
  publish: publishRouter,
  company: companyRouter,
  lead: leadRouter,
  analytics: analyticsRouter,
  settings: settingsRouter,
  referral: referralRouter,
  notification: notificationRouter,
  payment: paymentRouter,
  reseller: resellerRouter,
});

export type AppRouter = typeof appRouter;
