import { expect, test, type Page } from "@playwright/test";
import { filterButton, stubExternalSites } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => {
  await stubExternalSites(context, baseURL!);
});

const filters = (page: Page) => page.getByRole("region", { name: "Filtry" });

async function boxes(page: Page) {
  const chips = filters(page).getByTestId("filter-chip");
  await expect(chips).not.toHaveCount(0);
  return Promise.all((await chips.all()).map(async (chip) => (await chip.boundingBox())!));
}

async function groupBoxes(page: Page) {
  await expect(filters(page).getByTestId("filter-chip")).not.toHaveCount(0);
  const groups = await filters(page).getByTestId("filter-group").all();
  return Promise.all(
    groups.map(async (group) => ({
      group: (await group.boundingBox())!,
      title: (await group.locator("p").first().boundingBox())!,
      chips: await Promise.all((await group.getByTestId("filter-chip").all()).map(async (c) => (await c.boundingBox())!)),
    })),
  );
}

type Box = { x: number; y: number; width: number; height: number };

/** Every row after the first starts exactly under the group's first option. */
function expectWrappedRowsStartUnderFirst(chips: Box[]) {
  for (const chip of chips) {
    const rowStart = chips.filter((c) => Math.abs(c.y - chip.y) <= 1).sort((a, b) => a.x - b.x)[0];
    expect(Math.abs(rowStart.x - chips[0].x)).toBeLessThanOrEqual(1);
  }
}

test.describe("počítač", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("hlavička má ilustraci a nemá dlaždici Obrázkové kvízy", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero-illustration")).toBeVisible();
    await expect(page.getByRole("button", { name: /Obrázkové kvízy/ })).toHaveCount(0);
    await expect(filterButton(page, "Obrázkový")).toBeVisible();
  });

  test("skupiny filtrů začínají na stejné horní hraně a tlačítka mají stejnou výšku", async ({ page }) => {
    await page.goto("/");
    const groups = await groupBoxes(page);
    expect(groups).toHaveLength(3);
    for (const g of groups) {
      expect(Math.abs(g.title.y - groups[0].title.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(g.chips[0].y - groups[0].chips[0].y)).toBeLessThanOrEqual(1);
    }
    const heights = new Set((await boxes(page)).map((b) => Math.round(b.height)));
    expect([...heights]).toHaveLength(1);

    for (const g of groups) expectWrappedRowsStartUnderFirst(g.chips);
    const logic = (await filterButton(page, "Logický a hádankový").boundingBox())!;
    const types = groups[1].chips;
    if (logic.y > types[0].y + 1) expect(Math.abs(logic.x - types[0].x)).toBeLessThanOrEqual(1);
  });

  test("aktivní stav nemění rozměry tlačítek ani neposouvá okolní filtry", async ({ page }) => {
    await page.goto("/");
    const before = await boxes(page);
    for (const name of ["Obrázkový", "Logický a hádankový", "Osobnostní", "Čeština", "Angličtina"]) {
      await filterButton(page, name).click();
      await expect(filterButton(page, name)).toHaveAttribute("aria-pressed", "true");
    }
    const after = await boxes(page);
    expect(after).toHaveLength(before.length);
    after.forEach((box, i) => {
      for (const key of ["x", "y", "width", "height"] as const) expect(Math.abs(box[key] - before[i][key])).toBeLessThan(0.5);
    });
  });
});

test.describe("mobil", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("skupiny filtrů jsou pod sebou, zalomená volba začíná pod první volbou skupiny a ilustrace je skrytá", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero-illustration")).toBeHidden();
    const groups = await groupBoxes(page);
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i].group.y).toBeGreaterThanOrEqual(groups[i - 1].group.y + groups[i - 1].group.height);
      expect(Math.abs(groups[i].group.x - groups[0].group.x)).toBeLessThanOrEqual(1);
    }
    for (const g of groups) {
      expectWrappedRowsStartUnderFirst(g.chips);
      for (const chip of g.chips) expect(chip.x + chip.width).toBeLessThanOrEqual(390);
    }
    const heights = new Set((await boxes(page)).map((b) => Math.round(b.height)));
    expect([...heights]).toHaveLength(1);
  });
});
