import { describe, expect, it } from "vitest";
import { normalizeText, pluralQuizzes, urlKey, validateQuizInput } from "./quiz";

describe("normalizeText", () => {
  it("strips diacritics and case", () => {
    expect(normalizeText("Která SERIÁLOVÁ postava jsi?")).toBe("ktera serialova postava jsi?");
    expect(normalizeText("Jídlo")).toBe(normalizeText("jidlo"));
  });
});

describe("urlKey", () => {
  it("treats scheme, www, trailing slash, fragment and param order as the same link", () => {
    const key = urlKey("https://www.Example.com/quiz/?b=2&a=1#start");
    expect(urlKey("http://example.com/quiz?a=1&b=2")).toBe(key);
  });

  it("keeps different paths apart", () => {
    expect(urlKey("https://example.com/quiz-1")).not.toBe(urlKey("https://example.com/quiz-2"));
  });

  it("rejects non-http links", () => {
    expect(urlKey("ftp://example.com/quiz")).toBeNull();
    expect(urlKey("javascript:alert(1)")).toBeNull();
    expect(urlKey("not a url")).toBeNull();
  });
});

describe("validateQuizInput", () => {
  const valid = {
    title: "  Poznáš film podle záběru? ",
    url: "https://example.com/film",
    format: "image",
    language: "cs",
    types: ["knowledge"],
    description: "",
    topic: " Filmy ",
  };

  it("accepts a complete quiz and normalises optional fields", () => {
    const result = validateQuizInput(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Poznáš film podle záběru?");
      expect(result.value.description).toBeNull();
      expect(result.value.topic).toBe("filmy");
    }
  });

  it("requires title, link, format, at least one type and language", () => {
    const result = validateQuizInput({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(["format", "language", "title", "types", "url"]);
    }
  });

  it("accepts http and https but nothing else", () => {
    expect(validateQuizInput({ ...valid, url: "http://example.com/a" }).ok).toBe(true);
    expect(validateQuizInput({ ...valid, url: "ftp://example.com/a" }).ok).toBe(false);
    expect(validateQuizInput({ ...valid, url: "example.com/a" }).ok).toBe(false);
  });

  it("accepts German, Japanese and Chinese language codes", () => {
    for (const language of ["de", "ja", "zh"]) {
      expect(validateQuizInput({ ...valid, language })).toMatchObject({ ok: true, value: { language } });
    }
  });

  it("rejects unknown enum values", () => {
    expect(validateQuizInput({ ...valid, format: "video" }).ok).toBe(false);
    expect(validateQuizInput({ ...valid, types: ["funny"] }).ok).toBe(false);
    expect(validateQuizInput({ ...valid, language: "zz" }).ok).toBe(false);
  });
});

describe("pluralQuizzes", () => {
  it("uses Czech plural forms", () => {
    expect([0, 1, 2, 4, 5, 22].map((count) => pluralQuizzes(count))).toEqual([
      "0 kvízů",
      "1 kvíz",
      "2 kvízy",
      "4 kvízy",
      "5 kvízů",
      "22 kvízů",
    ]);
  });
});
