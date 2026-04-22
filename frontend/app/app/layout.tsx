import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyzer",
  description: "Build, analyze, and compare investment portfolios with Corvo's analyzer. Add tickers, run Monte Carlo simulation, view AI insights, and track portfolio risk.",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
