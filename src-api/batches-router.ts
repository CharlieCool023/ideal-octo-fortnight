import { z } from "zod";
import { createRouter, publicQuery, staffQuery, adminOrCommandantQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { batches, corpsMembers, evaluations, comments, commandantComments, higherInstitutions } from "@db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";

const MAX_BATCHES = 3;

export const batchesRouter = createRouter({
  // List all batches (public so registration page can check for active batch)
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(batches).orderBy(desc(batches.createdAt));
  }),

  // Get active batch
  getActive: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(batches)
      .where(eq(batches.isActive, 1))
      .then((rows) => rows[0] || null);
  }),

  // Get single batch
  get: staffQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(batches)
        .where(eq(batches.id, input.id))
        .then((rows) => rows[0] || null);
    }),

  // Create batch — max 3 allowed
  create: adminOrCommandantQuery
    .input(
      z.object({
        name: z.string().min(1),
        year: z.number().min(2000).max(2100),
        state: z.enum(["ondo", "lagos"]),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Enforce 3-batch limit
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(batches)
        .then((r) => r[0].count);

      if (Number(countResult) >= MAX_BATCHES) {
        throw new Error(
          `Maximum of ${MAX_BATCHES} batches allowed. Please delete an existing batch before creating a new one.`
        );
      }

      const result = await db.insert(batches).values(input);
      return { success: true, id: Number(result[0].insertId) };
    }),

  // Update batch
  update: adminOrCommandantQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        year: z.number().optional(),
        state: z.enum(["ondo", "lagos"]).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const db = getDb();
      await db.update(batches).set(data).where(eq(batches.id, id));
      return { success: true };
    }),

  // Activate a batch (deactivates all others)
  activate: adminOrCommandantQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Deactivate all batches
      await db.update(batches).set({ isActive: 0 });
      // Activate selected batch
      await db
        .update(batches)
        .set({ isActive: 1 })
        .where(eq(batches.id, input.id));
      return { success: true };
    }),

  // Deactivate a batch
  deactivate: adminOrCommandantQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(batches)
        .set({ isActive: 0 })
        .where(eq(batches.id, input.id));
      return { success: true };
    }),

  // Delete batch — permanently removes batch AND all associated data
  delete: adminOrCommandantQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      return db.transaction(async (tx) => {
        // Get all corps members in this batch
        const members = await tx
          .select({ id: corpsMembers.id })
          .from(corpsMembers)
          .where(eq(corpsMembers.batchId, input.id));

        const memberIds = members.map((member) => member.id);

        if (memberIds.length > 0) {
          await tx.delete(evaluations).where(inArray(evaluations.corpsMemberId, memberIds));
          await tx.delete(comments).where(inArray(comments.corpsMemberId, memberIds));
          await tx.delete(commandantComments).where(inArray(commandantComments.corpsMemberId, memberIds));
          await tx.delete(higherInstitutions).where(inArray(higherInstitutions.corpsMemberId, memberIds));
        }

        await tx.delete(corpsMembers).where(eq(corpsMembers.batchId, input.id));
        await tx.delete(batches).where(eq(batches.id, input.id));

        const [remainingBatch, remainingMembers] = await Promise.all([
          tx.select({ count: sql<number>`count(*)` }).from(batches).where(eq(batches.id, input.id)),
          tx.select({ count: sql<number>`count(*)` }).from(corpsMembers).where(eq(corpsMembers.batchId, input.id)),
        ]);

        const remaining = {
          batches: Number(remainingBatch[0]?.count ?? 0),
          corpsMembers: Number(remainingMembers[0]?.count ?? 0),
          evaluations: 0,
          comments: 0,
          commandantComments: 0,
          higherInstitutions: 0,
        };

        if (memberIds.length > 0) {
          const [
            remainingEvaluations,
            remainingComments,
            remainingCommandantComments,
            remainingInstitutions,
          ] = await Promise.all([
            tx.select({ count: sql<number>`count(*)` }).from(evaluations).where(inArray(evaluations.corpsMemberId, memberIds)),
            tx.select({ count: sql<number>`count(*)` }).from(comments).where(inArray(comments.corpsMemberId, memberIds)),
            tx.select({ count: sql<number>`count(*)` }).from(commandantComments).where(inArray(commandantComments.corpsMemberId, memberIds)),
            tx.select({ count: sql<number>`count(*)` }).from(higherInstitutions).where(inArray(higherInstitutions.corpsMemberId, memberIds)),
          ]);

          remaining.evaluations = Number(remainingEvaluations[0]?.count ?? 0);
          remaining.comments = Number(remainingComments[0]?.count ?? 0);
          remaining.commandantComments = Number(remainingCommandantComments[0]?.count ?? 0);
          remaining.higherInstitutions = Number(remainingInstitutions[0]?.count ?? 0);
        }

        if (Object.values(remaining).some((count) => count > 0)) {
          throw new Error("Batch deletion did not remove all database records");
        }

        return { success: true, remaining };
      });
    }),
});
