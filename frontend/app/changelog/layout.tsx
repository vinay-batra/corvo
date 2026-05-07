import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — Corvo",
  description: "See everything we've shipped. We move fast.",
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
