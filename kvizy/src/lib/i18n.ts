import cs from "./messages/cs";
import en from "./messages/en";

export type Locale = "cs" | "en";
export const LOCALE_COOKIE = "kvizy-locale";
export const LOCALE_HEADER = "X-Kvizy-Locale";

const messages = { cs, en };

export function getMessages(locale: Locale) {
  return messages[locale];
}

export function requestLocale(request: Request): Locale {
  return request.headers.get(LOCALE_HEADER) === "en" ? "en" : "cs";
}

export function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}
