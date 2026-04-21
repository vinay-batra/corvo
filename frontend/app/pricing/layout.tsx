import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | Free Portfolio Analytics Tools",
  description: "Corvo is free forever for core features. See what's included in the free plan vs Pro. No credit card required to get started.",
  openGraph: { title: "Corvo Pricing | Free Portfolio Analytics", description: "Free forever for core portfolio analytics. Compare free vs Pro features.", url: "https://corvo.capital/pricing" },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
