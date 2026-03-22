"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color = score >= 75 ? "#00ffa0" : score >= 50 ? "#00d4ff" : score >= 25 ? "#f59e0b" : "#ff4d6d";
  const label = score >= 75 ? "Excellent" : score >= 50 ? "Good" : score >= 25 ? "Fair" : "Weak";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background ring */}
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
        {/* Score ring */}
        <motion.circle
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <motion.p
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, color, letterSpacing: -1, lineHeight: 1 }}
        >{score}</motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          style={{ fontSize: 8, letterSpacing: 2, color: "rgba(226,232,240,0.4)", textTransform: "uppercase", marginTop: 2 }}
        >{label}</motion.p>
      </div>
    </div>
  );
}

function ScoreRow({ label, value, max, color, delay }: { label: string; value: number; max: number; color: string; delay: number }) {
  const pct = Math.max(0, Math.min(value / max, 1));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 10, color: "rgba(226,232,240,0.4)", width: 80, flexShrink: 0, letterSpacing: 0.5 }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 1, delay, ease: "easeOut" }}
          style={{ height: "100%", background: color, borderRadius: 2 }}
        />
      </div>
      <span style={{ fontSize: 10, fontFamily: "var(--font-display)", color, width: 36, textAlign: "right", letterSpacing: 0.5 }}>{Math.round(pct * 100)}</span>
    </div>
  );
}

export default function HealthScore({ data }: { data: any }) {
  const [showModal, setShowModal] = useState(false);
  const sharpe = data.portfolio_volatility > 0 ? (data.portfolio_return - 0.04) / data.portfolio_volatility : 0;

  // Score components (0-100 each)
  const returnScore   = Math.min(Math.max(((data.portfolio_return + 0.3) / 0.6) * 100, 0), 100);
  const sharpeScore   = Math.min(Math.max((sharpe / 3) * 100, 0), 100);
  const riskScore     = Math.min(Math.max((1 - data.portfolio_volatility / 0.6) * 100, 0), 100);
  const ddScore       = Math.min(Math.max((1 + data.max_drawdown / 0.5) * 100, 0), 100);

  const score = Math.round((returnScore * 0.3) + (sharpeScore * 0.3) + (riskScore * 0.25) + (ddScore * 0.15));
  const color = score >= 75 ? "#00ffa0" : score >= 50 ? "#00d4ff" : score >= 25 ? "#f59e0b" : "#ff4d6d";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "22px 24px", position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.5 }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Portfolio Health</p>
          <p style={{ fontSize: 11, color: "rgba(226,232,240,0.4)" }}>Overall portfolio score</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(226,232,240,0.4)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(226,232,240,0.4)"; }}
        >?</button>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <ScoreRing score={score} size={110} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <ScoreRow label="Returns" value={returnScore} max={100} color="var(--green)" delay={0.5} />
          <ScoreRow label="Risk-Adj" value={sharpeScore} max={100} color="var(--cyan)" delay={0.6} />
          <ScoreRow label="Stability" value={riskScore} max={100} color="var(--purple)" delay={0.7} />
          <ScoreRow label="Resilience" value={ddScore} max={100} color="#f59e0b" delay={0.8} />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}
            style={{ background: "#0a1222", border: `1px solid ${color}40`, borderRadius: 16, padding: "28px 32px", maxWidth: 420, width: "100%", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, borderRadius: "16px 16px 0 0" }} />
            <button onClick={() => setShowModal(false)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "rgba(226,232,240,0.3)", fontSize: 18, cursor: "pointer" }}>✕</button>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "rgba(226,232,240,0.3)", textTransform: "uppercase", marginBottom: 8 }}>What is</p>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color, letterSpacing: 2, marginBottom: 20 }}>Health Score?</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Returns (30%)", desc: "How much your portfolio grew vs. a standard benchmark" },
                { label: "Risk-Adjusted (30%)", desc: "Your Sharpe ratio — are you being rewarded enough for the risk you're taking?" },
                { label: "Stability (25%)", desc: "How calm your portfolio is day-to-day. Lower volatility = higher score" },
                { label: "Resilience (15%)", desc: "How well your portfolio recovered from its worst drop" },
              ].map(r => (
                <div key={r.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px", borderLeft: `3px solid ${color}` }}>
                  <p style={{ fontSize: 11, color, letterSpacing: 1, marginBottom: 4 }}>{r.label}</p>
                  <p style={{ fontSize: 12, color: "rgba(226,232,240,0.6)", lineHeight: 1.5 }}>{r.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
