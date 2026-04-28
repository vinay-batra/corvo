"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const GREEN = "#4caf7d";
const RED = "#e05c5c";
const AMBER = "#b8860b";

interface InsiderTransaction {
  name: string;
  title: string;
  transaction_type: "buy" | "sell";
  shares: number;
  price: number;
  date: string;
  filing_date: string;
  total_value: number;
}

interface InsiderData {
  ticker: string;
  transactions: InsiderTransaction[];
}

function fmtMoney(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtShares(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

function TypeBadge({ type }: { type: "buy" | "sell" }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 7px", borderRadius: 4,
      fontSize: 8, letterSpacing: 0.5, fontWeight: 700,
      background: type === "buy" ? "rgba(76,175,125,0.12)" : "rgba(224,92,92,0.12)",
      color: type === "buy" ? GREEN : RED,
      border: `0.5px solid ${type === "buy" ? "rgba(76,175,125,0.3)" : "rgba(224,92,92,0.3)"}`,
    }}>
      {type === "buy" ? "BUY" : "SELL"}
    </span>
  );
}

// ── Dashboard summary card: recent insider activity across portfolio holdings ──
export function InsiderActivitySummary({ assets }: { assets: { ticker: string; weight: number }[] }) {
  const [rows, setRows] = useState<(InsiderTransaction & { ticker: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assets.length) { setLoading(false); return; }
    const tickers = assets.map(a => a.ticker).slice(0, 10);
    setLoading(true);

    Promise.allSettled(
      tickers.map(t =>
        fetch(`${API_URL}/insider-activity/${t}`)
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then(results => {
      const combined: (InsiderTransaction & { ticker: string })[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value?.transactions?.length) {
          r.value.transactions.slice(0, 3).forEach((tx: InsiderTransaction) => {
            combined.push({ ...tx, ticker: tickers[i] });
          });
        }
      });
      combined.sort((a, b) => b.date.localeCompare(a.date));
      setRows(combined.slice(0, 10));
      setLoading(false);
    });
  }, [assets]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <style>{`@keyframes iaPulse{0%,100%{opacity:0.4}50%{opacity:0.9}}`}</style>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 44, borderRadius: 8, background: "var(--bg3)", animation: "iaPulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );

  if (!rows.length) return (
    <p style={{ fontSize: 12, color: "var(--text3)" }}>No recent insider transactions found for your holdings.</p>
  );

  const buyCount = rows.filter(r => r.transaction_type === "buy").length;
  const sellCount = rows.filter(r => r.transaction_type === "sell").length;
  const netBuying = buyCount > sellCount;
  const netSelling = sellCount > buyCount;

  return (
    <div>
      <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--bg2)", border: "0.5px solid var(--border)", marginBottom: 14, fontSize: 12, color: "var(--text2)", lineHeight: 1.65 }}>
        <span style={{ fontFamily: "Space Mono, monospace", fontWeight: 600, color: netBuying ? GREEN : netSelling ? RED : AMBER }}>
          {buyCount} {buyCount === 1 ? "buy" : "buys"} · {sellCount} {sellCount === 1 ? "sell" : "sells"}
        </span>
        {" "}across your holdings. {netBuying
          ? "Insiders are buying more than selling, which typically signals executives believe the stock is undervalued."
          : netSelling
          ? "Insiders are net selling. This is not always bearish — executives often sell to diversify — but large C-suite sales are worth monitoring."
          : "Insider buying and selling is balanced. No clear directional signal from management right now."}
      </div>
      <div>
        {rows.map((tx, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 0",
            borderBottom: i < rows.length - 1 ? "0.5px solid var(--border)" : "none",
          }}>
            <TypeBadge type={tx.transaction_type} />
            <div style={{ fontFamily: "Space Mono, monospace", fontSize: 10, fontWeight: 700, color: AMBER, flexShrink: 0, minWidth: 44 }}>
              {tx.ticker}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tx.name || "-"}
              </div>
              {tx.title && <div style={{ fontSize: 10, color: "var(--text3)" }}>{tx.title}</div>}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: "Space Mono, monospace", fontSize: 11, fontWeight: 600, color: tx.transaction_type === "buy" ? GREEN : RED }}>
                {tx.total_value > 0 ? fmtMoney(tx.total_value) : "-"}
              </div>
              <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>
                {fmtShares(tx.shares)} sh{tx.price > 0 ? ` @ $${tx.price.toFixed(2)}` : ""}
              </div>
            </div>
            <div style={{ fontSize: 10, color: "var(--text3)", flexShrink: 0, minWidth: 52, textAlign: "right" }}>
              {tx.date
                ? new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "-"}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 10 }}>
        Source: SEC Form 4 filings via Finnhub. Showing open market purchases (P) and sales (S) only.
      </p>
    </div>
  );
}

