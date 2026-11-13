import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { cards, search, stubExternalSites } from "./helpers";

type Seed = { title: string; url: string; is_collection?: boolean };

const REQUESTED_LINKS = [
  "https://www.idrlabs.com/hogwarts-house/test.php",
  "https://mytype.fyi/type",
  "https://programs.clearerthinking.org/who_attracts_you_study.html",
  "https://www.16personalities.com/",
  "https://9axes.github.io/",
];

const seeds = JSON.parse(readFileSync("data/seed-quizzes.json", "utf8")) as Seed[];

test.beforeEach(async ({ context, baseURL }) => {
  await stubExternalSites(context, baseURL!);
});

for (const link of REQUESTED_LINKS) {
  test(`odkaz ${link} je v katalogu jednou a dá se dohledat`, async ({ page, request }) => {
    const seed = seeds.find((s) => s.url === link);
    expect(seed, "seed entry").toBeTruthy();
    const { quizzes } = await (await request.get("/api/quizzes")).json();
    const matches = quizzes.filter((q: { url: string }) => q.url === link);
    expect(matches).toHaveLength(1);

    await page.goto("/");
    await search(page, seed!.title);
    const card = cards(page).and(page.locator(`[data-quiz-id="${matches[0].id}"]`));
    await expect(card).toBeVisible();
    const action = card.getByRole("link", { name: seed!.is_collection ? /Prohlédnout testy/ : /Otevřít kvíz/ });
    await expect(action).toHaveAttribute("href", link);
    if (seed!.is_collection) {
      await expect(card).toHaveAttribute("data-collection", "true");
      await expect(card).toContainText("Výběr testů");
    } else {
      await expect(card).not.toContainText("Výběr testů");
    }
  });
}

test("IDRlabs má jednotlivé testy a jazykové verze, obecná karta je skrytá", async ({ page, request }) => {
  const { quizzes } = await (await request.get("/api/quizzes")).json();
  const matches = quizzes.filter((q: { source?: string }) => q.source === "IDRlabs");
  expect(matches).toHaveLength(15);
  expect(quizzes.some((q: { url: string }) => q.url === "https://www.idrlabs.com/")).toBe(false);
  await page.goto("/");
  await search(page, "Gumball Character Test");
  await expect(cards(page).getByRole("link", { name: /Otevřít kvíz/ })).toHaveAttribute(
    "href", "https://www.idrlabs.com/gumball-character/test.php",
  );
});

for (const [label, code, expected] of [["Japonština", "ja", 7], ["Čínština", "zh", 8]] as const) {
  test(`filtr ${label} zobrazí jen kvízy v daném jazyce`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("region", { name: "Filtry" }).getByRole("button", { name: label, exact: true }).click();
    await expect(cards(page)).toHaveCount(expected);
    await expect(page.locator(`[data-testid="results-list"] [data-language="${code}"]`)).toHaveCount(expected);
  });
}
