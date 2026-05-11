"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
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
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.2 });
    obs.observe(el); return () => obs.disconnect();
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

// Five chapters covering everything from launch to today.
// Each chapter summarizes a span of versions instead of listing every release.
const ERAS = [
  {
    num: "01",
    name: "Foundations",
    versions: "v0.1 → v0.6",
    dateRange: "Mar 1 → Mar 28, 2026",
    intro: "The first build of Corvo.",
    highlights: [
      "Portfolio builder, onboarding, and one-click preset portfolios",
      "Sharpe ratio, max drawdown, and Monte Carlo simulation",
      "AI chat overlay that reads your actual holdings, not generic advice",
      "Health Score and Diversification Score graded across risk and stability",
      "Dividend tracker, tax loss harvesting, CSV import, PDF export, shareable card",
    ],
    tags: ["Launch", "Risk", "AI", "Tax"],
  },
  {
    num: "02",
    name: "Smart & Connected",
    versions: "v0.7 → v0.12",
    dateRange: "Apr 2 → Apr 24, 2026",
    intro: "Corvo learned to talk back, install as a PWA, and stop blinding you in dark rooms.",
    highlights: [
      "Benchmark comparison, rebalancing suggestions, and full What-If mode",
      "PWA install, push notifications, morning AI brief, weekly digest email",
      "Referral system, command palette (⌘K), demo mode, preset portfolios",
      "Cash and money market tickers (VMFXX, SPAXX, FDRXX) with real yield tracking",
      "Light mode by default; Learn overhaul with 15 XP levels and daily challenges",
    ],
    tags: ["AI", "PWA", "Learn", "Light Mode"],
  },
  {
    num: "03",
    name: "Mobile, Auth & Math",
    versions: "v0.13 → v0.17",
    dateRange: "Apr 24 → Apr 26, 2026",
    intro: "Phones, sessions, and the math underneath all got serious upgrades.",
    highlights: [
      "Full mobile overhaul across every page in the app",
      "Critical auth fix: middleware was silently expiring sessions on every request",
      "AI chat connected to live web search with word-by-word streaming responses",
      "Monte Carlo rebuilt: 8,500 paths, 1-30 year horizons, full distribution histogram",
      "About page, public-page redesign, and CAGR replacing simple return on the dashboard",
    ],
    tags: ["Mobile", "Auth", "AI", "Monte Carlo"],
  },
  {
    num: "04",
    name: "Income, Email & Tools",
    versions: "v0.18 → v0.22",
    dateRange: "Apr 23 → May 6, 2026",
    intro: "Corvo grew into a real financial workbench: tax, dividends, options, and proper email.",
    highlights: [
      "Rebalance Assistant, Options Chain viewer, and Transaction Log",
      "Email system rebuilt on Resend (welcome, weekly digest, morning briefing)",
      "Capital Gains Estimator, Dividend Calendar, and the new /install page",
      "Paper Trading, Peer Comparison, life events, and financial goals in onboarding",
      "Landing page redesign with Three.js particles, 3D bento cards, and animated headings",
    ],
    tags: ["Income", "Tax", "Email", "Design"],
  },
  {
    num: "05",
    name: "The Guardian Era",
    versions: "v0.23 → v0.25",
    dateRange: "May 7 → May 11, 2026",
    intro: "Corvo found its voice: the AI advisor watching over your portfolio.",
    highlights: [
      "Homepage rewrite around the \"your portfolio's guardian\" positioning",
      "Full app UI overhaul: features-page design language applied to every tab",
      "AI chat, Daily Signal, and AI Insights prompts rewritten for sharper three-beat voice",
      "Security sweep: closed two IDOR vulnerabilities and fixed startup secret leak",
      "Onboarding cut 11 → 8 steps, dashboard tour cut 9 → 5 stops, branded empty states",
    ],
    tags: ["Brand", "UI", "Security", "AI"],
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
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block", animation: "pdot 2s infinite" }} />
            <span style={{ fontSize: 10, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase" }}>What's new</span>
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
              Five chapters · scroll
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
                  {/* Timeline strip — line + dot above card */}
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

      {/* Subscribe section */}
      <div className="cl-footer" style={{ borderTop: "1px solid var(--bg3)", padding: "100px 56px 140px" }}>
        <ScrollReveal from="up" delay={0}>
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
        </ScrollReveal>
      </div>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
