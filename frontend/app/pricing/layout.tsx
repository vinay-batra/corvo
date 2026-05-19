import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Corvo is free. See what's included and what's coming in Pro.",
  openGraph: {
    title: "Pricing - Corvo",
    description: "Corvo is free. See what's included and what's coming in Pro.",
    url: "https://corvo.capital/pricing",
    siteName: "Corvo",
    images: [{ url: "https://corvo.capital/og-image.png?v=2", width: 1200, height: 630, alt: "Corvo Pricing" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Pricing - Corvo",
    description: "Corvo is free. See what's included and what's coming in Pro.",
    images: ["https://corvo.capital/og-image.png?v=2"],
  },
  alternates: { canonical: "https://corvo.capital/pricing" },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
