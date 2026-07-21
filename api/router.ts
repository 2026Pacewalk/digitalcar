import { authRouter } from "./auth-router";
import { userRouter } from "./user-router";
import { packageRouter } from "./package-router";
import { subscriptionRouter } from "./subscription-router";
import { cardRouter } from "./card-router";
import { blockRouter } from "./block-router";
import { templateRouter } from "./template-router";
import { leadRouter } from "./lead-router";
import { analyticsRouter } from "./analytics-router";
import { settingsRouter } from "./settings-router";
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
  lead: leadRouter,
  analytics: analyticsRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
