import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Corvo vs Bloomberg Terminal 2026: Free Alternative with AI Analytics",
  description: "Compare Corvo vs Bloomberg Terminal. Get Bloomberg-quality portfolio analytics: Sharpe ratio, Monte Carlo simulation, AI insights. Completely free. No $2,000/month subscription.",
  openGraph: {
    title: "Corvo vs Bloomberg Terminal 2026: Free Alternative with AI Analytics",
    description: "Institutional-grade portfolio analytics at $0/month. See how Corvo stacks up against Bloomberg Terminal.",
    url: "https://corvo.capital/compare/bloomberg",
  },
  alternates: { canonical: "https://corvo.capital/compare/bloomberg" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
