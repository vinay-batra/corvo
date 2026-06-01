"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.95 && rect.bottom > 0;
    if (inView) {
      let rafA = 0, rafB = 0;
      rafA = requestAnimationFrame(() => { rafB = requestAnimationFrame(() => setVisible(true)); });
      return () => { cancelAnimationFrame(rafA); cancelAnimationFrame(rafB); };
    }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function ScrollReveal({ children, delay = 0, from = "up", distance = 30, style = {} }: { children: React.ReactNode; delay?: number; from?: "up"|"left"|"right"; distance?: number; style?: React.CSSProperties }) {
  const { ref, visible } = useReveal(0.1);
  const transform = from === "left" ? `translateX(-${distance}px)` : from === "right" ? `translateX(${distance}px)` : `translateY(${distance}px)`;
  return (
    <div ref={ref} style={{ ...style, opacity: visible ? 1 : 0, transform: visible ? "none" : transform, transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}>
      {children}
    </div>
  );
}

function AnimatedHeading({ text, accentText, style = {} }: { text: string; accentText?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let rafA = 0, rafB = 0;
    rafA = requestAnimationFrame(() => { rafB = requestAnimationFrame(() => setVisible(true)); });
    return () => { cancelAnimationFrame(rafA); cancelAnimationFrame(rafB); };
  }, []);
  const blackWords = text.split(" ").filter(Boolean);
  const goldWords = accentText ? accentText.split(" ").filter(Boolean) : [];
  const allWords = [...blackWords, ...goldWords];
  const offsets: number[] = [];
  let acc = 0;
  allWords.forEach(w => { offsets.push(acc); acc += w.length; });
  return (
    <h1 ref={ref} style={style}>
      {allWords.map((word, wi) => {
        const isAccent = wi >= blackWords.length;
        return (
          <span key={wi} style={{
            display: "inline-block",
            marginRight: "0.3em",
            color: isAccent ? "var(--accent)" : "var(--text)",
            textShadow: isAccent ? "0 0 60px rgba(var(--accent-rgb),0.35)" : "none",
          }}>
            {word.split("").map((char, ci) => {
              const delay = (offsets[wi] + ci) * 0.03;
              return (
                <span key={ci} style={{
                  display: "inline-block",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateX(0)" : "translateX(-40px)",
                  transition: `opacity 0.6s cubic-bezier(0.215,0.61,0.355,1) ${delay}s, transform 0.6s cubic-bezier(0.215,0.61,0.355,1) ${delay}s`,
                  willChange: "transform, opacity",
                }}>{char}</span>
              );
            })}
          </span>
        );
      })}
    </h1>
  );
}

