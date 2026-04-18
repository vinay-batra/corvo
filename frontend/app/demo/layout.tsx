import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Tour | Corvo",
  description: "See what Corvo can do: interactive product tour of portfolio analytics, AI insights, Monte Carlo simulation, and more.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
