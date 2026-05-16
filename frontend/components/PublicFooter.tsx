"use client";

import React from "react";

const PRODUCT_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Install", href: "/install" },
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
];

const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "GitHub", href: "https://github.com/vinay-batra/corvo", external: true },
];

export default function PublicFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "48px 56px" }}>
      <style>{`
        .pf-link { font-size: 13px; color: var(--text); text-decoration: none; opacity: 0.75; transition: opacity 0.15s; display: block; margin-bottom: 10px; }
        .pf-link:hover { opacity: 1; }
        @media (max-width: 768px) {
          .pf-inner { flex-direction: column !important; gap: 36px !important; }
          .pf-right { justify-content: flex-start !important; }
        }
      `}</style>
      <div className="pf-inner" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>

        {/* Left: wordmark + tagline + copyright */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/corvo-logo.png?v=2" width={38} height={38} alt="Corvo" style={{ filter: "drop-shadow(0 0 4px rgba(201,168,76,0.2))" }} />
            <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "var(--text)" }}>CORVO</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5, margin: 0 }}>
            Your portfolio, with a point of view.
          </p>
          <p style={{ fontSize: 11, color: "var(--text3)", margin: 0 }}>
            &copy; 2026 Corvo. All rights reserved.
          </p>
        </div>

        {/* Right: two link groups */}
        <div className="pf-right" style={{ display: "flex", gap: 48, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--text2)", marginBottom: 14 }}>Product</div>
            {PRODUCT_LINKS.map(({ label, href }) => (
              <a key={label} href={href} className="pf-link">{label}</a>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--text2)", marginBottom: 14 }}>Legal &amp; More</div>
            {LEGAL_LINKS.map(({ label, href, external }) => (
              <a
                key={label}
                href={href}
                className="pf-link"
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {label}
              </a>
            ))}
          </div>
        </div>

      </div>

      {/* Large standalone logo mark at the bottom - brand presence beneath
          the content row. Muted opacity so it reads as a watermark, not a
          competing CTA. */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
        <img
          src="/corvo-logo.png?v=2"
          alt="Corvo"
          width={88}
          height={88}
          style={{ opacity: 0.5, filter: "drop-shadow(0 2px 10px rgba(201,168,76,0.18))" }}
        />
      </div>
    </footer>
  );
}
