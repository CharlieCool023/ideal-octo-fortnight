import { corpsMembers, evaluations, comments, commandantComments, batches } from "@db/schema";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../queries/connection";

export async function buildMembersCsv(batchId?: number) {
  const db = getDb();

  let targetBatch;
  if (batchId) {
    targetBatch = await db.select().from(batches).where(eq(batches.id, batchId)).then((r) => r[0]);
  } else {
    targetBatch = await db.select().from(batches).where(eq(batches.isActive, 1)).then((r) => r[0]);
  }

  if (!targetBatch) throw new Error("Batch not found or no active batch available for export");

  // Explicit column list — deliberately excludes passportPhoto (a large base64 blob
  // never used in the CSV) so the export doesn't drag megabytes of image data over
  // the wire for nothing.
  const members = await db
    .select({
      id: corpsMembers.id,
      surname: corpsMembers.surname,
      otherNames: corpsMembers.otherNames,
      stateCode: corpsMembers.stateCode,
      callUpNumber: corpsMembers.callUpNumber,
      phoneNumber: corpsMembers.phoneNumber,
      stateOfOrigin: corpsMembers.stateOfOrigin,
      qualification: corpsMembers.qualification,
      areaOfSpecialization: corpsMembers.areaOfSpecialization,
      platoon: corpsMembers.platoon,
    })
    .from(corpsMembers)
    .where(eq(corpsMembers.batchId, targetBatch.id));

  const memberIds = members.map((m) => m.id);

  // Bulk-fetch everything in 3 parallel queries instead of N*4 sequential
  const [bulkEvals, bulkComments, bulkCmdComments] = memberIds.length === 0
    ? [[], [], []]
    : await Promise.all([
        db.select().from(evaluations).where(inArray(evaluations.corpsMemberId, memberIds)),
        db.select().from(comments).where(inArray(comments.corpsMemberId, memberIds)),
        db.select().from(commandantComments).where(inArray(commandantComments.corpsMemberId, memberIds)),
      ]);

  // Index by memberId for O(1) lookup
  const piEvalMap = new Map<number, typeof bulkEvals[0]>();
  const mowEvalMap = new Map<number, typeof bulkEvals[0]>();
  for (const e of bulkEvals) {
    if (e.evaluatorRole === "platoon_instructor") piEvalMap.set(e.corpsMemberId, e);
    if (e.evaluatorRole === "man_o_war_instructor") mowEvalMap.set(e.corpsMemberId, e);
  }
  const commentsMap = new Map<number, string[]>();
  for (const c of bulkComments) {
    if (!commentsMap.has(c.corpsMemberId)) commentsMap.set(c.corpsMemberId, []);
    commentsMap.get(c.corpsMemberId)!.push(c.comment);
  }
  const cmdCommentsMap = new Map<number, string[]>();
  for (const c of bulkCmdComments) {
    if (!cmdCommentsMap.has(c.corpsMemberId)) cmdCommentsMap.set(c.corpsMemberId, []);
    cmdCommentsMap.get(c.corpsMemberId)!.push(c.comment);
  }

  const rows: string[][] = [[
    "Surname", "Other Names", "State Code", "Call-up Number", "Phone",
    "State of Origin", "Qualification", "Specialization", "Platoon",
    "PI Score", "MOW Score", "Soldier Comments", "Commandant Comments",
  ]];

  for (const member of members) {
    rows.push([
      member.surname,
      member.otherNames,
      member.stateCode,
      member.callUpNumber,
      member.phoneNumber ?? "",
      member.stateOfOrigin,
      member.qualification,
      member.areaOfSpecialization ?? "",
      String(member.platoon),
      String(piEvalMap.get(member.id)?.overallAverage ?? ""),
      String(mowEvalMap.get(member.id)?.overallAverage ?? ""),
      (commentsMap.get(member.id) ?? []).join("; "),
      (cmdCommentsMap.get(member.id) ?? []).join("; "),
    ]);
  }

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  return { csv, filename: `nysc-${targetBatch.name.replace(/\s+/g, "-").toLowerCase()}-${targetBatch.year}.csv` };
}
