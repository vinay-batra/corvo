"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ANIM_EASE = [0.25, 0.1, 0.25, 1] as const;

function FadeUp({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  return (
    <motion.div
      // initial={false} required — do not remove
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: ANIM_EASE, delay }}
      style={{ opacity: 0, transform: "translateY(30px)", ...style }}
    >
      {children}
    </motion.div>
  );
}

const ENTRIES = [
  {
    date: "Apr 28, 2026",
    version: "v0.21",
    title: "Capital Gains Estimator, Dividend Calendar & /install Page",
    desc: "Capital Gains Estimator is now live in the Income and Tax tab with automatic long-term and short-term classification, a configurable LTCG tax bracket selector, and per-ticker realized gain insights. The Dividend Calendar shows a 90-day lookahead of upcoming ex-dates with warnings when a position goes ex-dividend within the next five trading days and a projected income total for the period. The /install page gives every platform a dedicated installation guide with animated device mockups and an interactive demo strip. Seven components that were built but not yet wired up are now reachable from the dashboard: Correlation Heatmap, Drawdown Chart, Portfolio Compare, Portfolio History, Earnings Impact Preview, Share Portfolio, and Share Image Modal. Referral flow was tightened so ref links route through signup, onboarding, and tour in the correct order with bonus credit applied on redeem. Sixteen stability fixes across the frontend and backend including a showShareImage crash, broken whileInView animations across public pages, and eight backend bugs in main.py.",
    tags: ["Income", "Tax", "Dividends", "Install", "Fixes"],
  },
  {
    date: "Apr 28, 2026",
    version: "v0.20",
    title: "UX Fixes, InfoTooltips & Global Scroll Overhaul",
    desc: "An InfoTooltip system was added across every unexplained financial metric in the app, so hovering any term shows a plain-English explanation without leaving the page. Global scrolling was overhauled to eliminate overscroll bounce and scroll lag on all panels and modal overlays. Morning briefing expand and collapse now shows a one-sentence preview when collapsed instead of hiding all content behind the toggle. Price alerts are now editable inline without needing to delete and recreate the alert from scratch. Portfolio state auto-loads from your last saved session on every login, and the leaderboard was corrected to read from profiles.xp for accurate XP tracking.",
    tags: ["UX", "Tooltips", "Fixes"],
  },
  {
    date: "Apr 27, 2026",
    version: "v0.19",
    title: "Email System Rebuilt on Resend",
    desc: "The email system was rebuilt on Resend with purpose-built transactional templates for welcome emails, weekly digest, and morning briefing. Welcome emails now go out automatically on account creation with a personalized first-login guide. The weekly digest summarizes performance, key metric changes, and suggested actions based on your portfolio since the last send. Morning briefing emails pull live prices via yfinance at send time so the data is never stale. All templates use the same CSS color variables as the app and render correctly across Gmail, Outlook, and Apple Mail.",
    tags: ["Email", "Notifications", "Briefing"],
  },
  {
    date: "Apr 23, 2026",
    version: "v0.18",
    title: "Rebalance Assistant, Options Chain & Transaction Log",
    desc: "The Rebalance Assistant generates a prioritized trade list showing exactly how many shares to buy or sell to bring each drifted position back to its target weight. The Options Chain Viewer was added inside Stock Detail with live calls and puts tables, ITM row highlighting, a delta column, and a Max Pain section at the bottom. A Transaction Log now tracks each holding's cost basis and purchase history, giving you a running record of entries and exits. Health Score was upgraded with weighted sub-scores across risk, diversification, and return quality, replacing the simpler composite formula. All three panels respond to the same analyzed portfolio state so no additional analysis run is required to access them.",
    tags: ["Rebalance", "Options", "Transactions"],
  },
  {
    date: "Apr 22, 2026",
    version: "v0.17",
    title: "Monte Carlo Overhaul: 8,500 Paths & 30-Year Horizon",
    desc: "Monte Carlo simulation was rebuilt from scratch with exactly 8,500 paths for statistically meaningful results. The horizon selector now spans 1 to 30 years, letting you model outcomes across different investment timelines. A histogram view shows the full distribution of terminal wealth so you can see the entire range of outcomes rather than just median and tail values. Simulation settings persist between sessions so your preferred horizon is remembered on every visit. The underlying math uses each holding's historical volatility and cross-asset correlation to generate realistic, correlated paths rather than treating positions independently.",
    tags: ["Monte Carlo", "Simulations", "Risk"],
  },
  {
    date: "Apr 20, 2026",
    version: "v0.16",
    title: "AI Chat: Live Web Search & Streaming Responses",
    desc: "AI chat now connects to live web search so every answer is grounded in current market data rather than training knowledge alone. Responses stream word by word instead of arriving all at once, making conversations feel more natural. The system prompt was enriched with live portfolio context so the AI references your actual holdings when answering questions about risk, sector exposure, and return quality. Message rate limits and usage tracking were tightened to prevent abuse while keeping the experience smooth for regular users. Chat history now persists across sessions so you can revisit earlier conversations without losing context.",
    tags: ["AI Chat", "Web Search", "Streaming"],
  },
  {
    date: "Apr 26, 2026",
    version: "v0.15",
    title: "Auth Fix, Portfolio Pill & Morning Brief Accuracy",
    desc: "Critical auth fix: missing Next.js middleware was causing expired JWTs on every server-side request, silently failing sessions after sign-in. Supabase client is now a true singleton throughout the app. Dashboard ticker scroll adds a live Portfolio pill next to the S&P 500, Nasdaq, and Dow pills, showing your weighted daily dollar and percent change in real time. Morning brief now pulls live prices via the same yfinance logic as the ticker chips, never inferring or approximating. Onboarding no longer flashes on step transitions, and the header now shows the Corvo logo and user menu.",
    tags: ["Auth", "Dashboard", "AI Brief", "Fixes"],
  },
  {
    date: "Apr 25, 2026",
    version: "v0.14",
    title: "Full Mobile Overhaul",
    desc: "Complete mobile experience rebuilt from the ground up across every page in the app. Dashboard now mirrors desktop with a scrollable tab bar and no bottom nav, and performance charts fill exactly to the selected period with axis detail scaled per timeframe. Mobile audit completed across all pages: AI chat sidebar, onboarding modal, FAQ, pricing, settings, and referrals all fixed. Blog posts added for Markets and Product categories, and light mode is now the default for new and logged-out users. PWA install button added to nav and AI insights no longer misidentify largest holdings when weights are equal.",
    tags: ["Mobile", "UI", "Dashboard", "Charts"],
  },
  {
    date: "Apr 24, 2026",
    version: "v0.13",
    title: "About Page, Nav Polish & Public Page Redesign",
    desc: "New About page at corvo.capital/about tells the story behind Corvo. Nav updated with About link across all pages. Public pages now show pill-style eyebrow badges above headings. Light mode is now the default for all new and logged-out visitors. Nav order standardized to Features, Demo, Pricing, Blog, Changelog, FAQ, About.",
    tags: ["About", "UI", "Light Mode"],
  },
  {
    date: "Apr 24, 2026",
    version: "v0.12",
    title: "Light Mode, AI Chat Overhaul, CAGR Metrics & Dashboard Polish",
    desc: "Full light mode support across all pages with CSS variables for instant theme switching and no flash on load. Dashboard now shows CAGR instead of simple return, Sharpe ratio uses the live T-bill rate (^IRX), and a stale results banner appears when holdings change after analysis. Money market funds (FDRXX, SPAXX, VMFXX) now tracked with accurate yield-based price series. AI chat redesigned with conversation history sidebar, refreshable suggestions, and a richer system prompt with live portfolio context. PDF export redesigned with metric cards, benchmark comparison, and an investor profile section.",
    tags: ["Light Mode", "AI Chat", "Dashboard", "Fixes"],
  },
  {
    date: "Apr 21, 2026",
    version: "v0.11",
    title: "Learn Overhaul, SEO, Light Mode Fixes & XP System Improvements",
    desc: "Learn page overhauled with XP and streak loading correctly on refresh, expanded to 15 levels from Novice through Legend with a visual reference card. Leaderboard pulls from profiles.xp for accuracy, and AI Practice unlocks after the first quiz attempt. Daily challenge fail state added with a retry button, and arcade grid and lesson step badges improved. Feedback button added to every page via React portal alongside SEO upgrades including a sitemap and upgraded JSON-LD schema. Light mode visual overhaul applied throughout: all component colors now use CSS variables and the news tab now requires an analyzed portfolio for consistency.",
    tags: ["Learn", "XP", "SEO", "UX"],
  },
  {
    date: "Apr 16, 2026",
    version: "v0.10",
    title: "Cash Tickers, Guided Tour, Custom Date Range & 6 More Features",
    desc: "Add cash and money market positions (VMFXX, SPAXX, FDRXX) to your portfolio with accurate yield tracking. A post-onboarding guided tour walks every new user through key features, with the option to replay onboarding from settings at any time. Custom date range picker added for all charts, with drawdown annotations marking the worst periods visually. Saved portfolio overlay lets you compare current positions against a saved snapshot, and a presets modal adds one-click demo portfolios. Company names now appear alongside tickers and the weight header stays sticky while scrolling the positions table.",
    tags: ["Cash", "UX", "Charts"],
  },
  {
    date: "Apr 12, 2026",
    version: "v0.9",
    title: "Referral System, Command Palette, Demo Mode & Preset Portfolios",
    desc: "Invite friends and earn extra AI chat messages with every successful referral. A keyboard-driven command palette (Cmd+K) lets power users navigate anywhere instantly. Demo mode lets anyone try Corvo with a realistic sample portfolio without signing up. One-click preset portfolios (All-Weather, Tech Heavy, Dividend Growth) scaffold a starting point for new users.",
    tags: ["Referrals", "UX", "Onboarding"],
  },
  {
    date: "Apr 7, 2026",
    version: "v0.8",
    title: "Push Notifications, PWA, Morning AI Brief & Weekly Digest Email",
    desc: "Corvo is now installable as a Progressive Web App on iOS and Android. Opt-in push notifications alert you when any holding moves more than 5%. Every morning Corvo generates a personalized AI market brief based on your specific holdings. A weekly digest email summarizes performance, key changes, and suggested actions.",
    tags: ["PWA", "Notifications", "Email"],
  },
  {
    date: "Apr 2, 2026",
    version: "v0.7",
    title: "Benchmark Comparison, Rebalancing Suggestions & What-If Mode",
    desc: "Compare your portfolio against SPY, QQQ, or a custom benchmark with a side-by-side performance chart and alpha calculation. The rebalancing tool highlights positions that have drifted from target weights and generates a suggested trade list. What-if mode lets you model the impact of adding, removing, or resizing any position before committing. All three views use the same analyzed portfolio state, so switching between them requires no additional analysis runs.",
    tags: ["Benchmarks", "Rebalancing"],
  },
  {
    date: "Mar 28, 2026",
    version: "v0.6",
    title: "CSV Import, PDF Export & Shareable Portfolio Card",
    desc: "Import holdings directly from Fidelity, Schwab, and Robinhood CSV exports. Generate a single-page PDF report of your full portfolio analysis for offline review or sharing with an advisor. A shareable portfolio card creates a clean public image of your allocation breakdown, safe to post without exposing exact values. The PDF includes your Sharpe ratio, CAGR, Max Drawdown, Health Score, and a sector breakdown chart formatted for print.",
    tags: ["Import", "Export", "Sharing"],
  },
  {
    date: "Mar 25, 2026",
    version: "v0.5",
    title: "Dividend Tracker & Tax Loss Harvesting",
    desc: "Track projected annual dividend income by position and visualize the full dividend history for each holding. The tax loss harvesting module scans your portfolio for unrealized losses that can offset gains, flags IRS wash sale risk, and suggests correlated replacement securities to maintain your target exposure. Dividend yield and annual income are shown per position and in aggregate so you can see at a glance how much passive income your portfolio generates. Ex-dividend dates are pulled automatically so you always know when the next payout is expected.",
    tags: ["Dividends", "Tax"],
  },
  {
    date: "Mar 8, 2026",
    version: "v0.4",
    title: "AI Chat Overlay",
    desc: "A persistent AI chat overlay available on every screen inside the app. Ask anything: \"Is my tech allocation too high?\", \"What is dragging down my Sharpe ratio?\", or \"Explain sequence of returns risk.\" The AI reads your actual holdings and weights, so every answer is specific to your portfolio, not generic commentary. Conversation context is preserved within a session so follow-up questions remember what was discussed earlier.",
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
        .tag { padding: 3px 10px; background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.4); border-radius: 20px; font-size: 10px; color: var(--accent); letter-spacing: 0.5px; }
        @media(max-width:768px) {
          .cl-timeline { padding-left: 0 !important; }
          .cl-entry { padding-left: 0 !important; display: block !important; }
          .cl-date-col { display: none !important; }
          .cl-dot { display: none !important; }
          .cl-vline { display: none !important; }
          .cl-entry-content { padding-left: 0 !important; }
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
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid rgba(201,168,76,0.4)", borderRadius: 24, marginBottom: 28, background: "rgba(201,168,76,0.08)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block" }} />
            <span style={{ fontSize: 10, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase" }}>Changelog</span>
          </div>
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
          <div className="cl-vline" style={{ position: "absolute", left: 140, top: 0, bottom: 0, width: 1, background: "var(--border)" }} />

          {ENTRIES.map((entry, i) => (
            <motion.div
              key={i}
              // initial={false} required — do not remove
              initial={false}
              animate={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: ANIM_EASE }}
              className="cl-entry"
              style={{ display: "flex", gap: 0, marginBottom: 48, position: "relative" }}
            >
              {/* Date column */}
              <div className="cl-date-col" style={{ width: 140, flexShrink: 0, paddingRight: 28, textAlign: "right", paddingTop: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>{entry.date}</span>
              </div>

              {/* Dot */}
              <div className="cl-dot" style={{ position: "absolute", left: 134, top: 6, width: 13, height: 13, borderRadius: "50%", background: "var(--card-bg)", border: "2px solid #c9a84c", zIndex: 2 }} />

              {/* Content */}
              <div className="cl-entry-content" style={{ paddingLeft: 36, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "Space Mono, monospace", fontSize: 10, fontWeight: 700, color: "#c9a84c", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.4)", padding: "3px 10px", borderRadius: 20 }}>
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
            </motion.div>
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
    </div>
  );
}
