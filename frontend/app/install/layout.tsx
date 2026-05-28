import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Install",
  description: "Add Corvo to your home screen. Works on iOS, Android, and desktop. Free, no app store required.",
  openGraph: {
    title: "Install Corvo - Free Portfolio Analytics",
    description: "Add Corvo to your home screen. Works on iOS, Android, and desktop. Free, no app store required.",
    url: "https://corvo.capital/install",
    siteName: "Corvo",
    images: [{ url: "https://corvo.capital/og-image.png?v=2", width: 1200, height: 630, alt: "Install Corvo" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Install Corvo",
    description: "Add Corvo to your home screen. Free, no app store required.",
    images: ["https://corvo.capital/og-image.png?v=2"],
  },
  alternates: { canonical: "https://corvo.capital/install" },
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
