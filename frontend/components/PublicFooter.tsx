"use client";

import React from "react";

export default function PublicFooter() {
  return (
    <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.04)", padding: "26px 56px" }}>
      <style>{`
        .pfooter-link:hover { color: #c9a84c !important; }
        @media(max-width: 600px) { .pfooter-inner { flex-direction: column !important; gap: 12px !important; text-align: center !important; } .pfooter-links { justify-content: center !important; } }
      `}</style>
      <div className="pfooter-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1100, margin: "0 auto", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/corvo-logo.svg" width={16} height={13} alt="Corvo" style={{ opacity: 0.5 }} />
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 10, fontWeight: 700, letterSpacing: 3, color: "rgba(232,224,204,0.2)" }}>CORVO</span>
          <span style={{ fontSize: 11, color: "rgba(232,224,204,0.15)", marginLeft: 8 }}>© 2026 Corvo. All rights reserved.</span>
        </div>
        <div className="pfooter-links" style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
<a href="/pricing" className="pfooter-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>Pricing</a>
          <a href="/privacy" className="pfooter-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>Privacy</a>
          <a href="/terms" className="pfooter-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>Terms</a>
          <a href="/faq" className="pfooter-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>FAQ</a>
          <a href="https://github.com/vinay-batra/corvo" target="_blank" rel="noopener noreferrer" className="pfooter-link" style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", textDecoration: "none", transition: "color 0.2s" }}>GitHub</a>
          <a href="https://x.com/corvocapital" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="pfooter-link" style={{ color: "rgba(232,224,204,0.35)", textDecoration: "none", display: "flex", alignItems: "center", transition: "color 0.2s" }}>
            <svg width="12" height="12" viewBox="0 0 300 300" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66"/>
            </svg>
          </a>
          <a href="https://www.producthunt.com/products/corvo" target="_blank" rel="noopener noreferrer" style={{ opacity: 0.45, transition: "opacity 0.2s", display: "flex", alignItems: "center" }} onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")} onMouseLeave={e => (e.currentTarget.style.opacity = "0.45")}>
            <img alt="Corvo on Product Hunt" width="120" height="26" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1120194&theme=dark&t=1775786806638" style={{ display: "block" }} />
          </a>
        </div>
      </div>
    </footer>
  );
}
