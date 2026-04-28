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

const EVENT_EXPLANATIONS: Array<[RegExp, string]> = [
  [/fomc|federal (open market|reserve) (meeting|decision)|fed (meeting|rate decision)/i, "The Federal Reserve meets to decide whether to raise, lower, or hold interest rates. Rate changes affect borrowing costs, stock valuations, and bond prices."],
  [/interest rate decision|rate decision|monetary policy decision/i, "A central bank announces its decision on borrowing rates. This is one of the most market-moving events in finance."],
  [/core (cpi|consumer price)/i, "Inflation excluding volatile food and energy prices. The Fed watches this closely to get a cleaner read on underlying price pressures."],
  [/cpi|consumer price index/i, "Measures inflation by tracking price changes on everyday goods. Higher than expected inflation often causes markets to drop."],
  [/core (pce|personal consumption)/i, "The Federal Reserve's preferred inflation gauge, stripping out food and energy. When this runs hot, rate hikes become more likely."],
  [/pce|personal consumption expenditures/i, "The Federal Reserve's preferred measure of inflation. When PCE runs hot, the Fed is more likely to raise interest rates."],
  [/ppi|producer price index/i, "Tracks how much producers pay for raw materials and goods before they reach consumers. A leading indicator of future consumer inflation."],
  [/nonfarm payroll|non-?farm payroll|nfp/i, "Shows how many jobs were added or lost outside of farming. One of the most closely watched economic releases because strong employment drives consumer spending."],
  [/adp (employment|national employment)/i, "A private-sector estimate of job creation released before the official government report. It gives markets an early read on labor market conditions."],
  [/jolts|job openings/i, "Reports how many job openings exist across the economy. More openings than available workers signals a tight labor market, which can keep wages and inflation elevated."],
  [/initial jobless claims|weekly (unemployment|jobless) claims/i, "Counts new applications for unemployment benefits each week. A spike signals layoffs are picking up across the economy."],
  [/unemployment rate/i, "Reports the percentage of people actively looking for work but unable to find it. Rising unemployment often signals a broader economic slowdown."],
  [/gdp|gross domestic product/i, "Measures the total size of the economy. Two consecutive quarters of negative GDP growth signals a recession."],
  [/retail sales/i, "Tracks how much consumers are spending at stores. Strong retail sales signal consumer confidence and economic momentum."],
  [/ism (manufacturing|mfg)/i, "Surveys manufacturers on business conditions. A reading above 50 means the sector is expanding; below 50 means it is contracting."],
  [/ism (services|non-?manufacturing)/i, "Surveys service-sector businesses on conditions. Since services make up the majority of the US economy, this report has broad market impact."],
  [/pmi|purchasing managers/i, "A survey of business purchasing managers on economic conditions. Above 50 signals expansion; below 50 signals contraction."],
  [/consumer confidence/i, "Measures how optimistic households feel about their finances and the economy. High confidence typically leads to more spending and stronger growth."],
  [/michigan|consumer sentiment/i, "A survey measuring how consumers feel about their financial situation and the economy. Sentiment drives spending, which drives economic growth."],
  [/housing starts|building permits/i, "Tracks new home construction activity. A slowdown signals weakness in the housing market, which can ripple through the broader economy."],
  [/existing home sales/i, "Reports how many previously owned homes were sold. A leading indicator of housing market health and consumer financial confidence."],
  [/durable goods/i, "Tracks orders for long-lasting goods like machinery and appliances. A reliable leading indicator of business investment and economic momentum."],
  [/industrial production/i, "Measures output from factories, mines, and utilities. A reliable gauge of manufacturing sector health and overall economic activity."],
  [/trade balance|trade deficit/i, "The difference between what the country exports and imports. A widening deficit can weigh on economic growth and put pressure on the currency."],
  [/ecb|european central bank/i, "Europe's central bank meets to set interest rates for the eurozone. Its decisions ripple through global bond and currency markets."],
  [/boe|bank of england/i, "The UK's central bank meets to set interest rates. Its decisions affect UK assets and can influence global markets."],
  [/boj|bank of japan/i, "Japan's central bank meets to set monetary policy. As one of the world's largest economies, its decisions can move global markets."],
  [/treasury (auction|bill|note|bond)/i, "The US government sells new bonds to fund its spending. Weak demand at auctions can push interest rates higher, which affects all asset prices."],
  [/powell|fed (chair|chairman|speak)/i, "The Federal Reserve Chair speaks publicly about the economy and policy outlook. Markets move sharply on any hints about future rate changes."],
  [/inflation rate/i, "The rate at which prices across the economy are rising. Higher inflation erodes purchasing power and can prompt central banks to raise interest rates."],
  [/earnings|quarterly results/i, "Companies report their quarterly revenue and profit. Results that beat or miss expectations can move individual stock prices sharply."],
];

function getEventExplanation(eventName: string): string | null {
  for (const [pattern, explanation] of EVENT_EXPLANATIONS) {
    if (pattern.test(eventName)) return explanation;
  }
  return null;
}

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
              alignItems: "start",
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
              {(() => {
                const explanation = getEventExplanation(e.event);
                return explanation ? (
                  <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5, marginTop: 3 }}>{explanation}</div>
                ) : null;
              })()}
              {(e.estimate != null || e.previous != null) && (
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
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
              color: "var(--red)",
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
