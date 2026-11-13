import { expect, firefox, test } from "@playwright/test";
import { cards, expectCount, filterButton, search, stubExternalSites, uniqueSuffix } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => {
  await stubExternalSites(context, baseURL!);
});

test("domovská stránka má hledání, Přidat kvíz, Populární kvízy a reálný katalog v CZ i EN", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByLabel("Najdi kvíz pro svou partu")).toBeVisible();
  await expect(page.getByRole("button", { name: "Přidat kvíz" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Populární kvízy" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Obrázkové kvízy/ })).toHaveCount(0);
  await expect(filterButton(page, "Obrázkový")).toBeVisible();

  const { quizzes } = await (await request.get("/api/quizzes")).json();
  const cs = quizzes.filter((q: { language: string }) => q.language === "cs").length;
  const en = quizzes.filter((q: { language: string }) => q.language === "en").length;
  expect(cs).toBeGreaterThanOrEqual(5);
  expect(en).toBeGreaterThanOrEqual(5);
  await expect(cards(page)).toHaveCount(quizzes.length);
});

test("hledání bez diakritiky a bez ohledu na velikost písmen (název, popis i téma)", async ({ page, request }) => {
  const tag = uniqueSuffix();
  const created = await request.post("/api/quizzes", {
    data: {
      title: `Žluťoučký kůň ${tag}`,
      url: `https://example.com/kun-${tag}`,
      description: "Úplně příšerné hádanky o ďábelských ódách",
      topic: "Zvířata",
      format: "text",
      language: "cs",
      types: ["logic"],
    },
  });
  expect(created.status()).toBe(201);

  await page.goto("/");
  await search(page, `ZLUTOUCKY KUN ${tag}`);
  await expectCount(page, 1);
  await expect(cards(page).first()).toContainText(`Žluťoučký kůň ${tag}`);

  await search(page, `priserne dabelskych ${tag}`);
  await expectCount(page, 1);

  await search(page, `zvirata ${tag}`);
  await expectCount(page, 1);
});

test("kombinace všech tří filtrů s více hodnotami v jednom filtru", async ({ page }) => {
  await page.goto("/");
  await filterButton(page, "Obrázkový").click();
  await filterButton(page, "Znalostní").click();
  await filterButton(page, "Logický a hádankový").click();
  await filterButton(page, "Angličtina").click();

  await expect(filterButton(page, "Obrázkový")).toHaveAttribute("aria-pressed", "true");
  const list = cards(page);
  const count = await list.count();
  expect(count).toBeGreaterThan(0);
  await expectCount(page, count);
  for (let i = 0; i < count; i++) {
    const card = list.nth(i);
    await expect(card).toHaveAttribute("data-format", "image");
    await expect(card).toHaveAttribute("data-language", "en");
    const types = (await card.getAttribute("data-types"))!.split(" ");
    expect(types.some((t) => t === "knowledge" || t === "logic")).toBe(true);
  }

  await filterButton(page, "Čeština").click();
  const both = await cards(page).count();
  expect(both).toBeGreaterThanOrEqual(count);

  await page.getByRole("button", { name: "Vymazat hledání a filtry" }).first().click();
  await expect(page.getByLabel("Najdi kvíz pro svou partu")).toHaveValue("");
  await expect(filterButton(page, "Obrázkový")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("heading", { name: "Populární kvízy" })).toBeVisible();
});

test("filtr Obrázkový ukáže jen obrázkové kvízy", async ({ page }) => {
  await page.goto("/");
  await filterButton(page, "Obrázkový").click();
  await expect(filterButton(page, "Obrázkový")).toHaveAttribute("aria-pressed", "true");
  const list = cards(page);
  expect(await list.count()).toBeGreaterThan(0);
  for (const card of await list.all()) await expect(card).toHaveAttribute("data-format", "image");
});

test("nulový počet výsledků zobrazí zprávu a dá se vymazat", async ({ page }) => {
  await page.goto("/");
  await search(page, "qwxyz neexistujici kviz");
  await expectCount(page, 0);
  await expect(page.getByTestId("empty-message")).toBeVisible();
  await page.getByRole("button", { name: "Vymazat hledání a filtry" }).last().click();
  await expect(page.getByTestId("empty-message")).toHaveCount(0);
  expect(await cards(page).count()).toBeGreaterThan(0);
});

test("Otevřít kvíz otevře původní web v nové záložce a započítá kliknutí", async ({ page, context, request }) => {
  await page.goto("/");
  const card = cards(page).and(page.locator('[data-collection="false"]')).first();
  const id = Number(await card.getAttribute("data-quiz-id"));
  const link = card.getByRole("link", { name: /Otevřít kvíz/ });
  const href = (await link.getAttribute("href"))!;
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);

  const before = (await (await request.get("/api/quizzes")).json()).quizzes.find((q: { id: number }) => q.id === id).clicks;
  const [popup] = await Promise.all([context.waitForEvent("page"), link.click()]);
  await popup.waitForLoadState();
  expect(popup.url()).toBe(href);

  await expect
    .poll(async () => (await (await request.get("/api/quizzes")).json()).quizzes.find((q: { id: number }) => q.id === id).clicks)
    .toBe(before + 1);

  await page.reload();
  await expect(page.getByTestId("popular-list").locator(`[data-quiz-id="${id}"]`)).toBeVisible();
});

