import { expect, type Page } from "@playwright/test";

export async function setCode(page: Page, code: string) {
  const editor = page.getByLabel("Python code editor");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  // insertText avoids the editor's auto-indent and bracket closing.
  await page.keyboard.insertText(code);
}

export async function waitForPython(page: Page) {
  await expect(page.getByText(/Python 3\.14\.\d+ ready/)).toBeVisible({ timeout: 60_000 });
}
