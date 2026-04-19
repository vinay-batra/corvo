import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn | Corvo",
  description: "Level up your investing knowledge with Corvo Learn: interactive lessons, mini-games, and XP rewards covering Sharpe ratio, diversification, and more.",
  robots: { index: false, follow: false },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
