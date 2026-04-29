"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getBriefingTitle(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning Brief";
  if (h < 17) return "Afternoon Brief";
  return "Evening Brief";
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
  if (dow === 0 || dow === 6) return { dot: "var(--text3)",  label: "Closed · Opens Mon 9:30 AM ET", time, glow: false };
  if (mins < OPEN)            return { dot: "var(--accent)", label: `Pre-Market · Opens in ${fmt(OPEN - mins)}`, time, glow: false };
  if (mins < CLOSE)           return { dot: "var(--chip-pos)", label: `Open · Closes in ${fmt(CLOSE - mins)}`, time, glow: true };
  return                             { dot: "var(--text3)",  label: "After Hours", time, glow: false };
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
  changePct: number;
  changeDollar: number;
}

interface Props {
  displayName: string;
  portfolioData: any;
  assets: { ticker: string; weight: number }[];
  perfHistory?: PerfSnapshot[];
  portfolioValue?: number;
}

export default function GreetingBar({ displayName, assets, portfolioValue }: Props) {
  const greeting = getGreeting();

  const [resolvedName, setResolvedName] = useState(displayName || "");
  const [briefingCollapsed, setBriefingCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem("corvo_briefing_collapsed") === "true"; } catch { return false; }
  });
  const briefingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (displayName?.trim()) { setResolvedName(displayName.trim()); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "";
      if (name) setResolvedName(name);
    });
  }, [displayName]);

  const firstName = resolvedName.trim().split(" ")[0] || null;
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

  useEffect(() => {
    const controller = new AbortController();
    setSummaryLoading(true);
    setMarket(null);
    const tickerParam = assets.map(a => a.ticker).filter(Boolean).join(",");
    const url = tickerParam
      ? `${API_URL}/market-summary?tickers=${encodeURIComponent(tickerParam)}`
      : `${API_URL}/market-summary`;
    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(d => { setMarket(d ?? null); setSummaryLoading(false); })
      .catch(e => { if (e?.name !== "AbortError") setSummaryLoading(false); });
    return () => controller.abort();
  }, [assets]);

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

  const toggleBriefing = () => {
    setBriefingCollapsed(c => {
      const next = !c;
      try { localStorage.setItem("corvo_briefing_collapsed", String(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("section") === "briefing") {
      setBriefingCollapsed(false);
      setTimeout(() => {
        briefingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    }
  }, []);

  const [holdingPrices, setHoldingPrices] = useState<HoldingPrice[]>([]);
  const assetsRef = useRef(assets);
  useEffect(() => { assetsRef.current = assets; }, [assets]);
  useEffect(() => {
    const validTickers = assets.filter(a => a.ticker && a.weight > 0).map(a => a.ticker);
    if (!validTickers.length) { setHoldingPrices([]); return; }
    const fetchPrices = async () => {
      try {
        const r = await fetch(`${API_URL}/watchlist-data?tickers=${validTickers.join(",")}`);
        const d = await r.json();
        setHoldingPrices(
          (d.results || []).map((s: any) => {
            const price = s.price ?? 0;
            const changePct = s.change_pct ?? 0;
            const changeDollar = s.change_dollar != null ? s.change_dollar : price * (changePct / 100);
            return { ticker: s.ticker, price, changePct, changeDollar };
          })
        );
      } catch {}
    };
    fetchPrices();
    const id = setInterval(fetchPrices, 60000);
    return () => clearInterval(id);
  }, [assets]);

  const portfolioToday = useMemo(() => {
    if (!holdingPrices.length) return null;
    const validAssets = assets.filter(a => a.weight > 0);
    const totalWeight = validAssets.reduce((s, a) => s + a.weight, 0);
    if (totalWeight <= 0) return null;
    let weightedPct = 0, coveredWeight = 0;
    for (const asset of validAssets) {
      const hp = holdingPrices.find(h => h.ticker === asset.ticker);
      if (hp) {
        weightedPct += asset.weight * hp.changePct;
        coveredWeight += asset.weight;
      }
    }
    if (coveredWeight / totalWeight < 0.5) return null;
    const pct = weightedPct / totalWeight;
    const dollar = (portfolioValue ?? 0) > 0 ? ((portfolioValue as number) * pct / 100) : null;
    return { pct, dollar };
  }, [holdingPrices, assets, portfolioValue]);

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
        /* Scoped color tokens — positive/negative tints for market chips */
        .gb-root {
          --chip-pos:        #4caf7d;
          --chip-neg:        var(--red);
          --chip-pos-bg:     rgba(76, 175, 125, 0.07);
          --chip-neg-bg:     rgba(224,  92,  92, 0.07);
          --chip-pos-border: rgba(76, 175, 125, 0.22);
          --chip-neg-border: rgba(224,  92,  92, 0.22);
          --chip-pos-glow:   rgba(76, 175, 125, 0.50);
        }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
        @keyframes gb-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @media(max-width:768px){
          .gb-root{padding:10px 12px!important;flex-direction:column!important;gap:10px!important}
          .gb-divider{display:none!important}
          .gb-right{align-items:flex-start!important;width:100%!important}
          .gb-marquee-wrap{width:100%!important}
        }
      `}</style>

      {/* LEFT — greeting, date, market status, briefing */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px", lineHeight: 1.2, margin: 0 }}>
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>

        <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 2, marginBottom: 0, letterSpacing: "0.01em" }}>
          {dateStr}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "var(--text3)" }}>{mkt.time}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 20, background: "var(--bg3)", border: "0.5px solid var(--border)", flexShrink: 0 }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%", background: mkt.dot, flexShrink: 0,
              boxShadow: mkt.glow ? "0 0 4px var(--chip-pos-glow)" : "none",
            }} />
            <span style={{ fontSize: 10, color: "var(--text2)", whiteSpace: "nowrap" }}>{mkt.label}</span>
          </div>
        </div>

        <div ref={briefingRef} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <span style={{ fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>{getBriefingTitle()}</span>
          <button
            onClick={toggleBriefing}
            title={briefingCollapsed ? "Show briefing" : "Hide briefing"}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--text3)", display: "flex", alignItems: "center", gap: 3, fontSize: 10, letterSpacing: 0.5 }}
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: "transform 0.2s", transform: briefingCollapsed ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        <motion.div
          // initial={false} is required — do not remove
          initial={false}
          animate={{ height: briefingCollapsed ? "auto" : 0, opacity: briefingCollapsed ? 1 : 0 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          style={{ overflow: "hidden" }}
        >
          {summaryLoading ? (
            <p style={{ fontSize: 12, color: "var(--text2)", margin: "6px 0 0", fontWeight: 300 }}>Market data loading...</p>
          ) : market?.market ? (
            <p style={{ fontSize: 12, color: "var(--text3)", margin: "6px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", fontWeight: 300, lineHeight: 1.5 }}>
              {market.market.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? market.market.split(" ").slice(0, 15).join(" ")}
            </p>
          ) : null}
        </motion.div>

        <motion.div
          // initial={false} is required — do not remove
          initial={false}
          animate={{ height: briefingCollapsed ? 0 : "auto", opacity: briefingCollapsed ? 0 : 1 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          style={{ overflow: "hidden" }}
        >
          {summaryLoading ? (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {[80, 65, 90].map((w, i) => (
                <div key={i} style={{ width: `${w}%`, height: 13, borderRadius: 4, background: "var(--bg3)", animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          ) : market ? (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
              {market.market && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>Markets Today</span>
                  <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{market.market}</p>
                </div>
              )}
              {market.context && (
                <>
                  <div style={{ height: "0.5px", background: "var(--border)", opacity: 0.6 }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>What Drove It</span>
                    <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{market.context}</p>
                  </div>
                </>
              )}
              {market.holdings && market.holdings !== "No holdings provided for this user." && (
                <>
                  <div style={{ height: "0.5px", background: "var(--border)", opacity: 0.6 }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>Your Portfolio</span>
                    <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{market.holdings}</p>
                  </div>
                </>
              )}
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
          )}
        </motion.div>
      </div>

      {/* DIVIDER */}
      <div className="gb-divider" style={{ width: 1, alignSelf: "stretch", background: "var(--border)", margin: "0 28px", flexShrink: 0 }} />

      {/* RIGHT — market chips + holdings scroll */}
      <div className="gb-right" style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>

        {/* Index + portfolio chips — unified row */}
        {indexPrices.spy === null ? (
          <div style={{ display: "flex", gap: 6 }}>
            {[88, 76, 60, 96].map((w, i) => (
              <div key={i} style={{
                width: w, height: 32, borderRadius: 8,
                background: "var(--bg2)", border: "0.5px solid var(--border)",
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <MarketChip label="S&P 500"   pct={indexPrices.spy} />
            <MarketChip label="Nasdaq"    pct={indexPrices.qqq} />
            <MarketChip label="Dow"       pct={indexPrices.dia} />
            {portfolioToday && (
              <MarketChip label="Portfolio" pct={portfolioToday.pct} dollar={portfolioToday.dollar} />
            )}
          </div>
        )}

        {/* Holdings ticker scroll */}
        {(() => {
          const validTickers = assets.filter(a => a.ticker && a.weight > 0).map(a => a.ticker);
          if (!validTickers.length) return null;
          const chips = holdingPrices.length > 0
            ? holdingPrices.map(h => ({ ticker: h.ticker, price: h.price, pct: h.changePct }))
            : validTickers.map(t => ({ ticker: t, price: null, pct: null }));
          const isFew = chips.length <= 4;
          return (
            <div className="gb-marquee-wrap" style={{ overflow: "hidden", maxWidth: 380 }}>
              {isFew ? (
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  {chips.map(p => (
                    <MarketChip key={p.ticker} label={p.ticker} pct={p.pct} price={p.price} />
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, animation: "gb-marquee 28s linear infinite", width: "max-content" }}>
                  {[...chips, ...chips].map((p, idx) => (
                    <MarketChip key={`${p.ticker}-${idx}`} label={p.ticker} pct={p.pct} price={p.price} />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

      </div>
    </div>
  );
}

function MarketChip({
  label,
  pct,
  dollar,
  price,
}: {
  label: string;
  pct: number | null;
  dollar?: number | null;
  price?: number | null;
}) {
  const up    = pct == null ? null : pct >= 0;
  const sign  = up == null ? "" : up ? "+" : "-";
  const vCol  = up == null ? "var(--text3)"          : up ? "var(--chip-pos)"        : "var(--chip-neg)";
  const bg    = up == null ? "var(--bg2)"             : up ? "var(--chip-pos-bg)"     : "var(--chip-neg-bg)";
  const bdr   = up == null ? "var(--border)"           : up ? "var(--chip-pos-border)" : "var(--chip-neg-border)";
  const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontVariantNumeric: "tabular-nums" as const };

  const fmtAbs = (v: number) => {
    const a = Math.abs(v);
    return a >= 1000
      ? a.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : a.toFixed(2);
  };

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      height: 32, padding: "0 10px", borderRadius: 8, flexShrink: 0,
      border: `0.5px solid ${bdr}`,
      background: bg,
    }}>
      {/* Label — always left, uppercase, muted */}
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.05em",
        textTransform: "uppercase", color: "var(--text3)", flexShrink: 0,
        fontFamily: "var(--font-body)",
      }}>
        {label}
      </span>

      {/* Values — always right, Space Mono */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {price != null && (
          <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>
            ${fmtAbs(price)}
          </span>
        )}
        {dollar != null && (
          <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: vCol }}>
            {sign}${fmtAbs(dollar)}
          </span>
        )}
        {pct != null ? (
          <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: vCol }}>
            {sign}{Math.abs(pct).toFixed(2)}%
          </span>
        ) : (
          <span style={{ ...mono, fontSize: 11, color: "var(--text3)" }}>-</span>
        )}
      </div>
    </div>
  );
}
