"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TOUR_KEY = "corvo_tour_completed";

interface TourStop {
  id: string;
  label: string;
  title?: string;
  description: string;
  Illus?: () => React.ReactElement;
}

// ── Inline SVG illustrations ──────────────────────────────────────────────────

function IllusBars() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <style>{`
        @keyframes ti-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      `}</style>
      {[
        { x: 62, h: 22, delay: 0.05, op: 0.5 },
        { x: 80, h: 32, delay: 0.15, op: 0.65 },
        { x: 98, h: 16, delay: 0.25, op: 0.45 },
        { x: 116, h: 28, delay: 0.35, op: 0.75 },
        { x: 134, h: 38, delay: 0.45, op: 1 },
      ].map((b, i) => (
        <rect
          key={i} x={b.x} y={38 - b.h} width="12" height={b.h} rx="1.5"
          fill="#b8860b" opacity={b.op}
          style={{
            transformBox: "fill-box" as any,
            transformOrigin: "center bottom",
            transform: "scaleY(0)",
            animation: `ti-grow 0.45s ease ${b.delay}s both`,
          }}
        />
      ))}
      <line x1="52" y1="38" x2="156" y2="38" stroke="#2a2a2a" strokeWidth="1" />
    </svg>
  );
}

function IllusLine() {
  const d = "M50,32 C70,28 80,22 100,18 C116,14 124,10 140,8 C152,6 160,4 180,4";
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <style>{`
        @keyframes ti-draw { to { stroke-dashoffset: 0; } }
        @keyframes ti-fade { to { opacity: 1; } }
      `}</style>
      <path d={d} stroke="#b8860b" strokeWidth="2" strokeLinecap="round" fill="none"
        style={{ strokeDasharray: 200, strokeDashoffset: 200, animation: "ti-draw 1.2s ease 0.1s forwards" }} />
      <path d={`${d} L180,38 L50,38 Z`} fill="#b8860b" opacity="0"
        style={{ animation: "ti-fade 0.4s ease 1.3s both" }} />
      <line x1="42" y1="38" x2="190" y2="38" stroke="#2a2a2a" strokeWidth="1" />
    </svg>
  );
}

function IllusPie() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <style>{`
        @keyframes ti-seg { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
      `}</style>
      <g transform="translate(116, 19)">
        <circle cx="0" cy="0" r="16" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />
        <circle cx="0" cy="0" r="11" fill="transparent" stroke="#b8860b" strokeWidth="8"
          strokeDasharray="43 57" strokeDashoffset="0" transform="rotate(-90)"
          style={{ opacity: 0, animation: "ti-fade 0.3s ease 0.1s both" }}
        />
        <circle cx="0" cy="0" r="11" fill="transparent" stroke="rgba(184,134,11,0.5)" strokeWidth="8"
          strokeDasharray="27 73" strokeDashoffset="-43" transform="rotate(-90)"
          style={{ opacity: 0, animation: "ti-fade 0.3s ease 0.3s both" }}
        />
        <circle cx="0" cy="0" r="11" fill="transparent" stroke="rgba(184,134,11,0.25)" strokeWidth="8"
          strokeDasharray="30 70" strokeDashoffset="-70" transform="rotate(-90)"
          style={{ opacity: 0, animation: "ti-fade 0.3s ease 0.5s both" }}
        />
      </g>
      <style>{`@keyframes ti-fade { to { opacity: 1; } }`}</style>
    </svg>
  );
}

function IllusDualLine() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <path d="M50,30 C70,24 90,18 110,14 C126,10 140,8 180,6"
        stroke="#b8860b" strokeWidth="2" strokeLinecap="round" fill="none"
        style={{ strokeDasharray: 180, strokeDashoffset: 180, animation: "ti-draw 1.1s ease 0.05s forwards" }} />
      <path d="M50,32 C70,30 90,26 110,24 C126,22 140,22 180,18"
        stroke="rgba(184,134,11,0.35)" strokeWidth="1.5" strokeLinecap="round" fill="none"
        strokeDasharray="5 4"
        style={{ strokeDashoffset: 180, animation: "ti-draw 1.1s ease 0.2s forwards" }} />
      <line x1="42" y1="38" x2="190" y2="38" stroke="#2a2a2a" strokeWidth="1" />
    </svg>
  );
}

