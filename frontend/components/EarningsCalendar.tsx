"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type EarningsEntry = {
  ticker: string;
  company: string;
  date: string;
  eps_estimate: number | null;
  revenue_estimate: number | null;
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatRevenue(rev: number): string {
  if (rev >= 1e9) return `$${(rev / 1e9).toFixed(1)}B`;
  if (rev >= 1e6) return `$${(rev / 1e6).toFixed(0)}M`;
  return `$${rev.toFixed(0)}`;
}

export default function EarningsCalendar({ assets }: { assets: { ticker: string }[] }) {
  const [entries, setEntries] = useState<EarningsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assets.length) { setLoading(false); return; }
    const tickers = assets.map(a => a.ticker).join(",");
    fetch(`${API_URL}/earnings-calendar?tickers=${tickers}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setEntries(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assets]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 72, borderRadius: 10, background: "var(--bg3)", animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
          {assets.length === 0
            ? "Add holdings to track upcoming earnings."
            : "No earnings scheduled in the next 60 days for your holdings."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map(e => {
        const days = daysUntil(e.date);
        const borderColor =
          days <= 7
            ? "rgba(224,92,92,0.45)"
            : days <= 14
            ? "rgba(184,134,11,0.4)"
            : "var(--border)";
        const urgencyColor =
          days <= 7 ? "#e05c5c" : days <= 14 ? "var(--accent)" : "var(--text3)";

        return (
          <div
            key={e.ticker}
            style={{
              border: `0.5px solid ${borderColor}`,
              borderRadius: 10,
              padding: "14px 16px",
              background: "var(--card-bg)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                  {e.ticker}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--text2)", marginLeft: 8 }}>{e.company}</span>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: "var(--text2)" }}>{formatDate(e.date)}</div>
                <div style={{ fontSize: 10, color: urgencyColor, fontWeight: 600, marginTop: 1 }}>
                  in {days} day{days !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
            {(e.eps_estimate != null || e.revenue_estimate != null) && (
              <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                {e.eps_estimate != null && (
                  <div>
                    <span style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 1, textTransform: "uppercase" }}>EPS Est.</span>
                    <span style={{ fontSize: 11.5, color: "var(--text)", marginLeft: 5, fontFamily: "Space Mono, monospace" }}>
                      ${e.eps_estimate.toFixed(2)}
                    </span>
                  </div>
                )}
                {e.revenue_estimate != null && (
                  <div>
                    <span style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 1, textTransform: "uppercase" }}>Rev. Est.</span>
                    <span style={{ fontSize: 11.5, color: "var(--text)", marginLeft: 5, fontFamily: "Space Mono, monospace" }}>
                      {formatRevenue(e.revenue_estimate)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
