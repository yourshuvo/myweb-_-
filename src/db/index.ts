import "server-only";

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { getServerEnv } from "@/lib/env";
import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | null | undefined;
let pool: Pool | undefined;

export function getDb() {
  if (database !== undefined) return database;
  const connectionString = getServerEnv("DATABASE_URL");
  if (!connectionString) return (database = null);
  pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 20_000 });
  database = drizzle(pool, { schema });
  return database;
}

export function requireDb() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured.");
  return db;
}
