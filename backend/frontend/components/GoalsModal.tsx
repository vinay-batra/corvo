"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const STEPS = [
  {
    id: "basics",
    title: "Let's personalize your portfolio",
    subtitle: "A few quick questions so Corvo can give you smarter insights",
    icon: "◈",
  },
  {
    id: "timeline",
    title: "When do you need this money?",
    subtitle: "This helps us understand how much risk makes sense for you",
    icon: "◷",
  },
  {
    id: "risk",
    title: "How do you feel about risk?",
    subtitle: "Be honest , there's no wrong answer",
    icon: "◬",
  },
  {
    id: "goal",
    title: "What's your main goal?",
    subtitle: "We'll tailor your AI insights around this",
    icon: "◎",
  },
];

interface Goals {
  age: string;
  salary: string;
  invested: string;
  retirementAge: string;
  riskTolerance: string;
  goal: string;
  monthlyContribution: string;
}

interface Props {
  onComplete: (goals: Goals) => void;
  onSkip: () => void;
}

function InputField({ label, value, onChange, placeholder, prefix, type = "text" }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>{label}</label>
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: focused ? "var(--green)" : "var(--text3)", pointerEvents: "none" }}>{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            padding: prefix ? "10px 12px 10px 26px" : "10px 12px",
            background: "var(--input-bg)",
            border: `1px solid ${focused ? "var(--green)" : "var(--input-border)"}`,
            borderRadius: 8,
            color: "var(--text)",
            fontSize: 14,
            fontFamily: "var(--font-body)",
            outline: "none",
            transition: "border-color 0.2s",
          }}
        />
      </div>
    </div>
  );
}

