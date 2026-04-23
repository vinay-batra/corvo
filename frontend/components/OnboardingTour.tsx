"use client";

import { useState, useEffect, useCallback } from "react";

interface Props {
  assets: { ticker: string; weight: number }[];
  dataAvailable: boolean;
  onComplete: () => void;
}

type StepNum = 1 | 2 | 3;

const STEPS: Record<StepNum, { targetId: string; text: string; nextLabel: string; isLast: boolean }> = {
  1: {
    targetId: "tour-ticker-area",
    text: "Start by adding a ticker: type AAPL or MSFT and set its weight",
    nextLabel: "Got it →",
    isLast: false,
  },
  2: {
    targetId: "tour-analyze-btn",
    text: "Hit Analyze to get your health score, Sharpe ratio, and AI insights",
    nextLabel: "Got it →",
    isLast: false,
  },
  3: {
    targetId: "tour-save-btn",
    text: "Save this portfolio to track its performance over time",
    nextLabel: "Done ✓",
    isLast: true,
  },
};

function getTooltipPos(id: string): { top: number; left: number } | null {
  if (typeof window === "undefined") return null;
  const el = document.getElementById(id);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  // If element is hidden (e.g. sidebar collapsed) skip
  if (rect.width === 0 || rect.right <= 0) return null;
  return {
    top: Math.max(8, rect.top + rect.height / 2 - 56),
    left: rect.right + 14,
  };
}

export default function OnboardingTour({ assets, dataAvailable, onComplete }: Props) {
  const [step, setStep] = useState<StepNum>(1);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const hasValidAsset = assets.some(a => a.ticker && a.weight > 0);

  const conditionMet = (s: StepNum) => {
    if (s === 1) return true;
    if (s === 2) return hasValidAsset;
    if (s === 3) return dataAvailable;
    return false;
  };

  const updatePos = useCallback(() => {
    const p = getTooltipPos(STEPS[step].targetId);
    setPos(p);
  }, [step]);

  useEffect(() => {
    if (conditionMet(step)) {
      updatePos();
    } else {
      setPos(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, hasValidAsset, dataAvailable, updatePos]);

  useEffect(() => {
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [updatePos]);

  const handleNext = () => {
    if (step === 3) {
      onComplete();
      return;
    }
    setStep((s) => (s + 1) as StepNum);
  };

  const cfg = STEPS[step];
  // Only render if condition met and position is known
  if (!pos || !conditionMet(step)) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 900,
        width: 272,
        animation: "tourIn 0.22s ease-out",
        pointerEvents: "auto",
      }}
    >
      <style>{`
        @keyframes tourIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Arrow pointing left at the target */}
      <div style={{
        position: "absolute",
        left: -9,
        top: 18,
        width: 0,
        height: 0,
        borderTop: "9px solid transparent",
        borderBottom: "9px solid transparent",
        borderRight: "9px solid #b8860b",
      }} />
      <div style={{
        position: "absolute",
        left: -6,
        top: 20,
        width: 0,
        height: 0,
        borderTop: "7px solid transparent",
        borderBottom: "7px solid transparent",
        borderRight: "7px solid var(--card-bg)",
      }} />

      {/* Card */}
      <div style={{
        background: "var(--card-bg)",
        borderTop: "0.5px solid rgba(201,168,76,0.22)",
        borderRight: "0.5px solid rgba(201,168,76,0.22)",
        borderBottom: "0.5px solid rgba(201,168,76,0.22)",
        borderLeft: "3px solid #b8860b",
        borderRadius: 10,
        padding: "13px 15px",
        boxShadow: "0 6px 28px rgba(0,0,0,0.55)",
      }}>
        {/* Step counter */}
        <div style={{
          fontSize: 9,
          letterSpacing: 2,
          color: "var(--accent)",
          textTransform: "uppercase",
          marginBottom: 8,
        }}>
          Step {step} of 3
        </div>

        <p style={{
          fontSize: 13,
          color: "var(--text)",
          lineHeight: 1.65,
          marginBottom: 14,
        }}>
          {cfg.text}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={onComplete}
            style={{
              fontSize: 11,
              color: "var(--text3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              letterSpacing: 0.2,
            }}
          >
            Skip tour
          </button>
          <button
            onClick={handleNext}
            style={{
              padding: "7px 15px",
              fontSize: 12,
              fontWeight: 600,
              background: "var(--accent)",
              border: "none",
              borderRadius: 7,
              color: "var(--bg)",
              cursor: "pointer",
              letterSpacing: 0.3,
            }}
          >
            {cfg.nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
