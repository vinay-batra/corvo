import type { Metadata } from "next";
import Link from "next/link";
import BlogFilteredPosts from "./BlogFilteredPosts";

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

      <BlogFilteredPosts />

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
