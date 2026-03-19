import LegalPageLayout from "@/components/LegalPageLayout";

export default function ConsentPage() {
  const sections = [
    { id: "intro", title: "1. Understanding Consent" },
    { id: "processing", title: "2. Data Processing Consent" },
    { id: "marketing", title: "3. Marketing & Notifications" },
    { id: "withdrawal", title: "4. Withdrawal of Consent" },
    { id: "minors", title: "5. Consent for Minors" },
  ];

  return (
    <LegalPageLayout
      title="User Consent"
      lastUpdated="March 20, 2026"
      sections={sections}
    >
      <section id="intro">
        <h2>1. Understanding Consent</h2>
        <p>
          At <strong>Aether Digital Library</strong>, we believe in transparency. This document explains how we obtain your consent to collect and process your information, and how you can manage that consent.
        </p>
      </section>

      <section id="processing">
        <h2>2. Data Processing Consent</h2>
        <p>
          By creating an account or using our services, you provide your explicit consent for us to process your personal data (such as name, email, and learning progress) to deliver our services. This includes:
        </p>
        <ul>
          <li>Processing payments for your subscriptions.</li>
          <li>Tracking your course progress and generating certificates.</li>
          <li>Providing personalized content recommendations.</li>
        </ul>
      </section>

      <section id="marketing">
        <h2>3. Marketing & Notifications</h2>
        <p>
          We may occasionally send you emails about new courses, feature updates, or academic journals. You provide consent for these communications when you sign up. You can opt-out of these at any time via the "Unsubscribe" link in our emails or through your Dashboard settings.
        </p>
      </section>

      <section id="withdrawal">
        <h2>4. Withdrawal of Consent</h2>
        <p>
          You have the right to withdraw your consent for data processing at any time. To do so, you may delete your account or contact our support team. Please note that withdrawing consent may result in the termination of your access to our services, as certain data is essential for operating the platform.
        </p>
      </section>

      <section id="minors">
        <h2>5. Consent for Minors</h2>
        <p>
          Our platform is intended for users who are at least 18 years old or have the consent of a parent or guardian. If we learn that we have collected data from a minor without proper consent, we will take steps to delete that information promptly.
        </p>
      </section>
    </LegalPageLayout>
  );
}
