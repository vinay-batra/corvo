"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TOUR_KEY = "corvo_tour_completed";

interface TourStop {
  id: string;
  label: string;
  title?: string;
  description: string;
}

const DESKTOP_STOPS: TourStop[] = [
  { id: "tour-desk-sidebar",  label: "Sidebar",       title: "Build your portfolio",        description: "Add any stock, ETF, crypto, or money market fund by searching here. Set each holding's weight, enter your portfolio value, then hit Analyze." },
  { id: "tour-desk-analyze",  label: "Analyze",       title: "Run your analysis",           description: "Hit Analyze to generate your full risk breakdown — Sharpe ratio, CAGR, max drawdown, volatility, health score, AI insights, and benchmark comparison. Re-analyze anytime your holdings change." },
  { id: "tour-desk-metrics",  label: "Key Metrics",   title: "Your key metrics",            description: "These four cards summarize your portfolio at a glance. Click the ? on any card for a plain-English explanation of what the metric means and how to interpret it." },
  { id: "tour-desk-chart",    label: "Chart",         title: "Performance vs benchmark",    description: "See how your portfolio stacks up against the S&P 500, Nasdaq, or Dow over 6M, 1Y, 2Y, or 5Y. Use What-If to simulate changes before making them." },
  { id: "tour-desk-tabs",     label: "Tabs",          title: "Eight pages of intelligence", description: "Dashboard is just the start. Explore Positions for live prices, Stocks to research any ticker, Income & Tax for dividends and harvesting, Simulations for Monte Carlo, News for market events and earnings, Watchlist for alerts, and Learn to level up." },
  { id: "tour-desk-chat",     label: "AI Chat",       title: "Your AI analyst",             description: "Ask anything about your portfolio — why your Sharpe is low, what to rebalance, how a new position would affect your risk. The AI has full context of your holdings and live market data." },
  { id: "tour-desk-export",   label: "Export",        title: "Export and share",            description: "Generate a PDF report with your full analysis, download a CSV of your positions, or generate an AI-written report. Great for sharing with an advisor or just keeping records." },
  { id: "tour-desk-bell",     label: "Notifications", title: "Never miss a move",           description: "Set price alerts on any ticker and get notified by email or push when thresholds are hit. The weekly digest emails you a full portfolio summary every Sunday." },
];

