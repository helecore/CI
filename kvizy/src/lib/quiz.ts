import { getMessages, interpolate, type Locale } from "./i18n";
import { isQuizLanguage } from "./languages";
import { parseHttpUrl } from "./quiz-url.mjs";

export const FORMATS = ["image", "text", "mixed"] as const;
export const QUIZ_TYPES = ["personality", "preference", "knowledge", "logic"] as const;

export type QuizFormat = (typeof FORMATS)[number];
export type QuizType = (typeof QUIZ_TYPES)[number];
export type QuizLanguage = string;

export type Quiz = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  language: QuizLanguage;
  format: QuizFormat;
  types: QuizType[];
  topic: string | null;
  /** The link leads to a hub of several tests rather than to one quiz. */
  isCollection: boolean;
  source?: string | null;
  clicks: number;
  createdAt: string;
};

export type QuizInput = {
  title: string;
  url: string;
  description: string | null;
  language: QuizLanguage;
  format: QuizFormat;
  types: QuizType[];
  topic: string | null;
};

export type QuizInputErrors = Partial<Record<keyof QuizInput, string>>;

export const LIMITS = { title: 120, url: 2000, description: 300, topic: 40 } as const;

/** Lowercase and strip diacritics so "Kocka" matches "Kočka". */
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export { urlKey } from "./quiz-url.mjs";

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed === "" ? null : trimmed;
}

export function validateQuizInput(
  raw: unknown,
  locale: Locale = "cs",
): { ok: true; value: QuizInput } | { ok: false; errors: QuizInputErrors } {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: QuizInputErrors = {};
  const t = getMessages(locale);

  const title = optionalText(data.title);
  if (!title) errors.title = t.titleMissing;
  else if (title.length > LIMITS.title) errors.title = interpolate(t.titleLong, { limit: LIMITS.title });

  const urlText = typeof data.url === "string" ? data.url.trim() : "";
  if (!urlText) errors.url = t.urlMissing;
  else if (urlText.length > LIMITS.url) errors.url = t.urlLong;
  else if (!parseHttpUrl(urlText)) errors.url = t.urlInvalid;

  const format = data.format;
  if (!FORMATS.includes(format as QuizFormat)) errors.format = t.formatMissing;

  const language = data.language;
  if (!isQuizLanguage(language)) errors.language = t.languageMissing;

  const typesRaw = Array.isArray(data.types) ? data.types : [];
  const types = QUIZ_TYPES.filter((t) => typesRaw.includes(t));
  if (types.length === 0) errors.types = t.typesMissing;

  const description = optionalText(data.description);
  if (description && description.length > LIMITS.description)
    errors.description = interpolate(t.descriptionLong, { limit: LIMITS.description });

  const topicRaw = optionalText(data.topic);
  const topic = topicRaw ? topicRaw.toLowerCase() : null;
  if (topic && topic.length > LIMITS.topic) errors.topic = interpolate(t.topicLong, { limit: LIMITS.topic });

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title: title!,
      url: parseHttpUrl(urlText)!.toString(),
      description,
      language: language as QuizLanguage,
      format: format as QuizFormat,
      types,
      topic,
    },
  };
}

/** Czech plural: 1 kvíz, 2–4 kvízy, 0 and 5+ kvízů. */
export function pluralQuizzes(count: number, locale: Locale = "cs"): string {
  if (locale === "en") return `${count} ${count === 1 ? "quiz" : "quizzes"}`;
  if (count === 1) return "1 kvíz";
  if (count >= 2 && count <= 4) return `${count} kvízy`;
  return `${count} kvízů`;
}
