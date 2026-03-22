"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

function ScoreRing({ score, size = 110 }: { score: number; size?: number }) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color = score >= 75 ? "var(--green)" : score >= 50 ? "var(--cyan)" : score >= 25 ? "var(--amber)" : "var(--rose)";
  const glowColor = score >= 75 ? "rgba(0,255,179,0.4)" : score >= 50 ? "rgba(56,189,248,0.4)" : score >= 25 ? "rgba(251,191,36,0.4)" : "rgba(251,113,133,0.4)";
  const label = score >= 75 ? "Excellent" : score >= 50 ? "Good" : score >= 25 ? "Fair" : "Weak";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Outer glow */}
      <div style={{ position: "absolute", inset: -8, background: `radial-gradient(circle, ${glowColor.replace("0.4", "0.08")} 0%, transparent 70%)`, pointerEvents: "none" }} />

      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={7} />
        {/* Score arc */}
        <motion.circle
          cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={color} strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
        />
        {/* Dot at end */}
        <motion.circle
          cx={size/2} cy={size/2 - radius}
          r={3} fill={color}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8 }}
          style={{ filter: `drop-shadow(0 0 4px ${color})`, transformBox: "fill-box", transformOrigin: "center", transform: `rotate(${(score / 100) * 360}deg)` }}
        />
      </svg>

      {/* Center content */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <motion.p
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
          style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color, letterSpacing: -2, lineHeight: 1, textShadow: `0 0 20px ${glowColor}` }}
        >{score}</motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={{ fontSize: 8, letterSpacing: 2, color: "var(--text-faint)", textTransform: "uppercase", marginTop: 3 }}
        >{label}</motion.p>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max, color, delay }: { label: string; value: number; max: number; color: string; delay: number }) {
  const pct = Math.max(0, Math.min(value / max, 1));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 10, color: "var(--text-muted)", width: 76, flexShrink: 0, letterSpacing: 0.3 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 1.2, delay, ease: "easeOut" }}
          style={{ height: "100%", background: color, borderRadius: 2, boxShadow: `0 0 8px ${color}50` }}
        />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.5 }}
        style={{ fontSize: 11, fontFamily: "var(--font-mono)", color, width: 30, textAlign: "right", letterSpacing: 0.5 }}
      >{Math.round(pct * 100)}</motion.span>
    </div>
  );
}

export default function HealthScore({ data }: { data: any }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  const sharpe = data.portfolio_volatility > 0 ? (data.portfolio_return - 0.04) / data.portfolio_volatility : 0;
  const returnScore  = Math.min(Math.max(((data.portfolio_return + 0.3) / 0.6) * 100, 0), 100);
  const sharpeScore  = Math.min(Math.max((sharpe / 3) * 100, 0), 100);
  const riskScore    = Math.min(Math.max((1 - data.portfolio_volatility / 0.6) * 100, 0), 100);
  const ddScore      = Math.min(Math.max((1 + data.max_drawdown / 0.5) * 100, 0), 100);
  const score        = Math.round((returnScore * 0.3) + (sharpeScore * 0.3) + (riskScore * 0.25) + (ddScore * 0.15));

  const rows = [
    { label: "Returns",    value: returnScore, max: 100, color: "var(--green)",  delay: 0.6 },
    { label: "Risk-Adj",   value: sharpeScore, max: 100, color: "var(--cyan)",   delay: 0.7 },
    { label: "Stability",  value: riskScore,   max: 100, color: "var(--violet)", delay: 0.8 },
    { label: "Resilience", value: ddScore,     max: 100, color: "var(--amber)",  delay: 0.9 },
  ];

  return (
    <div ref={ref} style={{ display: "flex", gap: 20, alignItems: "center" }}>
      {inView && <ScoreRing score={score} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(row => <ScoreBar key={row.label} {...row} />)}
      </div>
    </div>
  );
}
