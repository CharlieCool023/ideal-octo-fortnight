import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  if (!instance) {
    const pool = mysql.createPool({
      uri: env.databaseUrl,
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 5,      // conservative for 1GB RAM
      queueLimit: 50,          // queue requests rather than reject under load
      idleTimeout: 60000,      // release idle connections after 60s
    });
    instance = drizzle(pool, { schema: fullSchema, mode: "default" }) as unknown as ReturnType<typeof drizzle>;
  }
  return instance;
}
