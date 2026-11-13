import { getMessages, requestLocale } from "@/lib/i18n";
import { isRateLimited, isSameOrigin, MAX_BODY_BYTES } from "@/lib/guard";
import { createReport } from "@/lib/quizzes-repo";
import { validateReportInput } from "@/lib/report";

export async function POST(request: Request, ctx: RouteContext<"/api/quizzes/[id]/report">) {
  const locale = requestLocale(request);
  const t = getMessages(locale);
  if (!isSameOrigin(request)) {
    return Response.json({ error: "forbidden", message: t.forbidden }, { status: 403 });
  }
  if (isRateLimited(request, "report", 10, 10 * 60_000)) {
    return Response.json(
      { error: "rate_limited", message: t.reportRate },
      { status: 429 },
    );
  }

  const { id } = await ctx.params;
  const quizId = Number(id);
  if (!Number.isSafeInteger(quizId) || quizId <= 0) {
    return Response.json({ error: "not_found", message: t.quizMissing }, { status: 404 });
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return Response.json({ error: "too_large", message: t.reportLarge }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "invalid_json", message: t.reportInvalid }, { status: 400 });
  }

  const parsed = validateReportInput(body, locale);
  if (!parsed.ok) {
    return Response.json(
      { error: "validation", message: t.validation, fields: parsed.errors },
      { status: 422 },
    );
  }

  const report = await createReport(quizId, parsed.value);
  if (!report) return Response.json({ error: "not_found", message: t.quizMissing }, { status: 404 });
  return Response.json({ ok: true }, { status: 201 });
}
