"use client";

import { LocaleSwitch, useLocale } from "@/components/locale";

import { useMemo, useState } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceGroup, ChoiceOption, Field } from "@/components/form-fields";
import {
  FORMATS,
  LIMITS,
  normalizeText,
  QUIZ_TYPES,
  urlKey,
  validateQuizInput,
  type Quiz,
  type QuizInputErrors,
  type QuizType,
} from "@/lib/quiz";
import { LOCALE_HEADER, interpolate } from "@/lib/i18n";
import { LANGUAGES, languageName } from "@/lib/languages";
import { toggleValue } from "@/lib/filter";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizzes: Quiz[];
  onCreated: (quiz: Quiz) => void;
};

const EMPTY_FORM = {
  title: "",
  url: "",
  description: "",
  topic: "",
  format: "",
  language: "",
  types: [] as QuizType[],
};

export function AddQuizDialog({ open, onOpenChange, quizzes, onCreated }: Props) {
  const { locale, t } = useLocale();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setErrors] = useState<QuizInputErrors>({});
  const [languageQuery, setLanguageQuery] = useState("");
  const languageOptions = useMemo(() => LANGUAGES.map((code) => ({
    code, label: languageName(code, locale),
  })).sort((a, b) => a.label.localeCompare(b.label, locale)), [locale]);
  const query = normalizeText(languageQuery);
  const visibleLanguages = languageOptions.filter(({ code, label }) =>
    code.includes(query) ||
    normalizeText(label).includes(query) ||
    normalizeText(languageName(code, locale === "cs" ? "en" : "cs")).includes(query),
  );
  const [serverError, setServerError] = useState<{ key: keyof Pick<typeof t, "createRate" | "forbidden" | "formLarge" | "formInvalid" | "validation" | "saveError" | "saveNetwork"> } | { duplicateTitle: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const duplicate = useMemo(() => {
    const key = urlKey(form.url);
    if (!key) return null;
    return quizzes.find((q) => urlKey(q.url) === key) ?? null;
  }, [form.url, quizzes]);

  const validation = validateQuizInput(form, locale);
  const errors: QuizInputErrors = { ...fieldErrors };
  if (!validation.ok) {
    for (const field of Object.keys(errors) as (keyof QuizInputErrors)[]) {
      if (errors[field]) errors[field] = validation.errors[field] ?? errors[field];
    }
  }
  if (serverError && "duplicateTitle" in serverError) {
    errors.url = serverError.duplicateTitle
      ? interpolate(t.duplicateNamed, { title: serverError.duplicateTitle })
      : t.duplicate;
  }

  function update<K extends keyof typeof EMPTY_FORM>(field: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError(null);
  }

  function reset() {
    setForm(EMPTY_FORM);
    setLanguageQuery("");
    setErrors({});
    setServerError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = validateQuizInput(form, locale);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    if (duplicate) {
      setServerError({ duplicateTitle: duplicate.title });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json", [LOCALE_HEADER]: locale },
        body: JSON.stringify(parsed.value),
      });
      const data = await response.json();
      if (response.status === 201) {
        onCreated(data.quiz as Quiz);
        toast.success(t.saved, { description: interpolate(t.savedDescription, { title: data.quiz.title }) });
        reset();
        onOpenChange(false);
        return;
      }
      if (response.status === 409) {
        setServerError({ duplicateTitle: data.existing?.title ?? null });
        return;
      }
      if (response.status === 422) setErrors(data.fields ?? {});
      const messages = {
        400: "formInvalid", 403: "forbidden", 413: "formLarge", 422: "validation", 429: "createRate",
      } as const;
      setServerError({ key: messages[response.status as keyof typeof messages] ?? "saveError" });
    } catch {
      setServerError({ key: "saveNetwork" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
            <DialogTitle className="text-xl font-bold">{t.add}</DialogTitle>
            <LocaleSwitch />
          </div>
          <DialogDescription>{t.addDescription}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label={t.add}>
          <Field id="quiz-title" label={t.titleField} error={errors.title}>
            <Input
              id="quiz-title"
              value={form.title}
              maxLength={LIMITS.title}
              onChange={(e) => update("title", e.target.value)}
              aria-invalid={!!errors.title}
              placeholder={t.titlePlaceholder}
            />
          </Field>

          <Field id="quiz-url" label={t.urlField} error={errors.url}>
            <Input
              id="quiz-url"
              type="url"
              inputMode="url"
              value={form.url}
              onChange={(e) => update("url", e.target.value)}
              aria-invalid={!!errors.url}
              placeholder="https://…"
            />
            {duplicate && !errors.url && (
              <p role="status" className="flex items-start gap-1.5 text-sm text-amber-700">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                {interpolate(t.duplicateNamed, { title: duplicate.title })}
              </p>
            )}
          </Field>

          <ChoiceGroup legend={t.formatField} error={errors.format}>
            {FORMATS.map((format) => (
              <ChoiceOption
                key={format}
                type="radio"
                name="format"
                label={t.formats[format]}
                checked={form.format === format}
                onChange={() => update("format", format)}
              />
            ))}
          </ChoiceGroup>

          <ChoiceGroup legend={t.typesField} error={errors.types}>
            {QUIZ_TYPES.map((type) => (
              <ChoiceOption
                key={type}
                type="checkbox"
                name="types"
                label={t.types[type]}
                checked={form.types.includes(type)}
                onChange={() => update("types", toggleValue(form.types, type))}
              />
            ))}
          </ChoiceGroup>

          <Field id="quiz-language-search" label={t.languageField} error={errors.language}>
            <Input
              id="quiz-language-search"
              type="search"
              value={languageQuery}
              onChange={(event) => setLanguageQuery(event.target.value)}
              placeholder={t.findLanguage}
              aria-invalid={!!errors.language}
            />
            <select
              aria-label={t.language}
              aria-invalid={!!errors.language}
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={form.language}
              onChange={(event) => {
                update("language", event.target.value);
                setLanguageQuery("");
              }}
            >
              <option value="" disabled>{t.languageMissing}</option>
              {visibleLanguages.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
              {form.language && !visibleLanguages.some(({ code }) => code === form.language) && (
                <option value={form.language}>{languageName(form.language, locale)}</option>
              )}
            </select>
            {visibleLanguages.length === 0 && <p role="status" className="text-sm text-muted-foreground">{t.noLanguage}</p>}
          </Field>

          <Field id="quiz-topic" label={t.topicField} error={errors.topic}>
            <Input
              id="quiz-topic"
              value={form.topic}
              maxLength={LIMITS.topic}
              onChange={(e) => update("topic", e.target.value)}
              placeholder={t.topicPlaceholder}
            />
          </Field>

          <Field id="quiz-description" label={t.descriptionField} error={errors.description}>
            <Textarea
              id="quiz-description"
              value={form.description}
              maxLength={LIMITS.description}
              onChange={(e) => update("description", e.target.value)}
              rows={2}
              placeholder={t.descriptionPlaceholder}
            />
          </Field>

          {serverError && "key" in serverError && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t[serverError.key]}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="lg" onClick={() => { reset(); onOpenChange(false); }}>
              {t.cancel}
            </Button>
            <Button type="submit" size="lg" disabled={submitting} className="font-semibold">
              {submitting ? t.saving : t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
