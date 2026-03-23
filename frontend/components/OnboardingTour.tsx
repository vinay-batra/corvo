"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = {
  navy3: "#111620", border: "rgba(255,255,255,0.07)",
  cream: "#e8e0cc", cream2: "rgba(232,224,204,0.5)", cream3: "rgba(232,224,204,0.25)",
  amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)",
};

const STEPS = [
  { icon: "◈", title: "Build your portfolio", desc: "Add any stock, ETF, or crypto using the search on the left. Set weights and click Analyze." },
  { icon: "◎", title: "Read your health score", desc: "Corvo scores your portfolio 0–100 across returns, risk-adjusted performance, stability, and resilience." },
  { icon: "✦", title: "Ask the AI anything", desc: "Switch to AI Chat and ask questions in plain English. Your AI knows your exact holdings and financial goals." },
  { icon: "◬", title: "Explore risk & simulation", desc: "Check the Risk tab for drawdown charts and correlations. Simulate tab runs 300 Monte Carlo paths." },
];

export default function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(10,14,20,0.8)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>

      <motion.div initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
        style={{ width: 440, background: C.navy3, border: `1px solid ${C.border}`, borderRadius: 18, padding: "36px", position: "relative" }}>

        {/* Progress */}
        <div style={{ display: "flex", gap: 5, marginBottom: 32 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 2, borderRadius: 1, background: i <= step ? C.amber : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2 }}>
            <div style={{ width: 44, height: 44, border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22, fontSize: 20, color: C.amber, background: C.amber2 }}>
              {STEPS[step].icon}
            </div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: C.amber, textTransform: "uppercase", marginBottom: 10 }}>Step {step + 1} of {STEPS.length}</div>
            <h3 style={{ fontSize: 20, fontWeight: 500, color: C.cream, marginBottom: 10 }}>{STEPS[step].title}</h3>
            <p style={{ fontSize: 14, color: C.cream2, lineHeight: 1.75, fontWeight: 300 }}>{STEPS[step].desc}</p>
          </motion.div>
        </AnimatePresence>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 36 }}>
          <button onClick={onComplete} style={{ fontSize: 12, color: C.cream3, background: "none", border: "none", cursor: "pointer" }}>
            Skip tour
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ padding: "9px 18px", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 9, color: C.cream2, fontSize: 12, cursor: "pointer" }}>
                ←
              </button>
            )}
            <button onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
              style={{ padding: "9px 24px", background: C.amber, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3 }}>
              {isLast ? "Start analyzing →" : "Next →"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
