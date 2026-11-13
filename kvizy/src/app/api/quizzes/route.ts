import { getMessages, interpolate, requestLocale } from "@/lib/i18n";
import { connection } from "next/server";
import { isRateLimited, isSameOrigin, MAX_BODY_BYTES } from "@/lib/guard";
import { validateQuizInput } from "@/lib/quiz";
import { createQuiz, listQuizzes } from "@/lib/quizzes-repo";

export async function GET() {
  await connection();
  return Response.json({ quizzes: await listQuizzes() });
}

export async function POST(request: Request) {
  const locale = requestLocale(request);
  const t = getMessages(locale);
  if (!isSameOrigin(request)) {
    return Response.json({ error: "forbidden", message: t.forbidden }, { status: 403 });
  }
  if (isRateLimited(request, "create", 10, 60_000)) {
    return Response.json(
      { error: "rate_limited", message: t.createRate },
      { status: 429 },
    );
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return Response.json({ error: "too_large", message: t.formLarge }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "invalid_json", message: t.formInvalid }, { status: 400 });
  }

  const parsed = validateQuizInput(body, locale);
  if (!parsed.ok) {
    return Response.json(
      { error: "validation", message: t.validation, fields: parsed.errors },
      { status: 422 },
    );
  }

  const result = await createQuiz(parsed.value);
  if (!result.ok) {
    return Response.json(
      {
        error: "duplicate",
        message: result.duplicate
          ? interpolate(t.duplicateNamed, { title: result.duplicate.title })
          : t.duplicate,
        existing: result.duplicate,
      },
      { status: 409 },
    );
  }
  return Response.json({ quiz: result.quiz }, { status: 201 });
}
