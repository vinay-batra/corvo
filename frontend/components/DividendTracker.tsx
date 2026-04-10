"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchDividends } from "../lib/api";

interface Holding {
  ticker: string;
  weight: number;
  dividend_yield: number | null;
  annual_income: number;
  ex_div_date: string | null;
}

interface DividendData {
  holdings: Holding[];
  total_annual_income: number;
  next_ex_div_date: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-");
  const target = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const DividendTracker = memo(function DividendTracker({ assets }: { assets: any[] }) {
  const [data, setData] = useState<DividendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!assets.length) return;
    setLoading(true);
    setFetchError(false);
    fetchDividends(assets, 10000)
      .then((res) => setData(res ?? null))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [assets]);

  // Sort by ex_div_date ascending (null dates go last)
  const sorted = data
    ? [...data.holdings].sort((a, b) => {
        if (!a.ex_div_date && !b.ex_div_date) return 0;
        if (!a.ex_div_date) return 1;
        if (!b.ex_div_date) return -1;
        return a.ex_div_date.localeCompare(b.ex_div_date);
      })
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-dim)",
        borderRadius: 14,
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Amber top-line accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)",
          opacity: 0.6,
        }}
      />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
            Dividend Income
          </p>
          {data && (
            <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "#c9a84c", margin: 0, lineHeight: 1 }}>
              ${data.total_annual_income.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6, fontFamily: "var(--font-body)" }}>
                est. annual / $10k
              </span>
            </p>
          )}
        </div>
        {data?.next_ex_div_date && (
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 3 }}>
              Next Ex-Div
            </p>
            <p style={{ fontSize: 12, color: "rgba(201,168,76,0.85)", margin: 0 }}>
              {formatDate(data.next_ex_div_date)}
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[100, 85, 90, 75].map((w, i) => (
            <div key={i} style={{ height: 13, width: `${w}%`, borderRadius: 4, background: "rgba(255,255,255,0.06)", animation: "divPulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.12}s` }} />
          ))}
          <style>{`@keyframes divPulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
        </div>
      ) : fetchError ? (
        <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
          <p style={{ color: "rgba(224,92,92,0.8)" }}>Unable to load dividend data — server may be temporarily unavailable.</p>
        </div>
      ) : data ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Ticker", "Yield %", "Annual $ Income", "Next Ex-Div Date"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === "Ticker" ? "left" : "right",
                      padding: "6px 10px",
                      fontSize: 9,
                      letterSpacing: 2,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      borderBottom: "1px solid var(--border-dim)",
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((h) => {
                const days = daysUntil(h.ex_div_date);
                const soon = days !== null && days >= 0 && days <= 30;
                const noDividend = h.dividend_yield === null || h.dividend_yield === 0;

                return (
                  <tr
                    key={h.ticker}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: soon ? "rgba(201,168,76,0.06)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "10px 10px", fontWeight: 600, color: "var(--text1)", textAlign: "left" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {h.ticker}
                        {soon && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 600,
                              letterSpacing: 1,
                              color: "#c9a84c",
                              background: "rgba(201,168,76,0.15)",
                              border: "1px solid rgba(201,168,76,0.3)",
                              borderRadius: 4,
                              padding: "1px 5px",
                              textTransform: "uppercase",
                            }}
                          >
                            {days === 0 ? "Today" : `${days}d`}
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: noDividend ? "var(--text-muted)" : "rgba(201,168,76,0.85)" }}>
                      {noDividend ? "—" : `${h.dividend_yield?.toFixed(2)}%`}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: noDividend ? "var(--text-muted)" : "var(--text1)" }}>
                      {noDividend ? (
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>No dividend</span>
                      ) : (
                        `$${h.annual_income.toFixed(2)}`
                      )}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: soon ? "#c9a84c" : "var(--text2)" }}>
                      {h.ex_div_date ? formatDate(h.ex_div_date) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
          No dividend data available
        </div>
      )}
    </motion.div>
  );
});

export default DividendTracker;
