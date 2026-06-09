"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { RESOLVED_API_URL } from "../lib/api";
import { useVisibilityInterval } from "../hooks/useVisibilityInterval";
import { type AccountTypeId, getAccountType, DEFAULT_ACCOUNT_TYPE } from "../lib/accountType";

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
  // Derive the ET wall-clock parts directly via Intl instead of round-tripping
  // through `new Date(localeString)` (which re-parses in the BROWSER's zone and
  // can land on the wrong weekday near midnight ET for far-offset users).
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  const DOW_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const h = Number(get("hour")) % 24; // Intl can emit "24" at midnight
  const m = Number(get("minute"));
  const dow = DOW_MAP[get("weekday")] ?? 0;
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
interface MarketSummary {
  market: string;
  holdings: string;
  context: string;
  outlook?: string;
  // Date context for the brief. Backend marks `is_stale` true whenever the
  // market is currently closed AND the brief reflects a past calendar day
  // (pre-market on a weekday, weekend, holiday). When stale, the frontend
  // surfaces a prominent "AS OF FRI · UPDATES MON 9:30 AM ET" line so the
  // user doesn't mistake yesterday's brief for live data. When live (during
  // RTH), the same line shows a quieter "LIVE · UPDATES THROUGHOUT THE
  // TRADING DAY" instead. All three label fields may be empty strings on a
  // pre-deploy backend - the renderer treats that as "skip the banner".
  as_of_label?: string;
  as_of_iso?: string;
  next_update_label?: string;
  is_stale?: boolean;
  // Unix timestamp (seconds) of when this brief was generated on the server.
  // Used by BriefAsOfPill to show "Live now · 11:01 AM ET" with the time
  // the data was actually collected, not the client's current render time.
  ts?: number;
  // Per-holding 1-day % change keyed by ticker, computed server-side with the
  // same fast_info method /watchlist-data uses. The brief text quotes these,
  // and the holding pills now display these too, so the two never contradict.
  holdings_pct?: Record<string, number>;
}
interface HoldingPrice { ticker: string; price: number | null; changePct: number | null; sparkline: number[]; }
interface IndexPrice { label: string; ticker: string; price: number | null; changePct: number | null; sparkline: number[]; }

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
  // When true, portfolioValue is the already-tracked live value (anchor-based),
  // so display it as-is rather than multiplying by today's % on top.
  valueIsLive?: boolean;
  hideBriefing?: boolean;
  hideTickers?: boolean;
  // Bubble today's % change up so the sidebar input can show the live
  // (base x (1 + pct/100)) portfolio value. Fires with null when no data.
  onTodayPctChange?: (pct: number | null) => void;
  // Account type for the currently-loaded portfolio. Rendered as a small
  // gold pill next to the live value so the user always knows which tax
  // lens the AI is reasoning through (Roth IRA, HSA, etc.). When omitted
  // or set to the default (taxable_brokerage), the pill still renders so
  // the visual is consistent across every portfolio.
  accountType?: AccountTypeId;
}

