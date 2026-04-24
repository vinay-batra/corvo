"use client";

import { memo } from "react";

const CapitalGainsEstimator = memo(function CapitalGainsEstimator(_props: {
  assets?: any[];
  portfolioValue?: number;
}) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "0.5px solid rgba(201,168,76,0.25)",
        borderRadius: 12,
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "rgba(201,168,76,0.08)",
          border: "0.5px solid rgba(201,168,76,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14l-4-4 4-4" />
          <path d="M5 10h11a4 4 0 0 1 0 8h-1" />
        </svg>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Capital Gains Estimator</span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 20,
              background: "rgba(201,168,76,0.12)",
              border: "0.5px solid rgba(201,168,76,0.35)",
              color: "var(--accent)",
            }}
          >
            Coming Soon
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.65, maxWidth: 320, margin: "0 auto" }}>
          Enter your purchase prices and dates to see realized and unrealized gains, short vs long-term classification, and estimated tax liability per holding.
        </p>
      </div>
    </div>
  );
});

export default CapitalGainsEstimator;