function IllusTabs() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      {[
        { x: 44, w: 48, label: "Overview", delay: 0.05 },
        { x: 98, w: 44, label: "Stocks", delay: 0.15 },
        { x: 148, w: 40, label: "News", delay: 0.25 },
        { x: 194, w: 48, label: "Watchlist", delay: 0.35 },
      ].map((t, i) => (
        <g key={i} style={{ opacity: 0, animation: `ti-tab-in 0.3s ease ${t.delay}s both` }}>
          <rect x={t.x} y="10" width={t.w} height="22" rx="5"
            fill={i === 0 ? "rgba(184,134,11,0.12)" : "#161616"}
            stroke={i === 0 ? "#b8860b" : "#2a2a2a"} strokeWidth="0.8" />
        </g>
      ))}
      <style>{`@keyframes ti-tab-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </svg>
  );
}

function IllusChat() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <rect x="84" y="4" width="92" height="26" rx="8"
        fill="#1a1a1a" stroke="#b8860b" strokeWidth="1"
        style={{ opacity: 0, animation: "ti-fade 0.3s ease 0.1s both" }} />
      <path d="M104 30 L110 36 L116 30" fill="#1a1a1a" stroke="#b8860b" strokeWidth="1"
        style={{ opacity: 0, animation: "ti-fade 0.3s ease 0.2s both" }} />
      {[
        { cx: 112, delay: 0.4 },
        { cx: 126, delay: 0.55 },
        { cx: 140, delay: 0.7 },
      ].map((d, i) => (
        <circle key={i} cx={d.cx} cy="17" r="3" fill="#b8860b"
          style={{ opacity: 0, animation: `ti-dot-pulse 1s ease ${d.delay}s infinite` }} />
      ))}
      <style>{`
        @keyframes ti-fade { to { opacity: 1; } }
        @keyframes ti-dot-pulse { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
      `}</style>
    </svg>
  );
}

function IllusExport() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <rect x="110" y="4" width="40" height="28" rx="4"
        fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1"
        style={{ opacity: 0, animation: "ti-fade 0.3s ease 0s both" }} />
      <g style={{ animation: "ti-dl-bounce 1.2s ease 0.3s infinite" }}>
        <line x1="130" y1="10" x2="130" y2="22" stroke="#b8860b" strokeWidth="2" strokeLinecap="round" />
        <polyline points="124,18 130,24 136,18" stroke="#b8860b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      <line x1="118" y1="28" x2="142" y2="28" stroke="#b8860b" strokeWidth="1.5" strokeLinecap="round"
        style={{ opacity: 0, animation: "ti-fade 0.3s ease 0.1s both" }} />
      <style>{`
        @keyframes ti-fade { to { opacity: 1; } }
        @keyframes ti-dl-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
      `}</style>
    </svg>
  );
}

function IllusBell() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <g style={{ transformOrigin: "130px 8px", animation: "ti-bell-ring 1.5s ease 0.3s infinite" }}>
        <path d="M122,28 C122,30 124,32 130,32 C136,32 138,30 138,28 Z" fill="#b8860b" opacity="0.7" />
        <path d="M130,8 C123,8 118,13 118,20 L118,28 L142,28 L142,20 C142,13 137,8 130,8 Z"
          fill="#1a1a1a" stroke="#b8860b" strokeWidth="1.5" />
        <line x1="130" y1="4" x2="130" y2="8" stroke="#b8860b" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <circle cx="140" cy="12" r="4" fill="#b8860b"
        style={{ opacity: 0, animation: "ti-fade 0.3s ease 0.2s both" }} />
      <style>{`
        @keyframes ti-fade { to { opacity: 1; } }
        @keyframes ti-bell-ring { 0%,100% { transform: rotate(0deg); } 20% { transform: rotate(12deg); } 40% { transform: rotate(-10deg); } 60% { transform: rotate(6deg); } 80% { transform: rotate(-4deg); } }
      `}</style>
    </svg>
  );
}

// ── Tour stops ────────────────────────────────────────────────────────────────

const DESKTOP_STOPS: TourStop[] = [
  {
    id: "tour-desk-sidebar",
    label: "Sidebar",
    title: "Build your portfolio",
    description: "Search any ticker, set weights, enter your portfolio value, then hit Analyze.",
    Illus: IllusBars,
  },
  {
    id: "tour-desk-analyze",
    label: "Analyze",
    title: "Run your analysis",
    description: "Generates Sharpe ratio, CAGR, max drawdown, health score, and AI insights. Re-analyze anytime.",
    Illus: IllusLine,
  },
  {
    id: "tour-desk-metrics",
    label: "Key Metrics",
    title: "Your key metrics",
    description: "Four cards summarize your portfolio. Tap the question mark on any card for a plain-English explanation.",
    Illus: IllusPie,
  },
  {
    id: "tour-desk-chart",
    label: "Chart",
    title: "Performance vs benchmark",
    description: "Compare returns against S&P 500, Nasdaq, or Dow over 6M to 5Y. Use What-If to simulate changes.",
    Illus: IllusDualLine,
  },
  {
    id: "tour-desk-tabs",
    label: "Tabs",
    title: "Eight pages of intelligence",
    description: "Positions, Stocks, Income and Tax, Simulations, News, Watchlist, and Learn. All in one place.",
    Illus: IllusTabs,
  },
  {
    id: "tour-desk-chat",
    label: "AI Chat",
    title: "Your AI analyst",
    description: "Ask anything about your portfolio. Why Sharpe is low, what to rebalance, how a new position affects risk.",
    Illus: IllusChat,
  },
  {
    id: "tour-desk-export",
    label: "Export",
    title: "Export and share",
    description: "Generate a PDF, download a CSV, or get an AI-written report. Share with an advisor or keep for your records.",
    Illus: IllusExport,
  },
  {
    id: "tour-desk-bell",
    label: "Notifications",
    title: "Never miss a move",
    description: "Set price alerts on any ticker. Get notified by email or push. Weekly digest every Sunday.",
    Illus: IllusBell,
  },
];

const MOBILE_STOPS: TourStop[] = [
  { id: "tour-mob-home",      label: "Home",    title: "Go home anytime",          description: "The house icon takes you back to the Corvo homepage. Your portfolio is always saved." },
  { id: "tour-mob-hamburger", label: "Sidebar", title: "Your portfolio lives here", description: "Tap the menu to open the sidebar. Add tickers, set weights, then hit Analyze." },
  { id: "tour-mob-tabs",      label: "Tabs",    title: "Scroll to explore",        description: "Swipe the tab bar to see all pages: Positions, Stocks, Income, Simulations, News, and Watchlist." },
  { id: "tour-mob-bell",      label: "Alerts",  title: "Stay on top of moves",     description: "Set price alerts and portfolio notifications. Email or push when thresholds are hit." },
  { id: "tour-desk-chat",     label: "AI Chat", title: "Ask AI anything",          description: "Tap the chat button to open AI Chat. Ask about Sharpe, rebalancing ideas, or any metric." },
  { id: "tour-mob-profile",   label: "Account", title: "Your account",             description: "Tap your avatar to access Settings, Account, Referrals, and Sign Out." },
];

interface RingPos { top: number; left: number; width: number; height: number; }

function getRingPos(id: string): RingPos | null {
  if (typeof window === "undefined") return null;
  const el = document.getElementById(id);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function getTooltipPos(ring: RingPos): { top: number; left: number; placement: string } {
  const PAD = 14;
  const TH = 260;
  const TW = 300;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (ring.top + ring.height + PAD + TH < vh) {
    return { top: ring.top + ring.height + PAD, left: Math.min(Math.max(ring.left, 10), vw - TW - 10), placement: "bottom" };
  }
  if (ring.top - PAD - TH > 0) {
    return { top: ring.top - PAD - TH, left: Math.min(Math.max(ring.left, 10), vw - TW - 10), placement: "top" };
  }
  if (ring.left + ring.width + PAD + TW < vw) {
    return { top: Math.max(ring.top + ring.height / 2 - TH / 2, 10), left: ring.left + ring.width + PAD, placement: "right" };
  }
  return { top: Math.max(ring.top + ring.height / 2 - TH / 2, 10), left: Math.max(ring.left - TW - PAD, 10), placement: "left" };
}

interface Props {
  onComplete: () => void;
}

export default function DashboardTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [ring, setRing] = useState<RingPos | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(prev => { if (prev !== mobile) setStep(0); return mobile; });
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const STOPS = isMobile ? MOBILE_STOPS : DESKTOP_STOPS;
  const stop = STOPS[Math.min(step, STOPS.length - 1)];
  const total = STOPS.length;

  const updatePositions = useCallback(() => {
    const r = getRingPos(stop.id);
    setRing(r);
    if (r) setTooltipPos(getTooltipPos(r));
    else setTooltipPos(null);
  }, [stop.id]);

  useEffect(() => {
    const t = setTimeout(updatePositions, 80);
    return () => clearTimeout(t);
  }, [updatePositions]);

  useEffect(() => {
    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions, true);
    return () => {
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions, true);
    };
  }, [updatePositions]);

  const handleNext = () => {
    if (step >= total - 1) handleDone();
    else setStep(s => s + 1);
  };

  const handlePrev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleDone = () => {
    localStorage.setItem(TOUR_KEY, "true");
    onComplete();
  };

  const noTarget = !ring || !tooltipPos;
  const Illus = !isMobile ? stop.Illus : undefined;

  const cardStyle: React.CSSProperties = {
    background: "#1a1a18",
    border: "0.5px solid rgba(201,168,76,0.3)",
    borderLeft: "3px solid #b8860b",
    borderRadius: 11,
    padding: "14px 16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.65)",
    maxHeight: "85vh",
    overflowY: "auto",
  };

  return (
    <AnimatePresence mode="wait">
      <div key={step} style={{ position: "fixed", inset: 0, zIndex: 850, pointerEvents: "none" }}>
        <style>{`
          @keyframes tourGlow {
            0%, 100% { box-shadow: 0 0 0 3px rgba(184,134,11,0.25), 0 0 18px rgba(184,134,11,0.18); }
            50%       { box-shadow: 0 0 0 6px rgba(184,134,11,0.15), 0 0 32px rgba(184,134,11,0.28); }
          }
          @keyframes tourIn {
            from { opacity: 0; transform: scale(0.93) translateY(6px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Dim overlay */}
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", pointerEvents: "auto" }}
          onClick={!isMobile ? handleDone : undefined}
        />

        {/* Amber ring */}
        {ring && (
          <div style={{
            position: "fixed",
            top: ring.top - 4, left: ring.left - 4,
            width: ring.width + 8, height: ring.height + 8,
            borderRadius: 10,
            border: "2px solid rgba(184,134,11,0.85)",
            animation: "tourGlow 1.8s ease-in-out infinite",
            pointerEvents: "none",
            zIndex: 851,
          }} />
        )}

        {/* Tooltip card */}
        {(tooltipPos || noTarget) && (
          <div
            style={{
              position: "fixed",
              top: tooltipPos ? tooltipPos.top : "50%",
              left: tooltipPos ? tooltipPos.left : "50%",
              transform: tooltipPos ? "none" : "translate(-50%,-50%)",
              width: 300,
              zIndex: 852,
              pointerEvents: "auto",
              animation: "tourIn 0.22s ease-out",
            }}>
            {isMobile ? (
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 9, letterSpacing: 2, color: "#b8860b", textTransform: "uppercase" }}>
                    {step + 1} / {total}
                  </span>
                  <button onClick={handleDone} style={{ fontSize: 11, color: "#b8860b", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: 0.2 }}>
                    Skip
                  </button>
                </div>
                {stop.title && (
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e3d4", marginBottom: 6 }}>
                    {stop.title}
                  </div>
                )}
                <p style={{ fontSize: 12, color: "#c8c4b8", lineHeight: 1.6, marginBottom: 14 }}>
                  {stop.description}
                </p>
                <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
                  {STOPS.map((_, i) => (
                    <div key={i} style={{ width: i === step ? 16 : 6, height: 4, borderRadius: 2, background: i <= step ? "#b8860b" : "rgba(255,255,255,0.15)", transition: "all 0.2s" }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={handleNext} style={{ padding: "7px 18px", fontSize: 12, fontWeight: 600, background: "#b8860b", border: "none", borderRadius: 7, color: "#fff", cursor: "pointer", letterSpacing: 0.3 }}>
                    {step >= total - 1 ? "Done" : "Next"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Illus ? 10 : 8 }}>
                  <div>
                    <span style={{ fontSize: 9, letterSpacing: 2, color: "#b8860b", textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>
                      {step + 1} / {total}
                    </span>
                    {stop.title && (
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e3d4" }}>
                        {stop.title}
                      </div>
                    )}
                  </div>
                  <button onClick={handleDone} style={{ fontSize: 11, color: "#b8860b", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: 0.2, flexShrink: 0, marginTop: 2 }}>
                    Skip
                  </button>
                </div>

                {Illus && <Illus />}

                <p style={{ fontSize: 12, color: "#c8c4b8", lineHeight: 1.6, marginBottom: 12 }}>
                  {stop.description}
                </p>

                <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
                  {STOPS.map((_, i) => (
                    <div key={i} style={{ width: i === step ? 16 : 6, height: 4, borderRadius: 2, background: i <= step ? "#b8860b" : "rgba(255,255,255,0.15)", transition: "all 0.2s" }} />
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={handlePrev} disabled={step === 0} style={{ fontSize: 11, color: step === 0 ? "rgba(255,255,255,0.2)" : "#b8860b", background: "none", border: "none", cursor: step === 0 ? "default" : "pointer", padding: 0, letterSpacing: 0.2 }}>
                    Back
                  </button>
                  <button onClick={handleNext} style={{ padding: "7px 18px", fontSize: 12, fontWeight: 600, background: "#b8860b", border: "none", borderRadius: 7, color: "#fff", cursor: "pointer", letterSpacing: 0.3 }}>
                    {step >= total - 1 ? "Done" : "Next"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
