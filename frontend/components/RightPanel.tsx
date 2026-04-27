"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Calendar, ChevronDown, X, RefreshCw } from "lucide-react";
import MarketBrief from "./MarketBrief";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface LiveEntry {
  ticker: string;
  price: number;
  change_pct: number;
  name?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  watchlistTickers: string[];
  holdingTickers: string[];
  onSelectTicker: (t: string) => void;
}

function LiveRow({
  entry,
  onSelect,
  flash,
}: {
  entry: LiveEntry;
  onSelect: () => void;
  flash: boolean;
}) {
  const up = entry.change_pct >= 0;
  return (
    <motion.div
      onClick={onSelect}
      initial={false}
      animate={flash ? { backgroundColor: up ? "rgba(76,175,125,0.12)" : "rgba(224,92,92,0.12)" } : { backgroundColor: "transparent" }}
      transition={{ duration: 0.8 }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 14px",
        cursor: "pointer",
        borderRadius: 8,
        transition: "background 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <div>
        <span style={{ fontFamily: "Space Mono, monospace", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
          {entry.ticker}
        </span>
        {entry.name && (
          <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: 7, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block", verticalAlign: "middle" }}>
            {entry.name.length > 16 ? entry.name.slice(0, 16) + "…" : entry.name}
          </span>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "Space Mono, monospace" }}>
          ${entry.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: up ? "#4caf7d" : "#e05c5c" }}>
          {up ? "+" : ""}{entry.change_pct != null ? entry.change_pct.toFixed(2) : "-"}%
        </div>
      </div>
    </motion.div>
  );
}

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 6px" }}>
      <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", fontWeight: 600 }}>
        {title}
      </span>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: "0.5px", background: "var(--border)", margin: "6px 0" }} />;
}

interface EarningsEntry {
  ticker: string;
  date: string;
}

