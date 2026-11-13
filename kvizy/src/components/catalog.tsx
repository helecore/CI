"use client";

import { LocaleSwitch, useLocale } from "@/components/locale";

import { useMemo, useState } from "react";
import { EyeIcon, FlameIcon, PlusIcon, RotateCcwIcon, SearchIcon, SparklesIcon, XIcon } from "lucide-react";
import { AddQuizDialog } from "@/components/add-quiz-dialog";
import { FilterChip, FilterGroup } from "@/components/filter-chip";
import { HeroIllustration } from "@/components/hero-illustration";
import { QuizCard } from "@/components/quiz-card";
import { FORMAT_ICONS, TYPE_ICONS } from "@/components/quiz-meta";
import { ReportQuizDialog } from "@/components/report-quiz-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { languageBadge, languageName } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { useDoneQuizzes } from "@/lib/done-store";
import {
  EMPTY_FILTERS,
  filterQuizzes,
  hasActiveFilters,
  popularQuizzes,
  toggleValue,
  withoutDone,
  type Filters,
} from "@/lib/filter";
import {
  FORMATS,
  pluralQuizzes,
  QUIZ_TYPES,
  type Quiz,
} from "@/lib/quiz";

export function Catalog({ initialQuizzes }: { initialQuizzes: Quiz[] }) {
  const { locale, t } = useLocale();
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [hideDone, setHideDone] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<number | null>(null);
  const [reportQuiz, setReportQuiz] = useState<Quiz | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const { done, setDone } = useDoneQuizzes();

  const languages = useMemo(() => [...new Set(quizzes.map((quiz) => quiz.language))].sort((a, b) =>
    languageName(a, locale).localeCompare(languageName(b, locale), locale),
  ), [quizzes, locale]);

  const matching = useMemo(() => filterQuizzes(quizzes, filters), [quizzes, filters]);
  const results = useMemo(() => withoutDone(matching, done, hideDone), [matching, done, hideDone]);
  const popular = useMemo(() => popularQuizzes(withoutDone(quizzes, done, hideDone)), [quizzes, done, hideDone]);
  const active = hasActiveFilters(filters);
  const hiddenDone = matching.length - results.length;

  function openQuiz(quiz: Quiz) {
    setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? { ...q, clicks: q.clicks + 1 } : q)));
    fetch(`/api/quizzes/${quiz.id}/click`, { method: "POST", keepalive: true })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { clicks: number } | null) => {
        if (data) setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? { ...q, clicks: data.clicks } : q)));
      })
      .catch(() => {});
  }

  function openReport(quiz: Quiz) {
    setReportQuiz(quiz);
    setReportOpen(true);
  }

  function handleCreated(quiz: Quiz) {
    setQuizzes((prev) => [quiz, ...prev.filter((q) => q.id !== quiz.id)]);
    setFilters(EMPTY_FILTERS);
    setLastAddedId(quiz.id);
  }

  const cardProps = {
    onOpen: openQuiz,
    onReport: openReport,
    onDoneChange: (quiz: Quiz, value: boolean) => setDone(quiz.id, value),
  };

  return (
    <>
      <header className="border-b border-violet-200/70 bg-lavender text-violet-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight sm:text-xl">
              <span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white shadow-sm">
                <SparklesIcon className="size-5" aria-hidden />
              </span>
              {t.brand}
            </p>
            <div className="flex items-center gap-2">
              <LocaleSwitch />
              <Button size="lg" onClick={() => setAddOpen(true)} className="h-10 px-4 font-semibold shadow-sm">
                <PlusIcon data-icon="inline-start" aria-hidden />
                {t.add}
              </Button>
            </div>
          </div>

          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
            <div className="flex flex-col gap-4">
              <h1 className="text-3xl font-black tracking-tight text-balance sm:text-5xl">
                <label htmlFor="search">{t.search}</label>
              </h1>
              <p className="max-w-xl text-base text-violet-900/80 sm:text-lg">
                {t.intro}
              </p>
              <div className="relative max-w-2xl">
                <SearchIcon className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-violet-700/70" aria-hidden />
                <Input
                  id="search"
                  type="search"
                  value={filters.query}
                  onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                  placeholder={t.searchPlaceholder}
                  className="h-14 rounded-2xl border-violet-200 bg-white pr-12 pl-12 text-base text-foreground shadow-sm focus-visible:border-violet-400 md:text-lg"
                />
                {filters.query && (
                  <button
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, query: "" }))}
                    className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                    aria-label={t.clearSearch}
                  >
                    <XIcon className="size-4" />
                  </button>
                )}
              </div>
            </div>
            <HeroIllustration className="hidden md:block lg:mr-6" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        <section
          aria-label={t.filters}
          className="grid items-start gap-5 rounded-2xl bg-card p-4 ring-1 ring-border sm:p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] lg:gap-8"
        >
          <FilterGroup title={t.format}>
            {FORMATS.map((format) => (
              <FilterChip
                key={format}
                label={t.formats[format]}
                icon={FORMAT_ICONS[format]}
                pressed={filters.formats.includes(format)}
                onToggle={() => setFilters((f) => ({ ...f, formats: toggleValue(f.formats, format) }))}
              />
            ))}
          </FilterGroup>
          <FilterGroup title={t.quizType}>
            {QUIZ_TYPES.map((type) => (
              <FilterChip
                key={type}
                label={t.types[type]}
                icon={TYPE_ICONS[type]}
                pressed={filters.types.includes(type)}
                onToggle={() => setFilters((f) => ({ ...f, types: toggleValue(f.types, type) }))}
              />
            ))}
          </FilterGroup>
          <FilterGroup title={t.language}>
            {languages.map((language) => (
              <FilterChip
                key={language}
                label={languageName(language, locale)}
                code={languageBadge(language)}
                pressed={filters.languages.includes(language)}
                onToggle={() => setFilters((f) => ({ ...f, languages: toggleValue(f.languages, language) }))}
              />
            ))}
          </FilterGroup>
        </section>

        {!active && popular.length > 0 && (
          <section aria-labelledby="popular-heading" className="flex flex-col gap-4">
            <h2 id="popular-heading" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <FlameIcon className="size-6 text-orange-500" aria-hidden />
              {t.popular}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="popular-list">
              {popular.map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} done={done.has(quiz.id)} {...cardProps} />
              ))}
            </div>
          </section>
        )}
        {!active && popular.length === 0 && (
          <section aria-labelledby="popular-heading" className="flex flex-col gap-2">
            <h2 id="popular-heading" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <FlameIcon className="size-6 text-orange-500" aria-hidden />
              {t.popular}
            </h2>
            <p className="text-muted-foreground">{t.noPopular}</p>
          </section>
        )}

        <section aria-labelledby="results-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 id="results-heading" className="text-2xl font-extrabold tracking-tight">
                {active ? t.results : t.all}{" "}
                <span className="text-base font-semibold text-muted-foreground" data-testid="result-count" aria-live="polite">
                  {active ? `${t.found} ${pluralQuizzes(results.length, locale)}` : pluralQuizzes(results.length, locale)}
                </span>
              </h2>
              <HideDoneSwitch checked={hideDone} onChange={setHideDone} doneCount={done.size} />
            </div>
            {active && (
              <Button variant="outline" size="lg" onClick={() => setFilters(EMPTY_FILTERS)}>
                <RotateCcwIcon data-icon="inline-start" aria-hidden />
                {t.clearFilters}
              </Button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border px-6 py-12 text-center">
              <p className="text-lg font-bold">{t.nothing}</p>
              {hiddenDone > 0 ? (
                <>
                  <p className="text-muted-foreground" data-testid="empty-message">
                    {t.allDone}
                  </p>
                  <Button variant="outline" onClick={() => setHideDone(false)}>
                    <EyeIcon data-icon="inline-start" aria-hidden />
                    {t.showDone}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground" data-testid="empty-message">
                    {t.noMatch}
                  </p>
                  <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
                    {t.clearFilters}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="results-list">
              {results.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  done={done.has(quiz.id)}
                  highlight={quiz.id === lastAddedId}
                  {...cardProps}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        {t.footer}
      </footer>

      <AddQuizDialog open={addOpen} onOpenChange={setAddOpen} quizzes={quizzes} onCreated={handleCreated} />
      <ReportQuizDialog quiz={reportQuiz} open={reportOpen} onOpenChange={setReportOpen} />
    </>
  );
}

function HideDoneSwitch({
  checked,
  onChange,
  doneCount,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  doneCount: number;
}) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card pr-3.5 pl-1.5 text-sm font-medium outline-none hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-4",
          )}
        />
      </span>
      {t.hideDone}
      <span className="text-muted-foreground tabular-nums" data-testid="done-count">
        ({doneCount})
      </span>
    </button>
  );
}
