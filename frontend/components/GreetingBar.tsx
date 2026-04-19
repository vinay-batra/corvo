"use client";

import { useMemo, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type PerfSnapshot = { date: string; portfolio_value: number; cumulative_return: number };

interface MarketSummary {
  summary: string;
  spy_pct: number;
  qqq_pct: number;
  dia_pct: number;
  vix: number;
}

function computeDailyChange(perfHistory: PerfSnapshot[], portfolioValue: number) {
  if (perfHistory.length < 2) return null;
  const last = perfHistory[perfHistory.length - 1];
  const prev = perfHistory[perfHistory.length - 2];
  if (!last || !prev || prev.cumulative_return == null || last.cumulative_return == null) return null;
  const dailyDollar =
    portfolioValue * (1 + last.cumulative_return) - portfolioValue * (1 + prev.cumulative_return);
  const dailyPct =
    prev.cumulative_return !== -1
      ? ((last.cumulative_return - prev.cumulative_return) / (1 + prev.cumulative_return)) * 100
      : 0;
  return { dollar: dailyDollar, pct: dailyPct };
}

interface Props {
  displayName: string;
  portfolioData: any;
  assets: { ticker: string; weight: number }[];
  perfHistory?: PerfSnapshot[];
  portfolioValue?: number;
}

export default function GreetingBar({
  displayName, portfolioData, assets, perfHistory = [], portfolioValue = 10000,
}: Props) {
  const greeting = getGreeting();
  const name = displayName.trim() || "Investor";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const dailyChange = useMemo(
    () => computeDailyChange(perfHistory, portfolioValue),
    [perfHistory, portfolioValue]
  );

  const sharpe: number = portfolioData?.sharpe_ratio ?? 0;

  const [market, setMarket] = useState<MarketSummary | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/market-summary`)
      .then(r => r.json())
      .then(setMarket)
      .catch(() => {});
  }, []);

  const pos = (v: number) => v >= 0;
  const fmtSign = (v: number) => (v >= 0 ? "+" : "");
  const green = "var(--green, #4ade80)";
  const red = "var(--red, #f87171)";

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

      {/* LEFT — greeting + market summary */}
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
        {market?.summary ? (
          <p style={{
            fontSize: 13,
            color: "var(--text2)",
            lineHeight: 1.7,
            marginTop: 8,
            marginBottom: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {market.summary}
          </p>
        ) : (
          <p style={{
            fontSize: 13,
            color: "var(--text3)",
            lineHeight: 1.7,
            marginTop: 8,
            marginBottom: 0,
            opacity: 0.5,
          }}>
            Fetching market brief...
          </p>
        )}
      </div>

      {/* DIVIDER */}
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", margin: "0 28px", flexShrink: 0 }} />

      {/* RIGHT — 3 stat pills */}
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 16 }}>

        {/* Pill: S&P 500 */}
        <StatPill
          label="S&P 500"
          value={market ? `${fmtSign(market.spy_pct)}${market.spy_pct.toFixed(2)}%` : "—"}
          color={market ? (pos(market.spy_pct) ? green : red) : "var(--text3)"}
        />

        {/* Pill: Sharpe */}
        <StatPill
          label="Sharpe"
          value={portfolioData ? sharpe.toFixed(2) : "—"}
          color={
            !portfolioData ? "var(--text3)"
            : sharpe > 1 ? green
            : sharpe > 0 ? "var(--accent)"
            : red
          }
        />

        {/* Pill: Portfolio Daily */}
        <StatPill
          label="Today"
          value={
            dailyChange
              ? `${fmtSign(dailyChange.pct)}${dailyChange.pct.toFixed(2)}%`
              : "—"
          }
          color={dailyChange ? (pos(dailyChange.pct) ? green : red) : "var(--text3)"}
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