export default function RightPanel({ open, onClose, watchlistTickers, holdingTickers, onSelectTicker }: Props) {
  const [liveData, setLiveData] = useState<Record<string, LiveEntry>>({});
  const [flashSet, setFlashSet] = useState<Set<string>>(new Set());
  const [briefCollapsed, setBriefCollapsed] = useState(false);
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const prevPrices = useRef<Record<string, number>>({});
  const allTickers = [...new Set([...watchlistTickers, ...holdingTickers])];

  const fetchPrices = useCallback(async () => {
    if (!allTickers.length) return;
    try {
      const r = await fetch(`${API_URL}/watchlist-data?tickers=${allTickers.join(",")}`);
      const d = await r.json();
      const map: Record<string, LiveEntry> = {};
      (d.results || []).forEach((s: any) => {
        if (s?.ticker && s.price) {
          map[s.ticker] = { ticker: s.ticker, price: s.price, change_pct: s.change_pct ?? 0, name: s.name };
        }
      });

      const flashed = new Set<string>();
      Object.keys(map).forEach(t => {
        const prev = prevPrices.current[t];
        if (prev !== undefined && Math.abs(prev - map[t].price) > 0.001) flashed.add(t);
        prevPrices.current[t] = map[t].price;
      });
      if (flashed.size > 0) {
        setFlashSet(flashed);
        setTimeout(() => setFlashSet(new Set()), 800);
      }
      setLiveData(map);
    } catch {}
  }, [allTickers.join(",")]);

  useEffect(() => {
    if (!open) return;
    fetchPrices();
    const id = setInterval(fetchPrices, 10000);
    return () => clearInterval(id);
  }, [open, fetchPrices]);

  useEffect(() => {
    if (!open || holdingTickers.length === 0) return;
    fetch(`${API_URL}/earnings-calendar?tickers=${holdingTickers.join(",")}`)
      .then(r => r.json())
      .then((d: EarningsEntry[]) => setEarnings(Array.isArray(d) ? d : []))
      .catch(() => setEarnings([]));
  }, [open, holdingTickers.join(",")]);

  // Sort by absolute change_pct for top movers
  const sortedByMove = Object.values(liveData)
    .filter(e => watchlistTickers.includes(e.ticker) || holdingTickers.includes(e.ticker))
    .sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));

  const gainers = sortedByMove.filter(e => e.change_pct > 0).slice(0, 3);
  const losers = sortedByMove.filter(e => e.change_pct < 0).slice(0, 3);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          // initial={false} is required — do not remove
          initial={false}
          animate={{ width: 420, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          style={{
            flexShrink: 0,
            borderLeft: "0.5px solid var(--border)",
            background: "var(--bg2)",
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "none",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Panel header */}
          <div style={{ padding: "14px 14px 10px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase" }}>
              Market Panel
            </span>
            <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", flexShrink: 0 }}>
              <X size={12} />
            </button>
          </div>

          {/* Market Brief: collapsible */}
          <div style={{ borderBottom: "0.5px solid var(--border)" }}>
            <button
              onClick={() => setBriefCollapsed(p => !p)}
              style={{
                width: "100%", padding: "10px 14px",
                background: "transparent", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", fontWeight: 600 }}>
                Market Brief
              </span>
              <div style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 5,
                border: "0.5px solid var(--border)",
                background: "var(--bg2)",
                color: "var(--text2)",
                fontSize: 10,
                fontWeight: 600,
                pointerEvents: "none",
              }}>
                {briefCollapsed ? "Expand" : "Collapse"}
                <ChevronDown
                  size={11}
                  style={{ transform: briefCollapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}
                />
              </div>
            </button>
            <AnimatePresence>
              {!briefCollapsed && (
                <motion.div
                  // initial={false} is required — do not remove
                  initial={false}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden", padding: "0 14px 14px" }}
                >
                  <MarketBrief />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live prices: holdings */}
          {holdingTickers.length > 0 && (
            <>
              <SectionHeader title="Your Holdings">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4caf7d", animation: "pulse 2s ease-in-out infinite" }} />
              </SectionHeader>
              {holdingTickers.map(t => {
                const e = liveData[t];
                if (!e) return (
                  <div key={t} style={{ padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "Space Mono, monospace", fontSize: 12, color: "var(--text3)" }}>{t}</span>
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>-</span>
                  </div>
                );
                return <LiveRow key={t} entry={e} flash={flashSet.has(t)} onSelect={() => onSelectTicker(t)} />;
              })}
              <Divider />
            </>
          )}

          {/* Top movers: from watchlist */}
          {(gainers.length > 0 || losers.length > 0) && (
            <>
              {gainers.length > 0 && (
                <>
                  <SectionHeader title="Top Gainers">
                    <TrendingUp size={12} style={{ color: "#4caf7d" }} />
                  </SectionHeader>
                  {gainers.map(e => (
                    <LiveRow key={e.ticker} entry={e} flash={flashSet.has(e.ticker)} onSelect={() => onSelectTicker(e.ticker)} />
                  ))}
                </>
              )}
              {losers.length > 0 && (
                <>
                  <SectionHeader title="Top Losers">
                    <TrendingDown size={12} style={{ color: "#e05c5c" }} />
                  </SectionHeader>
                  {losers.map(e => (
                    <LiveRow key={e.ticker} entry={e} flash={flashSet.has(e.ticker)} onSelect={() => onSelectTicker(e.ticker)} />
                  ))}
                </>
              )}
              <Divider />
            </>
          )}

          {/* Empty watchlist hint */}
          {watchlistTickers.length === 0 && holdingTickers.length === 0 && (
            <div style={{ padding: "24px 14px", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
                Add tickers to your watchlist or portfolio to see live prices here.
              </p>
            </div>
          )}

          {/* Upcoming earnings */}
          {(holdingTickers.length > 0 && earnings.length > 0) && (
            <>
              <SectionHeader title="Upcoming Earnings">
                <Calendar size={12} style={{ color: "var(--text3)" }} />
              </SectionHeader>
              <div style={{ padding: "4px 14px 16px" }}>
                {earnings.slice(0, 5).map(e => (
                  <div key={e.ticker} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid var(--border)" }}>
                    <span style={{ fontFamily: "Space Mono, monospace", fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{e.ticker}</span>
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>
                      {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Footer */}
          <div style={{ padding: "8px 14px", marginTop: "auto", borderTop: "0.5px solid var(--border)" }}>
            <p style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 1 }}>
              Prices refresh every 10s · 15-min delay
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
