import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { parse } from "yaml";
import { setCode, waitForPython } from "./helpers/editor";

// Every mission folder under content/, in path order (regions then missions).
type Mission = { id: string; title: string; region: number; order: number; dir: string };
const root = "content";
const missions: Mission[] = readdirSync(root, { recursive: true, encoding: "utf8" })
  .filter((p) => p.endsWith("mission.yaml"))
  .map((p) => {
    const dir = join(root, p, "..");
    return { ...parse(readFileSync(join(root, p), "utf8")), dir };
  })
  .sort((a, b) => a.region - b.region || a.order - b.order);

const solution = (m: Mission) => readFileSync(join(m.dir, "solution.py"), "utf8");

async function runChecks(page: Page) {
  await page.getByRole("button", { name: "Run checks" }).click();
  await expect(page.getByRole("button", { name: "Run checks" })).toBeVisible({ timeout: 30_000 });
}

/** Opens a mission and solves it with its solution.py. */
async function solve(page: Page, m: Mission) {
  await page.goto(`/#/m/${m.id}`);
  await waitForPython(page);
  await setCode(page, solution(m));
  await runChecks(page);
  await expect(page.getByTestId("reward")).toBeVisible();
}

for (const [i, m] of missions.entries()) {
  test(`${m.title}: the starter fails its checks and the solution passes them all`, async ({ page }) => {
    // Missions open in order, so finish the earlier ones first.
    for (const earlier of missions.slice(0, i)) await solve(page, earlier);

    await page.goto(`/#/m/${m.id}`);
    await waitForPython(page);
    await expect(page.getByRole("heading", { level: 1, name: m.title })).toBeVisible();
    await runChecks(page);
    const checks = page.getByTestId("checks");
    await expect(checks.locator("li.fail").first()).toBeVisible();
    await expect(page.getByTestId("reward")).toHaveCount(0);

    await setCode(page, solution(m));
    await runChecks(page);
    await expect(checks.locator("li.fail")).toHaveCount(0);
    expect(await checks.locator("li.pass").count()).toBeGreaterThan(0);
    await expect(page.getByTestId("reward")).toContainText("Mission complete");
  });
}

test("The Monday Crash explains the KeyError in plain words", async ({ page }) => {
  for (const earlier of missions.filter((m) => m.id !== "py-r3-m3")) await solve(page, earlier);
  await page.goto("/#/m/py-r3-m3");
  await waitForPython(page);
  await runChecks(page);
  await expect(page.getByTestId("output")).toContainText("KeyError: 'pumpkin_spice'");
  await expect(page.getByTestId("checks")).toContainText("Your code crashed");
});

test("the concept card runs its example", async ({ page }) => {
  await page.goto(`/#/m/${missions[0].id}`);
  await waitForPython(page);
  await page.getByRole("tab", { name: "Concept" }).click();
  await page.getByRole("button", { name: "Try it" }).click();
  await expect(page.getByTestId("snippet-output")).toContainText("Hotel Lisbon has 12 rooms.");
});

test("hints unlock one at a time and lower the XP", async ({ page }) => {
  const m = missions[0];
  await page.goto(`/#/m/${m.id}`);
  await waitForPython(page);
  await expect(page.getByText("up to 20 XP")).toBeVisible();
  await page.getByRole("button", { name: /Get a hint/ }).click();
  await expect(page.getByText("Hints · 2 left")).toBeVisible();
  await expect(page.getByText("up to 13 XP")).toBeVisible();
  await setCode(page, solution(m));
  await runChecks(page);
  await expect(page.getByTestId("reward")).toContainText("+13 XP");
});

test("later missions are locked until earlier ones are done, and progress survives a reload", async ({ page }) => {
  const [first, second] = missions;
  await page.goto("/");
  await expect(page.getByTestId(`mission-${second.id}`)).toHaveAttribute("aria-disabled", "true");

  await solve(page, first);
  await expect(page.getByTestId("reward")).toContainText("+20 XP");
  await page.getByRole("link", { name: `Next: ${second.title}` }).click();
  await expect(page.getByRole("heading", { level: 1, name: second.title })).toBeVisible();

  await page.goto("/");
  await page.reload();
  await expect(page.getByTestId("xp")).toContainText("20 XP");
  await expect(page.getByTestId(`mission-${first.id}`)).toContainText("20 XP earned");
  await expect(page.getByTestId(`mission-${second.id}`)).not.toHaveAttribute("aria-disabled");
});
