import { z } from "zod";
import { createRouter, staffQuery, adminOrCommandantQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { corpsMembers, evaluations, comments, commandantComments, higherInstitutions, batches } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const exportRouter = createRouter({
  // Export corps members as CSV
  csv: adminOrCommandantQuery
    .input(z.object({ batchId: z.number() }).optional())
    .query(async ({ input }) => {
      const db = getDb();

      // If a specific batchId is given use it, otherwise fall back to active batch
      let targetBatch;
      if (input?.batchId) {
        targetBatch = await db
          .select()
          .from(batches)
          .where(eq(batches.id, input.batchId))
          .then((rows) => rows[0]);
      } else {
        targetBatch = await db
          .select()
          .from(batches)
          .where(eq(batches.isActive, 1))
          .then((rows) => rows[0]);
      }

      if (!targetBatch) {
        throw new Error("Batch not found or no active batch available for export");
      }

      // Export from the target batch
      const members = await db
        .select()
        .from(corpsMembers)
        .where(eq(corpsMembers.batchId, targetBatch.id));

      const rows = [];
      // Header
      rows.push([
        "Surname",
        "Other Names",
        "State Code",
        "Call-up Number",
        "Phone",
        "State of Origin",
        "Qualification",
        "Specialization",
        "Platoon",
        "PI Score",
        "MOW Score",
        "Soldier Comments",
        "Commandant Comments",
      ]);

      for (const member of members) {
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

        rows.push([
          member.surname,
          member.otherNames,
          member.stateCode,
          member.callUpNumber,
          member.phoneNumber,
          member.stateOfOrigin,
          member.qualification,
          member.areaOfSpecialization,
          String(member.platoon),
          piEval?.overallAverage || "",
          mowEval?.overallAverage || "",
          soldierComments.map((c) => c.comment).join("; "),
          cmdComments.map((c) => c.comment).join("; "),
        ]);
      }

      // Convert to CSV string
      const csv = rows
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

      return { csv, filename: `nysc-${targetBatch.name.replace(/\s+/g, "-").toLowerCase()}-${targetBatch.year}.csv` };
    }),

  // Full report for print
  fullReport: staffQuery
    .input(z.object({ corpsMemberId: z.number() }))
    .query(async ({ input }) => {
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
    .input(z.object({ platoon: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      // Only export from active batch
      const activeBatch = await db
        .select()
        .from(batches)
        .where(eq(batches.isActive, 1))
        .then((rows) => rows[0]);

      if (!activeBatch) return [];

      const members = await db
        .select()
        .from(corpsMembers)
        .where(
          and(
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
