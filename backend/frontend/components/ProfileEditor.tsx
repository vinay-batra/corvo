"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const RISK_OPTIONS = [
  { val: "conservative", label: "Conservative", sub: "Keep it safe" },
  { val: "moderate", label: "Moderate", sub: "Balanced growth" },
  { val: "aggressive", label: "Aggressive", sub: "Max long-term growth" },
  { val: "yolo", label: "High Risk", sub: "Crypto & growth stocks" },
];

const GOAL_OPTIONS = [
  { val: "retirement", label: "Retire comfortably" },
  { val: "wealth", label: "Build long-term wealth" },
  { val: "income", label: "Generate passive income" },
  { val: "house", label: "Save for a big purchase" },
  { val: "learn", label: "Learn investing" },
];

function Field({ label, value, onChange, prefix, type = "text" }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>{label}</label>
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: focused ? "var(--green)" : "var(--text3)", pointerEvents: "none" }}>{prefix}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width: "100%", padding: prefix ? "9px 10px 9px 22px" : "9px 10px", background: "var(--input-bg)", border: `1px solid ${focused ? "var(--green)" : "var(--input-border)"}`, borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "var(--font-body)", outline: "none", transition: "border-color 0.2s" }}
        />
      </div>
    </div>
  );
}

interface Props { onClose: () => void; }

export default function ProfileEditor({ onClose }: Props) {
  const saved = (() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("corvo_goals") || "{}"); } catch { return {}; }
  })();

  const [form, setForm] = useState({
    age: saved.age || "",
    salary: saved.salary || "",
    invested: saved.invested || "",
    monthlyContribution: saved.monthlyContribution || "",
    retirementAge: saved.retirementAge || "65",
    riskTolerance: saved.riskTolerance || "",
    goal: saved.goal || "",
  });

  const set = (key: string) => (val: string) => setForm(p => ({ ...p, [key]: val }));

  const save = () => {
    localStorage.setItem("corvo_goals", JSON.stringify(form));
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{ background: "var(--card-bg)", border: "1px solid rgba(0,255,160,0.2)", borderRadius: 18, width: "100%", maxWidth: 500, overflow: "hidden", position: "relative", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ height: 2, background: "linear-gradient(90deg, transparent, var(--green), var(--cyan), transparent)" }} />
        <div style={{ padding: "28px 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Edit</p>
              <h2 style={{ fontSize: 18, color: "var(--text)", fontWeight: 600 }}>Your Profile</h2>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 20, cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Basics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Your Age" value={form.age} onChange={set("age")} type="number" />
              <Field label="Retirement Age" value={form.retirementAge} onChange={set("retirementAge")} type="number" />
            </div>
            <Field label="Annual Salary" value={form.salary} onChange={set("salary")} prefix="$" type="number" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Amount Invested" value={form.invested} onChange={set("invested")} prefix="$" type="number" />
              <Field label="Monthly Contribution" value={form.monthlyContribution} onChange={set("monthlyContribution")} prefix="$" type="number" />
            </div>

            {/* Risk */}
            <div>
              <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 10 }}>Risk Tolerance</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {RISK_OPTIONS.map(o => (
                  <button key={o.val} onClick={() => set("riskTolerance")(o.val)}
                    style={{ padding: "10px 12px", background: form.riskTolerance === o.val ? "rgba(0,255,160,0.08)" : "var(--bg3)", border: `1px solid ${form.riskTolerance === o.val ? "rgba(0,255,160,0.4)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <p style={{ fontSize: 12, color: form.riskTolerance === o.val ? "var(--green)" : "var(--text)", fontWeight: 600 }}>{o.label}</p>
                    <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{o.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Goal */}
            <div>
              <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 10 }}>Primary Goal</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {GOAL_OPTIONS.map(o => (
                  <button key={o.val} onClick={() => set("goal")(o.val)}
                    style={{ padding: "10px 14px", background: form.goal === o.val ? "rgba(0,255,160,0.08)" : "var(--bg3)", border: `1px solid ${form.goal === o.val ? "rgba(0,255,160,0.4)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", textAlign: "left", color: form.goal === o.val ? "var(--green)" : "var(--text)", fontSize: 13, transition: "all 0.15s" }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <motion.button onClick={save} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              style={{ padding: "13px", background: "var(--green)", border: "none", borderRadius: 10, color: "var(--bg)", fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: "pointer", fontFamily: "var(--font-display)", marginTop: 4 }}>
              SAVE PROFILE
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
