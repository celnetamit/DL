import LegalPageLayout from "@/components/LegalPageLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies Policy | Digital Library",
  description: "Learn how we use cookies to improve your learning experience.",
};

export default function CookiesPolicy() {
  const sections = [
    { id: "what", title: "1. What are Cookies?" },
    { id: "types", title: "2. Types of Cookies We Use" },
    { id: "why", title: "3. Why We Use Cookies" },
    { id: "managing", title: "4. Managing Your Cookies" },
    { id: "third", title: "5. Third-Party Cookies" },
  ];

  return (
    <LegalPageLayout
      title="Cookies Policy"
      lastUpdated="March 20, 2026"
      sections={sections}
    >
      <section id="what">
        <h2>1. What are Cookies?</h2>
        <p>
          Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently and provide information to the owners of the site.
        </p>
      </section>

      <section id="types">
        <h2>2. Types of Cookies We Use</h2>
        <ul>
          <li><strong>Essential Cookies:</strong> These are required for the website to function. They handle login sessions and secure areas of the platform.</li>
          <li><strong>Performance Cookies:</strong> These help us understand how visitors interact with our site by collecting anonymous information (e.g., Google Analytics).</li>
          <li><strong>Functionality Cookies:</strong> These remember your preferences, such as your language or selected theme.</li>
        </ul>
      </section>

      <section id="why">
        <h2>3. Why We Use Cookies</h2>
        <p>
          We use cookies to:
        </p>
        <ul>
          <li>Keep you logged in across different pages.</li>
          <li>Remember your course progress as you navigate the platform.</li>
          <li>Analyze how our features are used so we can improve them.</li>
          <li>Secure your account and prevent fraudulent login attempts.</li>
        </ul>
      </section>

      <section id="managing">
        <h2>4. Managing Your Cookies</h2>
        <p>
          Most web browsers allow you to control cookies through their settings. You can choose to block all cookies or only third-party cookies. However, please be aware that blocking essential cookies will prevent you from logging into your Aether LMS account.
        </p>
      </section>

      <section id="third">
        <h2>5. Third-Party Cookies</h2>
        <p>
          In addition to our own cookies, we may also use various third-party cookies to report usage statistics and deliver advertisements. These include:
        </p>
        <ul>
          <li><strong>Google Analytics:</strong> For tracking website traffic and patterns.</li>
          <li><strong>Razorpay:</strong> To facilitate secure and seamless payment flows.</li>
        </ul>
      </section>
    </LegalPageLayout>
  );
}