test("formulář ověří povinná pole a odkaz http/https", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Přidat kvíz" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Uložit kvíz" }).click();
  await expect(dialog.getByText("Vyplň název kvízu.")).toBeVisible();
  await expect(dialog.getByText("Vlož přímý odkaz na kvíz.")).toBeVisible();
  await expect(dialog.getByText("Vyber formát kvízu.")).toBeVisible();
  await expect(dialog.getByText("Vyber alespoň jeden typ kvízu.")).toBeVisible();
  await expect(dialog.getByText("Vyber jazyk kvízu.")).toBeVisible();

  await dialog.getByLabel("Přímý odkaz *").fill("ftp://example.com/kviz");
  await dialog.getByRole("button", { name: "Uložit kvíz" }).click();
  await expect(dialog.getByText(/^Odkaz musí začínat http:\/\/ nebo https:\/\//)).toBeVisible();
});

test("odmítnutí duplicitního odkazu (i s jiným zápisem URL)", async ({ page, request }) => {
  const { quizzes } = await (await request.get("/api/quizzes")).json();
  const existing = quizzes[quizzes.length - 1];
  const variant = new URL(existing.url);
  variant.protocol = variant.protocol === "https:" ? "http:" : "https:";
  variant.hash = "nahoru";

  await page.goto("/");
  await page.getByRole("button", { name: "Přidat kvíz" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Název *").fill("Kopie existujícího kvízu");
  await dialog.getByLabel("Přímý odkaz *").fill(variant.toString());
  await expect(dialog.getByRole("status")).toContainText(`Tento odkaz už v katalogu je jako „${existing.title}“`);
  await dialog.getByText("Textový", { exact: true }).click();
  await dialog.getByText("Znalostní", { exact: true }).click();
  await dialog.getByRole("combobox", { name: "Jazyk" }).selectOption("cs");
  await dialog.getByRole("button", { name: "Uložit kvíz" }).click();
  await expect(dialog.getByRole("alert").first()).toContainText("už v katalogu je");
  await expect(dialog).toBeVisible();

  const api = await request.post("/api/quizzes", {
    data: { title: "Kopie", url: variant.toString(), format: "text", language: "cs", types: ["knowledge"] },
  });
  expect(api.status()).toBe(409);
  const after = (await (await request.get("/api/quizzes")).json()).quizzes;
  expect(after).toHaveLength(quizzes.length);
});

test("API odmítne zápis z cizího webu", async ({ request }) => {
  const res = await request.post("/api/quizzes", {
    headers: { Origin: "https://cizi-web.example" },
    data: { title: "Cizí", url: "https://example.net/cizi", format: "text", language: "cs", types: ["knowledge"] },
  });
  expect(res.status()).toBe(403);
  const click = await request.post("/api/quizzes/1/click", { headers: { Origin: "https://cizi-web.example" } });
  expect(click.status()).toBe(403);
});

test("kvíz přidaný v jednom prohlížeči (Chromium) je po obnovení vidět i v jiném (Firefox)", async ({ page, baseURL }) => {
  const tag = uniqueSuffix();
  const title = `Hádej písničku podle emoji ${tag}`;

  await page.goto("/");
  await page.getByRole("button", { name: "Přidat kvíz" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Název *").fill(title);
  await dialog.getByLabel("Přímý odkaz *").fill(`https://example.org/emoji-kviz-${tag}`);
  await dialog.getByText("Obrázkový", { exact: true }).click();
  await dialog.getByText("Znalostní", { exact: true }).click();
  await dialog.getByText("Logický a hádankový", { exact: true }).click();
  await dialog.getByRole("combobox", { name: "Jazyk" }).selectOption("cs");
  await dialog.getByLabel("Téma (nepovinné)").fill("Hudba");
  await dialog.getByLabel("Krátký popis (nepovinné)").fill("Písničky zakódované do emoji.");
  await dialog.getByRole("button", { name: "Uložit kvíz" }).click();

  await expect(page.getByText("Kvíz je v katalogu!")).toBeVisible();
  await expect(dialog).toBeHidden();
  await search(page, `hadej pisnicku ${tag}`);
  await expectCount(page, 1);

  await page.reload();
  await search(page, `hadej pisnicku ${tag}`);
  await expectCount(page, 1);

  const other = await firefox.launch();
  try {
    const otherContext = await other.newContext({ locale: "cs-CZ" });
    await stubExternalSites(otherContext, baseURL!);
    const otherPage = await otherContext.newPage();
    await otherPage.goto(baseURL!);
    await search(otherPage, `HADEJ PISNICKU ${tag}`);
    await expectCount(otherPage, 1);
    const card = cards(otherPage).first();
    await expect(card).toContainText(title);
    await expect(card).toContainText("hudba");
    await expect(card).toHaveAttribute("data-types", "knowledge logic");
  } finally {
    await other.close();
  }
});
