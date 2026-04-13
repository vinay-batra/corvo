"use client";

import React from "react";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0e14", color: "#e8e0cc", fontFamily: "Inter,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
        .blog-card{background:rgba(255,255,255,0.022);border:1px solid rgba(201,168,76,0.1);border-radius:16px;padding:28px;text-decoration:none;color:inherit;display:block;transition:all 0.25s;position:relative;overflow:hidden}
        .blog-card:hover{border-color:rgba(201,168,76,0.25);background:rgba(255,255,255,0.035);transform:translateY(-2px);box-shadow:0 16px 48px rgba(0,0,0,0.4)}
        .toc-link{display:block;padding:6px 0 6px 12px;font-size:12px;color:rgba(232,224,204,0.38);text-decoration:none;border-left:2px solid transparent;transition:all 0.2s;line-height:1.45}
        .toc-link:hover{color:rgba(232,224,204,0.7);border-left-color:rgba(201,168,76,0.3)}
        .toc-link.active{color:#c9a84c;border-left-color:#c9a84c}
        .prose h2{font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:#e8e0cc;letter-spacing:-0.8px;margin:48px 0 16px;line-height:1.25}
        .prose h3{font-family:'Space Mono',monospace;font-size:16px;font-weight:700;color:rgba(232,224,204,0.85);letter-spacing:-0.4px;margin:32px 0 12px}
        .prose p{font-size:16px;line-height:1.82;color:rgba(232,224,204,0.72);margin-bottom:20px;font-weight:300}
        .prose ul,.prose ol{margin:0 0 20px 24px}
        .prose li{font-size:16px;line-height:1.75;color:rgba(232,224,204,0.68);margin-bottom:8px;font-weight:300}
        .prose strong{color:#e8e0cc;font-weight:600}
        .prose table{width:100%;border-collapse:collapse;margin:32px 0;font-size:13px}
        .prose th{text-align:left;padding:10px 16px;background:rgba(201,168,76,0.08);color:#c9a84c;font-family:'Space Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid rgba(201,168,76,0.15)}
        .prose td{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(232,224,204,0.65)}
        .prose tr:last-child td{border-bottom:none}
        .prose tr:nth-child(even) td{background:rgba(255,255,255,0.015)}
        @keyframes fadein{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:900px){
          .blog-cards-grid{grid-template-columns:1fr!important}
          .blog-content-grid{display:block!important}
          .blog-toc-col{display:none!important}
          .blog-pad{padding:48px 20px 80px!important}
          .blog-hero-pad{padding:80px 20px 48px!important}
        }
      `}</style>

      {/* Fixed grid bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.025) 1px, transparent 1px),linear-gradient(90deg, rgba(201,168,76,0.025) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
      </div>

      <PublicNav />

      <main style={{ paddingTop: 58, position: "relative", zIndex: 1 }}>
        {children}
      </main>

      <PublicFooter />
    </div>
  );
}
