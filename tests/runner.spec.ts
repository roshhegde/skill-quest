import { test, expect } from "@playwright/test";
import { setCode, waitForPython } from "./helpers/editor";

test.beforeEach(async ({ page }) => {
  await page.goto("/#/playground");
  await waitForPython(page);
});

test("runs Python and shows its output", async ({ page }) => {
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("latte  3.50");
  await expect(page.getByTestId("output")).toContainText("mocha  4.00");
});

test("shows a clean traceback for errors", async ({ page }) => {
  await setCode(page, 'menu = {"latte": 3.5}\nprint(menu["tea"])');
  await page.getByRole("button", { name: "Run", exact: true }).click();
  const output = page.getByTestId("output");
  await expect(output).toContainText("KeyError: 'tea'");
  await expect(output).toContainText('File "main.py", line 2');
  await expect(output).not.toContainText("_pyodide");
});

test("Stop ends an endless loop and Python keeps working", async ({ page }) => {
  await setCode(page, "while True:\n    pass");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByRole("button", { name: "Running…" })).toBeVisible();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByTestId("output")).toContainText("Stopped.");
  await expect(page.getByText(/Python 3\.14\.\d+ ready/)).toBeVisible({ timeout: 60_000 });
  await setCode(page, 'print("back again")');
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("back again");
});

test("an endless loop is stopped automatically after 5 seconds", async ({ page }) => {
  await setCode(page, "while True:\n    pass");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("Stopped after 5 seconds", { timeout: 15_000 });
});
