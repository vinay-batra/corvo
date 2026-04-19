"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type PerfSnapshot = { date: string; portfolio_value: number; cumulative_return: number };

interface MarketSummary {
  market: string;
  holdings: string;
  context: string;
  spy_pct: number;
  qqq_pct: number;
  dia_pct: number;
  vix: number;
}

interface Props {
  displayName: string;
  portfolioData: any;
  assets: { ticker: string; weight: number }[];
  perfHistory?: PerfSnapshot[];
  portfolioValue?: number;
}

export default function GreetingBar({
  displayName, assets,
}: Props) {
  const greeting = getGreeting();
  const name = displayName.trim() || "Investor";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const [market, setMarket] = useState<MarketSummary | null>(null);

  useEffect(() => {
    const tickerParam = assets
      .map(a => a.ticker)
      .filter(Boolean)
      .join(",");
    const url = tickerParam
      ? `${API_URL}/market-summary?tickers=${encodeURIComponent(tickerParam)}`
      : `${API_URL}/market-summary`;
    fetch(url)
      .then(r => r.json())
      .then(setMarket)
      .catch(() => {});
  }, [assets]);

  const pos = (v: number) => v >= 0;
  const fmtSign = (v: number) => (v >= 0 ? "+" : "");
  const green = "#4caf7d";
  const red = "#e05c5c";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 0,
      minHeight: 90,
      padding: "20px 24px",
      borderBottom: "0.5px solid var(--border)",
      marginBottom: 20,
    }}>

      {/* LEFT - greeting + market summary */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: "var(--text)",
          letterSpacing: "-0.5px", lineHeight: 1.2, margin: 0,
        }}>
          {greeting}, {name}
        </h1>
        <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 3, marginBottom: 0, letterSpacing: "0.01em" }}>
          {dateStr}
        </p>
        {market ? (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {market.market && (
              <div>
                <span style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Markets</span>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>{market.market}</p>
              </div>
            )}
            {market.holdings && (
              <div>
                <span style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Your Portfolio</span>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>{market.holdings}</p>
              </div>
            )}
            {market.context && (
              <div>
                <span style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Context</span>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>{market.context}</p>
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, marginTop: 8, marginBottom: 0, opacity: 0.5 }}>
            Fetching market brief...
          </p>
        )}
      </div>

      {/* DIVIDER */}
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", margin: "0 28px", flexShrink: 0 }} />

      {/* RIGHT - live market index pills */}
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 12 }}>

        <StatPill
          label="S&P 500"
          value={market != null ? `${fmtSign(market.spy_pct)}${market.spy_pct.toFixed(2)}%` : "-"}
          color={market != null ? (pos(market.spy_pct) ? green : red) : "var(--text3)"}
        />

        <StatPill
          label="Nasdaq"
          value={market != null ? `${fmtSign(market.qqq_pct)}${market.qqq_pct.toFixed(2)}%` : "-"}
          color={market != null ? (pos(market.qqq_pct) ? green : red) : "var(--text3)"}
        />

        <StatPill
          label="Dow"
          value={market != null ? `${fmtSign(market.dia_pct)}${market.dia_pct.toFixed(2)}%` : "-"}
          color={market != null ? (pos(market.dia_pct) ? green : red) : "var(--text3)"}
        />

      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "7px 14px",
      borderRadius: 10,
      border: "0.5px solid var(--border2)",
      background: "var(--bg2)",
      minWidth: 72,
    }}>
      <span style={{
        fontSize: 10, color: "var(--text3)", fontWeight: 500,
        letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 700, color,
        fontFamily: "'Space Mono', monospace",
        letterSpacing: "-0.2px",
      }}>
        {value}
      </span>
    </div>
  );
}