function OptionButton({ label, sublabel, selected, onClick, color = "var(--green)" }: any) {
  return (
    <button onClick={onClick} style={{
      padding: "14px 16px", background: selected ? `${color}10` : "var(--bg3)",
      border: `1px solid ${selected ? color : "var(--border)"}`,
      borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.2s", width: "100%",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selected ? color : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />}
        </div>
        <div>
          <p style={{ fontSize: 13, color: selected ? "var(--text)" : "var(--text2)", fontWeight: selected ? 600 : 400 }}>{label}</p>
          {sublabel && <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{sublabel}</p>}
        </div>
      </div>
    </button>
  );
}

export default function GoalsModal({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<Goals>({
    age: "", salary: "", invested: "", retirementAge: "65",
    riskTolerance: "", goal: "", monthlyContribution: "",
  });

  const set = (key: keyof Goals) => (val: string) => setGoals(prev => ({ ...prev, [key]: val }));

  const canNext = () => {
    if (step === 0) return goals.age !== "" && goals.salary !== "";
    if (step === 1) return goals.retirementAge !== "";
    if (step === 2) return goals.riskTolerance !== "";
    if (step === 3) return goals.goal !== "";
    return true;
  };

  const next = () => { if (step < STEPS.length - 1) setStep(s => s + 1); else onComplete(goals); };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ background: "var(--card-bg)", border: "1px solid rgba(0,255,160,0.2)", borderRadius: 20, width: "100%", maxWidth: 520, overflow: "hidden", position: "relative" }}
      >
        {/* Top accent line */}
        <div style={{ height: 2, background: "linear-gradient(90deg, transparent, var(--green), var(--cyan), transparent)" }} />

        {/* Progress bar */}
        <div style={{ height: 2, background: "var(--border)" }}>
          <motion.div
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4 }}
            style={{ height: "100%", background: "linear-gradient(90deg, var(--green), var(--cyan))" }}
          />
        </div>

        <div style={{ padding: "32px 36px" }}>
          {/* Step counter */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i <= step ? "var(--green)" : "var(--border)", transition: "all 0.3s" }} />
              ))}
            </div>
            <button onClick={onSkip} style={{ fontSize: 11, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", letterSpacing: 1 }}>SKIP</button>
          </div>

          {/* Step header */}
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <p style={{ fontSize: 28, fontFamily: "var(--font-display)", color: "var(--green)", marginBottom: 4 }}>{STEPS[step].icon}</p>
              <h2 style={{ fontSize: 20, color: "var(--text)", fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>{STEPS[step].title}</h2>
              <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 28, lineHeight: 1.5 }}>{STEPS[step].subtitle}</p>

              {/* Step 0: Basics */}
              {step === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <InputField label="Your Age" value={goals.age} onChange={set("age")} placeholder="e.g. 28" type="number" />
                    <InputField label="Retirement Age" value={goals.retirementAge} onChange={set("retirementAge")} placeholder="e.g. 65" type="number" />
                  </div>
                  <InputField label="Annual Salary" value={goals.salary} onChange={set("salary")} placeholder="e.g. 85000" prefix="$" type="number" />
                  <InputField label="Already Invested" value={goals.invested} onChange={set("invested")} placeholder="e.g. 25000" prefix="$" type="number" />
                  <InputField label="Monthly Contribution" value={goals.monthlyContribution} onChange={set("monthlyContribution")} placeholder="e.g. 500" prefix="$" type="number" />
                </div>
              )}

              {/* Step 1: Timeline */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { val: "short", label: "Less than 5 years", sub: "Short-term savings or near-term goal" },
                    { val: "medium", label: "5–15 years", sub: "Building wealth over time" },
                    { val: "long", label: "15–30 years", sub: "Retirement or long-term wealth" },
                    { val: "verylong", label: "30+ years", sub: "Generational wealth building" },
                  ].map(o => (
                    <OptionButton key={o.val} label={o.label} sublabel={o.sub}
                      selected={goals.riskTolerance === o.val + "_time"}
                      onClick={() => { set("riskTolerance")(o.val + "_time"); setGoals(g => ({ ...g, retirementAge: g.retirementAge })); }}
                    />
                  ))}
                </div>
              )}

              {/* Step 2: Risk */}
              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { val: "conservative", label: "Conservative", sub: "I hate losing money. Keep it safe, even if returns are lower", color: "var(--cyan)" },
                    { val: "moderate", label: "Moderate", sub: "Some ups and downs are fine , I want solid growth", color: "var(--green)" },
                    { val: "aggressive", label: "Aggressive", sub: "I can handle big swings. I want maximum long-term growth", color: "var(--purple)" },
                    { val: "yolo", label: "High Risk / High Reward", sub: "Crypto, growth stocks, I'm here for big gains", color: "#f59e0b" },
                  ].map(o => (
                    <OptionButton key={o.val} label={o.label} sublabel={o.sub} color={o.color}
                      selected={goals.riskTolerance === o.val}
                      onClick={() => set("riskTolerance")(o.val)}
                    />
                  ))}
                </div>
              )}

              {/* Step 3: Goal */}
              {step === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { val: "retirement", label: "Retire comfortably", sub: "Build a nest egg to live off in retirement" },
                    { val: "wealth", label: "Build long-term wealth", sub: "Grow my net worth over time" },
                    { val: "income", label: "Generate passive income", sub: "Dividends, distributions, cash flow" },
                    { val: "house", label: "Save for a big purchase", sub: "Home, car, or other major expense" },
                    { val: "learn", label: "Learn investing", sub: "Just getting started, exploring my options" },
                  ].map(o => (
                    <OptionButton key={o.val} label={o.label} sublabel={o.sub}
                      selected={goals.goal === o.val}
                      onClick={() => set("goal")(o.val)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
            <button onClick={() => step > 0 ? setStep(s => s - 1) : onSkip()}
              style={{ fontSize: 12, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", letterSpacing: 1 }}>
              {step === 0 ? "SKIP FOR NOW" : "← BACK"}
            </button>
            <motion.button
              onClick={next}
              disabled={!canNext()}
              whileHover={canNext() ? { scale: 1.02 } : {}}
              whileTap={canNext() ? { scale: 0.98 } : {}}
              style={{
                padding: "12px 28px", background: canNext() ? "var(--green)" : "var(--bg3)",
                border: "none", borderRadius: 10, color: canNext() ? "var(--bg)" : "var(--text3)",
                fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: canNext() ? "pointer" : "not-allowed",
                fontFamily: "var(--font-display)", transition: "all 0.2s",
              }}
            >
              {step === STEPS.length - 1 ? "GET STARTED →" : "NEXT →"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
