import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyzer — Corvo",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
