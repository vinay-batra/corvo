"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";

const TOUR_KEY = "corvo_tour_completed";

interface TourStop {
  id: string;
  label: string;
  title?: string;
  description: string;
  Illus?: () => React.ReactElement;
  placement?: "bottom" | "top";
}

// ── Animated SVG illustrations — all colors via CSS variables ─────────────────

function IllusBars() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <style>{`
        @keyframes ti-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      `}</style>
      {[
        { x: 62, h: 22, delay: 0.05, op: 0.45 },
        { x: 80, h: 32, delay: 0.15, op: 0.6 },
        { x: 98, h: 16, delay: 0.25, op: 0.4 },
        { x: 116, h: 28, delay: 0.35, op: 0.7 },
        { x: 134, h: 38, delay: 0.45, op: 1 },
      ].map((b, i) => (
        <rect
          key={i} x={b.x} y={38 - b.h} width="12" height={b.h} rx="1.5"
          style={{
            fill: "var(--accent)",
            opacity: b.op,
            transformBox: "fill-box" as any,
            transformOrigin: "center bottom",
            transform: "scaleY(0)",
            animation: `ti-grow 0.45s ease ${b.delay}s both`,
          }}
        />
      ))}
      <line x1="52" y1="38" x2="156" y2="38" style={{ stroke: "var(--border)" }} strokeWidth="1" />
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
      <path d={d} strokeWidth="2" strokeLinecap="round" fill="none"
        style={{ stroke: "var(--accent)", strokeDasharray: 200, strokeDashoffset: 200, animation: "ti-draw 1.2s ease 0.1s forwards" }} />
      <path d={`${d} L180,38 L50,38 Z`}
        style={{ fill: "var(--accent)", opacity: 0, animation: "ti-fade 0.4s ease 1.3s both" }} />
      <line x1="42" y1="38" x2="190" y2="38" strokeWidth="1" style={{ stroke: "var(--border)" }} />
    </svg>
  );
}

function IllusPie() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <style>{`@keyframes ti-fade { to { opacity: 1; } }`}</style>
      <g transform="translate(116, 19)">
        <circle cx="0" cy="0" r="16" strokeWidth="1"
          style={{ fill: "var(--card-bg)", stroke: "var(--border)" }} />
        <circle cx="0" cy="0" r="11" fill="transparent" strokeWidth="8"
          strokeDasharray="43 57" strokeDashoffset="0" transform="rotate(-90)"
          style={{ stroke: "var(--accent)", opacity: 0, animation: "ti-fade 0.3s ease 0.1s both" }} />
        <circle cx="0" cy="0" r="11" fill="transparent" strokeWidth="8"
          strokeDasharray="27 73" strokeDashoffset="-43" transform="rotate(-90)"
          style={{ stroke: "rgba(var(--accent-rgb), 0.5)", opacity: 0, animation: "ti-fade 0.3s ease 0.3s both" }} />
        <circle cx="0" cy="0" r="11" fill="transparent" strokeWidth="8"
          strokeDasharray="30 70" strokeDashoffset="-70" transform="rotate(-90)"
          style={{ stroke: "rgba(var(--accent-rgb), 0.25)", opacity: 0, animation: "ti-fade 0.3s ease 0.5s both" }} />
      </g>
    </svg>
  );
}

function IllusDualLine() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <style>{`@keyframes ti-draw { to { stroke-dashoffset: 0; } }`}</style>
      <path d="M50,30 C70,24 90,18 110,14 C126,10 140,8 180,6"
        strokeWidth="2" strokeLinecap="round" fill="none"
        style={{ stroke: "var(--accent)", strokeDasharray: 180, strokeDashoffset: 180, animation: "ti-draw 1.1s ease 0.05s forwards" }} />
      <path d="M50,32 C70,30 90,26 110,24 C126,22 140,22 180,18"
        strokeWidth="1.5" strokeLinecap="round" fill="none" strokeDasharray="5 4"
        style={{ stroke: "rgba(var(--accent-rgb), 0.35)", strokeDashoffset: 180, animation: "ti-draw 1.1s ease 0.2s forwards" }} />
      <line x1="42" y1="38" x2="190" y2="38" strokeWidth="1" style={{ stroke: "var(--border)" }} />
    </svg>
  );
}

