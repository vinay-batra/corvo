import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "FAQ | Corvo",
  description: "Everything you need to know about Corvo: how portfolio analysis works, what data we use, privacy, pricing, and how to get the most out of your analytics.",
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
