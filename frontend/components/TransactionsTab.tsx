"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import InfoModal from "./InfoModal";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  ticker: string;
  type: "buy" | "sell";
  date: string;
  shares: number;
  price_per_share: number;
  total_value: number;
  created_at: string;
}

type SortKey = "date" | "ticker" | "type" | "shares" | "price_per_share" | "total_value";
type SortDir = "asc" | "desc";

interface TickerSummary {
  ticker: string;
  sharesHeld: number;
  totalCost: number;
  avgCostBasis: number;
  realizedGain: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: "'Space Mono', monospace" };

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtMoney(n: number) {
  return "$" + fmt(Math.abs(n));
}

function computeSummaries(txns: Transaction[]): TickerSummary[] {
  const map: Record<string, { sharesHeld: number; totalCost: number; realizedGain: number; buyLots: { shares: number; price: number }[] }> = {};

  const sorted = [...txns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const t of sorted) {
    if (!map[t.ticker]) map[t.ticker] = { sharesHeld: 0, totalCost: 0, realizedGain: 0, buyLots: [] };
    const rec = map[t.ticker];

    if (t.type === "buy") {
      rec.sharesHeld += t.shares;
      rec.totalCost += t.shares * t.price_per_share;
      rec.buyLots.push({ shares: t.shares, price: t.price_per_share });
    } else {
      // average cost method for realized gains
      const avgPrice = rec.sharesHeld > 0 ? rec.totalCost / rec.sharesHeld : 0;
      const gain = (t.price_per_share - avgPrice) * t.shares;
      rec.realizedGain += gain;
      const removed = Math.min(t.shares, rec.sharesHeld);
      if (rec.sharesHeld > 0) rec.totalCost -= (rec.totalCost / rec.sharesHeld) * removed;
      rec.sharesHeld = Math.max(0, rec.sharesHeld - t.shares);
    }
  }

  return Object.entries(map)
    .map(([ticker, rec]) => ({
      ticker,
      sharesHeld: rec.sharesHeld,
      totalCost: rec.totalCost,
      avgCostBasis: rec.sharesHeld > 0 ? rec.totalCost / rec.sharesHeld : 0,
      realizedGain: rec.realizedGain,
    }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}

// ── Sort header ───────────────────────────────────────────────────────────────

function SortTh({ label, col, sortKey, sortDir, onSort, right }: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void; right?: boolean;
}) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        padding: "8px 10px", fontSize: 10, fontWeight: 600,
        letterSpacing: 1, textTransform: "uppercase" as const,
        color: active ? "var(--accent)" : "var(--text3)",
        cursor: "pointer", userSelect: "none" as const,
        textAlign: right ? "right" : "left",
        borderBottom: "0.5px solid var(--border)",
        background: "var(--bg2)", whiteSpace: "nowrap",
      }}
    >
      {label}
      {active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TransactionsTab() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // form state
  const [showForm, setShowForm] = useState(false);
  const [ticker, setTicker] = useState("");
  const [txType, setTxType] = useState<"buy" | "sell">("buy");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  // table state
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // view state
  const [view, setView] = useState<"log" | "summary">("log");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      await loadTxns(user.id);
    })();
  }, []);

  async function loadTxns(uid: string) {
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("id,ticker,type,date,shares,price_per_share,total_value,created_at")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    setTxns((data as Transaction[]) ?? []);
    setLoading(false);
  }

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(col); setSortDir(col === "date" ? "desc" : "asc"); }
  };

  const sorted = useMemo(() => {
    return [...txns].sort((a, b) => {
      let av: string | number = a[sortKey];
      let bv: string | number = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        const cmp = av.localeCompare(bv);
        return sortDir === "asc" ? cmp : -cmp;
      }
      const cmp = (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [txns, sortKey, sortDir]);

  const summaries = useMemo(() => computeSummaries(txns), [txns]);
  const totalCostBasis = summaries.reduce((s, r) => s + r.totalCost, 0);
  const totalRealizedGain = summaries.reduce((s, r) => s + r.realizedGain, 0);

  const totalValue = useMemo(() => {
    const sharesN = parseFloat(shares);
    const priceN = parseFloat(price);
    if (!isNaN(sharesN) && !isNaN(priceN)) return sharesN * priceN;
    return null;
  }, [shares, price]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    const t = ticker.trim().toUpperCase();
    const s = parseFloat(shares);
    const p = parseFloat(price);
    if (!t) return setFormErr("Ticker is required.");
    if (isNaN(s) || s <= 0) return setFormErr("Shares must be a positive number.");
    if (isNaN(p) || p < 0) return setFormErr("Price must be zero or greater.");
    if (!userId) return;

    setSubmitting(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      ticker: t,
      type: txType,
      date,
      shares: s,
      price_per_share: p,
    });
    setSubmitting(false);

    if (error) { setFormErr("Failed to save. Please try again."); return; }

    setTicker(""); setShares(""); setPrice("");
    setDate(new Date().toISOString().slice(0, 10));
    setTxType("buy");
    setShowForm(false);
    await loadTxns(userId);
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    await supabase.from("transactions").delete().eq("id", id).eq("user_id", userId!);
    setDeleteId(null);
    setDeleting(false);
    if (userId) await loadTxns(userId);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", fontSize: 12,
    background: "var(--bg2)", border: "0.5px solid var(--border)",
    borderRadius: 7, color: "var(--text)", outline: "none",
    boxSizing: "border-box" as const,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, letterSpacing: 1,
    textTransform: "uppercase" as const, color: "var(--text3)", marginBottom: 4, display: "block",
  };

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 3, height: 16, background: "var(--accent)", borderRadius: 2 }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Transaction Log</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text3)", marginLeft: 11 }}>
            Manually log buy and sell transactions to track your cost basis and realized gains.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setFormErr(null); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", fontSize: 12, fontWeight: 600,
            borderRadius: 7, cursor: "pointer",
            background: showForm ? "var(--bg3)" : "var(--accent)",
            border: showForm ? "0.5px solid var(--border)" : "none",
            color: showForm ? "var(--text2)" : "var(--bg)",
            transition: "all 0.15s",
          }}
        >
          {showForm ? "Cancel" : "+ Log Transaction"}
        </button>
      </div>

      {/* Add transaction form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            // initial={false} required — do not remove
            initial={false}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: "clip" }}
          >
            <form
              onSubmit={handleSubmit}
              style={{
                background: "var(--card-bg)", border: "0.5px solid var(--border)",
                borderRadius: 12, padding: "20px 20px 16px",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 14 }}>
                {/* Ticker */}
                <div>
                  <label style={labelStyle}>Ticker</label>
                  <input
                    value={ticker}
                    onChange={e => setTicker(e.target.value.toUpperCase())}
                    placeholder="AAPL"
                    maxLength={10}
                    style={{ ...inputStyle, ...MONO, textTransform: "uppercase" as const }}
                  />
                </div>

                {/* Type */}
                <div>
                  <label style={labelStyle}>Type</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["buy", "sell"] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTxType(t)}
                        style={{
                          flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 600,
                          borderRadius: 7, cursor: "pointer", transition: "all 0.12s",
                          border: txType === t
                            ? t === "buy" ? "0.5px solid rgba(92,184,138,0.5)" : "0.5px solid rgba(224,92,92,0.5)"
                            : "0.5px solid var(--border)",
                          background: txType === t
                            ? t === "buy" ? "rgba(92,184,138,0.12)" : "rgba(224,92,92,0.12)"
                            : "var(--bg2)",
                          color: txType === t
                            ? t === "buy" ? "#5cb88a" : "#e05c5c"
                            : "var(--text3)",
                        }}
                      >
                        {t === "buy" ? "Buy" : "Sell"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label style={labelStyle}>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    style={{ ...inputStyle, ...MONO }}
                  />
                </div>

                {/* Shares */}
                <div>
                  <label style={labelStyle}>Shares</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={shares}
                    onChange={e => setShares(e.target.value)}
                    placeholder="10"
                    style={{ ...inputStyle, ...MONO }}
                  />
                </div>

                {/* Price per share */}
                <div>
                  <label style={labelStyle}>Price / Share</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="150.00"
                    style={{ ...inputStyle, ...MONO }}
                  />
                </div>

                {/* Total preview */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <label style={labelStyle}>Total Value</label>
                  <div style={{
                    padding: "8px 10px", borderRadius: 7, fontSize: 13,
                    background: "var(--bg3)", border: "0.5px solid var(--border2)",
                    color: totalValue !== null ? "var(--text)" : "var(--text3)",
                    ...MONO,
                  }}>
                    {totalValue !== null ? `$${fmt(totalValue)}` : "--"}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {formErr && (
                  <motion.div
                    // initial={false} required — do not remove
                    initial={false}
                    animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ fontSize: 11, color: "#e05c5c", marginBottom: 10 }}
                  >
                    {formErr}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "8px 22px", fontSize: 12, fontWeight: 600,
                    borderRadius: 7, border: "none", cursor: submitting ? "not-allowed" : "pointer",
                    background: "var(--accent)", color: "var(--bg)",
                    opacity: submitting ? 0.6 : 1, transition: "opacity 0.15s",
                  }}
                >
                  {submitting ? "Saving..." : "Save Transaction"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View toggle + summary pills */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["log", "summary"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "5px 13px", fontSize: 11, fontWeight: view === v ? 600 : 400,
                borderRadius: 8, cursor: "pointer", transition: "all 0.12s",
                border: view === v ? "0.5px solid var(--accent)" : "0.5px solid var(--border)",
                background: view === v ? "rgba(184,134,11,0.08)" : "transparent",
                color: view === v ? "var(--accent)" : "var(--text3)",
              }}
            >
              {v === "log" ? "All Transactions" : "Summary"}
            </button>
          ))}
        </div>

        {txns.length > 0 && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", alignItems: "center", gap: 4 }}>
              Cost basis
              <InfoModal title="Cost Basis" sections={[{ label: "Plain English", text: "The total amount you paid to acquire your current shares, including all buy transactions. Used to calculate realized gains when you sell." }, { label: "Example", text: "Bought 10 shares at $100 and 5 shares at $120 = cost basis of $1,600." }, { label: "What's Good?", text: "Your cost basis determines your taxable gain or loss when you sell. Keeping accurate records is important for tax purposes." }]} />
              {": "}
              <span style={{ ...MONO, color: "var(--text)", fontWeight: 600 }}>${fmt(totalCostBasis)}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", alignItems: "center", gap: 4 }}>
              Realized P&amp;L
              <InfoModal title="Realized Profit and Loss" sections={[{ label: "Plain English", text: "Actual profit or loss locked in when you sell shares. Calculated as sale price minus average cost basis, multiplied by shares sold." }, { label: "Example", text: "Avg cost basis $100, sell 10 shares at $130 = realized gain of $300." }, { label: "What's Good?", text: "Positive means you profited on closed positions. Realized losses can sometimes offset realized gains for tax purposes." }]} />
              {": "}
              <span style={{ ...MONO, fontWeight: 600, color: totalRealizedGain >= 0 ? "#5cb88a" : "#e05c5c" }}>
                {totalRealizedGain >= 0 ? "+" : "-"}{fmtMoney(totalRealizedGain)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
          <div style={{ width: 20, height: 20, border: "1.5px solid var(--border2)", borderTopColor: "var(--text)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : txns.length === 0 ? (
        <div style={{
          textAlign: "center" as const, padding: "48px 24px",
          background: "var(--card-bg)", border: "0.5px solid var(--border)",
          borderRadius: 12, color: "var(--text3)", fontSize: 13,
        }}>
          <div style={{ marginBottom: 8, fontSize: 15, color: "var(--text2)" }}>No transactions yet</div>
          Log your first buy or sell to start tracking your cost basis and gains.
        </div>
      ) : view === "log" ? (
        <div style={{ background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, minWidth: 480 }}>
              <thead>
                <tr>
                  <SortTh label="Date"        col="date"           sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Ticker"      col="ticker"         sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Type"        col="type"           sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Shares"      col="shares"         sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                  <SortTh label="Price / Sh"  col="price_per_share" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                  <SortTh label="Total"       col="total_value"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                  <th style={{ padding: "8px 10px", background: "var(--bg2)", borderBottom: "0.5px solid var(--border)", width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((t, i) => (
                  <tr
                    key={t.id}
                    style={{ borderBottom: i < sorted.length - 1 ? "0.5px solid var(--border)" : "none" }}
                  >
                    <td style={{ padding: "10px 10px", fontSize: 12, color: "var(--text2)", ...MONO, whiteSpace: "nowrap" }}>
                      {t.date}
                    </td>
                    <td style={{ padding: "10px 10px", fontSize: 12, fontWeight: 600, color: "var(--text)", ...MONO }}>
                      {t.ticker}
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                        padding: "2px 7px", borderRadius: 4,
                        textTransform: "uppercase" as const,
                        background: t.type === "buy" ? "rgba(92,184,138,0.12)" : "rgba(224,92,92,0.12)",
                        color: t.type === "buy" ? "#5cb88a" : "#e05c5c",
                      }}>
                        {t.type}
                      </span>
                    </td>
                    <td style={{ padding: "10px 10px", fontSize: 12, color: "var(--text)", textAlign: "right", ...MONO }}>
                      {fmt(t.shares, 4).replace(/\.?0+$/, "")}
                    </td>
                    <td style={{ padding: "10px 10px", fontSize: 12, color: "var(--text)", textAlign: "right", ...MONO }}>
                      ${fmt(t.price_per_share)}
                    </td>
                    <td style={{ padding: "10px 10px", fontSize: 12, fontWeight: 600, color: "var(--text)", textAlign: "right", ...MONO }}>
                      ${fmt(t.total_value)}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "center" as const }}>
                      {deleteId === t.id ? (
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={deleting}
                            style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "0.5px solid rgba(224,92,92,0.5)", background: "rgba(224,92,92,0.12)", color: "#e05c5c", cursor: "pointer" }}
                          >
                            {deleting ? "..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text3)", cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteId(t.id)}
                          style={{ width: 22, height: 22, borderRadius: 5, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Summary view */
        <div style={{ background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, minWidth: 480 }}>
              <thead>
                <tr>
                  {([
                    { label: "Ticker", tip: null },
                    { label: "Shares Held", tip: null },
                    { label: "Avg Cost Basis", tip: { title: "Average Cost Basis Per Share", sections: [{ label: "Plain English", text: "Average price paid per share, calculated by dividing total cost by shares held. Used to determine realized gain or loss when selling." }, { label: "Example", text: "Bought 5 shares at $100 and 5 at $120, so average cost basis = $110 per share." }, { label: "What's Good?", text: "This is the per-share threshold you need to beat when selling to book a gain." }] } },
                    { label: "Total Cost", tip: { title: "Total Cost", sections: [{ label: "Plain English", text: "Total amount invested in this position -- your average cost per share multiplied by shares still held." }, { label: "Example", text: "10 shares held with avg cost basis of $110 = total cost of $1,100." }, { label: "What's Good?", text: "Compare to current market value to estimate your unrealized gain or loss." }] } },
                    { label: "Realized P&L", tip: { title: "Realized Profit and Loss", sections: [{ label: "Plain English", text: "Actual profit or loss locked in from closed positions (shares you have sold). Calculated using the average cost method." }, { label: "Example", text: "Avg cost basis $100, sell 10 shares at $130 = realized gain of $300." }, { label: "What's Good?", text: "Positive means you profited on closed positions. Realized losses can sometimes offset realized gains for tax purposes." }] } },
                  ] as { label: string; tip: { title: string; sections: { label: string; text: string }[] } | null }[]).map(({ label, tip }, i) => (
                    <th key={label} style={{
                      padding: "8px 12px", fontSize: 10, fontWeight: 600,
                      letterSpacing: 1, textTransform: "uppercase" as const,
                      color: "var(--text3)", textAlign: i === 0 ? "left" : "right",
                      borderBottom: "0.5px solid var(--border)",
                      background: "var(--bg2)", whiteSpace: "nowrap",
                    }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: i === 0 ? "flex-start" : "flex-end" }}>
                        {label}
                        {tip && <InfoModal title={tip.title} sections={tip.sections} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaries.map((s, i) => (
                  <tr key={s.ticker} style={{ borderBottom: i < summaries.length - 1 ? "0.5px solid var(--border)" : "none" }}>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "var(--text)", ...MONO }}>
                      {s.ticker}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text)", textAlign: "right", ...MONO }}>
                      {fmt(s.sharesHeld, 4).replace(/\.?0+$/, "")}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text)", textAlign: "right", ...MONO }}>
                      {s.sharesHeld > 0 ? `$${fmt(s.avgCostBasis)}` : <span style={{ color: "var(--text3)" }}>--</span>}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text)", textAlign: "right", ...MONO }}>
                      ${fmt(s.totalCost)}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 600, textAlign: "right", ...MONO,
                      color: s.realizedGain > 0 ? "#5cb88a" : s.realizedGain < 0 ? "#e05c5c" : "var(--text3)" }}>
                      {s.realizedGain === 0 ? "--" : `${s.realizedGain > 0 ? "+" : "-"}$${fmt(Math.abs(s.realizedGain))}`}
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr style={{ borderTop: "0.5px solid var(--border2)" }}>
                  <td style={{ padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: 0.8 }}>Total</td>
                  <td />
                  <td />
                  <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "var(--text)", textAlign: "right", ...MONO }}>
                    ${fmt(totalCostBasis)}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, textAlign: "right", ...MONO,
                    color: totalRealizedGain > 0 ? "#5cb88a" : totalRealizedGain < 0 ? "#e05c5c" : "var(--text3)" }}>
                    {totalRealizedGain === 0 ? "--" : `${totalRealizedGain > 0 ? "+" : "-"}$${fmt(Math.abs(totalRealizedGain))}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
