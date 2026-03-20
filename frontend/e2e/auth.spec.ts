import { expect, test } from "@playwright/test";
import { mockRoleSwitchSuccess, seedSession } from "./helpers";

test("dashboard auth query opens the login panel", async ({ page }) => {
  await page.goto("/dashboard?auth=login");

  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("dashboard auth query opens the register panel", async ({ page }) => {
  await page.goto("/dashboard?auth=register");

  await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible();
  await expect(page.getByPlaceholder("Full name")).toBeVisible();
});

test("super admins can switch into role preview mode", async ({ page }) => {
  await seedSession(page, {
    token: "token",
    user: {
      email: "admin@example.com",
      roles: [{ name: "super_admin" }],
      session: {},
    },
  });
  await mockRoleSwitchSuccess(page);

  await page.goto("/dashboard");

  await page.getByRole("combobox").selectOption("content_manager");
  await page.getByRole("button", { name: "Switch Role" }).click();

  await expect(page.getByRole("button", { name: "Revert to Super Admin" })).toBeVisible();
  await expect(page.getByText(/currently previewing the/i)).toBeVisible();
});
