"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase";
import dynamic from "next/dynamic";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const LOCAL_KEY = "corvo_saved_portfolios";

const TICKER_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.", MSFT: "Microsoft", NVDA: "NVIDIA", GOOGL: "Alphabet",
  AMZN: "Amazon", META: "Meta", TSLA: "Tesla", JPM: "JPMorgan",
  V: "Visa", JNJ: "Johnson & Johnson", "BRK-B": "Berkshire Hathaway",
  SPY: "S&P 500 ETF", QQQ: "Nasdaq 100 ETF", VTI: "Vanguard Total Mkt",
  GLD: "Gold ETF", TLT: "20yr Treasury ETF", BND: "Total Bond ETF",
  "BTC-USD": "Bitcoin", "ETH-USD": "Ethereum", SCHD: "Schwab Dividend ETF",
  VOO: "Vanguard S&P 500", IWM: "Russell 2000 ETF", VNQ: "Real Estate ETF",
  ARKK: "ARK Innovation ETF", AMD: "AMD", INTC: "Intel", KO: "Coca-Cola",
  PG: "Procter & Gamble", DIS: "Walt Disney", NFLX: "Netflix",
  UBER: "Uber", GS: "Goldman Sachs", BA: "Boeing", WMT: "Walmart",
  XOM: "ExxonMobil", CVX: "Chevron", PFE: "Pfizer", MRK: "Merck",
};
const isValidSavedId = (id: string) => /^[0-9a-f-]{36}$/.test(id) || id.length > 10;

const COLORS = [
  "#b8860b", "#5b9bd5", "#e05c5c", "#5cb88a",
  "#b87fd4", "#e0965c", "#5cd4d4", "#d45cb8", "#8abd5b", "#d4c45c",
];

const PERIOD_API: Record<string, string> = { "6m": "6mo", "1y": "1y", "2y": "2y", "5y": "5y" };

const BENCHMARKS = [
  { ticker: "^GSPC", label: "S&P 500" },
  { ticker: "^IXIC", label: "Nasdaq" },
  { ticker: "^DJI",  label: "Dow Jones" },
  { ticker: "^RUT",  label: "Russell 2000" },
  { ticker: "QQQ",   label: "QQQ" },
  { ticker: "GLD",   label: "Gold" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = "ticker" | "company" | "weight" | "value" | "change1d" | "change7d" | "sector" | "analyst_upside";
type SortDir = "asc" | "desc";

interface SavedPortfolio {
  id: string;
  name: string;
  assets: { ticker: string; weight: number; purchasePrice?: number }[];
}

interface AnalystTarget {
  target_mean: number | null;
  target_high: number | null;
  target_low: number | null;
  upside_pct: number | null;
  num_analysts: number | null;
  current_price: number | null;
}

interface LiveData {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  change_pct: number | null;
  sparkline: number[];
}

interface PositionRow {
  ticker: string;
  company: string;
  sector: string;
  portfolioId: string;
  portfolioName: string;
  weightFrac: number;   // 0–1 within that portfolio
  value: number | null;
  change1d: number | null;
  change7d: number | null;
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Pill({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: "var(--text3)", fontSize: 11 }}>-</span>;
  const pos = value >= 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 2,
      padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 600,
      background: pos ? "rgba(76,175,125,0.1)" : "rgba(224,92,92,0.1)",
      color: pos ? "#4caf7d" : "#e05c5c",
    }}>
      {pos ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function SortTh({
  label, sortKey, active, dir, onClick, style = {},
}: {
  label: string; sortKey: string; active: boolean; dir: SortDir;
  onClick: () => void; style?: React.CSSProperties;
}) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: "8px 12px", fontSize: 10, letterSpacing: 1.5,
        color: "var(--text3)", textTransform: "uppercase" as const,
        textAlign: "left", background: "var(--bg2)",
        position: "sticky" as const, top: 0,
        cursor: "pointer", userSelect: "none" as const,
        borderBottom: "0.5px solid var(--border)", fontWeight: 600,
        whiteSpace: "nowrap" as const, ...style,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {label}
        {active
          ? (dir === "asc" ? <ArrowUp size={11} style={{ color: "var(--accent)" }} /> : <ArrowDown size={11} style={{ color: "var(--accent)" }} />)
          : <ArrowUpDown size={11} style={{ color: "var(--text3)", opacity: 0.4 }} />}
      </span>
    </th>
  );
}

