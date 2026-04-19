import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Privacy Policy | Corvo",
  description: "Corvo's Privacy Policy explains how we collect, use, and protect your portfolio data. We take data privacy seriously and never sell your information.",
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
