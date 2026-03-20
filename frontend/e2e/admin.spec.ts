import { expect, test } from "@playwright/test";
import { mockAdminApi, mockInstitutionLoadError, seedSession } from "./helpers";

test("admin page shows restricted state for unauthenticated visitors", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Admin access is role-based" })).toBeVisible();
});

test("content managers can open admin and see only their allowed tabs", async ({ page }) => {
  await seedSession(page, {
    token: "token",
    user: {
      email: "manager@example.com",
      roles: [{ name: "content_manager" }],
    },
  });
  await mockAdminApi(page);

  await page.goto("/admin");

  await expect(page.getByRole("button", { name: "Analytics" })).toBeVisible();
  await expect(page.getByRole("button", { name: "AI Logs" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Domains" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Products" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Users" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Subscriptions" })).toHaveCount(0);
});

test("content managers can inspect AI logs in the admin console", async ({ page }) => {
  await seedSession(page, {
    token: "token",
    user: {
      email: "manager@example.com",
      roles: [{ name: "content_manager" }],
    },
  });
  await mockAdminApi(page);

  await page.goto("/admin");
  await page.getByRole("button", { name: "AI Logs" }).click();

  await expect(page.getByRole("heading", { name: "AI Generation Audit Trail" })).toBeVisible();
  await expect(page.getByText("AI Lesson")).toBeVisible();
  await expect(page.getByText("gemini-1.5-flash")).toBeVisible();
});

test("super admins see a visible institution load error when the API fails", async ({ page }) => {
  await seedSession(page, {
    token: "token",
    user: {
      email: "admin@example.com",
      roles: [{ name: "super_admin" }],
    },
  });
  await mockAdminApi(page);
  await mockInstitutionLoadError(page);

  await page.goto("/admin");
  await page.getByRole("button", { name: "Institutions" }).click();

  await expect(page.getByText("Institutions API unavailable")).toBeVisible();
});