// Small "AS OF X · UPDATES Y" line that sits above the brief. The default
// briefing experience is collapsed (just a 2-line teaser), and the cached
// content is from the LAST trading session whenever the market is currently
// closed - so on a Saturday morning, the brief reads as if it were live,
// when it's really Friday's close. Now: every brief carries an explicit
// date pill. Gold-tinted + obvious when stale (market currently closed and
// the brief is from a previous calendar day), dim and informational when
// the data is live. Returns null when the backend hasn't shipped the new
// fields yet (so the pill silently no-ops on older deployments).
function BriefAsOfPill({ asOfLabel, nextUpdateLabel, isStale, briefTs }: { asOfLabel?: string; nextUpdateLabel?: string; isStale?: boolean; briefTs?: number }) {
  if (!asOfLabel) return null;
  const stale = !!isStale;
  // Strip a leading "Updates " on the backend label so we don't render
  // "Updates Updates throughout the trading day" - the live-state copy
  // historically wrote a full sentence into that field and the prefix is
  // re-added below for the stale path. Safe defensive trim either way.
  const nextClean = (nextUpdateLabel || "").replace(/^updates\s+/i, "").trim();
  return (
    <div
      role="note"
      aria-label={stale ? `Brief is from ${asOfLabel}.${nextClean ? ` Updates ${nextClean}.` : ""}` : "Brief updates every 5 minutes during market hours."}
      style={{
        // alignSelf so the pill stays content-sized inside flex-column
        // parents (otherwise it stretches to 100% width because flex
        // children default to align-items: stretch on the cross axis).
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontFamily: "'Space Mono', monospace",
        fontSize: 9.5,
        letterSpacing: 1.4,
        textTransform: "uppercase",
        fontWeight: 700,
        padding: "4px 9px",
        borderRadius: 5,
        background: stale ? "rgba(201,168,76,0.1)" : "rgba(76,175,125,0.08)",
        border: `0.5px solid ${stale ? "rgba(201,168,76,0.32)" : "rgba(76,175,125,0.25)"}`,
        color: stale ? "var(--accent)" : "#4caf7d",
        whiteSpace: "nowrap",
        marginBottom: 8,
      }}
    >
      {stale ? (
        <>
          <span aria-hidden style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 6px rgba(201,168,76,0.6)", flexShrink: 0 }} />
          <span>As of {asOfLabel}</span>
          {nextClean && (
            <>
              <span aria-hidden style={{ color: "var(--text3)", letterSpacing: 0 }}>·</span>
              <span style={{ color: "var(--accent)" }}>Updates {nextClean}</span>
            </>
          )}
        </>
      ) : (
        <>
          <span aria-hidden style={{ width: 5, height: 5, borderRadius: "50%", background: "#4caf7d", animation: "gb-live-pulse 2s ease-in-out infinite", flexShrink: 0 }} />
          <span>As of {(briefTs ? new Date(briefTs * 1000) : new Date()).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true })} ET</span>
          <span aria-hidden style={{ color: "var(--text3)", letterSpacing: 0 }}>·</span>
          <span>Updates every 5 min</span>
        </>
      )}
    </div>
  );
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

// Tiny SVG sparkline. Renders a polyline of `data` normalized to the viewBox.
// `pct` drives the color so the line matches today's percent-change pill on
// the same card. The sparkline data is the last 7 daily closes (a different
// time window than today's pct), so coloring it from first-vs-last of the
// data array used to produce mismatched cards: green 7-day trend with a red
// -1.24% today, etc. Reading color from `pct` instead keeps the card visually
// coherent at a glance. The line shape still shows the 7-day trend.
// Returns an invisible-but-present <svg> for too-short series so the layout
// doesn't jump when data arrives.
function Sparkline({ data, pct, width = 36, height = 18 }: { data: number[]; pct: number | null; width?: number; height?: number }) {
  if (!data || data.length < 2) return <svg width={width} height={height} style={{ flexShrink: 0 }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1; // 1px padding top/bottom
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const stroke = pct == null ? "var(--text3)" : pct >= 0 ? "#4caf7d" : "var(--red)";
  return (
    <svg width={width} height={height} style={{ flexShrink: 0, display: "block" }}>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Single market index card (S&P 500, Nasdaq, Dow). Label on the left, tiny
// sparkline in the middle, pct change on the right. Replaces the v0.36
// IndexChip pill - same data, more visual signal at a glance.
function MarketCard({ label, pct, sparkline }: { label: string; pct: number | null; sparkline: number[] }) {
  const up   = pct == null ? null : pct >= 0;
  const sign = up == null ? "" : up ? "+" : "-";
  const vCol = up == null ? "var(--text3)" : up ? "#4caf7d" : "var(--red)";
  const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontVariantNumeric: "tabular-nums" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 9, transition: "border-color 0.15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(201,168,76,0.3)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "var(--text3)", flex: 1 }}>{label}</span>
      <Sparkline data={sparkline} pct={pct} />
      {pct != null
        ? <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: vCol, minWidth: 56, textAlign: "right" }}>{sign}{Math.abs(pct).toFixed(2)}%</span>
        : <span style={{ ...mono, fontSize: 11, color: "var(--text3)", minWidth: 56, textAlign: "right" }}>--</span>
      }
    </div>
  );
}

