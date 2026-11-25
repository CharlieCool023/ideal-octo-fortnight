import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as cookie from "cookie";
import { createRouter, publicQuery, staffQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { staffUsers } from "@db/schema";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  signStaffToken,
} from "./lib/custom-auth";
import { getSessionCookieOptions } from "./lib/cookies";
import { consumeRateLimit, getClientAddress, loginRateLimitKeys } from "./lib/rate-limit";

const DUMMY_PASSWORD_HASH = "$2b$12$iv7TQhsm./vSd/QbCZ7RMe2M.DlHdw5TeIlyV3WFmXQC5IATPelDa";

export const customAuthRouter = createRouter({
  // Staff login
  login: publicQuery
    .input(
      z.object({
        username: z.string().trim().min(1, "Username is required").max(100),
        password: z.string().min(1, "Password is required").max(72),
        portal: z.enum(["staff", "super_admin"]).default("staff"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const address = getClientAddress(ctx.req.headers);
      const keys = loginRateLimitKeys(address, input.username);
      const now = Date.now();
      const accountLimit = consumeRateLimit(keys.account, 5, 15 * 60 * 1000, now);
      const addressLimit = consumeRateLimit(keys.ip, 30, 15 * 60 * 1000, now);
      if (!accountLimit.allowed || !addressLimit.allowed) {
        const retryAfterSeconds = Math.max(
          accountLimit.allowed ? 0 : accountLimit.retryAfterSeconds,
          addressLimit.allowed ? 0 : addressLimit.retryAfterSeconds,
        );
        ctx.resHeaders.set("Retry-After", String(retryAfterSeconds));
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many login attempts. Try again later.",
        });
      }

      const db = getDb();
      const user = await db
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.username, input.username))
        .then((rows) => rows[0])
        .catch(() => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Login is temporarily unavailable.",
          });
        });

      const valid = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
      const portalMatches = input.portal === "super_admin"
        ? user?.role === "super_admin"
        : user?.role !== "super_admin";
      if (!user || !user.isActive || !valid || !portalMatches) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
      }

      const token = await signStaffToken({
        staffId: user.id,
        username: user.username,
        role: user.role,
      });

      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize("nysc_staff_token", token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: 7 * 24 * 60 * 60,
        })
      );

      return {
        success: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          username: user.username,
          role: user.role,
          assignedPlatoon: user.assignedPlatoon,
          assignedBatchId: user.assignedBatchId,
          state: user.state,
        },
      };
    }),

  // Get current staff session
  me: publicQuery.query(async ({ ctx }) => {
    if (!ctx.staffUser) return null;
    return {
      id: ctx.staffUser.id,
      fullName: ctx.staffUser.fullName,
      username: ctx.staffUser.username,
      role: ctx.staffUser.role,
      assignedPlatoon: ctx.staffUser.assignedPlatoon,
      assignedBatchId: ctx.staffUser.assignedBatchId,
      state: ctx.staffUser.state,
    };
  }),

  // Staff logout
  logout: publicQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize("nysc_staff_token", "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      })
    );
    return { success: true };
  }),

  // Change password
  changePassword: staffQuery
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(12, "Password must be at least 12 characters").max(72),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const user = await db
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.id, ctx.staffUser!.id))
        .then((rows) => rows[0]);

      if (!user) throw new Error("User not found");

      const valid = await verifyPassword(input.currentPassword, user.passwordHash);
      if (!valid) throw new Error("Current password is incorrect");

      const newHash = await hashPassword(input.newPassword);
      await db
        .update(staffUsers)
        .set({ passwordHash: newHash })
        .where(eq(staffUsers.id, user.id));

      return { success: true };
    }),
});