const MOBILE_STOPS: TourStop[] = [
  { id: "tour-mob-home",      label: "Home",       title: "Go home anytime",          description: "The house icon takes you back to the Corvo homepage. Your portfolio and settings are always saved." },
  { id: "tour-mob-hamburger", label: "Sidebar",    title: "Your portfolio lives here", description: "Tap the menu icon to open the sidebar. Add tickers, set weights, choose your period and benchmark, then hit Analyze to get your full breakdown." },
  { id: "tour-mob-tabs",      label: "Tabs",       title: "Scroll to explore",        description: "Swipe the tab bar left to see all pages — Positions, Stocks, Income & Tax, Simulations, News, Watchlist, and Learn." },
  { id: "tour-mob-bell",      label: "Alerts",     title: "Stay on top of moves",     description: "Set price alerts and portfolio notifications here. You'll get an email or push notification when your thresholds are hit." },
  { id: "tour-desk-chat",     label: "AI Chat",    title: "Ask AI anything",          description: "Tap the chat button to open AI Chat. Ask about your Sharpe ratio, get rebalancing ideas, or go deeper on any metric in your portfolio." },
  { id: "tour-mob-profile",   label: "Account",    title: "Your account",             description: "Tap your avatar to access Settings, your Account, Referrals, and Sign Out." },
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
  const TH = 160; // approx tooltip height
  const TW = 290; // approx tooltip width
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Prefer below, then above, then right, then left
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
    // Small delay to allow DOM to settle after tab changes
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
    if (step >= total - 1) {
      handleDone();
    } else {
      setStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleDone = () => {
    localStorage.setItem(TOUR_KEY, "true");
    onComplete();
  };

  // If the element isn't on screen, show a minimal skip-only tooltip centered
  const noTarget = !ring || !tooltipPos;

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

        {/* Dim overlay: clickable to skip on desktop only */}
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", pointerEvents: "auto" }}
          onClick={!isMobile ? handleDone : undefined}
        />

        {/* Amber ring around target */}
        {ring && (
          <div style={{
            position: "fixed",
            top: ring.top - 4,
            left: ring.left - 4,
            width: ring.width + 8,
            height: ring.height + 8,
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
              width: 290,
              zIndex: 852,
              pointerEvents: "auto",
              animation: "tourIn 0.22s ease-out",
            }}>
            {isMobile ? (
              /* ── Mobile tooltip ── */
              <div style={{
                background: "#1a1a18",
                border: "0.5px solid rgba(201,168,76,0.3)",
                borderLeft: "3px solid #b8860b",
                borderRadius: 11,
                padding: "14px 16px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.65)",
              }}>
                {/* Header: step counter + Skip (top right, only skip option) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 9, letterSpacing: 2, color: "#b8860b", textTransform: "uppercase" }}>
                    {step + 1} / {total}
                  </span>
                  <button
                    onClick={handleDone}
                    style={{ fontSize: 11, color: "#b8860b", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: 0.2 }}>
                    Skip
                  </button>
                </div>

                {/* Title */}
                {stop.title && (
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e3d4", marginBottom: 6 }}>
                    {stop.title}
                  </div>
                )}

                {/* Description */}
                <p style={{ fontSize: 13, color: "#c8c4b8", lineHeight: 1.65, marginBottom: 14 }}>
                  {stop.description}
                </p>

                {/* Progress dots */}
                <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
                  {STOPS.map((_, i) => (
                    <div key={i} style={{
                      width: i === step ? 16 : 6, height: 4, borderRadius: 2,
                      background: i <= step ? "#b8860b" : "rgba(255,255,255,0.15)",
                      transition: "all 0.2s",
                    }} />
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={handleNext}
                    style={{
                      padding: "7px 18px", fontSize: 12, fontWeight: 600,
                      background: "#b8860b", border: "none", borderRadius: 7,
                      color: "#fff", cursor: "pointer", letterSpacing: 0.3,
                    }}>
                    {step >= total - 1 ? "Done" : "Next →"}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Desktop tooltip ── */
              <div style={{
                background: "#1a1a18",
                border: "0.5px solid rgba(201,168,76,0.3)",
                borderLeft: "3px solid #b8860b",
                borderRadius: 11,
                padding: "14px 16px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.65)",
              }}>
                {/* Header: step counter + title | Skip */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 9, letterSpacing: 2, color: "#b8860b", textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>
                      {step + 1} / {total}
                    </span>
                    {stop.title && (
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e3d4" }}>
                        {stop.title}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleDone}
                    style={{ fontSize: 11, color: "#b8860b", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: 0.2, flexShrink: 0, marginTop: 2 }}>
                    Skip
                  </button>
                </div>

                <p style={{ fontSize: 13, color: "#c8c4b8", lineHeight: 1.65, marginBottom: 14 }}>
                  {stop.description}
                </p>

                {/* Progress dots */}
                <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
                  {STOPS.map((_, i) => (
                    <div key={i} style={{
                      width: i === step ? 16 : 6, height: 4, borderRadius: 2,
                      background: i <= step ? "#b8860b" : "rgba(255,255,255,0.15)",
                      transition: "all 0.2s",
                    }} />
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    onClick={handlePrev}
                    disabled={step === 0}
                    style={{ fontSize: 11, color: step === 0 ? "rgba(255,255,255,0.2)" : "#b8860b", background: "none", border: "none", cursor: step === 0 ? "default" : "pointer", padding: 0, letterSpacing: 0.2 }}>
                    ← Back
                  </button>
                  <button
                    onClick={handleNext}
                    style={{
                      padding: "7px 18px", fontSize: 12, fontWeight: 600,
                      background: "#b8860b", border: "none", borderRadius: 7,
                      color: "#fff", cursor: "pointer", letterSpacing: 0.3,
                    }}>
                    {step >= total - 1 ? "Done" : "Next →"}
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