// Six chapters covering v0.1 -> the latest release. Exactly six bullets each,
// each bullet kept to a similar length so every chapter card renders at about
// the same height. Each bullet is a short thematic summary, not one commit.
const ERAS = [
  {
    num: "01",
    name: "Foundations",
    versions: "v0.1 → v0.6",
    dateRange: "Mar 1 → Mar 28, 2026",
    intro: "The first real build: every metric and workflow you'd expect from a portfolio tool, in plain English.",
    highlights: [
      "Portfolio builder, guided onboarding, and one-click preset portfolios",
      "Sharpe, alpha, beta, and max drawdown on a live risk-free rate",
      "Monte Carlo engine with percentile bands and outcome histograms",
      "AI chat that reads your real holdings, not generic advice",
      "Health and Diversification scores across return, risk, and resilience",
      "Dividend tracker, tax-loss harvesting, CSV import, and PDF export",
    ],
    tags: ["Launch", "Risk", "AI", "Tax"],
  },
  {
    num: "02",
    name: "Smart, Mobile & Connected",
    versions: "v0.7 → v0.18",
    dateRange: "Apr 2 → May 1, 2026",
    intro: "Corvo learned to talk back, install to your phone, and the math underneath got serious upgrades.",
    highlights: [
      "Benchmark comparison versus the S&P 500, Nasdaq, and Dow",
      "Rebalance assistant with a live What-If allocation mode",
      "PWA install, push notifications, and a daily morning AI brief",
      "Weekly digest email, referral system, and a command palette",
      "Cash and money-market tickers with real yield tracking",
      "Full mobile overhaul plus a critical session-expiry auth fix",
    ],
    tags: ["Benchmarks", "PWA", "Mobile", "Auth"],
  },
  {
    num: "03",
    name: "Income, Email & Tools",
    versions: "v0.19 → v0.24",
    dateRange: "May 2 → May 10, 2026",
    intro: "Corvo grew into a real financial workbench: tax tools, dividends, goal-aware advice, and proper email.",
    highlights: [
      "Email suite on Resend: welcome, digest, briefing, and summary",
      "Capital gains estimator and a 90-day dividend calendar",
      "Tax-loss-harvesting alerts wired straight into the dashboard",
      "Life events and goals personalize AI advice to your situation",
      "Landing redesign: particles, 3D bento cards, animated headings",
      "Dashboard customizer, insight card, and animated analysis state",
    ],
    tags: ["Income", "Email", "Goals", "Design"],
  },
  {
    num: "04",
    name: "Guardian Voice & Security",
    versions: "v0.25 → v0.31",
    dateRange: "May 11 → May 12, 2026",
    intro: "Corvo found its voice as the advisor watching your portfolio, and hardened the surface beneath it.",
    highlights: [
      "Homepage rewrite around the guardian-advisor positioning",
      "Rebuilt auth page and standardized UI across every tab",
      "Security audit: IDOR closures, RLS hardening, secret rotation",
      "New gold raven logo across favicons, OG card, and profile art",
      "PublicNav refresh with hide-on-scroll and hash-anchor scrolling",
      "End-of-day snapshot cron and corrected day-over-day value math",
    ],
    tags: ["Brand", "Security", "Voice", "Math"],
  },
  {
    num: "05",
    name: "Accounts, Sidebar & AI Cost",
    versions: "v0.32 → v0.41",
    dateRange: "May 16 → May 17, 2026",
    intro: "Eight account types with their own tax rules, a redesigned sidebar, and an AI bill cut roughly fivefold.",
    highlights: [
      "Eight account types, each with their own tax-aware AI rules",
      "Per-holding account tagging for mixed-wrapper portfolios",
      "Tabbed sidebar (Holdings / Account / Saved) with natural-language editing",
      "GreetingBar redesign: sparkline market cards plus a holdings list",
      "AI cost cut ~5x via Haiku 4.5, prompt caching, and response caches",
      "Monte Carlo rebuilt with fat tails and an honest percentile fan chart",
    ],
    tags: ["Accounts", "Sidebar", "AI Cost", "Monte Carlo"],
  },
  {
    num: "06",
    name: "Launch Prep & Polish",
    versions: "v0.42 → v0.55",
    dateRange: "May 17 → May 30, 2026",
    intro: "Pricing got real, every account carries its own settings, and a full audit hardened the whole stack.",
    highlights: [
      "Pricing renamed to Lite / Pro / Max with clear waitlist framing",
      "Per-account value, type, and reinvest settings saved end to end",
      "Daily brief is date-stamped, tax-framed, and matches live tickers",
      "Full audit: IDOR fixes, RLS, and a critical rate-limit repair",
      "PDF export rebuilt with sector breakdown and an AI narrative",
      "Public AI chat redesigned, login hardened, accessibility pass",
    ],
    tags: ["Pricing", "Accounts", "Security", "Polish"],
  },
];


