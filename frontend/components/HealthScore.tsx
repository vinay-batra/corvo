"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

function Ring({ score, size = 115 }: { score: number; size?: number }) {
  const r = (size - 12) / 2, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ;
  const label = score >= 75 ? "Excellent" : score >= 50 ? "Good" : score >= 25 ? "Fair" : "Weak";
  const ringColor = score >= 75 ? "#4caf7d" : score >= 50 ? "#b8860b" : "var(--red)";
  const glowColor = score >= 75 ? "rgba(76,175,125,0.35)" : score >= 50 ? "rgba(184,134,11,0.35)" : "rgba(224,92,92,0.35)";
  const fontSize = Math.round(size * 0.25);
  const gradId = `ring-grad-${score}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      <style>{`
        @keyframes hs-breathe {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px ${glowColor}); }
          50% { transform: scale(1.025); filter: drop-shadow(0 0 10px ${glowColor}); }
        }
        .hs-ring-wrap { animation: hs-breathe 3.5s ease-in-out infinite; animation-delay: 1.2s; }
      `}</style>
      <div className="hs-ring-wrap" style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={ringColor} stopOpacity="0.4" />
              <stop offset="85%" stopColor={ringColor} stopOpacity="1" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={6} />
          {/* Filled arc */}
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={`url(#${gradId})`} strokeWidth={6}
            strokeLinecap="round" strokeDasharray={circ}
            // initial={false} required — do not remove
            initial={false} animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
          />
          {/* Trailing glow dot at arc tip */}
          <motion.circle
            cx={size / 2} cy={6}
            r={4} fill={ringColor}
            // initial={false} required — do not remove
            initial={false}
            animate={{ opacity: [0, 1, 0.6], scale: [0.5, 1.2, 1] }}
            transition={{ delay: 0.9, duration: 0.5 }}
            style={{ filter: `blur(1px) drop-shadow(0 0 4px ${ringColor})`, transformOrigin: `${size/2}px ${size/2}px`, transform: `rotate(${(score / 100) * 360 - 90}deg) translateY(${-(r)}px)` }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.p
            // initial={false} required — do not remove
            initial={false} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            style={{ fontFamily: "Space Mono,monospace", fontSize, fontWeight: 700, color: ringColor, letterSpacing: -1, lineHeight: 1 }}
          >{score}</motion.p>
        </div>
      </div>
      <motion.p
        // initial={false} required — do not remove
        initial={false} animate={{ opacity: 1 }} transition={{ delay: 1 }}
        style={{ fontSize: 9, letterSpacing: 2, color: ringColor, textTransform: "uppercase", marginTop: 6, textAlign: "center" }}
      >{label}</motion.p>
    </div>
  );
}

interface HsAction {
  action: string;
  reason: string;
}

interface HsData {
  score: number;
  headline: string;
  actions: HsAction[];
  cached?: boolean;
}

function localScore(data: any): number {
  const annRet = data.annualized_return ?? data.portfolio_return ?? 0;
  const vol = data.portfolio_volatility ?? 0;
  const sharpe = data.sharpe_ratio ?? (vol > 0 ? (annRet - 0.04) / vol : 0);
  const dd = data.max_drawdown ?? 0;
  const rS = Math.min(Math.max(((annRet + 0.3) / 0.6) * 100, 0), 100);
  const shS = Math.min(Math.max((sharpe / 3) * 100, 0), 100);
  const vS = Math.min(Math.max((1 - vol / 0.6) * 100, 0), 100);
  const dS = Math.min(Math.max((1 + dd / 0.5) * 100, 0), 100);
  return Math.round(rS * 0.3 + shS * 0.3 + vS * 0.25 + dS * 0.15);
}

