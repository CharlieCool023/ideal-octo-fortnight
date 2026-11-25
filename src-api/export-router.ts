import { z } from "zod";
import { createRouter, staffQuery, adminOrCommandantQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { corpsMembers, evaluations, comments, commandantComments, higherInstitutions, batches } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { buildMembersCsv } from "./lib/csv-export";

export const exportRouter = createRouter({
  // Export corps members as CSV
  csv: adminOrCommandantQuery
    .input(z.object({ batchId: z.number() }).optional())
    .query(async ({ input }) => {
      return buildMembersCsv(input?.batchId);
    }),

  // Full report for print
  fullReport: staffQuery
    .input(z.object({ corpsMemberId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();

      // Verify active batch
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
      const user = ctx.staffUser!;
      if (user.role === "state_commandant" && (!user.state || activeBatch.state !== user.state || member.state !== user.state)) return null;
      if (
        (user.role === "platoon_instructor" || user.role === "man_o_war_instructor" || user.role === "soldier") &&
        member.platoon !== (user.assignedPlatoon || 0)
      ) return null;

      const institutions = await db
        .select()
        .from(higherInstitutions)
        .where(eq(higherInstitutions.corpsMemberId, member.id));

      const piEval = await db
        .select()
        .from(evaluations)
        .where(
          and(
            eq(evaluations.corpsMemberId, member.id),
            eq(evaluations.evaluatorRole, "platoon_instructor")
          )
        )
        .then((rows) => rows[0]);

      const mowEval = await db
        .select()
        .from(evaluations)
        .where(
          and(
            eq(evaluations.corpsMemberId, member.id),
            eq(evaluations.evaluatorRole, "man_o_war_instructor")
          )
        )
        .then((rows) => rows[0]);

      const soldierComments = await db
        .select()
        .from(comments)
        .where(eq(comments.corpsMemberId, member.id));

      const cmdComments = await db
        .select()
        .from(commandantComments)
        .where(eq(commandantComments.corpsMemberId, member.id));

      return {
        member,
        institutions,
        piEvaluation: piEval,
        mowEvaluation: mowEval,
        soldierComments,
        commandantComments: cmdComments,
      };
    }),

  // Platoon report for print
  platoonReport: staffQuery
    .input(z.object({ platoon: z.number().int().min(1).max(10) }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const user = ctx.staffUser!;
      if (
        (user.role === "platoon_instructor" || user.role === "man_o_war_instructor" || user.role === "soldier") &&
        input.platoon !== (user.assignedPlatoon || 0)
      ) {
        throw new Error("Report is outside your assigned platoon");
      }

      // Only export from active batch
      const activeBatch = await db
        .select()
        .from(batches)
        .where(eq(batches.isActive, 1))
        .then((rows) => rows[0]);

      if (!activeBatch) return [];
      if (user.role === "state_commandant" && (!user.state || activeBatch.state !== user.state)) return [];

      const members = await db
        .select()
        .from(corpsMembers)
        .where(
          user.role === "state_commandant"
            ? and(
                eq(corpsMembers.platoon, input.platoon),
                eq(corpsMembers.batchId, activeBatch.id),
                eq(corpsMembers.state, user.state as "ondo" | "lagos")
              )
            : and(
                eq(corpsMembers.platoon, input.platoon),
                eq(corpsMembers.batchId, activeBatch.id)
              )
        );

      const reportData = await Promise.all(
        members.map(async (member) => {
          const piEval = await db
            .select()
            .from(evaluations)
            .where(
              and(
                eq(evaluations.corpsMemberId, member.id),
                eq(evaluations.evaluatorRole, "platoon_instructor")
              )
            )
            .then((rows) => rows[0]);

          const mowEval = await db
            .select()
            .from(evaluations)
            .where(
              and(
                eq(evaluations.corpsMemberId, member.id),
                eq(evaluations.evaluatorRole, "man_o_war_instructor")
              )
            )
            .then((rows) => rows[0]);

          return {
            ...member,
            piScore: piEval?.overallAverage || null,
            mowScore: mowEval?.overallAverage || null,
            finalScore:
              piEval && mowEval
                ? (
                    (parseFloat(String(piEval.overallAverage)) +
                      parseFloat(String(mowEval.overallAverage))) /
                    2
                  ).toFixed(1)
                : null,
          };
        })
      );

      return reportData;
    }),
});
