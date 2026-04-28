"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { fetchEarningsPreview } from "../lib/api";

interface EarningsItem {
  ticker: string;
  company: string;
  date: string;
  days_until: number;
  eps_estimate: number | null;
  revenue_estimate: number | null;
  implied_move_pct: number | null;
  implied_move_source: string | null;
  weight: number;
  ai_commentary: string;
}

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function fmtRev(r: number): string {
  if (r >= 1e9) return `$${(r / 1e9).toFixed(2)}B`;
  return `$${(r / 1e6).toFixed(0)}M`;
}

function DaysChip({ days }: { days: number }) {
  const urgent = days <= 3;
  return (
    <span
      style={{
        fontFamily: "Space Mono, monospace",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.5,
        padding: "2px 7px",
        borderRadius: 10,
        background: urgent ? "rgba(224,92,92,0.12)" : "rgba(201,168,76,0.10)",
        border: `0.5px solid ${urgent ? "rgba(224,92,92,0.3)" : "rgba(201,168,76,0.3)"}`,
        color: urgent ? "#e05c5c" : "var(--accent)",
        whiteSpace: "nowrap" as const,
      }}
    >
      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days}d`}
    </span>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--text3)", fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontFamily: "Space Mono, monospace", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}

function EarningsCard({ item, index }: { item: EarningsItem; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{
        border: "0.5px solid var(--border2)",
        borderRadius: 10,
        background: "var(--card-bg)",
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setExpanded(v => !v); }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          cursor: "pointer",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: "rgba(201,168,76,0.10)", border: "0.5px solid rgba(201,168,76,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Calendar size={14} color="var(--accent)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                {item.ticker}
              </span>
              <DaysChip days={item.days_until} />
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
              {item.company}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 1 }}>
              {fmtDate(item.date)}
            </div>
            {item.implied_move_pct != null && (
              <div style={{ fontFamily: "Space Mono, monospace", fontSize: 11, fontWeight: 700, color: "#4caf7d" }}>
                +/-{item.implied_move_pct}%
              </div>
            )}
          </div>
          {expanded ? (
            <ChevronUp size={13} color="var(--text3)" />
          ) : (
            <ChevronDown size={13} color="var(--text3)" />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            // initial={false} is required — do not remove
            initial={false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{ overflow: "clip" }}
          >
            <div style={{
              borderTop: "0.5px solid var(--border)",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}>
              {/* Analyst estimates row */}
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {item.eps_estimate != null && (
                  <StatPill label="EPS Estimate" value={`$${item.eps_estimate.toFixed(2)}`} />
                )}
                {item.revenue_estimate != null && (
                  <StatPill label="Revenue Est." value={fmtRev(item.revenue_estimate)} />
                )}
                {item.implied_move_pct != null && (
                  <StatPill
                    label={item.implied_move_source === "options" ? "Implied Move (straddle)" : "Implied Move (IV)"}
                    value={`+/-${item.implied_move_pct}%`}
                  />
                )}
                <StatPill label="Portfolio Weight" value={`${(item.weight * 100).toFixed(1)}%`} />
              </div>

              {/* AI commentary */}
              {item.ai_commentary && (
                <div style={{
                  padding: "10px 12px",
                  background: "rgba(201,168,76,0.06)",
                  border: "0.5px solid rgba(201,168,76,0.18)",
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--accent)", fontWeight: 600, marginBottom: 6 }}>
                    Corvo Preview
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>
                    {item.ai_commentary}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface Props {
  assets: { ticker: string; weight: number }[];
}

export default function EarningsImpactPreview({ assets }: Props) {
  const [items, setItems] = useState<EarningsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    if (!assets.length) return;
    setLoading(true);
    try {
      const data = await fetchEarningsPreview(assets);
      if (Array.isArray(data)) setItems(data);
    } catch {
      // silently ignore — earnings preview is non-critical
    } finally {
      setLoading(false);
    }
  }, [assets]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[1, 2].map(i => (
          <div key={i} style={{ height: 62, borderRadius: 10, background: "var(--bg3)", animation: "ep-pulse 1.5s ease-in-out infinite" }} />
        ))}
        <style>{`@keyframes ep-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Section header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0 0 12px 0",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: "var(--accent)", flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: "var(--text)", textTransform: "uppercase" }}>
            Earnings This Week
          </span>
          <span style={{
            fontFamily: "Space Mono, monospace",
            fontSize: 9, fontWeight: 700,
            padding: "1px 6px", borderRadius: 8,
            background: "rgba(201,168,76,0.12)", border: "0.5px solid rgba(201,168,76,0.3)",
            color: "var(--accent)",
          }}>
            {items.length}
          </span>
        </div>
        {collapsed ? <ChevronDown size={13} color="var(--text3)" /> : <ChevronUp size={13} color="var(--text3)" />}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            // initial={false} is required — do not remove
            initial={false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "clip" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item, i) => (
                <EarningsCard key={item.ticker} item={item} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
