"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type EconEvent = {
  date: string;
  event: string;
  country: string;
  actual: string | null;
  estimate: string | null;
  previous: string | null;
};

const COUNTRY_LABELS: Record<string, string> = {
  US: "US",
  EU: "EU",
  EZ: "EU",
  UK: "UK",
  GB: "UK",
  JP: "JP",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr.split("T")[0] + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function EventsCalendar() {
  const [events, setEvents] = useState<EconEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/events-calendar`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: 48, borderRadius: 8, background: "var(--bg3)", animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "var(--text3)" }}>No high-impact events in the next 30 days.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {events.map((e, i) => {
        const flag = COUNTRY_LABELS[(e.country || "").toUpperCase()] || (e.country || "").toUpperCase();
        const isLast = i === events.length - 1;
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "72px 1fr auto",
              alignItems: "center",
              gap: 12,
              padding: "11px 4px",
              borderBottom: isLast ? "none" : "0.5px solid var(--border)",
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{formatDate(e.date)}</div>
              {flag && <span style={{ fontSize: 9, letterSpacing: 0.5, color: "var(--text3)", fontWeight: 600 }}>{flag}</span>}
            </div>

            <div>
              <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>{e.event}</div>
              {(e.estimate != null || e.previous != null) && (
                <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                  {e.estimate != null && (
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>
                      Est: <span style={{ color: "var(--text2)" }}>{e.estimate}</span>
                    </span>
                  )}
                  {e.previous != null && (
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>
                      Prev: <span style={{ color: "var(--text2)" }}>{e.previous}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div style={{
              padding: "3px 7px",
              borderRadius: 20,
              background: "rgba(224,92,92,0.08)",
              border: "0.5px solid rgba(224,92,92,0.3)",
              fontSize: 9,
              fontWeight: 700,
              color: "#e05c5c",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              flexShrink: 0,
            }}>
              High
            </div>
          </div>
        );
      })}
    </div>
  );
}
