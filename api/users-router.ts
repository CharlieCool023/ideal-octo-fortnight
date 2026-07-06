import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, staffQuery, adminOrCommandantQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { staffUsers } from "@db/schema";
import { eq, like, and, or, inArray } from "drizzle-orm";
import { hashPassword } from "./lib/custom-auth";

const STAFF_ROLES = [
  "super_admin",
  "state_commandant",
  "camp_commandant",
  "platoon_instructor",
  "man_o_war_instructor",
  "soldier",
] as const;

const CAMP_MANAGED_ROLES = [
  "platoon_instructor",
  "man_o_war_instructor",
  "soldier",
] as const;

type CampManagedRole = (typeof CAMP_MANAGED_ROLES)[number];

function isCampManagedRole(role: string): role is CampManagedRole {
  return CAMP_MANAGED_ROLES.includes(role as CampManagedRole);
}

function assertCampCommandantCanManage(
  actorRole: string,
  targetRole: string,
  message = "Camp commandants can only manage platoon instructors, Man O'War instructors, and soldiers"
) {
  if (actorRole === "camp_commandant" && !isCampManagedRole(targetRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message,
    });
  }
}

export const usersRouter = createRouter({
  // List all staff users (admin/commandant only)
  list: adminOrCommandantQuery
    .input(
      z
        .object({
          search: z.string().optional(),
          role: z.enum(STAFF_ROLES).optional(),
          platoon: z.number().optional(),
          isActive: z.number().optional(),
          batchId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const conditions = [];

      if (input?.search) {
        conditions.push(
          or(
            like(staffUsers.fullName, `%${input.search}%`),
            like(staffUsers.username, `%${input.search}%`)
          )
        );
      }
      if (input?.role) {
        conditions.push(eq(staffUsers.role, input.role));
      }
      if (input?.platoon) {
        conditions.push(eq(staffUsers.assignedPlatoon, input.platoon));
      }
      if (input?.isActive !== undefined) {
        conditions.push(eq(staffUsers.isActive, input.isActive as 0 | 1));
      }
      if (input?.batchId) {
        conditions.push(eq(staffUsers.assignedBatchId, input.batchId));
      }

      // Camp commandants can only manage camp-level staff.
      if (ctx.staffUser!.role === "camp_commandant") {
        conditions.push(inArray(staffUsers.role, [...CAMP_MANAGED_ROLES]));
      }

      const query = conditions.length > 0
        ? db.select().from(staffUsers).where(and(...conditions))
        : db.select().from(staffUsers);

      return query;
    }),

  // Get single user
  get: staffQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.id, input.id))
        .then((rows) => rows[0] || null);
    }),

  // Create staff user (admin/commandant only)
  create: adminOrCommandantQuery
    .input(
      z.object({
        fullName: z.string().min(1),
        username: z.string().min(3),
        password: z.string().min(6, "Password must be at least 6 characters"),
        role: z.enum(STAFF_ROLES).exclude(["super_admin"]),
        assignedPlatoon: z.number().min(1).max(10).optional(),
        assignedBatchId: z.number().optional(),
        state: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      assertCampCommandantCanManage(ctx.staffUser!.role, input.role);
      const passwordHash = await hashPassword(input.password);

      // Check username uniqueness
      const existing = await db
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.username, input.username))
        .then((rows) => rows[0]);

      if (existing) {
        throw new Error("Username already exists");
      }

      const conflictingUsers =
        isCampManagedRole(input.role) && input.assignedPlatoon
          ? await db
              .select({
                id: staffUsers.id,
                fullName: staffUsers.fullName,
                username: staffUsers.username,
              })
              .from(staffUsers)
              .where(
                and(
                  eq(staffUsers.role, input.role),
                  eq(staffUsers.assignedPlatoon, input.assignedPlatoon),
                  eq(staffUsers.isActive, 1)
                )
              )
          : [];

      const result = await db.transaction(async (tx) => {
        if (conflictingUsers.length > 0) {
          await tx
            .update(staffUsers)
            .set({ isActive: 0 })
            .where(inArray(staffUsers.id, conflictingUsers.map((user) => user.id)));
        }

        return tx.insert(staffUsers).values({
          fullName: input.fullName,
          username: input.username,
          passwordHash,
          role: input.role,
          assignedPlatoon: input.assignedPlatoon,
          assignedBatchId: input.assignedBatchId,
          state: input.state,
          isActive: 1,
        });
      });

      return {
        success: true,
        id: Number(result[0].insertId),
        deactivatedUsers: conflictingUsers,
      };
    }),

  // Update staff user
  update: adminOrCommandantQuery
    .input(
      z.object({
        id: z.number(),
        fullName: z.string().min(1).optional(),
        username: z.string().min(3).optional(),
        role: z.enum(STAFF_ROLES).optional(),
        assignedPlatoon: z.number().min(1).max(10).optional(),
        assignedBatchId: z.number().optional(),
        state: z.string().optional(),
        isActive: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const db = getDb();

      const target = await db
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.id, id))
        .then((rows) => rows[0]);

      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      assertCampCommandantCanManage(ctx.staffUser!.role, target.role);
      if (data.role) {
        assertCampCommandantCanManage(ctx.staffUser!.role, data.role);
      }

      const nextRole = data.role ?? target.role;
      const nextPlatoon = data.assignedPlatoon ?? target.assignedPlatoon;
      const conflictingUsers =
        isCampManagedRole(nextRole) && nextPlatoon && data.isActive !== 0
          ? await db
              .select({
                id: staffUsers.id,
                fullName: staffUsers.fullName,
                username: staffUsers.username,
              })
              .from(staffUsers)
              .where(
                and(
                  eq(staffUsers.role, nextRole),
                  eq(staffUsers.assignedPlatoon, nextPlatoon),
                  eq(staffUsers.isActive, 1)
                )
              )
              .then((rows) => rows.filter((user) => user.id !== id))
          : [];

      await db.transaction(async (tx) => {
        if (conflictingUsers.length > 0) {
          await tx
            .update(staffUsers)
            .set({ isActive: 0 })
            .where(inArray(staffUsers.id, conflictingUsers.map((user) => user.id)));
        }

        await tx.update(staffUsers).set(data).where(eq(staffUsers.id, id));
      });

      return { success: true, deactivatedUsers: conflictingUsers };
    }),

  // Deactivate/Delete (soft delete)
  delete: adminOrCommandantQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const target = await db
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.id, input.id))
        .then((rows) => rows[0]);

      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      assertCampCommandantCanManage(ctx.staffUser!.role, target.role);

      await db
        .update(staffUsers)
        .set({ isActive: 0 })
        .where(eq(staffUsers.id, input.id));
      return { success: true };
    }),

  // Permanently remove a staff user from the database.
  hardDelete: adminOrCommandantQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const user = await db
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.id, input.id))
        .then((rows) => rows[0]);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.role === "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Super admin accounts cannot be deleted",
        });
      }

      assertCampCommandantCanManage(ctx.staffUser!.role, user.role);

      await db.delete(staffUsers).where(eq(staffUsers.id, input.id));
      return { success: true };
    }),

  // Reactivate user
  reactivate: adminOrCommandantQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const target = await db
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.id, input.id))
        .then((rows) => rows[0]);

      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      assertCampCommandantCanManage(ctx.staffUser!.role, target.role);

      const conflictingUsers =
        isCampManagedRole(target.role) && target.assignedPlatoon
          ? await db
              .select({ id: staffUsers.id })
              .from(staffUsers)
              .where(
                and(
                  eq(staffUsers.role, target.role),
                  eq(staffUsers.assignedPlatoon, target.assignedPlatoon),
                  eq(staffUsers.isActive, 1)
                )
              )
              .then((rows) => rows.filter((user) => user.id !== input.id))
          : [];

      if (conflictingUsers.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Another active user is already assigned to this role and platoon. Create or update the replacement account to deactivate the existing assignment automatically.",
        });
      }

      await db
        .update(staffUsers)
        .set({ isActive: 1 })
        .where(eq(staffUsers.id, input.id));
      return { success: true };
    }),
});
