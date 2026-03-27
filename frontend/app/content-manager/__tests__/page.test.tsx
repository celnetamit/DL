import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import ContentManagerPage from "@/app/content-manager/page";

const mockUseAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/components/AdminDashboard", () => ({
  default: ({ standalone }: { standalone?: boolean }) => <div>{standalone ? "Standalone Content Manager" : "Admin Dashboard"}</div>,
}));

describe("ContentManagerPage", () => {
  it("renders the dedicated content manager for content managers", () => {
    mockUseAuth.mockReturnValue({
      token: "token",
      loading: false,
      user: {
        roles: [{ name: "content_manager" }],
      },
    });

    render(<ContentManagerPage />);

    expect(screen.getByText("Dedicated Content Manager")).toBeInTheDocument();
    expect(screen.getByText("Standalone Content Manager")).toBeInTheDocument();
  });
});
