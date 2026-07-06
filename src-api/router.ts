import { customAuthRouter } from "./custom-auth-router";
import { usersRouter } from "./users-router";
import { batchesRouter } from "./batches-router";
import { corpsMembersRouter } from "./corps-members-router";
import { evaluationsRouter, manOwarEvaluationsRouter } from "./evaluations-router";
import { commentsRouter } from "./comments-router";
import { statsRouter } from "./stats-router";
import { exportRouter } from "./export-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  customAuth: customAuthRouter,
  users: usersRouter,
  batches: batchesRouter,
  corpsMembers: corpsMembersRouter,
  evaluations: evaluationsRouter,
  manOwarEvaluations: manOwarEvaluationsRouter,
  comments: commentsRouter,
  stats: statsRouter,
  export: exportRouter,
});

export type AppRouter = typeof appRouter;
