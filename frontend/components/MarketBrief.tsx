"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchMarketBrief } from "../lib/api";
import { RefreshCw, AlertCircle } from "lucide-react";
import { posthog } from "../lib/posthog";

const C = { amber: "var(--accent)", green: "#4caf7d", red: "#e05c5c" };
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

function formatBriefDate(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function MarketBrief() {
  const [data, setData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const viewTracked = useRef(false);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchMarketBrief(force);
      if (result?.error && !result?.brief) {
        setLoadError(result.error || "Failed to load market brief.");
        setData(null);
      } else {
        setData(result);
        if (!viewTracked.current && result?.brief) {
          posthog.capture("market_brief_viewed");
          viewTracked.current = true;
        }
      }
    } catch {
      setLoadError("Could not connect to the server. Check your connection and try again.");
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

  const isError = !!loadError || (!!data?.error && !data?.brief);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Date tag */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 0.5 }}>{formatBriefDate()}</span>
      </div>

      {/* Index pills row */}
      <div className="c-market-pills" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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

      {/* Brief text or error */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          [60, 80, 55].map((w, i) => (
            <div key={i} style={{ width: `${w}%`, height: 13, borderRadius: 4, background: "var(--bg3)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))
        ) : isError ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px", background: "rgba(224,92,92,0.06)", border: "0.5px solid rgba(224,92,92,0.2)", borderRadius: 8 }}>
              <AlertCircle size={14} style={{ color: C.red, flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "rgba(224,92,92,0.9)", lineHeight: 1.5, margin: 0 }}>
                {loadError || "Market brief unavailable."}
              </p>
            </div>
            <button
              onClick={() => load(true)}
              style={{
                alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 5,
                padding: "7px 14px", borderRadius: 7,
                border: "0.5px solid rgba(184,134,11,0.3)", background: "rgba(184,134,11,0.06)",
                color: C.amber, fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>
              <RefreshCw size={11} />
              Retry
            </button>
          </div>
        ) : (
          paragraphs.map((para, i) => <ParagraphBlock key={i} text={para} index={i} />)
        )}
      </div>

      {/* Footer row: generated time + refresh */}
      {!isError && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            {refreshing ? "Generating..." : "Refresh"}
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
