import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import ProductManagerPanel from "@/components/ProductManagerPanel";

const mockUseAuth = vi.fn();
const mockApiFetch = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const products = [
  {
    id: "prod-1",
    name: "Research Pack",
    description: "Mapped to multiple domains",
    price: 999,
    currency: "INR",
    tier: "bundle",
    content_types: ["articles", "videos"],
    bundle_domain_ids: ["dom-1", "dom-2"],
    domain_ids: ["dom-1", "dom-2"],
    status: "active",
  },
];

const domains = [
  {
    id: "dom-1",
    name: "Engineering",
    subdomains: [
      { id: "sub-1", name: "Mechanical" },
      { id: "sub-2", name: "Electrical" },
    ],
  },
  {
    id: "dom-2",
    name: "Medicine",
    subdomains: [{ id: "sub-3", name: "Pharmacology" }],
  },
];

const contents = [
  { id: "content-1", title: "Heat Transfer", type: "videos" },
  { id: "content-2", title: "Clinical Trials", type: "articles" },
];

describe("ProductManagerPanel", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ token: "token" });
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation((path: string, options?: RequestInit) => {
      if (path === "/api/v1/products" && (!options || !options.method)) {
        return Promise.resolve(products);
      }
      if (path === "/api/v1/domains") {
        return Promise.resolve(domains);
      }
      if (path === "/api/v1/contents") {
        return Promise.resolve(contents);
      }
      return Promise.resolve({});
    });
  });

  it("blocks bundle products until at least one linked domain is selected", async () => {
    render(<ProductManagerPanel />);

    expect(await screen.findByText("Research Pack")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Product Name" }), {
      target: { value: "New Bundle" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Price (INR)" }), {
      target: { value: "1200" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Target Tier" }), {
      target: { value: "bundle" },
    });

    expect(await screen.findByText("Bundle products must include at least one linked domain.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Product" })).toBeDisabled();
  });

  it("creates a content-tier product using explicit relational content_ids", async () => {
    render(<ProductManagerPanel />);

    expect(await screen.findByText("Research Pack")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Product Name" }), {
      target: { value: "Single Video Access" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Price (INR)" }), {
      target: { value: "499" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Target Tier" }), {
      target: { value: "content" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Pick Content Item" }), {
      target: { value: "content-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Product" }));

    await waitFor(() => {
      const postCall = mockApiFetch.mock.calls.find(
        ([path, options, token]) => path === "/api/v1/products" && options?.method === "POST" && token === "token",
      );
      expect(postCall).toBeTruthy();
      const payload = JSON.parse(postCall?.[1]?.body as string);
      expect(payload).toMatchObject({
        name: "Single Video Access",
        tier: "content",
        content_ids: ["content-1"],
        price: 499,
      });
    });
  });

  it("loads relational bundle domains into the form when editing", async () => {
    render(<ProductManagerPanel />);

    expect(await screen.findByText("Research Pack")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Edit Product" })).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Research Pack")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Target Tier" })).toHaveValue("bundle");
    expect(screen.getByRole("listbox", { name: "Pick Included Domains (Ctrl+Click)" })).toHaveValue(["dom-1", "dom-2"]);
  });

  it("confirms and deletes a product from the catalog", async () => {
    render(<ProductManagerPanel />);

    expect(await screen.findByText("Research Pack")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/v1/products/prod-1",
        { method: "DELETE" },
        "token",
      );
    });
  });
});
