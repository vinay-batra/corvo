"use client";

import React from "react";

const PRODUCT_LINKS = [
  { label: "Blog", href: "/blog" },
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
  { label: "FAQ", href: "/faq" },
  { label: "Install App", href: "/install" },
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/corvo-logo.svg" width={28} height={28} alt="Corvo" />
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
    </footer>
  );
}
