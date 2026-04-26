"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchMarketBrief } from "../lib/api";
import { RefreshCw, AlertCircle } from "lucide-react";
import { posthog } from "../lib/posthog";

const C = { amber: "var(--accent)", green: "#4caf7d", red: "#e05c5c" };
const HOUR_MS = 60 * 60 * 1000;

function computeMarketStatus() {
  const etStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const et = new Date(etStr);
  const h = et.getHours();
  const m = et.getMinutes();
  const dow = et.getDay();
  const mins = h * 60 + m;
  const OPEN = 9 * 60 + 30;
  const CLOSE = 16 * 60;
  const fmt = (n: number) => {
    const hh = Math.floor(n / 60);
    const mm = n % 60;
    return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
  };
  if (dow === 0 || dow === 6) return { dot: "#666", label: "Closed · Opens Mon 9:30 AM ET" };
  if (mins < OPEN) return { dot: C.amber, label: `Pre-Market · Opens in ${fmt(OPEN - mins)}` };
  if (mins < CLOSE) return { dot: C.green, label: `Open · Closes in ${fmt(CLOSE - mins)}` };
  return { dot: "#666", label: `After Hours · Closed ${fmt(mins - CLOSE)} ago` };
}

function MarketStatusPill() {
  const [s, setS] = useState(() => computeMarketStatus());
  useEffect(() => {
    const id = setInterval(() => setS(computeMarketStatus()), 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 20, background: "var(--bg3)", border: "0.5px solid var(--border)", flexShrink: 0 }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0, boxShadow: s.dot === C.green ? "0 0 4px rgba(76,175,125,0.5)" : "none" }} />
      <span style={{ fontSize: 10, color: "var(--text2)", whiteSpace: "nowrap" }}>{s.label}</span>
    </div>
  );
}

type Mover = { ticker: string; change: number; volume: number };
type BriefSections = {
  market_summary?: string;
  market_driver?: string;
  portfolio_impact?: string;
  outlook?: string;
};
type BriefData = {
  brief: string;
  sections?: BriefSections;
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
        {up ? "+" : ""}{change != null ? change.toFixed(2) : "-"}%
      </span>
    </div>
  );
}

function SectionBlock({ label, labelColor, text, delay }: { label?: string; labelColor?: string; text: string; delay: number }) {
  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <span style={{ fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", color: labelColor || "var(--text3)", fontWeight: 600 }}>
          {label}
        </span>
      )}
      <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>{text}</p>
    </motion.div>
  );
}

function BriefDivider() {
  return <div style={{ height: "0.5px", background: "var(--border)", opacity: 0.6 }} />;
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

  const s = data?.sections;
  // Fall back to splitting the legacy brief text if no structured sections yet
  const legacyParagraphs = !s && data?.brief
    ? data.brief.split(/\n\n+/).filter(p => p.trim().length > 0)
    : [];

  const genTime = data?.generated_at
    ? new Date(data.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const isError = !!loadError || (!!data?.error && !data?.brief);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Date tag + market status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 0.5 }}>{formatBriefDate()}</span>
        <MarketStatusPill />
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
              <motion.div key={ticker} initial={false} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                <IndexPill ticker={ticker} change={change} />
              </motion.div>
            ))
          ) : null}
        </AnimatePresence>
      </div>

      {/* Brief sections or error */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          [70, 90, 60, 75, 55].map((w, i) => (
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
        ) : s ? (
          <>
            {s.market_summary && (
              <SectionBlock text={s.market_summary} delay={0.05} />
            )}
            {s.market_driver && (
              <>
                <BriefDivider />
                <SectionBlock label="Why It Moved" labelColor={C.amber} text={s.market_driver} delay={0.1} />
              </>
            )}
            {s.portfolio_impact && (
              <>
                <BriefDivider />
                <SectionBlock label="Your Portfolio" labelColor={C.amber} text={s.portfolio_impact} delay={0.15} />
              </>
            )}
            {s.outlook && (
              <>
                <BriefDivider />
                <SectionBlock label="What to Watch" labelColor={C.amber} text={s.outlook} delay={0.2} />
              </>
            )}
          </>
        ) : (
          // Legacy fallback for cached responses without sections
          legacyParagraphs.map((para, i) => (
            <SectionBlock key={i} text={para} delay={i * 0.1 + 0.05} />
          ))
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
