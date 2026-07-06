import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  tinyint,
  date,
  decimal,
} from "drizzle-orm/mysql-core";

// NYSC Staff Users - username/password auth system
export const staffUsers = mysqlTable("staff_users", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", [
    "super_admin",
    "state_commandant",
    "camp_commandant",
    "platoon_instructor",
    "man_o_war_instructor",
    "soldier",
  ]).notNull(),
  assignedPlatoon: int("assigned_platoon"),
  assignedBatchId: bigint("assigned_batch_id", { mode: "number", unsigned: true }),
  state: varchar("state", { length: 50 }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type StaffUser = typeof staffUsers.$inferSelect;
export type InsertStaffUser = typeof staffUsers.$inferInsert;

// Batches - Orientation batch sessions
export const batches = mysqlTable("batches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  year: int("year").notNull(),
  state: mysqlEnum("state", ["ondo", "lagos"]).notNull(),
  description: text("description"),
  isActive: tinyint("is_active").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Batch = typeof batches.$inferSelect;
export type InsertBatch = typeof batches.$inferInsert;

// Corps Members - Registered corps members
export const corpsMembers = mysqlTable("corps_members", {
  id: serial("id").primaryKey(),
  passportPhoto: text("passport_photo"),
  surname: varchar("surname", { length: 255 }).notNull(),
  otherNames: varchar("other_names", { length: 255 }).notNull(),
  changedName: tinyint("changed_name").default(0),
  formerName: varchar("former_name", { length: 255 }),
  state: mysqlEnum("state", ["ondo", "lagos"]).notNull(),
  stateCode: varchar("state_code", { length: 50 }).notNull().unique(),
  callUpNumber: varchar("call_up_number", { length: 100 }).notNull().unique(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  stateOfOrigin: varchar("state_of_origin", { length: 100 }).notNull(),
  stateOfDeployment: mysqlEnum("state_of_deployment", ["ondo", "lagos"]).notNull(),
  qualification: varchar("qualification", { length: 100 }).notNull(),
  areaOfSpecialization: varchar("area_of_specialization", { length: 200 }).notNull(),
  platoon: int("platoon").notNull(),
  campExperienceComment: text("camp_experience_comment"),
  batchId: bigint("batch_id", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type CorpsMember = typeof corpsMembers.$inferSelect;
export type InsertCorpsMember = typeof corpsMembers.$inferInsert;

// Higher Institutions - Education history per corps member
export const higherInstitutions = mysqlTable("higher_institutions", {
  id: serial("id").primaryKey(),
  corpsMemberId: bigint("corps_member_id", { mode: "number", unsigned: true }).notNull(),
  institutionName: varchar("institution_name", { length: 255 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type HigherInstitution = typeof higherInstitutions.$inferSelect;
export type InsertHigherInstitution = typeof higherInstitutions.$inferInsert;

// Evaluations - Scores from instructors (platoon and man o war)
export const evaluations = mysqlTable("evaluations", {
  id: serial("id").primaryKey(),
  corpsMemberId: bigint("corps_member_id", { mode: "number", unsigned: true }).notNull(),
  evaluatorId: bigint("evaluator_id", { mode: "number", unsigned: true }).notNull(),
  evaluatorRole: mysqlEnum("evaluator_role", [
    "platoon_instructor",
    "man_o_war_instructor",
  ]).notNull(),
  // 8 evaluation categories, each scored 2-10 (step 2)
  leadershipInitiative: int("leadership_initiative").notNull(),
  professionalBearing: int("professional_bearing").notNull(),
  physicalFitness: int("physical_fitness").notNull(),
  communicationSkills: int("communication_skills").notNull(),
  technicalCompetence: int("technical_competence").notNull(),
  teamworkCooperation: int("teamwork_cooperation").notNull(),
  reliabilityDependability: int("reliability_dependability").notNull(),
  respectDignityRights: int("respect_dignity_rights").notNull(),
  overallAverage: decimal("overall_average", { precision: 3, scale: 1 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = typeof evaluations.$inferInsert;

// Comments - Free-text observations from soldiers
export const comments = mysqlTable("comments", {
  id: serial("id").primaryKey(),
  corpsMemberId: bigint("corps_member_id", { mode: "number", unsigned: true }).notNull(),
  soldierId: bigint("soldier_id", { mode: "number", unsigned: true }).notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// Commandant Comments - Camp commandant observations
export const commandantComments = mysqlTable("commandant_comments", {
  id: serial("id").primaryKey(),
  corpsMemberId: bigint("corps_member_id", { mode: "number", unsigned: true }).notNull(),
  commandantId: bigint("commandant_id", { mode: "number", unsigned: true }).notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type CommandantComment = typeof commandantComments.$inferSelect;
export type InsertCommandantComment = typeof commandantComments.$inferInsert;

// Audit Logs - Action history
export const auditLogs = mysqlTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  userRole: varchar("user_role", { length: 50 }),
  action: varchar("action", { length: 100 }).notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
