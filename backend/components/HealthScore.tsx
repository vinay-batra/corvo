"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

function Ring({ score, size = 100 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const label = score >= 75 ? "Excellent" : score >= 50 ? "Good" : score >= 25 ? "Fair" : "Weak";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={6} />
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#111" strokeWidth={6}
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: "#111", letterSpacing: -1, lineHeight: 1 }}>{score}</motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          style={{ fontSize: 8, letterSpacing: 1, color: "#9b9b98", textTransform: "uppercase", marginTop: 2 }}>{label}</motion.p>
      </div>
    </div>
  );
}

function Bar({ label, value, max, delay }: { label: string; value: number; max: number; delay: number }) {
  const pct = Math.max(0, Math.min(value / max, 1));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 10, color: "#9b9b98", width: 68, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 1, delay, ease: "easeOut" }}
          style={{ height: "100%", background: "#111", borderRadius: 2 }} />
      </div>
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.4 }}
        style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#6b6b68", width: 24, textAlign: "right" }}>{Math.round(pct * 100)}</motion.span>
    </div>
  );
}

export default function HealthScore({ data }: { data: any }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const sharpe = data.portfolio_volatility > 0 ? (data.portfolio_return - 0.04) / data.portfolio_volatility : 0;
  const returnScore = Math.min(Math.max(((data.portfolio_return + 0.3) / 0.6) * 100, 0), 100);
  const sharpeScore = Math.min(Math.max((sharpe / 3) * 100, 0), 100);
  const riskScore   = Math.min(Math.max((1 - data.portfolio_volatility / 0.6) * 100, 0), 100);
  const ddScore     = Math.min(Math.max((1 + data.max_drawdown / 0.5) * 100, 0), 100);
  const score = Math.round(returnScore * 0.3 + sharpeScore * 0.3 + riskScore * 0.25 + ddScore * 0.15);

  return (
    <div ref={ref} style={{ display: "flex", gap: 16, alignItems: "center" }}>
      {inView && <Ring score={score} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <Bar label="Returns"    value={returnScore} max={100} delay={0.5} />
        <Bar label="Risk-Adj"   value={sharpeScore} max={100} delay={0.6} />
        <Bar label="Stability"  value={riskScore}   max={100} delay={0.7} />
        <Bar label="Resilience" value={ddScore}     max={100} delay={0.8} />
      </div>
    </div>
  );
}
