"use client";

import { useMemo, useEffect, useState } from "react";
import { Plus, Upload, Bell, MessageSquare } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type PerfSnapshot = { date: string; portfolio_value: number; cumulative_return: number };

interface LiveQuote {
  price: number;
  change: number;
  pct: number;
}

function computeDailyChange(perfHistory: PerfSnapshot[], portfolioValue: number) {
  if (perfHistory.length < 2) return null;
  const last = perfHistory[perfHistory.length - 1];
  const prev = perfHistory[perfHistory.length - 2];
  if (!last || !prev || prev.cumulative_return == null || last.cumulative_return == null) return null;
  const prevValue = portfolioValue * (1 + prev.cumulative_return);
  const lastValue = portfolioValue * (1 + last.cumulative_return);
  const dailyDollar = lastValue - prevValue;
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
  onAddPortfolio: () => void;
  onImportCSV: () => void;
  onSetAlert: () => void;
  onAskAI: () => void;
}

export default function GreetingBar({
  displayName, portfolioData, assets, perfHistory = [], portfolioValue = 10000,
  onAddPortfolio, onImportCSV, onSetAlert, onAskAI,
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

  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});

  useEffect(() => {
    if (!assets.length) return;
    const tickers = ["^GSPC", ...assets.map(a => a.ticker)].join(",");
    fetch(`${API_URL}/prices?tickers=${encodeURIComponent(tickers)}`)
      .then(r => r.json())
      .then(setQuotes)
      .catch(() => {});
  }, [assets]);

  // Top daily mover among portfolio tickers
  const topMover = useMemo(() => {
    if (!assets.length) return null;
    let best: { ticker: string; pct: number } | null = null;
    for (const a of assets) {
      const q = quotes[a.ticker];
      if (!q) continue;
      if (!best || Math.abs(q.pct) > Math.abs(best.pct)) {
        best = { ticker: a.ticker, pct: q.pct };
      }
    }
    return best;
  }, [assets, quotes]);

  const spxQuote = quotes["^GSPC"];

  const actions = [
    { label: "Add Portfolio", Icon: Plus, onClick: onAddPortfolio, disabled: false },
    { label: "Import CSV", Icon: Upload, onClick: onImportCSV, disabled: false },
    { label: "Set Alert", Icon: Bell, onClick: onSetAlert, disabled: !assets.length },
    { label: "Ask AI", Icon: MessageSquare, onClick: onAskAI, disabled: false },
  ];

  const pos = (v: number) => v >= 0;
  const fmtSign = (v: number) => (v >= 0 ? "+" : "");
  const green = "var(--green, #4ade80)";
  const red = "var(--red, #f87171)";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 0,
      minHeight: 100,
      padding: "18px 0",
      borderBottom: "0.5px solid var(--border)",
      marginBottom: 20,
    }}>

      {/* LEFT — greeting */}
      <div style={{ flex: "0 0 auto", minWidth: 220 }}>
        <h1 style={{
          fontSize: 26, fontWeight: 700, color: "var(--text)",
          letterSpacing: "-0.6px", lineHeight: 1.15, margin: 0,
        }}>
          {greeting}, {name}
        </h1>
        <p style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 5, letterSpacing: "0.01em" }}>
          {dateStr}
        </p>
      </div>

      {/* DIVIDER */}
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", margin: "0 28px", flexShrink: 0 }} />

      {/* CENTER — 3 quick stats */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 32 }}>

        {/* Stat 1: Today's daily change */}
        <div>
          <div style={{ fontSize: 10.5, color: "var(--text3)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>
            Today
          </div>
          {dailyChange ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: pos(dailyChange.dollar) ? green : red, letterSpacing: "-0.3px" }}>
                {fmtSign(dailyChange.dollar)}${Math.abs(dailyChange.dollar).toFixed(0)}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: pos(dailyChange.pct) ? green : red }}>
                {fmtSign(dailyChange.pct)}{dailyChange.pct.toFixed(2)}%
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 14, color: "var(--text3)" }}>—</span>
          )}
        </div>

        {/* Stat 2: Sharpe ratio */}
        <div>
          <div style={{ fontSize: 10.5, color: "var(--text3)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>
            Sharpe
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>
              {portfolioData ? sharpe.toFixed(2) : "—"}
            </span>
            {portfolioData && (
              <span style={{ fontSize: 11, color: sharpe > 1 ? green : sharpe > 0 ? "var(--accent)" : red }}>
                {sharpe > 2 ? "excellent" : sharpe > 1 ? "solid" : sharpe > 0 ? "moderate" : "low"}
              </span>
            )}
          </div>
        </div>

        {/* Stat 3: Top daily mover */}
        <div>
          <div style={{ fontSize: 10.5, color: "var(--text3)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>
            Top Mover
          </div>
          {topMover ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.2px" }}>
                {topMover.ticker}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: pos(topMover.pct) ? green : red }}>
                {fmtSign(topMover.pct)}{topMover.pct.toFixed(2)}%
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 14, color: "var(--text3)" }}>—</span>
          )}
        </div>

      </div>

      {/* DIVIDER */}
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", margin: "0 28px", flexShrink: 0 }} />

      {/* RIGHT — market pill + actions */}
      <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>

        {/* S&P 500 pill */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "5px 11px",
          borderRadius: 20,
          border: "0.5px solid var(--border2)",
          background: "var(--bg2)",
        }}>
          <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 500 }}>S&amp;P 500</span>
          {spxQuote ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: pos(spxQuote.pct) ? green : red }}>
              {fmtSign(spxQuote.pct)}{spxQuote.pct.toFixed(2)}%
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "var(--text3)" }}>—</span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {actions.map(({ label, Icon, onClick, disabled }) => (
            <button
              key={label}
              onClick={disabled ? undefined : onClick}
              title={label}
              style={{
                padding: "5px 11px",
                fontSize: 10.5,
                fontWeight: 500,
                borderRadius: 7,
                border: "0.5px solid var(--border2)",
                background: "transparent",
                color: disabled ? "var(--text3)" : "var(--text2)",
                cursor: disabled ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 4,
                opacity: disabled ? 0.4 : 1,
              }}
              onMouseEnter={e => {
                if (!disabled) {
                  e.currentTarget.style.background = "var(--bg3)";
                  e.currentTarget.style.color = "var(--text)";
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = disabled ? "var(--text3)" : "var(--text2)";
              }}
            >
              <Icon size={10} />
              {label}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
