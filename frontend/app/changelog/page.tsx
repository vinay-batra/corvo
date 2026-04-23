"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import FeedbackButton from "../../components/FeedbackButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ANIM_EASE = [0.25, 0.1, 0.25, 1] as const;

function FadeUp({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: ANIM_EASE, delay }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

const ENTRIES = [
  {
    date: "Apr 23, 2026",
    version: "v0.16",
    title: "Alerts Overhaul, Empty State Redesign, TypeScript Fixes & UI Polish",
    desc: "Portfolio alerts fully built end-to-end: select a saved portfolio, set a drop/rise threshold, and receive push notifications and email when triggered. Watchlist alerts section removed in favor of the unified AlertsPanel. Empty state redesigned with larger layout, Space Mono header, step icons, and a Presets shortcut hint. Metric cards upgraded with colored top borders and per-metric corner glow. Positions table now shows real company names and live 1D price changes. Analyze button pulses when portfolio is ready. XP progress bar thicker. Back button on Learn page redesigned with chevron icon and amber hover. Portfolio state now saved to localStorage when navigating to Learn so analyzed portfolio survives the tab switch. Watchlist controls reorganized: Rename moved into dropdown, Add button fixed to amber in light mode, refresh button labeled. Four TypeScript errors fixed across page.tsx, StockDetail, and UserMenu. Re-animation on scroll permanently fixed with initial={false} on all motion components.",
    tags: ["Alerts", "UX", "Fixes", "TypeScript"],
  },
  {
    date: "Apr 21, 2026",
    version: "v0.15",
    title: "Learn Overhaul, SEO, Light Mode Fixes & XP System Improvements",
    desc: "Major Learn page improvements: XP and streak now load correctly on page refresh, fixed a profiles database query that was silently failing. Expanded progression system from 5 to 15 levels (Novice through Legend) with a visual levels reference card. Global leaderboard now pulls from profiles.xp for accurate rankings. AI Practice unlocks after first quiz attempt instead of requiring full mastery. Daily challenge fail state added with retry button. Arcade grid last card now spans full width. Lesson step number badges added. Challenge Mode now has a Play Again button. Back buttons standardized with amber hover and ChevronLeft icon. Console logs removed from production. Light mode visual overhaul: preset modal, CSV modal, and component colors now use CSS variables throughout. Green values fixed in light mode (was showing near-black). Background colors shifted from warm beige to clean blue-tinted neutrals. News tab now requires an analyzed portfolio to access, consistent with other data tabs. Feedback button added to every page via React portal so it always floats correctly regardless of parent container. SEO upgrades: sitemap.xml created, JSON-LD upgraded to schema @graph with WebApplication, Organization, WebSite and FAQPage types, Google Search Console verification added, learn and pricing pages now indexable with proper metadata. Answer option length bias fixed in AI-generated quiz questions.",
    tags: ["Learn", "XP", "SEO", "Light Mode", "UX"],
  },
  {
    date: "Apr 16, 2026",
    version: "v0.14",
    title: "Cash Tickers, Guided Tour, Custom Date Range & 6 More Features",
    desc: "Add cash and money market positions (VMFXX, SPAXX, FDRXX) to your portfolio with accurate yield tracking. A post-onboarding guided tour walks every new user through key features. Custom date range picker for all charts. Drawdown annotations mark the worst periods visually. Saved portfolio overlay lets you compare current vs. a saved snapshot. Presets modal for one-click demo portfolios. Company names displayed alongside tickers. Sticky weight header stays visible while scrolling the positions table. Replay onboarding from settings at any time.",
    tags: ["Cash", "UX", "Charts"],
  },
  {
    date: "Apr 12, 2026",
    version: "v0.13",
    title: "Referral System, Command Palette, Demo Mode & Preset Portfolios",
    desc: "Invite friends and earn extra AI chat messages with every successful referral. A keyboard-driven command palette (Cmd+K) lets power users navigate anywhere instantly. Demo mode lets anyone try Corvo with a realistic sample portfolio without signing up. One-click preset portfolios (All-Weather, Tech Heavy, Dividend Growth) scaffold a starting point for new users.",
    tags: ["Referrals", "UX", "Onboarding"],
  },
  {
    date: "Apr 7, 2026",
    version: "v0.12",
    title: "Push Notifications, PWA, Morning AI Brief & Weekly Digest Email",
    desc: "Corvo is now installable as a Progressive Web App on iOS and Android. Opt-in push notifications alert you when any holding moves more than 5%. Every morning Corvo generates a personalized AI market brief based on your specific holdings. A weekly digest email summarizes performance, key changes, and suggested actions.",
    tags: ["PWA", "Notifications", "Email"],
  },
  {
    date: "Apr 2, 2026",
    version: "v0.11",
    title: "Benchmark Comparison, Rebalancing Suggestions & What-If Mode",
    desc: "Compare your portfolio against SPY, QQQ, or a custom benchmark with a side-by-side performance chart and alpha calculation. The rebalancing tool highlights positions that have drifted from target weights and generates a suggested trade list. What-if mode lets you model the impact of adding, removing, or resizing any position before committing.",
    tags: ["Benchmarks", "Rebalancing"],
  },
  {
    date: "Mar 28, 2026",
    version: "v0.10",
    title: "CSV Import, PDF Export & Shareable Portfolio Card",
    desc: "Import holdings directly from Fidelity, Schwab, and Robinhood CSV exports. Generate a single-page PDF report of your full portfolio analysis for offline review or sharing with an advisor. A shareable portfolio card creates a clean public image of your allocation breakdown, safe to post without exposing exact values.",
    tags: ["Import", "Export", "Sharing"],
  },
  {
    date: "Mar 25, 2026",
    version: "v0.9",
    title: "Dividend Tracker & Tax Loss Harvesting",
    desc: "Track projected annual dividend income by position and visualize the full dividend history for each holding. The tax loss harvesting module scans your portfolio for unrealized losses that can offset gains, flags IRS wash sale risk, and suggests correlated replacement securities to maintain your target exposure.",
    tags: ["Dividends", "Tax"],
  },
  {
    date: "Mar 21, 2026",
    version: "v0.8",
    title: "Sector Exposure & Correlation Heatmap",
    desc: "Full sector breakdown across all 11 GICS sectors, with geographic revenue exposure by country of origin, not just listing exchange. The correlation heatmap shows pairwise correlation between every holding. Red cells highlight pairs amplifying risk. Click any cell for the full historical relationship chart.",
    tags: ["Sectors", "Correlation"],
  },
  {
    date: "Mar 18, 2026",
    version: "v0.7",
    title: "Learn Page: XP System, Daily Challenges & 8 Investing Mini-Games",
    desc: "Gamified investing education with an XP and level system. Earn badges for completing lessons on fundamentals, risk, options, and macro. Eight interactive mini-games cover P/E ratios, bond duration, options payoff diagrams, and more, designed for investors at every level. Daily challenges keep the streak going.",
    tags: ["Education", "Gamification"],
  },
  {
    date: "Mar 14, 2026",
    version: "v0.6",
    title: "Stock Detail Pages & Options Chain",
    desc: "Each holding now has a dedicated detail page: price history, earnings calendar, analyst estimates, revenue trend, and key ratios in one place. The options chain tab shows live calls and puts with Greeks (delta, gamma, theta, vega) and lets you model covered call or protective put overlays against your position.",
    tags: ["Stocks", "Options"],
  },
  {
    date: "Mar 11, 2026",
    version: "v0.5",
    title: "Watchlist & Price Alerts",
    desc: "Build a watchlist of tickers you are tracking but have not yet bought. Live prices update every 15 seconds during market hours. Sparklines show 5-day momentum at a glance. Price alerts let you set a target price and receive an in-app notification the moment the level is crossed.",
    tags: ["Watchlist", "Alerts"],
  },
  {
    date: "Mar 8, 2026",
    version: "v0.4",
    title: "AI Chat Overlay",
    desc: "A persistent AI chat overlay available on every screen inside the app. Ask anything: \"Is my tech allocation too high?\", \"What is dragging down my Sharpe ratio?\", or \"Explain sequence of returns risk.\" The AI reads your actual holdings and weights, so every answer is specific to your portfolio, not generic commentary.",
    tags: ["AI", "Chat"],
  },
  {
    date: "Mar 5, 2026",
    version: "v0.3",
    title: "AI Portfolio Insights, Health Score & Diversification Score",
    desc: "Corvo now generates a written AI analysis of your portfolio every time you save changes. The analysis covers concentration risk, sector bias, and specific recommendations. A single Health Score (0-100) summarizes overall portfolio quality. A Diversification Score grades how effectively your holdings offset each other.",
    tags: ["AI", "Scoring"],
  },
  {
    date: "Mar 3, 2026",
    version: "v0.2",
    title: "Sharpe Ratio, Monte Carlo Simulation & Max Drawdown",
    desc: "Core risk analytics are live. Sharpe ratio measures return per unit of risk. Max drawdown shows the worst peak-to-trough decline over the selected period. Monte Carlo runs 8,500 forward simulations using each holding's historical volatility and correlation to show the realistic range of 1, 5, and 10 year outcomes.",
    tags: ["Risk", "Analytics"],
  },
  {
    date: "Mar 1, 2026",
    version: "v0.1",
    title: "Launch: Portfolio Builder & Onboarding",
    desc: "Corvo is live. Build a portfolio by entering tickers and weights, or start from a one-click preset. A step-by-step onboarding flow collects your risk tolerance, time horizon, and goals to personalize the analysis. Accounts are free, no brokerage connection required.",
    tags: ["Launch", "Onboarding"],
  },
];

export default function ChangelogPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const submit = async () => {
    if (!email.trim() || status !== "idle") return;
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/notify-me`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "Inter, sans-serif", color: "var(--text)" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nl { color: var(--text2); text-decoration: none; font-size: 12px; padding: 7px 14px; letter-spacing: 0.3px; transition: color 0.2s; }
        .nl:hover { color: var(--text); }
        .tag { padding: 3px 10px; background: rgba(201,168,76,0.07); border: 1px solid rgba(201,168,76,0.18); border-radius: 20px; font-size: 10px; color: rgba(201,168,76,0.75); letter-spacing: 0.5px; }
        @media(max-width:768px) {
          .cl-timeline { padding-left: 24px !important; }
          .cl-entry { padding-left: 20px !important; }
          .cl-date-col { display: none !important; }
          .cl-hero { padding: 100px 20px 48px !important; }
          .cl-body { padding: 0 20px 80px !important; }
          .cl-footer { padding: 60px 20px 80px !important; }
        }
      `}</style>

      {/* Nav */}
      <PublicNav />

      {/* Hero */}
      <div className="cl-hero" style={{ paddingTop: 120, paddingBottom: 64, textAlign: "center", padding: "120px 56px 64px" }}>
        <FadeUp>
          <h1 style={{ fontFamily: "Space Mono, monospace", fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 700, color: "var(--text)", letterSpacing: -2, lineHeight: 1.1, marginBottom: 16 }}>
            What&apos;s new in Corvo
          </h1>
          <p style={{ fontSize: 16, color: "var(--text2)", fontWeight: 300, maxWidth: 480, margin: "0 auto" }}>
            We ship fast. Here&apos;s everything we&apos;ve built.
          </p>
        </FadeUp>
      </div>

      {/* Timeline */}
      <div className="cl-body" style={{ maxWidth: 860, margin: "0 auto", padding: "0 56px 0" }}>
        <div className="cl-timeline" style={{ position: "relative", paddingLeft: 0 }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 140, top: 0, bottom: 0, width: 1, background: "rgba(201,168,76,0.12)" }} />

          {ENTRIES.map((entry, i) => (
            <FadeUp key={i} delay={i * 0.06}>
              <div className="cl-entry" style={{ display: "flex", gap: 0, marginBottom: 48, position: "relative" }}>
                {/* Date column */}
                <div className="cl-date-col" style={{ width: 140, flexShrink: 0, paddingRight: 28, textAlign: "right", paddingTop: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>{entry.date}</span>
                </div>

                {/* Dot */}
                <div style={{ position: "absolute", left: 134, top: 6, width: 13, height: 13, borderRadius: "50%", background: "var(--bg)", border: "2px solid #c9a84c", zIndex: 2 }} />

                {/* Content */}
                <div style={{ paddingLeft: 36, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "Space Mono, monospace", fontSize: 10, fontWeight: 700, color: "#c9a84c", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", padding: "3px 10px", borderRadius: 20 }}>
                      {entry.version}
                    </span>
                    {entry.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", marginBottom: 8, lineHeight: 1.35 }}>
                    {entry.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.75, fontWeight: 300 }}>
                    {entry.desc}
                  </p>
                </div>
              </div>
            </FadeUp>
          ))}

        </div>
      </div>

      {/* Subscribe section */}
      <div className="cl-footer" style={{ borderTop: "1px solid var(--bg3)", padding: "60px 56px 96px" }}>
        <FadeUp>
          <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 14 }}>Stay in the loop</p>
            <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 700, color: "var(--text)", letterSpacing: -1, marginBottom: 10, lineHeight: 1.2 }}>
              Subscribe to updates
            </h2>
            <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 32, fontWeight: 300 }}>
              Get notified when we ship something new. No spam, ever.
            </p>
            {status === "done" ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(92,184,138,0.08)", border: "1px solid rgba(92,184,138,0.25)", borderRadius: 12, padding: "16px 28px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf7d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: 14, color: "#4caf7d", fontWeight: 500 }}>{"You're on the list!"}</span>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, maxWidth: 440, margin: "0 auto" }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submit()}
                  placeholder="your@email.com"
                  style={{ flex: 1, padding: "14px 18px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)", fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(201,168,76,0.4)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
                <button
                  onClick={submit}
                  disabled={status === "loading"}
                  style={{ padding: "14px 24px", background: "#c9a84c", border: "none", borderRadius: 12, color: "var(--bg)", fontSize: 13, fontWeight: 700, cursor: status === "loading" ? "wait" : "pointer", letterSpacing: 0.3, whiteSpace: "nowrap", flexShrink: 0, transition: "filter 0.15s, opacity 0.2s", opacity: status === "loading" ? 0.8 : 1 }}
                  onMouseEnter={e => { if (status !== "loading") (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = "none"; }}>
                  {status === "loading" ? "..." : "Subscribe Free"}
                </button>
              </div>
            )}
            {status === "error" && (
              <p style={{ fontSize: 12, color: "#e05c5c", marginTop: 10 }}>Something went wrong. Please try again.</p>
            )}
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 16 }}>No spam. Unsubscribe at any time.</p>
          </div>
        </FadeUp>
      </div>

      {/* Footer */}
      <PublicFooter />
      <FeedbackButton />
    </div>
  );
}
