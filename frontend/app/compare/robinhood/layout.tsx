import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Corvo vs Robinhood 2026: Deeper Portfolio Analysis for Serious Investors",
  description: "Compare Corvo vs Robinhood. Corvo adds AI chat, Monte Carlo simulation, Sharpe ratio, correlation heatmaps and more — all free. Built for investors who want real analytics.",
  openGraph: {
    title: "Corvo vs Robinhood 2026: Deeper Portfolio Analysis for Serious Investors",
    description: "Robinhood is for trading. Corvo is for understanding your portfolio. Get institutional-grade analytics free.",
    url: "https://corvo.capital/compare/robinhood",
  },
  alternates: { canonical: "https://corvo.capital/compare/robinhood" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