// ── Stock detail view: insider activity for a single ticker ───────────────────
export default function InsiderActivity({ ticker }: { ticker: string }) {
  const [data, setData] = useState<InsiderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null); setData(null);
    fetch(`${API_URL}/insider-activity/${ticker}`)
      .then(r => r.ok ? r.json() : r.json().then((e: any) => { throw new Error(e.detail || "Failed to load"); }))
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
      <style>{`@keyframes sdPulse{0%,100%{opacity:0.4}50%{opacity:0.9}}`}</style>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ height: 48, borderRadius: 10, background: "var(--bg3)", animation: "sdPulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );

  if (error) return (
    <div style={{ padding: "32px 0", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 6 }}>No insider data available</p>
      <p style={{ fontSize: 11, color: "var(--text3)" }}>{error}</p>
    </div>
  );

  if (!data || !data.transactions.length) return (
    <div style={{ padding: "32px 0", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "var(--text2)" }}>No recent insider transactions found</p>
      <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6, maxWidth: 300, margin: "6px auto 0" }}>
        No open market buys or sells reported recently. This is common for ETFs and foreign-listed securities.
      </p>
    </div>
  );

  const txns = data.transactions;
  const buyCount = txns.filter(t => t.transaction_type === "buy").length;
  const sellCount = txns.filter(t => t.transaction_type === "sell").length;
  const totalBuyValue = txns.filter(t => t.transaction_type === "buy").reduce((s, t) => s + t.total_value, 0);
  const totalSellValue = txns.filter(t => t.transaction_type === "sell").reduce((s, t) => s + t.total_value, 0);
  const netBuying = buyCount > sellCount;
  const netSelling = sellCount > buyCount;
  const signalColor = netBuying ? GREEN : netSelling ? RED : AMBER;
  const signalLabel = netBuying ? "Net Buy" : netSelling ? "Net Sell" : "Neutral";

  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div style={{ border: "0.5px solid rgba(76,175,125,0.25)", borderRadius: 10, padding: "12px 14px", background: "rgba(76,175,125,0.04)" }}>
          <div style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Open Mkt Buys</div>
          <div style={{ fontFamily: "Space Mono, monospace", fontSize: 18, fontWeight: 700, color: GREEN }}>{buyCount}</div>
          <div style={{ fontFamily: "Space Mono, monospace", fontSize: 11, color: GREEN, opacity: 0.8, marginTop: 2 }}>
            {totalBuyValue > 0 ? fmtMoney(totalBuyValue) : "-"}
          </div>
        </div>
        <div style={{ border: "0.5px solid rgba(224,92,92,0.25)", borderRadius: 10, padding: "12px 14px", background: "rgba(224,92,92,0.04)" }}>
          <div style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Open Mkt Sells</div>
          <div style={{ fontFamily: "Space Mono, monospace", fontSize: 18, fontWeight: 700, color: RED }}>{sellCount}</div>
          <div style={{ fontFamily: "Space Mono, monospace", fontSize: 11, color: RED, opacity: 0.8, marginTop: 2 }}>
            {totalSellValue > 0 ? fmtMoney(totalSellValue) : "-"}
          </div>
        </div>
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px", background: "var(--card-bg)" }}>
          <div style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Signal</div>
          <div style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: signalColor }}>{signalLabel}</div>
          <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>{txns.length} transactions</div>
        </div>
      </div>

      {/* Plain English context */}
      <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--bg2)", border: "0.5px solid var(--border)", fontSize: 12, color: "var(--text2)", lineHeight: 1.65 }}>
        {netBuying
          ? `Insiders at ${ticker} are buying more than selling on the open market. When executives purchase shares with their own money, it typically signals confidence in the company's near-term prospects. Pay attention to size and rank: CEO or CFO purchases carry more weight than a single director's small position.`
          : netSelling
          ? `Insiders at ${ticker} have been net sellers recently. This is not always bearish — executives often sell to diversify personal wealth or meet personal liquidity needs. But if the CEO or CFO is selling large blocks, it is worth investigating whether they have concerns about near-term performance.`
          : `Insider activity at ${ticker} is balanced between buys and sells. No clear directional signal from management right now. Monitor for any large single transactions from C-suite executives, which tend to be the most informative.`}
      </div>

      {/* Transactions table */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--card-bg)" }}>
        <div style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 2, height: 12, background: AMBER, borderRadius: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 8, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase", margin: 0 }}>SEC Form 4 Filings</p>
          <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: 4 }}>open market only</span>
        </div>
        <div style={{ overflowX: "auto", overscrollBehavior: "none" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 460 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid var(--border)" }}>
                {[
                  { label: "Type",        align: "center" },
                  { label: "Insider",     align: "left" },
                  { label: "Shares",      align: "right" },
                  { label: "Price",       align: "right" },
                  { label: "Total Value", align: "right" },
                  { label: "Date",        align: "right" },
                ].map(({ label, align }) => (
                  <th key={label} style={{ padding: "8px 12px", textAlign: align as any, fontSize: 8, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map((tx, i) => (
                <tr key={i} style={{ borderBottom: i < txns.length - 1 ? "0.5px solid var(--border)" : "none" }}>
                  <td style={{ padding: "9px 12px", textAlign: "center" }}>
                    <TypeBadge type={tx.transaction_type} />
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 500 }}>{tx.name || "-"}</div>
                    {tx.title && <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>{tx.title}</div>}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "Space Mono, monospace", fontSize: 11, color: "var(--text2)" }}>
                    {fmtShares(tx.shares)}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "Space Mono, monospace", fontSize: 11, color: "var(--text2)" }}>
                    {tx.price > 0 ? `$${tx.price.toFixed(2)}` : "-"}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "Space Mono, monospace", fontSize: 11, fontWeight: 600, color: tx.transaction_type === "buy" ? GREEN : RED }}>
                    {tx.total_value > 0 ? fmtMoney(tx.total_value) : "-"}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontSize: 10, color: "var(--text3)" }}>
                    {tx.date
                      ? new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: 10, color: "var(--text3)" }}>
        Source: SEC Form 4 filings via Finnhub. Open market purchases (P) and sales (S) only. Insiders must file within 2 business days of the transaction.
      </p>
    </motion.div>
  );
}
