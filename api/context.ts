import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { StaffUser } from "@db/schema";
import { authenticateStaffRequest } from "./lib/custom-auth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  staffUser?: StaffUser | null;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  // Try custom staff auth first
  try {
    ctx.staffUser = await authenticateStaffRequest(opts.req.headers);
  } catch {
    // Staff auth is optional
  }

  return ctx;
}
