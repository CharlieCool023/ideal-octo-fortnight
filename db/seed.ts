import { getDb } from "../api/queries/connection";
import { staffUsers, batches } from "./schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../api/lib/custom-auth";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // Create a sample batch first so seeded staff can be assigned to it.
  const existingBatch = await db
    .select()
    .from(batches)
    .then((rows) => rows[0]);

  if (!existingBatch) {
    await db.insert(batches).values({
      name: "Batch A 2025",
      year: 2025,
      state: "ondo",
      description: "First orientation batch for 2025",
      isActive: 1,
    });
    console.log("Sample batch created");
  }

  const activeBatch = await db
    .select()
    .from(batches)
    .where(eq(batches.name, "Batch A 2025"))
    .then((rows) => rows[0]);

  const defaultPasswordHash = await hashPassword("admin123");
  const defaultUsers: Array<typeof staffUsers.$inferInsert> = [
    {
      fullName: "Super Administrator",
      username: "superadmin",
      passwordHash: defaultPasswordHash,
      role: "super_admin",
      isActive: 1,
    },
    {
      fullName: "State Commandant",
      username: "statecommandant",
      passwordHash: defaultPasswordHash,
      role: "state_commandant",
      state: "ondo",
      isActive: 1,
    },
    {
      fullName: "Camp Commandant",
      username: "campcommandant",
      passwordHash: defaultPasswordHash,
      role: "camp_commandant",
      assignedBatchId: activeBatch?.id,
      state: "ondo",
      isActive: 1,
    },
    {
      fullName: "Platoon Instructor",
      username: "platoon",
      passwordHash: defaultPasswordHash,
      role: "platoon_instructor",
      assignedPlatoon: 1,
      assignedBatchId: activeBatch?.id,
      state: "ondo",
      isActive: 1,
    },
    {
      fullName: "Man O'War Instructor",
      username: "manowar",
      passwordHash: defaultPasswordHash,
      role: "man_o_war_instructor",
      assignedPlatoon: 1,
      assignedBatchId: activeBatch?.id,
      state: "ondo",
      isActive: 1,
    },
    {
      fullName: "Soldier",
      username: "soldier",
      passwordHash: defaultPasswordHash,
      role: "soldier",
      assignedPlatoon: 1,
      assignedBatchId: activeBatch?.id,
      state: "ondo",
      isActive: 1,
    },
  ];

  for (const user of defaultUsers) {
    const existingUser = await db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.username, user.username))
      .then((rows) => rows[0]);

    if (!existingUser) {
      await db.insert(staffUsers).values(user);
      console.log(`Staff user created: ${user.username} / admin123`);
    }
  }

  console.log("Seeding complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