// Single holding row in the vertical Holdings list. Replaces the v0.36
// horizontal marquee chip - same data, but stacks vertically so the right
// column can stretch to balance the briefing on the left and the AI-
// generated text in the marquee never overflows into the divider.
function HoldingRow({ label, pct, price, dotColor }: { label: string; pct: number | null; price?: number | null; dotColor: string }) {
  const up   = pct == null ? null : pct >= 0;
  const sign = up == null ? "" : up ? "+" : "-";
  const vCol = up == null ? "var(--text3)" : up ? "#4caf7d" : "var(--red)";
  const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontVariantNumeric: "tabular-nums" };
  const fmtPrice = (v: number) => Math.abs(v) >= 1000 ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.toFixed(2);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "6px 1fr auto auto", alignItems: "center", gap: 10, padding: "8px 11px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 8, cursor: "default", transition: "border-color 0.15s, background 0.15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(201,168,76,0.3)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.04)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg3)"; }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
      <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "-0.2px" }}>{label}</span>
      {price != null
        ? <span style={{ ...mono, fontSize: 10, color: "var(--text3)" }}>${fmtPrice(price)}</span>
        : <span style={{ ...mono, fontSize: 10, color: "var(--text3)" }}>--</span>
      }
      {pct != null
        ? <span style={{ ...mono, fontSize: 10.5, fontWeight: 700, color: vCol, minWidth: 50, textAlign: "right" }}>{sign}{Math.abs(pct).toFixed(2)}%</span>
        : <span style={{ ...mono, fontSize: 10.5, color: "var(--text3)", minWidth: 50, textAlign: "right" }}>--</span>
      }
    </div>
  );
}

