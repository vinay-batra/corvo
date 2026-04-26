"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AMBER = "#b8860b";
const GREEN = "#4caf7d";
const RED   = "#e05c5c";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function computeMarketStatus() {
  const etStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const et = new Date(etStr);
  const h = et.getHours();
  const m = et.getMinutes();
  const dow = et.getDay();
  const mins = h * 60 + m;
  const OPEN = 9 * 60 + 30;
  const CLOSE = 16 * 60;
  const fmt = (n: number) => {
    const hh = Math.floor(n / 60);
    const mm = n % 60;
    return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
  };
  const time = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " ET";
  if (dow === 0 || dow === 6) return { dot: "#666", label: "Closed · Opens Mon 9:30 AM ET", time };
  if (mins < OPEN) return { dot: AMBER, label: `Pre-Market · Opens in ${fmt(OPEN - mins)}`, time };
  if (mins < CLOSE) return { dot: GREEN, label: `Open · Closes in ${fmt(CLOSE - mins)}`, time };
  return { dot: "#666", label: `After Hours`, time };
}

type PerfSnapshot = { date: string; portfolio_value: number; cumulative_return: number };

interface MarketSummary {
  market: string;
  holdings: string;
  context: string;
  outlook?: string;
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

export default function GreetingBar({ displayName, assets }: Props) {
  const greeting = getGreeting();

  const [resolvedName, setResolvedName] = useState(displayName || "");
  const [briefingCollapsed, setBriefingCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("corvo_briefing_collapsed") === "true") setBriefingCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (displayName?.trim()) { setResolvedName(displayName.trim()); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      console.log("[GreetingBar] full user object:", user);
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "";
      if (name) setResolvedName(name);
    });
  }, [displayName]);

  const firstName = resolvedName.trim().split(" ")[0] || "there";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const [mkt, setMkt] = useState(() => computeMarketStatus());
  useEffect(() => {
    const id = setInterval(() => setMkt(computeMarketStatus()), 30000);
    return () => clearInterval(id);
  }, []);

  const [market, setMarket] = useState<MarketSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [indexPrices, setIndexPrices] = useState<{ spy: number | null; qqq: number | null; dia: number | null }>({ spy: null, qqq: null, dia: null });
  const [holdingPrices, setHoldingPrices] = useState<HoldingPrice[]>([]);

  // Fetch AI market summary + index data
  useEffect(() => {
    const tickerParam = assets.map(a => a.ticker).filter(Boolean).join(",");
    const url = tickerParam
      ? `${API_URL}/market-summary?tickers=${encodeURIComponent(tickerParam)}`
      : `${API_URL}/market-summary`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setMarket(d); setSummaryLoading(false); })
      .catch(() => { setSummaryLoading(false); });
  }, [assets]);

  // Fetch index prices
  useEffect(() => {
    const fetchIndexes = async () => {
      try {
        const r = await fetch(`${API_URL}/watchlist-data?tickers=^GSPC,^IXIC,^DJI`);
        const d = await r.json();
        const results = d.results || [];
        const spy = results.find((x: any) => x.ticker === "^GSPC");
        const qqq = results.find((x: any) => x.ticker === "^IXIC");
        const dia = results.find((x: any) => x.ticker === "^DJI");
        setIndexPrices({ spy: spy?.change_pct ?? null, qqq: qqq?.change_pct ?? null, dia: dia?.change_pct ?? null });
      } catch {}
    };
    fetchIndexes();
    const interval = setInterval(fetchIndexes, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch live holdings prices
  const assetsRef = useRef(assets);
  useEffect(() => { assetsRef.current = assets; }, [assets]);

  useEffect(() => {
    const validTickers = assets.filter(a => a.ticker && a.weight > 0).map(a => a.ticker);
    if (!validTickers.length) return;
    const fetchPrices = async () => {
      try {
        const r = await fetch(`${API_URL}/watchlist-data?tickers=${validTickers.join(",")}`);
        const d = await r.json();
        setHoldingPrices(
          (d.results || []).map((s: any) => {
            const price = s.price ?? 0;
            const change_pct = s.change_pct ?? 0;
            const change_dollar = s.change_dollar != null ? s.change_dollar : price * (change_pct / 100);
            return { ticker: s.ticker, price, change_pct, change_dollar };
          })
        );
      } catch {}
    };
    fetchPrices();
    const id = setInterval(fetchPrices, 30000);
    return () => clearInterval(id);
  }, [assets]);

  const toggleBriefing = () => {
    setBriefingCollapsed(c => {
      const next = !c;
      try { localStorage.setItem("corvo_briefing_collapsed", String(next)); } catch {}
      return next;
    });
  };

  const pos = (v: number) => v >= 0;
  const fmtSign = (v: number) => (v >= 0 ? "+" : "");

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
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
        @media(max-width:768px){
          .gb-root{padding:10px 12px!important;flex-direction:column!important;gap:10px!important}
          .gb-divider{display:none!important}
          .gb-right{align-items:flex-start!important;width:100%!important}
          .gb-marquee{width:100%!important}
        }
      `}</style>

      {/* LEFT — greeting, date, market status, briefing sections */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px", lineHeight: 1.2, margin: 0 }}>
          {greeting}, {firstName}
        </h1>

        {/* Date line */}
        <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 2, marginBottom: 0, letterSpacing: "0.01em" }}>
          {dateStr}
        </p>

        {/* ET time + market status pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "var(--text3)" }}>{mkt.time}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 20, background: "var(--bg3)", border: "0.5px solid var(--border)", flexShrink: 0 }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%", background: mkt.dot, flexShrink: 0,
              boxShadow: mkt.dot === GREEN ? "0 0 4px rgba(76,175,125,0.5)" : "none",
            }} />
            <span style={{ fontSize: 10, color: "var(--text2)", whiteSpace: "nowrap" }}>{mkt.label}</span>
          </div>
        </div>

        {/* Briefing header with collapse toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <span style={{ fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>Morning Brief</span>
          <button
            onClick={toggleBriefing}
            title={briefingCollapsed ? "Show briefing" : "Hide briefing"}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--text3)", display: "flex", alignItems: "center", gap: 3, fontSize: 10, letterSpacing: 0.5 }}
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: "transform 0.2s", transform: briefingCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Briefing sections */}
        {!briefingCollapsed && (summaryLoading ? (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {[80, 65, 90].map((w, i) => (
              <div key={i} style={{ width: `${w}%`, height: 13, borderRadius: 4, background: "var(--bg3)", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : market ? (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Market summary — no label */}
            {market.market && (
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0, fontWeight: 300 }}>
                {market.market}
              </p>
            )}
            {/* WHY IT MOVED */}
            {market.context && (
              <>
                <div style={{ height: "0.5px", background: "var(--border)", opacity: 0.6 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>Why It Moved</span>
                  <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{market.context}</p>
                </div>
              </>
            )}
            {/* YOUR PORTFOLIO */}
            {market.holdings && market.holdings !== "No holdings provided for this user." && (
              <>
                <div style={{ height: "0.5px", background: "var(--border)", opacity: 0.6 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>Your Portfolio</span>
                  <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{market.holdings}</p>
                </div>
              </>
            )}
            {/* WHAT TO WATCH */}
            {market.outlook && (
              <>
                <div style={{ height: "0.5px", background: "var(--border)", opacity: 0.6 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>What to Watch</span>
                  <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{market.outlook}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>Market data unavailable</p>
        ))}
      </div>

      {/* DIVIDER */}
      <div className="gb-divider" style={{ width: 1, alignSelf: "stretch", background: "var(--border)", margin: "0 28px", flexShrink: 0 }} />

      {/* RIGHT — index pills + holdings */}
      <div className="gb-right" style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>

        {/* Index pills */}
        {indexPrices.spy === null ? (
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ width: 80, height: 52, borderRadius: 10, background: "var(--bg2)", border: "0.5px solid var(--border2)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <StatPill label="S&P 500" value={indexPrices.spy != null ? `${fmtSign(indexPrices.spy)}${indexPrices.spy.toFixed(2)}%` : "-"} color={indexPrices.spy != null ? (pos(indexPrices.spy) ? GREEN : RED) : "var(--text3)"} />
            <StatPill label="Nasdaq"  value={indexPrices.qqq != null ? `${fmtSign(indexPrices.qqq)}${indexPrices.qqq.toFixed(2)}%` : "-"} color={indexPrices.qqq != null ? (pos(indexPrices.qqq) ? GREEN : RED) : "var(--text3)"} />
            <StatPill label="Dow"     value={indexPrices.dia != null ? `${fmtSign(indexPrices.dia)}${indexPrices.dia.toFixed(2)}%` : "-"} color={indexPrices.dia != null ? (pos(indexPrices.dia) ? GREEN : RED) : "var(--text3)"} />
          </div>
        )}

        {/* Holdings price pills */}
        {holdingPrices.length > 0 && (
          holdingPrices.length <= 3 ? (
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
              {holdingPrices.map(h => (
                <HoldingPill key={h.ticker} ticker={h.ticker} price={h.price} changePct={h.change_pct} changeDollar={h.change_dollar} />
              ))}
            </div>
          ) : (
            <div className="gb-marquee" style={{ overflow: "hidden", height: 32, position: "relative", width: 320 }}>
              <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12, padding: "0 8px", animation: "marquee 30s linear infinite", width: "max-content", height: "100%" }}>
                {[...holdingPrices, ...holdingPrices].map((h, idx) => (
                  <HoldingPill key={`${h.ticker}-${idx}`} ticker={h.ticker} price={h.price} changePct={h.change_pct} changeDollar={h.change_dollar} />
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "7px 14px", borderRadius: 10, border: "0.5px solid var(--border2)", background: "var(--bg2)", minWidth: 72 }}>
      <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "'Space Mono', monospace", letterSpacing: "-0.2px" }}>{value}</span>
    </div>
  );
}

function HoldingPill({ ticker, price, changePct, changeDollar }: { ticker: string; price: number; changePct: number; changeDollar: number }) {
  const isPos = changePct >= 0;
  const color = isPos ? GREEN : RED;
  const sign = isPos ? "+" : "";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, background: isPos ? "rgba(76,175,125,0.08)" : "rgba(224,92,92,0.08)", border: `0.5px solid ${isPos ? "rgba(76,175,125,0.2)" : "rgba(224,92,92,0.2)"}`, whiteSpace: "nowrap", fontFamily: "'Space Mono', monospace" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", letterSpacing: "0.02em" }}>{ticker}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)" }}>${price.toFixed(2)}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color }}>{sign}${Math.abs(changeDollar).toFixed(2)}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color, opacity: 0.85 }}>{sign}{changePct.toFixed(2)}%</span>
    </div>
  );
}
