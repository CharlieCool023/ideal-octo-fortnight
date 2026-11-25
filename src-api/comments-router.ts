import { z } from "zod";
import { createRouter, soldierQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { comments, corpsMembers, batches } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const commentsRouter = createRouter({
  // Get comments for a corps member
  list: soldierQuery
    .input(z.object({ corpsMemberId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();

      // Verify corps member belongs to active batch
      const activeBatch = await db
        .select()
        .from(batches)
        .where(eq(batches.isActive, 1))
        .then((rows) => rows[0]);

      if (!activeBatch) return [];

      const member = await db
        .select()
        .from(corpsMembers)
        .where(eq(corpsMembers.id, input.corpsMemberId))
        .then((rows) => rows[0]);

      if (!member || member.batchId !== activeBatch.id) return [];
      if (ctx.staffUser!.role === "soldier" && member.platoon !== (ctx.staffUser!.assignedPlatoon || 0)) return [];

      return db
        .select()
        .from(comments)
        .where(eq(comments.corpsMemberId, input.corpsMemberId));
    }),

  // Get my comment for a corps member
  getMine: soldierQuery
    .input(z.object({ corpsMemberId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();

      // Verify corps member belongs to active batch
      const activeBatch = await db
        .select()
        .from(batches)
        .where(eq(batches.isActive, 1))
        .then((rows) => rows[0]);

      if (!activeBatch) return null;

      const member = await db
        .select()
        .from(corpsMembers)
        .where(eq(corpsMembers.id, input.corpsMemberId))
        .then((rows) => rows[0]);

      if (!member || member.batchId !== activeBatch.id) return null;
      if (ctx.staffUser!.role === "soldier" && member.platoon !== (ctx.staffUser!.assignedPlatoon || 0)) return null;

      return db
        .select()
        .from(comments)
        .where(
          and(
            eq(comments.corpsMemberId, input.corpsMemberId),
            eq(comments.soldierId, ctx.staffUser!.id)
          )
        )
        .then((rows) => rows[0] || null);
    }),

  // Submit or update comment
  submit: soldierQuery
    .input(
      z.object({
        corpsMemberId: z.number(),
        comment: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Verify corps member belongs to active batch
      const activeBatch = await db
        .select()
        .from(batches)
        .where(eq(batches.isActive, 1))
        .then((rows) => rows[0]);

      if (!activeBatch) throw new Error("No active batch");

      const member = await db
        .select()
        .from(corpsMembers)
        .where(eq(corpsMembers.id, input.corpsMemberId))
        .then((rows) => rows[0]);

      if (!member || member.batchId !== activeBatch.id) {
        throw new Error("Corps member not found in active batch");
      }
      if (ctx.staffUser!.role === "soldier" && member.platoon !== (ctx.staffUser!.assignedPlatoon || 0)) {
        throw new Error("Corps member is outside your assigned platoon");
      }

      const existing = await db
        .select()
        .from(comments)
        .where(
          and(
            eq(comments.corpsMemberId, input.corpsMemberId),
            eq(comments.soldierId, ctx.staffUser!.id)
          )
        )
        .then((rows) => rows[0]);

      if (existing) {
        await db
          .update(comments)
          .set({ comment: input.comment })
          .where(eq(comments.id, existing.id));
        return { success: true, updated: true };
      } else {
        await db.insert(comments).values({
          corpsMemberId: input.corpsMemberId,
          soldierId: ctx.staffUser!.id,
          comment: input.comment,
        });
        return { success: true, updated: false };
      }
    }),
});
