import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

/**
 * Opens the database once per server process and applies migrations.
 *
 * DATABASE_URL set  -> Postgres via node-postgres (production).
 * DATABASE_URL unset -> embedded Postgres (PGlite) stored in .data/pglite, so
 *                       `npm run dev` works with no setup. Not for production.
 */
export async function openDb(url = process.env.DATABASE_URL): Promise<Db> {
  if (url && url !== "memory") {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const db = drizzle(new Pool({ connectionString: url, max: 5 }), { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS });
    return db as unknown as Db;
  }
  if (process.env.NODE_ENV === "production" && url !== "memory") {
    throw new Error("DATABASE_URL is required in production.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  let client;
  if (url === "memory") client = new PGlite();
  else {
    const dir = path.join(process.cwd(), ".data", "pglite");
    await mkdir(dir, { recursive: true });
    client = new PGlite(dir);
  }
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Db;
}

const globalForDb = globalThis as unknown as { __db?: Promise<Db> };

/** The shared connection. Kept on globalThis so dev hot reloads don't open a second one. */
export function getDb(): Promise<Db> {
  // Forget a failed open so the next request tries again.
  globalForDb.__db ??= openDb().catch((error) => {
    globalForDb.__db = undefined;
    throw error;
  });
  return globalForDb.__db;
}

export { schema };
