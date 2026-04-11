import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "About | Corvo",
  description: "Corvo started as a frustration with existing tools. We believe every retail investor deserves institutional-grade analytics — free.",
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
