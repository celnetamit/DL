import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import UserManagementPanel from "@/components/UserManagementPanel";

const mockUseAuth = vi.fn();
const mockApiFetch = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

describe("UserManagementPanel", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockUseAuth.mockReturnValue({
      user: {
        roles: [{ name: "super_admin" }],
      },
    });
  });

  it("shows a visible fallback when the user list fails to load", async () => {
    mockApiFetch.mockImplementation((path: string) => {
      if (path === "/api/v1/institutions") {
        return Promise.resolve([{ id: "inst-1", name: "North Campus" }]);
      }
      if (path.startsWith("/api/v1/users?")) {
        return Promise.reject(new Error("Users API unavailable"));
      }
      return Promise.resolve([]);
    });

    render(<UserManagementPanel token="token" />);

    expect(await screen.findByText("Users API unavailable")).toBeInTheDocument();
    expect(screen.getByText("Try refreshing the user list after the admin API is available again.")).toBeInTheDocument();
  });

  it("shows the create-user entry point for super admins after loading", async () => {
    mockApiFetch.mockImplementation((path: string) => {
      if (path === "/api/v1/institutions") {
        return Promise.resolve([{ id: "inst-1", name: "North Campus" }]);
      }
      if (path.startsWith("/api/v1/users?")) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    render(<UserManagementPanel token="token" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "+ New User" })).toBeInTheDocument();
    });
    expect(screen.getByText("No users have been created yet.")).toBeInTheDocument();
  });
});