function IllusTabs() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <style>{`@keyframes ti-tab-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      {[
        { x: 44, w: 48, delay: 0.05, active: true },
        { x: 98, w: 44, delay: 0.15, active: false },
        { x: 148, w: 40, delay: 0.25, active: false },
        { x: 194, w: 48, delay: 0.35, active: false },
      ].map((t, i) => (
        <g key={i} style={{ opacity: 0, animation: `ti-tab-in 0.3s ease ${t.delay}s both` }}>
          <rect x={t.x} y="10" width={t.w} height="22" rx="5" strokeWidth="0.8"
            style={{
              fill: t.active ? "rgba(var(--accent-rgb), 0.12)" : "var(--bg3)",
              stroke: t.active ? "var(--accent)" : "var(--border)",
            }} />
        </g>
      ))}
    </svg>
  );
}

function IllusChat() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <style>{`
        @keyframes ti-bubble-in { to { opacity: 1; } }
        @keyframes ti-typing {
          0%, 100% { opacity: 0.3; transform: translateY(0px); }
          50%       { opacity: 1;   transform: translateY(-3px); }
        }
      `}</style>
      {/* Chat bubble */}
      <rect x="84" y="6" width="92" height="24" rx="8" strokeWidth="1"
        style={{ fill: "var(--card-bg)", stroke: "var(--accent)", opacity: 0, animation: "ti-bubble-in 0.25s ease 0.1s both" }} />
      {/* Bubble tail */}
      <path d="M100 30 L106 36 L112 30" strokeWidth="1"
        style={{ fill: "var(--card-bg)", stroke: "var(--accent)", opacity: 0, animation: "ti-bubble-in 0.25s ease 0.2s both" }} />
      {/* Three typing dots — staggered delays: 0ms, 150ms, 300ms */}
      {[
        { cx: 114, delay: "0ms" },
        { cx: 130, delay: "150ms" },
        { cx: 146, delay: "300ms" },
      ].map((d, i) => (
        <circle key={i} cx={d.cx} cy="18" r="3"
          style={{
            fill: "var(--accent)",
            opacity: 0.3,
            animation: `ti-typing 0.9s ease-in-out ${d.delay} infinite`,
          }} />
      ))}
    </svg>
  );
}

function IllusExport() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <style>{`
        @keyframes ti-fade { to { opacity: 1; } }
        @keyframes ti-dl-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
      `}</style>
      <rect x="110" y="4" width="40" height="28" rx="4" strokeWidth="1"
        style={{ fill: "var(--card-bg)", stroke: "var(--border)", opacity: 0, animation: "ti-fade 0.3s ease 0s both" }} />
      <g style={{ animation: "ti-dl-bounce 1.2s ease 0.3s infinite" }}>
        <line x1="130" y1="10" x2="130" y2="22" strokeWidth="2" strokeLinecap="round"
          style={{ stroke: "var(--accent)" }} />
        <polyline points="124,18 130,24 136,18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
          style={{ stroke: "var(--accent)" }} />
      </g>
      <line x1="118" y1="28" x2="142" y2="28" strokeWidth="1.5" strokeLinecap="round"
        style={{ stroke: "var(--accent)", opacity: 0, animation: "ti-fade 0.3s ease 0.1s both" }} />
    </svg>
  );
}

function IllusBell() {
  return (
    <svg width="100%" height="38" viewBox="0 0 260 38" fill="none" style={{ display: "block", marginBottom: 10 }}>
      <style>{`
        @keyframes ti-fade { to { opacity: 1; } }
        @keyframes ti-bell-ring {
          0%,100% { transform: rotate(0deg); }
          20% { transform: rotate(12deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(6deg); }
          80% { transform: rotate(-4deg); }
        }
      `}</style>
      <g style={{ transformOrigin: "130px 8px", animation: "ti-bell-ring 1.5s ease 0.3s infinite" }}>
        <path d="M130,8 C123,8 118,13 118,20 L118,28 L142,28 L142,20 C142,13 137,8 130,8 Z"
          strokeWidth="1.5"
          style={{ fill: "var(--card-bg)", stroke: "var(--accent)" }} />
        <path d="M122,28 C122,30 124,32 130,32 C136,32 138,30 138,28 Z"
          style={{ fill: "var(--accent)", opacity: 0.7 }} />
        <line x1="130" y1="4" x2="130" y2="8" strokeWidth="1.5" strokeLinecap="round"
          style={{ stroke: "var(--accent)" }} />
      </g>
      <circle cx="140" cy="12" r="4"
        style={{ fill: "var(--accent)", opacity: 0, animation: "ti-fade 0.3s ease 0.2s both" }} />
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
    placement: "bottom",
  },
  {
    id: "tour-desk-chart",
    label: "Chart",
    title: "Performance vs benchmark",
    description: "Compare returns against S&P 500, Nasdaq, or Dow over 6M to 5Y. Use What-If to simulate changes.",
    Illus: IllusDualLine,
    placement: "bottom",
  },
  {
    id: "tour-desk-tabs",
    label: "Tabs",
    title: "Eight pages of intelligence",
    description: "Positions, Stocks, Income and Tax, Simulations, News, Watchlist, and Learn. All in one place.",
    Illus: IllusTabs,
    placement: "bottom",
  },
  {
    id: "tour-desk-chat",
    label: "AI Chat",
    title: "Your AI analyst",
    description: "Ask anything about your portfolio. Why Sharpe is low, what to rebalance, how a new position affects risk.",
    Illus: IllusChat,
    placement: "top",
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

function getTooltipPos(ring: RingPos, forcePlacement?: "bottom" | "top"): { top: number; left: number; placement: string } {
  const PAD = 14;
  const TH = 260;
  const TW = 300;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampLeft = (l: number) => Math.min(Math.max(l, 10), vw - TW - 10);
  // Never let the tooltip bottom edge fall below the viewport
  const clampTop = (t: number) => Math.min(Math.max(t, 10), vh - TH - 10);

  const canFitBelow = ring.top + ring.height + PAD + TH < vh;
  const canFitAbove = ring.top - PAD - TH > 0;

  if (forcePlacement === "bottom") {
    // Flip to top if it would overflow the bottom
    if (!canFitBelow && canFitAbove) {
      return { top: clampTop(ring.top - PAD - TH), left: clampLeft(ring.left), placement: "top" };
    }
    return { top: clampTop(ring.top + ring.height + PAD), left: clampLeft(ring.left), placement: "bottom" };
  }
  if (forcePlacement === "top") {
    // Flip to bottom if it would overflow the top
    if (!canFitAbove && canFitBelow) {
      return { top: clampTop(ring.top + ring.height + PAD), left: clampLeft(ring.left), placement: "bottom" };
    }
    return { top: clampTop(ring.top - PAD - TH), left: clampLeft(ring.left), placement: "top" };
  }

  if (canFitBelow) {
    return { top: clampTop(ring.top + ring.height + PAD), left: clampLeft(ring.left), placement: "bottom" };
  }
  if (canFitAbove) {
    return { top: clampTop(ring.top - PAD - TH), left: clampLeft(ring.left), placement: "top" };
  }
  if (ring.left + ring.width + PAD + TW < vw) {
    return { top: clampTop(ring.top + ring.height / 2 - TH / 2), left: ring.left + ring.width + PAD, placement: "right" };
  }
  return { top: clampTop(ring.top + ring.height / 2 - TH / 2), left: Math.max(ring.left - TW - PAD, 10), placement: "left" };
}

interface Props {
  onComplete: () => void;
}

export default function DashboardTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [ring, setRing] = useState<RingPos | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  // settling: true while waiting for DOM to fully settle before showing the card
  const [settling, setSettling] = useState(true);

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
    if (typeof window === "undefined") return;
    // Scroll target into view before calculating position (null-safe)
    const el = document.getElementById(stop.id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const r = getRingPos(stop.id);
    setRing(r);
    if (r) setTooltipPos(getTooltipPos(r, stop.placement));
    else setTooltipPos(null);
  }, [stop.id, stop.placement]);

  // beforeShowPromise equivalent: hide card while DOM settles (130ms = 80ms base + 50ms extra)
  useEffect(() => {
    setSettling(true);
    const t = setTimeout(() => {
      updatePositions();
      setSettling(false);
    }, 130);
    return () => clearTimeout(t);
  }, [updatePositions]);

  useEffect(() => {
    window.addEventListener("resize", updatePositions, { passive: true });
    window.addEventListener("scroll", updatePositions, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions, { capture: true } as any);
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
    if (typeof window !== "undefined") localStorage.setItem(TOUR_KEY, "true");
    onComplete();
  };

  const noTarget = !ring || !tooltipPos;
  const Illus = !isMobile ? stop.Illus : undefined;

  const cardStyle: React.CSSProperties = {
    background: "var(--card-bg)",
    border: "0.5px solid rgba(var(--accent-rgb), 0.3)",
    borderLeft: "3px solid var(--accent)",
    borderRadius: "var(--radius-lg)",
    padding: "14px 16px",
    boxShadow: "var(--shadow-md)",
    maxHeight: "85vh",
    overflowY: "auto",
    overscrollBehavior: "none",
  };

  return (
    <AnimatePresence initial={false} mode="wait">
      <div key={step} style={{ position: "fixed", inset: 0, zIndex: 850, pointerEvents: "none" }}>
        <style>{`
          @keyframes tourGlow {
            0%, 100% { box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.25), 0 0 18px rgba(var(--accent-rgb), 0.18); }
            50%       { box-shadow: 0 0 0 6px rgba(var(--accent-rgb), 0.15), 0 0 32px rgba(var(--accent-rgb), 0.28); }
          }
          @keyframes tourIn {
            from { opacity: 0; transform: scale(0.93) translateY(6px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Dim overlay */}
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", pointerEvents: "auto" }}
          onClick={!isMobile ? handleDone : undefined}
        />

        {/* Amber ring — hidden while DOM is settling */}
        {ring && !settling && (
          <div style={{
            position: "fixed",
            top: ring.top - 4, left: ring.left - 4,
            width: ring.width + 8, height: ring.height + 8,
            borderRadius: "var(--radius)",
            border: "2px solid rgba(var(--accent-rgb), 0.85)",
            animation: "tourGlow 1.8s ease-in-out infinite",
            pointerEvents: "none",
            zIndex: 851,
          }} />
        )}

        {/* Tooltip card — hidden while DOM is settling, transition:none prevents position snap */}
        {!settling && (tooltipPos || noTarget) && (
          <div
            style={isMobile ? {
              position: "fixed",
              bottom: 80,
              left: 16,
              right: 16,
              width: "auto",
              zIndex: 852,
              pointerEvents: "auto",
              animation: "tourIn 0.22s ease-out",
              transition: "none",
            } : {
              position: "fixed",
              top: tooltipPos ? tooltipPos.top : "50%",
              left: tooltipPos ? tooltipPos.left : "50%",
              transform: tooltipPos ? "none" : "translate(-50%,-50%)",
              width: 300,
              zIndex: 852,
              pointerEvents: "auto",
              animation: "tourIn 0.22s ease-out",
              transition: "none",
            }}>
            {isMobile ? (
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--accent)", textTransform: "uppercase" }}>
                    {step + 1} / {total}
                  </span>
                  <button onClick={handleDone} style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: 0.2 }}>
                    Skip
                  </button>
                </div>
                {stop.title && (
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                    {stop.title}
                  </div>
                )}
                <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, marginBottom: 14 }}>
                  {stop.description}
                </p>
                <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
                  {STOPS.map((_, i) => (
                    <div key={i} style={{
                      width: i === step ? 16 : 6, height: 4, borderRadius: 2,
                      background: i <= step ? "var(--accent)" : "var(--bg3)",
                      transition: "all 0.2s",
                    }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={handleNext} style={{ padding: "7px 18px", fontSize: 12, fontWeight: 600, background: "var(--accent)", border: "none", borderRadius: "var(--radius)", color: "var(--bg)", cursor: "pointer", letterSpacing: 0.3 }}>
                    {step >= total - 1 ? "Done" : "Next"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Illus ? 10 : 8 }}>
                  <div>
                    <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--accent)", textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>
                      {step + 1} / {total}
                    </span>
                    {stop.title && (
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                        {stop.title}
                      </div>
                    )}
                  </div>
                  <button onClick={handleDone} style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: 0.2, flexShrink: 0, marginTop: 2 }}>
                    Skip
                  </button>
                </div>

                {Illus && <Illus />}

                <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, marginBottom: 12 }}>
                  {stop.description}
                </p>

                <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
                  {STOPS.map((_, i) => (
                    <div key={i} style={{
                      width: i === step ? 16 : 6, height: 4, borderRadius: 2,
                      background: i <= step ? "var(--accent)" : "var(--bg3)",
                      transition: "all 0.2s",
                    }} />
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={handlePrev} disabled={step === 0} style={{
                    fontSize: 11,
                    color: step === 0 ? "var(--text3)" : "var(--accent)",
                    background: "none", border: "none",
                    cursor: step === 0 ? "default" : "pointer",
                    padding: 0, letterSpacing: 0.2,
                  }}>
                    Back
                  </button>
                  <button onClick={handleNext} style={{ padding: "7px 18px", fontSize: 12, fontWeight: 600, background: "var(--accent)", border: "none", borderRadius: "var(--radius)", color: "var(--bg)", cursor: "pointer", letterSpacing: 0.3 }}>
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
