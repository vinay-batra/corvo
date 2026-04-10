"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { fetchMarketBrief } from "../lib/api";
import { RefreshCw } from "lucide-react";

const C = { amber: "#c9a84c", green: "#4caf7d", red: "#e05c5c" };
const HOUR_MS = 60 * 60 * 1000;

type Mover = { ticker: string; change: number; volume: number };
type BriefData = {
  brief: string;
  generated_at: string;
  indices: Record<string, number>;
  movers: Mover[];
  error?: string;
};

function IndexPill({ ticker, change }: { ticker: string; change: number }) {
  const up = change >= 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 20,
      background: up ? "rgba(76,175,125,0.08)" : "rgba(224,92,92,0.08)",
      border: `0.5px solid ${up ? "rgba(76,175,125,0.25)" : "rgba(224,92,92,0.25)"}`,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", letterSpacing: 0.3 }}>{ticker}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: up ? C.green : C.red }}>
        {up ? "+" : ""}{change.toFixed(2)}%
      </span>
    </div>
  );
}

function ParagraphBlock({ text, index }: { text: string; index: number }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 + 0.1 }}
      style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
      {text}
    </motion.p>
  );
}

export default function MarketBrief() {
  const [data, setData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await fetchMarketBrief(force);
      setData(result);
    } catch {
      // silently fail — don't break the dashboard
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    const interval = setInterval(() => load(false), HOUR_MS);
    return () => clearInterval(interval);
  }, [load]);

  const paragraphs = data?.brief
    ? data.brief.split(/\n\n+/).filter(p => p.trim().length > 0)
    : [];

  const genTime = data?.generated_at
    ? new Date(data.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Index pills row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <AnimatePresence>
          {loading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} style={{ width: 88, height: 26, borderRadius: 20, background: "var(--bg3)", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))
          ) : data?.indices ? (
            Object.entries(data.indices).map(([ticker, change], i) => (
              <motion.div key={ticker} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                <IndexPill ticker={ticker} change={change} />
              </motion.div>
            ))
          ) : null}
        </AnimatePresence>
      </div>

      {/* Brief text */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          [60, 80, 55].map((w, i) => (
            <div key={i} style={{ width: `${w}%`, height: 13, borderRadius: 4, background: "var(--bg3)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))
        ) : data?.error ? (
          <p style={{ fontSize: 12, color: "var(--text3)" }}>Market brief unavailable. Try refreshing.</p>
        ) : (
          paragraphs.map((para, i) => <ParagraphBlock key={i} text={para} index={i} />)
        )}
      </div>

      {/* Footer row: AI badge + generated time + refresh */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase",
            color: C.amber, background: "rgba(201,168,76,0.08)",
            border: "0.5px solid rgba(201,168,76,0.2)",
            padding: "2px 7px", borderRadius: 10,
          }}>
            AI Generated
          </span>
          {genTime && !loading && (
            <span style={{ fontSize: 10, color: "var(--text3)" }}>as of {genTime} UTC</span>
          )}
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading || refreshing}
          title="Regenerate"
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 6,
            border: "0.5px solid var(--border)", background: "transparent",
            color: "var(--text3)", fontSize: 10, cursor: loading || refreshing ? "not-allowed" : "pointer",
            opacity: loading || refreshing ? 0.5 : 1, transition: "all 0.15s",
          }}
          onMouseEnter={e => { if (!loading && !refreshing) { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; } }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}>
          <RefreshCw size={11} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
          {refreshing ? "Generating…" : "Refresh"}
        </button>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
