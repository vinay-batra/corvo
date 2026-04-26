"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PALETTE = ["#b8860b", "#b47ee0", "#5cb88a", "#e05c5c"];
const MAX = 4;
const AMBER = "#b8860b";

const PERIOD_API: Record<string, string> = {
  "1W": "5d", "1M": "1mo", "3M": "3mo", "1Y": "1y", "3Y": "3y", "5Y": "5y",
};

const BENCHMARKS = [
  { ticker: "^GSPC", label: "S&P 500" },
  { ticker: "^IXIC", label: "Nasdaq" },
  { ticker: "^DJI",  label: "Dow Jones" },
  { ticker: "^RUT",  label: "Russell 2000" },
  { ticker: "QQQ",   label: "QQQ" },
  { ticker: "GLD",   label: "Gold" },
];

const BENCH_PROXY: Record<string, string> = {
  "^GSPC": "SPY", "^IXIC": "QQQ", "^DJI": "DIA", "^RUT": "IWM",
};

const COMMON_TICKERS: { ticker: string; name: string; type: string }[] = [
  { ticker:"AAPL",    name:"Apple Inc.",                type:"EQUITY" },
  { ticker:"MSFT",    name:"Microsoft Corp.",           type:"EQUITY" },
  { ticker:"NVDA",    name:"NVIDIA Corp.",              type:"EQUITY" },
  { ticker:"GOOGL",   name:"Alphabet Inc.",             type:"EQUITY" },
  { ticker:"AMZN",    name:"Amazon.com Inc.",           type:"EQUITY" },
  { ticker:"META",    name:"Meta Platforms Inc.",       type:"EQUITY" },
  { ticker:"TSLA",    name:"Tesla Inc.",                type:"EQUITY" },
  { ticker:"BRK-B",   name:"Berkshire Hathaway B",     type:"EQUITY" },
  { ticker:"JPM",     name:"JPMorgan Chase & Co.",      type:"EQUITY" },
  { ticker:"LLY",     name:"Eli Lilly and Co.",         type:"EQUITY" },
  { ticker:"V",       name:"Visa Inc.",                 type:"EQUITY" },
  { ticker:"UNH",     name:"UnitedHealth Group",        type:"EQUITY" },
  { ticker:"XOM",     name:"Exxon Mobil Corp.",         type:"EQUITY" },
  { ticker:"MA",      name:"Mastercard Inc.",           type:"EQUITY" },
  { ticker:"AVGO",    name:"Broadcom Inc.",             type:"EQUITY" },
  { ticker:"ORCL",    name:"Oracle Corp.",              type:"EQUITY" },
  { ticker:"HD",      name:"Home Depot Inc.",           type:"EQUITY" },
  { ticker:"COST",    name:"Costco Wholesale",          type:"EQUITY" },
  { ticker:"WMT",     name:"Walmart Inc.",              type:"EQUITY" },
  { ticker:"JNJ",     name:"Johnson & Johnson",         type:"EQUITY" },
  { ticker:"BAC",     name:"Bank of America Corp.",     type:"EQUITY" },
  { ticker:"NFLX",    name:"Netflix Inc.",              type:"EQUITY" },
  { ticker:"ABBV",    name:"AbbVie Inc.",               type:"EQUITY" },
  { ticker:"PG",      name:"Procter & Gamble Co.",      type:"EQUITY" },
  { ticker:"KO",      name:"Coca-Cola Co.",             type:"EQUITY" },
  { ticker:"CVX",     name:"Chevron Corp.",             type:"EQUITY" },
  { ticker:"AMD",     name:"Advanced Micro Devices",    type:"EQUITY" },
  { ticker:"MRK",     name:"Merck & Co.",               type:"EQUITY" },
  { ticker:"ADBE",    name:"Adobe Inc.",                type:"EQUITY" },
  { ticker:"QCOM",    name:"Qualcomm Inc.",             type:"EQUITY" },
  { ticker:"CRM",     name:"Salesforce Inc.",           type:"EQUITY" },
  { ticker:"TXN",     name:"Texas Instruments",         type:"EQUITY" },
  { ticker:"NKE",     name:"Nike Inc.",                 type:"EQUITY" },
  { ticker:"PEP",     name:"PepsiCo Inc.",              type:"EQUITY" },
  { ticker:"TMO",     name:"Thermo Fisher Scientific",  type:"EQUITY" },
  { ticker:"INTC",    name:"Intel Corp.",               type:"EQUITY" },
  { ticker:"GS",      name:"Goldman Sachs Group",       type:"EQUITY" },
  { ticker:"IBM",     name:"IBM Corp.",                 type:"EQUITY" },
  { ticker:"GE",      name:"GE Aerospace",              type:"EQUITY" },
  { ticker:"CAT",     name:"Caterpillar Inc.",          type:"EQUITY" },
  { ticker:"DIS",     name:"Walt Disney Co.",           type:"EQUITY" },
  { ticker:"BA",      name:"Boeing Co.",                type:"EQUITY" },
  { ticker:"WFC",     name:"Wells Fargo & Co.",         type:"EQUITY" },
  { ticker:"MS",      name:"Morgan Stanley",            type:"EQUITY" },
  { ticker:"T",       name:"AT&T Inc.",                 type:"EQUITY" },
  { ticker:"VZ",      name:"Verizon Communications",    type:"EQUITY" },
  { ticker:"F",       name:"Ford Motor Co.",            type:"EQUITY" },
  { ticker:"GM",      name:"General Motors Co.",        type:"EQUITY" },
  { ticker:"SBUX",    name:"Starbucks Corp.",           type:"EQUITY" },
  { ticker:"SPY",     name:"SPDR S&P 500 ETF",         type:"ETF" },
  { ticker:"QQQ",     name:"Invesco QQQ Trust",         type:"ETF" },
  { ticker:"IWM",     name:"iShares Russell 2000 ETF",  type:"ETF" },
  { ticker:"VTI",     name:"Vanguard Total Stock Mkt",  type:"ETF" },
  { ticker:"VOO",     name:"Vanguard S&P 500 ETF",      type:"ETF" },
  { ticker:"GLD",     name:"SPDR Gold Shares",          type:"ETF" },
  { ticker:"ARKK",    name:"ARK Innovation ETF",        type:"ETF" },
  { ticker:"SCHD",    name:"Schwab US Dividend Equity", type:"ETF" },
  { ticker:"TLT",     name:"iShares 20+ Year Treasury", type:"ETF" },
  { ticker:"BTC-USD", name:"Bitcoin",                   type:"CRYPTO" },
  { ticker:"ETH-USD", name:"Ethereum",                  type:"CRYPTO" },
];

