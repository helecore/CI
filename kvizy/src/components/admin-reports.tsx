"use client";

import { LocaleSwitch, useLocale } from "@/components/locale";
import { LOCALE_HEADER } from "@/lib/i18n";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type QuizReport } from "@/lib/report";

export function AdminReports() {
  const { locale, t } = useLocale();
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const [token, setToken] = useState("");
  const [reports, setReports] = useState<QuizReport[] | null>(null);
  const [error, setError] = useState<"adminClosed" | "adminRate" | "adminInvalid" | "adminNetwork" | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/reports", {
        headers: { [LOCALE_HEADER]: locale, Authorization: `Bearer ${token.trim()}` },
        cache: "no-store",
      });
      if (response.ok) {
        setReports(((await response.json()) as { reports: QuizReport[] }).reports);
        return;
      }
      setReports(null);
      setError(
        response.status === 404
          ? "adminClosed"
          : response.status === 429
            ? "adminRate"
            : "adminInvalid",
      );
    } catch {
      setError("adminNetwork");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-black tracking-tight text-violet-950">{t.adminHeading}</h1>
        <LocaleSwitch />
      </div>
      <form onSubmit={load} className="flex flex-col gap-2 sm:max-w-md" aria-label={t.adminSignIn}>
        <Label htmlFor="admin-token">{t.adminToken}</Label>
        <div className="flex gap-2">
          <Input
            id="admin-token"
            type="password"
            autoComplete="current-password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <Button type="submit" size="lg" disabled={loading || token.trim() === ""}>
            {loading ? t.loading : t.showReports}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t[error]}
          </p>
        )}
      </form>

      {reports && reports.length === 0 && <p className="text-muted-foreground">{t.noReports}</p>}
      {reports && reports.length > 0 && (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-border">
          <table className="w-full text-left text-sm" data-testid="admin-reports">
            <thead className="bg-muted/60 text-xs tracking-wider text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 font-semibold">{t.time}</th>
                <th className="px-3 py-2 font-semibold">{t.quiz}</th>
                <th className="px-3 py-2 font-semibold">{t.reason}</th>
                <th className="px-3 py-2 font-semibold">{t.details}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{dateFormat.format(new Date(report.createdAt))}</td>
                  <td className="px-3 py-2">
                    <a href={report.quizUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                      {report.quizTitle}
                    </a>
                    <span className="block text-xs text-muted-foreground">ID {report.quizId}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{t.reasons[report.reason]}</td>
                  <td className="px-3 py-2 break-words">{report.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
