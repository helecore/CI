import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { E2E_ADMIN_TOKEN } from "./e2e/helpers";

const PORT = Number(process.env.E2E_PORT ?? 4388);
const e2eDatabaseUrl = process.env.E2E_DATABASE_URL ?? "";
const localDatabase = e2eDatabaseUrl ? "" : path.join(tmpdir(), `kvizy-e2e-${randomUUID()}`);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "cs-CZ",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Run against a fresh local database, or an explicitly supplied empty test Postgres.
    command: `npm run build && npm run import:quizzes && npx next start --port ${PORT} --hostname 127.0.0.1`,
    url: baseURL,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: e2eDatabaseUrl,
      DATABASE_URL_UNPOOLED: e2eDatabaseUrl,
      QUIZ_IMPORT_DATABASE_URL: e2eDatabaseUrl,
      QUIZ_LOCAL_DB_PATH: localDatabase,
      POSTGRES_URL: "",
      POSTGRES_URL_NON_POOLING: "",
      KVIZY_ADMIN_TOKEN: E2E_ADMIN_TOKEN,
    },
  },
});