function localSearch(q: string): { ticker: string; name: string; type: string }[] {
  if (!q) return [];
  const upper = q.toUpperCase();
  return COMMON_TICKERS.filter(t =>
    t.ticker.startsWith(upper) || t.name.toUpperCase().includes(upper)
  ).slice(0, 8);
}

interface SearchResult { ticker: string; name: string; type: string; }

interface StockInfo {
  ticker: string;
  name: string;
  price: number;
  change_pct: number;
  market_cap: number | null;
  pe_ratio: number | null;
  eps: number | null;
  beta: number | null;
  week52_high: number | null;
  week52_low: number | null;
  history: { t: string; p: number }[];
  color: string;
}

function fmt(v: number | null, prefix = "", suffix = "", decimals = 2): string {
  if (v == null || isNaN(v)) return "N/A";
  if (prefix === "$" && Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (prefix === "$" && Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `${prefix}${v.toFixed(decimals)}${suffix}`;
}

export default function StockCompare() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [stocks, setStocks]   = useState<Record<string, StockInfo>>({});
  const [stockLoading, setStockLoading] = useState<Record<string, boolean>>({});
  const [error, setError]     = useState("");
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const check = () => setDark(document.documentElement.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const [comparing, setComparing] = useState(false);

  // Toolbar state
  const [period, setPeriod]           = useState<string>("1Y");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [viewMode, setViewMode]       = useState<"pct" | "price">("pct");
  const [benchmark, setBenchmark]     = useState("^GSPC");
  const [benchHistory, setBenchHistory] = useState<{ t: string; p: number }[]>([]);
  const [benchLoading, setBenchLoading] = useState(false);

  const [inputValue, setInputValue]       = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching]         = useState(false);
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const blurTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q) { setSearchResults([]); return; }
    const local = localSearch(q);
    if (local.length > 0) setSearchResults(local);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_URL}/search-ticker?q=${encodeURIComponent(q)}`);
        const d = await res.json();
        const api: SearchResult[] = (d.results || []).map((r: any) => ({ ticker: r.ticker, name: r.name, type: r.type || "EQUITY" }));
        const apiSet = new Set(api.map(r => r.ticker));
        const merged = [...api, ...local.filter(l => !apiSet.has(l.ticker))].slice(0, 8);
        setSearchResults(merged.length > 0 ? merged : local);
      } catch { /* keep local */ }
      setSearching(false);
    }, 300);
  }, []);

  const fetchStock = async (ticker: string, color: string, p = period, start = customStart, end = customEnd) => {
    setStockLoading(prev => ({ ...prev, [ticker]: true }));
    const histParams = p === "Custom" && start && end
      ? `start=${start}&end=${end}`
      : `period=${PERIOD_API[p] ?? "1y"}`;
    try {
      const [infoRes, histRes] = await Promise.all([
        fetch(`${API_URL}/stock/${encodeURIComponent(ticker)}`),
        fetch(`${API_URL}/stock/${encodeURIComponent(ticker)}/history?${histParams}`),
      ]);
      const info = await infoRes.json();
      const hist = await histRes.json();
      const history: { t: string; p: number }[] =
        hist.history ||
        (hist.dates || []).map((t: string, i: number) => ({ t, p: (hist.prices || [])[i] ?? 0 }));
      setStocks(p => ({
        ...p,
        [ticker]: {
          ticker,
          name: info.name || ticker,
          price: info.price ?? info.current_price ?? 0,
          change_pct: info.change_pct ?? 0,
          market_cap: info.market_cap ?? null,
          pe_ratio: info.pe_ratio ?? null,
          eps: info.eps ?? null,
          beta: info.beta ?? null,
          week52_high: info.week52_high ?? null,
          week52_low: info.week52_low ?? null,
          history,
          color,
        },
      }));
    } catch {}
    setStockLoading(p => ({ ...p, [ticker]: false }));
  };

  const addTicker = (ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    if (tickers.includes(t)) { setError(`${t} already added`); return; }
    if (tickers.length >= MAX) { setError(`Max ${MAX} tickers`); return; }
    setError("");
    const color = PALETTE[tickers.length];
    const newTickers = [...tickers, t];
    setTickers(newTickers);
    setInputValue("");
    setSearchResults(COMMON_TICKERS.filter(s => !newTickers.includes(s.ticker)).slice(0, 8));
    fetchStock(t, color);
  };

  const selectResult = (r: SearchResult) => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    addTicker(r.ticker);
  };

  const remove = (t: string) => {
    setTickers(prev => {
      const next = prev.filter(x => x !== t);
      next.forEach((ticker, i) => {
        setStocks(p => p[ticker] ? { ...p, [ticker]: { ...p[ticker], color: PALETTE[i] } } : p);
      });
      if (next.length < 2) setComparing(false);
      return next;
    });
  };

  const refetchAll = (p: string, start?: string, end?: string) => {
    setStocks({});
    tickers.forEach((ticker, i) => fetchStock(ticker, PALETTE[i], p, start ?? "", end ?? ""));
  };

  // Re-fetch history when period changes (non-custom)
  useEffect(() => {
    if (!comparing || tickers.length < 2 || period === "Custom") return;
    refetchAll(period);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, comparing]);

  // Re-fetch history when custom dates are both filled
  useEffect(() => {
    if (!comparing || tickers.length < 2 || period !== "Custom" || !customStart || !customEnd) return;
    refetchAll(period, customStart, customEnd);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customStart, customEnd, comparing]);

  // Fetch benchmark history
  useEffect(() => {
    if (!comparing || tickers.length < 2) return;
    if (period === "Custom" && (!customStart || !customEnd)) return;
    const benchTicker = BENCH_PROXY[benchmark] ?? benchmark;
    const histParams = period === "Custom" && customStart && customEnd
      ? `start=${customStart}&end=${customEnd}`
      : `period=${PERIOD_API[period] ?? "1y"}`;
    setBenchLoading(true);
    fetch(`${API_URL}/stock/${encodeURIComponent(benchTicker)}/history?${histParams}`)
      .then(r => r.json())
      .then(d => {
        const history: { t: string; p: number }[] =
          d.history || (d.dates || []).map((t: string, i: number) => ({ t, p: (d.prices || [])[i] ?? 0 }));
        setBenchHistory(history);
      })
      .catch(() => setBenchHistory([]))
      .finally(() => setBenchLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benchmark, period, customStart, customEnd, comparing]);

  const stockTraces = tickers
    .map((t, i) => {
      const s = stocks[t];
      if (!s) {
        return stockLoading[t] ? {
          x: [] as string[], y: [] as number[],
          type: "scatter" as const, mode: "lines" as const,
          name: `${t} (loading…)`,
          line: { color: PALETTE[i], width: 1.5, dash: "dot" as const },
          hovertemplate: `${t}: loading…<extra></extra>`,
        } : null;
      }
      const hist = s.history;
      if (!hist.length) return null;
      if (viewMode === "price") {
        return {
          x: hist.map((h: any) => h.t),
          y: hist.map((h: any) => h.p),
          type: "scatter" as const, mode: "lines" as const,
          name: s.ticker,
          line: { color: s.color, width: 1.5 },
          hovertemplate: `${s.ticker}: $%{y:.2f}<extra></extra>`,
        };
      }
      const base = hist[0].p;
      if (!base) return null;
      return {
        x: hist.map((h: any) => h.t),
        y: hist.map((h: any) => ((h.p - base) / base) * 100),
        type: "scatter" as const, mode: "lines" as const,
        name: s.ticker,
        line: { color: s.color, width: 1.5 },
        hovertemplate: `${s.ticker}: %{y:.1f}%<extra></extra>`,
      };
    })
    .filter(Boolean);

  const benchLabel = BENCHMARKS.find(b => b.ticker === benchmark)?.label ?? benchmark;
  const benchBase  = benchHistory.length > 1 ? benchHistory[0].p : 0;
  const benchTrace = benchHistory.length > 1 && benchmark && benchBase ? (
    viewMode === "pct"
      ? {
          x: benchHistory.map(h => h.t),
          y: benchHistory.map(h => ((h.p - benchBase) / benchBase) * 100),
          type: "scatter" as const, mode: "lines" as const,
          name: benchLabel,
          line: { color: "rgba(180,180,180,0.45)", width: 1.5, dash: "dash" as const },
          hovertemplate: `${benchLabel}: %{y:.1f}%<extra></extra>`,
        }
      : {
          x: benchHistory.map(h => h.t),
          y: benchHistory.map(h => h.p),
          type: "scatter" as const, mode: "lines" as const,
          name: benchLabel,
          yaxis: "y2" as const,
          line: { color: "rgba(180,180,180,0.45)", width: 1.5, dash: "dash" as const },
          hovertemplate: `${benchLabel}: $%{y:.2f}<extra></extra>`,
        }
  ) : null;

  const chartData = [...stockTraces, ...(benchTrace ? [benchTrace] : [])];

  const corrMatrix = tickers.map(t1 =>
    tickers.map(t2 => {
      const h1 = stocks[t1]?.history?.map((h: any) => h.p) ?? [];
      const h2 = stocks[t2]?.history?.map((h: any) => h.p) ?? [];
      const len = Math.min(h1.length, h2.length);
      if (len < 10) return null;
      const r1 = h1.slice(-len), r2 = h2.slice(-len);
      const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
      const m1 = mean(r1), m2 = mean(r2);
      const num = r1.reduce((s, v, i) => s + (v - m1) * (r2[i] - m2), 0);
      const d1 = Math.sqrt(r1.reduce((s, v) => s + (v - m1) ** 2, 0));
      const d2 = Math.sqrt(r2.reduce((s, v) => s + (v - m2) ** 2, 0));
      return d1 && d2 ? num / (d1 * d2) : null;
    })
  );

  const statsRows = [
    { label: "Price",    fn: (s: StockInfo) => fmt(s.price, "$") },
    { label: "Mkt Cap",  fn: (s: StockInfo) => fmt(s.market_cap, "$") },
    { label: "P/E",      fn: (s: StockInfo) => fmt(s.pe_ratio, "", "x") },
    { label: "EPS",      fn: (s: StockInfo) => fmt(s.eps, "$") },
    { label: "Beta",     fn: (s: StockInfo) => fmt(s.beta) },
    { label: "52W High", fn: (s: StockInfo) => fmt(s.week52_high, "$") },
    { label: "52W Low",  fn: (s: StockInfo) => fmt(s.week52_low, "$") },
    { label: "Change",   fn: (s: StockInfo) => fmt(s.change_pct, "", "%") },
  ];

  const anyLoading = Object.values(stockLoading).some(Boolean);

  const [modal, setModal] = useState<"perf" | "stats" | "corr" | null>(null);
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(null); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const EXPLAINERS = {
    perf: {
      title: "Normalized Performance",
      simple: "Shows each stock's % return from the same starting point (base 0%), so you can compare growth rates regardless of price.",
      example: "If AAPL starts at $150 and NVDA at $400, both reset to 0% so you can see who grew faster — not who was more expensive.",
      good: "Steeper slope = stronger momentum. A stock up 80% beats one up 20% regardless of share price.",
    },
    stats: {
      title: "Side-by-Side Stats",
      simple: "Compares key fundamental and price metrics across all selected stocks side by side.",
      example: "A P/E of 35x means investors pay $35 for every $1 of earnings. Beta of 1.5 means 50% more volatile than the market.",
      good: "Lower P/E may signal value; higher beta means more volatility and potential upside or downside.",
    },
    corr: {
      title: "Correlation",
      simple: "Measures how similarly two stocks move together, from -1 (opposite) to +1 (identical).",
      example: "A correlation of 0.9 between AAPL and MSFT means they almost always move in the same direction on any given day.",
      good: "High correlation between your holdings means less diversification benefit — a downturn hits everything at once.",
    },
  } as const;

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "14px 16px", background: "var(--card-bg)", marginBottom: 14 }}>
        {tickers.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {tickers.map((t, i) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: PALETTE[i] + "18", border: `0.5px solid ${PALETTE[i]}55`, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, color: PALETTE[i] }}>
                {t}
                <button onClick={() => remove(t)} style={{ background: "none", border: "none", cursor: "pointer", color: PALETTE[i], fontSize: 12, padding: 0, lineHeight: 1, opacity: 0.7 }}>x</button>
              </span>
            ))}
          </div>
        )}

        {!comparing && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, zIndex: 50 }}>
              <input
                value={inputValue}
                onChange={e => { const v = e.target.value.toUpperCase(); setInputValue(v); setError(""); if (!v) { setSearchResults(COMMON_TICKERS.filter(t => !tickers.includes(t.ticker)).slice(0, 8)); } else search(v); }}
                onFocus={() => { setDropdownOpen(true); if (inputValue) search(inputValue); else setSearchResults(COMMON_TICKERS.filter(t => !tickers.includes(t.ticker)).slice(0, 8)); }}
                onBlur={() => { blurTimer.current = setTimeout(() => setDropdownOpen(false), 180); }}
                onKeyDown={e => { if (e.key === "Enter" && inputValue) addTicker(inputValue); if (e.key === "Escape") setDropdownOpen(false); }}
                placeholder="Search ticker or company name..."
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg3)", border: `0.5px solid ${dropdownOpen ? AMBER + "66" : "var(--border)"}`, borderRadius: 8, color: "var(--text)", fontSize: 12, fontFamily: "var(--font-mono)", outline: "none", transition: "border-color 0.15s", boxSizing: "border-box" }}
              />
              {searching && <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, border: "1.5px solid rgba(201,168,76,0.2)", borderTopColor: AMBER, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
              <AnimatePresence>
                {dropdownOpen && searchResults.length > 0 && (
                  <motion.div
                    // initial={false} is required — do not remove
                    initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, zIndex: 100, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                    {searchResults.map((r, idx) => (
                      <div key={idx}
                        onMouseDown={e => { e.preventDefault(); if (blurTimer.current) clearTimeout(blurTimer.current); selectResult(r); }}
                        style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: idx < searchResults.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", transition: "background 0.1s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,168,76,0.06)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: AMBER, fontWeight: 700 }}>{r.ticker}</div>
                          <div style={{ fontSize: 10, color: "var(--text3)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                        </div>
                        <span style={{ fontSize: 8, background: "rgba(201,168,76,0.1)", color: AMBER, padding: "2px 6px", borderRadius: 3, border: "1px solid rgba(201,168,76,0.2)", flexShrink: 0 }}>
                          {r.type === "EQUITY" ? "Stock" : r.type === "ETF" ? "ETF" : r.type === "CRYPTO" ? "Crypto" : r.type}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button onClick={() => addTicker(inputValue)}
              style={{ padding: "8px 16px", background: "var(--text)", border: "none", borderRadius: 8, color: "var(--bg)", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
              Add
            </button>
            {anyLoading && <div style={{ width: 14, height: 14, border: "1.5px solid var(--border2)", borderTopColor: AMBER, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />}
          </div>
        )}

        {tickers.length >= 2 && !comparing && (
          <motion.button
            // initial={false} is required — do not remove
            initial={false} animate={{ opacity: 1, y: 0 }}
            onClick={() => setComparing(true)}
            style={{ marginTop: 10, width: "100%", padding: "10px 0", border: "1px solid " + AMBER, color: AMBER, background: "rgba(184,134,11,0.08)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.03em" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = AMBER; (e.currentTarget as HTMLButtonElement).style.color = "#0d1117"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(184,134,11,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = AMBER; }}>
            Compare {tickers.join(" vs ")}
          </motion.button>
        )}

        {error && <p style={{ fontSize: 11, color: "#e05c5c", marginTop: 8 }}>{error}</p>}
        {!comparing && (
          <div style={{ marginTop: 12 }}>
            {tickers.length === 0 && <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>Search and add up to 4 tickers to compare performance, stats, and correlation.</p>}
            {([
              { label: "Stocks", tickers: ["AAPL","MSFT","NVDA","GOOGL","AMZN","TSLA","META","BRK-B","JPM"] },
              { label: "ETFs",   tickers: ["SPY","QQQ","VTI","GLD","TLT","ARKK"] },
              { label: "Crypto", tickers: ["BTC-USD","ETH-USD"] },
            ] as { label: string; tickers: string[] }[]).map(group => (
              <div key={group.label} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 9, letterSpacing: 1.8, color: "var(--text3)", textTransform: "uppercase", marginBottom: 6 }}>{group.label}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {group.tickers.map(t => (
                    <button key={t} onClick={() => addTicker(t)}
                      style={{ padding: "4px 10px", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, borderRadius: 6, background: "rgba(184,134,11,0.07)", border: "0.5px solid rgba(184,134,11,0.25)", color: AMBER, cursor: "pointer", transition: "all 0.12s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(184,134,11,0.15)"; e.currentTarget.style.borderColor = "rgba(184,134,11,0.5)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(184,134,11,0.07)"; e.currentTarget.style.borderColor = "rgba(184,134,11,0.25)"; }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {comparing && tickers.length >= 2 && chartData.filter((d: any) => d?.x?.length > 0).length >= 2 && (
        <>
          <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)", marginBottom: 14 }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>
                {viewMode === "pct" ? "Normalized Performance (Base 0%)" : "Price History"}
              </p>
              <button onClick={() => setModal("perf")} style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--bg3)", border: "0.5px solid var(--border)", color: "var(--text3)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = AMBER; e.currentTarget.style.color = "#0a0e14"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text3)"; }}>?</button>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
              {/* Period buttons */}
              {(["1W", "1M", "3M", "1Y", "3Y", "5Y"] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: "3px 9px", fontSize: 10,
                  background: period === p ? "rgba(184,134,11,0.15)" : "transparent",
                  border: `0.5px solid ${period === p ? "rgba(184,134,11,0.4)" : "var(--border)"}`,
                  borderRadius: 5, color: period === p ? AMBER : "var(--text3)",
                  cursor: "pointer", fontFamily: "Space Mono, monospace", transition: "all 0.15s",
                }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPeriod("Custom")} style={{
                padding: "3px 9px", fontSize: 10,
                background: period === "Custom" ? "rgba(184,134,11,0.15)" : "transparent",
                border: `0.5px solid ${period === "Custom" ? "rgba(184,134,11,0.4)" : "var(--border)"}`,
                borderRadius: 5, color: period === "Custom" ? AMBER : "var(--text3)",
                cursor: "pointer", fontFamily: "Space Mono, monospace", transition: "all 0.15s",
              }}>
                Custom
              </button>
              {period === "Custom" && (
                <>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                    style={{ background: "var(--bg3)", border: "0.5px solid var(--border)", color: "var(--text)", borderRadius: 6, fontSize: 11, padding: "2px 6px", outline: "none", fontFamily: "Space Mono, monospace" }} />
                  <span style={{ fontSize: 10, color: "var(--text3)" }}>→</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                    style={{ background: "var(--bg3)", border: "0.5px solid var(--border)", color: "var(--text)", borderRadius: 6, fontSize: 11, padding: "2px 6px", outline: "none", fontFamily: "Space Mono, monospace" }} />
                </>
              )}

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* % / $ toggle */}
              <div style={{ display: "flex", border: "0.5px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
                {(["pct", "price"] as const).map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{
                    padding: "3px 10px", fontSize: 10, border: "none",
                    background: viewMode === m ? "rgba(184,134,11,0.15)" : "transparent",
                    color: viewMode === m ? AMBER : "var(--text3)",
                    cursor: "pointer", fontFamily: "Space Mono, monospace", transition: "all 0.15s",
                  }}>
                    {m === "pct" ? "%" : "$"}
                  </button>
                ))}
              </div>

              {/* Benchmark dropdown */}
              <select value={benchmark} onChange={e => setBenchmark(e.target.value)} style={{
                padding: "3px 6px", fontSize: 10,
                background: "transparent", border: "0.5px solid var(--border)",
                borderRadius: 5, color: "var(--text3)", cursor: "pointer",
                fontFamily: "Space Mono, monospace", outline: "none",
              }}>
                <option value="">No benchmark</option>
                {BENCHMARKS.map(b => (
                  <option key={b.ticker} value={b.ticker}>{b.label}</option>
                ))}
              </select>
            </div>

            <Plot
              data={chartData}
              layout={{
                paper_bgcolor: "transparent", plot_bgcolor: "transparent",
                font: { color: dark ? "rgba(232,224,204,0.75)" : "#4a4a4a", family: "Inter", size: 10 },
                margin: { t: 8, b: 36, l: 54, r: 12 },
                xaxis: { gridcolor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)", linecolor: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)", tickcolor: "transparent" },
                yaxis: viewMode === "pct"
                  ? { gridcolor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)", linecolor: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)", tickcolor: "transparent", ticksuffix: "%" }
                  : { gridcolor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)", linecolor: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)", tickcolor: "transparent", tickprefix: "$" },
                ...(viewMode === "price" && benchTrace ? {
                  yaxis2: { overlaying: "y", side: "right", showgrid: false, tickprefix: "$", tickcolor: "transparent", linecolor: "transparent", color: dark ? "rgba(180,180,180,0.5)" : "rgba(100,100,100,0.5)" },
                } : {}),
                legend: { orientation: "h", y: -0.15, font: { size: 11, color: dark ? "rgba(232,224,204,0.75)" : "#4a4a4a" }, bgcolor: "transparent" },
                hovermode: "x unified",
                hoverlabel: { bgcolor: "#0d1117", bordercolor: "rgba(201,168,76,0.4)", font: { color: "#e8e0cc", size: 11 } },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: 260 }}
            />
          </div>

          <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, background: "var(--card-bg)", overflow: "hidden", marginBottom: 14 }}>
            <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Side-by-Side Stats</p>
              <button onClick={() => setModal("stats")} style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--bg3)", border: "0.5px solid var(--border)", color: "var(--text3)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = AMBER; e.currentTarget.style.color = "#0a0e14"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text3)"; }}>?</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "0.5px solid var(--border)" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, color: "var(--text3)", fontWeight: 400 }}>Metric</th>
                    {tickers.map((t, i) => (
                      <th key={t} style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, fontWeight: 600, color: PALETTE[i] }}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statsRows.map((row, ri) => (
                    <tr key={row.label} style={{ borderBottom: ri < statsRows.length - 1 ? "0.5px solid var(--border)" : "none" }}>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--text3)" }}>{row.label}</td>
                      {tickers.map((t, i) => {
                        const s = stocks[t];
                        return (
                          <td key={t} style={{ padding: "10px 16px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: PALETTE[i] }}>
                            {stockLoading[t] ? "..." : s ? row.fn(s) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {corrMatrix[0][0] !== null && (
            <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Correlation (1Y Daily Returns)</p>
                <button onClick={() => setModal("corr")} style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--bg3)", border: "0.5px solid var(--border)", color: "var(--text3)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.background = AMBER; e.currentTarget.style.color = "#0a0e14"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text3)"; }}>?</button>
              </div>
              <Plot
                data={[{
                  z: corrMatrix, x: tickers, y: tickers, type: "heatmap",
                  colorscale: [[0,"#e05c5c"],[0.5,"#1a1f2e"],[1,"#4caf7d"]],
                  zmin: -1, zmax: 1, zmid: 0,
                  text: corrMatrix.map(row => row.map(v => v != null ? v.toFixed(2) : "-")),
                  texttemplate: "%{text}",
                  hovertemplate: "%{x} x %{y}: %{z:.2f}<extra></extra>",
                  showscale: true,
                } as any]}
                layout={{
                  paper_bgcolor: "transparent", plot_bgcolor: "transparent",
                  font: { color: dark ? "rgba(232,224,204,0.75)" : "#4a4a4a", family: "Inter", size: 11 },
                  margin: { t: 8, b: 36, l: 56, r: 8 },
                  xaxis: { linecolor: "transparent", tickcolor: "transparent" },
                  yaxis: { linecolor: "transparent", tickcolor: "transparent" },
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: "100%", height: 220 }}
              />
            </div>
          )}
        </>
      )}
      <AnimatePresence>
        {modal && (
          <motion.div
            // initial={false} is required — do not remove
            initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setModal(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <motion.div
              // initial={false} is required — do not remove
              initial={false} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 16, padding: 28, maxWidth: 400, width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
              <button onClick={() => setModal(null)} style={{ position: "absolute", top: 14, right: 14, background: "var(--bg3)", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <p style={{ fontSize: 10, letterSpacing: 2, color: AMBER, textTransform: "uppercase", marginBottom: 6 }}>About</p>
              <h3 style={{ fontSize: 18, fontWeight: 500, color: "var(--text)", marginBottom: 18 }}>{EXPLAINERS[modal].title}</h3>
              {([
                { label: "Plain English", text: EXPLAINERS[modal].simple },
                { label: "Example",       text: EXPLAINERS[modal].example },
                { label: "What to look for", text: EXPLAINERS[modal].good },
              ] as { label: string; text: string }[]).map(({ label, text }) => (
                <div key={label} style={{ background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                  <p style={{ fontSize: 10, letterSpacing: 2, color: AMBER, textTransform: "uppercase", marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65 }}>{text}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
