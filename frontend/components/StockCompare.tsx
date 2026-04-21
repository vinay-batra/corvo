"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PALETTE = ["#b8860b", "#b47ee0", "#5cb88a", "#e05c5c"];
const MAX = 4;
const AMBER = "#b8860b";

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

  const fetchStock = async (ticker: string, color: string) => {
    if (stockLoading[ticker]) return;
    setStockLoading(p => ({ ...p, [ticker]: true }));
    try {
      const [infoRes, histRes] = await Promise.all([
        fetch(`${API_URL}/stock/${encodeURIComponent(ticker)}`),
        fetch(`${API_URL}/stock/${encodeURIComponent(ticker)}/history?period=1y`),
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
    setTickers(prev => [...prev, t]);
    setInputValue("");
    setSearchResults([]);
    setDropdownOpen(false);
    search("");
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
      return next;
    });
  };

  const chartData = tickers
    .map((t, i) => {
      const s = stocks[t];
      if (!s) {
        // Loading placeholder — empty trace shows in legend while data arrives
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
      const base = hist[0].p;
      if (!base) return null;
      return {
        x: hist.map((h: any) => h.t),
        y: hist.map((h: any) => ((h.p - base) / base) * 100),
        type: "scatter" as const,
        mode: "lines" as const,
        name: s.ticker,
        line: { color: s.color, width: 1.5 },
        hovertemplate: `${s.ticker}: %{y:.1f}%<extra></extra>`,
      };
    })
    .filter(Boolean);

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

        {tickers.length < MAX && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, zIndex: 50 }}>
              <input
                value={inputValue}
                onChange={e => { const v = e.target.value.toUpperCase(); setInputValue(v); setError(""); if (!v) setSearchResults(COMMON_TICKERS.filter(t => !tickers.includes(t.ticker)).slice(0, 8)); else search(v); }}
                onFocus={() => { setDropdownOpen(true); if (inputValue) search(inputValue); else setSearchResults(COMMON_TICKERS.filter(t => !tickers.includes(t.ticker)).slice(0, 8)); }}
                onBlur={() => { blurTimer.current = setTimeout(() => setDropdownOpen(false), 180); }}
                onKeyDown={e => { if (e.key === "Enter" && inputValue) addTicker(inputValue); if (e.key === "Escape") setDropdownOpen(false); }}
                placeholder="Search ticker or company name..."
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg3)", border: `0.5px solid ${dropdownOpen && inputValue ? AMBER + "66" : "var(--border)"}`, borderRadius: 8, color: "var(--text)", fontSize: 12, fontFamily: "var(--font-mono)", outline: "none", transition: "border-color 0.15s", boxSizing: "border-box" }}
              />
              {searching && <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, border: "1.5px solid rgba(201,168,76,0.2)", borderTopColor: AMBER, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
              <AnimatePresence>
                {dropdownOpen && searchResults.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
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

        {error && <p style={{ fontSize: 11, color: "#e05c5c", marginTop: 8 }}>{error}</p>}
        {tickers.length === 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>Search and add up to 4 tickers to compare performance, stats, and correlation.</p>
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

      {tickers.length >= 2 && chartData.filter((d: any) => d?.x?.length > 0).length >= 2 && (
        <>
          <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)", marginBottom: 14 }}>
            <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>Normalized Performance (Base 100, 1Y)</p>
            <Plot
              data={chartData}
              layout={{
                paper_bgcolor: "transparent", plot_bgcolor: "transparent",
                font: { color: dark ? "rgba(232,224,204,0.75)" : "#4a4a4a", family: "Inter", size: 10 },
                margin: { t: 8, b: 36, l: 50, r: 12 },
                xaxis: { gridcolor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)", linecolor: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)", tickcolor: "transparent" },
                yaxis: { gridcolor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)", linecolor: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)", tickcolor: "transparent", ticksuffix: "%" },
                legend: { orientation: "h", y: -0.15, font: { size: 11, color: dark ? "rgba(232,224,204,0.75)" : "#4a4a4a" }, bgcolor: "transparent" },
                hovermode: "x unified",
                hoverlabel: { bgcolor: "#0d1117", bordercolor: "rgba(201,168,76,0.4)", font: { color: "#e8e0cc", size: 11 } },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: 260 }}
            />
          </div>

          <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, background: "var(--card-bg)", overflow: "hidden", marginBottom: 14 }}>
            <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--border)" }}>
              <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Side-by-Side Stats</p>
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
              <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>Correlation (1Y Daily Returns)</p>
              <Plot
                data={[{
                  z: corrMatrix, x: tickers, y: tickers, type: "heatmap",
                  colorscale: [[0,"rgba(224,92,92,0.8)"],[0.5,"rgba(30,30,40,0.9)"],[1,"rgba(201,168,76,0.9)"]],
                  zmin: -1, zmax: 1,
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
    </div>
  );
}
