"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import FeedbackButton from "../../../components/FeedbackButton";

const EASE = [0.25, 0.1, 0.25, 1] as const;

function FadeUp({ children, delay = 0, y = 28, style = {} }: { children: React.ReactNode; delay?: number; y?: number; style?: React.CSSProperties }) {
  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false}
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
  ["AI-Powered Portfolio Chat",           true,  false],
  ["Monte Carlo Simulation",              true,  false],
  ["Sharpe Ratio & Risk Metrics",         true,  false],
  ["Portfolio Health Score (A–F grade)",  true,  false],
  ["Correlation Heatmap",                 true,  false],
  ["Benchmark Comparison (S&P 500 etc.)", true,  false],
  ["Custom Price & % Alerts",             true,  true],
  ["Sector Exposure Analysis",            true,  false],
  ["Dividend Tracker",                    true,  true],
  ["Tax Loss Harvesting",                 true,  true],
  ["Learn & Earn Gamification",           true,  false],
  ["Screenshot Import",                   true,  false],
  ["Multi-Broker Portfolio View",         true,  false],
  ["CSV Import",                          true,  true],
  ["Max Drawdown Analysis",               true,  false],
  ["Advanced Analytics (free tier)",      true,  false],
];

export default function RobinhoodComparePage() {
  return (
    <div style={{ background: "#0a0e14", minHeight: "100vh", color: "#e8e0cc", fontFamily: "'Inter',system-ui,sans-serif", overflowX: "hidden" }}>
      <style>{`@media(max-width:768px){.cmp-section{padding-left:20px!important;padding-right:20px!important}.cmp-pricing-grid{grid-template-columns:1fr!important;gap:16px!important}.cmp-pricing-grid>*:nth-child(2){display:none!important}}`}</style>
      {/* Nav */}
      <PublicNav />

      {/* ─── HERO ─── */}
      <section className="cmp-section" style={{ paddingTop: 140, paddingBottom: 96, paddingLeft: 48, paddingRight: 48, textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 800, height: 500, background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 65%)", pointerEvents: "none" }} />
        <FadeUp>
          <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 20 }}>Comparison · Robinhood vs Corvo</p>
          <h1 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(28px,4.5vw,58px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -2.5, lineHeight: 1.1, maxWidth: 820, margin: "0 auto 24px" }}>
            Corvo vs Robinhood:<br />
            <span style={{ color: "#c9a84c" }}>Which is better for retail investors?</span>
          </h1>
          <p style={{ fontSize: "clamp(15px,1.8vw,18px)", color: "rgba(232,224,204,0.5)", maxWidth: 580, margin: "0 auto 44px", lineHeight: 1.8, fontWeight: 300 }}>
            Robinhood is built for executing trades. Corvo is built for understanding your portfolio. Get AI-powered risk analytics, Monte Carlo simulation, and Sharpe ratio. All free.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/auth" style={{ padding: "15px 40px", borderRadius: 12, background: "#c9a84c", color: "#0a0e14", fontSize: 14, fontWeight: 700, textDecoration: "none", letterSpacing: 0.2 }}>
              Try Corvo Free →
            </Link>
            <a href="#comparison" style={{ padding: "15px 40px", borderRadius: 12, border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", fontSize: 14, fontWeight: 500, textDecoration: "none", background: "transparent" }}>
              See comparison ↓
            </a>
          </div>
          <p style={{ fontSize: 11, color: "rgba(232,224,204,0.2)", marginTop: 18 }}>No credit card · No subscription · No trading required</p>
        </FadeUp>

        {/* Price callout badges */}
        <FadeUp delay={0.2} style={{ marginTop: 64 }}>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(0,200,60,0.04)", border: "1px solid rgba(0,200,60,0.15)", borderRadius: 14, padding: "20px 36px", textAlign: "center" }}>
              <p style={{ fontFamily: "Space Mono,monospace", fontSize: 36, fontWeight: 700, color: "rgba(0,200,60,0.8)", letterSpacing: -2, marginBottom: 4 }}>$5<span style={{ fontSize: 16, fontWeight: 400 }}>/mo</span></p>
              <p style={{ fontSize: 11, letterSpacing: 1.5, color: "rgba(232,224,204,0.3)", textTransform: "uppercase" }}>Robinhood Gold</p>
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
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3vw,36px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5 }}>Trading vs. understanding</h2>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
            {[
              {
                icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
                title: "Analytics, not just execution",
                body: "Robinhood helps you buy and sell. Corvo helps you understand whether you should. Get Sharpe ratio, correlation analysis, max drawdown, and AI-powered portfolio insights: the context Robinhood doesn't provide.",
              },
              {
                icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
                title: "See your whole picture",
                body: "Robinhood only shows your Robinhood holdings. Corvo imports from Fidelity, Schwab, Robinhood, and more, giving you one unified view of your full net worth with real analytics.",
              },
              {
                icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
                title: "Built for learning, not FOMO",
                body: "Robinhood's UX is designed to maximize engagement and trading. Corvo is designed to help you make better long-term decisions, with a Learn & Earn system that builds your investing knowledge.",
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
                    <th style={{ padding: "14px 16px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "rgba(232,224,204,0.3)", borderBottom: "1px solid rgba(201,168,76,0.08)", width: 150 }}>
                      Robinhood
                      <span style={{ display: "block", fontSize: 8, letterSpacing: 1, color: "rgba(232,224,204,0.2)", fontWeight: 400, marginTop: 2 }}>Gold $5/mo</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map(([label, corvo, robinhood], ri) => (
                    <motion.tr
                      key={ri}
                      initial={false}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.4, ease: EASE, delay: ri * 0.04 }}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                    >
                      <td style={{ padding: "13px 20px", fontSize: 13, color: "rgba(232,224,204,0.6)", fontWeight: 300 }}>{label}</td>
                      <td style={{ padding: "13px 16px", textAlign: "center", borderLeft: "1px solid rgba(201,168,76,0.18)", borderRight: "1px solid rgba(201,168,76,0.18)", background: "rgba(201,168,76,0.03)", fontSize: 15 }}>
                        {corvo ? <span style={{ color: "#c9a84c", fontWeight: 700 }}>✓</span> : <span style={{ color: "rgba(255,255,255,0.2)", lineHeight: 1 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>}
                      </td>
                      <td style={{ padding: "13px 16px", textAlign: "center", fontSize: 14 }}>
                        {robinhood ? <span style={{ color: "#5cb88a" }}>✓</span> : <span style={{ color: "rgba(255,255,255,0.2)", lineHeight: 1 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeUp>
          <FadeUp delay={0.15} style={{ textAlign: "center", marginTop: 20 }}>
            <p style={{ fontSize: 12, color: "rgba(232,224,204,0.25)" }}>Robinhood Gold features based on publicly available documentation. Corvo features are live as of 2026.</p>
          </FadeUp>
        </div>
      </section>

      {/* ─── PRICING COMPARISON ─── */}
      <section className="cmp-section" style={{ padding: "0 48px 96px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeUp style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 14 }}>Pricing</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3vw,36px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5 }}>Pay less. Understand more.</h2>
          </FadeUp>
          <div className="cmp-pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 24, alignItems: "center" }}>
            <FadeUp>
              <div style={{ background: "rgba(0,200,60,0.03)", border: "1px solid rgba(0,200,60,0.12)", borderRadius: 20, padding: "40px 36px", textAlign: "center" }}>
                <p style={{ fontSize: 11, letterSpacing: 2, color: "rgba(232,224,204,0.3)", textTransform: "uppercase", marginBottom: 16 }}>Robinhood Gold</p>
                <p style={{ fontFamily: "Space Mono,monospace", fontSize: 52, fontWeight: 700, color: "rgba(0,200,60,0.7)", letterSpacing: -3, lineHeight: 1, marginBottom: 8 }}>$5</p>
                <p style={{ fontSize: 13, color: "rgba(232,224,204,0.3)", marginBottom: 24 }}>per month</p>
                <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
                  {["Margin investing", "Bigger instant deposits", "Level II market data", "Higher interest on uninvested cash", "Morningstar research reports"].map((f, i) => (
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
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#c9a84c", color: "#0a0e14", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: "4px 16px", borderRadius: 20, textTransform: "uppercase", whiteSpace: "nowrap" }}>For serious investors</div>
                <p style={{ fontSize: 11, letterSpacing: 2, color: "rgba(201,168,76,0.5)", textTransform: "uppercase", marginBottom: 16 }}>Corvo</p>
                <p style={{ fontFamily: "Space Mono,monospace", fontSize: 52, fontWeight: 700, color: "#c9a84c", letterSpacing: -3, lineHeight: 1, marginBottom: 8 }}>$0</p>
                <p style={{ fontSize: 13, color: "rgba(201,168,76,0.4)", marginBottom: 24 }}>always free · no credit card</p>
                <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
                  {["AI portfolio chat", "Monte Carlo simulation", "Sharpe ratio & risk metrics", "Multi-broker aggregation", "Learn & Earn gamification"].map((f, i) => (
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
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3vw,36px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5 }}>Why Robinhood users add Corvo</h2>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
            {[
              { text: "The Monte Carlo simulator is genuinely impressive. I ran 8,500 paths against my retirement timeline and completely rethought my allocation.", name: "David R.", role: "Index Fund Investor · Engineer" },
              { text: "Finally understand my portfolio's actual risk exposure. The correlation heatmap alone changed how I think about diversification.", name: "Marcus T.", role: "Retail Investor · 12yr experience" },
              { text: "The dividend tracker and tax loss harvesting features saved me hours of spreadsheet work. This is what modern investing tools should look like.", name: "James L.", role: "Dividend Investor · 8yr experience" },
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
              Keep using Robinhood for trades. Use Corvo to understand if those trades are working.
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
      <FeedbackButton />
    </div>
  );
}
