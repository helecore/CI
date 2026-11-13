"use client";

import { useLocale } from "@/components/locale";

import { CheckIcon, ExternalLinkIcon, FlagIcon, FlameIcon, LayoutGridIcon, TagIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type Quiz } from "@/lib/quiz";
import { languageBadge, languageName } from "@/lib/languages";
import { FORMAT_ICONS, TYPE_COLORS, TYPE_ICONS } from "./quiz-meta";

type Props = {
  quiz: Quiz;
  onOpen: (quiz: Quiz) => void;
  onReport: (quiz: Quiz) => void;
  done: boolean;
  onDoneChange: (quiz: Quiz, done: boolean) => void;
  highlight?: boolean;
};

export function QuizCard({ quiz, onOpen, onReport, done, onDoneChange, highlight = false }: Props) {
  const { locale, t } = useLocale();
  const FormatIcon = FORMAT_ICONS[quiz.format];
  return (
    <Card
      data-testid="quiz-card"
      data-quiz-id={quiz.id}
      data-format={quiz.format}
      data-language={quiz.language}
      data-types={quiz.types.join(" ")}
      data-collection={quiz.isCollection}
      data-done={done}
      className={cn(
        "h-full gap-3 transition-shadow hover:shadow-md",
        done && "bg-emerald-50/50 ring-emerald-200",
        highlight && "ring-2 ring-primary",
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          {quiz.isCollection && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-950 ring-1 ring-amber-300">
              <LayoutGridIcon className="size-3.5" aria-hidden />
              {t.collection}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-violet-900 ring-1 ring-violet-200"
            title={`${t.format}: ${t.formats[quiz.format]}`}
          >
            <FormatIcon className="size-3.5" aria-hidden />
            {t.formats[quiz.format]}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-foreground ring-1 ring-border"
            title={`${t.language}: ${languageName(quiz.language, locale)}`}
          >
            <span className="font-bold tracking-wide">{languageBadge(quiz.language)}</span>
            {languageName(quiz.language, locale)}
          </span>
        </div>
        <CardTitle className="text-lg leading-snug font-bold">
          <h3>{quiz.title}</h3>
        </CardTitle>
        {quiz.description && <CardDescription className="line-clamp-3">{quiz.description}</CardDescription>}
      </CardHeader>
      <CardContent className="mt-auto flex flex-wrap gap-1.5">
        {quiz.types.map((type) => {
          const Icon = TYPE_ICONS[type];
          return (
            <span
              key={type}
              className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1", TYPE_COLORS[type])}
            >
              <Icon className="size-3.5" aria-hidden />
              {t.types[type]}
            </span>
          );
        })}
        {quiz.topic && (
          <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
            <TagIcon className="size-3" aria-hidden />
            {quiz.topic}
          </span>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        <div className="flex items-center justify-between gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium select-none">
            <input
              type="checkbox"
              checked={done}
              onChange={(e) => onDoneChange(quiz, e.target.checked)}
              className="size-4.5 cursor-pointer accent-emerald-600 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <span className={cn(done && "text-emerald-800")}>{t.markDone}</span>
            {done && <CheckIcon className="size-4 text-emerald-600" aria-hidden />}
          </label>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={t.clickCount}>
            <FlameIcon className="size-3.5 text-orange-500" aria-hidden />
            <span data-testid="click-count">{quiz.clicks}</span>{t.opened}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <a
            href={quiz.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpen(quiz)}
            className={cn(buttonVariants({ size: "lg" }), "px-4 font-semibold")}
          >
            {quiz.isCollection ? t.browse : t.open}
            <ExternalLinkIcon data-icon="inline-end" aria-hidden />
            <span className="sr-only">{t.newTab}</span>
          </a>
          <Button variant="ghost" size="icon-lg" onClick={() => onReport(quiz)} className="text-muted-foreground" aria-label={t.report} title={t.report}>
            <FlagIcon aria-hidden />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
