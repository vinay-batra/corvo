import type { Metadata } from "next";
export const metadata: Metadata = { title: "FAQ | Corvo", description: "Frequently asked questions about Corvo — AI-powered portfolio analytics." };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
