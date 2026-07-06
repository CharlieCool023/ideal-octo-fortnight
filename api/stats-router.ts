import { createRouter, staffQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { corpsMembers, evaluations, comments, staffUsers, batches } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";

type DashboardStats = {
  activeBatch: { id: number; name: string; state: string } | null;
  totalUsers?: number;
  totalCommandants?: number;
  totalBatches?: number;
  totalCorpsMembers?: number;
  evaluatedCount?: number;
  completedEvaluationCount?: number;
  commentedCount?: number;
  totalMembers?: number;
  processedCount?: number;
  pendingCount?: number;
};

export const statsRouter = createRouter({
  dashboard: staffQuery.query(async ({ ctx }) => {
    const db = getDb();
    const user = ctx.staffUser!;

    const activeBatch = await db
      .select()
      .from(batches)
      .where(eq(batches.isActive, 1))
      .then((rows) => rows[0] || null);

    const stats: DashboardStats = {
      activeBatch: activeBatch
        ? { id: activeBatch.id, name: activeBatch.name, state: activeBatch.state }
        : null,
    };

    if (user.role === "super_admin") {
      // All counts in parallel — single query each, no loops
      const [totalUsers, totalCommandants, totalBatches, totalCorpsMembers] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(staffUsers).then((r) => r[0].count),
        db.select({ count: sql<number>`count(*)` }).from(staffUsers).where(eq(staffUsers.role, "camp_commandant")).then((r) => r[0].count),
        db.select({ count: sql<number>`count(*)` }).from(batches).then((r) => r[0].count),
        db.select({ count: sql<number>`count(*)` }).from(corpsMembers).then((r) => r[0].count),
      ]);
      stats.totalUsers = totalUsers;
      stats.totalCommandants = totalCommandants;
      stats.totalBatches = totalBatches;
      stats.totalCorpsMembers = totalCorpsMembers;
    }

    if (user.role === "camp_commandant" || user.role === "state_commandant") {
      const [totalMembers, totalBatches] = await Promise.all([
        activeBatch
          ? db.select({ count: sql<number>`count(*)` }).from(corpsMembers).where(eq(corpsMembers.batchId, activeBatch.id)).then((r) => r[0].count)
          : Promise.resolve(0),
        db.select({ count: sql<number>`count(*)` }).from(batches).then((r) => r[0].count),
      ]);

      stats.totalCorpsMembers = totalMembers;
      stats.totalBatches = totalBatches;

      if (activeBatch) {
        // Count members with any instructor evaluation, plus those completed by both instructor roles.
        const evaluatedCount = await db
          .select({ count: sql<number>`count(distinct cm.id)` })
          .from(sql`${corpsMembers} cm`)
          .where(sql`
            cm.batch_id = ${activeBatch.id}
            AND EXISTS (SELECT 1 FROM ${evaluations} e WHERE e.corps_member_id = cm.id)
          `)
          .then((r) => r[0].count);

        const completedEvaluationCount = await db
          .select({ count: sql<number>`count(distinct cm.id)` })
          .from(sql`${corpsMembers} cm`)
          .where(sql`
            cm.batch_id = ${activeBatch.id}
            AND EXISTS (SELECT 1 FROM ${evaluations} e1 WHERE e1.corps_member_id = cm.id AND e1.evaluator_role = 'platoon_instructor')
            AND EXISTS (SELECT 1 FROM ${evaluations} e2 WHERE e2.corps_member_id = cm.id AND e2.evaluator_role = 'man_o_war_instructor')
          `)
          .then((r) => r[0].count);

        // Single query: count members with at least one soldier comment
        const commentedCount = await db
          .select({ count: sql<number>`count(distinct cm.id)` })
          .from(sql`${corpsMembers} cm`)
          .where(sql`
            cm.batch_id = ${activeBatch.id}
            AND EXISTS (SELECT 1 FROM ${comments} c WHERE c.corps_member_id = cm.id)
          `)
          .then((r) => r[0].count);

        stats.evaluatedCount = evaluatedCount;
        stats.completedEvaluationCount = completedEvaluationCount;
        stats.commentedCount = commentedCount;
      }
    }

    if (
      user.role === "platoon_instructor" ||
      user.role === "man_o_war_instructor" ||
      user.role === "soldier"
    ) {
      const platoon = user.assignedPlatoon || 0;

      if (!activeBatch) {
        stats.totalMembers = 0;
        stats.processedCount = 0;
        stats.pendingCount = 0;
        return stats;
      }

      const totalMembers = await db
        .select({ count: sql<number>`count(*)` })
        .from(corpsMembers)
        .where(and(eq(corpsMembers.platoon, platoon), eq(corpsMembers.batchId, activeBatch.id)))
        .then((r) => r[0].count);

      let processedCount = 0;

      if (user.role === "platoon_instructor") {
        processedCount = await db
          .select({ count: sql<number>`count(distinct e.corps_member_id)` })
          .from(sql`${evaluations} e`)
          .where(sql`
            e.evaluator_role = 'platoon_instructor'
            AND EXISTS (
              SELECT 1 FROM ${corpsMembers} cm
              WHERE cm.id = e.corps_member_id
              AND cm.platoon = ${platoon}
              AND cm.batch_id = ${activeBatch.id}
            )
          `)
          .then((r) => r[0].count);
      } else if (user.role === "man_o_war_instructor") {
        processedCount = await db
          .select({ count: sql<number>`count(distinct e.corps_member_id)` })
          .from(sql`${evaluations} e`)
          .where(sql`
            e.evaluator_role = 'man_o_war_instructor'
            AND EXISTS (
              SELECT 1 FROM ${corpsMembers} cm
              WHERE cm.id = e.corps_member_id
              AND cm.platoon = ${platoon}
              AND cm.batch_id = ${activeBatch.id}
            )
          `)
          .then((r) => r[0].count);
      } else if (user.role === "soldier") {
        processedCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(sql`${comments} c`)
          .where(sql`
            c.soldier_id = ${user.id}
            AND EXISTS (
              SELECT 1 FROM ${corpsMembers} cm
              WHERE cm.id = c.corps_member_id
              AND cm.platoon = ${platoon}
              AND cm.batch_id = ${activeBatch.id}
            )
          `)
          .then((r) => r[0].count);
      }

      stats.totalMembers = totalMembers;
      stats.processedCount = processedCount;
      stats.pendingCount = Number(totalMembers) - Number(processedCount);
    }

    return stats;
  }),
});
