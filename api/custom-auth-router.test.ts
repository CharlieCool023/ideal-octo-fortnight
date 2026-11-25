import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffUser } from "@db/schema";
import type { TrpcContext } from "../src-api/context";
import { customAuthRouter } from "../src-api/custom-auth-router";
import { hashPassword, verifyPassword } from "../src-api/lib/custom-auth";
import { getDb } from "../src-api/queries/connection";

vi.mock("../src-api/queries/connection", () => ({
  getDb: vi.fn(),
}));

vi.mock("../src-api/lib/custom-auth", () => ({
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
  verifyPassword: vi.fn(async (password: string, hash: string) => hash === `hashed:${password}`),
}));

function createDbMock(user: StaffUser) {
  const set = vi.fn(({ passwordHash }: { passwordHash: string }) => {
    user.passwordHash = passwordHash;
    return { where: vi.fn().mockResolvedValue(undefined) };
  });
  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([user])),
      })),
    })),
    update: vi.fn(() => ({ set })),
  };
  return { db, set };
}

describe("customAuth.changePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["super_admin", "camp_commandant"] as const)(
    "updates the %s password after validating the current password",
    async (role) => {
      const user: StaffUser = {
        id: 7,
        fullName: "Test User",
        username: "test-user",
        passwordHash: "hashed:current-pass",
        role,
        assignedPlatoon: null,
        assignedBatchId: null,
        state: null,
        isActive: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const { db, set } = createDbMock(user);
      vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

      const context: TrpcContext = {
        req: new Request("http://localhost"),
        resHeaders: new Headers(),
        staffUser: user,
      };
      const caller = customAuthRouter.createCaller(context);
      const result = await caller.changePassword({
        currentPassword: "current-pass",
        newPassword: "new-password",
      });

      expect(result).toEqual({ success: true });
      expect(set).toHaveBeenCalledOnce();
      expect(hashPassword).toHaveBeenCalledWith("new-password");
      expect(user.passwordHash).toBe("hashed:new-password");
      expect(await verifyPassword("new-password", user.passwordHash)).toBe(true);
      expect(await verifyPassword("current-pass", user.passwordHash)).toBe(false);
    }
  );

  it("does not update the password when the current password is incorrect", async () => {
    const user: StaffUser = {
      id: 7,
      fullName: "Test User",
      username: "test-user",
      passwordHash: "hashed:current-pass",
      role: "super_admin",
      assignedPlatoon: null,
      assignedBatchId: null,
      state: null,
      isActive: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { db, set } = createDbMock(user);
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const caller = customAuthRouter.createCaller({
      req: new Request("http://localhost"),
      resHeaders: new Headers(),
      staffUser: user,
    });

    await expect(
      caller.changePassword({
        currentPassword: "incorrect",
        newPassword: "new-password",
      })
    ).rejects.toThrow("Current password is incorrect");
    expect(set).not.toHaveBeenCalled();
  });
});
