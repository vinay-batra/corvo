import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Corvo vs Yahoo Finance 2026: Better Portfolio Analytics for Free",
  description: "Compare Corvo vs Yahoo Finance. AI-powered portfolio insights, Monte Carlo simulation, tax loss harvesting and more — completely free. See why investors are switching.",
  openGraph: {
    title: "Corvo vs Yahoo Finance 2026: Better Portfolio Analytics for Free",
    description: "Deeper analytics than Yahoo Finance Premium, at $0/month. AI chat, risk metrics, and real-time alerts.",
    url: "https://corvo.capital/compare/yahoo-finance",
  },
  alternates: { canonical: "https://corvo.capital/compare/yahoo-finance" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
