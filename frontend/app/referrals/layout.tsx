import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Referrals | Corvo",
  description: "Invite friends to Corvo and earn bonus AI chat messages for every signup. Share your referral link, track conversions, and unlock more portfolio insights.",
  robots: { index: false, follow: false },
};

export default function ReferralsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
