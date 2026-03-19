import LegalPageLayout from "@/components/LegalPageLayout";
import Link from "next/link";

export default function PrivacyPolicy() {
  const sections = [
    { id: "intro", title: "1. Introduction" },
    { id: "collection", title: "2. Information Collection" },
    { id: "usage", title: "3. Use of Information" },
    { id: "sharing", title: "4. Information Sharing" },
    { id: "security", title: "5. Data Security" },
    { id: "rights", title: "6. Your Privacy Rights" },
    { id: "cookies", title: "7. Cookies & Tracking" },
    { id: "contact", title: "8. Contact Us" },
  ];

  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="March 20, 2026"
      sections={sections}
    >
      <section id="intro">
        <h2>1. Introduction</h2>
        <p>
          Welcome to <strong>Aether Digital Library (LMS)</strong>. We value your privacy and are committed to protecting your personal data in accordance with the <strong>Digital Personal Data Protection (DPDP) Act 2023 (India)</strong> and other applicable global standards.
        </p>
        <p>
          This policy explains how we collect, use, and safeguard your information and outlines your rights as a "Data Principal."
        </p>
      </section>

      <section id="collection">
        <h2>2. Information Collection</h2>
        <p>
          We collect information that you provide directly to us when you create an account, purchase a subscription, or interact with our learning materials.
        </p>
        <ul>
          <li><strong>Personal Data:</strong> Name, email address, billing address, and phone number.</li>
          <li><strong>Academic Data:</strong> Course progress, quiz scores, and certificate history.</li>
          <li><strong>Technical Data:</strong> IP address, browser type, and device information.</li>
        </ul>
      </section>

      <section id="usage">
        <h2>3. Use of Information</h2>
        <p>
          Your information is used to provide and improve our educational services. Specifically:
        </p>
        <ul>
          <li>To manage your account and subscriptions.</li>
          <li>To personalize your learning experience.</li>
          <li>To process payments via secure gateways like Razorpay.</li>
          <li>To send important updates regarding your courses and account.</li>
        </ul>
      </section>

      <section id="sharing">
        <h2>4. Information Sharing</h2>
        <p>
          We do not sell your personal data to third parties. We only share information with:
        </p>
        <ul>
          <li><strong>Service Providers:</strong> Payment processors (Razorpay), hosting providers, and analytics services.</li>
          <li><strong>Institutions:</strong> If you are part of a corporate or academic institution, your progress may be shared with your organization's administrator.</li>
          <li><strong>Legal Requirements:</strong> When required by law or to protect our legal rights.</li>
        </ul>
      </section>

      <section id="security">
        <h2>5. Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your data from unauthorized access, alteration, or disclosure. All payment transactions are encrypted using SSL technology.
        </p>
      </section>

      <section id="rights">
        <h2>6. Your Privacy Rights (DPDP Act)</h2>
        <p>
          As a Data Principal under the DPDP Act 2023, you have the following rights:
        </p>
        <ul>
          <li><strong>Right to Access:</strong> See what data we hold about you.</li>
          <li><strong>Right to Correction:</strong> Update outdated or incorrect information.</li>
          <li><strong>Right to Erasure:</strong> Request deletion of your personal data.</li>
          <li><strong>Right to Grievance Redressal:</strong> File a complaint regarding data handling.</li>
        </ul>
        <p>
          You can exercise most of these rights through your <Link href="/dashboard" className="text-ember hover:underline">User Dashboard</Link>.
        </p>
      </section>

      <section id="cookies">
        <h2>7. Cookies & Tracking</h2>
        <p>
          We use cookies to enhance your experience. Cookies help us remember your login session and preferences. For more details, please see our dedicated <a href="/cookies">Cookies Policy</a>.
        </p>
      </section>

      <section id="contact">
        <h2>8. Contact Us & Data Protection Officer</h2>
        <p>
          If you have any questions about this Privacy Policy or wish to exercise your rights, please contact our <strong>Data Protection Officer (DPO)</strong>:
        </p>
        <p>
          <strong>Name:</strong> Mr. Manish Kumar (DPO)<br />
          <strong>Email:</strong> dpo@aetherlms.com<br />
          <strong>Address:</strong> A-118, 1st Floor, Sector 63, Noida, Uttar Pradesh, 201301, IN
        </p>
      </section>
    </LegalPageLayout>
  );
}
