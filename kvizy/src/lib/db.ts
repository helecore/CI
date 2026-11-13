import "server-only";
import type { PGlite } from "@electric-sql/pglite";
import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";
import { applyMigrations, pooledDatabaseUrl, readMigrations } from "./migrate-core.mjs";

const databaseUrl = pooledDatabaseUrl();

// Next.js may load this module once per route bundle; keep one pool per process so pages and
// API routes share it (and, locally, share the same in-memory PGlite).
const store = globalThis as typeof globalThis & {
  __kvizyPool?: pg.Pool;
  __kvizyReady?: Promise<void>;
  __kvizyLocal?: Promise<PGlite>;
};

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  if (databaseUrl !== "") {
    const pool = getPool();
    store.__kvizyReady ??= migrate(pool).catch((error: unknown) => {
      store.__kvizyReady = undefined;
      throw error;
    });
    await store.__kvizyReady;
    return (await pool.query(text, params)).rows as T[];
  }
  if (process.env.VERCEL) {
    // On Vercel the in-memory fallback would silently lose every added quiz; fail visibly instead.
    throw new Error("DATABASE_URL is not set: connect the Neon database to this Vercel project and redeploy.");
  }
  store.__kvizyLocal ??= startLocal().catch((error: unknown) => {
    store.__kvizyLocal = undefined;
    throw error;
  });
  return (await (await store.__kvizyLocal).query<T>(text, params)).rows;
}

function getPool(): pg.Pool {
  if (!store.__kvizyPool) {
    // Serverless instances are short-lived: keep few connections and let idle ones go quickly.
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      max: 3,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
    });
    attachDatabasePool(pool);
    store.__kvizyPool = pool;
  }
  return store.__kvizyPool;
}

/** Normally a no-op (the build already migrated); covers a database connected after the last build. */
async function migrate(pool: pg.Pool): Promise<void> {
  const migrations = await readMigrations();
  const client = await pool.connect();
  try {
    await applyMigrations(client, migrations, console.log);
  } finally {
    client.release();
  }
}

async function startLocal(): Promise<PGlite> {
  const { PGlite } = await import("@electric-sql/pglite");
  const localPath = process.env.QUIZ_LOCAL_DB_PATH?.trim();
  const db = new PGlite(localPath || undefined);
  if (localPath) {
    try {
      await applyMigrations({
        async query(text, params) {
          if (params?.length) return db.query<Record<string, unknown>>(text, params);
          const results = await db.exec(text);
          return { rows: (results.at(-1)?.rows ?? []) as Record<string, unknown>[] };
        },
      }, await readMigrations());
      return db;
    } catch (error) {
      await db.close().catch(() => {});
      throw error;
    }
  }
  for (const migration of await readMigrations()) {
    await db.exec(migration.sql);
  }
  return db;
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}
