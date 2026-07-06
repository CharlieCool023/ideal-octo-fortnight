import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

// Require an authenticated staff user
const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.staffUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, staffUser: ctx.staffUser } });
});

// Require staff authentication
const requireStaffAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.staffUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Staff authentication required",
    });
  }

  return next({ ctx: { ...ctx, staffUser: ctx.staffUser } });
});

// Require specific staff role
function requireStaffRole(roles: string[]) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.staffUser) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Staff authentication required",
      });
    }

    if (!roles.includes(ctx.staffUser.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, staffUser: ctx.staffUser } });
  });
}

// General staff auth
export const authedQuery = t.procedure.use(requireAuth);

// Staff auth (any staff member)
export const staffQuery = t.procedure.use(requireStaffAuth);

// Role-specific staff queries
export const superAdminQuery = staffQuery.use(
  requireStaffRole(["super_admin"])
);
export const stateCommandantQuery = staffQuery.use(
  requireStaffRole(["super_admin", "state_commandant"])
);
export const campCommandantQuery = staffQuery.use(
  requireStaffRole(["super_admin", "camp_commandant"])
);
export const instructorQuery = staffQuery.use(
  requireStaffRole(["super_admin", "camp_commandant", "platoon_instructor"])
);
export const manOWarQuery = staffQuery.use(
  requireStaffRole(["super_admin", "camp_commandant", "man_o_war_instructor"])
);
export const soldierQuery = staffQuery.use(
  requireStaffRole(["super_admin", "camp_commandant", "soldier"])
);

// Admin or camp commandant (for staff management)
export const adminOrCommandantQuery = staffQuery.use(
  requireStaffRole(["super_admin", "camp_commandant"])
);
