"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = {
  navy3: "#111620", border: "rgba(255,255,255,0.07)",
  cream: "#e8e0cc", cream2: "rgba(232,224,204,0.5)", cream3: "rgba(232,224,204,0.25)",
  amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)",
};

const STEPS = [
  {
    icon: "◈",
    title: "Add your holdings",
    desc: "Search any stock, ETF, or crypto in the left panel. Set the weight for each asset — or import a screenshot from Fidelity, Robinhood, or Schwab.",
    tip: "Tip: Click the % badge to auto-equalize all weights.",
    highlight: "sidebar",
  },
  {
    icon: "▶",
    title: "Click Analyze",
    desc: "Hit the Analyze button to run your full portfolio analysis. Corvo fetches live data and calculates returns, volatility, Sharpe ratio, and more.",
    tip: "Analysis usually completes in 2–5 seconds.",
    highlight: "analyze",
  },
  {
    icon: "◎",
    title: "Read your Health Score",
    desc: "Your portfolio gets a 0–100 score across returns, risk-adjusted performance, stability, and resilience. Each dimension is broken down separately.",
    tip: "A score above 60 is generally solid. Under 40 means there's room to improve.",
    highlight: "overview",
  },
  {
    icon: "✦",
    title: "Ask the AI anything",
    desc: "Switch to AI Chat and ask questions in plain English. Corvo AI knows your exact holdings, goals, risk tolerance, and portfolio metrics.",
    tip: "Try: \"Am I taking too much risk for my age?\" or \"What should I change?\"",
    highlight: "ai",
  },
  {
    icon: "⊞",
    title: "Compare portfolios",
    desc: "Save multiple portfolios and compare them side-by-side in the Compare tab. See return, volatility, Sharpe ratio, and drawdown at a glance.",
    tip: "Use this to test a rebalanced version against your current holdings.",
    highlight: "compare",
  },
  {
    icon: "◬",
    title: "Explore risk & simulation",
    desc: "The Risk tab shows drawdown charts and correlation heatmaps. The Simulate tab runs 300 Monte Carlo paths to show your range of possible outcomes.",
    tip: "Correlated assets (heatmap close to 1.0) increase your real risk — even if volatility looks low.",
    highlight: "risk",
  },
];

export default function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const finish = () => {
    setDismissed(true);
    setTimeout(onComplete, 300);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: "fixed", inset: 0, background: "rgba(10,14,20,0.75)", backdropFilter: "blur(5px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            style={{ width: "min(480px, 95vw)", background: C.navy3, border: `1px solid ${C.border}`, borderRadius: 20, padding: "32px 32px 28px", position: "relative" }}
          >
            {/* Step progress bar */}
            <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
              {STEPS.map((_, i) => (
                <div key={i} onClick={() => setStep(i)}
                  style={{ flex: 1, height: 3, borderRadius: 2, background: i < step ? C.amber : i === step ? C.amber : "rgba(255,255,255,0.08)", opacity: i > step ? 0.4 : 1, cursor: "pointer", transition: "all 0.3s" }} />
              ))}
            </div>

            {/* Step counter */}
            <div style={{ fontSize: 9, letterSpacing: 2.5, color: C.amber, textTransform: "uppercase", marginBottom: 20 }}>
              Step {step + 1} of {STEPS.length}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                {/* Icon */}
                <div style={{ width: 48, height: 48, border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, fontSize: 22, color: C.amber, background: C.amber2 }}>
                  {current.icon}
                </div>

                {/* Title */}
                <h3 style={{ fontSize: 21, fontWeight: 500, color: C.cream, marginBottom: 10, lineHeight: 1.2 }}>
                  {current.title}
                </h3>

                {/* Description */}
                <p style={{ fontSize: 14, color: C.cream2, lineHeight: 1.75, fontWeight: 300, marginBottom: 16 }}>
                  {current.desc}
                </p>

                {/* Tip box */}
                <div style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ fontSize: 12, color: C.amber, lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 700, marginRight: 6 }}>💡</span>
                    {current.tip}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
              <button onClick={finish} style={{ fontSize: 12, color: C.cream3, background: "none", border: "none", cursor: "pointer", letterSpacing: 0.3 }}>
                Skip tour
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                {step > 0 && (
                  <button onClick={() => setStep(s => s - 1)}
                    style={{ padding: "9px 18px", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 9, color: C.cream2, fontSize: 12, cursor: "pointer" }}>
                    ←
                  </button>
                )}
                <button onClick={() => isLast ? finish() : setStep(s => s + 1)}
                  style={{ padding: "10px 26px", background: C.amber, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3 }}>
                  {isLast ? "Start analyzing →" : "Next →"}
                </button>
              </div>
            </div>

            {/* Step dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 20 }}>
              {STEPS.map((_, i) => (
                <div key={i} onClick={() => setStep(i)}
                  style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i === step ? C.amber : "rgba(255,255,255,0.12)", cursor: "pointer", transition: "all 0.25s" }} />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
