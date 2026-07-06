import { z } from "zod";
import { createRouter, instructorQuery, manOWarQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { evaluations, corpsMembers, batches } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const evaluationsRouter = createRouter({
  // Get evaluation for a corps member (by current evaluator)
  get: instructorQuery
    .input(z.object({ corpsMemberId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const evaluatorRole = ctx.staffUser!.role as "platoon_instructor" | "man_o_war_instructor";
      
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

      return db
        .select()
        .from(evaluations)
        .where(
          and(
            eq(evaluations.corpsMemberId, input.corpsMemberId),
            eq(evaluations.evaluatorRole, evaluatorRole),
            eq(evaluations.evaluatorId, ctx.staffUser!.id)
          )
        )
        .then((rows) => rows[0] || null);
    }),

  // Submit or update evaluation
  submit: instructorQuery
    .input(
      z.object({
        corpsMemberId: z.number(),
        leadershipInitiative: z.number().min(2).max(10).step(2),
        professionalBearing: z.number().min(2).max(10).step(2),
        physicalFitness: z.number().min(2).max(10).step(2),
        communicationSkills: z.number().min(2).max(10).step(2),
        technicalCompetence: z.number().min(2).max(10).step(2),
        teamworkCooperation: z.number().min(2).max(10).step(2),
        reliabilityDependability: z.number().min(2).max(10).step(2),
        respectDignityRights: z.number().min(2).max(10).step(2),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const evaluatorRole = ctx.staffUser!.role as "platoon_instructor" | "man_o_war_instructor";

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

      // Calculate overall average
      const scores = [
        input.leadershipInitiative,
        input.professionalBearing,
        input.physicalFitness,
        input.communicationSkills,
        input.technicalCompetence,
        input.teamworkCooperation,
        input.reliabilityDependability,
        input.respectDignityRights,
      ];
      const overallAverage = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

      // Check if evaluation already exists
      const existing = await db
        .select()
        .from(evaluations)
        .where(
          and(
            eq(evaluations.corpsMemberId, input.corpsMemberId),
            eq(evaluations.evaluatorRole, evaluatorRole),
            eq(evaluations.evaluatorId, ctx.staffUser!.id)
          )
        )
        .then((rows) => rows[0]);

      if (existing) {
        // Update existing
        await db
          .update(evaluations)
          .set({
            leadershipInitiative: input.leadershipInitiative,
            professionalBearing: input.professionalBearing,
            physicalFitness: input.physicalFitness,
            communicationSkills: input.communicationSkills,
            technicalCompetence: input.technicalCompetence,
            teamworkCooperation: input.teamworkCooperation,
            reliabilityDependability: input.reliabilityDependability,
            respectDignityRights: input.respectDignityRights,
            overallAverage,
          })
          .where(eq(evaluations.id, existing.id));
        return { success: true, updated: true };
      } else {
        // Create new
        await db.insert(evaluations).values({
          corpsMemberId: input.corpsMemberId,
          evaluatorId: ctx.staffUser!.id,
          evaluatorRole,
          leadershipInitiative: input.leadershipInitiative,
          professionalBearing: input.professionalBearing,
          physicalFitness: input.physicalFitness,
          communicationSkills: input.communicationSkills,
          technicalCompetence: input.technicalCompetence,
          teamworkCooperation: input.teamworkCooperation,
          reliabilityDependability: input.reliabilityDependability,
          respectDignityRights: input.respectDignityRights,
          overallAverage,
        });
        return { success: true, updated: false };
      }
    }),
});

// Re-export for man-o-war (uses same logic but different middleware role check)
export const manOwarEvaluationsRouter = createRouter({
  get: manOWarQuery
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

      return db
        .select()
        .from(evaluations)
        .where(
          and(
            eq(evaluations.corpsMemberId, input.corpsMemberId),
            eq(evaluations.evaluatorRole, "man_o_war_instructor"),
            eq(evaluations.evaluatorId, ctx.staffUser!.id)
          )
        )
        .then((rows) => rows[0] || null);
    }),

  submit: manOWarQuery
    .input(
      z.object({
        corpsMemberId: z.number(),
        leadershipInitiative: z.number().min(2).max(10).step(2),
        professionalBearing: z.number().min(2).max(10).step(2),
        physicalFitness: z.number().min(2).max(10).step(2),
        communicationSkills: z.number().min(2).max(10).step(2),
        technicalCompetence: z.number().min(2).max(10).step(2),
        teamworkCooperation: z.number().min(2).max(10).step(2),
        reliabilityDependability: z.number().min(2).max(10).step(2),
        respectDignityRights: z.number().min(2).max(10).step(2),
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

      const scores = [
        input.leadershipInitiative,
        input.professionalBearing,
        input.physicalFitness,
        input.communicationSkills,
        input.technicalCompetence,
        input.teamworkCooperation,
        input.reliabilityDependability,
        input.respectDignityRights,
      ];
      const overallAverage = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

      const existing = await db
        .select()
        .from(evaluations)
        .where(
          and(
            eq(evaluations.corpsMemberId, input.corpsMemberId),
            eq(evaluations.evaluatorRole, "man_o_war_instructor"),
            eq(evaluations.evaluatorId, ctx.staffUser!.id)
          )
        )
        .then((rows) => rows[0]);

      if (existing) {
        await db
          .update(evaluations)
          .set({
            leadershipInitiative: input.leadershipInitiative,
            professionalBearing: input.professionalBearing,
            physicalFitness: input.physicalFitness,
            communicationSkills: input.communicationSkills,
            technicalCompetence: input.technicalCompetence,
            teamworkCooperation: input.teamworkCooperation,
            reliabilityDependability: input.reliabilityDependability,
            respectDignityRights: input.respectDignityRights,
            overallAverage,
          })
          .where(eq(evaluations.id, existing.id));
        return { success: true, updated: true };
      } else {
        await db.insert(evaluations).values({
          corpsMemberId: input.corpsMemberId,
          evaluatorId: ctx.staffUser!.id,
          evaluatorRole: "man_o_war_instructor",
          leadershipInitiative: input.leadershipInitiative,
          professionalBearing: input.professionalBearing,
          physicalFitness: input.physicalFitness,
          communicationSkills: input.communicationSkills,
          technicalCompetence: input.technicalCompetence,
          teamworkCooperation: input.teamworkCooperation,
          reliabilityDependability: input.reliabilityDependability,
          respectDignityRights: input.respectDignityRights,
          overallAverage,
        });
        return { success: true, updated: false };
      }
    }),
});