export default function ChangelogPage() {
  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "Inter, sans-serif", color: "var(--text)" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nl { color: var(--text2); text-decoration: none; font-size: 12px; padding: 7px 14px; letter-spacing: 0.3px; transition: color 0.2s; }
        .nl:hover { color: var(--text); }
        .tag { padding: 3px 10px; background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.4); border-radius: 20px; font-size: 10px; color: var(--accent); letter-spacing: 0.5px; }
        .cl-eras-scroll { scrollbar-width: thin; scrollbar-color: rgba(201,168,76,0.4) transparent; }
        .cl-eras-scroll::-webkit-scrollbar { height: 6px; }
        .cl-eras-scroll::-webkit-scrollbar-track { background: transparent; margin: 0 56px; }
        .cl-eras-scroll::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.35); border-radius: 4px; }
        .cl-eras-scroll::-webkit-scrollbar-thumb:hover { background: rgba(201,168,76,0.6); }
        .cl-era-card {
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s cubic-bezier(0.16,1,0.3,1);
          will-change: transform;
        }
        .cl-era-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 18px 40px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(var(--accent-rgb),0.25) !important;
        }
        .cl-era-dot { transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s; }
        .cl-era:hover .cl-era-dot {
          transform: translate(-50%, -50%) scale(1.18);
          box-shadow: 0 0 0 5px rgba(var(--accent-rgb),0.22), 0 0 22px rgba(var(--accent-rgb),0.5) !important;
        }
        @media(max-width:768px) {
          .cl-hero { padding: 100px 20px 48px !important; }
          .cl-eras-wrap { padding: 0 0 80px !important; }
          .cl-eras-scroll { padding-left: 20px !important; padding-right: 20px !important; }
          .cl-era { width: min(82vw, 360px) !important; margin-right: 56px !important; }
          .cl-era:last-child { margin-right: 0 !important; }
          .cl-footer { padding: 60px 20px 80px !important; }
        }
      `}</style>

      {/* Nav */}
      <PublicNav />

      {/* Hero */}
      <div className="cl-hero" style={{ textAlign: "center", padding: "140px 56px 80px" }}>
        <ScrollReveal from="up" delay={0}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid rgba(201,168,76,0.4)", borderRadius: 24, marginBottom: 28, background: "rgba(201,168,76,0.08)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "pdot 2s infinite" }} />
            <span style={{ fontSize: 10, letterSpacing: 2.5, color: "var(--accent)", textTransform: "uppercase" }}>What's new</span>
          </div>
        </ScrollReveal>
        <AnimatedHeading text="Every release," accentText="in order." style={{ fontFamily: "Space Mono, monospace", fontSize: "clamp(32px,4.4vw,60px)", fontWeight: 700, color: "var(--text)", letterSpacing: -1.5, lineHeight: 1.12, marginBottom: 16, textAlign: "center" }} />
        <ScrollReveal from="up" delay={0.1}>
          <p style={{ fontSize: 16, color: "var(--text2)", fontWeight: 300, maxWidth: 480, margin: "0 auto" }}>
            We ship fast. Here&apos;s everything we&apos;ve built.
          </p>
        </ScrollReveal>
      </div>

      {/* Horizontal era timeline */}
      <ScrollReveal from="up" delay={0.1}>
        <div className="cl-eras-wrap" style={{ position: "relative", paddingBottom: 96 }}>

          {/* Scroll hint */}
          <div style={{ textAlign: "center", marginBottom: 36, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.22em", color: "var(--text3)", fontFamily: "Space Mono, monospace", textTransform: "uppercase", fontWeight: 600 }}>
              Six chapters · scroll
            </span>
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
              <path d="M2 5h17M14 1l4 4-4 4" stroke="var(--text3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Horizontal scroll container */}
          <div
            className="cl-eras-scroll"
            style={{
              display: "flex",
              overflowX: "auto",
              overflowY: "hidden",
              scrollSnapType: "x mandatory",
              paddingLeft: "max(56px, calc((100vw - 1320px) / 2))",
              paddingRight: "max(56px, calc((100vw - 1320px) / 2))",
              paddingTop: 4,
              paddingBottom: 32,
              scrollPaddingLeft: 56,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {ERAS.map((era, i) => {
              const isFirst = i === 0;
              const isLast = i === ERAS.length - 1;
              return (
                <div
                  key={era.num}
                  className="cl-era"
                  style={{
                    flexShrink: 0,
                    scrollSnapAlign: "center",
                    width: 400,
                    marginRight: isLast ? 0 : 56,
                  }}
                >
                  {/* Timeline strip - line + dot above card */}
                  <div style={{ position: "relative", height: 36, marginBottom: 22 }}>
                    {/* Continuous line: extends into the right margin to meet the next card's line */}
                    <div style={{
                      position: "absolute",
                      top: "50%",
                      left: isFirst ? "50%" : 0,
                      right: isLast ? "50%" : -56,
                      height: 1.5,
                      background: "rgba(var(--accent-rgb), 0.42)",
                      transform: "translateY(-50%)",
                    }} />
                    {/* Dot */}
                    <div className="cl-era-dot" style={{
                      position: "absolute",
                      top: "50%", left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 16, height: 16,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      border: "4px solid var(--bg)",
                      boxShadow: "0 0 0 3px rgba(var(--accent-rgb),0.18), 0 0 14px rgba(var(--accent-rgb),0.35)",
                    }} />
                  </div>

                  {/* Card */}
                  <div
                    className="cl-era-card"
                    style={{
                      width: "100%",
                      background: "var(--card-bg)",
                      border: "0.5px solid var(--border)",
                      borderRadius: 18,
                      padding: "28px 30px 26px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 10px 28px rgba(0,0,0,0.07), 0 0 0 0.5px var(--border)",
                    }}
                  >
                    {/* Chapter meta row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <span style={{ fontFamily: "Space Mono, monospace", fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.22em" }}>
                        CHAPTER {era.num}
                      </span>
                      <span style={{
                        fontFamily: "Space Mono, monospace", fontSize: 10, fontWeight: 700,
                        color: "var(--accent)",
                        background: "rgba(var(--accent-rgb),0.08)",
                        border: "1px solid rgba(var(--accent-rgb),0.25)",
                        borderRadius: 6, padding: "3px 9px",
                        letterSpacing: 0.4,
                      }}>
                        {era.versions}
                      </span>
                    </div>

                    {/* Headline */}
                    <h3 style={{
                      fontFamily: "Space Mono, monospace",
                      fontSize: 24, fontWeight: 700,
                      color: "var(--text)",
                      letterSpacing: -0.9, lineHeight: 1.12,
                      marginBottom: 8,
                    }}>
                      {era.name}
                    </h3>

                    {/* Date range */}
                    <p style={{ fontSize: 11, color: "var(--text3)", fontFamily: "Space Mono, monospace", marginBottom: 16, letterSpacing: 0.3 }}>
                      {era.dateRange}
                    </p>

                    {/* Intro */}
                    <p style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.65, marginBottom: 18, fontStyle: "italic" }}>
                      {era.intro}
                    </p>

                    {/* Highlights */}
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                      {era.highlights.map((h, hi) => (
                        <li key={hi} style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.55, paddingLeft: 16, position: "relative" }}>
                          <span style={{ position: "absolute", left: 0, top: 7, width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
                          {h}
                        </li>
                      ))}
                    </ul>

                    {/* Tags */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {era.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
