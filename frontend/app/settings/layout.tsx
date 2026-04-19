import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | Corvo",
  description: "Manage your Corvo account settings: update your profile, notification preferences, connected accounts, and subscription details all in one place.",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
