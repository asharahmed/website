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
