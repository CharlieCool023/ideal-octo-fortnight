import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { authenticateStaffRequest } from "./lib/custom-auth";
import { buildMembersCsv } from "./lib/csv-export";

const ALLOWED_ROLES = ["super_admin", "camp_commandant"];

export function registerExportStreamRoute(app: Hono<{ Bindings: HttpBindings }>) {
  app.get("/api/export/csv-stream", async (c) => {
    const staffUser = await authenticateStaffRequest(c.req.raw.headers);
    if (!staffUser) {
      return c.json({ error: "Staff authentication required" }, 401);
    }
    if (!ALLOWED_ROLES.includes(staffUser.role)) {
      return c.json({ error: "Insufficient role" }, 403);
    }

    const batchIdParam = c.req.query("batchId");
    const batchId = batchIdParam ? Number(batchIdParam) : undefined;
    if (batchIdParam && Number.isNaN(batchId)) {
      return c.json({ error: "Invalid batchId" }, 400);
    }

    let result;
    try {
      result = await buildMembersCsv(batchId);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Export failed" }, 400);
    }

    const bytes = new TextEncoder().encode(result.csv);
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  });
}
