import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn Investing Free | Financial Education & Portfolio Quizzes",
  description: "Learn investing fundamentals for free. Interactive lessons on Sharpe ratio, Monte Carlo simulation, diversification, bonds, options and more. Earn XP as you learn.",
  openGraph: { title: "Learn Investing Free | Corvo", description: "Interactive financial education with quizzes, games and AI practice. Learn Sharpe ratio, Monte Carlo, diversification and more.", url: "https://corvo.capital/learn" },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
