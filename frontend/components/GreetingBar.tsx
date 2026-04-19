"use client";

import { useMemo } from "react";
import { Plus, Upload, Bell, MessageSquare } from "lucide-react";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type PerfSnapshot = { date: string; portfolio_value: number; cumulative_return: number };

function buildPulse(data: any, perfHistory: PerfSnapshot[], portfolioValue: number): string {
  if (!data) return "";

  // Prefer today's daily return computed from the last two snapshots
  let dailyPart = "";
  if (perfHistory && perfHistory.length >= 2) {
    const last = perfHistory[perfHistory.length - 1];
    const prev = perfHistory[perfHistory.length - 2];
    if (last && prev && prev.cumulative_return != null && last.cumulative_return != null) {
      // daily_return ≈ difference in cumulative returns over one day
      const prevValue = portfolioValue * (1 + prev.cumulative_return);
      const lastValue = portfolioValue * (1 + last.cumulative_return);
      const dailyDollar = lastValue - prevValue;
      const dailyPct = prev.cumulative_return !== -1
        ? ((last.cumulative_return - prev.cumulative_return) / (1 + prev.cumulative_return)) * 100
        : 0;
      const sign = (dailyDollar ?? 0) >= 0 ? "+" : "";
      dailyPart = `Today: ${sign}$${Math.abs(dailyDollar ?? 0).toFixed(0)} (${sign}${(dailyPct ?? 0).toFixed(2)}%). `;
    }
  }

  const sharpe = data.sharpe_ratio ?? 0;
  const drawdown = data.max_drawdown ?? 0;
  const sharpeTxt =
    sharpe > 2 ? "excellent risk-adjusted returns" :
    sharpe > 1 ? "solid risk-adjusted returns" :
    sharpe > 0 ? "moderate risk-adjusted returns" :
    "risk-adjusted returns below target";
  const ddWarn = Math.abs(drawdown) > 0.2 ? ` Heads up: max drawdown is ${(Math.abs(drawdown) * 100).toFixed(1)}%.` : "";
  return `${dailyPart}Sharpe ${sharpe.toFixed(2)}, ${sharpeTxt}.${ddWarn}`;
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
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const pulse = useMemo(
    () => buildPulse(portfolioData, perfHistory, portfolioValue),
    [portfolioData, perfHistory, portfolioValue]
  );

  const actions = [
    { label: "Add Portfolio", Icon: Plus, onClick: onAddPortfolio, disabled: false },
    { label: "Import CSV", Icon: Upload, onClick: onImportCSV, disabled: false },
    { label: "Set Alert", Icon: Bell, onClick: onSetAlert, disabled: !assets.length },
    { label: "Ask AI", Icon: MessageSquare, onClick: onAskAI, disabled: false },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Greeting */}
      <div style={{ marginBottom: pulse ? 10 : 14 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: "var(--text)",
          letterSpacing: "-0.5px", lineHeight: 1.2, margin: 0,
        }}>
          {greeting}, {name}
        </h1>
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>{dateStr}</p>
      </div>

      {/* Portfolio pulse */}
      {pulse && (
        <div style={{
          padding: "10px 14px",
          background: "rgba(201,168,76,0.04)",
          border: "0.5px solid rgba(201,168,76,0.18)",
          borderRadius: 10,
          marginBottom: 14,
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
        }}>
          <span style={{ fontSize: 11, color: "var(--accent)", flexShrink: 0, marginTop: 1 }}>◎</span>
          <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.55, margin: 0 }}>
            {pulse}
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {actions.map(({ label, Icon, onClick, disabled }) => (
          <button
            key={label}
            onClick={disabled ? undefined : onClick}
            style={{
              padding: "6px 13px",
              fontSize: 11,
              fontWeight: 500,
              borderRadius: 8,
              border: "0.5px solid var(--border2)",
              background: "transparent",
              color: disabled ? "var(--text3)" : "var(--text2)",
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 5,
              opacity: disabled ? 0.45 : 1,
            }}
            onMouseEnter={e => {
              if (!disabled) {
                e.currentTarget.style.background = "var(--bg3)";
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.borderColor = "var(--border2)";
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = disabled ? "var(--text3)" : "var(--text2)";
            }}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
