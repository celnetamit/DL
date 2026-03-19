import LegalPageLayout from "@/components/LegalPageLayout";

export default function TermsAndConditions() {
  const sections = [
    { id: "acceptance", title: "1. Acceptance of Terms" },
    { id: "usage", title: "2. Use of the Website" },
    { id: "ip", title: "3. Intellectual Property Rights" },
    { id: "products", title: "4. Product Descriptions" },
    { id: "payments", title: "5. Pricing and Payment" },
    { id: "cancellation", title: "6. Order Cancellation" },
    { id: "shipping", title: "7. Shipping and Delivery" },
    { id: "refunds", title: "8. Returns and Refunds" },
    { id: "accounts", title: "9. User Accounts" },
    { id: "liability", title: "10. Limitation of Liability" },
    { id: "indemnity", title: "11. Indemnification" },
    { id: "law", title: "12. Governing Law" },
  ];

  return (
    <LegalPageLayout
      title="Terms & Conditions"
      lastUpdated="March 20, 2026"
      sections={sections}
    >
      <section id="acceptance">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing, browsing, or using the <strong>Aether Digital Library</strong> website, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions, along with our Privacy Policy. If you do not agree to these terms, please do not use this website.
        </p>
      </section>

      <section id="usage">
        <h2>2. Use of the Website</h2>
        <p>
          You agree to use this website only for lawful purposes related to academic and professional learning. Prohibited behavior includes:
        </p>
        <ul>
          <li>Engaging in any unlawful activity or transmitting harmful content.</li>
          <li>Attempting to gain unauthorized access to the platform's internal systems.</li>
          <li>Exploiting the platform for commercial gain without written consent.</li>
        </ul>
      </section>

      <section id="ip">
        <h2>3. Intellectual Property Rights</h2>
        <p>
          All content on Aether LMS, including text, graphics, logos, and course materials, is the property of Aether Digital Library or its content suppliers. Unauthorized reproduction or distribution is strictly prohibited.
        </p>
      </section>

      <section id="products">
        <h2>4. Product Descriptions</h2>
        <p>
          We strive to provide accurate descriptions of our journal subscriptions and digital courses. However, we do not warrant that descriptions are error-free. If a service is not as described, your sole remedy is to contact support for a resolution.
        </p>
      </section>

      <section id="payments">
        <h2>5. Pricing and Payment</h2>
        <p>
          Prices for subscriptions are listed in Indian Rupees (INR) and United States Dollars (USD).
        </p>
        <ul>
          <li>All prices are inclusive of applicable taxes unless stated otherwise.</li>
          <li>Prices are subject to change without prior notice.</li>
          <li>We accept secure payments via Razorpay (Credit/Debit Cards, Net Banking, UPI).</li>
        </ul>
      </section>

      <section id="cancellation">
        <h2>6. Order Cancellation</h2>
        <p>
          We reserve the right to refuse or cancel any order for reasons including product availability, pricing errors, or suspicion of fraudulent activity. If your order is canceled after payment, a full refund will be issued.
        </p>
      </section>

      <section id="shipping">
        <h2>7. Shipping and Delivery</h2>
        <p>
          Digital access to library materials is granted immediately upon successful payment. Physical journal copies follow our <a href="/payment-policy">Shipping Policy</a>.
        </p>
      </section>

      <section id="refunds">
        <h2>8. Returns and Refunds</h2>
        <p>
          Due to the nature of digital products, refunds for completed course access are generally not provided. Subscription cancellations are handled according to our Cancellation Policy.
        </p>
      </section>

      <section id="accounts">
        <h2>9. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials. Aether LMS is not liable for unauthorized access resulting from your failure to secure your account.
        </p>
      </section>

      <section id="liability">
        <h2>10. Limitation of Liability</h2>
        <p>
          Aether Digital Library shall not be liable for any incidental, indirect, or consequential damages arising from the use or inability to use our services.
        </p>
      </section>

      <section id="indemnity">
        <h2>11. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Aether Digital Library, its officers, and employees from any claims arising out of your misuse of the platform.
        </p>
      </section>

      <section id="law">
        <h2>12. Governing Law</h2>
        <p>
          These Terms & Conditions shall be governed by and construed in accordance with the laws of India. Disputes shall be subject to the exclusive jurisdiction of the courts in Delhi/Noida.
        </p>
      </section>
    </LegalPageLayout>
  );
}
