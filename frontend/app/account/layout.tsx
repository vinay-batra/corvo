import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account",
  description: "View and manage your Corvo account: subscription status, usage stats, referral earnings, and profile settings for your portfolio analytics workspace.",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
