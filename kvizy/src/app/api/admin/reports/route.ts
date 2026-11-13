import { getMessages, requestLocale } from "@/lib/i18n";
import { adminAccess } from "@/lib/admin";
import { isRateLimited } from "@/lib/guard";
import { listReports } from "@/lib/quizzes-repo";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const locale = requestLocale(request);
  const t = getMessages(locale);
  const access = adminAccess(request);
  if (access === "closed") return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  if (isRateLimited(request, "admin", 20, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  }
  if (access === "denied") {
    return Response.json(
      { error: "unauthorized", message: t.adminInvalid },
      { status: 401, headers: { ...NO_STORE, "WWW-Authenticate": "Bearer" } },
    );
  }
  return Response.json({ reports: await listReports() }, { headers: NO_STORE });
}
