import "server-only";
import { isUniqueViolation, sql } from "./db";
import { urlKey, type Quiz, type QuizInput } from "./quiz";
import type { QuizReport, ReportInput } from "./report";

type QuizRow = {
  id: number | string;
  title: string;
  url: string;
  description: string | null;
  language: Quiz["language"];
  format: Quiz["format"];
  types: Quiz["types"];
  topic: string | null;
  is_collection: boolean;
  source: string | null;
  clicks: number | string;
  created_at: Date | string;
};

const COLUMNS = "id, title, url, description, language, format, types, topic, is_collection, source, clicks, created_at";

function toQuiz(row: QuizRow): Quiz {
  return {
    id: Number(row.id),
    title: row.title,
    url: row.url,
    description: row.description,
    language: row.language,
    format: row.format,
    types: row.types,
    topic: row.topic,
    isCollection: row.is_collection,
    source: row.source,
    clicks: Number(row.clicks),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function listQuizzes(): Promise<Quiz[]> {
  const rows = await sql<QuizRow>(`select ${COLUMNS} from quizzes where not is_hidden order by created_at desc, id desc`);
  return rows.map(toQuiz);
}

export async function findByUrl(url: string): Promise<Quiz | null> {
  const key = urlKey(url);
  if (!key) return null;
  const rows = await sql<QuizRow>(`select ${COLUMNS} from quizzes where url_key = $1`, [key]);
  return rows[0] ? toQuiz(rows[0]) : null;
}

export type CreateResult = { ok: true; quiz: Quiz } | { ok: false; duplicate: Quiz | null };

export async function createQuiz(input: QuizInput): Promise<CreateResult> {
  const existing = await findByUrl(input.url);
  if (existing) return { ok: false, duplicate: existing };
  try {
    const rows = await sql<QuizRow>(
      `insert into quizzes (title, url, url_key, description, language, format, types, topic)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning ${COLUMNS}`,
      [input.title, input.url, urlKey(input.url), input.description, input.language, input.format, input.types, input.topic],
    );
    return { ok: true, quiz: toQuiz(rows[0]) };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, duplicate: await findByUrl(input.url) };
    throw error;
  }
}

export async function registerClick(id: number): Promise<number | null> {
  const rows = await sql<{ clicks: number | string }>(
    "update quizzes set clicks = clicks + 1 where id = $1 returning clicks",
    [id],
  );
  return rows[0] ? Number(rows[0].clicks) : null;
}

/** Stores a report; returns null when the quiz does not exist. */
export async function createReport(quizId: number, input: ReportInput): Promise<{ id: number } | null> {
  const rows = await sql<{ id: number | string }>(
    `insert into quiz_reports (quiz_id, reason, note)
     select id, $2, $3 from quizzes where id = $1
     returning id`,
    [quizId, input.reason, input.note],
  );
  return rows[0] ? { id: Number(rows[0].id) } : null;
}

type ReportRow = {
  id: number | string;
  quiz_id: number | string;
  title: string;
  url: string;
  reason: QuizReport["reason"];
  note: string | null;
  created_at: Date | string;
};

export async function listReports(limit = 500): Promise<QuizReport[]> {
  const rows = await sql<ReportRow>(
    `select r.id, r.quiz_id, q.title, q.url, r.reason, r.note, r.created_at
     from quiz_reports r join quizzes q on q.id = r.quiz_id
     order by r.created_at desc, r.id desc
     limit $1`,
    [limit],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    quizId: Number(row.quiz_id),
    quizTitle: row.title,
    quizUrl: row.url,
    reason: row.reason,
    note: row.note,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}
