"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { posthog } from "../lib/posthog";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SHORT_TERM_RATE = 0.37;
const LONG_TERM_RATE = 0.20;

interface Asset {
  ticker: string;
  weight: number;
  purchasePrice?: number;
  purchaseDate?: string;
}

interface PriceResult {
  ticker: string;
  price: number;
}

interface GainRow {
  ticker: string;
  purchasePrice: number;
  currentPrice: number;
  gainDollars: number;
  gainPct: number;
  isShortTerm: boolean;
  estTax: number;
}

function isShortTerm(purchaseDate?: string): boolean {
  if (!purchaseDate) return true; // conservative — treat unknown as short-term
  const held = Date.now() - new Date(purchaseDate).getTime();
  return held < 365 * 24 * 60 * 60 * 1000;
}

function fmt$(n: number) {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? "-$" : "$") + abs;
}

const CapitalGainsEstimator = memo(function CapitalGainsEstimator({
  assets,
  portfolioValue,
}: {
  assets: Asset[];
  portfolioValue: number;
}) {
  const [rows, setRows] = useState<GainRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [noPurchasePrices, setNoPurchasePrices] = useState(false);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (!viewTracked.current) {
      posthog.capture("capital_gains_card_viewed");
      viewTracked.current = true;
    }
  }, []);

  useEffect(() => {
    const eligible = assets.filter(a => a.purchasePrice != null && a.purchasePrice > 0);
    if (!eligible.length) {
      setNoPurchasePrices(true);
      setRows([]);
      return;
    }
    setNoPurchasePrices(false);
    setFetchError(false);
    setLoading(true);

    const tickers = eligible.map(a => a.ticker).join(",");
    fetch(`${API_URL}/watchlist-data?tickers=${tickers}`)
      .then(r => r.json())
      .then((data: { results: PriceResult[] }) => {
        const priceMap: Record<string, number> = {};
        for (const r of data.results ?? []) priceMap[r.ticker] = r.price;

        const computed: GainRow[] = [];
        for (const asset of eligible) {
          const currentPrice = priceMap[asset.ticker];
          if (!currentPrice || !asset.purchasePrice) continue;
          const shares = (asset.weight * portfolioValue) / asset.purchasePrice;
          const gainDollars = (currentPrice - asset.purchasePrice) * shares;
          const gainPct = ((currentPrice - asset.purchasePrice) / asset.purchasePrice) * 100;
          const short = isShortTerm(asset.purchaseDate);
          const taxRate = short ? SHORT_TERM_RATE : LONG_TERM_RATE;
          const estTax = gainDollars > 0 ? gainDollars * taxRate : 0;
          computed.push({
            ticker: asset.ticker,
            purchasePrice: asset.purchasePrice,
            currentPrice,
            gainDollars,
            gainPct,
            isShortTerm: short,
            estTax,
          });
        }
        setRows(computed);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [assets, portfolioValue]);

  const totalGain = rows.reduce((s, r) => s + r.gainDollars, 0);
  const totalTax = rows.reduce((s, r) => s + r.estTax, 0);

  return (
    <motion.div
      initial={false}
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
            Capital Gains Estimator
          </p>
          {rows.length > 0 && (
            <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: totalGain >= 0 ? "#5cb88a" : "#e05c5c", margin: 0, lineHeight: 1 }}>
              {fmt$(totalGain)}
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6, fontFamily: "var(--font-body)" }}>
                total gain/loss
              </span>
            </p>
          )}
        </div>
        {rows.length > 0 && (
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
              Est. Tax
            </p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#e09c3c", margin: 0 }}>
              {fmt$(totalTax)}
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[90, 70, 80].map((w, i) => (
            <div
              key={i}
              style={{
                height: 13,
                width: `${w}%`,
                borderRadius: 4,
                background: "rgba(255,255,255,0.06)",
                animation: "cgePulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
          <style>{`@keyframes cgePulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
        </div>
      ) : fetchError ? (
        <div
          style={{
            padding: "16px 18px",
            background: "rgba(224,92,92,0.06)",
            border: "1px solid rgba(224,92,92,0.2)",
            borderRadius: 10,
            fontSize: 12,
            color: "#e05c5c",
          }}
        >
          Unable to load price data. Please try again later.
        </div>
      ) : noPurchasePrices ? (
        <div
          style={{
            height: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          Enter purchase prices in the sidebar to see your capital gains estimate.
        </div>
      ) : rows.length === 0 ? (
        <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
          No data available
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Ticker", "Purchase Price", "Current Price", "Gain/Loss $", "Gain/Loss %", "Term", "Est. Tax"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === "Ticker" || h === "Term" ? "left" : "right",
                      padding: "6px 10px",
                      fontSize: 9,
                      letterSpacing: 2,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      borderBottom: "1px solid var(--border-dim)",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isGain = row.gainDollars >= 0;
                const gainColor = isGain ? "#5cb88a" : "#e05c5c";
                return (
                  <tr
                    key={row.ticker}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: isGain ? "rgba(92,184,138,0.02)" : "rgba(224,92,92,0.02)",
                    }}
                  >
                    <td style={{ padding: "10px 10px", fontWeight: 600, color: "var(--text1)", textAlign: "left", whiteSpace: "nowrap" }}>
                      {row.ticker}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: "var(--text2)", whiteSpace: "nowrap" }}>
                      ${row.purchasePrice.toFixed(2)}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: "var(--text2)", whiteSpace: "nowrap" }}>
                      ${row.currentPrice.toFixed(2)}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 600, color: gainColor }}>
                      {fmt$(row.gainDollars)}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap", color: gainColor }}>
                      {isGain ? "+" : ""}{row.gainPct.toFixed(2)}%
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "left", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 1,
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: row.isShortTerm ? "rgba(224,156,60,0.12)" : "rgba(92,184,138,0.12)",
                          border: `1px solid ${row.isShortTerm ? "rgba(224,156,60,0.35)" : "rgba(92,184,138,0.35)"}`,
                          color: row.isShortTerm ? "#e09c3c" : "#5cb88a",
                        }}
                      >
                        {row.isShortTerm ? "SHORT" : "LONG"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap", color: row.estTax > 0 ? "#e09c3c" : "var(--text-muted)" }}>
                      {row.estTax > 0 ? fmt$(row.estTax) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Summary row */}
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border-dim)" }}>
                <td colSpan={3} style={{ padding: "10px 10px", fontWeight: 700, color: "var(--text-muted)", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>
                  Total
                </td>
                <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 700, color: totalGain >= 0 ? "#5cb88a" : "#e05c5c", whiteSpace: "nowrap" }}>
                  {fmt$(totalGain)}
                </td>
                <td />
                <td />
                <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 700, color: "#e09c3c", whiteSpace: "nowrap" }}>
                  {fmt$(totalTax)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 12, lineHeight: 1.5 }}>
            Estimates use {(SHORT_TERM_RATE * 100).toFixed(0)}% short-term and {(LONG_TERM_RATE * 100).toFixed(0)}% long-term capital gains rates. Not financial or tax advice.
          </p>
        </div>
      )}
    </motion.div>
  );
});

export default CapitalGainsEstimator;
