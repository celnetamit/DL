import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import AdminDashboard from "@/components/AdminDashboard";

const mockUseAuth = vi.fn();
const mockFetchContents = vi.fn();
const mockCreateContent = vi.fn();
const mockUpdateContent = vi.fn();
const mockDeleteContent = vi.fn();
const mockGetAdminAnalytics = vi.fn();
const mockApiFetch = vi.fn();
const mockGetContentFilterPresets = vi.fn();
const mockSaveContentFilterPreset = vi.fn();
const mockDeleteContentFilterPreset = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/api", () => ({
  fetchContents: (...args: unknown[]) => mockFetchContents(...args),
  createContent: (...args: unknown[]) => mockCreateContent(...args),
  updateContent: (...args: unknown[]) => mockUpdateContent(...args),
  deleteContent: (...args: unknown[]) => mockDeleteContent(...args),
  getAdminAnalytics: (...args: unknown[]) => mockGetAdminAnalytics(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  getContentFilterPresets: (...args: unknown[]) => mockGetContentFilterPresets(...args),
  saveContentFilterPreset: (...args: unknown[]) => mockSaveContentFilterPreset(...args),
  deleteContentFilterPreset: (...args: unknown[]) => mockDeleteContentFilterPreset(...args),
}));

const analytics = {
  total_users: 0,
  total_institutions: 0,
  active_subscriptions: 0,
  total_revenue: 0,
  months: 6,
  monthly_growth: [],
  purchase_access_breakdown: {},
  purchase_payment_breakdown: {},
  top_products: [],
  system_status: {
    database: { status: "up", open_connections: 0, in_use: 0, idle: 0 },
    ai: { failed_generations_last_24h: 0 },
    audit: { events_last_24h: 0 },
  },
};

const domains = [
  {
    id: "dom-1",
    name: "Engineering",
    subdomains: [{ id: "sub-1", name: "Mechanical" }],
  },
];

const contents = [
  {
    id: "content-1",
    title: "Heat Transfer Fundamentals",
    status: "Draft",
    source_url: "https://example.com/heat-transfer",
    metadata: {
      domain: "Engineering",
      subdomain: "Mechanical",
      access_type: "Open Access",
    },
  },
];

describe("AdminDashboard preset behavior", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ token: "token", loading: false });
    mockFetchContents.mockReset();
    mockCreateContent.mockReset();
    mockUpdateContent.mockReset();
    mockDeleteContent.mockReset();
    mockGetAdminAnalytics.mockReset();
    mockApiFetch.mockReset();
    mockGetContentFilterPresets.mockReset();
    mockSaveContentFilterPreset.mockReset();
    mockDeleteContentFilterPreset.mockReset();

    mockFetchContents.mockResolvedValue(contents);
    mockCreateContent.mockResolvedValue({});
    mockUpdateContent.mockResolvedValue({});
    mockDeleteContent.mockResolvedValue({});
    mockGetAdminAnalytics.mockResolvedValue(analytics);
    mockApiFetch.mockResolvedValue(domains);
    mockGetContentFilterPresets.mockResolvedValue([
      {
        id: "preset-1",
        name: "Mechanical Open",
        filter_data: {
          searchTerm: "heat",
          statusFilter: "Draft",
          domainFilter: "Engineering",
          subdomainFilter: "Mechanical",
          accessFilter: "Open Access",
          sourceFilter: "with-source",
        },
      },
    ]);
    mockSaveContentFilterPreset.mockImplementation(async ({ category, name, filter_data }) => ({
      id: "preset-saved",
      category,
      name,
      filter_data,
    }));
    mockDeleteContentFilterPreset.mockResolvedValue({});
  });

  it("loads presets from the backend and applies them to the filters", async () => {
    render(<AdminDashboard standalone />);

    const presetButton = await screen.findByRole("button", { name: "Mechanical Open" });
    fireEvent.click(presetButton);

    expect(screen.getByPlaceholderText("Search title or metadata...")).toHaveValue("heat");
    expect(screen.getByDisplayValue("Mechanical Open")).toBeInTheDocument();
  });

  it("saves the current filters as a backend preset", async () => {
    render(<AdminDashboard standalone />);

    await screen.findByRole("button", { name: "Save Current Filters" });

    fireEvent.change(screen.getByPlaceholderText("Search title or metadata..."), {
      target: { value: "heat" },
    });
    fireEvent.change(screen.getByPlaceholderText("Preset name"), {
      target: { value: "My Heat Filter" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Current Filters" }));

    await waitFor(() => {
      expect(mockSaveContentFilterPreset).toHaveBeenCalledWith(
        {
          category: "articles",
          name: "My Heat Filter",
          filter_data: expect.objectContaining({
            searchTerm: "heat",
            statusFilter: "",
            domainFilter: "",
            subdomainFilter: "",
            accessFilter: "",
            sourceFilter: "",
          }),
        },
        "token",
      );
    });
  });

  it("deletes a saved backend preset", async () => {
    render(<AdminDashboard standalone />);

    await screen.findByRole("button", { name: "Mechanical Open" });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(mockDeleteContentFilterPreset).toHaveBeenCalledWith("preset-1", "token");
    });
  });
});
