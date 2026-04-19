"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PortfolioBuilder from "./PortfolioBuilder";

const C = {
  navy: "#0a0e14", navy3: "#111620", navy4: "#161c26",
  border: "rgba(255,255,255,0.07)", cream: "#e8e0cc",
  cream2: "rgba(232,224,204,0.5)", cream3: "rgba(232,224,204,0.25)",
  amber: "var(--accent)", amber2: "rgba(184,134,11,0.1)", amber3: "rgba(184,134,11,0.25)",
  green: "#5cb88a", green2: "rgba(92,184,138,0.12)", green3: "rgba(92,184,138,0.3)",
};

const FEATURES = [
  {
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    title: "AI Portfolio Insights",
    desc: "GPT-powered analysis of your holdings, risks, and opportunities.",
  },
  {
    icon: "⟁",
    title: "Risk Analysis",
    desc: "Correlation heatmaps, drawdown charts, and Sharpe ratio scoring.",
  },
  {
    icon: "◎",
    title: "Learn as You Invest",
    desc: "Bite-sized lessons on diversification, volatility, and beyond.",
  },
];

interface Props {
  onComplete: (assets: { ticker: string; weight: number }[]) => void;
  onSkip: () => void;
}

export default function OnboardingModal({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [assets, setAssets] = useState<{ ticker: string; weight: number; purchasePrice?: number }[]>([
    { ticker: "", weight: 0.05 },
  ]);

  const validAssets = assets.filter(a => a.ticker && a.weight > 0);
  const hasAssets = validAssets.length > 0;

  const handleNext = () => {
    if (step < 2) setStep(s => s + 1);
    else onComplete(validAssets);
  };

  const totalWeight = validAssets.reduce((s, a) => s + a.weight, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(10,14,20,0.92)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <style>{`@keyframes ob-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)}}`}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: step === 1 ? "min(580px, 96vw)" : "min(500px, 96vw)",
          background: C.navy3,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: step === 1 ? "30px 30px 26px" : "36px 36px 32px",
          position: "relative",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.05)",
        }}
      >
        {/* Progress bar */}
        <div style={{ height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 1, marginBottom: 26, overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${((step + 1) / 3) * 100}%` }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{ height: "100%", background: C.amber, borderRadius: 1 }}
          />
        </div>

        {/* Step indicators + skip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ width: i === step ? 20 : 6 }}
                style={{
                  height: 5, borderRadius: 3,
                  background: i <= step ? C.amber : "rgba(255,255,255,0.08)",
                }}
              />
            ))}
          </div>
          <button
            onClick={onSkip}
            style={{
              fontSize: 10, color: C.cream3, background: "none", border: "none",
              cursor: "pointer", letterSpacing: 1.2, textTransform: "uppercase",
              padding: "4px 2px",
            }}
          >
            Skip
          </button>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Step 0: Welcome ─────────────────────────────────────────────── */}
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22 }}
            >
              <img src="/corvo-logo.svg" width={44} height={44} alt="Corvo" style={{ marginBottom: 22 }} />

              <h2 style={{ fontSize: 26, fontWeight: 600, color: C.cream, marginBottom: 8, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                Welcome to Corvo
              </h2>
              <p style={{ fontSize: 14, color: C.cream3, marginBottom: 32, lineHeight: 1.7 }}>
                Your AI-powered portfolio intelligence platform: analyze risk, track performance, and grow smarter.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 32 }}>
                {FEATURES.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.07 }}
                    style={{
                      display: "flex", gap: 14, alignItems: "flex-start",
                      padding: "13px 15px",
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: C.amber2, border: `1px solid ${C.amber3}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: C.amber, fontSize: 13, fontWeight: 700,
                    }}>
                      {f.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.cream, marginBottom: 3 }}>{f.title}</p>
                      <p style={{ fontSize: 12, color: C.cream3, lineHeight: 1.55 }}>{f.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={handleNext}
                style={{
                  width: "100%", padding: "13px",
                  background: C.amber, border: "none", borderRadius: 10,
                  color: C.navy, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  letterSpacing: 0.4, transition: "opacity 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                Get Started →
              </button>
            </motion.div>
          )}

          {/* ── Step 1: Build Portfolio ──────────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22 }}
            >
              <h2 style={{ fontSize: 22, fontWeight: 600, color: C.cream, marginBottom: 6, letterSpacing: "-0.35px" }}>
                Build your portfolio
              </h2>
              <p style={{ fontSize: 13, color: C.cream3, marginBottom: 22, lineHeight: 1.65 }}>
                Add tickers and weights to get started, or import from a CSV file.
              </p>

              <div style={{ maxHeight: 360, overflowY: "auto", marginBottom: 22 }}>
                <PortfolioBuilder
                  assets={assets}
                  onAssetsChange={setAssets}
                  loading={false}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  onClick={onSkip}
                  style={{ fontSize: 12, color: C.cream3, background: "none", border: "none", cursor: "pointer" }}
                >
                  Skip for now
                </button>
                <button
                  onClick={handleNext}
                  style={{
                    padding: "11px 28px",
                    background: hasAssets ? C.amber : "rgba(255,255,255,0.05)",
                    border: `1px solid ${hasAssets ? C.amber3 : C.border}`,
                    borderRadius: 10,
                    color: hasAssets ? C.navy : C.cream3,
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    letterSpacing: 0.3, transition: "all 0.18s",
                  }}
                  onMouseEnter={e => { if (hasAssets) e.currentTarget.style.opacity = "0.88"; }}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  {hasAssets ? "Continue →" : "Skip →"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: You're All Set ───────────────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22 }}
            >
              {/* Success ring */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 13, stiffness: 200, delay: 0.05 }}
                style={{
                  width: 58, height: 58, borderRadius: "50%", marginBottom: 22,
                  background: C.amber2,
                  border: `2px solid ${C.amber3}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.amber, fontSize: 22,
                }}
              >
                ✓
              </motion.div>

              <h2 style={{ fontSize: 24, fontWeight: 600, color: C.cream, marginBottom: 8, letterSpacing: "-0.4px" }}>
                You&apos;re all set!
              </h2>
              <p style={{ fontSize: 13, color: C.cream3, marginBottom: 26, lineHeight: 1.7 }}>
                Your portfolio is ready. Corvo will track performance, surface risks, and deliver AI-powered insights tailored to your holdings.
              </p>

              {/* Portfolio summary */}
              {validAssets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  style={{
                    padding: "14px 16px", marginBottom: 14,
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                  }}
                >
                  <p style={{ fontSize: 9, letterSpacing: 1.5, color: C.cream3, textTransform: "uppercase", marginBottom: 10 }}>
                    Portfolio Built · {validAssets.length} holding{validAssets.length !== 1 ? "s" : ""}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {validAssets.map(a => (
                      <span
                        key={a.ticker}
                        style={{
                          padding: "4px 10px", fontSize: 11,
                          fontFamily: "'Space Mono', monospace", fontWeight: 600,
                          borderRadius: 6, background: C.amber2, color: C.amber,
                          border: `1px solid ${C.amber3}`,
                        }}
                      >
                        {a.ticker}{" "}
                        <span style={{ opacity: 0.55 }}>
                          {Math.round((a.weight / totalWeight) * 100)}%
                        </span>
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* XP Badge */}
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px", marginBottom: 28,
                  background: C.green2, border: `1px solid ${C.green3}`, borderRadius: 10,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: "rgba(92,184,138,0.15)", border: `1.5px solid ${C.green3}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>
                  +
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.green, marginBottom: 2 }}>+100 XP Earned</p>
                  <p style={{ fontSize: 11, color: "rgba(92,184,138,0.55)" }}>Portfolio builder complete</p>
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
                onClick={() => onComplete(validAssets)}
                style={{
                  width: "100%", padding: "13px",
                  background: C.amber, border: "none", borderRadius: 10,
                  color: C.navy, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  letterSpacing: 0.4, transition: "opacity 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                Explore Dashboard →
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
