"use client";

import React from "react";

export default function Footer() {
  return (
    <footer className="footer-root" style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.04)", padding: "26px 56px" }}>
      <style>{`
        .footer-link:hover { color: #c9a84c !important; }
        .footer-x-link:hover { color: #c9a84c !important; }
        @media(max-width: 600px) {
          .footer-inner { flex-direction: column !important; gap: 12px !important; text-align: center !important; }
          .footer-root { padding: 24px 20px !important; }
        }
      `}</style>
      <div className="footer-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/corvo-logo.svg" width={16} height={13} alt="Corvo" style={{ opacity: 0.5 }} />
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 10, fontWeight: 700, letterSpacing: 3, color: "rgba(232,224,204,0.2)" }}>CORVO</span>
          <span style={{ fontSize: 11, color: "rgba(232,224,204,0.15)", marginLeft: 8 }}>© 2026 Corvo. All rights reserved.</span>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <a href="/blog" className="footer-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>Blog</a>
          <a href="/about" className="footer-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>About</a>
          <a href="/pricing" className="footer-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>Pricing</a>
          <a href="/privacy" className="footer-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>Privacy</a>
          <a href="/terms" className="footer-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>Terms</a>
          <a href="/faq" className="footer-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>FAQ</a>
          <a href="/changelog" className="footer-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>Changelog</a>
          <a href="/compare/bloomberg" className="footer-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>vs Bloomberg</a>
          <a href="/compare/yahoo-finance" className="footer-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>vs Yahoo Finance</a>
          <a href="/compare/robinhood" className="footer-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>vs Robinhood</a>
          <a href="https://github.com/vinay-batra/corvo" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>GitHub</a>
          <a href="https://x.com/corvocapital" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="footer-x-link" style={{ color: "rgba(232,224,204,0.35)", textDecoration: "none", display: "flex", alignItems: "center", transition: "color 0.2s" }}>
            <svg width="12" height="12" viewBox="0 0 300 300" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
