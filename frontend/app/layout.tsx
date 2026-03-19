import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-plex",
});

const space = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-space",
});

export const metadata: Metadata = {
  title: "Digital Library",
  description: "Advanced digital library and learning platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${plex.variable} ${space.variable} font-sans`}>
        <Navbar />
        <div className="min-h-[calc(100vh-56px)]">{children}</div>
      </body>
    </html>
  );
}
