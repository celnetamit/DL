import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PricingPage from "@/app/pricing/page";
import { vi } from "vitest";

const mockUseAuth = vi.fn();
const mockPush = vi.fn();
const mockApiFetch = vi.fn();
const mockCreateOrder = vi.fn();
const mockVerifyOrderPayment = vi.fn();
const mockRazorpayOn = vi.fn();
const mockRazorpayOpen = vi.fn();
let razorpayOptions: any = null;

vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/script", () => ({
  default: () => null,
}));

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
  verifyOrderPayment: (...args: unknown[]) => mockVerifyOrderPayment(...args),
}));

describe("PricingPage", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockCreateOrder.mockReset();
    mockVerifyOrderPayment.mockReset();
    mockRazorpayOn.mockReset();
    mockRazorpayOpen.mockReset();
    razorpayOptions = null;
    mockUseAuth.mockReturnValue({
      token: null,
      user: null,
      loading: false,
    });
    mockApiFetch.mockImplementation((path: string) => {
      if (path === "/api/v1/products") {
        return Promise.resolve([
          { id: "prod-1", name: "Research Pack", description: "Desc", price: 999, tier: "bundle" },
        ]);
      }
      if (path === "/api/v1/products/prod-1/stats") {
        return Promise.resolve({ content_count: 12 });
      }
      return Promise.resolve(null);
    });
    // @ts-expect-error test shim
    window.Razorpay = vi.fn().mockImplementation((options) => {
      razorpayOptions = options;
      return {
        on: mockRazorpayOn,
        open: mockRazorpayOpen,
      };
    });
  });

  it("redirects unauthenticated users to dashboard login flow from purchase", async () => {
    render(<PricingPage />);

    expect(await screen.findByText("Research Pack")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Purchase" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard?redirect=/pricing");
    });
    expect(await screen.findByText("Please sign in first to make a purchase.")).toBeInTheDocument();
  });

  it("verifies successful payments and redirects to the activated dashboard state", async () => {
    mockUseAuth.mockReturnValue({
      token: "token",
      user: { email: "buyer@example.com" },
      loading: false,
    });
    mockCreateOrder.mockResolvedValue({ order: { id: "order_123" } });
    mockVerifyOrderPayment.mockResolvedValue({ success: true });

    render(<PricingPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Purchase" }));

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith(
        { plan_code: "prod-1", amount: 99900, currency: "INR" },
        "token",
      );
    });
    expect(mockRazorpayOpen).toHaveBeenCalled();

    await act(async () => {
      await razorpayOptions.handler({
        razorpay_payment_id: "pay_123",
        razorpay_order_id: "order_123",
        razorpay_signature: "sig_123",
      });
    });

    await waitFor(() => {
      expect(mockVerifyOrderPayment).toHaveBeenCalledWith(
        {
          razorpay_payment_id: "pay_123",
          razorpay_order_id: "order_123",
          razorpay_signature: "sig_123",
        },
        "token",
      );
    });
    expect(await screen.findByText("Payment captured successfully and access has been activated.")).toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith("/dashboard?purchase=success");
  });
});