export default function GreetingBar({ displayName, assets, portfolioValue, valueIsLive = false, perfHistory, hideBriefing, hideTickers, onTodayPctChange, accountType }: Props) {
  const resolvedAccountType = accountType || DEFAULT_ACCOUNT_TYPE;
  const accountMeta = getAccountType(resolvedAccountType);
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
    // Pass account_type so the brief's "Your Portfolio" paragraph
    // frames the holdings through the right tax lens (Roth IRA -> no
    // TLH talk, HSA -> no cap-gains talk, Brokerage -> normal). Falls
    // back to the default brokerage on the backend when empty.
    const atParam = resolvedAccountType && resolvedAccountType !== DEFAULT_ACCOUNT_TYPE
      ? `&account_type=${encodeURIComponent(resolvedAccountType)}`
      : "";
    const url = tickerParam
      ? `${API_URL}/market-summary?tickers=${encodeURIComponent(tickerParam)}${atParam}`
      : (atParam ? `${API_URL}/market-summary?${atParam.slice(1)}` : `${API_URL}/market-summary`);
    fetch(url, { signal: controller.signal }).then(r => r.json()).then(d => { setMarket(d ?? null); setSummaryLoading(false); }).catch(e => { if (e?.name !== "AbortError") setSummaryLoading(false); });
    return () => controller.abort();
  }, [assets, resolvedAccountType]);

  const [indexData, setIndexData] = useState<IndexPrice[]>([
    { label: "S&P 500", ticker: "^GSPC", price: null, changePct: null, sparkline: [] },
    { label: "Nasdaq",  ticker: "^IXIC", price: null, changePct: null, sparkline: [] },
    { label: "Dow",     ticker: "^DJI",  price: null, changePct: null, sparkline: [] },
  ]);
  const loadIndices = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/watchlist-data?tickers=^GSPC,^IXIC,^DJI`);
      const d = await r.json();
      const results = d.results || [];
      const next: IndexPrice[] = [
        { label: "S&P 500", ticker: "^GSPC" },
        { label: "Nasdaq",  ticker: "^IXIC" },
        { label: "Dow",     ticker: "^DJI"  },
      ].map(meta => {
        const row = results.find((x: any) => x.ticker === meta.ticker);
        return {
          ...meta,
          price: row?.price == null ? null : Number(row.price),
          changePct: row?.change_pct == null ? null : Number(row.change_pct),
          sparkline: Array.isArray(row?.sparkline) ? row.sparkline.map(Number).filter((n: number) => Number.isFinite(n)) : [],
        };
      });
      setIndexData(next);
    } catch {}
  }, []);
  // Pause on backgrounded tab so two open tabs don't both hammer /watchlist-data.
  useVisibilityInterval(loadIndices, 60000, []);

  const [holdingPrices, setHoldingPrices] = useState<HoldingPrice[]>([]);

  const validHoldingPollTickers = useMemo(
    () => assets.filter(a => a.ticker && a.weight > 0).map(a => a.ticker),
    [assets]
  );
  const holdingPollKey = validHoldingPollTickers.join(",");
  // AbortController + cancel flag are belt-and-suspenders. If the user clicks
  // portfolio A then quickly portfolio B, A's in-flight fetch could resolve
  // AFTER B's and overwrite holdingPrices with A's data. The cancel flag stops
  // the stale setState; the AbortController stops the underlying request.
  const holdingCtxRef = useRef<{ ctrl: AbortController | null; cancelled: boolean }>({ ctrl: null, cancelled: false });
  useEffect(() => {
    holdingCtxRef.current.cancelled = false;
    // Always clear holdingPrices on assets change so portfolioToday doesn't
    // briefly compute against the previous portfolio's ticker data (overlapping
    // tickers could otherwise leak stale change_pct until the fetch resolves).
    setHoldingPrices([]);
    return () => { holdingCtxRef.current.cancelled = true; holdingCtxRef.current.ctrl?.abort(); };
  }, [holdingPollKey]);
  const loadHoldings = useCallback(() => {
    if (!validHoldingPollTickers.length) return;
    holdingCtxRef.current.ctrl?.abort();
    const controller = new AbortController();
    holdingCtxRef.current.ctrl = controller;
    (async () => {
      try {
        const r = await fetch(
          `${API_URL}/watchlist-data?tickers=${holdingPollKey}`,
          { signal: controller.signal }
        );
        const d = await r.json();
        if (holdingCtxRef.current.cancelled) return;
        setHoldingPrices((d.results || []).map((s: any) => ({
          ticker: s.ticker,
          price: s.price == null ? null : Number(s.price),
          changePct: s.change_pct == null ? null : Number(s.change_pct),
          sparkline: Array.isArray(s.sparkline) ? s.sparkline.map(Number).filter((n: number) => Number.isFinite(n)) : [],
        })));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    })();
  }, [validHoldingPollTickers.length, holdingPollKey]);
  useVisibilityInterval(loadHoldings, 60000, [holdingPollKey, validHoldingPollTickers.length]);

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
    // Need data for at least half the portfolio weight to show a meaningful
    // number. Belt-and-suspenders: also require coveredWeight > 0 even though
    // the >=0.5 ratio above implies it - if totalWeight is 0 the ratio is
    // NaN (0/0) which compares false to <0.5 and we'd divide-by-zero below.
    if (totalWeight <= 0 || coveredWeight <= 0 || coveredWeight / totalWeight < 0.5) return null;
    const pct = weightedPct / coveredWeight;
    if (!Number.isFinite(pct)) return null;
    if (Math.abs(pct) < 0.005 && !mkt.isOpen) return null; // hide 0.00% when market closed
    const dollar = (portfolioValue ?? 0) > 0 ? ((portfolioValue as number) * pct / 100) : null;
    return { pct, dollar };
  }, [holdingPrices, assets, portfolioValue, mkt.isOpen]);

  // Bubble today's pct up to the dashboard whenever it changes, so the sidebar
  // PortfolioBuilder can show the live value.
  useEffect(() => {
    onTodayPctChange?.(portfolioToday?.pct ?? null);
  }, [portfolioToday, onTodayPctChange]);

  // True when the user set their portfolio value TODAY (ET). On the set-day we
  // show the entered value as-is (multiplier 1) because it already reflects
  // today's market - applying todayPct would double-count the day's move.
  // Starting the next trading day, todayPct applies normally.
  const pvSetToday = (() => {
    if (typeof window === "undefined") return false;
    const setDate = localStorage.getItem("corvo_pv_set_date") || "";
    if (!setDate) return false;
    const todayET = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    return setDate === todayET;
  })();

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
  // Per-ticker rows for the vertical Holdings list. Drives the new MarketCard
  // grid (Mock A). Falls back to skeleton rows (null price, null pct) when
  // the watchlist-data fetch hasn't resolved yet, keyed by the user's saved
  // tickers so the row count is stable across loads.
  // Per-holding % shown on each pill prefers the brief's own holdings_pct
  // (from /market-summary) so the pills match the "Your Portfolio" sentence
  // in the brief EXACTLY - they're presented together as one snapshot, and
  // the brief quotes these numbers verbatim. Falls back to the live
  // watchlist-data change_pct only before the brief has loaded (or for a
  // ticker the brief didn't return). Price + sparkline still come from the
  // live-polled watchlist-data. The aggregate live value at the top stays on
  // watchlist-data so it keeps ticking every 60s.
  const holdingRows = validHoldingTickers.map(t => {
    const hp = holdingPrices.find(h => h.ticker === t);
    const briefPct = market?.holdings_pct?.[t];
    const pct = (briefPct != null && Number.isFinite(briefPct))
      ? Number(briefPct)
      : (hp?.changePct ?? null);
    return { ticker: t, price: hp?.price ?? null, pct };
  });

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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Account-type pill - moved from the live-value row in v0.40 since
                it was making that row too wide on narrower viewports and
                spilling content past the vertical divider. Lives in the
                header now where portfolio metadata fits naturally next to
                the market-status pill. */}
            <span
              title={`${accountMeta.label} - ${accountMeta.tagline}`}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: "var(--accent)",
                background: "rgba(201,168,76,0.1)",
                border: "0.5px solid rgba(201,168,76,0.3)",
                borderRadius: 5,
                padding: "3px 7px",
                flexShrink: 0,
                cursor: "default",
              }}
            >
              {accountMeta.short}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "var(--bg3)", border: "0.5px solid var(--border)", flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: mkt.dot, boxShadow: mkt.isOpen ? "0 0 7px rgba(76,175,125,0.65)" : mkt.isPre ? "0 0 7px rgba(201,168,76,0.5)" : "none" }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text2)" }}>{mkt.label}</span>
              <span style={{ fontSize: 10, color: "var(--text3)" }}>{mkt.sub}</span>
            </div>
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
                  : `$${(portfolioValue! * ((valueIsLive || pvSetToday) ? 1 : (1 + (portfolioToday?.pct ?? 0) / 100))).toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
              </span>
              {!valueHidden && (
                portfolioToday ? (
                  <span
                    aria-label={`Today ${portfolioToday.pct >= 0 ? "up" : "down"} ${Math.abs(portfolioToday.pct).toFixed(2)} percent${!pvSetToday && portfolioToday.dollar != null ? ", " + (portfolioToday.dollar >= 0 ? "gain " : "loss ") + "$" + Math.abs(portfolioToday.dollar).toFixed(0) : ""}`}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: portfolioToday.pct >= 0 ? "#4caf7d" : "var(--red)",
                      letterSpacing: 0.1,
                      whiteSpace: "nowrap",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {/* Direction arrow alongside the color/sign so colorblind
                        users still see up vs down at a glance. The sign
                        characters (+ / -) inside the literal also help. */}
                    <span aria-hidden style={{ fontSize: 9, lineHeight: 1, fontWeight: 700 }}>
                      {portfolioToday.pct >= 0 ? "▲" : "▼"}
                    </span>
                    {/* Dollar delta hidden on the day the value was set - the
                        base hasn't moved yet so it'd just read +$0. */}
                    {!pvSetToday && portfolioToday.dollar != null && (
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
            expanded.
            v0.49 (2026-05-27): a small "AS OF FRI · UPDATES MON 9:30 AM
            ET" pill sits above the teaser whenever the brief is from a
            past trading day, so weekend / pre-market users don't mistake
            yesterday's brief for live coverage. */}
        {collapsed && !hideBriefing && market?.market && (
          <div style={{ marginTop: 6, marginBottom: 4 }}>
            {market.as_of_label && (
              <BriefAsOfPill
                asOfLabel={market.as_of_label}
                nextUpdateLabel={market.next_update_label}
                isStale={market.is_stale}
                briefTs={market.ts}
              />
            )}
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
                transition: "color 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color = "var(--text2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color = "var(--text3)"; }}
            >
              {market.market}
            </div>
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
                  <div key={i} style={{ width: `${w}%`, height: 13, borderRadius: 4, background: "var(--skeleton)", animation: "gb-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.12}s` }} />
                ))
              ) : hasBriefContent ? (
                <>
                  {/* Date pill at the very top of the expanded brief, mirror
                      of the one on the collapsed teaser so the context
                      doesn't disappear when the user opens the full brief. */}
                  {market!.as_of_label && (
                    <BriefAsOfPill
                      asOfLabel={market!.as_of_label}
                      nextUpdateLabel={market!.next_update_label}
                      isStale={market!.is_stale}
                      briefTs={market!.ts}
                    />
                  )}
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

          {/* RIGHT - market indices (top) + holdings vertical list (bottom).
              v0.39 redesign (Mock A): Markets are now per-card with mini
              sparklines + pct. Holdings became a vertical scrollable list
              instead of an auto-scrolling horizontal marquee - the marquee
              overflowed past the divider on narrower viewports (user-
              reported, with screenshot), and stacked the data at the top
              of the right column leaving empty space below. Holdings list
              has min-width:0 + overflow-y:auto so long ticker lists scroll
              within the column without leaking out. The wrapper uses
              `flex: 1 1 0` on holdings + `min-height: 0` so the right
              column stretches vertically to balance the briefing on the
              left. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>

            {/* Market indices */}
            <div>
              <span style={{ fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 8 }}>Markets</span>
              {indexData.every(d => d.changePct == null) ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {[1, 2, 3].map(i => <div key={i} style={{ height: 38, borderRadius: 9, background: "var(--skeleton)", animation: "gb-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />)}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {indexData.map(idx => (
                    <MarketCard key={idx.ticker} label={idx.label} pct={idx.changePct} sparkline={idx.sparkline} />
                  ))}
                </div>
              )}
            </div>

            {/* Holdings vertical list - natural height, scrolls when long.
                v0.39's flex:1 attempt to stretch to fill the right column
                collapsed in some viewport contexts and the rows rendered at
                zero height (user-reported). v0.40 falls back to natural
                height with maxHeight + overflow so the rows always render. */}
            {!hideTickers && validHoldingTickers.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: "var(--text3)", fontWeight: 600 }}>Your Holdings</span>
                  {mkt.isOpen && (
                    <>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4caf7d", animation: "gb-live-pulse 2s ease-in-out infinite", flexShrink: 0 }} />
                      <span style={{ fontSize: 7, letterSpacing: 1.5, textTransform: "uppercase", color: "#4caf7d", fontWeight: 600 }}>Live</span>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 360, overflowY: "auto", paddingRight: 2, scrollbarWidth: "thin" as any }}>
                  {holdingRows.map((row, i) => {
                    const dotColor = i === 0 ? "var(--accent)" :
                      i === 1 ? "rgba(201,168,76,0.7)" :
                      i === 2 ? "rgba(201,168,76,0.5)" :
                      i === 3 ? "rgba(201,168,76,0.35)" :
                      "rgba(201,168,76,0.25)";
                    return <HoldingRow key={`${row.ticker}-${i}`} label={row.ticker} pct={row.pct} price={row.price} dotColor={dotColor} />;
                  })}
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
