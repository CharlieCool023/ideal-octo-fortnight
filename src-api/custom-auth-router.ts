import { z } from "zod";
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

export const customAuthRouter = createRouter({
  // Staff login
  login: publicQuery
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
        portal: z.enum(["staff", "super_admin"]).default("staff"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const user = await db
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.username, input.username))
        .then((rows) => rows[0])
        .catch(() => {
          throw new Error(
            "Database is not available. Check DATABASE_URL, then run npm run db:push and npm run db:seed."
          );
        });

      if (!user) {
        throw new Error("Invalid username or password");
      }

      if (!user.isActive) {
        throw new Error("Account is deactivated");
      }

      if (input.portal === "staff" && user.role === "super_admin") {
        throw new Error("Super admin must login from the superadmin endpoint");
      }

      if (input.portal === "super_admin" && user.role !== "super_admin") {
        throw new Error("Use the staff login page for this account");
      }

      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new Error("Invalid username or password");
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
        newPassword: z.string().min(6),
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
