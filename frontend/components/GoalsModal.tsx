"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = {
  navy: "#0a0e14", navy3: "#111620", navy4: "#161c26",
  border: "rgba(255,255,255,0.07)", cream: "#e8e0cc",
  cream2: "rgba(232,224,204,0.5)", cream3: "rgba(232,224,204,0.25)",
  amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)",
};

interface Goals {
  age: string; retirementAge: string; salary: string;
  invested: string; monthlyContribution: string;
  riskTolerance: string; goal: string;
}

interface Props { onComplete: (g: Goals) => void; onSkip: () => void; }

const STEPS = [
  {
    title: "Tell us about yourself",
    desc: "We'll use this to personalize your analysis",
    fields: [
      { key: "age", label: "Your Age", placeholder: "28", type: "number" },
      { key: "retirementAge", label: "Target Retirement Age", placeholder: "65", type: "number" },
    ],
  },
  {
    title: "Your financial picture",
    desc: "Helps us contextualize your portfolio size",
    fields: [
      { key: "salary", label: "Annual Salary ($)", placeholder: "85,000", type: "number" },
      { key: "invested", label: "Already Invested ($)", placeholder: "25,000", type: "number" },
      { key: "monthlyContribution", label: "Monthly Contribution ($)", placeholder: "500", type: "number" },
    ],
  },
  {
    title: "Your investment style",
    desc: "How do you approach risk and returns?",
    fields: [],
  },
];

const RISK_OPTIONS = [
  { value: "conservative", label: "Conservative", desc: "Preserve capital. Lower returns, lower risk." },
  { value: "moderate", label: "Moderate", desc: "Balanced growth. Comfortable with some swings." },
  { value: "aggressive", label: "Aggressive", desc: "Maximum growth. Can handle high volatility." },
];

const GOAL_OPTIONS = [
  { value: "retirement", label: "Retirement" },
  { value: "wealth", label: "Wealth Building" },
  { value: "income", label: "Passive Income" },
  { value: "short", label: "Short-Term Gain" },
];

export default function GoalsModal({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<Goals>({
    age: "", retirementAge: "65", salary: "", invested: "", monthlyContribution: "",
    riskTolerance: "moderate", goal: "retirement",
  });
  const [focused, setFocused] = useState<string|null>(null);

  const set = (k: keyof Goals, v: string) => setGoals(p => ({ ...p, [k]: v }));
  const next = () => step < STEPS.length - 1 ? setStep(s => s + 1) : onComplete(goals);

  const inputStyle = (k: string): React.CSSProperties => ({
    width: "100%", padding: "11px 14px",
    background: "rgba(255,255,255,0.03)",
    border: `1px solid ${focused === k ? C.amber : C.border}`,
    borderRadius: 10, color: C.cream, fontSize: 14,
    fontFamily: "'Inter', sans-serif", outline: "none", transition: "border-color 0.15s",
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(10,14,20,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <motion.div initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        style={{ width: "min(480px, 95vw)", background: C.navy3, border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 18, padding: "36px 36px 32px", position: "relative" }}>

        {/* Progress bar */}
        <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, marginBottom: 32, overflow: "hidden" }}>
          <motion.div animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.4 }}
            style={{ height: "100%", background: C.amber, borderRadius: 1 }} />
        </div>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i <= step ? C.amber : "rgba(255,255,255,0.1)", transition: "all 0.3s" }} />
            ))}
          </div>
          <button onClick={onSkip} style={{ fontSize: 11, color: C.cream3, background: "none", border: "none", cursor: "pointer", letterSpacing: 1 }}>SKIP</button>
        </div>

        {/* Logo mark */}
        <img src="/corvo-logo.svg" width={36} height={36} alt="Corvo" style={{ marginBottom: 20 }} />

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
            <h2 style={{ fontSize: 22, fontWeight: 500, color: C.cream, marginBottom: 6 }}>{STEPS[step].title}</h2>
            <p style={{ fontSize: 13, color: C.cream3, marginBottom: 28, lineHeight: 1.6 }}>{STEPS[step].desc}</p>

            {step < 2 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {STEPS[step].fields.map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, color: C.cream3, textTransform: "uppercase", display: "block", marginBottom: 6 }}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder}
                      value={goals[f.key as keyof Goals]}
                      onChange={e => set(f.key as keyof Goals, e.target.value)}
                      onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)}
                      style={inputStyle(f.key)} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Risk tolerance */}
                <div>
                  <label style={{ fontSize: 10, letterSpacing: 1.5, color: C.cream3, textTransform: "uppercase", display: "block", marginBottom: 10 }}>Risk Tolerance</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {RISK_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => set("riskTolerance", o.value)}
                        style={{ padding: "12px 14px", background: goals.riskTolerance === o.value ? C.amber2 : "rgba(255,255,255,0.02)", border: `1px solid ${goals.riskTolerance === o.value ? "rgba(201,168,76,0.4)" : C.border}`, borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.15s", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: goals.riskTolerance === o.value ? C.amber : C.cream, marginBottom: 2 }}>{o.label}</p>
                          <p style={{ fontSize: 11, color: C.cream3 }}>{o.desc}</p>
                        </div>
                        {goals.riskTolerance === o.value && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.amber, flexShrink: 0 }} />}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Goal */}
                <div>
                  <label style={{ fontSize: 10, letterSpacing: 1.5, color: C.cream3, textTransform: "uppercase", display: "block", marginBottom: 10 }}>Primary Goal</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {GOAL_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => set("goal", o.value)}
                        style={{ padding: "11px 14px", background: goals.goal === o.value ? C.amber2 : "rgba(255,255,255,0.02)", border: `1px solid ${goals.goal === o.value ? "rgba(201,168,76,0.4)" : C.border}`, borderRadius: 10, cursor: "pointer", color: goals.goal === o.value ? C.amber : C.cream2, fontSize: 12, fontWeight: 500, transition: "all 0.15s" }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
          <button onClick={onSkip} style={{ fontSize: 12, color: C.cream3, background: "none", border: "none", cursor: "pointer" }}>
            Skip for now
          </button>
          <button onClick={next}
            style={{ padding: "11px 28px", background: C.amber, border: "none", borderRadius: 10, color: C.navy, fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3 }}>
            {step < STEPS.length - 1 ? "Next →" : "Get Started →"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
