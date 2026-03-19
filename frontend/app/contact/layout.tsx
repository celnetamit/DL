import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Digital Library",
  description: "Get in touch with our team for support or inquiries regarding our digital library platform.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
