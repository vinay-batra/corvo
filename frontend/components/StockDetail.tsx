"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Eye, EyeOff, TrendingUp, CandlestickChart as CandleIcon } from "lucide-react";
import InfoModal from "./InfoModal";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const STORAGE_KEY = "corvo_watchlist";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AMBER = "#b8860b";
const GREEN = "#4caf7d";
const RED   = "#e05c5c";

const PERIODS = ["1D", "1W", "1M", "3M", "1Y", "5Y"] as const;
type Period = typeof PERIODS[number];
type ChartType = "line" | "candlestick";

const RATING_COLOR: Record<string, string> = {
  "Strong Buy": GREEN, "Buy": "#6bcf97", "Hold": "#b8860b",
  "Sell": RED, "Strong Sell": "#b33", "N/A": "var(--text3)",
};

function fmt(n: number | null | undefined, prefix = "", suffix = "", decimals = 2): string {
  if (n === null || n === undefined || isNaN(n as number)) return "-";
  if (Math.abs(n) >= 1e12) return `${prefix}${(n / 1e12).toFixed(1)}T${suffix}`;
  if (Math.abs(n) >= 1e9)  return `${prefix}${(n / 1e9).toFixed(1)}B${suffix}`;
  if (Math.abs(n) >= 1e6)  return `${prefix}${(n / 1e6).toFixed(1)}M${suffix}`;
  return `${prefix}${n.toFixed(decimals)}${suffix}`;
}

type RowTooltip = { title: string; sections: { label: string; text: string }[] };

function Row({ label, value, color, tooltip }: { label: string; value: string; color?: string; tooltip?: RowTooltip }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid var(--border)" }}>
      <span style={{ fontSize: 11, color: "var(--text3)", display: "flex", alignItems: "center", gap: 5 }}>
        {label}
        {tooltip && <InfoModal title={tooltip.title} sections={tooltip.sections} />}
      </span>
      <span style={{ fontSize: 11, fontFamily: "Space Mono, monospace", fontWeight: 600, color: color || "var(--text)" }}>{value}</span>
    </div>
  );
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px 16px", background: "var(--card-bg)", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 2, height: 12, background: AMBER, borderRadius: 1, flexShrink: 0 }} />
        <p style={{ fontSize: 8, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase", margin: 0 }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function Skel({ h, w = "100%" }: { h: number; w?: string | number }) {
  return <div style={{ height: h, width: w, borderRadius: 6, background: "var(--bg3)", animation: "sdPulse 1.5s ease-in-out infinite" }} />;
}

interface StockInfo {
  ticker: string; name: string;
  current_price: number; change: number; change_pct: number;
  bid: number | null; ask: number | null;
  market_cap: number; pe_ratio: number | null; forward_pe: number | null;
  eps: number | null; eps_forward: number | null; dividend_yield: number | null;
  week52_high: number | null; week52_low: number | null;
  volume: number; avg_volume: number; beta: number | null;
  price_to_book: number | null; revenue: number | null; net_income: number | null;
  analyst_rating: string;
  analyst_buy: number | null; analyst_hold: number | null; analyst_sell: number | null;
  num_analysts: number | null;
  target_mean: number | null; target_high: number | null; target_low: number | null;
  sector: string; industry: string;
  chart_1d: { t: string; p: number }[];
  earnings_date: string | null;
  revenue_growth: number | null; profit_margin: number | null;
  gross_margin: number | null; operating_margin: number | null;
  debt_to_equity: number | null; current_ratio: number | null;
  free_cashflow: number | null;
  short_ratio: number | null; insider_ownership: number | null;
  similar_stocks: { ticker: string; price: number; change_pct: number }[];
}

// ── Options Chain ─────────────────────────────────────────────────────────────
interface OptionContract {
  strike: number;
  lastPrice: number | null;
  bid: number | null;
  ask: number | null;
  volume: number;
  openInterest: number;
  impliedVolatility: number | null;
  inTheMoney: boolean;
  delta: number | null;
}
interface OptionsData {
  ticker: string;
  current_price: number;
  expiration_dates: string[];
  selected_date: string;
  calls: OptionContract[];
  puts: OptionContract[];
}

function calcMaxPain(calls: OptionContract[], puts: OptionContract[]): number | null {
  const strikeSet = new Set([...calls.map(c => c.strike), ...puts.map(p => p.strike)]);
  const strikes = Array.from(strikeSet).sort((a, b) => a - b);
  if (!strikes.length) return null;
  let minPain = Infinity, maxPainStrike = strikes[0];
  for (const k of strikes) {
    let pain = 0;
    for (const c of calls)  pain += Math.max(k - c.strike, 0) * c.openInterest;
    for (const p of puts)   pain += Math.max(p.strike - k, 0) * p.openInterest;
    if (pain < minPain) { minPain = pain; maxPainStrike = k; }
  }
  return maxPainStrike;
}

function fmtOpt(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n as number)) return "-";
  return n.toFixed(2);
}

