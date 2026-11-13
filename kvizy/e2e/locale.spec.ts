import { expect, test } from "@playwright/test";
import { cards, filterButton, uniqueSuffix } from "./helpers";

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  test(`překlad a zachování stavu při šířce ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "cs");
    await page.getByLabel("Najdi kvíz pro svou partu").fill("hogwarts");
    await filterButton(page, "Angličtina").click();
    await page.getByRole("button", { name: "Přidat kvíz" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Název *").fill("Rozepsaný kvíz");
    await dialog.getByPlaceholder("Hledat jazyk").fill("nem");
    await expect(dialog.getByRole("option", { name: "Němčina" })).toBeAttached();
    await dialog.getByRole("combobox", { name: "Jazyk" }).selectOption("de");

    await dialog.getByRole("button", { name: "EN", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: "Add quiz" })).toBeVisible();
    await expect(dialog.getByLabel("Title *")).toHaveValue("Rozepsaný kvíz");
    await expect(dialog.getByRole("combobox", { name: "Language" })).toHaveValue("de");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByLabel("Find a quiz for your friends")).toHaveValue("hogwarts");
    await expect(page.getByRole("button", { name: "English", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(cards(page).getByRole("heading", { name: "Hogwarts House Test" })).toBeVisible();

    const report = cards(page).filter({ hasText: "Hogwarts House Test" }).getByRole("button", { name: "Report quiz" });
    await expect(report).toHaveAttribute("title", "Report quiz");
    await expect(report).toHaveText("");
    await report.focus();
    await report.press("Enter");
    await expect(dialog.getByRole("radio", { name: "Broken link" })).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await report.click();
    await expect(dialog.getByRole("heading", { name: "Report quiz" })).toBeVisible();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("button", { name: "Add quiz" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

test("první německý kvíz přidá Němčinu do filtrů", async ({ page }) => {
  await page.goto("/");
  await expect(filterButton(page, "Němčina")).toHaveCount(0);
  await page.getByRole("button", { name: "Přidat kvíz" }).click();
  const dialog = page.getByRole("dialog");
  const tag = uniqueSuffix();
  await dialog.getByLabel("Název *").fill(`Deutsches Quiz ${tag}`);
  await dialog.getByLabel("Přímý odkaz *").fill(`https://example.com/deutsch-${tag}`);
  await dialog.getByText("Textový", { exact: true }).click();
  await dialog.getByText("Znalostní", { exact: true }).click();
  await dialog.getByPlaceholder("Hledat jazyk").fill("nem");
  await dialog.getByRole("combobox", { name: "Jazyk" }).selectOption("de");
  await dialog.getByRole("button", { name: "Uložit kvíz" }).click();
  await filterButton(page, "Němčina").click();
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toHaveAttribute("data-language", "de");
});
