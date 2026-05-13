"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { RESOLVED_API_URL } from "../lib/api";

const API_URL = RESOLVED_API_URL;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getBriefLabel(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning Brief";
  if (h < 17) return "Afternoon Brief";
  return "Evening Brief";
}

function computeMarketStatus() {
  const etStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const et = new Date(etStr);
  const h = et.getHours(), m = et.getMinutes(), dow = et.getDay();
  const mins = h * 60 + m;
  const OPEN = 9 * 60 + 30, CLOSE = 16 * 60, PRE_OPEN = 4 * 60, AH_END = 20 * 60, DAY = 24 * 60;
  const fmt = (n: number) => { const hh = Math.floor(n / 60), mm = n % 60; return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`; };
  const minsToOpen = (): number => {
    if (dow >= 1 && dow <= 5 && mins < OPEN) return OPEN - mins;
    const left = DAY - mins;
    if (dow === 5) return left + 2 * DAY + OPEN;
    if (dow === 6) return left + DAY + OPEN;
    if (dow === 0) return left + OPEN;
    return left + OPEN;
  };
  if (dow === 0 || dow === 6) return { dot: "var(--text3)", label: "Closed",      sub: `Opens Monday in ${fmt(minsToOpen())}`, isOpen: false, isPre: false };
  if (mins < PRE_OPEN)        return { dot: "var(--text3)", label: "Closed",      sub: `Opens in ${fmt(minsToOpen())}`,        isOpen: false, isPre: false };
  if (mins < OPEN)            return { dot: "var(--accent)", label: "Pre-Market", sub: `Opens in ${fmt(minsToOpen())}`,        isOpen: false, isPre: true  };
  if (mins < CLOSE)           return { dot: "#4caf7d",       label: "Market Open", sub: `Closes in ${fmt(CLOSE - mins)}`,     isOpen: true,  isPre: false };
  if (mins < AH_END)          return { dot: "var(--text3)", label: "After Hours", sub: `Opens in ${fmt(minsToOpen())}`,       isOpen: false, isPre: false };
  return                             { dot: "var(--text3)", label: "Closed",      sub: `Opens in ${fmt(minsToOpen())}`,        isOpen: false, isPre: false };
}

type PerfSnapshot = { date: string; portfolio_value: number; cumulative_return: number };
interface MarketSummary { market: string; holdings: string; context: string; outlook?: string; }
interface HoldingPrice { ticker: string; price: number | null; changePct: number | null; }

interface Props {
  displayName: string;
  portfolioData: any;
  assets: { ticker: string; weight: number }[];
  // perfHistory: daily portfolio_snapshots rows the dashboard fetches for the
  // saved portfolio, oldest first. Used here to derive yesterday's close
  // change (day-over-day) and annotate the live value with it. Once the new
  // EOD snapshot cron (backend/main.py: eod_portfolio_snapshot_loop) has been
  // running for a few days, perfHistory will be a contiguous weekday series.
  perfHistory?: PerfSnapshot[];
  portfolioValue?: number;
  hideBriefing?: boolean;
  hideTickers?: boolean;
  // Bubble today's % change up so the sidebar input can show the live
  // (base x (1 + pct/100)) portfolio value. Fires with null when no data.
  onTodayPctChange?: (pct: number | null) => void;
}

function BriefSection({ label, text, delay }: { label: string; text: string; delay: number }) {
  return (
    <motion.div initial={false} animate={{ opacity: 1 }} transition={{ delay, duration: 0.35 }}
      style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 8, letterSpacing: 2.2, textTransform: "uppercase" as const, color: "var(--accent)", fontWeight: 700 }}>
        {label}
      </span>
      <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.75, margin: 0, fontWeight: 300 }}>
        {text}
      </p>
    </motion.div>
  );
}

function IndexChip({ label, pct }: { label: string; pct: number | null }) {
  const up   = pct == null ? null : pct >= 0;
  const sign = up == null ? "" : up ? "+" : "-";
  const vCol = up == null ? "var(--text3)" : up ? "#4caf7d" : "var(--red)";
  const bg   = up == null ? "var(--bg2)"   : up ? "rgba(76,175,125,0.07)" : "rgba(224,92,92,0.07)";
  const bdr  = up == null ? "var(--border)" : up ? "rgba(76,175,125,0.22)" : "rgba(224,92,92,0.22)";
  const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontVariantNumeric: "tabular-nums" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 30, padding: "0 10px", borderRadius: 8, border: `0.5px solid ${bdr}`, background: bg, boxSizing: "border-box" as const }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "var(--text3)" }}>{label}</span>
      {pct != null
        ? <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: vCol }}>{sign}{Math.abs(pct).toFixed(2)}%</span>
        : <span style={{ ...mono, fontSize: 11, color: "var(--text3)" }}>--</span>
      }
    </div>
  );
}

function HoldingChip({ label, pct, price }: { label: string; pct: number | null; price?: number | null }) {
  const up   = pct == null ? null : pct >= 0;
  const sign = up == null ? "" : up ? "+" : "-";
  const vCol = up == null ? "var(--text3)" : up ? "#4caf7d" : "var(--red)";
  const bg   = up == null ? "var(--bg2)"   : up ? "rgba(76,175,125,0.07)" : "rgba(224,92,92,0.07)";
  const bdr  = up == null ? "var(--border)" : up ? "rgba(76,175,125,0.22)" : "rgba(224,92,92,0.22)";
  const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontVariantNumeric: "tabular-nums" };
  const fmtPrice = (v: number) => Math.abs(v) >= 1000 ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.toFixed(2);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 28, padding: "0 9px", borderRadius: 7, flexShrink: 0, border: `0.5px solid ${bdr}`, background: bg }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "var(--text3)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {price != null && <span style={{ ...mono, fontSize: 10, color: "var(--text3)" }}>${fmtPrice(price)}</span>}
        {pct != null
          ? <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: vCol }}>{sign}{Math.abs(pct).toFixed(2)}%</span>
          : <span style={{ ...mono, fontSize: 10, color: "var(--text3)" }}>--</span>
        }
      </div>
    </div>
  );
}

export default function GreetingBar({ displayName, assets, portfolioValue, perfHistory, hideBriefing, hideTickers, onTodayPctChange }: Props) {
  const [resolvedName, setResolvedName] = useState(displayName || "");
  useEffect(() => {
    if (displayName?.trim()) { setResolvedName(displayName.trim()); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || user.email?.split("@")[0] || "";
      if (name) setResolvedName(name);
    });
  }, [displayName]);

  const firstName = resolvedName.trim().split(" ")[0] || null;
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Default to collapsed: the brief is a wall of text and the Today's Signal
  // card below it should be the dashboard's main focal point. The user can
  // expand the brief via the chevron, and their preference sticks via
  // localStorage. Only an explicit "0" (user expanded) keeps it open across
  // sessions; everything else defaults to collapsed.
  //
  // Key was bumped from v1 to v2 on 2026-05-12 to force-reset all existing
  // users back to the collapsed default. Some users had inadvertently kept
  // the brief expanded across sessions and the "should start minimized"
  // intent was getting lost. v1 value is ignored.
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return true;
    try { return localStorage.getItem("corvo_brief_collapsed_v2") !== "0"; } catch { return true; }
  });
  const toggleCollapsed = () => setCollapsed(c => {
    const next = !c;
    try { localStorage.setItem("corvo_brief_collapsed_v2", next ? "1" : "0"); } catch {}
    return next;
  });

  // Privacy toggle for the live portfolio value displayed next to the
  // greeting. When on, the dollar amount and delta are replaced with bullets
  // so screenshots / over-the-shoulder reads don't leak the user's net
  // worth. Defaults to visible; persisted to localStorage `corvo_value_hidden`.
  // Shared with PortfolioBuilder (sidebar input) via a `corvo:value-hidden-
  // changed` custom event so clicking the eye in either spot masks both
  // displays at once.
  const [valueHidden, setValueHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem("corvo_value_hidden") === "1"; } catch { return false; }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      try { setValueHidden(localStorage.getItem("corvo_value_hidden") === "1"); } catch {}
    };
    window.addEventListener("corvo:value-hidden-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("corvo:value-hidden-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggleValueHidden = () => setValueHidden(h => {
    const next = !h;
    try {
      localStorage.setItem("corvo_value_hidden", next ? "1" : "0");
      window.dispatchEvent(new CustomEvent("corvo:value-hidden-changed"));
    } catch {}
    return next;
  });

  const [mkt, setMkt] = useState(() => computeMarketStatus());
  useEffect(() => { const id = setInterval(() => setMkt(computeMarketStatus()), 60000); return () => clearInterval(id); }, []);

  const [market, setMarket] = useState<MarketSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setSummaryLoading(true); setMarket(null);
    const tickerParam = assets.map(a => a.ticker).filter(Boolean).join(",");
    const url = tickerParam ? `${API_URL}/market-summary?tickers=${encodeURIComponent(tickerParam)}` : `${API_URL}/market-summary`;
    fetch(url, { signal: controller.signal }).then(r => r.json()).then(d => { setMarket(d ?? null); setSummaryLoading(false); }).catch(e => { if (e?.name !== "AbortError") setSummaryLoading(false); });
    return () => controller.abort();
  }, [assets]);

  const [indexPrices, setIndexPrices] = useState<{ spy: number | null; qqq: number | null; dia: number | null }>({ spy: null, qqq: null, dia: null });
  useEffect(() => {
    const load = async () => {
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
    load(); const id = setInterval(load, 60000); return () => clearInterval(id);
  }, []);

  const [holdingPrices, setHoldingPrices] = useState<HoldingPrice[]>([]);
  const chipsScrollRef = useRef<HTMLDivElement>(null);
  const chipsPausedRef = useRef(false);
  const chipsManualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chipsExpectedScrollRef = useRef(0);

  useEffect(() => {
    let rafId: number;
    const step = () => {
      const el = chipsScrollRef.current;
      if (el && el.scrollWidth > el.clientWidth) {
        const halfWidth = el.scrollWidth / 2;
        const actual = el.scrollLeft, expected = chipsExpectedScrollRef.current;
        if (Math.abs(actual - expected) > 1.5) {
          chipsPausedRef.current = true; chipsExpectedScrollRef.current = actual;
          if (chipsManualTimerRef.current) clearTimeout(chipsManualTimerRef.current);
          chipsManualTimerRef.current = setTimeout(() => { chipsPausedRef.current = false; }, 2000);
        } else if (!chipsPausedRef.current) {
          let next = actual + 0.5; if (next >= halfWidth) next -= halfWidth;
          el.scrollLeft = next; chipsExpectedScrollRef.current = next;
        }
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(rafId); if (chipsManualTimerRef.current) clearTimeout(chipsManualTimerRef.current); };
  }, []);

  useEffect(() => {
    const validTickers = assets.filter(a => a.ticker && a.weight > 0).map(a => a.ticker);
    if (!validTickers.length) { setHoldingPrices([]); return; }
    const load = async () => {
      try {
        const r = await fetch(`${API_URL}/watchlist-data?tickers=${validTickers.join(",")}`);
        const d = await r.json();
        setHoldingPrices((d.results || []).map((s: any) => ({
          ticker: s.ticker,
          price: s.price == null ? null : Number(s.price),
          changePct: s.change_pct == null ? null : Number(s.change_pct),
        })));
      } catch {}
    };
    load(); const id = setInterval(load, 60000); return () => clearInterval(id);
  }, [assets]);

  const portfolioToday = useMemo(() => {
    if (!holdingPrices.length) return null;
    const validAssets = assets.filter(a => a.weight > 0);
    const totalWeight = validAssets.reduce((s, a) => s + a.weight, 0);
    if (totalWeight <= 0) return null;
    let weightedPct = 0, coveredWeight = 0;
    for (const asset of validAssets) {
      const hp = holdingPrices.find(h => h.ticker === asset.ticker);
      // Only include holdings with real change data - null means yfinance didn't return it
      if (hp && hp.changePct != null) {
        weightedPct += asset.weight * hp.changePct;
        coveredWeight += asset.weight;
      }
    }
    // Need data for at least half the portfolio weight to show a meaningful number
    if (coveredWeight / totalWeight < 0.5) return null;
    const pct = weightedPct / coveredWeight;
    if (Math.abs(pct) < 0.005 && !mkt.isOpen) return null; // hide 0.00% when market closed
    const dollar = (portfolioValue ?? 0) > 0 ? ((portfolioValue as number) * pct / 100) : null;
    return { pct, dollar };
  }, [holdingPrices, assets, portfolioValue, mkt.isOpen]);

  // Bubble today's pct up to the dashboard whenever it changes, so the sidebar
  // PortfolioBuilder can show the live value.
  useEffect(() => {
    onTodayPctChange?.(portfolioToday?.pct ?? null);
  }, [portfolioToday, onTodayPctChange]);

  // Day-over-day change derived from yesterday's vs day-before's snapshot.
  // Sourced from portfolio_snapshots via the EOD cron (backend
  // eod_portfolio_snapshot_loop, writes one row per saved portfolio at 4:15
  // PM ET on weekdays). Falls back to null when fewer than 2 snapshots are
  // available (new portfolios, weekends, or the cron hasn't run yet).
  const yesterdayClosePct = useMemo<number | null>(() => {
    if (!perfHistory || perfHistory.length < 2) return null;
    const last = perfHistory[perfHistory.length - 1];
    const prev = perfHistory[perfHistory.length - 2];
    if (!last || !prev) return null;
    const lv = Number(last.portfolio_value);
    const pv = Number(prev.portfolio_value);
    if (!Number.isFinite(lv) || !Number.isFinite(pv) || pv <= 0) return null;
    return ((lv - pv) / pv) * 100;
  }, [perfHistory]);

  const validHoldingTickers = assets.filter(a => a.ticker && a.weight > 0).map(a => a.ticker);
  const baseChips = holdingPrices.length > 0
    ? holdingPrices.map(h => ({ label: h.ticker, pct: h.changePct, price: h.price }))
    : validHoldingTickers.map(t => ({ label: t, pct: null as number | null, price: null }));
  const doubledChips = [...baseChips, ...baseChips];

  const hasBriefContent = market && (market.market || market.context || market.holdings || market.outlook);

  return (
    <div className="gb-root" style={{ marginBottom: 24 }}>
      <style>{`
        @keyframes gb-pulse { 0%,100%{opacity:0.35} 50%{opacity:0.8} }
        @keyframes gb-live-pulse { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(76,175,125,0.5)} 50%{opacity:0.8;box-shadow:0 0 0 4px rgba(76,175,125,0)} }
        .gb-root { --chip-pos:#4caf7d; --chip-neg:var(--red); }

        /* Two-column content grid - collapses on small viewports */
        .gb-grid {
          display: grid;
          grid-template-columns: 1fr 1px 230px;
          gap: 0 24px;
          align-items: start;
        }
        @media(max-width:768px){
          .gb-root .gb-header { flex-wrap:wrap!important; }
          .gb-grid { grid-template-columns: 1fr !important; gap: 20px 0 !important; }
          .gb-vdiv { display:none!important; }
          .gb-port-num { font-size:22px!important; }
        }
        @media(min-width:769px) and (max-width:1100px){
          .gb-grid { grid-template-columns: 1fr 1px 200px !important; }
        }
      `}</style>

      <div style={{
        position: "relative",
        borderRadius: 14,
        border: "0.5px solid var(--border)",
        borderLeft: "2.5px solid var(--accent)",
        background: "var(--card-bg)",
        padding: "20px 24px 22px 22px",
        overflow: "hidden",
      }}>
        {/* Ambient top glow */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, background: "linear-gradient(180deg,rgba(201,168,76,0.05) 0%,transparent 100%)", pointerEvents: "none" }} />

        {/* ── Header row: label · date · market status ── */}
        <div className="gb-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 8, letterSpacing: 2.5, textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>{getBriefLabel()}</span>
            <div style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border2)", flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: "var(--text3)", letterSpacing: 0.1 }}>{dateStr}</span>
            <button
              onClick={toggleCollapsed}
              title={collapsed ? "Expand brief" : "Collapse brief"}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", color: "var(--text3)", transition: "color 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: "transform 0.25s ease", transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}>
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "var(--bg3)", border: "0.5px solid var(--border)", flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: mkt.dot, boxShadow: mkt.isOpen ? "0 0 7px rgba(76,175,125,0.65)" : mkt.isPre ? "0 0 7px rgba(201,168,76,0.5)" : "none" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text2)" }}>{mkt.label}</span>
            <span style={{ fontSize: 10, color: "var(--text3)" }}>{mkt.sub}</span>
          </div>
        </div>

        {/* ── Greeting + live portfolio value: always visible ── */}
        <div
          className="gb-greet-row"
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            margin: `0 0 ${collapsed ? 0 : 20}px`,
            transition: "margin 0.25s ease",
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: -0.5, lineHeight: 1.2 }}>
            {getGreeting()}{firstName ? `, ${firstName}` : ""}.
          </h1>
          {/* Live portfolio value - shows even when the brief is collapsed */}
          {(portfolioValue ?? 0) > 0 && (
            <div
              className="gb-live-value"
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                flexShrink: 0,
                fontFamily: "'Space Mono', monospace",
              }}
              title={
                valueHidden
                  ? "Show portfolio value"
                  : yesterdayClosePct != null
                    ? `Today's estimated portfolio value · Yesterday closed ${yesterdayClosePct >= 0 ? "+" : ""}${yesterdayClosePct.toFixed(2)}%`
                    : "Today's estimated portfolio value"
              }
            >
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "var(--text)",
                  letterSpacing: -0.5,
                  lineHeight: 1.1,
                  // Tabular bullets keep width stable so the layout doesn't
                  // jump when toggling hide/show.
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {valueHidden
                  ? "$••••••"
                  : `$${(portfolioValue! * (1 + (portfolioToday?.pct ?? 0) / 100)).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
              </span>
              {!valueHidden && (
                portfolioToday ? (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: portfolioToday.pct >= 0 ? "#4caf7d" : "var(--red)",
                      letterSpacing: 0.1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {portfolioToday.dollar != null && (
                      <>
                        {portfolioToday.dollar >= 0 ? "+" : "-"}${Math.abs(portfolioToday.dollar).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        <span style={{ color: "var(--text3)", margin: "0 6px", fontWeight: 400 }}>·</span>
                      </>
                    )}
                    {portfolioToday.pct >= 0 ? "+" : ""}{portfolioToday.pct.toFixed(2)}%
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text3)" }}>{mkt.isOpen ? "loading..." : "market closed"}</span>
                )
              )}
              {/* Privacy toggle: hide the dollar amount + delta with a single click */}
              <button
                type="button"
                onClick={toggleValueHidden}
                aria-label={valueHidden ? "Show portfolio value" : "Hide portfolio value"}
                title={valueHidden ? "Show portfolio value" : "Hide portfolio value"}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text3)",
                  padding: 4,
                  marginLeft: 2,
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 6,
                  transition: "color 0.12s, background 0.12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--bg3)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.background = "transparent"; }}
              >
                {valueHidden ? (
                  /* eye-off */
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  /* eye */
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Collapsed-state brief preview ──
            Two-line teaser pulled from market.market so the dashboard isn't
            just "Good evening, X" when the brief is closed. Clicking the
            preview expands the full brief. Hidden when there's no brief
            content (initial load, fetch error) or when the brief is already
            expanded. */}
        {collapsed && !hideBriefing && market?.market && (
          <div
            onClick={toggleCollapsed}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") toggleCollapsed(); }}
            title="Expand brief"
            style={{
              fontSize: 12.5,
              color: "var(--text3)",
              lineHeight: 1.55,
              cursor: "pointer",
              maxWidth: 720,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginTop: 6,
              marginBottom: 4,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color = "var(--text2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color = "var(--text3)"; }}
          >
            {market.market}
          </div>
        )}

        {/* ── Two-column content grid - collapses ── */}
        <div style={{ overflow: "hidden", maxHeight: collapsed ? 0 : 2000, transition: "max-height 0.35s ease", opacity: collapsed ? 0 : 1, transitionProperty: "max-height, opacity", transitionDuration: "0.35s, 0.2s" }}>
        <div className="gb-grid">

          {/* LEFT - brief sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!hideBriefing ? (
              summaryLoading ? (
                [72, 55, 88, 64, 78].map((w, i) => (
                  <div key={i} style={{ width: `${w}%`, height: 13, borderRadius: 4, background: "var(--bg3)", animation: "gb-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.12}s` }} />
                ))
              ) : hasBriefContent ? (
                <>
                  {market!.market && <BriefSection label="Markets Today" text={market!.market} delay={0} />}
                  {market!.context && (
                    <><div style={{ height: "0.5px", background: "var(--border)", opacity: 0.5 }} /><BriefSection label="What Drove It" text={market!.context} delay={0.05} /></>
                  )}
                  {market!.holdings && market!.holdings !== "No holdings provided for this user." && (
                    <><div style={{ height: "0.5px", background: "var(--border)", opacity: 0.5 }} /><BriefSection label="Your Portfolio" text={market!.holdings} delay={0.1} /></>
                  )}
                  {market!.outlook && (
                    <><div style={{ height: "0.5px", background: "var(--border)", opacity: 0.5 }} /><BriefSection label="What to Watch" text={market!.outlook} delay={0.15} /></>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 12, color: "var(--text3)", margin: 0 }}>Market data unavailable.</p>
              )
            ) : (
              <p style={{ fontSize: 12, color: "var(--text3)", margin: 0 }}>Brief hidden via customizer.</p>
            )}
          </div>

          {/* CENTER - vertical divider */}
          <div className="gb-vdiv" style={{ background: "var(--border)", height: "100%" }} />

          {/* RIGHT - market indices + holdings marquee.
              Previously also had a "Portfolio Today" block at the top with a
              30px green/red percentage and dollar delta, but that data is
              already shown next to the greeting in the always-visible
              GreetingBar header (live value + delta + privacy toggle).
              Having it again here read as duplication and the big 30px figure
              also overflowed left into the divider on narrower viewports.
              Dropped. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Market indices */}
            <div>
              <span style={{ fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 8 }}>Markets</span>
              {indexPrices.spy === null ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {[1, 2, 3].map(i => <div key={i} style={{ height: 30, borderRadius: 8, background: "var(--bg3)", animation: "gb-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />)}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <IndexChip label="S&P 500" pct={indexPrices.spy} />
                  <IndexChip label="Nasdaq"  pct={indexPrices.qqq} />
                  <IndexChip label="Dow"     pct={indexPrices.dia} />
                </div>
              )}
            </div>

            {/* Holdings marquee */}
            {!hideTickers && validHoldingTickers.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: "var(--text3)", fontWeight: 600 }}>Holdings</span>
                  {mkt.isOpen && (
                    <>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4caf7d", animation: "gb-live-pulse 2s ease-in-out infinite", flexShrink: 0 }} />
                      <span style={{ fontSize: 7, letterSpacing: 1.5, textTransform: "uppercase", color: "#4caf7d", fontWeight: 600 }}>Live</span>
                    </>
                  )}
                </div>
                <div style={{ position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 20, background: "linear-gradient(to right,var(--card-bg),transparent)", zIndex: 1, pointerEvents: "none" }} />
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 20, background: "linear-gradient(to left,var(--card-bg),transparent)", zIndex: 1, pointerEvents: "none" }} />
                  <div ref={chipsScrollRef} style={{ display: "flex", gap: 5, overflowX: "auto", flexWrap: "nowrap", scrollbarWidth: "none" as any }}
                    onMouseEnter={() => { chipsPausedRef.current = true; }}
                    onMouseLeave={() => { chipsPausedRef.current = false; }}>
                    {doubledChips.map((chip, i) => <HoldingChip key={i} label={chip.label} pct={chip.pct} price={chip.price} />)}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
        </div>{/* end collapse wrapper */}
      </div>
    </div>
  );
}
