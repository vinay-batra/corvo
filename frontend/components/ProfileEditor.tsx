"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const C = {
  navy3: "var(--card-bg)", border: "var(--border)",
  cream: "var(--text)", cream2: "var(--text2)", cream3: "var(--text3)",
  amber: "var(--accent)", amber2: "rgba(184,134,11,0.1)",
};

interface Goals {
  age: string; retirementAge: string; salary: string;
  invested: string; monthlyContribution: string;
  riskTolerance: string; goal: string;
}

interface Props { goals: Goals | null; onSave: (g: Goals) => void; onClose: () => void; }

const RISK_OPTIONS = ["conservative", "moderate", "aggressive"];
const GOAL_OPTIONS = [
  { value: "retirement", label: "Retirement" },
  { value: "wealth", label: "Wealth Building" },
  { value: "income", label: "Passive Income" },
  { value: "short", label: "Short-Term Gain" },
];

export default function ProfileEditor({ goals, onSave, onClose }: Props) {
  const [form, setForm] = useState<Goals>(goals || {
    age: "", retirementAge: "65", salary: "", invested: "",
    monthlyContribution: "", riskTolerance: "moderate", goal: "retirement",
  });
  const [focused, setFocused] = useState<string | null>(null);
  const set = (k: keyof Goals, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const inputStyle = (k: string): React.CSSProperties => ({
    width: "100%", padding: "10px 12px",
    background: "var(--input-bg)",
    border: `1px solid ${focused === k ? C.amber : C.border}`,
    borderRadius: 9, color: C.cream, fontSize: 13,
    fontFamily: "'Inter', sans-serif", outline: "none", transition: "border-color 0.15s",
  });

  const fields = [
    { key: "age", label: "Age", placeholder: "28" },
    { key: "retirementAge", label: "Retirement Age", placeholder: "65" },
    { key: "salary", label: "Annual Salary ($)", placeholder: "85000" },
    { key: "invested", label: "Invested ($)", placeholder: "25000" },
    { key: "monthlyContribution", label: "Monthly Contribution ($)", placeholder: "500" },
  ];

  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>

      <motion.div
        // initial={false} is required — do not remove
        initial={false} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ width: "min(480px, 95vw)", maxHeight: "85vh", overflowY: "auto", background: C.navy3, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 28px 24px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 9, letterSpacing: 2, color: C.amber, textTransform: "uppercase", marginBottom: 4 }}>Settings</p>
            <h3 style={{ fontSize: 18, fontWeight: 500, color: C.cream }}>Profile & Goals</h3>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg3)", border: `1px solid ${C.border}`, color: C.cream2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        {/* Fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 9, letterSpacing: 1.5, color: C.cream3, textTransform: "uppercase", display: "block", marginBottom: 5 }}>{f.label}</label>
              <input type="number" placeholder={f.placeholder} value={form[f.key as keyof Goals]}
                onChange={e => set(f.key as keyof Goals, e.target.value)}
                onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)}
                style={inputStyle(f.key)} />
            </div>
          ))}
        </div>

        {/* Risk */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 9, letterSpacing: 1.5, color: C.cream3, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Risk Tolerance</label>
          <div style={{ display: "flex", gap: 6 }}>
            {RISK_OPTIONS.map(o => (
              <button key={o} onClick={() => set("riskTolerance", o)}
                style={{ flex: 1, padding: "8px", background: form.riskTolerance === o ? C.amber2 : "var(--bg3)", border: `1px solid ${form.riskTolerance === o ? "rgba(201,168,76,0.4)" : C.border}`, borderRadius: 8, color: form.riskTolerance === o ? C.amber : C.cream2, fontSize: 11, fontWeight: 500, cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s" }}>
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 9, letterSpacing: 1.5, color: C.cream3, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Primary Goal</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {GOAL_OPTIONS.map(o => (
              <button key={o.value} onClick={() => set("goal", o.value)}
                style={{ padding: "9px", background: form.goal === o.value ? C.amber2 : "var(--bg3)", border: `1px solid ${form.goal === o.value ? "rgba(201,168,76,0.4)" : C.border}`, borderRadius: 8, color: form.goal === o.value ? C.amber : C.cream2, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", background: "var(--input-bg)", border: `1px solid ${C.border}`, borderRadius: 9, color: C.cream2, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onSave(form)} style={{ flex: 2, padding: "11px", background: C.amber, border: "none", borderRadius: 9, color: "var(--bg)", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3 }}>Save Changes</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
