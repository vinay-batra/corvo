"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { fetchPaperPortfolio, fetchPaperHistory, paperBuy, paperSell, paperReset } from "../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Skeleton({ width, height = 16 }: { width?: number | string; height?: number }) {
  return (
    <div style={{
      width: width ?? "100%", height, borderRadius: 4,
      background: "var(--bg3)", animation: "pulse 1.5s infinite",
    }} />
  );
}

export default function PaperTrading({
  userId,
  onContextChange,
}: {
  userId: string;
  onContextChange?: (ctx: string) => void;
}) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Buy panel
  const [buyTicker, setBuyTicker] = useState("");
  const [buyShares, setBuyShares] = useState("");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [buySuccess, setBuySuccess] = useState("");

  // Sell panel
  const [sellTicker, setSellTicker] = useState<string | null>(null);
  const [sellShares, setSellShares] = useState("");
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError, setSellError] = useState("");

  const priceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        } else {
          parts.push("No positions held.");
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

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const token = await getToken();
      const data: Trade[] = await fetchPaperHistory(userId, token);
      setTrades(data);
    } catch (e) {
      console.error("[PaperTrading] history error:", e);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (userId) loadPortfolio();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Debounce live price fetch when buyTicker changes
  useEffect(() => {
    setLivePrice(null);
    if (!buyTicker || buyTicker.length < 1) return;
    if (priceTimerRef.current) clearTimeout(priceTimerRef.current);
    priceTimerRef.current = setTimeout(async () => {
      setPriceLoading(true);
      try {
        const res = await fetch(`${API_URL}/stock/${encodeURIComponent(buyTicker.toUpperCase())}`);
        if (res.ok) {
          const d = await res.json();
          setLivePrice(d.price ?? null);
        } else {
          setLivePrice(null);
        }
      } catch {
        setLivePrice(null);
      } finally {
        setPriceLoading(false);
      }
    }, 600);
    return () => { if (priceTimerRef.current) clearTimeout(priceTimerRef.current); };
  }, [buyTicker]);

  async function executeBuy() {
    const sharesNum = parseFloat(buyShares);
    if (!buyTicker || !sharesNum || sharesNum <= 0) return;
    setBuyLoading(true);
    setBuyError("");
    setBuySuccess("");
    try {
      const token = await getToken();
      const result = await paperBuy(buyTicker.toUpperCase(), sharesNum, token);
      setBuySuccess(`Bought ${sharesNum} share${sharesNum !== 1 ? "s" : ""} of ${buyTicker.toUpperCase()} at $${fmt(result.price)}`);
      setBuyTicker("");
      setBuyShares("");
      setLivePrice(null);
      await loadPortfolio();
    } catch (e: any) {
      setBuyError(e.message || "Trade failed. Try again.");
    } finally {
      setBuyLoading(false);
    }
  }

  async function executeSell() {
    const sharesNum = parseFloat(sellShares);
    if (!sellTicker || !sharesNum || sharesNum <= 0) return;
    setSellLoading(true);
    setSellError("");
    try {
      const token = await getToken();
      await paperSell(sellTicker, sharesNum, token);
      setSellTicker(null);
      setSellShares("");
      await loadPortfolio();
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
      setHistoryOpen(false);
      await loadPortfolio();
    } catch (e) {
      console.error("[PaperTrading] reset error:", e);
    } finally {
      setResetLoading(false);
      setShowResetModal(false);
    }
  }

  const estimatedCost = livePrice && parseFloat(buyShares) > 0
    ? livePrice * parseFloat(buyShares)
    : null;

  const selectedPosition = portfolio?.positions.find(p => p.ticker === sellTicker);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary bar */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
      }}>
        {([
          {
            label: "Portfolio Value",
            value: loading ? null : `$${fmt(portfolio?.total_value ?? 0)}`,
          },
          {
            label: "Cash Available",
            value: loading ? null : `$${fmt(portfolio?.cash ?? 0)}`,
          },
          {
            label: "Total Return",
            value: loading ? null : `${(portfolio?.total_return_pct ?? 0) >= 0 ? "+" : ""}${fmt(portfolio?.total_return_pct ?? 0)}%`,
            color: loading ? undefined : (portfolio?.total_return_pct ?? 0) >= 0 ? "var(--green)" : "var(--red)",
          },
          {
            label: "vs S&P 500",
            value: loading ? null : portfolio?.sp500_return_pct != null
              ? `${(portfolio.total_return_pct - portfolio.sp500_return_pct) >= 0 ? "+" : ""}${fmt(portfolio.total_return_pct - portfolio.sp500_return_pct)}%`
              : "--",
            color: loading || portfolio?.sp500_return_pct == null ? undefined
              : (portfolio.total_return_pct - portfolio.sp500_return_pct) >= 0 ? "var(--green)" : "var(--red)",
          },
        ] as { label: string; value: string | null; color?: string }[]).map(card => (
          <div key={card.label} style={{
            background: "var(--card-bg)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {card.label}
            </div>
            {card.value == null
              ? <Skeleton width={80} height={20} />
              : <div style={{ fontFamily: "Space Mono, monospace", fontSize: 18, fontWeight: 700, color: card.color ?? "var(--text)" }}>
                  {card.value}
                </div>
            }
          </div>
        ))}
      </div>

      {/* Two-column layout: holdings + buy panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        {/* Holdings table */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Holdings</span>
            {!loading && portfolio && portfolio.positions.length > 0 && (
              <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>
                {portfolio.positions.length} position{portfolio.positions.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3].map(i => <Skeleton key={i} height={40} />)}
            </div>
          ) : !portfolio || portfolio.positions.length === 0 ? (
            <div style={{ padding: "32px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>
                You have{" "}
                <span style={{ fontFamily: "Space Mono, monospace", color: "var(--accent)", fontWeight: 700 }}>
                  ${fmt(portfolio?.cash ?? 10000)}
                </span>{" "}
                in virtual cash. Use the buy panel to start trading.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Ticker", "Shares", "Avg Cost", "Price", "Value", "P&L ($)", "P&L (%)", ""].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "var(--text3)", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {portfolio.positions.map(pos => (
                    <tr key={pos.ticker} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "Space Mono, monospace", fontWeight: 700, color: "var(--text)" }}>
                        {pos.ticker}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "Space Mono, monospace", color: "var(--text2)" }}>
                        {fmt(pos.shares, 4)}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "Space Mono, monospace", color: "var(--text2)" }}>
                        ${fmt(pos.avg_cost)}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "Space Mono, monospace", color: "var(--text2)" }}>
                        {pos.current_price != null ? `$${fmt(pos.current_price)}` : "--"}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "Space Mono, monospace", color: "var(--text)" }}>
                        ${fmt(pos.current_value)}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "Space Mono, monospace", color: pos.pl_dollar >= 0 ? "var(--green)" : "var(--red)" }}>
                        {pos.pl_dollar >= 0 ? "+" : ""}{fmt(pos.pl_dollar)}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "Space Mono, monospace", color: pos.pl_pct >= 0 ? "var(--green)" : "var(--red)" }}>
                        {pos.pl_pct >= 0 ? "+" : ""}{fmt(pos.pl_pct)}%
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          onClick={() => { setSellTicker(pos.ticker); setSellShares(""); setSellError(""); }}
                          style={{
                            fontSize: 11, padding: "4px 10px", borderRadius: 4,
                            background: "transparent", border: "1px solid var(--border2)",
                            color: "var(--text2)", cursor: "pointer",
                          }}
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Buy panel + sell panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Buy panel */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 14 }}>Buy</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text3)", display: "block", marginBottom: 4 }}>Ticker</label>
                <input
                  value={buyTicker}
                  onChange={e => { setBuyTicker(e.target.value.toUpperCase()); setBuyError(""); setBuySuccess(""); }}
                  placeholder="AAPL"
                  maxLength={10}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "var(--bg2)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "8px 10px",
                    fontSize: 13, fontFamily: "Space Mono, monospace",
                    color: "var(--text)", outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: "var(--text3)", display: "block", marginBottom: 4 }}>Shares</label>
                <input
                  value={buyShares}
                  onChange={e => { setBuyShares(e.target.value); setBuyError(""); setBuySuccess(""); }}
                  placeholder="0"
                  type="number"
                  min="0"
                  step="any"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "var(--bg2)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "8px 10px",
                    fontSize: 13, fontFamily: "Space Mono, monospace",
                    color: "var(--text)", outline: "none",
                  }}
                />
              </div>

              {/* Estimated cost */}
              <div style={{
                background: "var(--bg2)", borderRadius: 6, padding: "10px 12px",
                fontSize: 12, color: "var(--text3)", minHeight: 38,
              }}>
                {priceLoading ? (
                  <Skeleton width={120} height={14} />
                ) : buyTicker && livePrice ? (
                  <span>
                    <span style={{ fontFamily: "Space Mono, monospace", color: "var(--text2)" }}>
                      {buyShares && parseFloat(buyShares) > 0
                        ? `${buyShares} share${parseFloat(buyShares) !== 1 ? "s" : ""} of ${buyTicker} at $${fmt(livePrice)} = `
                        : `${buyTicker} at $${fmt(livePrice)}`}
                    </span>
                    {estimatedCost != null && (
                      <span style={{ fontFamily: "Space Mono, monospace", fontWeight: 700, color: "var(--text)" }}>
                        ${fmt(estimatedCost)}
                      </span>
                    )}
                  </span>
                ) : buyTicker && !priceLoading ? (
                  <span style={{ color: "var(--text3)" }}>Enter a valid ticker to see price</span>
                ) : (
                  <span>Enter ticker and shares to see cost estimate</span>
                )}
              </div>

              {buyError && (
                <div style={{ fontSize: 12, color: "var(--red)", padding: "6px 0" }}>{buyError}</div>
              )}
              {buySuccess && (
                <div style={{ fontSize: 12, color: "var(--green)", padding: "6px 0" }}>{buySuccess}</div>
              )}

              <button
                onClick={executeBuy}
                disabled={buyLoading || !buyTicker || !buyShares || parseFloat(buyShares) <= 0}
                style={{
                  width: "100%", padding: "10px 0",
                  background: "var(--accent)", border: "none", borderRadius: 6,
                  fontSize: 13, fontWeight: 600, color: "var(--bg)",
                  cursor: buyLoading || !buyTicker || !buyShares || parseFloat(buyShares) <= 0 ? "not-allowed" : "pointer",
                  opacity: buyLoading || !buyTicker || !buyShares || parseFloat(buyShares) <= 0 ? 0.5 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {buyLoading ? "Executing..." : "Buy"}
              </button>
            </div>
          </div>

          {/* Sell panel (shown when a position is selected) */}
          <AnimatePresence initial={false}>
            {sellTicker && selectedPosition && (
              <motion.div
                // initial={false} required -- do not remove
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    Sell {sellTicker}
                  </div>
                  <button
                    onClick={() => { setSellTicker(null); setSellShares(""); setSellError(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 16, lineHeight: 1 }}
                  >
                    x
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>
                  Own{" "}
                  <span style={{ fontFamily: "Space Mono, monospace", color: "var(--text)" }}>
                    {fmt(selectedPosition.shares, 4)} shares
                  </span>{" "}
                  @ avg{" "}
                  <span style={{ fontFamily: "Space Mono, monospace", color: "var(--text)" }}>
                    ${fmt(selectedPosition.avg_cost)}
                  </span>
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
                      padding: "8px 10px", borderRadius: 6, fontSize: 11,
                      background: "var(--bg3)", border: "1px solid var(--border)",
                      color: "var(--text2)", cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    All
                  </button>
                </div>
                {sellError && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 8 }}>{sellError}</div>}
                <button
                  onClick={executeSell}
                  disabled={sellLoading || !sellShares || parseFloat(sellShares) <= 0}
                  style={{
                    width: "100%", padding: "10px 0",
                    background: "var(--red)", border: "none", borderRadius: 6,
                    fontSize: 13, fontWeight: 600, color: "#fff",
                    cursor: sellLoading || !sellShares || parseFloat(sellShares) <= 0 ? "not-allowed" : "pointer",
                    opacity: sellLoading || !sellShares || parseFloat(sellShares) <= 0 ? 0.5 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {sellLoading ? "Executing..." : "Sell"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reset button */}
          <button
            onClick={() => setShowResetModal(true)}
            style={{
              width: "100%", padding: "8px 0",
              background: "transparent", border: "1px solid var(--border)",
              borderRadius: 6, fontSize: 12, color: "var(--text3)",
              cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.borderColor = "var(--red)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            Reset Portfolio
          </button>
        </div>
      </div>

      {/* Trade history */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <button
          onClick={() => {
            const next = !historyOpen;
            setHistoryOpen(next);
            if (next && trades.length === 0) loadHistory();
          }}
          style={{
            width: "100%", padding: "14px 16px",
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Trade History</span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: historyOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <AnimatePresence initial={false}>
          {historyOpen && (
            <motion.div
              // initial={false} required -- do not remove
              initial={false}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ borderTop: "1px solid var(--border)" }}>
                {historyLoading ? (
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} height={32} />)}
                  </div>
                ) : trades.length === 0 ? (
                  <div style={{ padding: "20px 16px", fontSize: 13, color: "var(--text3)", textAlign: "center" }}>
                    No trades yet.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          {["Date", "Action", "Ticker", "Shares", "Price", "Total"].map(h => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "var(--text3)", fontWeight: 500 }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map(t => (
                          <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "8px 12px", color: "var(--text3)", whiteSpace: "nowrap" }}>{fmtDate(t.executed_at)}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{
                                fontSize: 11, fontWeight: 600,
                                color: t.action === "buy" ? "var(--green)" : "var(--red)",
                                textTransform: "uppercase",
                              }}>
                                {t.action}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px", fontFamily: "Space Mono, monospace", fontWeight: 700, color: "var(--text)" }}>
                              {t.ticker}
                            </td>
                            <td style={{ padding: "8px 12px", fontFamily: "Space Mono, monospace", color: "var(--text2)" }}>
                              {fmt(t.shares, 4)}
                            </td>
                            <td style={{ padding: "8px 12px", fontFamily: "Space Mono, monospace", color: "var(--text2)" }}>
                              ${fmt(t.price)}
                            </td>
                            <td style={{ padding: "8px 12px", fontFamily: "Space Mono, monospace", color: "var(--text)" }}>
                              ${fmt(t.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reset confirmation modal */}
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
              exit={{ scale: 0.95, opacity: 0 }}
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
                This cannot be undone.
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
    </div>
  );
}
