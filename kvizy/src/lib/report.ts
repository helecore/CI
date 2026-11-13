import { getMessages, interpolate, type Locale } from "./i18n";

export const REPORT_REASONS = ["broken_link", "wrong_category", "inappropriate", "duplicate", "other"] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_LIMITS = { note: 500, otherNoteMin: 5 } as const;

export type ReportInput = { reason: ReportReason; note: string | null };

export type ReportInputErrors = Partial<Record<keyof ReportInput, string>>;

export type QuizReport = {
  id: number;
  quizId: number;
  quizTitle: string;
  quizUrl: string;
  reason: ReportReason;
  note: string | null;
  createdAt: string;
};

export function validateReportInput(
  raw: unknown,
  locale: Locale = "cs",
): { ok: true; value: ReportInput } | { ok: false; errors: ReportInputErrors } {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: ReportInputErrors = {};
  const t = getMessages(locale);

  const reason = data.reason;
  if (!REPORT_REASONS.includes(reason as ReportReason)) errors.reason = t.reasonMissing;

  const note = typeof data.note === "string" ? data.note.trim().replace(/\s+/g, " ") : "";
  if (note.length > REPORT_LIMITS.note) errors.note = interpolate(t.noteLong, { limit: REPORT_LIMITS.note });
  else if (reason === "other" && note.length < REPORT_LIMITS.otherNoteMin)
    errors.note = t.noteMissing;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { reason: reason as ReportReason, note: note === "" ? null : note } };
}
