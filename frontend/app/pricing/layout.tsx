import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Corvo",
  description: "Corvo is free. See what's included and what's coming in Pro.",
  openGraph: { title: "Pricing — Corvo", description: "Corvo is free. See what's included and what's coming in Pro.", url: "https://corvo.capital/pricing" },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