function Skeleton({ w = "100%", h = 14 }: { w?: string | number; h?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: 4, background: "var(--bg3)", animation: "pulse 1.4s ease-in-out infinite" }} />
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="More information"
        style={{
          width: 17,
          height: 17,
          minWidth: 17,
          minHeight: 17,
          borderRadius: "50%",
          border: `1px solid ${hovered ? "var(--accent)" : "var(--border)"}`,
          background: "transparent",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          flexShrink: 0,
          alignSelf: "center",
          color: hovered ? "var(--accent)" : "var(--text3)",
          transition: "border-color 0.15s, color 0.15s",
        }}
      >
        <svg width="9" height="11" viewBox="0 0 9 11" aria-hidden="true" style={{ display: "block" }}>
          <text x="4.5" y="9.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif">?</text>
        </svg>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            // color-mix gives a theme-aware semi-transparent overlay: dark in dark mode, light in light mode
            background: "color-mix(in srgb, var(--bg) 70%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "relative",
              background: "var(--card-bg)",
              border: "0.5px solid var(--border)",
              borderRadius: 12,
              padding: "22px 24px 22px 24px",
              maxWidth: 320,
              width: "88%",
              boxShadow: "var(--shadow-md)",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: "0.5px solid var(--border)",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text3)",
                padding: 0,
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text3)"; }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                <line x1="1" y1="1" x2="7" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="7" y1="1" x2="1" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {/* Body */}
            <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0, paddingRight: 16 }}>
              {text}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PositionsTab({
  onSelectTicker,
}: {
  onSelectTicker: (t: string) => void;
}) {
  const cssVar = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  // Portfolio value — synced with localStorage (set in sidebar)
  const [portfolioValue, setPortfolioValue] = useState<number>(() => {
    if (typeof window === "undefined") return 10000;
    const s = localStorage.getItem("corvo_portfolio_value");
    return s ? Number(s) : 10000;
  });
  useEffect(() => {
    const handler = () => {
      const s = localStorage.getItem("corvo_portfolio_value");
      if (s) setPortfolioValue(Number(s));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Saved portfolios
  const [savedPortfolios, setSavedPortfolios] = useState<SavedPortfolio[]>([]);
  const [portfoliosLoading, setPortfoliosLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<"all" | string>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Live market data
  const [liveData, setLiveData] = useState<Record<string, LiveData>>({});
  const [liveLoading, setLiveLoading] = useState(false);
  const [flashSet, setFlashSet] = useState<Set<string>>(new Set());
  const prevPrices = useRef<Record<string, number>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Performance chart
  const [perfData, setPerfData] = useState<Record<string, number[]>>({});
  const [perfDates, setPerfDates] = useState<Record<string, string[]>>({});
  const [period, setPeriod] = useState<"6m" | "1y" | "2y" | "5y" | "custom">("1y");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [perfLoading, setPerfLoading] = useState(false);
  const [benchmark, setBenchmark] = useState("^GSPC");
  const [benchData, setBenchData] = useState<{ x: string[]; y: number[] }>({ x: [], y: [] });
  const [benchLoading, setBenchLoading] = useState(false);

  // Table
  const [sortKey, setSortKey] = useState<SortKey>("weight");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Analyst targets
  const [analystTargets, setAnalystTargets] = useState<Record<string, AnalystTarget>>({});

  // ── Load saved portfolios ──────────────────────────────────────────────────
  const loadPortfolios = useCallback(async () => {
    setPortfoliosLoading(true);
    const portfolios: SavedPortfolio[] = [];

    // localStorage (works for logged-out users too)
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        parsed.forEach(p => {
          if (p.id && p.name && Array.isArray(p.assets) && p.assets.length > 0) {
            portfolios.push({ id: p.id, name: p.name, assets: p.assets });
          }
        });
      }
    } catch {}

    // Supabase (logged-in users)
    // NOTE: the table stores tickers/weights as separate arrays (see SavedPortfolios.toDb),
    // NOT a single "assets" JSON column - query the right columns.
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: pfs } = await supabase
          .from("portfolios")
          .select("id,name,tickers,weights")
          .eq("user_id", user.id);
        if (pfs) {
          pfs.forEach((p: any) => {
            // Skip duplicates already in localStorage
            if (portfolios.some(lp => lp.id === p.id)) return;
            const tickers: string[] = p.tickers ?? [];
            const weights: number[] = p.weights ?? [];
            const assets: SavedPortfolio["assets"] = tickers
              .map((t, i) => ({ ticker: t, weight: weights[i] ?? 0 }))
              .filter(a => a.ticker && a.weight > 0);
            if (assets.length > 0) portfolios.push({ id: p.id, name: p.name || "Untitled", assets });
          });
        }
      }
    } catch {}

    setSavedPortfolios(portfolios.filter(p => p.name !== "portfolio 1"));
    // If the selected portfolio no longer exists, fall back to "all"
    setSelectedId(prev => {
      if (prev === "all") return "all";
      return portfolios.some(p => p.id === prev) ? prev : "all";
    });
    setPortfoliosLoading(false);
  }, []);

  useEffect(() => {
    loadPortfolios();
    // Refresh whenever another tab/component saves to localStorage
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_KEY) loadPortfolios();
    };
    window.addEventListener("storage", onStorage);
    // Also listen for a custom event fired by SavedPortfolios on same page
    const onSaved = () => loadPortfolios();
    window.addEventListener("corvo:portfolio-saved", onSaved);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("corvo:portfolio-saved", onSaved);
    };
  }, [loadPortfolios]);

  // ── Fetch performance data for all saved portfolios ───────────────────────
  useEffect(() => {
    if (savedPortfolios.length === 0) return;
    if (period === "custom" && (!customStart || !customEnd)) return;
    setPerfLoading(true);
    const queryParam = period === "custom"
      ? `start_date=${customStart}&end_date=${customEnd}`
      : `period=${PERIOD_API[period]}`;
    Promise.all(
      savedPortfolios.filter(p => isValidSavedId(p.id)).map(async p => {
        const tickers = p.assets.map(a => a.ticker).join(",");
        const weights = p.assets.map(a => a.weight).join(",");
        try {
          const r = await fetch(
            `${API_URL}/portfolio?tickers=${encodeURIComponent(tickers)}&weights=${encodeURIComponent(weights)}&${queryParam}`
          );
          const d = await r.json();
          return { id: p.id, cumulative: (d.portfolio_cumulative as number[]) ?? [], dates: (d.dates as string[]) ?? [] };
        } catch {
          return { id: p.id, cumulative: [], dates: [] };
        }
      })
    ).then(results => {
      const newPerf: Record<string, number[]> = {};
      const newDates: Record<string, string[]> = {};
      results.forEach(({ id, cumulative, dates }) => {
        newPerf[id] = cumulative;
        newDates[id] = dates;
      });
      setPerfData(newPerf);
      setPerfDates(newDates);
    }).finally(() => setPerfLoading(false));
  }, [savedPortfolios, period, customStart, customEnd]);

  // ── Fetch benchmark series ────────────────────────────────────────────────
  useEffect(() => {
    if (period === "custom" && (!customStart || !customEnd)) return;
    setBenchLoading(true);
    const queryParam = period === "custom"
      ? `start_date=${customStart}&end_date=${customEnd}`
      : `period=${PERIOD_API[period]}`;
    const BENCH_PROXY: Record<string, string> = {
      "^GSPC": "SPY",
      "^IXIC": "QQQ",
      "^DJI": "DIA",
      "^RUT": "IWM",
    };
    const benchTicker = BENCH_PROXY[benchmark] ?? benchmark;
    fetch(`${API_URL}/portfolio?tickers=${encodeURIComponent(benchTicker)}&weights=1&${queryParam}`)
      .then(r => r.json())
      .then(d => {
        setBenchData({
          x: (d.dates as string[]) ?? [],
          y: (d.portfolio_cumulative as number[]) ?? [],
        });
      })
      .catch(() => setBenchData({ x: [], y: [] }))
      .finally(() => setBenchLoading(false));
  }, [benchmark, period, customStart, customEnd]);

  // ── Derive all unique tickers across selection ─────────────────────────────
  const activePortfolios = selectedId === "all"
    ? savedPortfolios
    : savedPortfolios.filter(p => p.id === selectedId);

  const allTickers = [...new Set(activePortfolios.flatMap(p => p.assets.map(a => a.ticker)))];

  // ── Fetch live data ────────────────────────────────────────────────────────
  const tickersKey = allTickers.join(",");

  const fetchLive = useCallback(async () => {
    if (!allTickers.length) return;
    try {
      const r = await fetch(`${API_URL}/watchlist-data?tickers=${tickersKey}`);
      const d = await r.json();
      const map: Record<string, LiveData> = {};
      (d.results || []).forEach((s: any) => {
        if (!s?.ticker) return;
        map[s.ticker] = {
          ticker: s.ticker,
          name: s.name ?? s.ticker,
          sector: s.sector ?? "Other",
          price: s.price ?? 0,
          change_pct: s.change_pct ?? null,
          sparkline: s.sparkline ?? [],
        };
      });

      // Flash tickers whose prices changed
      const flashed = new Set<string>();
      Object.keys(map).forEach(t => {
        const prev = prevPrices.current[t];
        if (prev !== undefined && Math.abs(prev - map[t].price) > 0.001) flashed.add(t);
        prevPrices.current[t] = map[t].price;
      });
      if (flashed.size > 0) {
        setFlashSet(flashed);
        setTimeout(() => setFlashSet(new Set()), 800);
      }

      setLiveData(map);
    } catch {}
  }, [tickersKey]);

  useEffect(() => {
    if (!allTickers.length) return;
    setLiveLoading(true);
    fetchLive().finally(() => setLiveLoading(false));
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchLive, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchLive]);

  // ── Fetch analyst targets for all holdings ─────────────────────────────────
  useEffect(() => {
    if (!allTickers.length) return;
    Promise.all(
      allTickers.map(ticker =>
        fetch(`${API_URL}/analyst-targets/${ticker}`)
          .then(r => r.json())
          .then(d => ({ ticker, d }))
          .catch(() => ({ ticker, d: null }))
      )
    ).then(results => {
      const map: Record<string, AnalystTarget> = {};
      results.forEach(({ ticker, d }) => {
        if (d && !d.detail) map[ticker] = d;
      });
      setAnalystTargets(map);
    });
  }, [tickersKey]);

  // ── Build position rows ────────────────────────────────────────────────────
  function build7dChange(sparkline: number[]): number | null {
    if (sparkline.length < 2) return null;
    const first = sparkline[0];
    const last = sparkline[sparkline.length - 1];
    if (!first) return null;
    return ((last - first) / first) * 100;
  }

  const allRows: PositionRow[] = activePortfolios.flatMap(p => {
    const total = p.assets.reduce((s, a) => s + a.weight, 0) || 1;
    return p.assets
      .filter(a => a.ticker && a.weight > 0)
      .map(a => {
        const live = liveData[a.ticker];
        const wFrac = a.weight / total;
        return {
          ticker: a.ticker,
          company: live?.name ?? TICKER_NAMES[a.ticker] ?? a.ticker,
          sector: live?.sector ?? "-",
          portfolioId: p.id,
          portfolioName: p.name,
          weightFrac: wFrac,
          value: portfolioValue * wFrac,
          change1d: live?.change_pct ?? null,
          change7d: live ? build7dChange(live.sparkline) : null,
        };
      });
  });

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = [...allRows].sort((x, y) => {
    let a: any, b: any;
    switch (sortKey) {
      case "ticker":         a = x.ticker;      b = y.ticker;      break;
      case "company":        a = x.company;     b = y.company;     break;
      case "weight":         a = x.weightFrac;  b = y.weightFrac;  break;
      case "value":          a = x.value;       b = y.value;       break;
      case "change1d":       a = x.change1d;    b = y.change1d;    break;
      case "change7d":       a = x.change7d;    b = y.change7d;    break;
      case "sector":         a = x.sector;      b = y.sector;      break;
      case "analyst_upside": a = analystTargets[x.ticker]?.upside_pct ?? null;
                             b = analystTargets[y.ticker]?.upside_pct ?? null; break;
      default:               a = x.weightFrac;  b = y.weightFrac;
    }
    if (a === null || a === undefined) a = sortDir === "asc" ? Infinity : -Infinity;
    if (b === null || b === undefined) b = sortDir === "asc" ? Infinity : -Infinity;
    if (typeof a === "string") return sortDir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
    return sortDir === "asc" ? a - b : b - a;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  // ── Best / worst across ALL visible rows ──────────────────────────────────
  const withChange = sorted.filter(r => r.change1d !== null);
  const best  = withChange.length ? withChange.reduce((b, r) => (r.change1d! > b.change1d!) ? r : b) : null;
  const worst = withChange.length ? withChange.reduce((w, r) => (r.change1d! < w.change1d!) ? r : w) : null;

  // ── Group by portfolio (for "All" view) ───────────────────────────────────
  const showPortfolioCol = selectedId === "all" && savedPortfolios.length > 1;

  // Group sorted rows by portfolio for the group-header display
  type Group = { portfolio: SavedPortfolio; rows: PositionRow[] };
  const groups: Group[] = activePortfolios.map(p => ({
    portfolio: p,
    rows: sorted.filter(r => r.portfolioId === p.id),
  }));

  // For a single portfolio: just show flat rows. For "All": grouped.
  const useGrouped = selectedId === "all" && savedPortfolios.length > 1;

  // ── Selected portfolio label ───────────────────────────────────────────────
  const selectedLabel = selectedId === "all"
    ? `All Portfolios (${savedPortfolios.length})`
    : (savedPortfolios.find(p => p.id === selectedId)?.name ?? "Portfolio");

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <style>{`
        @keyframes flashGreen{0%,100%{background:transparent}50%{background:rgba(76,175,125,0.14)}}
        @keyframes flashRed  {0%,100%{background:transparent}50%{background:rgba(224,92,92,0.14)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .pos-flash-up  td{animation:flashGreen .8s ease-out!important}
        .pos-flash-down td{animation:flashRed   .8s ease-out!important}
        .pos-row:hover td{background:rgba(255,255,255,0.025)!important}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.65);cursor:pointer}
        @media(max-width:768px){
          .pos-perf-wrap{overflow-x:hidden!important;width:100%!important;min-width:0!important}
          .pos-perf-ctrl{overflow-x:auto;scrollbar-width:none;padding-bottom:4px;overscroll-behavior-x:contain}
          .pos-perf-ctrl::-webkit-scrollbar{display:none}
        }
      `}</style>

      {/* ── Controls row ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>

        {/* Portfolio selector */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 12px", fontSize: 12, fontWeight: 500,
              border: "0.5px solid var(--border2)", borderRadius: 9,
              background: "var(--card-bg)", color: "var(--text)",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            <span>{portfoliosLoading ? "Loading…" : selectedLabel}</span>
            <ChevronDown size={12} style={{ color: "var(--text3)", transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {dropdownOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
              background: "var(--card-bg)", border: "0.5px solid var(--border2)",
              borderRadius: 10, overflow: "hidden", minWidth: 200,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}>
              {[{ id: "all" as const, name: `All Portfolios (${savedPortfolios.length})` }, ...savedPortfolios.map(p => ({ id: p.id, name: p.name }))].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setSelectedId(opt.id); setDropdownOpen(false); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "9px 14px",
                    fontSize: 12, border: "none", cursor: "pointer",
                    background: selectedId === opt.id ? "var(--bg3)" : "transparent",
                    color: selectedId === opt.id ? "var(--text)" : "var(--text2)",
                    borderBottom: "0.5px solid var(--border)",
                    transition: "background .1s",
                  }}
                  onMouseEnter={e => { if (selectedId !== opt.id) e.currentTarget.style.background = "var(--bg3)"; }}
                  onMouseLeave={e => { if (selectedId !== opt.id) e.currentTarget.style.background = "transparent"; }}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 20, marginLeft: "auto" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4caf7d", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: 10, color: "var(--text3)" }}>Live · updates every 10s</span>
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {dropdownOpen && (
        <div onClick={() => setDropdownOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!portfoliosLoading && savedPortfolios.length === 0 && (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "48px 32px", textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>No saved portfolios yet</p>
          <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, maxWidth: 380, margin: "0 auto 20px" }}>
            Build a portfolio in the sidebar, run analysis, then save it to track your positions here.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 300, margin: "0 auto", fontSize: 12, color: "var(--text3)", textAlign: "left" }}>
            {["Add tickers + weights in the left sidebar", "Click Analyze (or press ↵)", "Click Save portfolio"].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(184,134,11,0.1)", border: "0.5px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ lineHeight: 1.6 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {(portfoliosLoading || (liveLoading && allRows.length === 0 && savedPortfolios.length > 0)) && (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "13px 16px", borderBottom: "0.5px solid var(--border)", alignItems: "center" }}>
              <Skeleton w={48} h={14} />
              <Skeleton w={140} h={12} />
              <Skeleton w={60} h={12} />
              <Skeleton w={70} h={12} />
              <Skeleton w={60} h={12} />
              <Skeleton w={80} h={20} />
            </div>
          ))}
        </div>
      )}

      {/* ── Best / worst pills ───────────────────────────────────────────── */}
      {!portfoliosLoading && !liveLoading && allRows.length > 0 && (best || worst) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          {best && best.change1d !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", background: "rgba(76,175,125,0.07)", border: "0.5px solid rgba(76,175,125,0.22)", borderRadius: 20 }}>
              <span style={{ fontSize: 11, letterSpacing: 1.5, color: "rgba(76,175,125,0.7)", textTransform: "uppercase" }}>Best today</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#4caf7d", fontFamily: "Space Mono, monospace" }}>{best.ticker}</span>
              <Pill value={best.change1d} />
            </div>
          )}
          {worst && worst.change1d !== null && worst.ticker !== best?.ticker && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", background: "rgba(224,92,92,0.07)", border: "0.5px solid rgba(224,92,92,0.22)", borderRadius: 20 }}>
              <span style={{ fontSize: 11, letterSpacing: 1.5, color: "rgba(224,92,92,0.7)", textTransform: "uppercase" }}>Worst today</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#e05c5c", fontFamily: "Space Mono, monospace" }}>{worst.ticker}</span>
              <Pill value={worst.change1d} />
            </div>
          )}
        </div>
      )}

      {/* ── Performance chart ─────────────────────────────────────────────── */}
      {!portfoliosLoading && savedPortfolios.length > 0 && (
        <motion.div
          // initial={false} is required — do not remove
          initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="pos-perf-wrap"
          style={{ marginBottom: 20, border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 16px 8px", background: "var(--bg2)", overflow: "hidden", width: "100%" }}
        >
          {/* Chart header */}
          <div className="pos-perf-ctrl" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase" }}>
              Portfolio Performance
              <InfoTooltip
                text="Each line tracks the cumulative return of a saved portfolio, indexed to 0% at the start of the selected period. The dashed line is the chosen benchmark. Use the period buttons or Custom to zoom in or compare over longer horizons."
              />
            </span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {/* Legend */}
              {savedPortfolios.map((p, i) => (
                <span key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: COLORS[i % COLORS.length], marginRight: 4 }}>
                  <span style={{ width: 14, height: 2, background: COLORS[i % COLORS.length], display: "inline-block", borderRadius: 1 }} />
                  {p.name}
                </span>
              ))}
              {benchData.y.length > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text3)", marginRight: 4 }}>
                  <span style={{ width: 14, height: 0, borderTop: "2px dashed rgba(180,180,180,0.5)", display: "inline-block" }} />
                  {BENCHMARKS.find(b => b.ticker === benchmark)?.label ?? benchmark}
                </span>
              )}
              {/* Benchmark dropdown */}
              <select
                value={benchmark}
                onChange={e => setBenchmark(e.target.value)}
                style={{
                  padding: "3px 6px", fontSize: 10,
                  background: "transparent", border: "0.5px solid var(--border)",
                  borderRadius: 5, color: "var(--text3)", cursor: "pointer",
                  fontFamily: "Space Mono, monospace", outline: "none",
                }}
              >
                {BENCHMARKS.map(b => (
                  <option key={b.ticker} value={b.ticker}>{b.label}</option>
                ))}
              </select>
              {/* Period buttons */}
              {(["6m", "1y", "2y", "5y"] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: "3px 10px", fontSize: 10,
                  background: period === p ? "rgba(184,134,11,0.15)" : "transparent",
                  border: `0.5px solid ${period === p ? "rgba(184,134,11,0.4)" : "var(--border)"}`,
                  borderRadius: 5, color: period === p ? "var(--accent)" : "var(--text3)",
                  cursor: "pointer", fontFamily: "Space Mono, monospace", transition: "all 0.15s",
                }}>
                  {p}
                </button>
              ))}
              {/* Custom date range */}
              <button onClick={() => setPeriod("custom")} style={{
                padding: "3px 10px", fontSize: 10,
                background: period === "custom" ? "rgba(184,134,11,0.15)" : "transparent",
                border: `0.5px solid ${period === "custom" ? "rgba(184,134,11,0.4)" : "var(--border)"}`,
                borderRadius: 5, color: period === "custom" ? "var(--accent)" : "var(--text3)",
                cursor: "pointer", fontFamily: "Space Mono, monospace", transition: "all 0.15s",
              }}>
                Custom
              </button>
              {period === "custom" && (
                <>
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    style={{
                      background: "var(--bg3)", border: "0.5px solid var(--border)",
                      color: "var(--text)", borderRadius: 6, fontSize: 11,
                      padding: "2px 6px", outline: "none", fontFamily: "Space Mono, monospace",
                    }}
                  />
                  <span style={{ fontSize: 10, color: "var(--text3)" }}>→</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    style={{
                      background: "var(--bg3)", border: "0.5px solid var(--border)",
                      color: "var(--text)", borderRadius: 6, fontSize: 11,
                      padding: "2px 6px", outline: "none", fontFamily: "Space Mono, monospace",
                    }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Chart body */}
          {perfLoading || benchLoading ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>Loading…</span>
            </div>
          ) : (
            <Plot
              data={[
                ...savedPortfolios
                  .map((p, i) => ({
                    x: perfDates[p.id] ?? [],
                    y: perfData[p.id] ?? [],
                    type: "scatter",
                    mode: "lines",
                    name: p.name,
                    line: { color: COLORS[i % COLORS.length], width: 1.5 },
                  }))
                  .filter(t => (t.y as number[]).length > 0),
                ...(benchData.y.length > 0 ? [{
                  x: benchData.x,
                  y: benchData.y,
                  type: "scatter",
                  mode: "lines",
                  name: BENCHMARKS.find(b => b.ticker === benchmark)?.label ?? benchmark,
                  line: { color: "rgba(180,180,180,0.45)", width: 1.5, dash: "dash" },
                }] : []),
              ]}
              layout={{
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                font: { color: cssVar('--text3'), family: "Space Mono, monospace", size: 10 },
                margin: { t: 0, b: 32, l: 48, r: 16 },
                xaxis: {
                  gridcolor: cssVar('--border'),
                  linecolor: "rgba(255,255,255,0.06)",
                  tickcolor: cssVar('--text3'),
                  tickfont: { size: 9, color: cssVar('--text3') },
                  showticklabels: true,
                },
                yaxis: {
                  gridcolor: cssVar('--border'),
                  linecolor: "rgba(255,255,255,0.06)",
                  tickcolor: cssVar('--text3'),
                  tickfont: { size: 9, color: cssVar('--text3') },
                  showticklabels: true,
                  tickformat: ".0%",
                  ticksuffix: "%",
                },
                showlegend: false,
                hovermode: "x unified",
                hoverlabel: {
                  bgcolor: cssVar('--card-bg'),
                  bordercolor: "rgba(184,134,11,0.55)",
                  font: { color: cssVar('--text'), family: "Space Mono, monospace", size: 11 },
                },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: 220, minWidth: 0 }}
              useResizeHandler
            />
          )}
        </motion.div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {!portfoliosLoading && savedPortfolios.length > 0 && (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {/* Table header label with info tooltip */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "0.5px solid var(--border)", background: "var(--bg2)" }}>
            <span style={{ fontSize: 9, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase" }}>Holdings</span>
            <InfoTooltip
              text="Ticker: stock or ETF symbol. Company: full name. Weight: allocation % within the portfolio, shown with a bar. Value: estimated dollar amount based on your portfolio size. 1D: today's price change. 7D: change over the last 7 trading days derived from closing prices. Analyst Target: Wall Street consensus price target from Finnhub with upside or downside percentage and a range bar showing analyst low and high targets. Sector: GICS sector classification."
            />
          </div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr>
                  <SortTh label="Ticker"          sortKey="ticker"         active={sortKey==="ticker"}         dir={sortDir} onClick={() => toggleSort("ticker")} />
                  <SortTh label="Company"         sortKey="company"        active={sortKey==="company"}        dir={sortDir} onClick={() => toggleSort("company")} />
                  {showPortfolioCol && (
                    <th style={{ padding: "8px 12px", fontSize: 10, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", textAlign: "left", background: "var(--bg2)", position: "sticky", top: 0, borderBottom: "0.5px solid var(--border)", fontWeight: 600, whiteSpace: "nowrap" }}>
                      Portfolio
                    </th>
                  )}
                  <SortTh label="Weight"          sortKey="weight"         active={sortKey==="weight"}         dir={sortDir} onClick={() => toggleSort("weight")} />
                  <SortTh label="Value"           sortKey="value"          active={sortKey==="value"}          dir={sortDir} onClick={() => toggleSort("value")} />
                  <SortTh label="1D"              sortKey="change1d"       active={sortKey==="change1d"}       dir={sortDir} onClick={() => toggleSort("change1d")} />
                  <SortTh label="7D"              sortKey="change7d"       active={sortKey==="change7d"}       dir={sortDir} onClick={() => toggleSort("change7d")} />
                  <SortTh label="Analyst Target"  sortKey="analyst_upside" active={sortKey==="analyst_upside"} dir={sortDir} onClick={() => toggleSort("analyst_upside")} />
                  <SortTh label="Sector"          sortKey="sector"         active={sortKey==="sector"}         dir={sortDir} onClick={() => toggleSort("sector")} />
                  <th style={{ padding: "8px 12px", background: "var(--bg2)", borderBottom: "0.5px solid var(--border)", position: "sticky", top: 0, width: 28 }} />
                </tr>
              </thead>
              <tbody>
                {useGrouped ? (
                  // ── Grouped view ──────────────────────────────────────────
                  groups.map(({ portfolio, rows }) => {
                    if (rows.length === 0) return null;
                    const groupValue = rows.reduce((s, r) => s + (r.value ?? 0), 0);
                    return (
                      <>
                        {/* Group header */}
                        <tr key={`hdr-${portfolio.id}`}>
                          <td colSpan={showPortfolioCol ? 10 : 9} style={{
                            padding: "8px 14px",
                            background: "var(--bg2)",
                            borderBottom: "0.5px solid var(--border)",
                            borderTop: "0.5px solid var(--border)",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", letterSpacing: 0.3 }}>{portfolio.name}</span>
                              <span style={{ fontSize: 10, color: "var(--text3)" }}>{rows.length} holdings</span>
                              <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>
                                ${groupValue.toLocaleString("en-US", { maximumFractionDigits: 0 })} total
                              </span>
                            </div>
                          </td>
                        </tr>
                        {/* Rows for this group */}
                        {rows.map((row, i) => (
                          <PositionRowEl
                            key={`${portfolio.id}-${row.ticker}`}
                            row={row}
                            i={i}
                            flashSet={flashSet}
                            showPortfolioCol={showPortfolioCol}
                            onSelectTicker={onSelectTicker}
                            analystTarget={analystTargets[row.ticker] ?? null}
                          />
                        ))}
                      </>
                    );
                  })
                ) : (
                  // ── Flat view ─────────────────────────────────────────────
                  sorted.map((row, i) => (
                    <PositionRowEl
                      key={`${row.portfolioId}-${row.ticker}`}
                      row={row}
                      i={i}
                      flashSet={flashSet}
                      showPortfolioCol={false}
                      onSelectTicker={onSelectTicker}
                      analystTarget={analystTargets[row.ticker] ?? null}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 10, textAlign: "right" }}>
        Click any row to open detailed stock view · Value = portfolio value × weight · Analyst targets from Finnhub
      </p>
    </div>
  );
}

// ── Row sub-component ─────────────────────────────────────────────────────────

function PositionRowEl({
  row, i, flashSet, showPortfolioCol, onSelectTicker, analystTarget,
}: {
  row: PositionRow;
  i: number;
  flashSet: Set<string>;
  showPortfolioCol: boolean;
  onSelectTicker: (t: string) => void;
  analystTarget: AnalystTarget | null;
}) {
  const flashing = flashSet.has(row.ticker);
  const flashClass = flashing && row.change1d !== null
    ? (row.change1d >= 0 ? "pos-flash-up" : "pos-flash-down")
    : "";

  const GREEN = "#4caf7d";
  const RED   = "#e05c5c";

  // Analyst target range bar
  const at = analystTarget;
  const atUpside = at?.upside_pct ?? null;
  const atIsUp = atUpside != null ? atUpside >= 0 : null;
  const atColor = atIsUp === true ? GREEN : atIsUp === false ? RED : "var(--text3)";

  // Mini range bar positions
  let currentPct = 50;
  let targetPct  = 50;
  if (at?.target_low != null && at?.target_high != null && at.target_high > at.target_low && at.current_price && at.target_mean) {
    const range = at.target_high - at.target_low;
    currentPct = Math.max(3, Math.min(97, ((at.current_price - at.target_low) / range) * 100));
    targetPct  = Math.max(3, Math.min(97, ((at.target_mean  - at.target_low) / range) * 100));
  }
  const fillLeft  = Math.min(currentPct, targetPct);
  const fillWidth = Math.abs(targetPct - currentPct);

  return (
    <motion.tr
      className={`pos-row ${flashClass}`}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.3) }}
      onClick={() => onSelectTicker(row.ticker)}
      style={{ cursor: "pointer", borderBottom: "0.5px solid var(--border)" }}
    >
      {/* Ticker */}
      <td style={{ padding: "17px 12px" }}>
        <span style={{ fontFamily: "Space Mono, monospace", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
          {row.ticker}
        </span>
      </td>

      {/* Company */}
      <td style={{ padding: "17px 12px" }}>
        <span style={{ fontSize: 13, color: "var(--text2)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
          {row.company}
        </span>
      </td>

      {/* Portfolio col (only in "All" view) */}
      {showPortfolioCol && (
        <td style={{ padding: "17px 12px" }}>
          <span style={{ fontSize: 12, color: "var(--text3)", background: "var(--bg3)", padding: "2px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>
            {row.portfolioName}
          </span>
        </td>
      )}

      {/* Weight */}
      <td style={{ padding: "17px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 40, height: 3, background: "var(--bg3)", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
            <div style={{ height: "100%", width: `${Math.min(row.weightFrac * 100, 100)}%`, background: "var(--accent)", borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "Space Mono, monospace", whiteSpace: "nowrap" }}>
            {(row.weightFrac * 100).toFixed(1)}%
          </span>
        </div>
      </td>

      {/* Value */}
      <td style={{ padding: "17px 12px" }}>
        <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "Space Mono, monospace", whiteSpace: "nowrap" }}>
          ${(row.value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
      </td>

      {/* 1D change */}
      <td style={{ padding: "17px 12px" }}>
        <Pill value={row.change1d} />
      </td>

      {/* 7D change */}
      <td style={{ padding: "17px 12px" }}>
        <Pill value={row.change7d} />
      </td>

      {/* Analyst Target */}
      <td style={{ padding: "12px 12px" }}>
        {at?.target_mean != null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 110 }}>
            {/* Price + upside */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "Space Mono, monospace", fontSize: 12, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>
                ${at.target_mean.toFixed(2)}
              </span>
              {atUpside != null && (
                <span style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                  fontFamily: "Space Mono, monospace",
                  background: atIsUp ? "rgba(76,175,125,0.1)" : "rgba(224,92,92,0.1)",
                  color: atColor, whiteSpace: "nowrap",
                }}>
                  {atUpside >= 0 ? "+" : ""}{atUpside.toFixed(1)}%
                </span>
              )}
            </div>
            {/* Mini range bar */}
            {at.target_low != null && at.target_high != null && (
              <div style={{ position: "relative", height: 4, background: "var(--bg3)", borderRadius: 2, width: "100%" }}>
                <div style={{
                  position: "absolute", top: 0, height: "100%",
                  left: `${fillLeft}%`, width: `${fillWidth}%`,
                  background: atIsUp ? "rgba(76,175,125,0.45)" : "rgba(224,92,92,0.45)",
                  borderRadius: 2,
                }} />
                <div style={{
                  position: "absolute", top: "50%", transform: "translate(-50%, -50%)",
                  left: `${currentPct}%`,
                  width: 7, height: 7, borderRadius: "50%",
                  background: "var(--text2)", border: "1.5px solid var(--bg)", zIndex: 2,
                }} />
                <div style={{
                  position: "absolute", top: "50%", transform: "translate(-50%, -50%)",
                  left: `${targetPct}%`,
                  width: 9, height: 9, borderRadius: "50%",
                  background: atColor, border: "1.5px solid var(--bg)", zIndex: 3,
                }} />
              </div>
            )}
            {at.num_analysts != null && (
              <span style={{ fontSize: 9, color: "var(--text3)" }}>{at.num_analysts} analysts</span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 11, color: "var(--text3)" }}>-</span>
        )}
      </td>

      {/* Sector */}
      <td style={{ padding: "17px 12px" }}>
        <span style={{ fontSize: 12, color: "var(--text3)", background: "var(--bg3)", padding: "3px 9px", borderRadius: 8, whiteSpace: "nowrap" }}>
          {row.sector}
        </span>
      </td>

      {/* Row action */}
      <td style={{ padding: "17px 12px" }}>
        <ExternalLink size={12} style={{ color: "var(--text3)" }} />
      </td>
    </motion.tr>
  );
}
