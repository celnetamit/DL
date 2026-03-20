import type { Page } from "@playwright/test";

function successResponse(data: unknown) {
  return JSON.stringify({
    success: true,
    message: "ok",
    data,
  });
}

export async function mockCatalog(page: Page) {
  await page.route("**/api/v1/products", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successResponse([
        {
          id: "prod-1",
          name: "Research Pack",
          description: "Curated research library bundle",
          price: 999,
          tier: "bundle",
        },
      ]),
    });
  });

  await page.route("**/api/v1/products/prod-1/stats", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successResponse({ content_count: 12 }),
    });
  });
}

export async function seedSession(page: Page, session: { token: string; user: unknown }) {
  await page.addInitScript((payload) => {
    window.localStorage.setItem("lms_token", payload.token);
    window.localStorage.setItem("lms_user", JSON.stringify(payload.user));
  }, session);
}

export async function mockRazorpaySuccess(page: Page) {
  await page.route("https://checkout.razorpay.com/v1/checkout.js", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `
        window.Razorpay = class MockRazorpay {
          constructor(options) {
            this.options = options;
          }
          on() {}
          async open() {
            await this.options.handler({
              razorpay_payment_id: "pay_123",
              razorpay_order_id: this.options.order_id,
              razorpay_signature: "sig_123",
            });
          }
        };
      `,
    });
  });
}

export async function mockCheckoutSuccess(page: Page) {
  await page.route("**/api/v1/subscriptions/create-order", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successResponse({
        order: {
          id: "order_123",
        },
      }),
    });
  });

  await page.route("**/api/v1/subscriptions/verify-order-payment", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successResponse({
        verified: true,
      }),
    });
  });
}

export async function mockRoleSwitchSuccess(page: Page) {
  await page.route("**/api/v1/auth/switch-role", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "ok",
        data: {
          token: "switched-token",
          user: {
            email: "admin@example.com",
            roles: [{ name: "content_manager" }],
            session: {
              can_revert: true,
              switched_role: "content_manager",
              original_roles: ["super_admin"],
            },
          },
        },
      }),
    });
  });
}

export async function mockAdminApi(page: Page) {
  await page.route("**/api/v1/analytics/admin**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successResponse({
        total_users: 10,
        total_institutions: 2,
        active_subscriptions: 4,
        total_revenue: 12000,
        months: 6,
        monthly_growth: [
          {
            label: "Jan",
            users: 10,
            institutions: 2,
            new_subscriptions: 1,
            active_subscriptions: 4,
            captured_payments: 2,
            revenue: 6000,
          },
        ],
        purchase_access_breakdown: { active: 3 },
        purchase_payment_breakdown: { captured: 2 },
        top_products: [
          {
            product_id: "prod-1",
            product_name: "Research Pack",
            purchase_count: 2,
          },
        ],
        system_status: {
          database: {
            status: "up",
            open_connections: 1,
            in_use: 1,
            idle: 0,
          },
          ai: {
            failed_generations_last_24h: 0,
          },
          audit: {
            events_last_24h: 3,
          },
        },
      }),
    });
  });

  await page.route("**/api/v1/ai/logs**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successResponse([
        {
          id: "log-1",
          status: "success",
          provider: "gemini",
          model: "gemini-1.5-flash",
          prompt_version: "v1",
          created_at: new Date().toISOString(),
          source_type: "url",
          requested_title: "AI Lesson",
        },
      ]),
    });
  });

  await page.route("**/api/v1/content/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successResponse([]),
    });
  });

  await page.route("**/api/v1/domains**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successResponse([]),
    });
  });

  await page.route("**/api/v1/institutions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successResponse([
        {
          id: "inst-1",
          name: "North Campus",
          domain: "north.edu",
          code: "NORTH",
          status: "active",
          student_limit: 100,
        },
      ]),
    });
  });

  await page.route("**/api/v1/institutions/inst-1/overview", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successResponse({
        summary: {
          total_members: 8,
          active_members: 7,
          inactive_members: 1,
          active_learners: 6,
          student_limit: 100,
          seats_used: 8,
          seats_remaining: 92,
          seat_utilization_percent: 8,
          active_subscriptions: 2,
          total_subscriptions: 2,
          active_products: 3,
          avg_progress_percent: 58,
        },
        members: [],
        subscriptions: [],
      }),
    });
  });
}

export async function mockInstitutionLoadError(page: Page) {
  await page.route("**/api/v1/institutions", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        message: "Institutions API unavailable",
      }),
    });
  });
}
