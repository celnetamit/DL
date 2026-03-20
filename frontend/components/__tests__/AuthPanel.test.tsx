import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuthPanel from "@/components/AuthPanel";
import { vi } from "vitest";

const mockUseAuth = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSearchParamsGet = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

describe("AuthPanel", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockUseAuth.mockReturnValue({
      token: null,
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      loginWithGoogle: vi.fn(),
      switchRole: vi.fn(),
      revertRole: vi.fn(),
    });
    mockSearchParamsGet.mockImplementation((key: string) => (key === "auth" ? "register" : null));
  });

  it("opens in register mode when auth=register is present", async () => {
    render(<AuthPanel />);

    expect(await screen.findByRole("heading", { name: "Create Account" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it("lets super admins switch into preview mode", async () => {
    const switchRole = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      token: "token",
      loading: false,
      user: {
        email: "admin@example.com",
        roles: [{ name: "super_admin" }],
        session: {},
      },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      loginWithGoogle: vi.fn(),
      switchRole,
      revertRole: vi.fn(),
    });
    mockSearchParamsGet.mockReturnValue(null);

    render(<AuthPanel />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "content_manager" } });
    fireEvent.click(screen.getByRole("button", { name: "Switch Role" }));

    await waitFor(() => {
      expect(switchRole).toHaveBeenCalledWith("content_manager");
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows revert controls when a preview session can be reverted", () => {
    mockUseAuth.mockReturnValue({
      token: "token",
      loading: false,
      user: {
        email: "admin@example.com",
        roles: [{ name: "content_manager" }],
        session: { can_revert: true, switched_role: "content_manager" },
      },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      loginWithGoogle: vi.fn(),
      switchRole: vi.fn(),
      revertRole: vi.fn(),
    });
    mockSearchParamsGet.mockReturnValue(null);

    render(<AuthPanel />);

    expect(screen.getByText(/currently previewing the/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revert to Super Admin" })).toBeInTheDocument();
  });
});
