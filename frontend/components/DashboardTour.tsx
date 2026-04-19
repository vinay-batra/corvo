"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TOUR_KEY = "corvo_tour_completed";

interface TourStop {
  id: string;
  label: string;
  description: string;
}

const STOPS: TourStop[] = [
  { id: "tour-analyze-btn",        label: "Analyze",           description: "Run your portfolio analysis here: get Sharpe ratio, health score, and AI insights." },
  { id: "tour-ai-chat-fab",        label: "AI Chat",           description: "Ask AI anything about your portfolio: risk, strategy, what-if scenarios." },
  { id: "tour-keyboard-shortcuts", label: "Keyboard Shortcuts", description: "Navigate the dashboard with keyboard shortcuts. Press ? anytime to see them." },
  { id: "tour-dark-mode-toggle",   label: "Light / Dark Mode",  description: "Switch between light and dark mode to match your preference." },
  { id: "tour-settings-btn",       label: "Settings",           description: "Set price alerts, email preferences, and manage your account." },
  { id: "tour-profile-btn",        label: "Profile",            description: "Manage your account, goals, and referrals." },
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

  const stop = STOPS[step];
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

        {/* Dim overlay: clickable to skip */}
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", pointerEvents: "auto" }}
          onClick={handleDone}
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
            <div style={{
              background: "#1a1a18",
              border: "0.5px solid rgba(201,168,76,0.3)",
              borderLeft: "3px solid #b8860b",
              borderRadius: 11,
              padding: "14px 16px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.65)",
            }}>
              {/* Step counter */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--accent)", textTransform: "uppercase" }}>
                  {step + 1} / {total}
                </span>
                <span style={{
                  fontSize: 9, color: "var(--accent)", background: "rgba(184,134,11,0.12)",
                  padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                }}>{stop.label}</span>
              </div>

              <p style={{ fontSize: 13, color: "#e8e0cc", lineHeight: 1.65, marginBottom: 14 }}>
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
                  onClick={handleDone}
                  style={{ fontSize: 11, color: "rgba(232,224,204,0.35)", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: 0.2 }}>
                  Skip Tour
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
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
