"use client";

import { useEffect, useState, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type PerfSnapshot = { date: string; portfolio_value: number; cumulative_return: number };

interface MarketSummary {
  market: string;
  holdings: string;
  context: string;
  spy_pct: number;
  qqq_pct: number;
  dia_pct: number;
  vix: number;
}

interface HoldingPrice {
  ticker: string;
  price: number;
  change_pct: number;
  change_dollar: number;
}

interface Props {
  displayName: string;
  portfolioData: any;
  assets: { ticker: string; weight: number }[];
  perfHistory?: PerfSnapshot[];
  portfolioValue?: number;
}

export default function GreetingBar({
  displayName, assets,
}: Props) {
  const greeting = getGreeting();
  const name = displayName.trim() || "Investor";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const [market, setMarket] = useState<MarketSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [indexPrices, setIndexPrices] = useState<{ spy: number | null; qqq: number | null; dia: number | null }>({ spy: null, qqq: null, dia: null });
  const [holdingPrices, setHoldingPrices] = useState<HoldingPrice[]>([]);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Fetch AI market summary + index data
  useEffect(() => {
    const tickerParam = assets
      .map(a => a.ticker)
      .filter(Boolean)
      .join(",");
    const url = tickerParam
      ? `${API_URL}/market-summary?tickers=${encodeURIComponent(tickerParam)}`
      : `${API_URL}/market-summary`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setMarket(d); setSummaryLoading(false); })
      .catch(() => { setSummaryLoading(false); });
  }, [assets]);

  // Fetch index prices directly from watchlist-data
  useEffect(() => {
    const fetchIndexes = async () => {
      try {
        const r = await fetch(`${API_URL}/watchlist-data?tickers=^GSPC,^IXIC,^DJI`);
        const d = await r.json();
        const results = d.results || [];
        const spy = results.find((x: any) => x.ticker === "^GSPC");
        const qqq = results.find((x: any) => x.ticker === "^IXIC");
        const dia = results.find((x: any) => x.ticker === "^DJI");
        setIndexPrices({
          spy: spy?.change_pct ?? null,
          qqq: qqq?.change_pct ?? null,
          dia: dia?.change_pct ?? null,
        });
      } catch {}
    };
    fetchIndexes();
    const interval = setInterval(fetchIndexes, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch live holdings prices from watchlist-data
  const assetsRef = useRef(assets);
  useEffect(() => { assetsRef.current = assets; }, [assets]);

  useEffect(() => {
    const validTickers = assets
      .filter(a => a.ticker && a.weight > 0)
      .map(a => a.ticker);
    if (!validTickers.length) return;

    const fetchPrices = async () => {
      try {
        const r = await fetch(`${API_URL}/watchlist-data?tickers=${validTickers.join(",")}`);
        const d = await r.json();
        setHoldingPrices(
          (d.results || []).map((s: any) => {
            const price = s.price ?? 0;
            const change_pct = s.change_pct ?? 0;
            const change_dollar = s.change_dollar != null
              ? s.change_dollar
              : price * (change_pct / 100);
            return { ticker: s.ticker, price, change_pct, change_dollar };
          })
        );
      } catch {}
    };

    fetchPrices();
    const id = setInterval(fetchPrices, 30000);
    return () => clearInterval(id);
  }, [assets]);

  const pos = (v: number) => v >= 0;
  const fmtSign = (v: number) => (v >= 0 ? "+" : "");
  const green = "#4caf7d";
  const red = "#e05c5c";

  // Combine the three AI text fields into one flowing paragraph
  const summaryText = [market?.market, market?.holdings, market?.context]
    .filter(Boolean)
    .join(" ")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "");

  return (
    <div className="gb-root" style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 0,
      padding: "12px 24px",
      borderBottom: "0.5px solid var(--border)",
      marginBottom: 20,
    }}>
      <style>{`
        @media(max-width:768px){
          .gb-root{padding:10px 12px!important}
          .gb-divider{display:none!important}
          .gb-right{display:none!important}
        }
      `}</style>

      {/* LEFT - greeting + AI market summary paragraph */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: "var(--text)",
          letterSpacing: "-0.5px", lineHeight: 1.2, margin: 0,
        }}>
          {greeting}, {name}
        </h1>
        <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 2, marginBottom: 0, letterSpacing: "0.01em" }}>
          {dateStr}
        </p>
        {summaryLoading ? (
          <div style={{
            marginTop: 8,
            background: "var(--bg3)",
            borderRadius: 4,
            width: "80%",
            height: 14,
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
        ) : !summaryText ? (
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>Market data unavailable</p>
        ) : summaryText ? (
          <div style={{ marginTop: 6 }}>
            <p style={{
              fontSize: 13,
              color: "var(--text2)",
              lineHeight: 1.7,
              margin: 0,
              fontWeight: 300,
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: summaryExpanded ? undefined : 2,
              overflow: summaryExpanded ? undefined : "hidden",
            }}>
              {summaryText}
            </p>
            <button
              onClick={() => setSummaryExpanded(e => !e)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                marginTop: 2,
                fontSize: 11,
                color: "var(--text3)",
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              {summaryExpanded ? "less" : "more"}
            </button>
          </div>
        ) : null}
      </div>

      {/* DIVIDER */}
      <div className="gb-divider" style={{ width: 1, alignSelf: "stretch", background: "var(--border)", margin: "0 28px", flexShrink: 0 }} />

      {/* RIGHT - index pills on top, holdings price pills below */}
      <div className="gb-right" style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>

        {/* Index pills row */}
        {indexPrices.spy === null ? (
          <div style={{ display: "flex", gap: 8 }}>
            <style>{`
              @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }
            `}</style>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                width: 80, height: 52, borderRadius: 10,
                background: "var(--bg2)",
                border: "0.5px solid var(--border2)",
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <StatPill
              label="S&P 500"
              value={indexPrices.spy != null ? `${fmtSign(indexPrices.spy)}${indexPrices.spy.toFixed(2)}%` : "-"}
              color={indexPrices.spy != null ? (pos(indexPrices.spy) ? green : red) : "var(--text3)"}
            />
            <StatPill
              label="Nasdaq"
              value={indexPrices.qqq != null ? `${fmtSign(indexPrices.qqq)}${indexPrices.qqq.toFixed(2)}%` : "-"}
              color={indexPrices.qqq != null ? (pos(indexPrices.qqq) ? green : red) : "var(--text3)"}
            />
            <StatPill
              label="Dow"
              value={indexPrices.dia != null ? `${fmtSign(indexPrices.dia)}${indexPrices.dia.toFixed(2)}%` : "-"}
              color={indexPrices.dia != null ? (pos(indexPrices.dia) ? green : red) : "var(--text3)"}
            />
          </div>
        )}

        {/* Holdings price pills — static row or scrolling marquee */}
        {holdingPrices.length > 0 && (
          holdingPrices.length <= 3 ? (
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
              {holdingPrices.map(h => (
                <HoldingPill
                  key={h.ticker}
                  ticker={h.ticker}
                  price={h.price}
                  changePct={h.change_pct}
                  changeDollar={h.change_dollar}
                />
              ))}
            </div>
          ) : (
            <div style={{ overflow: "hidden", height: 32, position: "relative", width: 320 }}>
              <style>{`
                @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
              `}</style>
              <div style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: "0 8px",
                animation: "marquee 30s linear infinite",
                width: "max-content",
                height: "100%",
              }}>
                {[...holdingPrices, ...holdingPrices].map((h, idx) => (
                  <HoldingPill
                    key={`${h.ticker}-${idx}`}
                    ticker={h.ticker}
                    price={h.price}
                    changePct={h.change_pct}
                    changeDollar={h.change_dollar}
                  />
                ))}
              </div>
            </div>
          )
        )}

      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "7px 14px",
      borderRadius: 10,
      border: "0.5px solid var(--border2)",
      background: "var(--bg2)",
      minWidth: 72,
    }}>
      <span style={{
        fontSize: 10, color: "var(--text3)", fontWeight: 500,
        letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 700, color,
        fontFamily: "'Space Mono', monospace",
        letterSpacing: "-0.2px",
      }}>
        {value}
      </span>
    </div>
  );
}

function HoldingPill({ ticker, price, changePct, changeDollar }: {
  ticker: string;
  price: number;
  changePct: number;
  changeDollar: number;
}) {
  const isPos = changePct >= 0;
  const color = isPos ? "#4caf7d" : "#e05c5c";
  const bgColor = isPos ? "rgba(76,175,125,0.08)" : "rgba(224,92,92,0.08)";
  const borderColor = isPos ? "rgba(76,175,125,0.2)" : "rgba(224,92,92,0.2)";
  const sign = isPos ? "+" : "";

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "5px 10px",
      borderRadius: 8,
      background: bgColor,
      border: `0.5px solid ${borderColor}`,
      whiteSpace: "nowrap",
      fontFamily: "'Space Mono', monospace",
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", letterSpacing: "0.02em" }}>
        {ticker}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)" }}>
        ${price.toFixed(2)}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color }}>
        {sign}${Math.abs(changeDollar).toFixed(2)}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color, opacity: 0.85 }}>
        {sign}{changePct.toFixed(2)}%
      </span>
    </div>
  );
}
