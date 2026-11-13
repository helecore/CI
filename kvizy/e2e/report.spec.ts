import { expect, test, type APIRequestContext } from "@playwright/test";
import { cards, E2E_ADMIN_TOKEN, stubExternalSites, uniqueSuffix } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => {
  await stubExternalSites(context, baseURL!);
});

type AdminReport = { quizId: number; quizTitle: string; reason: string; note: string | null; createdAt: string };

async function adminReports(request: APIRequestContext): Promise<AdminReport[]> {
  const res = await request.get("/api/admin/reports", { headers: { Authorization: `Bearer ${E2E_ADMIN_TOKEN}` } });
  expect(res.status()).toBe(200);
  return (await res.json()).reports;
}

test("Nahlásit kvíz uloží hlášení do databáze, kvíz zůstane v katalogu a obsah vidí jen správce", async ({ page, request }) => {
  await page.goto("/");
  const card = cards(page).first();
  const id = Number(await card.getAttribute("data-quiz-id"));
  const title = (await card.getByRole("heading").textContent())!;
  const note = `Stránka hlásí 404 ${uniqueSuffix()}`;

  await card.getByRole("button", { name: "Nahlásit kvíz" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Nahlásit kvíz" })).toBeVisible();
  await expect(dialog).toContainText(title);
  for (const reason of ["Nefunkční odkaz", "Nesprávné zařazení", "Nevhodný obsah", "Duplicita", "Jiné"]) {
    await expect(dialog.getByRole("radio", { name: reason })).toBeAttached();
  }
  await expect(dialog.getByRole("button", { name: "Zrušit" })).toBeVisible();

  await dialog.getByRole("button", { name: "Odeslat hlášení" }).click();
  await expect(dialog.getByText("Vyber důvod hlášení.")).toBeVisible();

  await dialog.getByText("Nefunkční odkaz", { exact: true }).click();
  await dialog.getByLabel(/^Doplnění/).fill(note);
  await dialog.getByRole("button", { name: "Odeslat hlášení" }).click();
  await expect(dialog.getByRole("status")).toContainText("Hlášení jsme uložili");
  await dialog.getByRole("button", { name: "Zavřít", exact: true }).and(dialog.locator("[data-slot=dialog-footer] button")).click();
  await expect(dialog).toBeHidden();

  const saved = (await adminReports(request)).find((r) => r.note === note);
  expect(saved).toMatchObject({ quizId: id, quizTitle: title, reason: "broken_link" });
  expect(Date.now() - new Date(saved!.createdAt).getTime()).toBeLessThan(5 * 60_000);

  const { quizzes } = await (await request.get("/api/quizzes")).json();
  expect(quizzes.some((q: { id: number }) => q.id === id)).toBe(true);
  expect(JSON.stringify(quizzes)).not.toContain(note);
  await page.reload();
  await expect(cards(page).and(page.locator(`[data-quiz-id="${id}"]`))).toHaveCount(1);
});

test("u důvodu Jiné je popis povinný; při selhání zůstanou údaje vyplněné a jde to zkusit znovu", async ({ page, request }) => {
  await page.goto("/");
  const card = cards(page).nth(1);
  const id = Number(await card.getAttribute("data-quiz-id"));
  const note = `Kvíz je jen v němčině ${uniqueSuffix()}`;

  await card.getByRole("button", { name: "Nahlásit kvíz" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Jiné", { exact: true }).click();
  await expect(dialog.getByLabel("Doplnění *")).toBeVisible();
  await dialog.getByRole("button", { name: "Odeslat hlášení" }).click();
  await expect(dialog.getByText("U důvodu Jiné stručně popiš, co je špatně.")).toBeVisible();

  await dialog.getByLabel("Doplnění *").fill(note);
  let failNext = true;
  await page.route(`**/api/quizzes/${id}/report`, async (route) => {
    if (failNext) {
      failNext = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
    } else {
      await route.continue();
    }
  });
  await dialog.getByRole("button", { name: "Odeslat hlášení" }).click();
  await expect(dialog.getByRole("alert")).toContainText("nepodařilo odeslat");
  await expect(dialog.getByRole("radio", { name: "Jiné" })).toBeChecked();
  await expect(dialog.getByLabel("Doplnění *")).toHaveValue(note);

  await dialog.getByRole("button", { name: "Odeslat hlášení" }).click();
  await expect(dialog.getByRole("status")).toContainText("Hlášení jsme uložili");
  expect((await adminReports(request)).filter((r) => r.note === note)).toEqual([
    expect.objectContaining({ quizId: id, reason: "other" }),
  ]);
});

test("Zrušit zavře dialog bez uložení", async ({ page, request }) => {
  const before = (await adminReports(request)).length;
  await page.goto("/");
  await cards(page).first().getByRole("button", { name: "Nahlásit kvíz" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Duplicita", { exact: true }).click();
  await dialog.getByRole("button", { name: "Zrušit" }).click();
  await expect(dialog).toBeHidden();
  expect(await adminReports(request)).toHaveLength(before);
});

test("API hlášení validuje vstup, odmítne cizí web a omezí počet hlášení", async ({ request }) => {
  const { quizzes } = await (await request.get("/api/quizzes")).json();
  const id = quizzes[0].id;
  const url = `/api/quizzes/${id}/report`;

  expect((await request.post(url, { data: { reason: "spam" } })).status()).toBe(422);
  expect((await request.post(url, { data: { reason: "other", note: "" } })).status()).toBe(422);
  expect((await request.post(url, { data: { reason: "duplicate", note: "x".repeat(501) } })).status()).toBe(422);
  expect((await request.post("/api/quizzes/999999/report", { data: { reason: "duplicate" } })).status()).toBe(404);
  expect(
    (await request.post(url, { headers: { Origin: "https://cizi-web.example" }, data: { reason: "duplicate" } })).status(),
  ).toBe(403);

  const headers = { "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200) + 1}` };
  const statuses: number[] = [];
  for (let i = 0; i < 11; i++) {
    statuses.push((await request.post(url, { headers, data: { reason: "spam" } })).status());
  }
  expect(statuses.slice(0, 10).every((s) => s === 422)).toBe(true);
  expect(statuses[10]).toBe(429);
});

test("seznam hlášení je jen pro správce", async ({ request }) => {
  expect((await request.get("/api/admin/reports")).status()).toBe(401);
  expect((await request.get("/api/admin/reports", { headers: { Authorization: "Bearer spatny-klic" } })).status()).toBe(401);
  expect((await request.get("/api/admin/reports", { headers: { Authorization: `Bearer ${E2E_ADMIN_TOKEN}` } })).status()).toBe(200);
});

test("stránka /spravce ukáže hlášení až po zadání klíče", async ({ page, request }) => {
  const { quizzes } = await (await request.get("/api/quizzes")).json();
  const note = `Kontrola správce ${uniqueSuffix()}`;
  expect((await request.post(`/api/quizzes/${quizzes[0].id}/report`, { data: { reason: "wrong_category", note } })).status()).toBe(201);

  await page.goto("/spravce");
  await expect(page.getByText(note)).toHaveCount(0);
  await page.getByLabel("Přístupový klíč správce").fill("spatny-klic");
  await page.getByRole("button", { name: "Zobrazit hlášení" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Neplatný přístupový klíč" })).toBeVisible();

  await page.getByLabel("Přístupový klíč správce").fill(E2E_ADMIN_TOKEN);
  await page.getByRole("button", { name: "Zobrazit hlášení" }).click();
  const row = page.getByTestId("admin-reports").getByRole("row").filter({ hasText: note });
  await expect(row).toContainText("Nesprávné zařazení");
  await expect(row).toContainText(quizzes[0].title);
});
