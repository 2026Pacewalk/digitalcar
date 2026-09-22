import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(roles: string[]) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || !roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

/* Admin portal access. The super admin may do everything; a staff member only
   what their granted modules allow — reads need "view", changes need "manage"
   (api/lib/staff-access.ts). Every change, by either, is written to the
   activity log, and so is every refused attempt by staff. */
const requireAdminAccess = t.middleware(async (opts) => {
  const { ctx, next, path, type } = opts;
  const user = ctx.user;
  if (!user || (user.role !== "super_admin" && user.role !== "staff")) {
    throw new TRPCError({ code: "FORBIDDEN", message: ErrorMessages.insufficientRole });
  }
  const { grantForPath, staffAccessFor, staffMayUse, recordActivity, actionLabel, summarizeInput, staffAccountViolation } = await import("./lib/staff-access");
  const grant = grantForPath(path);
  const logIt = type === "mutation";
  const describe = async () => summarizeInput(await opts.getRawInput().catch(() => undefined));

  if (user.role === "staff") {
    const access = await staffAccessFor(user.id);
    const level = type === "mutation" ? "manage" : "view";
    if (!grant || !staffMayUse(access, grant, level)) {
      const { moduleLabel } = await import("@contracts/staff");
      const what = grant ? moduleLabel(grant) : "this area";
      if (logIt || grant === "impersonate") {
        const d = await describe();
        const reason = grant === "impersonate" ? "Log in as customer is off for this account"
          : grant ? `No ${level === "manage" ? "edit" : "view"} access to ${what}` : "Super admin only";
        recordActivity({ actor: user, module: grant, action: actionLabel(path), ...d, status: "denied", error: reason, req: ctx.req });
      }
      throw new TRPCError({
        code: "FORBIDDEN",
        message: grant && level === "manage" && staffMayUse(access, grant, "view")
          ? `You can view ${what} but not make changes. Ask the super admin for edit access.`
          : `Your account doesn't have access to ${what}. Ask the super admin to grant it.`,
      });
    }
    if (logIt) {
      const refusal = await staffAccountViolation(path, await opts.getRawInput().catch(() => undefined));
      if (refusal) {
        const d = await describe();
        recordActivity({ actor: user, module: grant, action: actionLabel(path), ...d, status: "denied", error: refusal, req: ctx.req });
        throw new TRPCError({ code: "FORBIDDEN", message: refusal });
      }
    }
  }

  const result = await next({ ctx: { ...ctx, user } });
  if (logIt) {
    const d = await describe();
    recordActivity({
      actor: user, module: grant, action: actionLabel(path), ...d,
      status: result.ok ? "ok" : "error",
      error: result.ok ? null : result.error.message,
      req: ctx.req,
    });
  }
  return result;
});

export const authedQuery = t.procedure.use(requireAuth);
export const adminQuery = authedQuery.use(requireAdminAccess);
/** Super admin only — never grantable to staff (staff management, activity log). */
export const superAdminQuery = authedQuery.use(requireRole(["super_admin"]));
export const resellerQuery = authedQuery.use(requireRole(["reseller", "super_admin"]));
export const customerQuery = authedQuery.use(requireRole(["customer", "super_admin", "reseller"]));
