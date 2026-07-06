import { relations } from "drizzle-orm";
import {
  staffUsers,
  batches,
  corpsMembers,
  higherInstitutions,
  evaluations,
  comments,
  commandantComments,
} from "./schema";

export const batchRelations = relations(batches, ({ many }) => ({
  corpsMembers: many(corpsMembers),
  staffUsers: many(staffUsers),
}));

export const corpsMemberRelations = relations(corpsMembers, ({ one, many }) => ({
  batch: one(batches, {
    fields: [corpsMembers.batchId],
    references: [batches.id],
  }),
  higherInstitutions: many(higherInstitutions),
  evaluations: many(evaluations),
  comments: many(comments),
  commandantComments: many(commandantComments),
}));

export const higherInstitutionRelations = relations(higherInstitutions, ({ one }) => ({
  corpsMember: one(corpsMembers, {
    fields: [higherInstitutions.corpsMemberId],
    references: [corpsMembers.id],
  }),
}));

export const evaluationRelations = relations(evaluations, ({ one }) => ({
  corpsMember: one(corpsMembers, {
    fields: [evaluations.corpsMemberId],
    references: [corpsMembers.id],
  }),
}));

export const commentRelations = relations(comments, ({ one }) => ({
  corpsMember: one(corpsMembers, {
    fields: [comments.corpsMemberId],
    references: [corpsMembers.id],
  }),
}));

export const commandantCommentRelations = relations(commandantComments, ({ one }) => ({
  corpsMember: one(corpsMembers, {
    fields: [commandantComments.corpsMemberId],
    references: [corpsMembers.id],
  }),
}));

export const staffUserRelations = relations(staffUsers, ({ one }) => ({
  assignedBatch: one(batches, {
    fields: [staffUsers.assignedBatchId],
    references: [batches.id],
  }),
}));
