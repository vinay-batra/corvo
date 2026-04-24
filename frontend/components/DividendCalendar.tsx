"use client";

import { memo } from "react";

const DividendCalendar = memo(function DividendCalendar(_props: { assets?: any[] }) {
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
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <circle cx="8" cy="15" r="1" fill="var(--accent)" stroke="none" />
          <circle cx="12" cy="15" r="1" fill="var(--accent)" stroke="none" />
        </svg>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Dividend Calendar</span>
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
          Track upcoming ex-dividend dates across all your holdings in a monthly calendar view, with projected income based on your position sizes.
        </p>
      </div>
    </div>
  );
});

export default DividendCalendar;
