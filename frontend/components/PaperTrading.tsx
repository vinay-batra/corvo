"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabase";
import { fetchPaperPortfolio, fetchPaperHistory, paperBuy, paperSell, paperReset } from "../lib/api";

// initial={false} required -- do not remove
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const CHART_PERIODS = ["1D", "1W", "1M", "3M", "1Y"] as const;
type ChartPeriod = typeof CHART_PERIODS[number];

interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
}

interface StockData {
  ticker: string;
  name: string;
  current_price: number;
  change_pct: number;
  change: number;
  week52_high: number;
  week52_low: number;
  pe_ratio: number;
  market_cap: number;
  eps: number;
  volume: number;
}

interface ChartData {
  dates: string[];
  prices: number[];
}

interface Position {
  ticker: string;
  shares: number;
  avg_cost: number;
  current_price: number | null;
  current_value: number;
  pl_dollar: number;
  pl_pct: number;
}

interface Portfolio {
  cash: number;
  positions: Position[];
  total_value: number;
  total_holdings_value: number;
  total_return_pct: number;
  total_pl: number;
  starting_value: number;
  sp500_return_pct: number | null;
  created_at: string;
}

interface Trade {
  id: string;
  ticker: string;
  action: "buy" | "sell";
  shares: number;
  price: number;
  total: number;
  executed_at: string;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtLarge(n: number) {
  if (!n || n === 0) return "N/A";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${fmt(n)}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Skeleton({ width, height = 16 }: { width?: number | string; height?: number }) {
  return (
    <div
      style={{
        width: width ?? "100%", height, borderRadius: 4,
        background: "var(--bg3)", animation: "pulse 1.5s infinite",
      }}
    />
  );
}

function computeSparklineValues(trades: Trade[], currentValue: number): number[] {
  if (!trades.length) return [10000, currentValue];

  const sorted = [...trades].sort(
    (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
  );

  let cash = 10000;
  const positions: Record<string, { shares: number; lastPrice: number }> = {};
  const values: number[] = [10000];

  for (const trade of sorted) {
    if (trade.action === "buy") {
      cash -= trade.total;
      if (!positions[trade.ticker]) positions[trade.ticker] = { shares: 0, lastPrice: trade.price };
      positions[trade.ticker].shares += trade.shares;
      positions[trade.ticker].lastPrice = trade.price;
    } else {
      cash += trade.total;
      if (positions[trade.ticker]) {
        positions[trade.ticker].shares -= trade.shares;
        positions[trade.ticker].lastPrice = trade.price;
        if (positions[trade.ticker].shares <= 0.001) delete positions[trade.ticker];
      }
    }
    const holdingsValue = Object.values(positions).reduce(
      (sum, pos) => sum + pos.shares * pos.lastPrice, 0
    );
    values.push(cash + holdingsValue);
  }

  values[values.length - 1] = currentValue;
  return values;
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 200;
  const H = 52;
  const P = 3;

  const coords = values.map((v, i) => ({
    x: P + (i / (values.length - 1)) * (W - 2 * P),
    y: H - P - ((v - min) / range) * (H - 2 * P),
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(H - P).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(H - P).toFixed(1)} Z`;

  const isUp = values[values.length - 1] >= values[0];
  // hardcoded hex to match --green / --red since SVG stop elements need real colors
  const strokeColor = isUp ? "#4caf7d" : "#e05c5c";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, overflow: "visible" }}>
      <defs>
        <linearGradient id="pt-spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.22} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#pt-spark-grad)" />
      <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PaperTrading({
  userId,
  onContextChange,
}: {
  userId: string;
  onContextChange?: (ctx: string) => void;
}) {
  const [dark, setDark] = useState(true);

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradesLoaded, setTradesLoaded] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("1M");
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);

  const [buyShares, setBuyShares] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [buySuccess, setBuySuccess] = useState("");

  const [sellShares, setSellShares] = useState("");
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError, setSellError] = useState("");

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Theme observer
  useEffect(() => {
    const check = () => setDark(document.documentElement.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function getToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");
    return session.access_token;
  }

  async function loadPortfolio() {
    setLoading(true);
    try {
      const token = await getToken();
      const data: Portfolio = await fetchPaperPortfolio(userId, token);
      setPortfolio(data);
      if (onContextChange) {
        const parts = [
          "PAPER PORTFOLIO (virtual $10,000 simulation):",
          `Total Value: $${fmt(data.total_value)} | Cash: $${fmt(data.cash)} | Return: ${data.total_return_pct >= 0 ? "+" : ""}${fmt(data.total_return_pct)}%`,
        ];
        if (data.positions.length) {
          parts.push(
            "Positions: " + data.positions.map(p =>
              `${p.ticker} ${fmt(p.shares, 4)} shares @ avg $${fmt(p.avg_cost)}, now $${p.current_price != null ? fmt(p.current_price) : "N/A"}, P&L ${p.pl_pct >= 0 ? "+" : ""}${fmt(p.pl_pct)}%`
            ).join("; ")
          );
        }
        if (data.sp500_return_pct != null) {
          parts.push(`S&P 500 return since start: ${data.sp500_return_pct >= 0 ? "+" : ""}${fmt(data.sp500_return_pct)}%`);
        }
        onContextChange(parts.join("\n"));
      }
    } catch (e) {
      console.error("[PaperTrading] load error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadTrades() {
    try {
      const token = await getToken();
      const data: Trade[] = await fetchPaperHistory(userId, token);
      setTrades(data);
    } catch (e) {
      console.error("[PaperTrading] history error:", e);
    } finally {
      setTradesLoaded(true);
    }
  }

  useEffect(() => {
    if (userId) {
      loadPortfolio();
      loadTrades();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Debounced search
  useEffect(() => {
    setSearchResults([]);
    if (!searchQuery || searchQuery.length < 1) { setShowDropdown(false); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`${API_URL}/search-ticker?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const d = await res.json();
          const results: SearchResult[] = d.results || [];
          setSearchResults(results);
          if (results.length > 0) setShowDropdown(true);
        }
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  async function selectTicker(ticker: string) {
    setSelectedTicker(ticker);
    setSearchQuery(ticker);
    setShowDropdown(false);
    setBuyShares("");
    setBuyError("");
    setBuySuccess("");
    setSellShares("");
    setSellError("");
    setChartPeriod("1M");

    setStockLoading(true);
    setStockData(null);
    try {
      const res = await fetch(`${API_URL}/stock/${encodeURIComponent(ticker)}`);
      if (res.ok) setStockData(await res.json());
    } catch (e) {
      console.error("[PaperTrading] stock error:", e);
    } finally {
      setStockLoading(false);
    }

    fetchChart(ticker, "1M");
  }

  async function fetchChart(ticker: string, period: ChartPeriod) {
    setChartLoading(true);
    setChartData(null);
    try {
      const res = await fetch(`${API_URL}/stock/${encodeURIComponent(ticker)}/history?period=${period}`);
      if (res.ok) setChartData(await res.json());
    } catch (e) {
      console.error("[PaperTrading] chart error:", e);
    } finally {
      setChartLoading(false);
    }
  }

  function onChartPeriodChange(period: ChartPeriod) {
    setChartPeriod(period);
    if (selectedTicker) fetchChart(selectedTicker, period);
  }

  async function executeBuy() {
    const sharesNum = parseFloat(buyShares);
    if (!selectedTicker || !sharesNum || sharesNum <= 0) return;
    setBuyLoading(true);
    setBuyError("");
    setBuySuccess("");
    try {
      const token = await getToken();
      const result = await paperBuy(selectedTicker, sharesNum, token);
      setBuySuccess(`Bought ${sharesNum} share${sharesNum !== 1 ? "s" : ""} of ${selectedTicker} at $${fmt(result.price)}`);
      setBuyShares("");
      await Promise.all([loadPortfolio(), loadTrades()]);
    } catch (e: any) {
      setBuyError(e.message || "Trade failed. Try again.");
    } finally {
      setBuyLoading(false);
    }
  }

  async function executeSell() {
    const sharesNum = parseFloat(sellShares);
    if (!selectedTicker || !sharesNum || sharesNum <= 0) return;
    setSellLoading(true);
    setSellError("");
    try {
      const token = await getToken();
      await paperSell(selectedTicker, sharesNum, token);
      setSellShares("");
      await Promise.all([loadPortfolio(), loadTrades()]);
    } catch (e: any) {
      setSellError(e.message || "Trade failed. Try again.");
    } finally {
      setSellLoading(false);
    }
  }

  async function executeReset() {
    setResetLoading(true);
    try {
      const token = await getToken();
      await paperReset(token);
      setTrades([]);
      setSelectedTicker(null);
      setSearchQuery("");
      setStockData(null);
      setChartData(null);
      await loadPortfolio();
    } catch (e) {
      console.error("[PaperTrading] reset error:", e);
    } finally {
      setResetLoading(false);
      setShowResetModal(false);
    }
  }

  const selectedPosition = portfolio?.positions.find(p => p.ticker === selectedTicker) ?? null;
  const estimatedCost = stockData && parseFloat(buyShares) > 0
    ? stockData.current_price * parseFloat(buyShares) : null;

  const chartIsUp = chartData && chartData.prices.length >= 2
    ? chartData.prices[chartData.prices.length - 1] >= chartData.prices[0] : true;
  const chartLineColor = chartIsUp ? "#4caf7d" : "#e05c5c";
  const chartFillColor = chartIsUp
    ? dark ? "rgba(76,175,125,0.07)" : "rgba(76,175,125,0.1)"
    : dark ? "rgba(224,92,92,0.07)" : "rgba(224,92,92,0.1)";

  const gc = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
  const lc = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.1)";
  const fc = dark ? "rgba(232,224,204,0.35)" : "#4a4a4a";

  const sparkValues = tradesLoaded && portfolio
    ? computeSparklineValues(trades, portfolio.total_value) : [];

  const hasHoldings = (portfolio?.positions?.length ?? 0) > 0;
  const showEmptyState = !selectedTicker && !hasHoldings;

  const buyDisabled = buyLoading || !selectedTicker || !stockData || !buyShares || parseFloat(buyShares) <= 0;
  const sellDisabled = sellLoading || !sellShares || parseFloat(sellShares) <= 0;

  return (
    <>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .pt-grid {
          display: grid;
          grid-template-columns: 30% 45% 25%;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .pt-grid { grid-template-columns: 1fr; }
        }
        .pt-search-result:hover { background: var(--bg3) !important; }
        .pt-period-btn:hover { background: var(--bg3) !important; color: var(--text) !important; }
        .pt-table-row:hover { background: var(--bg2) !important; }
        .pt-trade-row:hover { background: var(--bg2) !important; }
        .pt-trade-btn:hover { border-color: var(--accent) !important; color: var(--accent) !important; }
      `}</style>

      <div className="pt-grid">

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Search */}
          <div ref={searchRef} style={{ position: "relative" }}>
            <div style={{ position: "relative" }}>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={searchQuery}
                onChange={e => {
                  const v = e.target.value;
                  setSearchQuery(v);
                  if (selectedTicker && v !== selectedTicker) {
                    setSelectedTicker(null);
                    setStockData(null);
                    setChartData(null);
                  }
                  if (!v) {
                    setBuyError("");
                    setBuySuccess("");
                  }
                }}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                placeholder="Search ticker or company..."
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "var(--bg2)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "9px 34px 9px 32px",
                  fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit",
                }}
              />
              {searchLoading && (
                <div style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  width: 12, height: 12, border: "1.5px solid var(--border2)",
                  borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite",
                }} />
              )}
            </div>

            <AnimatePresence initial={false}>
              {showDropdown && searchResults.length > 0 && (
                <motion.div
                  // initial={false} required -- do not remove
                  initial={false}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                    background: "var(--card-bg)", border: "1px solid var(--border)",
                    borderRadius: 8, zIndex: 200, overflow: "hidden",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  }}
                >
                  {searchResults.map((r, i) => (
                    <button
                      key={r.ticker}
                      className="pt-search-result"
                      onMouseDown={() => selectTicker(r.ticker)}
                      style={{
                        width: "100%", padding: "10px 14px",
                        background: "transparent", border: "none",
                        borderBottom: i < searchResults.length - 1 ? "0.5px solid var(--border)" : "none",
                        cursor: "pointer", textAlign: "left",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: "Space Mono, monospace" }}>
                          {r.ticker}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.name}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 9, color: "var(--text3)", letterSpacing: 0.5, textTransform: "uppercase",
                        background: "var(--bg3)", padding: "2px 6px", borderRadius: 3, flexShrink: 0,
                      }}>
                        {r.exchange}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mini stock card */}
          <AnimatePresence initial={false}>
            {selectedTicker && (
              <motion.div
                // initial={false} required -- do not remove
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}
              >
                {stockLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Skeleton width={90} height={22} />
                    <Skeleton width={130} height={12} />
                    <Skeleton height={6} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                      <Skeleton height={36} /><Skeleton height={36} />
                    </div>
                  </div>
                ) : stockData ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: "Space Mono, monospace", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
                        ${fmt(stockData.current_price)}
                      </span>
                      <span style={{ fontFamily: "Space Mono, monospace", fontSize: 12, fontWeight: 600, color: stockData.change_pct >= 0 ? "var(--green)" : "var(--red)" }}>
                        {stockData.change_pct >= 0 ? "+" : ""}{fmt(stockData.change_pct)}%
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {stockData.name}
                    </div>

                    {/* 52W range bar */}
                    {stockData.week52_high > 0 && stockData.week52_low > 0 && (() => {
                      const pct = Math.min(100, Math.max(0,
                        (stockData.current_price - stockData.week52_low) /
                        (stockData.week52_high - stockData.week52_low) * 100
                      ));
                      return (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ height: 4, background: "var(--bg3)", borderRadius: 2, position: "relative", marginBottom: 5 }}>
                            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "var(--accent)", borderRadius: 2 }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>
                            <span>52W L: ${fmt(stockData.week52_low)}</span>
                            <span>52W H: ${fmt(stockData.week52_high)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { label: "P/E", value: stockData.pe_ratio > 0 ? fmt(stockData.pe_ratio) : "N/A", color: undefined },
                        { label: "1D Change", value: `${stockData.change >= 0 ? "+" : ""}$${fmt(Math.abs(stockData.change))}`, color: stockData.change >= 0 ? "var(--green)" : "var(--red)" },
                      ].map(item => (
                        <div key={item.label} style={{ background: "var(--bg2)", borderRadius: 6, padding: "8px 10px" }}>
                          <div style={{ fontSize: 9, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
                            {item.label}
                          </div>
                          <div style={{ fontFamily: "Space Mono, monospace", fontSize: 12, fontWeight: 600, color: item.color ?? "var(--text)" }}>
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buy panel */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Buy{selectedTicker ? ` ${selectedTicker}` : ""}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4 }}>Shares</label>
                <input
                  value={buyShares}
                  onChange={e => { setBuyShares(e.target.value); setBuyError(""); setBuySuccess(""); }}
                  placeholder="0"
                  type="number"
                  min="0"
                  step="any"
                  disabled={!selectedTicker}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "var(--bg2)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "8px 10px",
                    fontSize: 13, fontFamily: "Space Mono, monospace",
                    color: "var(--text)", outline: "none",
                    opacity: !selectedTicker ? 0.45 : 1,
                  }}
                />
              </div>

              <div style={{ background: "var(--bg2)", borderRadius: 6, padding: "8px 10px", fontSize: 11, minHeight: 34 }}>
                {stockLoading ? (
                  <Skeleton width={100} height={13} />
                ) : estimatedCost != null ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text3)" }}>Est. total</span>
                    <span style={{ fontFamily: "Space Mono, monospace", fontWeight: 700, color: "var(--text)" }}>
                      ${fmt(estimatedCost)}
                    </span>
                  </div>
                ) : selectedTicker && stockData ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text3)" }}>Current price</span>
                    <span style={{ fontFamily: "Space Mono, monospace", color: "var(--text2)" }}>${fmt(stockData.current_price)}</span>
                  </div>
                ) : (
                  <span style={{ color: "var(--text3)" }}>
                    {selectedTicker ? "Loading price..." : "Select a ticker first"}
                  </span>
                )}
              </div>

              {buyError && <div style={{ fontSize: 11, color: "var(--red)" }}>{buyError}</div>}
              {buySuccess && <div style={{ fontSize: 11, color: "var(--green)" }}>{buySuccess}</div>}

              <button
                onClick={executeBuy}
                disabled={buyDisabled}
                style={{
                  width: "100%", padding: "10px 0",
                  background: "var(--accent)", border: "none", borderRadius: 6,
                  fontSize: 13, fontWeight: 600, color: "var(--bg)",
                  cursor: buyDisabled ? "not-allowed" : "pointer",
                  opacity: buyDisabled ? 0.45 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {buyLoading ? "Executing..." : "Buy"}
              </button>
            </div>
          </div>

          {/* Sell panel */}
          <AnimatePresence initial={false}>
            {selectedTicker && selectedPosition && (
              <motion.div
                // initial={false} required -- do not remove
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Sell {selectedTicker}
                </div>

                <div style={{ background: "var(--bg2)", borderRadius: 6, padding: "10px 12px", marginBottom: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Shares", value: fmt(selectedPosition.shares, 4), color: undefined },
                      { label: "Avg Cost", value: `$${fmt(selectedPosition.avg_cost)}`, color: undefined },
                      { label: "Value", value: `$${fmt(selectedPosition.current_value)}`, color: undefined },
                      {
                        label: "P&L",
                        value: `${selectedPosition.pl_pct >= 0 ? "+" : ""}${fmt(selectedPosition.pl_pct)}%`,
                        color: selectedPosition.pl_dollar >= 0 ? "var(--green)" : "var(--red)",
                      },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ fontSize: 9, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                          {item.label}
                        </div>
                        <div style={{ fontFamily: "Space Mono, monospace", fontSize: 12, fontWeight: 600, color: item.color ?? "var(--text)" }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input
                    value={sellShares}
                    onChange={e => { setSellShares(e.target.value); setSellError(""); }}
                    placeholder="Shares to sell"
                    type="number"
                    min="0"
                    step="any"
                    style={{
                      flex: 1, background: "var(--bg2)", border: "1px solid var(--border)",
                      borderRadius: 6, padding: "8px 10px",
                      fontSize: 13, fontFamily: "Space Mono, monospace",
                      color: "var(--text)", outline: "none",
                    }}
                  />
                  <button
                    onClick={() => setSellShares(String(selectedPosition.shares))}
                    style={{
                      padding: "8px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: "var(--bg3)", border: "1px solid var(--border)",
                      color: "var(--text2)", cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    Sell All
                  </button>
                </div>

                {sellError && <div style={{ fontSize: 11, color: "var(--red)", marginBottom: 8 }}>{sellError}</div>}

                <button
                  onClick={executeSell}
                  disabled={sellDisabled}
                  style={{
                    width: "100%", padding: "10px 0",
                    background: "var(--red)", border: "none", borderRadius: 6,
                    fontSize: 13, fontWeight: 600, color: "#fff",
                    cursor: sellDisabled ? "not-allowed" : "pointer",
                    opacity: sellDisabled ? 0.45 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {sellLoading ? "Executing..." : "Sell"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── CENTER COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {selectedTicker ? (
            <>
              {/* Price chart */}
              <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontFamily: "Space Mono, monospace", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                      {selectedTicker}
                    </span>
                    {stockData && !stockLoading && (
                      <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {stockData.name}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    {CHART_PERIODS.map(p => (
                      <button
                        key={p}
                        className="pt-period-btn"
                        onClick={() => onChartPeriodChange(p)}
                        style={{
                          padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                          border: "none", cursor: "pointer",
                          background: chartPeriod === p ? "var(--accent)" : "transparent",
                          color: chartPeriod === p ? "var(--bg)" : "var(--text3)",
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ minHeight: 240 }}>
                  {chartLoading ? (
                    <div style={{ padding: 16 }}><Skeleton height={224} /></div>
                  ) : chartData && chartData.prices.length > 0 ? (
                    <Plot
                      data={[{
                        x: chartData.dates,
                        y: chartData.prices,
                        type: "scatter",
                        mode: "lines",
                        line: { color: chartLineColor, width: 2 },
                        fill: "tozeroy",
                        fillcolor: chartFillColor,
                        hovertemplate: "$%{y:,.2f}<extra></extra>",
                      }]}
                      layout={{
                        paper_bgcolor: "transparent",
                        plot_bgcolor: "transparent",
                        margin: { t: 8, b: 36, l: 52, r: 12 },
                        height: 240,
                        font: { color: fc, family: "Space Mono, monospace", size: 9 },
                        xaxis: { gridcolor: gc, linecolor: lc, tickcolor: "transparent", showgrid: false },
                        yaxis: { gridcolor: gc, linecolor: lc, tickcolor: "transparent", tickprefix: "$", tickformat: ",.2f" },
                        hoverlabel: {
                          bgcolor: dark ? "#0d1117" : "#fff",
                          bordercolor: chartLineColor,
                          font: { color: dark ? "#e8e0cc" : "#111", family: "Space Mono, monospace", size: 11 },
                        },
                        showlegend: false,
                      }}
                      config={{ displayModeBar: false, responsive: true }}
                      style={{ width: "100%" }}
                      useResizeHandler
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, fontSize: 12, color: "var(--text3)" }}>
                      No chart data available
                    </div>
                  )}
                </div>
              </div>

              {/* Key stats */}
              <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--border)" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Key Stats
                  </span>
                </div>
                {stockLoading ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} style={{ padding: "10px 14px" }}>
                        <Skeleton width={50} height={9} />
                        <div style={{ marginTop: 5 }}><Skeleton width={70} height={13} /></div>
                      </div>
                    ))}
                  </div>
                ) : stockData ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
                    {[
                      { label: "Market Cap", value: fmtLarge(stockData.market_cap) },
                      { label: "P/E Ratio", value: stockData.pe_ratio > 0 ? fmt(stockData.pe_ratio) : "N/A" },
                      { label: "EPS", value: stockData.eps ? `$${fmt(stockData.eps)}` : "N/A" },
                      {
                        label: "Volume",
                        value: stockData.volume > 0
                          ? stockData.volume >= 1e6 ? `${(stockData.volume / 1e6).toFixed(1)}M` : stockData.volume.toLocaleString()
                          : "N/A",
                      },
                      { label: "52W High", value: `$${fmt(stockData.week52_high)}` },
                      { label: "52W Low", value: `$${fmt(stockData.week52_low)}` },
                    ].map(stat => (
                      <div key={stat.label} style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--border)", borderRight: "0.5px solid var(--border)" }}>
                        <div style={{ fontSize: 9, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                          {stat.label}
                        </div>
                        <div style={{ fontFamily: "Space Mono, monospace", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : showEmptyState ? (
            /* Empty state */
            <div style={{
              background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8,
              padding: "64px 32px", textAlign: "center", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 16,
            }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--border2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                  Start trading with virtual cash
                </div>
                <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.65 }}>
                  Search for a stock on the left to begin.{" "}
                  {loading ? null : (
                    <>
                      You have{" "}
                      <span style={{ fontFamily: "Space Mono, monospace", color: "var(--accent)", fontWeight: 700 }}>
                        ${fmt(portfolio?.cash ?? 10000)}
                      </span>{" "}
                      in virtual cash.
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Holdings table */
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Holdings</span>
                {!loading && portfolio && (
                  <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>
                    {portfolio.positions.length} position{portfolio.positions.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {loading ? (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[1, 2, 3].map(i => <Skeleton key={i} height={44} />)}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["Ticker", "Shares", "Avg Cost", "Price", "Value", "P&L ($)", "P&L (%)", ""].map(h => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 9, color: "var(--text3)", fontWeight: 500, whiteSpace: "nowrap", letterSpacing: 0.4, textTransform: "uppercase" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio?.positions.map(pos => (
                        <tr key={pos.ticker} className="pt-table-row" style={{ borderBottom: "0.5px solid var(--border)" }}>
                          <td style={{ padding: "10px 10px", fontFamily: "Space Mono, monospace", fontWeight: 700, color: "var(--text)" }}>
                            {pos.ticker}
                          </td>
                          <td style={{ padding: "10px 10px", fontFamily: "Space Mono, monospace", color: "var(--text2)" }}>
                            {fmt(pos.shares, 4)}
                          </td>
                          <td style={{ padding: "10px 10px", fontFamily: "Space Mono, monospace", color: "var(--text2)" }}>
                            ${fmt(pos.avg_cost)}
                          </td>
                          <td style={{ padding: "10px 10px", fontFamily: "Space Mono, monospace", color: "var(--text2)" }}>
                            {pos.current_price != null ? `$${fmt(pos.current_price)}` : "--"}
                          </td>
                          <td style={{ padding: "10px 10px", fontFamily: "Space Mono, monospace", color: "var(--text)" }}>
                            ${fmt(pos.current_value)}
                          </td>
                          <td style={{ padding: "10px 10px", fontFamily: "Space Mono, monospace", color: pos.pl_dollar >= 0 ? "var(--green)" : "var(--red)" }}>
                            {pos.pl_dollar >= 0 ? "+" : ""}${fmt(Math.abs(pos.pl_dollar))}
                          </td>
                          <td style={{ padding: "10px 10px", fontFamily: "Space Mono, monospace", color: pos.pl_pct >= 0 ? "var(--green)" : "var(--red)" }}>
                            {pos.pl_pct >= 0 ? "+" : ""}{fmt(pos.pl_pct)}%
                          </td>
                          <td style={{ padding: "10px 10px" }}>
                            <button
                              className="pt-trade-btn"
                              onClick={() => selectTicker(pos.ticker)}
                              style={{
                                fontSize: 10, padding: "4px 10px", borderRadius: 4,
                                background: "transparent", border: "1px solid var(--border2)",
                                color: "var(--text2)", cursor: "pointer", transition: "all 0.15s",
                              }}
                            >
                              Trade
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Portfolio summary */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Portfolio
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "0.5px solid var(--border)" }}>
                    <Skeleton width={70} height={10} />
                    <Skeleton width={55} height={13} />
                  </div>
                ))}
              </div>
            ) : portfolio ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { label: "Total Value", value: `$${fmt(portfolio.total_value)}`, size: 18, bold: true, color: undefined },
                  { label: "Cash Available", value: `$${fmt(portfolio.cash)}`, size: 13, bold: false, color: undefined },
                  { label: "Invested", value: `$${fmt(portfolio.total_holdings_value)}`, size: 13, bold: false, color: undefined },
                  {
                    label: "Total Return",
                    value: `${portfolio.total_return_pct >= 0 ? "+" : ""}${fmt(portfolio.total_return_pct)}%`,
                    size: 15, bold: true,
                    color: portfolio.total_return_pct >= 0 ? "var(--green)" : "var(--red)",
                  },
                  ...(portfolio.sp500_return_pct != null ? [{
                    label: "vs S&P 500",
                    value: `${(portfolio.total_return_pct - portfolio.sp500_return_pct) >= 0 ? "+" : ""}${fmt(portfolio.total_return_pct - portfolio.sp500_return_pct)}%`,
                    size: 12, bold: false,
                    color: (portfolio.total_return_pct - portfolio.sp500_return_pct) >= 0 ? "var(--green)" : "var(--red)",
                  }] : []),
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid var(--border)" }}>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>{item.label}</span>
                    <span style={{ fontFamily: "Space Mono, monospace", fontSize: item.size, fontWeight: item.bold ? 700 : 600, color: item.color ?? "var(--text)" }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Sparkline */}
          {tradesLoaded && portfolio && sparkValues.length >= 2 && (
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Value Over Time
              </div>
              <Sparkline values={sparkValues} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, fontFamily: "Space Mono, monospace", color: "var(--text3)" }}>
                <span>Start: $10,000</span>
                <span style={{ color: portfolio.total_return_pct >= 0 ? "var(--green)" : "var(--red)" }}>
                  Now: ${fmt(portfolio.total_value)}
                </span>
              </div>
            </div>
          )}

          {/* Trade History */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Trade History</span>
              {trades.length > 0 && (
                <span style={{ fontSize: 9, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>
                  {trades.length}
                </span>
              )}
            </div>

            <div style={{ maxHeight: 300, overflowY: "auto", overscrollBehavior: "contain" }}>
              {!tradesLoaded ? (
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[1, 2, 3].map(i => <Skeleton key={i} height={48} />)}
                </div>
              ) : trades.length === 0 ? (
                <div style={{ padding: "24px 14px", fontSize: 11, color: "var(--text3)", textAlign: "center" }}>
                  No trades yet
                </div>
              ) : (
                <div>
                  {trades.map(t => (
                    <div
                      key={t.id}
                      className="pt-trade-row"
                      style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 8 }}
                    >
                      <div style={{
                        marginTop: 2, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
                        padding: "2px 6px", borderRadius: 3, flexShrink: 0,
                        background: t.action === "buy" ? "rgba(76,175,125,0.12)" : "rgba(224,92,92,0.12)",
                        color: t.action === "buy" ? "var(--green)" : "var(--red)",
                      }}>
                        {t.action}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                            {t.ticker}
                          </span>
                          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 11, fontWeight: 600, color: "var(--text)" }}>
                            ${fmt(t.total)}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                          <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>
                            {fmt(t.shares, 4)} sh @ ${fmt(t.price)}
                          </span>
                          <span style={{ fontSize: 9, color: "var(--text3)" }}>
                            {fmtDate(t.executed_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={() => setShowResetModal(true)}
            style={{
              width: "100%", padding: "8px 0",
              background: "transparent", border: "1px solid var(--border)",
              borderRadius: 6, fontSize: 11, color: "var(--text3)",
              cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.borderColor = "var(--red)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            Reset Portfolio
          </button>
        </div>
      </div>

      {/* Reset modal */}
      <AnimatePresence initial={false}>
        {showResetModal && (
          <motion.div
            // initial={false} required -- do not remove
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed", inset: 0, zIndex: 2000,
              background: "rgba(0,0,0,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onClick={() => setShowResetModal(false)}
          >
            <motion.div
              // initial={false} required -- do not remove
              initial={false}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "var(--card-bg)", border: "1px solid var(--border)",
                borderRadius: 12, padding: 24, maxWidth: 380, width: "90%",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
                Reset Paper Portfolio
              </div>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 20 }}>
                This will reset your portfolio to $10,000 in virtual cash and clear all trade history.
                This action cannot be undone.
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowResetModal(false)}
                  style={{
                    padding: "8px 16px", borderRadius: 6, fontSize: 13,
                    background: "transparent", border: "1px solid var(--border)",
                    color: "var(--text2)", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={executeReset}
                  disabled={resetLoading}
                  style={{
                    padding: "8px 16px", borderRadius: 6, fontSize: 13,
                    background: "var(--red)", border: "none",
                    color: "#fff", cursor: resetLoading ? "not-allowed" : "pointer",
                    opacity: resetLoading ? 0.6 : 1,
                  }}
                >
                  {resetLoading ? "Resetting..." : "Reset"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
