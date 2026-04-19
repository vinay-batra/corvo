import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Terms of Service | Corvo",
  description: "Read Corvo's Terms of Service: your rights and responsibilities when using our portfolio analytics platform, including data use and account rules.",
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
