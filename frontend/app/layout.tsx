import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corvo — Portfolio Intelligence",
  description: "AI-powered portfolio analysis. Sharpe ratio, Monte Carlo simulation, health score, and AI chat for your investments.",
  openGraph: {
    title: "Corvo — Portfolio Intelligence",
    description: "AI-powered portfolio analysis. Sharpe ratio, Monte Carlo simulation, health score, and AI chat for your investments.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ background: "#0a0e14" }}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body style={{ margin: 0, background: "#0d1117" }}>{children}</body>
    </html>
  );
}
