import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | Corvo",
  description: "Corvo is 100% free during beta. Bloomberg-quality portfolio analytics with no credit card required. Pro tier coming soon.",
  openGraph: {
    title: "Pricing | Corvo",
    description: "Free during beta — Bloomberg-quality portfolio analytics for everyone. Pro tier coming soon.",
    url: "https://corvo.capital/pricing",
    siteName: "Corvo",
    images: [{ url: "https://corvo.capital/og-image.png", width: 1200, height: 630 }],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
