import { expect, test } from "@playwright/test";
import { CONTRAST_ONLY, expectNoA11yViolations } from "./helpers";

test.describe("public pages", () => {
  test("landing page has a heading and no detectable a11y violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("login page has no detectable a11y violations", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "تسجيل الدخول" })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("register page has no detectable a11y violations", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "أنشئ حسابك مجانًا" })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("unauthenticated student route redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "تسجيل الدخول" })).toBeVisible();
  });
});

test.describe("dark mode contrast", () => {
  test("landing page keeps >4.5:1 contrast in dark mode", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("thanawico.theme", "dark");
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expectNoA11yViolations(page, CONTRAST_ONLY);
  });

  test("login page keeps >4.5:1 contrast in dark mode", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("thanawico.theme", "dark");
    });
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "تسجيل الدخول" })).toBeVisible();
    await expectNoA11yViolations(page, CONTRAST_ONLY);
  });
});
