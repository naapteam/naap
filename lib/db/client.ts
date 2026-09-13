import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __naapPool: Pool | undefined;
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!global.__naapPool) {
    global.__naapPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return global.__naapPool;
}

export const db = drizzle(getPool(), { schema });
export type Db = typeof db;
