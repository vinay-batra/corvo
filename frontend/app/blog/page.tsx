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
        .blog-cta-inner { padding: 20px 32px; }
        @media(max-width:768px){
          .blog-hero { padding: 80px 20px 40px !important; }
          .blog-cats { padding: 0 20px 32px !important; }
          .blog-pad { padding: 0 20px 64px !important; }
          .blog-cards-grid { grid-template-columns: 1fr !important; }
          .blog-cta-wrap { margin: 0 20px 64px !important; }
          .blog-cta-inner { padding: 16px 20px !important; }
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
      <div className="blog-cta-wrap" style={{ maxWidth: 1100, marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 24px", flexWrap: "wrap", justifyContent: "center" }}>
          <p style={{ fontSize: 13, color: "rgba(232,224,204,0.5)", margin: 0 }}>Free during beta · No credit card required</p>
          <Link href="/auth" style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#c9a84c", color: "#0a0e14", textDecoration: "none", display: "inline-block", transition: "opacity 0.2s", flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            Start for free →
          </Link>
        </div>
      </div>
    </div>
  );
}