function localSubScores(data: any): { label: string; score: number }[] {
  const annRet = data.annualized_return ?? data.portfolio_return ?? 0;
  const vol = data.portfolio_volatility ?? 0;
  const sharpe = data.sharpe_ratio ?? (vol > 0 ? (annRet - 0.04) / vol : 0);
  const dd = data.max_drawdown ?? 0;
  return [
    { label: "Returns", score: Math.round(Math.min(Math.max(((annRet + 0.3) / 0.6) * 100, 0), 100)) },
    { label: "Risk-Adjusted", score: Math.round(Math.min(Math.max((sharpe / 3) * 100, 0), 100)) },
    { label: "Stability", score: Math.round(Math.min(Math.max((1 - vol / 0.6) * 100, 0), 100)) },
    { label: "Resilience", score: Math.round(Math.min(Math.max((1 + dd / 0.5) * 100, 0), 100)) },
  ];
}

function SubScoreRow({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? "#4caf7d" : score >= 60 ? "#b8860b" : "var(--red)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 10, color: "var(--text3)", minWidth: 84 }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: "var(--bg3)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.8s ease-out" }} />
      </div>
      <span style={{ fontFamily: "Space Mono,monospace", fontSize: 10, color, minWidth: 24, textAlign: "right" }}>{score}</span>
    </div>
  );
}


export default function HealthScore({
  data,
  userId,
  apiUrl,
}: {
  data: any;
  userId?: string | null;
  apiUrl?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [hsData, setHsData] = useState<HsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fallbackScore = localScore(data);

  const tickersKey = (data?.tickers ?? []).slice().sort().join(",");

  useEffect(() => {
    if (!data || !data.tickers?.length) return;
    const base = apiUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    setLoading(true);
    fetch(`${base}/portfolio/health-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId || "",
        tickers: data.tickers || [],
        weights: data.weights || [],
        annualized_return: data.annualized_return ?? 0,
        portfolio_volatility: data.portfolio_volatility ?? 0,
        sharpe_ratio: data.sharpe_ratio ?? 0,
        max_drawdown: data.max_drawdown ?? 0,
        rf_rate: data.rf_rate ?? 0.04,
        individual_returns: data.individual_returns ?? {},
      }),
    })
      .then((r) => r.json())
      .then((d: HsData) => { setHsData(d); setLoading(false); })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickersKey, userId]);

  const score = hsData?.score ?? fallbackScore;
  const headline = hsData?.headline ?? "";
  const subScores = localSubScores(data);

  return (
    <div ref={ref} className="hs-root" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        @media (max-width: 768px) { .hs-root { flex-direction: column !important; } }
      `}</style>

      {/* Score ring + headline */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {inView && <Ring score={score} size={130} />}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 6 }}>
          <div>
            <p style={{ fontFamily: "Space Mono,monospace", fontSize: 32, fontWeight: 700, color: score >= 75 ? "#4caf7d" : score >= 50 ? "#b8860b" : "var(--red)", lineHeight: 1, margin: "0 0 2px", letterSpacing: -1.5 }}>
              {score}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--text3)", letterSpacing: 0, marginLeft: 2 }}>/100</span>
            </p>
            <p style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: score >= 75 ? "#4caf7d" : score >= 50 ? "#b8860b" : "var(--red)", fontWeight: 700, margin: 0 }}>
              {score >= 75 ? "Excellent" : score >= 50 ? "Good" : score >= 25 ? "Fair" : "Needs Work"}
            </p>
          </div>
          {loading && !headline && (
            <p style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic", margin: 0 }}>Analyzing your portfolio...</p>
          )}
          {headline && (
            <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.6, margin: 0 }}>{headline}</p>
          )}
          {!headline && !loading && score >= 75 && (
            <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.6, margin: 0 }}>Your portfolio is in excellent shape. Strong returns and risk efficiency with no major red flags.</p>
          )}
        </div>
      </div>

      {/* Sub-score breakdown */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {subScores.map((s) => (
          <SubScoreRow key={s.label} label={s.label} score={s.score} />
        ))}
      </div>
    </div>
  );
}
