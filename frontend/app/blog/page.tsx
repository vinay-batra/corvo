import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Corvo Blog - Investing Insights, Portfolio Strategy & Product Updates",
  description: "Investing insights, product updates, and portfolio strategy from the Corvo team. Learn how to analyze your portfolio like a professional investor.",
  openGraph: {
    title: "Corvo Blog - Investing Insights & Portfolio Strategy",
    description: "Investing insights, product updates, and portfolio strategy from the Corvo team.",
    url: "https://corvo.capital/blog",
    siteName: "Corvo",
    type: "website",
  },
};

const POSTS = [
  {
    slug: "bloomberg-alternative",
    title: "The Best Free Bloomberg Alternative in 2026",
    date: "April 8, 2026",
    readTime: "5 min read",
    category: "Strategy",
    categoryColor: "#c9a84c",
    excerpt: "Bloomberg costs $24,000 a year. Corvo is free. Here is what you are actually missing from a professional terminal, and what you are not.",
  },
  {
    slug: "how-to-calculate-sharpe-ratio",
    title: "How to Calculate Sharpe Ratio for Your Portfolio (And Why It Matters)",
    date: "April 5, 2026",
    readTime: "7 min read",
    category: "Education",
    categoryColor: "#8eb4c8",
    excerpt: "The Sharpe ratio is the single most useful number for understanding if your returns are worth the risk you are taking. Here is how to calculate and interpret it.",
  },
  {
    slug: "portfolio-diversification-guide",
    title: "The Complete Guide to Portfolio Diversification in 2026",
    date: "April 2, 2026",
    readTime: "8 min read",
    category: "Strategy",
    categoryColor: "#c9a84c",
    excerpt: "Most investors think they are diversified. Most are wrong. True diversification is about correlation, not the number of holdings. Here is how to measure it properly.",
  },
  {
    slug: "monte-carlo-simulation-investing",
    title: "What is Monte Carlo Simulation and Why Should Investors Care?",
    date: "March 28, 2026",
    readTime: "6 min read",
    category: "Education",
    categoryColor: "#8eb4c8",
    excerpt: "Running 300 simulations of your portfolio's future is the best way to understand your real retirement risk. Here is how it works in plain English.",
  },
];

const CATEGORIES = ["All", "Strategy", "Education", "Product", "Markets"];

export default function BlogIndexPage() {
  return (
    <div>
      <style>{`
        .blog-hero { padding: 80px 56px 64px; }
        .blog-cats { padding: 0 56px 48px; }
        .blog-pad { padding: 0 56px 100px; }
        .blog-cta-wrap { margin: 0 56px 100px; }
        .blog-cta-inner { padding: 48px 56px; }
        @media(max-width:768px){
          .blog-hero { padding: 80px 20px 40px !important; }
          .blog-cats { padding: 0 20px 32px !important; }
          .blog-pad { padding: 0 20px 64px !important; }
          .blog-cards-grid { grid-template-columns: 1fr !important; }
          .blog-cta-wrap { margin: 0 20px 64px !important; }
          .blog-cta-inner { padding: 32px 24px !important; }
        }
      `}</style>
      {/* Hero */}
      <div className="blog-hero" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 24, marginBottom: 28, background: "rgba(201,168,76,0.06)", animation: "fadein 0.6s ease 0.1s both" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block" }} />
          <span style={{ fontSize: 10, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase" }}>Corvo Blog</span>
        </div>
        <h1 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(28px,5vw,58px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -2, lineHeight: 1.08, marginBottom: 20, animation: "fadein 0.8s ease 0.15s both" }}>
          Investing insights.<br />
          <span style={{ color: "#c9a84c" }}>Portfolio strategy.</span>
        </h1>
        <p style={{ fontSize: 17, color: "rgba(232,224,204,0.42)", fontWeight: 300, lineHeight: 1.75, maxWidth: 560, animation: "fadein 0.8s ease 0.25s both" }}>
          Investing insights, product updates, and portfolio strategy from the Corvo team.
        </p>
      </div>

      {/* Category pills */}
      <div className="blog-cats" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CATEGORIES.map((cat, i) => (
            <span key={cat} style={{
              padding: "6px 16px", borderRadius: 24, fontSize: 11, letterSpacing: 0.5, cursor: "default",
              background: i === 0 ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${i === 0 ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.08)"}`,
              color: i === 0 ? "#c9a84c" : "rgba(232,224,204,0.4)",
            }}>{cat}</span>
          ))}
        </div>
      </div>

      {/* Article grid */}
      <div className="blog-pad" style={{ padding: "0 56px 100px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="blog-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 24 }}>
          {POSTS.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: 9, padding: "3px 10px", borderRadius: 20, background: `${post.categoryColor}18`, border: `1px solid ${post.categoryColor}30`, color: post.categoryColor, letterSpacing: 0.5, textTransform: "uppercase" as const }}>{post.category}</span>
                <span style={{ fontSize: 10, color: "rgba(232,224,204,0.28)" }}>{post.readTime}</span>
              </div>
              <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: 18, fontWeight: 700, color: "#e8e0cc", letterSpacing: -0.6, lineHeight: 1.3, marginBottom: 14 }}>{post.title}</h2>
              <p style={{ fontSize: 14, color: "rgba(232,224,204,0.48)", lineHeight: 1.7, marginBottom: 24, fontWeight: 300 }}>{post.excerpt}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/corvo-logo.svg" width={11} height={10} alt="" style={{ opacity: 0.8 }} />
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(232,224,204,0.35)" }}>Corvo Team</span>
                </div>
                <span style={{ fontSize: 11, color: "rgba(232,224,204,0.28)" }}>{post.date}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA banner */}
      <div className="blog-cta-wrap" style={{ maxWidth: 1100, marginLeft: "auto", marginRight: "auto" }}>
        <div className="blog-cta-inner" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 20, textAlign: "center" }}>
          <p style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(20px,3vw,32px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1, marginBottom: 14 }}>Ready to analyze your portfolio?</p>
          <p style={{ fontSize: 15, color: "rgba(232,224,204,0.4)", fontWeight: 300, marginBottom: 28, maxWidth: 480, margin: "0 auto 28px" }}>
            Free institutional-grade analytics. Monte Carlo simulation, Sharpe ratio, AI chat, and more. No subscription required.
          </p>
          <Link href="/auth" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 36px", background: "#c9a84c", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#0a0e14", textDecoration: "none" }}>
            Start for free →
          </Link>
        </div>
      </div>
    </div>
  );
}
