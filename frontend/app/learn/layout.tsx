import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn — Corvo",
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
