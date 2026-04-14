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
    date: "April 2026",
    version: "v1.5",
    title: "Interactive Product Tour, FAQ, Pricing, About Pages & PWA",
    desc: "A fully guided interactive demo walks new users through every core feature. Added FAQ, Pricing, About, and Changelog pages. Corvo is now installable as a Progressive Web App on mobile and desktop.",
    tags: ["Onboarding", "Pages", "PWA"],
  },
  {
    date: "April 2026",
    version: "v1.4",
    title: "Tax Loss Harvesting, Dividend Tracker, Sector Exposure & CSV Import",
    desc: "Identify unrealized losses that can offset capital gains with one click. Track dividend income over time. Visualize portfolio concentration by sector. Import existing holdings via CSV for instant analysis.",
    tags: ["Tax", "Dividends", "Import"],
  },
  {
    date: "April 2026",
    version: "v1.3",
    title: "AI Daily Market Brief, Morning Push Notifications & Weekly Digest",
    desc: "Every morning Corvo generates a personalized AI market brief based on your holdings. Opt-in push notifications alert you to significant moves. Weekly digest email summarizes your portfolio performance.",
    tags: ["AI", "Notifications", "Email"],
  },
  {
    date: "April 2026",
    version: "v1.2",
    title: "Monte Carlo Risk Metrics, Portfolio History Chart & Watchlist Redesign",
    desc: "Run 300+ Monte Carlo simulations to see the realistic range of outcomes for your portfolio. New history chart tracks performance over time. Watchlist completely redesigned with live prices and sparklines.",
    tags: ["Risk", "Charts", "Watchlist"],
  },
  {
    date: "April 2026",
    version: "v1.1",
    title: "Learn Page XP System, Daily Challenges & 8 Mini-games",
    desc: "Gamified investing education with an XP and level system. Complete daily challenges to earn badges. Eight interactive mini-games teach everything from P/E ratios to options basics — no prior knowledge needed.",
    tags: ["Education", "Gamification"],
  },
  {
    date: "March 2026",
    version: "v1.0",
    title: "Launch: Portfolio Analyzer, AI Chat, Sharpe, Drawdown & Health Score",
    desc: "Corvo launches publicly. Core features include an AI-powered portfolio analyzer, real-time AI chat, Sharpe ratio, max drawdown, diversification score, and an overall portfolio Health Score — all free.",
    tags: ["Launch", "Core"],
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
    <div style={{ minHeight: "100vh", background: "#0a0e14", fontFamily: "Inter, sans-serif", color: "#e8e0cc" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nl { color: rgba(232,224,204,0.45); text-decoration: none; font-size: 12px; padding: 7px 14px; letter-spacing: 0.3px; transition: color 0.2s; }
        .nl:hover { color: #e8e0cc; }
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
          <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>What&apos;s New</p>
          <h1 style={{ fontFamily: "Space Mono, monospace", fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -2, lineHeight: 1.1, marginBottom: 16 }}>
            What&apos;s new in Corvo
          </h1>
          <p style={{ fontSize: 16, color: "rgba(232,224,204,0.45)", fontWeight: 300, maxWidth: 480, margin: "0 auto" }}>
            We ship fast. Here&apos;s everything we&apos;ve built.
          </p>
        </FadeUp>
      </div>

      {/* Timeline */}
      <div className="cl-body" style={{ maxWidth: 860, margin: "0 auto", padding: "0 56px 96px" }}>
        <div className="cl-timeline" style={{ position: "relative", paddingLeft: 0 }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 140, top: 0, bottom: 0, width: 1, background: "rgba(201,168,76,0.12)" }} />

          {ENTRIES.map((entry, i) => (
            <FadeUp key={i} delay={i * 0.06}>
              <div className="cl-entry" style={{ display: "flex", gap: 0, marginBottom: 48, position: "relative" }}>
                {/* Date column */}
                <div className="cl-date-col" style={{ width: 140, flexShrink: 0, paddingRight: 28, textAlign: "right", paddingTop: 4 }}>
                  <span style={{ fontSize: 11, color: "rgba(232,224,204,0.3)", fontFamily: "Space Mono, monospace" }}>{entry.date}</span>
                </div>

                {/* Dot */}
                <div style={{ position: "absolute", left: 134, top: 6, width: 13, height: 13, borderRadius: "50%", background: "#0a0e14", border: "2px solid #c9a84c", zIndex: 2 }} />

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
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: "#e8e0cc", marginBottom: 8, lineHeight: 1.35 }}>
                    {entry.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "rgba(232,224,204,0.45)", lineHeight: 1.75, fontWeight: 300 }}>
                    {entry.desc}
                  </p>
                </div>
              </div>
            </FadeUp>
          ))}

          {/* Origin dot */}
          <div style={{ position: "absolute", left: 134, bottom: 0, width: 13, height: 13, borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.25)", zIndex: 2 }} />
        </div>
      </div>

      {/* Subscribe section */}
      <div className="cl-footer" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "80px 56px 96px" }}>
        <FadeUp>
          <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 14 }}>Stay in the loop</p>
            <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1, marginBottom: 10, lineHeight: 1.2 }}>
              Subscribe to updates
            </h2>
            <p style={{ fontSize: 14, color: "rgba(232,224,204,0.4)", marginBottom: 32, fontWeight: 300 }}>
              Get notified when we ship something new. No spam, ever.
            </p>
            {status === "done" ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(92,184,138,0.08)", border: "1px solid rgba(92,184,138,0.25)", borderRadius: 12, padding: "16px 28px" }}>
                <span style={{ fontSize: 16, color: "#4caf7d" }}>✓</span>
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
                  style={{ flex: 1, padding: "14px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#e8e0cc", fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(201,168,76,0.4)")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
                <button
                  onClick={submit}
                  disabled={status === "loading"}
                  style={{ padding: "14px 24px", background: "#c9a84c", border: "none", borderRadius: 12, color: "#0a0e14", fontSize: 13, fontWeight: 700, cursor: status === "loading" ? "wait" : "pointer", letterSpacing: 0.3, whiteSpace: "nowrap", flexShrink: 0, transition: "opacity 0.2s", opacity: status === "loading" ? 0.8 : 1 }}>
                  {status === "loading" ? "..." : "Subscribe Free"}
                </button>
              </div>
            )}
            {status === "error" && (
              <p style={{ fontSize: 12, color: "#e05c5c", marginTop: 10 }}>Something went wrong. Please try again.</p>
            )}
            <p style={{ fontSize: 11, color: "rgba(232,224,204,0.2)", marginTop: 16 }}>No spam. Unsubscribe at any time.</p>
          </div>
        </FadeUp>
      </div>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
