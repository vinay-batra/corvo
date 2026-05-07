import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "FAQ",
  description: "Common questions about Corvo's portfolio analytics platform.",
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
