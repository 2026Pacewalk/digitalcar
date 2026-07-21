import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { createToken } from "../lib/jwt";

export const kimiAuthRouter = createRouter({
  me: publicQuery.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.fullName,
      role: ctx.user.role,
      avatar: ctx.user.avatar,
    };
  }),
});
