import type { Metadata } from "next";
import BlogFilteredPosts from "./BlogFilteredPosts";
import BlogHero from "./BlogHero";

export const metadata: Metadata = {
  title: "Blog",
  description: "Investing insights, product updates, and financial education.",
  openGraph: {
    title: "Blog - Corvo",
    description: "Investing insights, product updates, and financial education.",
    url: "https://corvo.capital/blog",
    siteName: "Corvo",
    type: "website",
  },
};


export default function BlogIndexPage() {
  return (
    <div>
      <style>{`
        @keyframes fadeinUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .blog-hero { padding: 80px 56px 64px; }
        .blog-cats { padding: 0 56px 48px; }
        .blog-pad { padding: 0 56px 100px; }
        @media(max-width:768px){
          .blog-hero { padding: 80px 20px 40px !important; }
          .blog-cats { padding: 0 20px 32px !important; }
          .blog-pad { padding: 0 20px 64px !important; }
          .blog-cards-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* Hero */}
      <BlogHero />

      <BlogFilteredPosts />
    </div>
  );
}
