import type { MigrationClient } from "../src/lib/migrate-core.mjs";

export function importQuizzes(client: MigrationClient): Promise<Record<string, { inserted: number; existing: number }>>;
