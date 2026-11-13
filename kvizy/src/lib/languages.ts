import type { Locale } from "./i18n";

// Assigned ISO 639-1 codes. ISO 639 deprecated aliases are omitted.
export const LANGUAGES = (
  "aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy " +
  "da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz " +
  "ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv " +
  "mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw " +
  "sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz " +
  "ve vi vo wa wo xh yi yo za zh zu"
).trim().split(" ");

const languageCodes = new Set(LANGUAGES);

export function isQuizLanguage(value: unknown): value is string {
  return typeof value === "string" && languageCodes.has(value);
}

const displayNames = {
  cs: new Intl.DisplayNames(["cs"], { type: "language" }),
  en: new Intl.DisplayNames(["en"], { type: "language" }),
};

export function languageName(code: string, locale: Locale) {
  const name = displayNames[locale].of(code) ?? code;
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}

export function languageBadge(code: string) {
  return code === "cs" ? "CZ" : code.toUpperCase();
}
