import LegalPageLayout from "@/components/LegalPageLayout";

export default function PaymentPolicy() {
  const sections = [
    { id: "payments", title: "1. Payment Methods" },
    { id: "processing", title: "2. Order Processing" },
    { id: "shipping", title: "3. Shipping & Delivery" },
    { id: "cancellation", title: "4. Cancellation Policy" },
    { id: "refunds", title: "5. Refund Policy" },
    { id: "international", title: "6. International Orders" },
    { id: "contact", title: "7. Contact Us" },
  ];

  return (
    <LegalPageLayout
      title="Payment & Cancellation"
      lastUpdated="March 20, 2026"
      sections={sections}
    >
      <section id="payments">
        <h2>1. Payment Methods</h2>
        <p>
          Aether Digital Library accepts the following secure payment methods for all subscriptions and course materials:
        </p>
        <ul>
          <li><strong>Credit/Debit Cards:</strong> Visa, MasterCard, Maestro, American Express.</li>
          <li><strong>Net Banking:</strong> All major Indian and international banks.</li>
          <li><strong>UPI:</strong> Google Pay, PhonePe, Paytm, and other BHIM-embedded apps.</li>
          <li><strong>Wallets:</strong> Popular digital wallets supported by our payment gateway.</li>
        </ul>
        <p>
          All transactions are processed through <strong>Razorpay</strong>, ensuring your financial information remains encrypted and secure.
        </p>
      </section>

      <section id="processing">
        <h2>2. Order Processing</h2>
        <p>
          Once your payment is confirmed, your order is processed within <strong>24–48 hours</strong>.
        </p>
        <ul>
          <li>Digital products (E-books, online courses) are activated immediately upon payment confirmation.</li>
          <li>Physical journal subscriptions are processed and queued for the next available shipping cycle.</li>
        </ul>
      </section>

      <section id="shipping">
        <h2>3. Shipping & Delivery</h2>
        <p>
          For physical journals and printed materials:
        </p>
        <ul>
          <li><strong>Domestic (India):</strong> Delivery typically takes 5–7 business days after dispatch.</li>
          <li><strong>International:</strong> Delivery takes 10–15 business days depending on destination and customs clearance.</li>
          <li>Shipping charges (if any) are calculated at the time of checkout based on weight and destination.</li>
        </ul>
      </section>

      <section id="cancellation">
        <h2>4. Cancellation Policy</h2>
        <p>
          We understand that circumstances may change. Our cancellation rules are as follows:
        </p>
        <ul>
          <li><strong>Digital Subscriptions:</strong> You can cancel your subscription at any time. The cancellation will take effect at the end of the current billing cycle. No partial refunds are provided for the remaining period.</li>
          <li><strong>Physical Orders:</strong> Orders for physical journals can be canceled within 12 hours of placement, provided they have not yet been dispatched.</li>
        </ul>
      </section>

      <section id="refunds">
        <h2>5. Refund Policy</h2>
        <p>
          Refunds are issued under the following conditions:
        </p>
        <ul>
          <li>If an order was canceled by the system due to unavailability or pricing errors.</li>
          <li>If a duplicate payment was made accidentally for the same service.</li>
          <li>If a physical product received was damaged or incorrect (subject to verification).</li>
        </ul>
        <p>
          Refunds are processed back to the original payment method within <strong>7–10 business days</strong>.
        </p>
      </section>

      <section id="international">
        <h2>6. International Orders</h2>
        <p>
          For international customers, prices are shown in USD. Customs duties, import taxes, or local handling fees (if applicable) are the responsibility of the recipient.
        </p>
      </section>

      <section id="contact">
        <h2>7. Contact Us</h2>
        <p>
          For any billing or shipping related queries, please contact our accounts team:
        </p>
        <p>
          <strong>Email:</strong> accounts@aetherlms.com<br />
          <strong>Phone:</strong> +91 98100 78958
        </p>
      </section>
    </LegalPageLayout>
  );
}
