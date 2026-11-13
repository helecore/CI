"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { getMessages, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

const listeners = new Set<() => void>();
const initialLocale = (): Locale => "cs";

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function readLocale(): Locale {
  return document.cookie.split(";").some((entry) => entry.trim() === `${LOCALE_COOKIE}=en`) ? "en" : "cs";
}

function setLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  for (const listener of listeners) listener();
}

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, readLocale, initialLocale);
  return { locale, t: getMessages(locale) };
}

export function DocumentLocale() {
  const { locale, t } = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = location.pathname === "/spravce" ? t.adminHeading : t.brand;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.meta);
  }, [locale, t]);
  return null;
}

export function LocaleSwitch() {
  const { locale, t } = useLocale();

  return (
    <div role="group" aria-label={t.interfaceLanguage} className="inline-flex items-center gap-0.5">
      <Button type="button" variant={locale === "cs" ? "default" : "ghost"} size="xs" aria-pressed={locale === "cs"} onClick={() => setLocale("cs")}>CZ</Button>
      <span aria-hidden="true">/</span>
      <Button type="button" variant={locale === "en" ? "default" : "ghost"} size="xs" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</Button>
    </div>
  );
}
