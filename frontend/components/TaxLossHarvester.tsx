"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { fetchTaxLoss } from "../lib/api";
import { posthog } from "../lib/posthog";

interface LossEntry {
  ticker: string;
  loss_pct: number;
  loss_dollars: number;
  current_price: number;
  purchase_price: number;
  suggested_replacement: string;
  sector: string;
  reasoning: string;
}

interface TaxLossData {
  losses: LossEntry[];
  total_harvestable_loss: number;
}

const Tooltip = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block", verticalAlign: "middle" }}>
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "50%",
          width: 15,
          height: 15,
          fontSize: 9,
          color: "var(--text-muted)",
          cursor: "default",
          padding: 0,
          lineHeight: "15px",
          textAlign: "center",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="What is tax loss harvesting?"
      >
        ?
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a2030",
            border: "1px solid rgba(201,168,76,0.2)",
            borderRadius: 8,
            padding: "10px 14px",
            width: 260,
            fontSize: 11,
            color: "var(--text2)",
            lineHeight: 1.55,
            zIndex: 99,
            pointerEvents: "none",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <strong style={{ color: "#c9a84c", display: "block", marginBottom: 4 }}>Tax Loss Harvesting</strong>
          Selling a position at a loss to offset capital gains taxes, then immediately buying a similar (but not identical)
          investment to maintain market exposure. The IRS wash-sale rule disallows the loss if you repurchase the same security
          within 30 days before or after the sale.
        </div>
      )}
    </span>
  );
};

const TaxLossHarvester = memo(function TaxLossHarvester({ assets }: { assets: any[] }) {
  const [data, setData] = useState<TaxLossData | null>(null);
  const [loading, setLoading] = useState(false);
  const [noPurchasePrices, setNoPurchasePrices] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (!viewTracked.current) {
      posthog.capture("tax_loss_card_viewed");
      viewTracked.current = true;
    }
  }, []);

  useEffect(() => {
    if (!assets.length) return;
    const hasPrices = assets.some(a => a.purchasePrice != null && a.purchasePrice > 0);
    if (!hasPrices) {
      setNoPurchasePrices(true);
      setData(null);
      return;
    }
    setNoPurchasePrices(false);
    setFetchError(false);
    setLoading(true);
    fetchTaxLoss(assets, 10000)
      .then((res) => setData(res ?? null))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [assets]);

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
          <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            Tax Loss Harvesting
            <Tooltip text="" />
          </p>
          {data && data.losses.length > 0 && (
            <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "#e05c5c", margin: 0, lineHeight: 1 }}>
              {data.total_harvestable_loss < 0
                ? `-$${Math.abs(data.total_harvestable_loss).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `$${data.total_harvestable_loss.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6, fontFamily: "var(--font-body)" }}>
                harvestable loss / $10k
              </span>
            </p>
          )}
          {data && data.losses.length === 0 && !loading && (
            <p style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#5cb88a", margin: 0, lineHeight: 1 }}>
              No loss harvesting opportunities
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[90, 70, 80].map((w, i) => (
            <div key={i} style={{ height: 13, width: `${w}%`, borderRadius: 4, background: "rgba(255,255,255,0.06)", animation: "tlhPulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
          ))}
          <style>{`@keyframes tlhPulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
        </div>
      ) : fetchError ? (
        <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
          <p style={{ color: "rgba(224,92,92,0.8)" }}>Unable to load data — server may be temporarily unavailable.</p>
        </div>
      ) : noPurchasePrices ? (
        <div
          style={{
            height: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 6,
            color: "var(--text-muted)",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          <span>Enter purchase prices in the sidebar to see tax loss harvesting opportunities.</span>
        </div>
      ) : data && data.losses.length === 0 ? (
        <div
          style={{
            padding: "16px 18px",
            background: "rgba(92,184,138,0.06)",
            border: "1px solid rgba(92,184,138,0.2)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16 }}>✓</span>
          <p style={{ fontSize: 12, color: "#5cb88a", margin: 0 }}>
            All holdings with purchase prices are currently at a gain. No losses to harvest.
          </p>
        </div>
      ) : data && data.losses.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Ticker", "Purchase Price", "Current Price", "Unrealized Loss", "Suggested Replacement", "AI Reasoning"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === "Ticker" || h === "AI Reasoning" ? "left" : "right",
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
              {data.losses.map((entry) => (
                <tr
                  key={entry.ticker}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: "rgba(224,92,92,0.03)",
                  }}
                >
                  <td style={{ padding: "10px 10px", fontWeight: 600, color: "var(--text1)", textAlign: "left", whiteSpace: "nowrap" }}>
                    {entry.ticker}
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "right", color: "var(--text2)", whiteSpace: "nowrap" }}>
                    ${entry.purchase_price.toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "right", color: "var(--text2)", whiteSpace: "nowrap" }}>
                    ${entry.current_price.toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <span style={{ color: "#e05c5c", fontWeight: 600 }}>
                      {entry.loss_pct.toFixed(2)}%
                    </span>
                    <span style={{ display: "block", fontSize: 10, color: "rgba(224,92,92,0.7)" }}>
                      -${Math.abs(entry.loss_dollars).toFixed(2)}
                    </span>
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#c9a84c",
                        background: "rgba(201,168,76,0.1)",
                        border: "1px solid rgba(201,168,76,0.25)",
                        borderRadius: 4,
                        padding: "2px 7px",
                      }}
                    >
                      {entry.suggested_replacement}
                    </span>
                    <span style={{ display: "block", fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                      {entry.sector}
                    </span>
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "left", color: "var(--text2)", fontSize: 11, lineHeight: 1.5, maxWidth: 300 }}>
                    {entry.reasoning}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
          No data available
        </div>
      )}
    </motion.div>
  );
});

export default TaxLossHarvester;
