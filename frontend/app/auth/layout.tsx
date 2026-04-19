import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Corvo",
  description: "Sign in to Corvo to access your saved portfolios, AI insights, watchlists, and account settings. New users can sign up for free in seconds.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
