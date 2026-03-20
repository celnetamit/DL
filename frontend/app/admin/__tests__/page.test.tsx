import React from "react";
import { render, screen } from "@testing-library/react";
import AdminPage from "@/app/admin/page";
import { vi } from "vitest";

const mockUseAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/components/AdminDashboard", () => ({ default: () => <div>Analytics Panel</div> }));
vi.mock("@/components/UserManagementPanel", () => ({ default: () => <div>Users Panel</div> }));
vi.mock("@/components/InstitutionPanel", () => ({ default: () => <div>Institutions Panel</div> }));
vi.mock("@/components/SubscriptionAdminPanel", () => ({ default: () => <div>Subscriptions Panel</div> }));
vi.mock("@/components/DomainManagementPanel", () => ({ default: () => <div>Domains Panel</div> }));
vi.mock("@/components/ProductManagerPanel", () => ({ default: () => <div>Products Panel</div> }));
vi.mock("@/components/SettingsPanel", () => ({ default: () => <div>Settings Panel</div> }));
vi.mock("@/components/AIGenerationPanel", () => ({ default: () => <div>AI Logs Panel</div> }));

describe("AdminPage", () => {
  it("shows role-appropriate tabs for content managers", async () => {
    mockUseAuth.mockReturnValue({
      token: "token",
      loading: false,
      user: {
        roles: [{ name: "content_manager" }],
      },
    });

    render(<AdminPage />);

    expect(screen.getByRole("button", { name: "Analytics" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI Logs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Domains" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Products" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Users" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subscriptions" })).not.toBeInTheDocument();
  });
});
