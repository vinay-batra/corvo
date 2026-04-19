import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog | Corvo",
  description: "See every feature shipped in Corvo: portfolio analytics improvements, new AI capabilities, bug fixes, and upcoming changes. Updated with every release.",
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
