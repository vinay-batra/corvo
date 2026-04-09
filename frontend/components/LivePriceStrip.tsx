"use client";

import { memo, useState, useEffect, useRef } from "react";

type PriceEntry = { price: number; change_pct: number };
type PriceMap = Record<string, PriceEntry>;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props {
  assets: { ticker: string; weight: number }[];
  active: boolean; // only fetch when analysis data exists
}

/**
 * Self-contained live price strip — owns its own state so price ticks
 * never cause the parent (AppPage) to re-render.
 */
const LivePriceStrip = memo(function LivePriceStrip({ assets, active }: Props) {
  const [prices, setPrices] = useState<PriceMap>({});
  const [flashing, setFlashing] = useState<Set<string>>(new Set());

  // Keep latest assets available inside the interval without restarting it
  const assetsRef = useRef(assets);
  useEffect(() => { assetsRef.current = assets; }, [assets]);

  const fetchPrices = useRef(async () => {
    const valid = assetsRef.current.filter(a => a.ticker && a.weight > 0);
    if (!valid.length) return;
    try {
      const r = await fetch(
        `${API_URL}/watchlist-data?tickers=${valid.map(a => a.ticker).join(",")}`
      );
      const d = await r.json();
      const map: PriceMap = {};
      (d.results || []).forEach((s: any) => {
        if (s?.ticker && s.price) map[s.ticker] = { price: s.price, change_pct: s.change_pct ?? 0 };
      });
      setPrices(prev => {
        const anyDiff = Object.keys(map).some(
          t => !prev[t] || Math.abs(prev[t].price - map[t].price) > 0.001
        );
        if (!anyDiff && Object.keys(map).length === Object.keys(prev).length) return prev;
        const changed = Object.keys(map).filter(
          t => prev[t] && Math.abs(prev[t].price - map[t].price) > 0.001
        );
        if (changed.length > 0) {
          setFlashing(new Set(changed));
          setTimeout(() => setFlashing(new Set()), 600);
        }
        return map;
      });
    } catch {}
  });

  useEffect(() => {
    if (!active) return;
    fetchPrices.current(); // immediate fetch when analysis becomes available
    const id = setInterval(() => fetchPrices.current(), 5000);
    return () => clearInterval(id);
  }, [active]); // only restart when active flips

  const tickers = Object.keys(prices);
  if (tickers.length === 0) return null;

  return (
    <div style={{ padding: "8px 14px", borderTop: "0.5px solid var(--border)" }}>
      <style>{`
        @keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)}}
        @keyframes priceFlash{0%{color:#c9a84c}100%{color:inherit}}
        .price-flash{animation:priceFlash 0.6s ease-out forwards}
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5cb88a", animation: "livePulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize: 8, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Live</span>
      </div>
      {assets.filter(a => a.ticker && prices[a.ticker]).map(a => {
        const s = prices[a.ticker];
        const pos = (s?.change_pct ?? 0) >= 0;
        const isFlashing = flashing.has(a.ticker);
        return (
          <div key={a.ticker} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--text2)" }}>
              {a.ticker}
            </span>
            <span
              className={isFlashing ? "price-flash" : undefined}
              style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: isFlashing ? "#c9a84c" : pos ? "#5cb88a" : "#e05c5c", transition: "color 0.3s" }}
            >
              ${s.price.toFixed(2)}{" "}
              <span style={{ fontSize: 9 }}>{pos ? "+" : ""}{s.change_pct.toFixed(2)}%</span>
            </span>
          </div>
        );
      })}
    </div>
  );
});

export default LivePriceStrip;
