"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export interface TocItem { id: string; title: string }
export interface RelatedPost { slug: string; title: string; category: string; categoryColor: string; readTime: string; excerpt: string }

const CATEGORY_COLORS: Record<string, string> = {
  Strategy: "#c9a84c",
  Education: "#8eb4c8",
  Product: "#5cb88a",
  Markets: "#e07b5c",
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "#c9a84c";
}

interface BlogPostProps {
  title: string;
  date: string;
  readTime: string;
  category: string;
  description: string;
  toc: TocItem[];
  related: RelatedPost[];
  children: React.ReactNode;
}

export default function BlogPost({ title, date, readTime, category, description, toc, related, children }: BlogPostProps) {
  const [activeId, setActiveId] = useState<string>(toc[0]?.id ?? "");

  useEffect(() => {
    if (toc.length === 0) return;
    const onScroll = () => {
      const scrollY = window.scrollY + 120;
      let current = toc[0].id;
      for (const item of toc) {
        const el = document.getElementById(item.id);
        if (el && el.offsetTop <= scrollY) current = item.id;
      }
      setActiveId(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [toc]);

  const catColor = categoryColor(category);

  return (
    <div>
      {/* Hero */}
      <div className="blog-hero-pad" style={{ padding: "80px 56px 48px", maxWidth: 1200, margin: "0 auto", animation: "fadein 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <Link href="/blog" style={{ fontSize: 12, color: "rgba(232,224,204,0.4)", textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#c9a84c")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(232,224,204,0.4)")}>
            Blog
          </Link>
          <span style={{ color: "rgba(232,224,204,0.2)", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: `${catColor}18`, border: `1px solid ${catColor}30`, color: catColor, letterSpacing: 0.5 }}>{category}</span>
        </div>
        <h1 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(24px,4vw,46px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5, lineHeight: 1.12, maxWidth: 800, marginBottom: 20 }}>
          {title}
        </h1>
        <p style={{ fontSize: 17, color: "rgba(232,224,204,0.45)", fontWeight: 300, maxWidth: 680, lineHeight: 1.7, marginBottom: 28 }}>{description}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/corvo-logo.svg" width={16} height={14} alt="Corvo" style={{ opacity: 0.85 }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#e8e0cc", lineHeight: 1 }}>Corvo Team</p>
              <p style={{ fontSize: 10, color: "rgba(232,224,204,0.35)", marginTop: 3 }}>corvo.capital</p>
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)" }} />
          <p style={{ fontSize: 12, color: "rgba(232,224,204,0.4)" }}>{date}</p>
          <p style={{ fontSize: 12, color: "rgba(232,224,204,0.4)" }}>{readTime}</p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(201,168,76,0.15), transparent)", maxWidth: 1200, margin: "0 auto" }} />

      {/* Content grid */}
      <div className="blog-content-grid" style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 64, maxWidth: 1200, margin: "0 auto", padding: "56px 56px 80px", alignItems: "start" }}>
        {/* Article */}
        <article className="prose">
          {children}
        </article>

        {/* ToC */}
        <aside className="blog-toc-col" style={{ position: "sticky", top: 80 }}>
          <p style={{ fontSize: 9, letterSpacing: 2.5, color: "rgba(201,168,76,0.55)", textTransform: "uppercase", marginBottom: 16, paddingLeft: 12 }}>On this page</p>
          <nav>
            {toc.map(item => (
              <a key={item.id} href={`#${item.id}`} className={`toc-link${activeId === item.id ? " active" : ""}`}>
                {item.title}
              </a>
            ))}
          </nav>
          <div style={{ marginTop: 32, padding: "20px", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 12 }}>
            <p style={{ fontSize: 11, color: "#e8e0cc", fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>Analyze your own portfolio</p>
            <p style={{ fontSize: 10, color: "rgba(232,224,204,0.4)", marginBottom: 14, lineHeight: 1.55 }}>Free institutional-grade portfolio analytics.</p>
            <Link href="/auth" style={{ display: "block", textAlign: "center" as const, padding: "9px 16px", background: "#c9a84c", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#0a0e14", textDecoration: "none" }}>Get started free</Link>
          </div>
        </aside>
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <div className="blog-related-pad" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "64px 56px 0", maxWidth: 1200, margin: "0 auto" }}>
          <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 32 }}>Related Articles</p>
          <div className="blog-cards-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(related.length, 3)},1fr)`, gap: 20, marginBottom: 80 }}>
            {related.map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card" style={{ textDecoration: "none" }}>
                <span style={{ fontSize: 9, padding: "3px 9px", borderRadius: 20, background: `${post.categoryColor}18`, border: `1px solid ${post.categoryColor}30`, color: post.categoryColor, letterSpacing: 0.5, marginBottom: 14, display: "inline-block" }}>{post.category}</span>
                <h3 style={{ fontFamily: "Space Mono,monospace", fontSize: 15, fontWeight: 700, color: "#e8e0cc", letterSpacing: -0.5, lineHeight: 1.35, marginBottom: 10 }}>{post.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(232,224,204,0.45)", lineHeight: 1.6, marginBottom: 16, fontWeight: 300 }}>{post.excerpt}</p>
                <p style={{ fontSize: 10, color: "rgba(232,224,204,0.28)" }}>{post.readTime}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CtaBox({ text = "Try this in Corvo free", href = "/app" }: { text?: string; href?: string }) {
  return (
    <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 16, padding: "32px 36px", margin: "44px 0", textAlign: "center" as const }}>
      <p style={{ fontFamily: "Space Mono,monospace", fontSize: 18, fontWeight: 700, color: "#e8e0cc", letterSpacing: -0.5, marginBottom: 10 }}>See this in your own portfolio</p>
      <p style={{ fontSize: 14, color: "rgba(232,224,204,0.45)", marginBottom: 24, lineHeight: 1.7, fontWeight: 300 }}>
        Corvo calculates these metrics automatically for your real holdings. Free, no subscription required.
      </p>
      <Link href={href} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 32px", background: "#c9a84c", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#0a0e14", textDecoration: "none" }}>
        {text} →
      </Link>
    </div>
  );
}
