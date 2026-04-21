"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchDividends } from "../lib/api";

const AMBER = "#b8860b";
const AMBER_LIGHT = "rgba(201,168,76,0.85)";

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

interface Holding {
  ticker: string;
  ex_div_date: string | null;
}

interface DividendData {
  holdings: Holding[];
}

const DividendCalendar = memo(function DividendCalendar({ assets }: { assets: any[] }) {
  const [data, setData] = useState<DividendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  useEffect(() => {
    const check = () => setDark(document.documentElement.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!assets.length) return;
    setLoading(true);
    fetchDividends(assets)
      .then((res: DividendData) => setData(res ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [assets]);

  // Build a map: month index (0-11) → tickers with ex-div in that month for currentYear
  const monthMap: Record<number, string[]> = {};
  for (let i = 0; i < 12; i++) monthMap[i] = [];

  if (data?.holdings) {
    for (const h of data.holdings) {
      if (!h.ex_div_date) continue;
      const [year, month] = h.ex_div_date.split("-").map(Number);
      if (year === currentYear) {
        monthMap[month - 1].push(h.ticker);
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-dim)",
        borderRadius: 14,
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`@keyframes calPulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)" }} />

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
        <p style={{ fontSize: 8, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase", margin: 0 }}>
          Dividend Calendar
        </p>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "Space Mono, monospace" }}>
          {currentYear}
        </span>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 80,
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                animation: `calPulse 1.5s ease-in-out infinite`,
                animationDelay: `${i * 0.07}s`,
              }}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {MONTHS.map((month, idx) => {
            const isCurrent = idx === currentMonth;
            const tickers = monthMap[idx];
            const hasDivs = tickers.length > 0;

            return (
              <div
                key={month}
                style={{
                  border: isCurrent
                    ? `0.5px solid ${dark ? "rgba(201,168,76,0.55)" : "rgba(184,134,11,0.5)"}`
                    : "0.5px solid var(--border)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  minHeight: 80,
                  background: isCurrent
                    ? dark ? "rgba(201,168,76,0.05)" : "rgba(184,134,11,0.04)"
                    : "transparent",
                  transition: "background 0.2s",
                }}
              >
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    margin: "0 0 7px 0",
                    color: isCurrent
                      ? dark ? AMBER_LIGHT : AMBER
                      : hasDivs
                        ? "var(--text2)"
                        : "var(--text-muted)",
                  }}
                >
                  {month.slice(0, 3)}
                </p>

                {hasDivs ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {tickers.map(ticker => (
                      <span
                        key={ticker}
                        style={{
                          fontSize: 9,
                          fontFamily: "Space Mono, monospace",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: dark ? "rgba(201,168,76,0.15)" : "rgba(184,134,11,0.1)",
                          border: `1px solid ${dark ? "rgba(201,168,76,0.3)" : "rgba(184,134,11,0.25)"}`,
                          color: dark ? AMBER_LIGHT : AMBER,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ticker}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0, opacity: 0.45 }}>—</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
});

export default DividendCalendar;
