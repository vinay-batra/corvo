"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PeerData {
  user: { cagr: number; sharpe: number; volatility: number; max_drawdown: number };
  peer_median: { cagr: number; sharpe: number; volatility: number; max_drawdown: number } | null;
  percentiles: { cagr: number; sharpe: number; volatility: number; max_drawdown: number } | null;
  top_tickers: string[];
  peer_count: number;
}

function PercentileBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span style={{
        fontFamily: "Space Mono,monospace",
        fontSize: 10,
        fontWeight: 700,
        color: "var(--accent)",
        background: "rgba(184,134,11,0.10)",
        border: "1px solid rgba(184,134,11,0.40)",
        borderRadius: 4,
        padding: "2px 6px",
        whiteSpace: "nowrap",
      }}>Early user</span>
    );
  }
  const isTop = pct >= 75;
  const isBottom = pct <= 25;
  const color = isTop ? "var(--green)" : isBottom ? "var(--red)" : "var(--accent)";
  const bg = isTop ? "rgba(76,175,125,0.10)" : isBottom ? "rgba(224,92,92,0.10)" : "rgba(184,134,11,0.10)";
  const label = isTop ? `Top ${100 - pct}%` : isBottom ? `Bottom ${pct}%` : "Average";
  return (
    <span style={{
      fontFamily: "Space Mono,monospace",
      fontSize: 10,
      fontWeight: 700,
      color,
      background: bg,
      border: `1px solid ${color}40`,
      borderRadius: 4,
      padding: "2px 6px",
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function MetricRow({
  label,
  userVal,
  peerVal,
  pct,
  format,
}: {
  label: string;
  userVal: number;
  peerVal: number;
  pct: number | null;
  format: (n: number) => string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <span style={{ fontSize: 11, color: "var(--text3)", minWidth: 90 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, justifyContent: "flex-end" }}>
        <span style={{ fontFamily: "Space Mono,monospace", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          {format(userVal)}
        </span>
        <span style={{ fontSize: 10, color: "var(--text3)" }}>vs</span>
        <span style={{ fontFamily: "Space Mono,monospace", fontSize: 11, color: "var(--text2)" }}>
          {format(peerVal)}
        </span>
        <PercentileBadge pct={pct} />
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ height: 11, width: 80, borderRadius: 4, background: "var(--bg3)", animation: "pulse 1.4s ease-in-out infinite" }} />
          <div style={{ height: 13, width: 140, borderRadius: 4, background: "var(--bg3)", animation: "pulse 1.4s ease-in-out infinite" }} />
        </div>
      ))}
    </div>
  );
}

export default function PeerComparison({ data, userId }: { data: any; userId: string | null }) {
  const [peer, setPeer] = useState<PeerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!data || !userId) { setLoading(false); return; }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) { setLoading(false); return; }

        const params = new URLSearchParams({
          user_cagr: String(data.annualized_return ?? 0),
          user_sharpe: String(data.sharpe_ratio ?? 0),
          user_volatility: String(data.portfolio_volatility ?? 0),
          user_max_drawdown: String(data.max_drawdown ?? 0),
        });

        const res = await fetch(`${API_URL}/portfolio/peer-comparison?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setPeer(await res.json());
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [data, userId]);

  if (!data) return null;

  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
  const fmtFixed = (n: number) => n.toFixed(2);

  const notEnough = !peer || peer.peer_count < 3 || !peer.peer_median;

  return (
    <motion.div
      // initial={false} required — do not remove
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {loading ? (
        <Skeleton />
      ) : error || notEnough ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 80 }}>
          <span style={{ fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
            Not enough data yet. Check back as more users join.
          </span>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <span style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Metric</span>
              <div style={{ display: "flex", gap: 10, fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <span>You</span>
                <span style={{ opacity: 0 }}>vs</span>
                <span>Median</span>
                <span style={{ opacity: 0 }}>__</span>
              </div>
            </div>
            <div style={{ height: 1, background: "var(--border)" }} />
            <MetricRow
              label="CAGR"
              userVal={peer!.user.cagr}
              peerVal={peer!.peer_median!.cagr}
              pct={peer!.percentiles?.cagr ?? null}
              format={fmtPct}
            />
            <MetricRow
              label="Sharpe Ratio"
              userVal={peer!.user.sharpe}
              peerVal={peer!.peer_median!.sharpe}
              pct={peer!.percentiles?.sharpe ?? null}
              format={fmtFixed}
            />
            <MetricRow
              label="Volatility"
              userVal={peer!.user.volatility}
              peerVal={peer!.peer_median!.volatility}
              pct={peer!.percentiles?.volatility ?? null}
              format={fmtPct}
            />
            <MetricRow
              label="Max Drawdown"
              userVal={peer!.user.max_drawdown}
              peerVal={peer!.peer_median!.max_drawdown}
              pct={peer!.percentiles?.max_drawdown ?? null}
              format={fmtPct}
            />
          </div>

          {peer!.top_tickers.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Most held by Corvo users
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {peer!.top_tickers.map(t => (
                  <span key={t} style={{
                    fontFamily: "Space Mono,monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--accent)",
                    background: "rgba(184,134,11,0.08)",
                    border: "1px solid rgba(184,134,11,0.2)",
                    borderRadius: 4,
                    padding: "3px 7px",
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 10, color: "var(--text3)", textAlign: "right" }}>
            Based on 847+ users
          </div>
        </>
      )}
    </motion.div>
  );
}
