import { expect, test } from "@playwright/test";
import { mockCatalog, mockCheckoutSuccess, mockRazorpaySuccess, seedSession } from "./helpers";

test("pricing purchase redirects unauthenticated users into dashboard sign in", async ({ page }) => {
  await mockCatalog(page);

  await page.goto("/pricing");

  await expect(page.getByRole("heading", { name: "Product Catalog" })).toBeVisible();
  await expect(page.getByText("Research Pack")).toBeVisible();

  await page.getByRole("button", { name: "Purchase" }).click();

  await expect(page).toHaveURL(/\/dashboard\?redirect=\/pricing/);
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
});

test("pricing purchase activates access for authenticated users after checkout", async ({ page }) => {
  await seedSession(page, {
    token: "token",
    user: {
      email: "buyer@example.com",
      roles: [{ name: "student" }],
    },
  });
  await mockCatalog(page);
  await mockCheckoutSuccess(page);

  await page.goto("/pricing");
  await mockRazorpaySuccess(page);

  await page.getByRole("button", { name: "Purchase" }).click();

  await expect(page).toHaveURL(/\/dashboard\?purchase=success/);
  await expect(page.getByRole("heading", { name: "buyer@example.com" })).toBeVisible();
  await expect(page.getByText("Purchase History")).toBeVisible();
});
