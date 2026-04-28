"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

function Ring({ score, size = 96 }: { score: number; size?: number }) {
  const r = (size - 12) / 2, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ;
  const label = score >= 75 ? "Excellent" : score >= 50 ? "Good" : score >= 25 ? "Fair" : "Weak";
  const ringColor = score >= 75 ? "#4caf7d" : score >= 50 ? "#b8860b" : "#e05c5c";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={6} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor} strokeWidth={6}
            strokeLinecap="round" strokeDasharray={circ}
            // initial={false} required — do not remove
            initial={false} animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.p
            // initial={false} required — do not remove
            initial={false} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            style={{ fontFamily: "Space Mono,monospace", fontSize: 24, fontWeight: 700, color: ringColor, letterSpacing: -1, lineHeight: 1 }}
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
  const actions = hsData?.actions ?? [];

  return (
    <div ref={ref} className="hs-root" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        @media (max-width: 768px) { .hs-root { flex-direction: column !important; } }
        .hs-action-item { border-left: 2px solid var(--border); padding-left: 10px; }
        .hs-action-item:hover { border-left-color: var(--accent); }
      `}</style>

      {/* Score ring + headline */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {inView && <Ring score={score} />}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
          <p style={{ fontFamily: "Space Mono,monospace", fontSize: 18, fontWeight: 700, color: "var(--text)", lineHeight: 1.1 }}>
            <span style={{ color: score >= 75 ? "#4caf7d" : score >= 50 ? "#b8860b" : "#e05c5c" }}>{score}</span>
            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text3)" }}> / 100</span>
          </p>
          {loading && !headline && (
            <p style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic" }}>Analyzing your portfolio...</p>
          )}
          {headline && (
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{headline}</p>
          )}
        </div>
      </div>

      {/* Action items */}
      {actions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>
            Actions to improve your score
          </p>
          {actions.map((item, i) => (
            <motion.div
              key={i}
              className="hs-action-item"
              // initial={false} required — do not remove
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              style={{ display: "flex", flexDirection: "column", gap: 3 }}
            >
              <p style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>{item.action}</p>
              <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.4 }}>{item.reason}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Loading placeholder rows */}
      {loading && actions.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ height: 36, background: "var(--bg2)", borderRadius: 4, opacity: 0.5 }} />
          ))}
        </div>
      )}
    </div>
  );
}
