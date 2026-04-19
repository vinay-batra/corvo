"use client";

import Link from "next/link";
import { useState } from "react";

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

export default function BlogFilteredPosts() {
  const [active, setActive] = useState("All");
  const filtered = active === "All" ? POSTS : POSTS.filter(p => p.category === active);

  return (
    <>
      {/* Category pills */}
      <div className="blog-cats" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => {
            const isActive = cat === active;
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                style={{
                  padding: "6px 16px", borderRadius: 24, fontSize: 11, letterSpacing: 0.5, cursor: "pointer",
                  background: isActive ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: isActive ? "#c9a84c" : "rgba(232,224,204,0.4)",
                  transition: "all 0.15s",
                  outline: "none",
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.18)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(232,224,204,0.65)"; } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(232,224,204,0.4)"; } }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Article grid */}
      <div className="blog-pad" style={{ padding: "0 56px 100px", maxWidth: 1100, margin: "0 auto" }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 14, color: "rgba(232,224,204,0.35)", padding: "40px 0" }}>No posts in this category yet.</p>
        ) : (
          <div className="blog-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 24 }}>
            {filtered.map((post) => (
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
        )}
      </div>
    </>
  );
}
