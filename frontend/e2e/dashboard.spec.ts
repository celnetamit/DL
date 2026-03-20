import { expect, test } from "@playwright/test";
import { mockDashboardInstitution, seedSession } from "./helpers";

test("institution admins can review institution dashboard analytics and purchases", async ({ page }) => {
  await seedSession(page, {
    token: "token",
    user: {
      email: "admin@north.edu",
      institution_id: "inst-1",
      roles: [{ name: "institution_admin" }],
    },
  });
  await mockDashboardInstitution(page);

  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "North Campus Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Research Pack" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Subscription & Billing History" })).toBeVisible();
  await expect(page.getByText("Student Access Control")).toBeVisible();
});

test("institution admins can pause student access from the dashboard", async ({ page }) => {
  await seedSession(page, {
    token: "token",
    user: {
      email: "admin@north.edu",
      institution_id: "inst-1",
      roles: [{ name: "institution_admin" }],
    },
  });
  await mockDashboardInstitution(page);

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Pause Access" }).click();

  await expect(page.getByText("Student access paused successfully.")).toBeVisible();
});
