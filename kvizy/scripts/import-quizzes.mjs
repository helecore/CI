import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { applyMigrations, readMigrations } from "../src/lib/migrate-core.mjs";
import { parseHttpUrl, urlKey } from "../src/lib/quiz-url.mjs";

const manifest = new URL("../data/individual-quizzes.json", import.meta.url);
const allowedFormats = new Set(["text", "image", "mixed"]);
const allowedTypes = new Set(["personality", "preference", "knowledge", "logic"]);
const lock = 7272742;

export async function readImportQuizzes() {
  const rows = JSON.parse(await readFile(manifest, "utf8"));
  const seen = new Set();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("The quiz manifest is empty.");

  return rows.map((row) => {
    const url = typeof row.url === "string" ? parseHttpUrl(row.url) : null;
    if (
      !url || url.username || url.password || url.pathname === "/" ||
      typeof row.title !== "string" || !row.title.trim() || row.title.length > 120 ||
      typeof row.source !== "string" || !row.source.trim() ||
      typeof row.description !== "string" || !row.description.trim() || row.description.length > 300 ||
      typeof row.language !== "string" || !/^[a-z]{2}$/.test(row.language) ||
      !allowedFormats.has(row.format) || !Array.isArray(row.types) || !row.types.length ||
      !row.types.every((type) => allowedTypes.has(type)) ||
      (row.topic != null && (typeof row.topic !== "string" || row.topic.length > 40))
    ) {
      throw new Error("Invalid quiz manifest entry.");
    }
    const key = urlKey(row.url);
    if (seen.has(key)) throw new Error(`Duplicate URL in quiz manifest: ${key}`);
    seen.add(key);
    return { ...row, url: url.href, key };
  });
}

export async function importQuizzes(client) {
  const quizzes = await readImportQuizzes();
  const counts = new Map();
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock($1)", [lock]);
    for (const quiz of quizzes) {
      const { rows } = await client.query(
        `insert into quizzes (title, url, url_key, description, source, language, format, types, topic, verified)
         values ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9, true)
         on conflict (url_key) do nothing
         returning id`,
        [quiz.title, quiz.url, quiz.key, quiz.description, quiz.source, quiz.language, quiz.format, quiz.types, quiz.topic ?? null],
      );
      if (rows.length === 0) {
        await client.query(
          "update quizzes set source = coalesce(source, $2), language = $3 where url_key = $1 and (source is null or language <> $3)",
          [quiz.key, quiz.source, quiz.language],
        );
      }
      const group = `${quiz.source} (${quiz.language})`;
      const count = counts.get(group) ?? { inserted: 0, existing: 0 };
      if (rows.length > 0) count.inserted++;
      else count.existing++;
      counts.set(group, count);
    }

    if (quizzes.some((quiz) => quiz.source === "IDRlabs")) {
      await client.query("update quizzes set is_hidden = true where url_key = 'idrlabs.com' and is_collection and not is_hidden");
      await client.query("update quizzes set source = 'IDRlabs' where url_key = 'idrlabs.com/hogwarts-house/test.php' and source is null");
    }
    await client.query("commit");
    return Object.fromEntries(counts);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

async function main() {
  const databaseUrl = process.env.QUIZ_IMPORT_DATABASE_URL?.trim();
  const localPath = process.env.QUIZ_LOCAL_DB_PATH?.trim();
  if (databaseUrl && localPath) throw new Error("Choose either Postgres or a local database directory.");

  if (databaseUrl) {
    const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 15_000 });
    await client.connect();
    try {
      await applyMigrations(client, await readMigrations());
      console.table(await importQuizzes(client));
    } finally {
      await client.end();
    }
    return;
  }

  const db = new PGlite(localPath || ".quiz-import-db");
  try {
    const client = {
      async query(text, params) {
        if (params?.length) return db.query(text, params);
        const results = await db.exec(text);
        return results.at(-1) ?? { rows: [] };
      },
    };
    await applyMigrations(client, await readMigrations());
    console.table(await importQuizzes(client));
  } finally {
    await db.close();
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(() => {
    console.error("Quiz import failed. Check the manifest and database connection.");
    process.exitCode = 1;
  });
}
