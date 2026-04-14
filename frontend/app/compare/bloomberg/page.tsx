"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const EASE = [0.25, 0.1, 0.25, 1] as const;

function FadeUp({ children, delay = 0, y = 28, style = {} }: { children: React.ReactNode; delay?: number; y?: number; style?: React.CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

const FEATURES: [string, boolean, boolean][] = [
  ["AI-Powered Portfolio Chat",           true,  true],
  ["Monte Carlo Simulation (1000+ paths)",true,  true],
  ["Sharpe Ratio & Risk Metrics",         true,  true],
  ["Portfolio Health Score (A–F grade)",  true,  false],
  ["Correlation Heatmap",                 true,  true],
  ["Benchmark Comparison",                true,  true],
  ["Real-Time Price & % Alerts",          true,  true],
  ["Sector Exposure Analysis",            true,  true],
  ["Dividend Tracker",                    true,  true],
  ["Tax Loss Harvesting Suggestions",     true,  false],
  ["Learn & Earn Gamification",           true,  false],
  ["Screenshot Import",                   true,  false],
  ["CSV Import (Fidelity, Schwab, etc.)", true,  false],
  ["Modern, Mobile-Friendly UI",          true,  false],
  ["Max Drawdown Analysis",               true,  true],
  ["Free to Use",                         true,  false],
];

export default function BloombergComparePage() {
  return (
    <div style={{ background: "#0a0e14", minHeight: "100vh", color: "#e8e0cc", fontFamily: "'Inter',system-ui,sans-serif", overflowX: "hidden" }}>
      <style>{`
        @media(max-width:768px){
          .cmp-section{padding-left:20px!important;padding-right:20px!important}
          .cmp-pricing-grid{grid-template-columns:1fr!important;gap:16px!important}
          .cmp-pricing-grid>*:nth-child(2){display:none!important}
          .cmp-price-badge{flex-direction:column!important;align-items:center!important;gap:12px!important}
          .cmp-price-vs{display:block!important;text-align:center!important;font-size:16px!important}
          table{width:100%!important}
        }
      `}</style>
      {/* Nav */}
      <PublicNav />

      {/* ─── HERO ─── */}
      <section className="cmp-section" style={{ paddingTop: 140, paddingBottom: 96, paddingLeft: 48, paddingRight: 48, textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 800, height: 500, background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 65%)", pointerEvents: "none" }} />
        <FadeUp>
          <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 20 }}>Comparison · Bloomberg vs Corvo</p>
          <h1 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(28px,4.5vw,58px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -2.5, lineHeight: 1.1, maxWidth: 820, margin: "0 auto 24px" }}>
            Corvo vs Bloomberg Terminal:<br />
            <span style={{ color: "#c9a84c" }}>Which is better for retail investors?</span>
          </h1>
          <p style={{ fontSize: "clamp(15px,1.8vw,18px)", color: "rgba(232,224,204,0.5)", maxWidth: 580, margin: "0 auto 44px", lineHeight: 1.8, fontWeight: 300 }}>
            Bloomberg Terminal is the gold standard for institutional traders — at $2,000/month. Corvo gives retail investors the same depth of analytics, completely free.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/auth" style={{ padding: "15px 40px", borderRadius: 12, background: "#c9a84c", color: "#0a0e14", fontSize: 14, fontWeight: 700, textDecoration: "none", letterSpacing: 0.2 }}>
              Try Corvo Free →
            </Link>
            <a href="#comparison" style={{ padding: "15px 40px", borderRadius: 12, border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", fontSize: 14, fontWeight: 500, textDecoration: "none", background: "transparent" }}>
              See comparison ↓
            </a>
          </div>
          <p style={{ fontSize: 11, color: "rgba(232,224,204,0.2)", marginTop: 18 }}>No credit card · No subscription · No catch</p>
        </FadeUp>

        {/* Price callout badges */}
        <FadeUp delay={0.2} style={{ marginTop: 64 }}>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,60,0,0.06)", border: "1px solid rgba(255,60,0,0.2)", borderRadius: 14, padding: "20px 36px", textAlign: "center" }}>
              <p style={{ fontFamily: "Space Mono,monospace", fontSize: 36, fontWeight: 700, color: "rgba(255,100,60,0.9)", letterSpacing: -2, marginBottom: 4 }}>$2,000<span style={{ fontSize: 16, fontWeight: 400 }}>/mo</span></p>
              <p style={{ fontSize: 11, letterSpacing: 1.5, color: "rgba(232,224,204,0.3)", textTransform: "uppercase" }}>Bloomberg Terminal</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", fontSize: 22, color: "rgba(232,224,204,0.2)" }}>vs</div>
            <div style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 14, padding: "20px 36px", textAlign: "center", boxShadow: "0 0 60px rgba(201,168,76,0.06)" }}>
              <p style={{ fontFamily: "Space Mono,monospace", fontSize: 36, fontWeight: 700, color: "#c9a84c", letterSpacing: -2, marginBottom: 4 }}>$0<span style={{ fontSize: 16, fontWeight: 400, color: "rgba(201,168,76,0.6)" }}>/mo</span></p>
              <p style={{ fontSize: 11, letterSpacing: 1.5, color: "rgba(201,168,76,0.5)", textTransform: "uppercase" }}>Corvo · Always Free</p>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ─── KEY DIFFERENCES ─── */}
      <section className="cmp-section" style={{ padding: "0 48px 96px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeUp style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 14 }}>Key Differences</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3vw,36px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5 }}>What actually matters for retail investors</h2>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
            {[
              {
                icon: "💸",
                title: "Cost: $24,000/yr vs $0",
                body: "Bloomberg Terminal is priced for hedge funds and trading desks. At $2,000/month, a retail investor would spend $24,000/year just to access analytics — more than most people invest annually. Corvo is free, forever.",
              },
              {
                icon: "🖥️",
                title: "Designed for humans, not traders",
                body: "Bloomberg's interface was built in the 1980s for institutional traders who spend decades learning it. Corvo's modern UI lets any investor understand their portfolio risk in under 5 minutes.",
              },
              {
                icon: "🤖",
                title: "AI that knows your portfolio",
                body: "Bloomberg has data. Corvo has an AI that knows your exact holdings, your risk tolerance, and your goals — and can answer questions like \"Am I too concentrated in tech?\" in plain English.",
              },
            ].map((card, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "32px 28px", position: "relative", overflow: "hidden", height: "100%" }}>
                  <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: "radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
                  <div style={{ fontSize: 28, marginBottom: 16 }}>{card.icon}</div>
                  <h3 style={{ fontFamily: "Space Mono,monospace", fontSize: 15, fontWeight: 700, color: "#e8e0cc", marginBottom: 12, letterSpacing: -0.3 }}>{card.title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(232,224,204,0.45)", lineHeight: 1.75, fontWeight: 300 }}>{card.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURE COMPARISON TABLE ─── */}
      <section id="comparison" className="cmp-section" style={{ padding: "0 48px 96px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeUp style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 14 }}>Feature Comparison</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3vw,36px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5 }}>Head-to-head breakdown</h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 10, letterSpacing: 2, color: "rgba(232,224,204,0.3)", textTransform: "uppercase", borderBottom: "1px solid rgba(201,168,76,0.08)", fontWeight: 400 }}>Feature</th>
                    <th style={{ padding: "14px 16px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#c9a84c", borderBottom: "2px solid rgba(201,168,76,0.4)", borderLeft: "1px solid rgba(201,168,76,0.18)", borderRight: "1px solid rgba(201,168,76,0.18)", background: "rgba(201,168,76,0.05)", boxShadow: "0 0 40px rgba(201,168,76,0.04)", width: 130 }}>
                      Corvo
                      <span style={{ display: "block", fontSize: 8, letterSpacing: 1.5, color: "rgba(201,168,76,0.5)", fontWeight: 400, marginTop: 2 }}>FREE</span>
                    </th>
                    <th style={{ padding: "14px 16px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "rgba(232,224,204,0.3)", borderBottom: "1px solid rgba(201,168,76,0.08)", width: 130 }}>
                      Bloomberg
                      <span style={{ display: "block", fontSize: 8, letterSpacing: 1, color: "rgba(232,224,204,0.2)", fontWeight: 400, marginTop: 2 }}>~$2,000/mo</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map(([label, corvo, bloomberg], ri) => (
                    <motion.tr
                      key={ri}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.4, ease: EASE, delay: ri * 0.04 }}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                    >
                      <td style={{ padding: "13px 20px", fontSize: 13, color: "rgba(232,224,204,0.6)", fontWeight: 300 }}>{label}</td>
                      <td style={{ padding: "13px 16px", textAlign: "center", borderLeft: "1px solid rgba(201,168,76,0.18)", borderRight: "1px solid rgba(201,168,76,0.18)", background: "rgba(201,168,76,0.03)", fontSize: 15 }}>
                        {corvo ? <span style={{ color: "#c9a84c", fontWeight: 700 }}>✓</span> : <span style={{ color: "rgba(255,255,255,0.12)" }}>✗</span>}
                      </td>
                      <td style={{ padding: "13px 16px", textAlign: "center", fontSize: 14 }}>
                        {bloomberg ? <span style={{ color: "#5cb88a" }}>✓</span> : <span style={{ color: "rgba(255,255,255,0.12)" }}>✗</span>}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeUp>
          <FadeUp delay={0.15} style={{ textAlign: "center", marginTop: 20 }}>
            <p style={{ fontSize: 12, color: "rgba(232,224,204,0.25)" }}>Bloomberg features based on publicly available documentation. Corvo features are live as of 2026.</p>
          </FadeUp>
        </div>
      </section>

      {/* ─── PRICING COMPARISON ─── */}
      <section className="cmp-section" style={{ padding: "0 48px 96px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeUp style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 14 }}>Pricing</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3vw,36px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5 }}>The math is simple</h2>
          </FadeUp>
          <div className="cmp-pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 24, alignItems: "center" }}>
            <FadeUp>
              <div style={{ background: "rgba(255,60,0,0.04)", border: "1px solid rgba(255,60,0,0.15)", borderRadius: 20, padding: "40px 36px", textAlign: "center" }}>
                <p style={{ fontSize: 11, letterSpacing: 2, color: "rgba(232,224,204,0.3)", textTransform: "uppercase", marginBottom: 16 }}>Bloomberg Terminal</p>
                <p style={{ fontFamily: "Space Mono,monospace", fontSize: 52, fontWeight: 700, color: "rgba(255,100,60,0.85)", letterSpacing: -3, lineHeight: 1, marginBottom: 8 }}>$2,000</p>
                <p style={{ fontSize: 13, color: "rgba(232,224,204,0.3)", marginBottom: 24 }}>per month · billed annually</p>
                <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
                  {["Institutional data terminals", "Professional training required", "Designed for trading desks", "Excel & API integrations", "24/7 professional support"].map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "rgba(232,224,204,0.25)", fontSize: 12 }}>–</span>
                      <span style={{ fontSize: 12, color: "rgba(232,224,204,0.4)" }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={0.05}>
              <div style={{ fontSize: 20, color: "rgba(232,224,204,0.15)", textAlign: "center" }}>vs</div>
            </FadeUp>
            <FadeUp delay={0.1}>
              <div style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 20, padding: "40px 36px", textAlign: "center", boxShadow: "0 0 80px rgba(201,168,76,0.05)", position: "relative" }}>
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#c9a84c", color: "#0a0e14", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: "4px 16px", borderRadius: 20, textTransform: "uppercase", whiteSpace: "nowrap" }}>Best for retail investors</div>
                <p style={{ fontSize: 11, letterSpacing: 2, color: "rgba(201,168,76,0.5)", textTransform: "uppercase", marginBottom: 16 }}>Corvo</p>
                <p style={{ fontFamily: "Space Mono,monospace", fontSize: 52, fontWeight: 700, color: "#c9a84c", letterSpacing: -3, lineHeight: 1, marginBottom: 8 }}>$0</p>
                <p style={{ fontSize: 13, color: "rgba(201,168,76,0.4)", marginBottom: 24 }}>always free · no credit card</p>
                <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
                  {["AI portfolio chat", "Monte Carlo simulation", "Sharpe ratio & risk metrics", "Real-time alerts", "Tax loss harvesting"].map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#c9a84c", fontSize: 12 }}>✓</span>
                      <span style={{ fontSize: 12, color: "rgba(232,224,204,0.55)" }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ─── WHY INVESTORS SWITCH ─── */}
      <section className="cmp-section" style={{ padding: "0 48px 96px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeUp style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 14 }}>Real Stories</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3vw,36px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5 }}>Why investors switch from Bloomberg</h2>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
            {[
              { text: "I replaced my Bloomberg subscription for personal investing. Corvo gives me 90% of the analytics at zero cost, with a UI that doesn't look like it's from 2003.", name: "Sarah K.", role: "Self-directed IRA · Former analyst" },
              { text: "Finally understand my portfolio's actual risk exposure. The correlation heatmap alone changed how I think about diversification.", name: "Marcus T.", role: "Retail Investor · 12yr experience" },
              { text: "The Monte Carlo simulator is genuinely impressive. I ran 300 paths against my retirement timeline and completely rethought my allocation.", name: "David R.", role: "Index Fund Investor · Engineer" },
            ].map((t, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "28px 24px", position: "relative" }}>
                  <div style={{ fontSize: 28, color: "rgba(201,168,76,0.2)", fontFamily: "Georgia,serif", lineHeight: 1, marginBottom: 16, fontWeight: 700 }}>"</div>
                  <p style={{ fontSize: 14, color: "rgba(232,224,204,0.6)", lineHeight: 1.75, fontWeight: 300, marginBottom: 20, fontStyle: "italic" }}>{t.text}</p>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#e8e0cc" }}>{t.name}</p>
                    <p style={{ fontSize: 11, color: "rgba(232,224,204,0.3)", marginTop: 2 }}>{t.role}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="cmp-section" style={{ padding: "0 48px 120px" }}>
        <FadeUp>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", background: "rgba(201,168,76,0.03)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 24, padding: "72px 48px", boxShadow: "0 0 100px rgba(201,168,76,0.04)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-30%", left: "50%", transform: "translateX(-50%)", width: 400, height: 300, background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>Ready to Switch?</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5, marginBottom: 16, lineHeight: 1.2 }}>
              It takes 60 seconds.
            </h2>
            <p style={{ fontSize: 15, color: "rgba(232,224,204,0.4)", marginBottom: 44, lineHeight: 1.8, fontWeight: 300 }}>
              Stop paying $2,000/month for analytics you use once a week. Get the same depth — free.
            </p>
            <Link href="/auth" style={{ display: "inline-block", padding: "16px 48px", borderRadius: 12, background: "#c9a84c", color: "#0a0e14", fontSize: 15, fontWeight: 700, textDecoration: "none", letterSpacing: 0.2 }}>
              Get Started Free →
            </Link>
            <p style={{ fontSize: 11, color: "rgba(232,224,204,0.18)", marginTop: 20 }}>No credit card required · Takes 60 seconds to connect your portfolio</p>
          </div>
        </FadeUp>
      </section>

      {/* ─── FOOTER ─── */}
      <PublicFooter />
    </div>
  );
}
