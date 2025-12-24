const { test, expect } = require("@playwright/test");

test("home nav appears after hero scroll", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator("#nav");
  await expect(nav).not.toHaveClass(/visible/);
  await page.evaluate(() => {
    window.scrollTo(0, window.innerHeight);
  });
  await expect(nav).toHaveClass(/visible/);
});

test("mobile menu button stays visible", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/");
  const mobileBtn = page.locator("#mobileMenuBtn");
  await expect(mobileBtn).toBeVisible();
});

test("status page loads core widgets", async ({ page }) => {
  await page.goto("/status/");
  await expect(page.locator("#overall-status")).toBeVisible();
  await expect(page.locator("#status-updated")).toBeVisible();
});

test("status refresh updates timestamp and cards render", async ({ page }) => {
  await page.goto("/status/");
  const updated = page.locator("#status-updated");
  await expect(page.locator("#http-status")).toBeVisible();
  await expect(page.locator("#cpu-usage")).toBeVisible();
  await expect(page.locator("#services-online")).toBeVisible();
  await expect(updated).toContainText("Last update:");
  const before = await updated.textContent();
  await page.waitForTimeout(1100);
  await page.locator("#refresh-now").click();
  await expect.poll(async () => updated.textContent()).not.toBe(before);
});