function OptionsChain({ ticker, currentPrice }: { ticker: string; currentPrice: number }) {
  const [data, setData]           = useState<OptionsData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [selDate, setSelDate]     = useState<string>("");
  const [dateLoading, setDateLoading] = useState(false);
  const [tooltip, setTooltip]     = useState(false);

  // Initial load
  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`${API_URL}/options/${ticker}`)
      .then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.detail || "No options data"); }); return r.json(); })
      .then(d => { setData(d); setSelDate(d.selected_date); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  // Expiry date change
  const changeDate = async (date: string) => {
    if (date === selDate || !data) return;
    setSelDate(date); setDateLoading(true);
    try {
      const r = await fetch(`${API_URL}/options/${ticker}?date=${date}`);
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail); }
      const d: OptionsData = await r.json();
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDateLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
      {[80, 32, 220, 220].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 10, background: "var(--bg3)", animation: "sdPulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );

  if (error) return (
    <div style={{ padding: "32px 0", textAlign: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(224,92,92,0.1)", border: "0.5px solid rgba(224,92,92,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
      </div>
      <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 6 }}>No options available</p>
      <p style={{ fontSize: 11, color: "var(--text3)", maxWidth: 280, margin: "0 auto" }}>{error}</p>
      <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 8, opacity: 0.6 }}>Options are not available for crypto, some ETFs, and unlisted securities.</p>
    </div>
  );

  if (!data) return null;

  const livePrice = currentPrice || data.current_price;
  const maxPain = calcMaxPain(data.calls, data.puts);

  // ATM = strike closest to current price
  const allStrikes = Array.from(new Set([...data.calls.map(c => c.strike), ...data.puts.map(p => p.strike)])).sort((a, b) => a - b);
  const atmStrike = allStrikes.reduce((best, s) => Math.abs(s - livePrice) < Math.abs(best - livePrice) ? s : best, allStrikes[0] ?? livePrice);

  const COL_TOOLTIPS: Record<string, string> = {
    Strike:  "The price at which you have the right to buy (call) or sell (put) the stock.",
    Last:    "The most recent price this contract traded at.",
    Bid:     "The highest price a buyer is currently willing to pay for this contract.",
    Ask:     "The lowest price a seller is currently willing to accept for this contract.",
    Vol:     "Number of contracts traded today. Higher volume means more market interest.",
    OI:      "Open Interest: total number of outstanding contracts that have not been settled. Higher OI means more liquidity.",
    "IV %":  "Implied Volatility: the market's expectation of how much the stock will move, expressed as an annualized percentage. Higher IV means more expensive options.",
    Delta:   "How much the option price moves for each $1 move in the stock. Calls range from 0 to 1; puts from 0 to -1. Also approximates the probability the option expires in the money.",
    ITM:     "In the Money: the option currently has intrinsic value. For calls, the stock price is above the strike. For puts, the stock price is below the strike.",
  };

  const tableHeader = ["Strike", "Last", "Bid", "Ask", "Vol", "OI", "IV %", "Delta", "ITM"];
  const colW        = ["72px", "52px", "52px", "52px", "56px", "62px", "52px", "52px", "36px"];

  const renderTable = (contracts: OptionContract[], side: "calls" | "puts") => {
    const isCall = side === "calls";
    const itmBg  = isCall ? "var(--itm-call-bg)"  : "var(--itm-put-bg)";
    const itmBdr = isCall ? "var(--itm-call-bdr)" : "var(--itm-put-bdr)";
    const atmBg  = "var(--itm-atm-bg)";
    const hdrCol = isCall ? GREEN : RED;
    if (!contracts.length) return <p style={{ fontSize: 11, color: "var(--text3)", padding: "16px 0" }}>No data</p>;
    return (
      <div style={{ overflowX: "auto", overscrollBehavior: "none", WebkitOverflowScrolling: "touch" as any }}>
        <style>{`
          .opt-th-wrap { position: relative; display: inline-flex; align-items: center; gap: 3px; cursor: default; }
          .opt-th-wrap .opt-tip { display: none; position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
            width: 200px; padding: 7px 10px; background: var(--card-bg); border: 0.5px solid var(--border2);
            border-radius: 8px; font-size: 10px; color: var(--text2); line-height: 1.5; z-index: 200;
            pointer-events: none; box-shadow: 0 6px 20px rgba(0,0,0,0.35); text-transform: none;
            letter-spacing: 0; font-weight: 400; text-align: left; white-space: normal; }
          .opt-th-wrap:hover .opt-tip { display: block; }
          .opt-th-ques { width: 11px; height: 11px; border-radius: 50%; background: var(--bg3); border: 0.5px solid var(--border2);
            color: var(--text3); font-size: 7px; display: inline-flex; align-items: center; justify-content: center;
            line-height: 1; flex-shrink: 0; }
          :root { --itm-call-bg: rgba(76,175,125,0.07); --itm-call-bdr: rgba(76,175,125,0.2);
                  --itm-put-bg: rgba(224,92,92,0.07);   --itm-put-bdr: rgba(224,92,92,0.2);
                  --itm-atm-bg: rgba(201,168,76,0.09); }
          [data-theme="light"] { --itm-call-bg: rgba(76,175,125,0.08); --itm-call-bdr: rgba(76,175,125,0.22);
                                  --itm-put-bg: rgba(224,92,92,0.07);  --itm-put-bdr: rgba(224,92,92,0.2);
                                  --itm-atm-bg: rgba(184,134,11,0.08); }
        `}</style>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520, fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid var(--border)" }}>
              {tableHeader.map((h, i) => (
                <th key={h} style={{ padding: "6px 8px", textAlign: i === 0 ? "left" : "right", fontSize: 8, letterSpacing: 1.5, color: i === 0 ? hdrCol : "var(--text3)", textTransform: "uppercase", fontWeight: 600, width: colW[i], whiteSpace: "nowrap" }}>
                  <span className="opt-th-wrap">
                    {h}
                    <span className="opt-th-ques">?</span>
                    <span className="opt-tip">{COL_TOOLTIPS[h]}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contracts.map((c, i) => {
              const isAtm = c.strike === atmStrike;
              const rowBg  = isAtm ? atmBg  : c.inTheMoney ? itmBg  : "transparent";
              const rowBdr = isAtm ? `0.5px solid ${AMBER}55` : c.inTheMoney ? `0.5px solid ${itmBdr}` : "none";
              const deltaVal = c.delta != null ? c.delta.toFixed(3) : "-";
              const deltaColor = c.delta == null ? "var(--text3)"
                : Math.abs(c.delta) > 0.7 ? (isCall ? GREEN : RED)
                : Math.abs(c.delta) > 0.4 ? AMBER
                : "var(--text2)";
              return (
                <tr key={i} style={{ background: rowBg, outline: rowBdr !== "none" ? rowBdr : undefined, outlineOffset: "-0.5px" }}>
                  <td style={{ padding: "5px 8px", fontFamily: "Space Mono, monospace", fontWeight: isAtm ? 700 : 600, color: isAtm ? AMBER : "var(--text)", fontSize: 11 }}>
                    ${c.strike.toFixed(2)}{isAtm && <span style={{ fontSize: 7, color: AMBER, marginLeft: 4, letterSpacing: 0.5 }}>ATM</span>}
                  </td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "Space Mono, monospace", color: "var(--text2)", fontSize: 10 }}>{fmtOpt(c.lastPrice)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "Space Mono, monospace", color: "var(--text2)", fontSize: 10 }}>{fmtOpt(c.bid)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "Space Mono, monospace", color: "var(--text2)", fontSize: 10 }}>{fmtOpt(c.ask)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "Space Mono, monospace", color: c.volume > 0 ? "var(--text2)" : "var(--text3)", fontSize: 10 }}>{c.volume > 0 ? c.volume.toLocaleString() : "-"}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "Space Mono, monospace", color: c.openInterest > 0 ? "var(--text2)" : "var(--text3)", fontSize: 10 }}>{c.openInterest > 0 ? c.openInterest.toLocaleString() : "-"}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "Space Mono, monospace", color: c.impliedVolatility != null && c.impliedVolatility > 50 ? AMBER : "var(--text2)", fontSize: 10 }}>{c.impliedVolatility != null ? `${c.impliedVolatility.toFixed(1)}%` : "-"}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "Space Mono, monospace", color: deltaColor, fontSize: 10, fontWeight: Math.abs(c.delta ?? 0) > 0.7 ? 600 : 400 }}>{deltaVal}</td>
                  <td style={{ padding: "5px 8px", textAlign: "center" }}>
                    {c.inTheMoney ? <span style={{ fontSize: 9, color: isCall ? GREEN : RED, fontWeight: 700 }}>ITM</span> : <span style={{ fontSize: 9, color: "var(--text3)", opacity: 0.4 }}>-</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Controls bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "12px 14px", background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase" }}>Expiry</span>
            <div style={{ position: "relative" }}>
              <select
                value={selDate}
                onChange={e => changeDate(e.target.value)}
                disabled={dateLoading}
                style={{ padding: "5px 28px 5px 10px", background: "var(--bg3)", border: "0.5px solid var(--border2)", borderRadius: 7, color: "var(--text)", fontSize: 11, fontFamily: "Space Mono, monospace", cursor: "pointer", appearance: "none", outline: "none", opacity: dateLoading ? 0.6 : 1 }}
              >
                {data.expiration_dates.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 8, color: "var(--text3)" }}>▼</span>
            </div>
          </div>
          {dateLoading && <div style={{ width: 12, height: 12, border: "1.5px solid var(--border2)", borderTopColor: AMBER, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase" }}>Underlying</span>
          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>${livePrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, paddingLeft: 2 }}>
        {[["ATM", AMBER, "At the money"], ["ITM", GREEN, "In the money (calls)"], ["ITM", RED, "In the money (puts)"]].map(([label, color, title], i) => (
          <div key={i} title={title as string} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "default" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color as string, opacity: 0.8 }} />
            <span style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 0.5 }}>{label as string}</span>
          </div>
        ))}
      </div>

      {/* Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ border: "0.5px solid rgba(76,175,125,0.2)", borderRadius: 10, padding: "12px 10px", background: "rgba(76,175,125,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 2, height: 10, background: GREEN, borderRadius: 1 }} />
            <p style={{ fontSize: 8, letterSpacing: 2, color: GREEN, textTransform: "uppercase", margin: 0, fontWeight: 600 }}>Calls</p>
            <span style={{ fontSize: 9, color: "var(--text3)", marginLeft: 4 }}>{data.calls.length} contracts</span>
          </div>
          {dateLoading ? <div style={{ height: 180, borderRadius: 8, background: "var(--bg3)", animation: "sdPulse 1.5s ease-in-out infinite" }} /> : renderTable(data.calls, "calls")}
        </div>
        <div style={{ border: "0.5px solid rgba(224,92,92,0.2)", borderRadius: 10, padding: "12px 10px", background: "rgba(224,92,92,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 2, height: 10, background: RED, borderRadius: 1 }} />
            <p style={{ fontSize: 8, letterSpacing: 2, color: RED, textTransform: "uppercase", margin: 0, fontWeight: 600 }}>Puts</p>
            <span style={{ fontSize: 9, color: "var(--text3)", marginLeft: 4 }}>{data.puts.length} contracts</span>
          </div>
          {dateLoading ? <div style={{ height: 180, borderRadius: 8, background: "var(--bg3)", animation: "sdPulse 1.5s ease-in-out infinite" }} /> : renderTable(data.puts, "puts")}
        </div>
      </div>

      {/* Max Pain */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px 16px", background: "var(--card-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 2, height: 12, background: AMBER, borderRadius: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 8, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase", margin: 0 }}>Max Pain</p>
          <div style={{ position: "relative", display: "inline-block", marginLeft: 4 }}>
            <button
              onMouseEnter={() => setTooltip(true)}
              onMouseLeave={() => setTooltip(false)}
              style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--bg3)", border: "0.5px solid var(--border2)", color: "var(--text3)", fontSize: 9, cursor: "default", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
            >?</button>
            {tooltip && (
              <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", width: 220, padding: "8px 12px", background: "#0d1117", border: "0.5px solid var(--border2)", borderRadius: 8, fontSize: 11, color: "var(--text2)", lineHeight: 1.5, zIndex: 100, pointerEvents: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                The price at which option sellers (market makers) lose the least. Often acts as a gravitational pull on the underlying price as expiry approaches.
              </div>
            )}
          </div>
        </div>
        {maxPain != null ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 4 }}>Max Pain Strike</div>
              <div style={{ fontFamily: "Space Mono, monospace", fontSize: 22, fontWeight: 700, color: "var(--accent)", letterSpacing: -0.5 }}>${maxPain.toFixed(2)}</div>
            </div>
            {livePrice > 0 && (
              <div>
                <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 4 }}>Distance from Current</div>
                <div style={{ fontFamily: "Space Mono, monospace", fontSize: 14, fontWeight: 600, color: Math.abs(maxPain - livePrice) / livePrice < 0.02 ? GREEN : "var(--text2)" }}>
                  {maxPain >= livePrice ? "+" : ""}{((maxPain - livePrice) / livePrice * 100).toFixed(2)}%
                  <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: 6 }}>(${Math.abs(maxPain - livePrice).toFixed(2)})</span>
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 4 }}>Expiry</div>
              <div style={{ fontFamily: "Space Mono, monospace", fontSize: 13, color: "var(--text2)" }}>{selDate}</div>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 11, color: "var(--text3)" }}>Not enough data to calculate</p>
        )}
        {/* Max pain bar vis */}
        {maxPain != null && allStrikes.length > 1 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ position: "relative", height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
              {/* current price marker */}
              {livePrice > 0 && (() => {
                const lo = allStrikes[0], hi = allStrikes[allStrikes.length - 1];
                const pct = hi > lo ? Math.max(0, Math.min((livePrice - lo) / (hi - lo) * 100, 100)) : 50;
                const mpPct = hi > lo ? Math.max(0, Math.min((maxPain - lo) / (hi - lo) * 100, 100)) : 50;
                return (
                  <>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(pct, mpPct)}%`, background: "var(--bg3)" }} />
                    <div style={{ position: "absolute", left: `${Math.min(pct, mpPct)}%`, top: 0, height: "100%", width: `${Math.abs(mpPct - pct)}%`, background: `${AMBER}44` }} />
                    <div style={{ position: "absolute", top: "50%", transform: "translate(-50%, -50%)", left: `${pct}%`, width: 10, height: 10, borderRadius: "50%", background: "var(--text2)", border: "1.5px solid var(--bg)" }} />
                    <div style={{ position: "absolute", top: "50%", transform: "translate(-50%, -50%)", left: `${mpPct}%`, width: 12, height: 12, borderRadius: "50%", background: AMBER, border: "2px solid var(--bg)", boxShadow: `0 0 6px ${AMBER}88` }} />
                  </>
                );
              })()}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 9, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>
              <span>${allStrikes[0].toFixed(0)}</span>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "var(--text2)" }}>● Current ${livePrice.toFixed(2)}</span>
                <span style={{ color: AMBER }}>● Max Pain ${maxPain.toFixed(2)}</span>
              </div>
              <span>${allStrikes[allStrikes.length - 1].toFixed(0)}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Analyst Consensus Card ────────────────────────────────────────────────────
interface AnalystConsensusFallback {
  buy: number; hold: number; sell: number;
  num_analysts: number | null;
  target_mean: number | null; target_high: number | null; target_low: number | null;
}

function AnalystConsensusCard({
  data, currentPrice, accentColor, fallback,
}: {
  data: AnalystConsensus | null;
  currentPrice: number;
  accentColor: string;
  fallback: AnalystConsensusFallback;
}) {
  const targetMean    = data?.target_mean    ?? fallback.target_mean;
  const targetHigh    = data?.target_high    ?? fallback.target_high;
  const targetLow     = data?.target_low     ?? fallback.target_low;
  const numAnalysts   = data?.num_analysts   ?? fallback.num_analysts;
  const buy           = data?.buy            ?? fallback.buy;
  const hold          = data?.hold           ?? fallback.hold;
  const sell          = data?.sell           ?? fallback.sell;

  const price = currentPrice;
  const upside = targetMean && price > 0
    ? ((targetMean / price - 1) * 100)
    : null;
  const isUp = upside != null ? upside >= 0 : null;
  const targetColor = isUp === true ? GREEN : isUp === false ? RED : accentColor;

  const totalVotes = buy + hold + sell;

  // Range bar positions (% from left)
  let currentPct = 50;
  let targetPct  = 50;
  if (targetLow != null && targetHigh != null && targetHigh > targetLow) {
    const range = targetHigh - targetLow;
    currentPct = Math.max(2, Math.min(98, ((price      - targetLow) / range) * 100));
    targetPct  = Math.max(2, Math.min(98, ((targetMean! - targetLow) / range) * 100));
  }
  const fillLeft  = Math.min(currentPct, targetPct);
  const fillWidth = Math.abs(targetPct - currentPct);

  return (
    <Card title="Analyst Consensus" style={{ marginBottom: 10 }}>
      {/* Top row: consensus target + analyst count */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          {targetMean != null ? (
            <>
              <div style={{ fontFamily: "Space Mono, monospace", fontSize: 22, fontWeight: 700, color: targetColor, letterSpacing: -0.5, lineHeight: 1 }}>
                ${targetMean.toFixed(2)}
              </div>
              <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3 }}>Consensus target</div>
              {upside != null && (
                <div style={{ fontSize: 11, fontFamily: "Space Mono, monospace", fontWeight: 600, color: targetColor, marginTop: 4 }}>
                  {upside >= 0 ? "+" : ""}{upside.toFixed(1)}% {upside >= 0 ? "upside" : "downside"} from ${price.toFixed(2)}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>No consensus target available</div>
          )}
        </div>
        {numAnalysts != null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "Space Mono, monospace", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{numAnalysts}</div>
            <div style={{ fontSize: 10, color: "var(--text3)" }}>analysts covering</div>
          </div>
        )}
      </div>

      {/* Range bar: low target ... current ... consensus ... high target */}
      {targetLow != null && targetHigh != null && targetMean != null && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ position: "relative", height: 6, background: "var(--bg3)", borderRadius: 3 }}>
            {/* Colored fill between current and consensus */}
            <div style={{
              position: "absolute", top: 0, height: "100%",
              left: `${fillLeft}%`, width: `${fillWidth}%`,
              background: isUp ? `${GREEN}55` : `${RED}55`,
              borderRadius: 3,
            }} />
            {/* Current price dot */}
            <div style={{
              position: "absolute", top: "50%", transform: "translate(-50%, -50%)",
              left: `${currentPct}%`,
              width: 10, height: 10, borderRadius: "50%",
              background: "var(--text2)", border: "2px solid var(--bg)", zIndex: 2,
            }} />
            {/* Consensus target dot */}
            <div style={{
              position: "absolute", top: "50%", transform: "translate(-50%, -50%)",
              left: `${targetPct}%`,
              width: 13, height: 13, borderRadius: "50%",
              background: targetColor, border: "2.5px solid var(--bg)",
              boxShadow: `0 0 7px ${targetColor}77`, zIndex: 3,
            }} />
          </div>
          {/* Labels */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 9, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>
            <div>
              <div style={{ color: RED }}>Low target</div>
              <div style={{ color: "var(--text2)" }}>${targetLow.toFixed(2)}</div>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 9 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "var(--text3)" }}>Current</div>
                <div style={{ color: "var(--text2)" }}>${price.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "var(--text3)" }}>Consensus</div>
                <div style={{ color: targetColor }}>${targetMean.toFixed(2)}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: GREEN }}>High target</div>
              <div style={{ color: "var(--text2)" }}>${targetHigh.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Buy / Hold / Sell breakdown */}
      {totalVotes > 0 && (
        <div>
          <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", gap: 1, marginBottom: 6 }}>
            <div style={{ flex: buy,  background: GREEN, minWidth: 0 }} />
            <div style={{ flex: hold, background: accentColor, minWidth: 0 }} />
            <div style={{ flex: sell, background: RED, minWidth: 0 }} />
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 10 }}>
            <span style={{ color: GREEN }}>Buy {buy}</span>
            <span style={{ color: accentColor }}>Hold {hold}</span>
            <span style={{ color: RED }}>Sell {sell}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

interface AnalystConsensus {
  ticker: string;
  current_price: number;
  target_mean: number | null;
  target_high: number | null;
  target_low: number | null;
  upside_pct: number | null;
  num_analysts: number | null;
  buy: number;
  hold: number;
  sell: number;
  last_updated: string | null;
}

export default function StockDetail({ ticker, onBack, onSelectTicker }: {
  ticker: string;
  onBack: () => void;
  onSelectTicker?: (t: string) => void;
}) {
  const [info, setInfo]           = useState<StockInfo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [period, setPeriod]       = useState<Period>("1Y");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [histDates, setHistDates]     = useState<string[]>([]);
  const [histPrices, setHistPrices]   = useState<number[]>([]);
  const [histOpens, setHistOpens]     = useState<number[]>([]);
  const [histHighs, setHistHighs]     = useState<number[]>([]);
  const [histLows, setHistLows]       = useState<number[]>([]);
  const [histVolumes, setHistVolumes] = useState<number[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState<"overview" | "options">("overview");
  const [inWatchlist, setInWatchlist] = useState(false);
  const [livePrice, setLivePrice]     = useState<number | null>(null);
  const [priceFlash, setPriceFlash]   = useState<"up" | "down" | null>(null);
  const [analystConsensus, setAnalystConsensus] = useState<AnalystConsensus | null>(null);
  const prevPriceRef  = useRef<number | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const check = () => setDark(document.documentElement.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const accentColor = dark ? AMBER : "#b8860b";

  // ── Watchlist ───────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const items: { ticker: string }[] = raw ? JSON.parse(raw) : [];
      setInWatchlist(items.some(i => i.ticker === ticker));
    } catch {}
  }, [ticker]);

  const toggleWatchlist = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const items: { ticker: string; addedAt: string }[] = raw ? JSON.parse(raw) : [];
      const next = inWatchlist
        ? items.filter(i => i.ticker !== ticker)
        : [...items, { ticker, addedAt: new Date().toISOString() }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setInWatchlist(v => !v);
    } catch {}
  };

  // ── Initial stock info load ─────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true); setError(null); setInfo(null); setLivePrice(null);
    fetch(`${API_URL}/stock/${ticker}`)
      .then(r => r.json())
      .then(d => {
        if (d.detail) throw new Error(d.detail);
        setInfo(d);
        prevPriceRef.current = d.current_price;
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  // ── Live price poll every 10 s ──────────────────────────────────────────────
  useEffect(() => {
    if (!info) return;
    const poll = async () => {
      try {
        const resp = await fetch(`${API_URL}/prices?tickers=${info.ticker}`);
        const data = await resp.json();
        const p: number = data[info.ticker]?.price;
        if (p && p > 0) {
          const prev = prevPriceRef.current;
          if (prev !== null && Math.abs(p - prev) > 0.001) {
            const dir: "up" | "down" = p > prev ? "up" : "down";
            setPriceFlash(dir);
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
            flashTimerRef.current = setTimeout(() => setPriceFlash(null), 1400);
          }
          prevPriceRef.current = p;
          setLivePrice(p);
        }
      } catch {}
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => {
      clearInterval(id);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [info?.ticker]);

  // ── Chart history ───────────────────────────────────────────────────────────
  const loadHistory = useCallback(async (p: Period) => {
    setHistLoading(true);
    try {
      const r = await fetch(`${API_URL}/stock/${ticker}/history?period=${p}`);
      const d = await r.json();
      setHistDates(d.dates || []);
      setHistPrices(d.prices || []);
      setHistOpens(d.opens || []);
      setHistHighs(d.highs || []);
      setHistLows(d.lows || []);
      setHistVolumes(d.volumes || []);
    } catch {}
    setHistLoading(false);
  }, [ticker]);

  useEffect(() => { loadHistory(period); }, [period, loadHistory]);

  // ── Analyst consensus fetch ─────────────────────────────────────────────────
  useEffect(() => {
    setAnalystConsensus(null);
    fetch(`${API_URL}/analyst-targets/${ticker}`)
      .then(r => r.json())
      .then(d => { if (d && !d.detail) setAnalystConsensus(d); })
      .catch(() => {});
  }, [ticker]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const currentPrice = livePrice ?? info?.current_price ?? 0;
  const positive     = (info?.change_pct ?? 0) >= 0;
  const lineColor    = positive ? accentColor : RED;
  const fillColor    = positive ? (dark ? "rgba(201,168,76,0.07)" : "rgba(184,134,11,0.07)") : "rgba(224,92,92,0.07)";
  const hasOHLC      = histOpens.length > 0 && histHighs.length > 0 && histLows.length > 0;
  const priceColor   = priceFlash === "up" ? GREEN : priceFlash === "down" ? RED : "var(--text)";

  // Volume bars shared by both chart types
  const hasVol = histVolumes.length > 0;
  const volBars = hasVol ? [{
    x: histDates, y: histVolumes,
    type: "bar",
    marker: {
      color: histPrices.map((p, i) =>
        i === 0 ? "rgba(201,168,76,0.3)"
          : p >= (histPrices[i - 1] ?? p) ? "rgba(76,175,125,0.3)" : "rgba(224,92,92,0.3)"
      ),
    },
    xaxis: "x", yaxis: "y2", name: "Volume", showlegend: false,
    hovertemplate: "%{y:,.0f}<extra>Vol</extra>",
  }] : [];

  const chartTraces = histPrices.length === 0 ? [] :
    chartType === "candlestick" && hasOHLC ? [
      {
        type: "candlestick",
        x: histDates,
        open: histOpens, high: histHighs, low: histLows, close: histPrices,
        increasing: { line: { color: GREEN, width: 1 }, fillcolor: GREEN },
        decreasing: { line: { color: RED, width: 1 }, fillcolor: RED },
        xaxis: "x", yaxis: "y", name: ticker, showlegend: false,
        hovertemplate: "O: $%{open:.2f}  H: $%{high:.2f}  L: $%{low:.2f}  C: $%{close:.2f}<extra></extra>",
        whiskerwidth: 0.2,
      },
      ...volBars,
    ] : [
      {
        x: histDates, y: histPrices,
        type: "scatter", mode: "lines",
        line: { color: lineColor, width: 1.8 },
        fill: "tozeroy", fillcolor: fillColor,
        hovertemplate: hasOHLC
          ? "O: $%{customdata[0]:.2f}  H: $%{customdata[1]:.2f}  L: $%{customdata[2]:.2f}  C: $%{y:.2f}<extra></extra>"
          : "$%{y:.2f}<extra></extra>",
        customdata: hasOHLC
          ? histDates.map((_, i) => [histOpens[i] ?? 0, histHighs[i] ?? 0, histLows[i] ?? 0])
          : undefined,
        xaxis: "x", yaxis: "y", name: "Price", showlegend: false,
      },
      ...volBars,
    ];

  const tickfmt = period === "1D" ? "%H:%M"
    : (period === "1W" || period === "1M") ? "%b %d"
    : "%b '%y";

  const layout: any = {
    paper_bgcolor: "transparent", plot_bgcolor: "transparent",
    margin: { t: 8, b: 36, l: 56, r: 8 },
    font: { color: "var(--text3)", family: "Inter", size: 10 },
    ...(hasVol ? { grid: { rows: 2, columns: 1, pattern: "independent", roworder: "top to bottom" } } : {}),
    xaxis: {
      gridcolor: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.07)", linecolor: "transparent", tickcolor: "transparent",
      type: "date", tickformat: tickfmt,
      showspikes: true, spikecolor: dark ? AMBER + "88" : "#b8860b88", spikemode: "across",
      spikesnap: "cursor", spikedash: "solid", spikethickness: 1,
      rangeslider: { visible: false },
    },
    yaxis: {
      gridcolor: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)", linecolor: "transparent", tickcolor: "transparent",
      tickprefix: "$", domain: hasVol ? [0.28, 1] : [0, 1],
      showspikes: true, spikecolor: dark ? "rgba(201,168,76,0.3)" : "rgba(184,134,11,0.3)", spikemode: "across", spikethickness: 1,
    },
    ...(hasVol ? {
      yaxis2: {
        gridcolor: "transparent", linecolor: "transparent", tickcolor: "transparent",
        domain: [0, 0.22], showticklabels: false,
      },
    } : {}),
    showlegend: false,
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: dark ? "#0d1117" : "#ffffff", bordercolor: AMBER + "66",
      font: { color: dark ? "#e8e0cc" : "#1a1a1a", family: "Space Mono", size: 11 },
    },
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <style>{`@keyframes sdPulse{0%,100%{opacity:0.4}50%{opacity:0.9}}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <Skel h={16} w={70} /><Skel h={24} w={150} /><Skel h={13} w={200} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "flex-end" }}>
          <Skel h={32} w={110} /><Skel h={16} w={90} />
        </div>
      </div>
      <Skel h={52} />
      <Skel h={34} />
      <Skel h={260} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Skel h={190} /><Skel h={190} />
      </div>
      <Skel h={110} /><Skel h={96} /><Skel h={160} />
    </div>
  );

  if (error) return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <p style={{ color: RED, fontSize: 13, marginBottom: 12 }}>Failed to load {ticker}: {error}</p>
      <button onClick={onBack} style={{ padding: "8px 20px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>Back</button>
    </div>
  );

  if (!info) return null;

  const ratingColor = RATING_COLOR[info.analyst_rating] || "var(--text3)";

  const earningsDays = info.earnings_date
    ? Math.round((new Date(info.earnings_date).getTime() - Date.now()) / 86400000)
    : null;
  const earningsLabel = earningsDays == null ? "-"
    : earningsDays < 0 ? info.earnings_date!.slice(0, 10)
    : earningsDays === 0 ? "Today"
    : `In ${earningsDays}d`;

  const w52Low  = info.week52_low  ?? 0;
  const w52High = info.week52_high ?? 0;
  const w52Pct  = w52High > w52Low
    ? Math.max(0, Math.min((currentPrice - w52Low) / (w52High - w52Low), 1))
    : 0.5;
  const spread = info.bid != null && info.ask != null ? info.ask - info.bid : null;

  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes sdPulse { 0%,100% { opacity: 0.4 } 50% { opacity: 0.9 } }
        @keyframes livePulse {
          0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(76,175,125,0.5) }
          60%      { opacity: 0.6; box-shadow: 0 0 0 5px rgba(76,175,125,0) }
        }
        @media(max-width:768px){
          .sd-fin-pair{flex-direction:column!important}
          .sd-fin-col-l{width:100%!important;padding-right:0!important;border-right:none!important;padding-bottom:12px!important;border-bottom:0.5px solid var(--border)!important}
          .sd-fin-col-r{width:100%!important;padding-left:0!important;padding-top:12px!important}
          .sd-stats-grid{grid-template-columns:1fr!important}
          .sd-tab-row{overflow-x:auto!important;scrollbar-width:none!important;padding-bottom:4px}
          .sd-tab-row::-webkit-scrollbar{display:none}
          .sd-price-header{flex-wrap:wrap!important;gap:8px!important}
          .sd-analyst-row{flex-direction:column!important;gap:10px!important}
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        {/* Nav row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <button onClick={onBack}
            style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text3)", cursor: "pointer" }}>
            ← Back
          </button>
          <button onClick={toggleWatchlist}
            style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6, border: `0.5px solid ${inWatchlist ? accentColor : "var(--border)"}`, background: inWatchlist ? "rgba(184,134,11,0.1)" : "transparent", color: inWatchlist ? accentColor : "var(--text3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s" }}>
            {inWatchlist ? <EyeOff size={11} /> : <Eye size={11} />}
            {inWatchlist ? "Watching" : "Watch"}
          </button>
        </div>

        {/* Identity + price: responsive two-column */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          {/* Left: ticker + name + sector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            {/* Row 1: Ticker + company name + analyst badge + Buy button */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: "Space Mono, monospace", fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5, margin: 0, lineHeight: 1 }}>
                {info.ticker}
              </h1>
              <span style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.2, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {info.name}
              </span>
              <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 9, background: `${ratingColor}22`, color: ratingColor, border: `0.5px solid ${ratingColor}55`, fontWeight: 600, letterSpacing: 0.5, flexShrink: 0 }}>
                {info.analyst_rating}
              </span>
            </div>
            {/* Row 2: Sector · Industry */}
            {info.sector && (
              <p style={{ fontSize: 10, color: "var(--text3)", margin: 0 }}>
                {info.sector}{info.industry ? ` · ${info.industry}` : ""}
              </p>
            )}
          </div>

          {/* Right: price + live indicator + change + bid/ask */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
            {/* Price + live dot */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontFamily: "Space Mono, monospace", fontSize: 28, fontWeight: 700, letterSpacing: -1, lineHeight: 1, color: priceColor, transition: "color 0.5s ease" }}>
                ${currentPrice.toFixed(2)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, animation: "livePulse 2s ease-in-out infinite", flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: "var(--text3)" }}>Live</span>
              </div>
            </div>
            {/* Change amount + % */}
            <div style={{ fontSize: 13, fontWeight: 600, color: positive ? GREEN : RED }}>
              {positive ? "+" : ""}{info.change != null ? info.change.toFixed(2) : "-"}
              <span style={{ fontSize: 12, marginLeft: 4 }}>
                ({positive ? "+" : ""}{info.change_pct != null ? info.change_pct.toFixed(2) : "-"}%)
              </span>
            </div>
            {/* Bid / Ask / Spread */}
            {info.bid != null && info.ask != null && (
              <div style={{ display: "flex", gap: 10, fontSize: 10, color: "var(--text3)" }}>
                <span>Bid <span style={{ color: "var(--text2)", fontFamily: "Space Mono, monospace" }}>${info.bid.toFixed(2)}</span></span>
                <span>Ask <span style={{ color: "var(--text2)", fontFamily: "Space Mono, monospace" }}>${info.ask.toFixed(2)}</span></span>
                {spread != null && spread > 0 && (
                  <span>Spread <span style={{ fontFamily: "Space Mono, monospace" }}>${spread.toFixed(3)}</span></span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 3, marginBottom: 10, background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 9, padding: 3, width: "fit-content" }}>
        {(["overview", "options"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: "6px 16px", fontSize: 11, fontWeight: 500, borderRadius: 7, border: "none", cursor: "pointer", transition: "all 0.15s", background: activeTab === tab ? (tab === "options" ? "rgba(184,134,11,0.12)" : "var(--bg3)") : "transparent", color: activeTab === tab ? (tab === "options" ? accentColor : "var(--text)") : "var(--text3)", letterSpacing: 0.2 }}>
            {tab === "overview" ? "Overview" : "Options Chain"}
          </button>
        ))}
      </div>

      {/* ── Options tab ──────────────────────────────────────────────────────── */}
      {activeTab === "options" && <OptionsChain ticker={info.ticker} currentPrice={currentPrice} />}

      {/* ── Overview tab content ─────────────────────────────────────────────── */}
      {activeTab === "overview" && <>

      {/* ── 52-Week Range Bar ───────────────────────────────────────────────── */}
      {info.week52_low != null && info.week52_high != null && (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 16px", background: "var(--card-bg)", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 2, height: 12, background: AMBER, borderRadius: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 8, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase", margin: 0 }}>52-Week Range</p>
            <span style={{ marginLeft: "auto", fontFamily: "Space Mono, monospace", fontSize: 10, color: accentColor }}>
              {(w52Pct * 100).toFixed(0)}% of range
            </span>
          </div>
          <div style={{ position: "relative", height: 6, background: "var(--bg3)", borderRadius: 3 }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${w52Pct * 100}%`, background: `linear-gradient(90deg, rgba(201,168,76,0.2), ${AMBER})`, borderRadius: 3, transition: "width 0.7s ease" }} />
            <div style={{ position: "absolute", top: "50%", transform: "translate(-50%, -50%)", left: `${Math.max(3, Math.min(w52Pct * 100, 97))}%`, width: 12, height: 12, borderRadius: "50%", background: AMBER, border: "2px solid var(--bg)", boxShadow: `0 0 8px ${AMBER}77`, transition: "left 0.7s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10 }}>
            <span style={{ fontFamily: "Space Mono, monospace" }}>
              <span style={{ color: RED }}>↓</span> <span style={{ color: "var(--text2)" }}>${info.week52_low.toFixed(2)}</span>
              <span style={{ color: "var(--text3)" }}> 52W Low</span>
            </span>
            <span style={{ fontFamily: "Space Mono, monospace" }}>
              <span style={{ color: "var(--text3)" }}>52W High </span>
              <span style={{ color: "var(--text2)" }}>${info.week52_high.toFixed(2)}</span>
              <span style={{ color: GREEN }}> ↑</span>
            </span>
          </div>
        </div>
      )}

      {/* ── Chart controls ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 3 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: "4px 10px", fontSize: 11, fontFamily: "Space Mono, monospace", borderRadius: 5, border: "0.5px solid var(--border)", background: period === p ? "var(--text)" : "transparent", color: period === p ? "var(--bg)" : "var(--text3)", cursor: "pointer", transition: "all 0.15s" }}>
              {p}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", border: "0.5px solid var(--border)", borderRadius: 7, overflow: "hidden" }}>
          <button onClick={() => setChartType("line")}
            style={{ padding: "5px 11px", background: chartType === "line" ? "var(--bg3)" : "transparent", border: "none", cursor: "pointer", color: chartType === "line" ? accentColor : "var(--text3)", display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 500, transition: "all 0.15s" }}>
            <TrendingUp size={11} /> Line
          </button>
          <button onClick={() => setChartType("candlestick")}
            style={{ padding: "5px 11px", background: chartType === "candlestick" ? "var(--bg3)" : "transparent", border: "none", borderLeft: "0.5px solid var(--border)", cursor: "pointer", color: chartType === "candlestick" ? accentColor : "var(--text3)", display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 500, transition: "all 0.15s" }}>
            <CandleIcon size={11} /> Candle
          </button>
        </div>
      </div>

      {/* ── Price chart ─────────────────────────────────────────────────────── */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "8px 12px 4px", background: "var(--card-bg)", marginBottom: 10, minHeight: 272 }}>
        {histLoading ? (
          <div style={{ height: 248, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 18, height: 18, border: "1.5px solid var(--border2)", borderTopColor: AMBER, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : histPrices.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${chartType}-${period}`}
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Plot
                data={chartTraces}
                layout={layout}
                config={{ displayModeBar: false, responsive: true, scrollZoom: true }}
                style={{ width: "100%", height: 248 }}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div style={{ height: 248, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: 12, color: "var(--text3)" }}>No chart data available</p>
          </div>
        )}
      </div>

      {/* ── Key Stats + Trading ─────────────────────────────────────────────── */}
      <div className="sd-stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <Card title="Key Stats">
          <Row label="Market Cap"  value={fmt(info.market_cap, "$")} tooltip={{ title: "Market Cap", sections: [{ label: "Plain English", text: "Total market value of all outstanding shares. Calculated as stock price multiplied by shares outstanding." }, { label: "Example", text: "If a stock trades at $100 with 1 billion shares outstanding, market cap = $100 billion." }, { label: "What's Good?", text: "Large cap (above $10B) means more stability. Mid cap ($2-10B) has more growth potential. Small cap (under $2B) carries more risk but can offer higher returns." }] }} />
          <Row label="P/E (TTM)"   value={fmt(info.pe_ratio, "", "", 1)} tooltip={{ title: "P/E Ratio (Trailing Twelve Months)", sections: [{ label: "Plain English", text: "How much you are paying per dollar of earnings. Trailing means based on actual earnings from the past 12 months." }, { label: "Example", text: "P/E of 20 means you pay $20 for every $1 the company earned last year." }, { label: "What's Good?", text: "Below 15 may be undervalued. 15-25 is typical for most stocks. Above 30 suggests high growth expectations or potential overvaluation." }] }} />
          <Row label="Forward P/E" value={fmt(info.forward_pe, "", "", 1)} tooltip={{ title: "Forward P/E", sections: [{ label: "Plain English", text: "Like P/E, but uses analyst estimates for the next 12 months of earnings rather than past results. More forward-looking." }, { label: "Example", text: "A Forward P/E lower than Trailing P/E suggests analysts expect earnings to grow." }, { label: "What's Good?", text: "Compare against the trailing P/E. If Forward P/E is much lower, earnings growth is expected. If higher, earnings may be declining." }] }} />
          <Row label="EPS (TTM)"   value={fmt(info.eps, "$")} tooltip={{ title: "Earnings Per Share (Trailing Twelve Months)", sections: [{ label: "Plain English", text: "Total profit divided by shares outstanding. Shows how much the company earned per share over the past 12 months." }, { label: "Example", text: "Net income of $1 billion with 500 million shares = EPS of $2.00." }, { label: "What's Good?", text: "Growing EPS over time is a positive signal. Compare against analyst estimates for forward expectations." }] }} />
          <Row label="Div Yield"   value={info.dividend_yield != null ? `${info.dividend_yield.toFixed(2)}%` : "-"} tooltip={{ title: "Dividend Yield", sections: [{ label: "Plain English", text: "Annual dividend payment as a percentage of the stock price. The income you receive just from holding the stock, before any price appreciation." }, { label: "Example", text: "A $2 annual dividend on a $50 stock = 4% dividend yield." }, { label: "What's Good?", text: "Above 4-5% can be attractive income, but unusually high yields sometimes signal financial stress. 1-3% is typical for healthy dividend payers." }] }} />
        </Card>
        <Card title="Trading">
          <Row label="Volume"      value={fmt(info.volume, "", "", 0)} tooltip={{ title: "Volume", sections: [{ label: "Plain English", text: "Number of shares traded today. High volume means more market activity and it is easier to buy or sell." }, { label: "Example", text: "Volume of 10 million means 10 million shares changed hands today." }, { label: "What's Good?", text: "Compare to average volume. Significantly higher volume during a price move signals stronger market conviction." }] }} />
          <Row label="Avg Volume"  value={fmt(info.avg_volume, "", "", 0)} tooltip={{ title: "Average Volume", sections: [{ label: "Plain English", text: "Typical number of shares traded per day, averaged over 30-90 days. A baseline for what is normal for this stock." }, { label: "Example", text: "If average volume is 5 million and today is 15 million, there is a 3x spike in activity." }, { label: "What's Good?", text: "Stocks with higher average volume are easier to trade with less slippage." }] }} />
          <Row label="Beta"        value={fmt(info.beta, "", "", 2)} tooltip={{ title: "Beta", sections: [{ label: "Plain English", text: "How much the stock moves relative to the overall market. Beta of 1 means it moves in lockstep with the S&P 500." }, { label: "Example", text: "Beta 1.5 = if the S&P drops 10%, this stock tends to drop 15%. Beta 0.5 = moves only half as much." }, { label: "What's Good?", text: "Lower beta (under 1) means less volatility. Higher beta (above 1.5) means amplified swings. Negative beta means it tends to move opposite the market." }] }} />
          <Row label="Price/Book"  value={fmt(info.price_to_book, "", "", 2)} tooltip={{ title: "Price to Book Ratio", sections: [{ label: "Plain English", text: "Stock price divided by book value (assets minus liabilities) per share. Shows how much you are paying relative to the company's accounting value." }, { label: "Example", text: "P/B of 3 means you pay $3 for every $1 of net assets." }, { label: "What's Good?", text: "Under 1 can indicate undervaluation. 1-3 is typical. Very high values are common in asset-light businesses like software companies." }] }} />
          <Row label="Short Ratio" value={fmt(info.short_ratio, "", "", 2)} tooltip={{ title: "Short Ratio", sections: [{ label: "Plain English", text: "Estimated number of days it would take short sellers to cover their positions, given average trading volume. A measure of bearish sentiment." }, { label: "Example", text: "Short ratio of 5 means it would take 5 days of average volume for all short sellers to buy back their shares." }, { label: "What's Good?", text: "Above 10 is considered high short interest. If a heavily shorted stock rises, a short squeeze can accelerate gains rapidly." }] }} />
        </Card>
      </div>

      {/* ── Analyst Consensus ────────────────────────────────────────────────── */}
      <AnalystConsensusCard
        data={analystConsensus}
        currentPrice={currentPrice}
        accentColor={accentColor}
        fallback={{
          buy: info.analyst_buy ?? 0,
          hold: info.analyst_hold ?? 0,
          sell: info.analyst_sell ?? 0,
          num_analysts: info.num_analysts ?? null,
          target_mean: info.target_mean ?? null,
          target_high: info.target_high ?? null,
          target_low: info.target_low ?? null,
        }}
      />

      {/* ── Earnings Calendar ───────────────────────────────────────────────── */}
      <Card title="Earnings Calendar" style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>Next Earnings <InfoModal title="Next Earnings Date" sections={[{ label: "Plain English", text: "The next scheduled date when the company will report its quarterly financial results. Earnings reports often cause significant price moves." }, { label: "Example", text: "If earnings are in 5 days and implied volatility is high, the market is pricing in a large expected move." }, { label: "What's Good?", text: "Earnings dates can be high risk for option holders as time decay accelerates. Long-term investors should be aware but not necessarily time trades around them." }]} /></div>
            <div style={{ fontFamily: "Space Mono, monospace", fontSize: 15, fontWeight: 600, color: earningsDays !== null && earningsDays >= 0 && earningsDays <= 14 ? AMBER : "var(--text)" }}>{earningsLabel}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>EPS (TTM) <InfoModal title="Earnings Per Share (Trailing Twelve Months)" sections={[{ label: "Plain English", text: "Total profit divided by shares outstanding. Shows how much the company earned per share over the past 12 months." }, { label: "Example", text: "Net income of $1 billion with 500 million shares = EPS of $2.00." }, { label: "What's Good?", text: "Growing EPS over time is a positive signal. Compare against forward EPS for expected growth." }]} /></div>
            <div style={{ fontFamily: "Space Mono, monospace", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{fmt(info.eps, "$")}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>Forward EPS <InfoModal title="Forward EPS (Earnings Per Share Estimate)" sections={[{ label: "Plain English", text: "Analyst consensus estimate for earnings per share over the next 12 months. A forecast, not actual results." }, { label: "Example", text: "If trailing EPS is $3 and forward EPS is $4, analysts expect roughly 33% earnings growth." }, { label: "What's Good?", text: "Compare against trailing EPS to gauge expected growth. Positive growth expectations often support higher valuations." }]} /></div>
            <div style={{ fontFamily: "Space Mono, monospace", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{fmt(info.eps_forward, "$")}</div>
          </div>
          {info.eps != null && info.eps_forward != null && info.eps !== 0 && (
            <div>
              <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>EPS Growth Est. <InfoModal title="EPS Growth Estimate" sections={[{ label: "Plain English", text: "Estimated percentage change in earnings per share, comparing analyst forecasts for next year against the most recent 12-month actuals." }, { label: "Example", text: "Trailing EPS $2, Forward EPS $2.60 = 30% expected EPS growth." }, { label: "What's Good?", text: "Higher expected growth supports higher P/E ratios. Negative EPS growth estimates are a warning sign worth investigating." }]} /></div>
              <div style={{ fontFamily: "Space Mono, monospace", fontSize: 15, fontWeight: 600, color: info.eps_forward > info.eps ? GREEN : RED }}>
                {`${((info.eps_forward - info.eps) / Math.abs(info.eps) * 100).toFixed(1)}%`}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Financial Metrics ───────────────────────────────────────────────── */}
      <Card title="Financial Metrics" style={{ marginBottom: 10 }}>
        <div className="sd-fin-pair" style={{ display: "flex", gap: 0 }}>
          <div className="sd-fin-col-l" style={{ width: "50%", paddingRight: 16, borderRight: "0.5px solid var(--border)" }}>
            <Row label="Gross Margin"   value={info.gross_margin != null ? `${info.gross_margin.toFixed(1)}%` : "-"} tooltip={{ title: "Gross Margin", sections: [{ label: "Plain English", text: "Percentage of revenue left after subtracting cost of goods sold. Measures how efficiently the company produces its product." }, { label: "Example", text: "Revenue $100M, cost of goods $40M = 60% gross margin." }, { label: "What's Good?", text: "Higher is better. Software companies often have 70-90% margins. Retailers might have 20-30%. Compare within the same industry." }] }} />
            <Row label="Op. Margin"     value={info.operating_margin != null ? `${info.operating_margin.toFixed(1)}%` : "-"} tooltip={{ title: "Operating Margin", sections: [{ label: "Plain English", text: "Percentage of revenue left after all operating expenses (salaries, rent, R&D), before interest and taxes." }, { label: "Example", text: "Revenue $100M, operating costs $85M = 15% operating margin." }, { label: "What's Good?", text: "Above 20% is strong. Below 5% is thin. Compare to industry peers." }] }} />
            <Row label="Profit Margin"  value={info.profit_margin != null ? `${info.profit_margin.toFixed(1)}%` : "-"} tooltip={{ title: "Net Profit Margin", sections: [{ label: "Plain English", text: "Percentage of revenue that becomes actual profit after all expenses, interest, and taxes." }, { label: "Example", text: "Revenue $100M, net income $12M = 12% profit margin." }, { label: "What's Good?", text: "Above 10% is generally healthy. Compare to industry averages. Rising margins over time is a positive trend." }] }} />
            <Row label="Revenue Growth" value={info.revenue_growth != null ? `${info.revenue_growth.toFixed(1)}%` : "-"} color={info.revenue_growth != null ? (info.revenue_growth >= 0 ? GREEN : RED) : undefined} tooltip={{ title: "Revenue Growth (Year over Year)", sections: [{ label: "Plain English", text: "Percentage increase in total sales compared to the same period one year ago." }, { label: "Example", text: "Revenue was $1B last year and $1.2B this year = 20% revenue growth." }, { label: "What's Good?", text: "For mature companies, 5-10% is healthy. High-growth companies often target 20%+. Declining revenue is a warning sign." }] }} />
          </div>
          <div className="sd-fin-col-r" style={{ width: "50%", paddingLeft: 16 }}>
            <Row label="Debt/Equity"    value={fmt(info.debt_to_equity, "", "", 2)} tooltip={{ title: "Debt to Equity Ratio", sections: [{ label: "Plain English", text: "Total debt divided by total shareholder equity. Shows how much the company relies on borrowed money versus its own capital." }, { label: "Example", text: "Debt $500M, equity $250M = debt/equity ratio of 2.0." }, { label: "What's Good?", text: "Under 1.0 is conservative. 1-2 is moderate. Above 2 can signal high financial risk, though capital-intensive industries naturally carry more debt." }] }} />
            <Row label="Current Ratio"  value={fmt(info.current_ratio, "", "", 2)} tooltip={{ title: "Current Ratio", sections: [{ label: "Plain English", text: "Current assets divided by current liabilities. Measures a company's ability to pay short-term obligations." }, { label: "Example", text: "Current assets $500M, current liabilities $250M = current ratio of 2.0." }, { label: "What's Good?", text: "Above 1.5 is healthy. Below 1.0 means current liabilities exceed assets, which can signal liquidity stress." }] }} />
            <Row label="Free Cash Flow" value={fmt(info.free_cashflow, "$")} tooltip={{ title: "Free Cash Flow", sections: [{ label: "Plain English", text: "Cash generated from operations after paying for capital expenditures. The actual cash left over that can be used for dividends, buybacks, or growth." }, { label: "Example", text: "Operating cash flow $200M, capex $50M = free cash flow $150M." }, { label: "What's Good?", text: "Consistently positive free cash flow is a sign of financial health. Growing FCF often precedes rising stock prices." }] }} />
            <Row label="Revenue"        value={fmt(info.revenue, "$")} tooltip={{ title: "Revenue", sections: [{ label: "Plain English", text: "Total income from sales of products or services before any expenses are deducted. Also called the top line." }, { label: "Example", text: "A company sells $500M worth of products or services in a year." }, { label: "What's Good?", text: "Look for consistent growth over time. Compare revenue trends to profit trends to assess how efficiently revenue converts to earnings." }] }} />
            <Row label="Net Income"     value={fmt(info.net_income, "$")} tooltip={{ title: "Net Income", sections: [{ label: "Plain English", text: "Total profit after all expenses, taxes, and interest have been paid. The bottom line." }, { label: "Example", text: "Revenue $500M minus all expenses = net income of $50M." }, { label: "What's Good?", text: "Consistently positive and growing net income indicates a healthy, profitable business." }] }} />
            <Row label="Insider Own."   value={info.insider_ownership != null ? `${info.insider_ownership.toFixed(1)}%` : "-"} tooltip={{ title: "Insider Ownership", sections: [{ label: "Plain English", text: "Percentage of company shares held by executives, directors, and other insiders. High insider ownership can align management interests with shareholders." }, { label: "Example", text: "Founders retaining 20% of shares after an IPO shows they believe in the company's future." }, { label: "What's Good?", text: "10-30% insider ownership often signals strong alignment. Very low insider ownership at smaller companies can be a yellow flag." }] }} />
          </div>
        </div>
      </Card>

      {/* ── Similar Stocks ──────────────────────────────────────────────────── */}
      {info.similar_stocks && info.similar_stocks.length > 0 && (
        <Card title={`Similar · ${info.sector}`} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {info.similar_stocks.map(s => {
              const pos = s.change_pct >= 0;
              return (
                <div key={s.ticker}
                  onClick={() => onSelectTicker?.(s.ticker)}
                  style={{ flex: "1 1 88px", minWidth: 80, border: "0.5px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "rgba(255,255,255,0.02)", cursor: onSelectTicker ? "pointer" : "default", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (onSelectTicker) { e.currentTarget.style.background = "rgba(201,168,76,0.06)"; (e.currentTarget.style as any).borderColor = AMBER + "44"; } }}
                  onMouseLeave={e => { if (onSelectTicker) { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = ""; } }}>
                  <div style={{ fontFamily: "Space Mono, monospace", fontSize: 11, fontWeight: 700, color: AMBER }}>{s.ticker}</div>
                  <div style={{ fontFamily: "Space Mono, monospace", fontSize: 12, color: "var(--text)", marginTop: 4 }}>${s.price.toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: pos ? GREEN : RED, marginTop: 2 }}>{pos ? "+" : ""}{s.change_pct.toFixed(2)}%</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Recent News ─────────────────────────────────────────────────────── */}
      <Card title="Recent News">
        <NewsSection ticker={info.ticker} />
      </Card>

      </>}
    </motion.div>
  );
}

// ── Inline news component ─────────────────────────────────────────────────────
function NewsSection({ ticker }: { ticker: string }) {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/news?tickers=${ticker}`)
      .then(r => r.json())
      .then(d => { setArticles((d.articles || d.sections?.[ticker] || []).slice(0, 5)); })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ padding: "10px 0", borderBottom: "0.5px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ height: 13, width: "88%", borderRadius: 4, background: "var(--bg3)", animation: "sdPulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: 10, width: "38%", borderRadius: 4, background: "var(--bg3)", animation: "sdPulse 1.5s ease-in-out infinite" }} />
        </div>
      ))}
    </div>
  );

  if (!articles.length) return <p style={{ fontSize: 12, color: "var(--text3)" }}>No recent news.</p>;

  return (
    <div>
      {articles.map((a, i) => (
        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
          style={{ display: "block", padding: "10px 0", borderBottom: i < articles.length - 1 ? "0.5px solid var(--border)" : "none", textDecoration: "none", transition: "opacity 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
          <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.45, marginBottom: 4 }}>{a.title}</div>
          <div style={{ display: "flex", gap: 8, fontSize: 10, color: "var(--text3)" }}>
            <span>{a.publisher || a.source}</span>
            {a.published && <span>{new Date(a.published).toLocaleDateString()}</span>}
          </div>
        </a>
      ))}
    </div>
  );
}
