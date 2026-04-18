"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const STEPS = [
  {
    target: "sidebar",
    title: "Build Your Portfolio",
    body: "Search any stock, ETF, or crypto in the world. Type a company name or ticker , like 'Apple', 'VOO', or 'Bitcoin'. Adjust weights with sliders or type exact percentages.",
    icon: "◈",
    color: "var(--green)",
    position: "right",
  },
  {
    target: "overview",
    title: "Overview Tab",
    body: "Your portfolio's key stats at a glance , return, volatility, Sharpe ratio, and max drawdown. Each metric has a ? button that explains what it means in plain English.",
    icon: "◎",
    color: "var(--cyan)",
    position: "center",
  },
  {
    target: "health",
    title: "Portfolio Health Score",
    body: "We score your portfolio 0–100 just like a credit score. It combines your returns, risk efficiency, stability, and resilience into one number.",
    icon: "★",
    color: "var(--green)",
    position: "center",
  },
  {
    target: "risk",
    title: "Risk Tab",
    body: "See how bad things could get , drawdown charts show your portfolio's worst drops, and the correlation heatmap shows if your assets move together (bad) or independently (good).",
    icon: "◬",
    color: "var(--red)",
    position: "center",
  },
  {
    target: "ai",
    title: "AI Chat",
    body: "Ask anything about your portfolio. 'Should I add gold?', 'Am I too concentrated in tech?', 'What happens if the market drops 30%?' , Corvo knows your exact holdings.",
    icon: "◆",
    color: "var(--purple)",
    position: "center",
  },
  {
    target: "simulate",
    title: "Monte Carlo Simulation",
    body: "We run 300 simulations of possible futures for your portfolio. See the range of outcomes , best case, worst case, and most likely , over the next year.",
    icon: "◇",
    color: "#f59e0b",
    position: "center",
  },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 1500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => e.target === e.currentTarget && onComplete()}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ duration: 0.3 }}
          style={{ background: "#080f1e", border: `1px solid ${current.color}40`, borderRadius: 18, padding: "32px 36px", maxWidth: 460, width: "100%", position: "relative" }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${current.color}, transparent)`, borderRadius: "18px 18px 0 0" }} />

          {/* Step dots */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i <= step ? current.color : "rgba(255,255,255,0.1)", transition: "all 0.3s", cursor: "pointer" }} onClick={() => setStep(i)} />
            ))}
          </div>

          <p style={{ fontSize: 32, marginBottom: 12 }}>{current.icon}</p>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", marginBottom: 10, lineHeight: 1.3 }}>{current.title}</h3>
          <p style={{ fontSize: 14, color: "rgba(226,232,240,0.65)", lineHeight: 1.7, marginBottom: 28 }}>{current.body}</p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "rgba(226,232,240,0.25)", letterSpacing: 1 }}>{step + 1} of {STEPS.length}</span>
            <div style={{ display: "flex", gap: 10 }}>
              {step < STEPS.length - 1 ? (
                <>
                  <button onClick={onComplete} style={{ fontSize: 11, color: "rgba(226,232,240,0.3)", background: "none", border: "none", cursor: "pointer", letterSpacing: 1 }}>SKIP TOUR</button>
                  <motion.button
                    onClick={() => setStep(s => s + 1)}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    style={{ padding: "10px 22px", background: current.color, border: "none", borderRadius: 8, color: "#020408", fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: "pointer", fontFamily: "var(--font-display)" }}
                  >NEXT →</motion.button>
                </>
              ) : (
                <motion.button
                  onClick={onComplete}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: "10px 28px", background: current.color, border: "none", borderRadius: 8, color: "#020408", fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: "pointer", fontFamily: "var(--font-display)" }}
                >LET'S GO →</motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
