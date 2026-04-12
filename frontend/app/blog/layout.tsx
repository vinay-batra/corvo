"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  const [navSolid, setNavSolid] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
    { href: "/about", label: "About" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e14", color: "#e8e0cc", fontFamily: "Inter,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
        .bl-nl{padding:7px 14px;font-size:12px;color:rgba(232,224,204,0.45);text-decoration:none;letter-spacing:0.3px;transition:color 0.2s}
        .bl-nl:hover{color:#c9a84c}
        .bl-nl.active{color:#c9a84c}
        .cta{transition:all 0.25s!important}.cta:hover{background:#d4b558!important;transform:translateY(-2px)!important}
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
          .blog-nav-links{display:none!important}
          .blog-cards-grid{grid-template-columns:1fr!important}
          .blog-content-grid{display:block!important}
          .blog-toc-col{display:none!important}
          .blog-pad{padding:48px 20px 80px!important}
          .blog-hero-pad{padding:80px 20px 48px!important}
          .blog-footer-inner{flex-direction:column!important;gap:12px!important;text-align:center!important}
          .blog-footer-links{justify-content:center!important}
        }
      `}</style>

      {/* Fixed grid bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.025) 1px, transparent 1px),linear-gradient(90deg, rgba(201,168,76,0.025) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
      </div>

      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 58,
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 56px",
        background: navSolid ? "rgba(10,14,20,0.97)" : "rgba(10,14,20,0.6)",
        backdropFilter: "blur(20px)",
        borderBottom: navSolid ? "1px solid rgba(201,168,76,0.1)" : "1px solid rgba(201,168,76,0.04)",
        transition: "background 0.4s cubic-bezier(0.16,1,0.3,1), border-color 0.4s",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <img src="/corvo-logo.svg" width={24} height={24} alt="Corvo" />
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "#e8e0cc" }}>CORVO</span>
        </Link>
        <div className="blog-nav-links" style={{ display: "flex", gap: 2, alignItems: "center" }}>
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={`bl-nl${pathname?.startsWith("/blog") && label === "Blog" ? " active" : ""}`}>{label}</Link>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/auth" style={{ padding: "7px 16px", fontSize: 12, color: "rgba(232,224,204,0.4)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.color = "rgba(232,224,204,0.7)")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(232,224,204,0.4)")}>Sign in</Link>
          <Link href="/auth" className="cta" style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, background: "#c9a84c", borderRadius: 8, color: "#0a0e14", textDecoration: "none" }}>Get Started Free</Link>
        </div>
      </nav>

      <main style={{ paddingTop: 58, position: "relative", zIndex: 1 }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.04)", padding: "26px 56px", marginTop: 80 }}>
        <div className="blog-footer-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/corvo-logo.svg" width={16} height={13} alt="Corvo" style={{ opacity: 0.5 }} />
            <span style={{ fontFamily: "Space Mono,monospace", fontSize: 10, fontWeight: 700, letterSpacing: 3, color: "rgba(232,224,204,0.2)" }}>CORVO</span>
            <span style={{ fontSize: 11, color: "rgba(232,224,204,0.15)", marginLeft: 8 }}>© 2026 Corvo. All rights reserved.</span>
          </div>
          <div className="blog-footer-links" style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { href: "/blog", label: "Blog", active: true },
              { href: "/about", label: "About" },
              { href: "/pricing", label: "Pricing" },
              { href: "/faq", label: "FAQ" },
              { href: "/privacy", label: "Privacy" },
              { href: "/terms", label: "Terms" },
            ].map(({ href, label, active }) => (
              <Link key={href} href={href} style={{ fontSize: 11, color: active ? "#c9a84c" : "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#c9a84c")}
                onMouseLeave={e => (e.currentTarget.style.color = active ? "#c9a84c" : "rgba(232,224,204,0.35)")}>{label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
