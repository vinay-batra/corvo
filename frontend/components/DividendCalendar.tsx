"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchDividendCalendar } from "../lib/api";

interface DivEntry {
  ticker: string;
  company: string;
  ex_date: string;
  pay_date: string | null;
  dividend_per_share: number;
  frequency: string;
  yield_pct: number;
  projected_income: number;
  days_until_ex: number;
  allocated_value: number;
}

interface DivCalData {
  calendar: DivEntry[];
  total_projected_income_90d: number;
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono, 'Space Mono', monospace)" };

function fmtDate(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function urgencyColor(days: number) {
  if (days <= 3) return "var(--red, #e05c5c)";
  if (days <= 7) return "var(--warning, #e09a3e)";
  return "var(--accent)";
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

const DividendCalendar = memo(function DividendCalendar({
  assets = [],
  portfolioValue = 10000,
}: {
  assets?: any[];
  portfolioValue?: number;
}) {
  const [data, setData] = useState<DivCalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!assets.length) { setData(null); return; }
    setError(false);
    setLoading(true);
    fetchDividendCalendar(assets, portfolioValue)
      .then(d => setData(d ?? null))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [assets, portfolioValue, retryCount]);

  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: "var(--card-bg)",
        border: "0.5px solid rgba(201,168,76,0.25)",
        borderRadius: 12,
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)",
        }}
      />

      {/* Summary row */}
      {data && data.calendar.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...MONO, fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
            ${(data.total_projected_income_90d).toFixed(2)}
            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text3)", marginLeft: 6, fontFamily: "var(--font-body, sans-serif)" }}>
              projected income (90 days)
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
            {data.calendar.length} dividend event{data.calendar.length !== 1 ? "s" : ""} in the next 90 days
          </div>
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[80, 65, 90].map((w, i) => (
            <div key={i} style={{ height: 52, width: `${w}%`, borderRadius: 8, background: "rgba(255,255,255,0.05)", animation: "divPulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
          ))}
          <style>{`@keyframes divPulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style>
        </div>
      )}

      {error && !loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 0", textAlign: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>Could not load dividend data. Please try again.</span>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "0.5px solid rgba(201,168,76,0.4)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      )}

      {data && !loading && data.calendar.length === 0 && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "16px 18px",
            background: "rgba(255,255,255,0.02)", border: "0.5px solid var(--border)",
            borderRadius: 10,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ fontSize: 12, color: "var(--text3)", margin: 0 }}>
            No dividend events in the next 90 days for your current holdings.
          </p>
        </div>
      )}

      {data && !loading && data.calendar.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.calendar.map(entry => {
            const urgent = entry.days_until_ex <= 7;
            const uc = urgencyColor(entry.days_until_ex);
            return (
              <div
                key={`${entry.ticker}-${entry.ex_date}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: "0 14px",
                  alignItems: "start",
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: urgent ? "rgba(201,168,76,0.04)" : "rgba(255,255,255,0.02)",
                  border: `0.5px solid ${urgent ? "rgba(201,168,76,0.25)" : "var(--border)"}`,
                }}
              >
                {/* Left: ticker badge */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 2 }}>
                  <span
                    style={{
                      ...MONO,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--accent)",
                      background: "rgba(201,168,76,0.1)",
                      border: "0.5px solid rgba(201,168,76,0.25)",
                      borderRadius: 5,
                      padding: "2px 7px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.ticker}
                  </span>
                  {entry.dividend_per_share > 0 && (
                    <span style={{ ...MONO, fontSize: 10, color: "var(--text3)" }}>
                      ${entry.dividend_per_share.toFixed(4)}/sh
                    </span>
                  )}
                </div>

                {/* Middle: dates and note */}
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <span style={{ color: uc }}>
                      <CalendarIcon />
                    </span>
                    <span style={{ color: uc, fontWeight: 600 }}>
                      Ex-div: {fmtDate(entry.ex_date)}
                    </span>
                    {entry.days_until_ex === 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: uc, background: "rgba(224,92,92,0.1)", border: "0.5px solid rgba(224,92,92,0.3)", borderRadius: 4, padding: "1px 5px" }}>TODAY</span>
                    )}
                    {entry.days_until_ex === 1 && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: uc, background: "rgba(224,92,92,0.1)", border: "0.5px solid rgba(224,92,92,0.3)", borderRadius: 4, padding: "1px 5px" }}>TOMORROW</span>
                    )}
                    {entry.days_until_ex > 1 && entry.days_until_ex <= 7 && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: "var(--warning, #e09a3e)", background: "rgba(224,154,62,0.08)", border: "0.5px solid rgba(224,154,62,0.25)", borderRadius: 4, padding: "1px 5px" }}>
                        {entry.days_until_ex}D
                      </span>
                    )}
                  </div>

                  {entry.pay_date && (
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>
                      Pay date: <span style={{ color: "var(--text2)" }}>{fmtDate(entry.pay_date)}</span>
                    </div>
                  )}

                  <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.5 }}>
                    {entry.frequency.charAt(0).toUpperCase() + entry.frequency.slice(1)} dividend
                    {entry.yield_pct > 0 ? ` · ${(entry.yield_pct).toFixed(2)}% yield` : ""}
                    {urgent && (
                      <span style={{ display: "block", color: uc, marginTop: 3, fontWeight: 500 }}>
                        Must own before {fmtDate(entry.ex_date)} to qualify for this payment.
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: projected income */}
                <div style={{ textAlign: "right" }}>
                  {entry.projected_income > 0 && (
                    <>
                      <div style={{ ...MONO, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                        +${entry.projected_income.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 2 }}>
                        projected
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 6, lineHeight: 1.6 }}>
            Projected income based on your portfolio allocation and current dividend rates. Actual payments may differ. You must own shares before the ex-dividend date to receive the dividend.
          </p>
        </div>
      )}
    </motion.div>
  );
});

export default DividendCalendar;
