"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

function Ring({ score, size = 96 }: { score: number; size?: number }) {
  const r = (size - 12) / 2, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ;
  const label = score >= 75 ? "Excellent" : score >= 50 ? "Good" : score >= 25 ? "Fair" : "Weak";
  const ringColor = score >= 75 ? "#4caf7d" : score >= 50 ? "#b8860b" : "var(--red)";
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

function ScoreTooltip() {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: "0 0 0 4px",
          color: "var(--text3)", fontSize: 10, lineHeight: 1,
          display: "inline-flex", alignItems: "center",
        }}
        aria-label="How is this score calculated?"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6.5" cy="6.5" r="5.75" stroke="currentColor" strokeWidth="1.2" />
          <text x="6.5" y="10" textAnchor="middle" fill="currentColor" fontSize="8" fontFamily="Space Mono, monospace" fontWeight="700">?</text>
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)",
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "12px 14px", zIndex: 100,
          width: 260, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          pointerEvents: "none",
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text)", marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>
            How the score is calculated
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              { label: "Returns", pct: "30%", desc: "Annualized portfolio return vs. a -30% to +30% scale" },
              { label: "Risk-Adjusted", pct: "30%", desc: "Sharpe ratio (return per unit of risk, scored 0 to 3)" },
              { label: "Stability", pct: "25%", desc: "Portfolio volatility (lower is better, scored vs. 60% max)" },
              { label: "Resilience", pct: "15%", desc: "Max drawdown (how far the portfolio fell at its worst)" },
            ].map(({ label, pct, desc }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "var(--text2)", fontWeight: 600 }}>{label}</span>
                  <span style={{ fontFamily: "Space Mono, monospace", fontSize: 10, color: "var(--accent)" }}>{pct}</span>
                </div>
                <span style={{ fontSize: 9, color: "var(--text3)", lineHeight: 1.4 }}>{desc}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 9, color: "var(--text3)", lineHeight: 1.5 }}>
              Penalties reduce sub-scores when more than 60% of the portfolio sits in one sector (lowers Stability and Resilience) or when average pairwise correlation exceeds 0.7 (lowers Risk-Adjusted). Risk-Adjusted is capped at 80 with fewer than 3 distinct asset classes.
            </p>
          </div>
        </div>
      )}
    </span>
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
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {inView && <Ring score={score} />}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
          <p style={{ fontFamily: "Space Mono,monospace", fontSize: 18, fontWeight: 700, color: "var(--text)", lineHeight: 1.1, display: "flex", alignItems: "center", gap: 2 }}>
            <span style={{ color: score >= 75 ? "#4caf7d" : score >= 50 ? "#b8860b" : "var(--red)" }}>{score}</span>
            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text3)" }}> / 100</span>
            <ScoreTooltip />
          </p>
          {loading && !headline && (
            <p style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic" }}>Analyzing your portfolio...</p>
          )}
          {headline && (
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{headline}</p>
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
