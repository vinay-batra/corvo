"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { RESOLVED_API_URL } from "../lib/api";
import { liveValueFromAnchor } from "../lib/anchorValue";
import { type AccountTypeId, isAccountTypeId, DEFAULT_ACCOUNT_TYPE, getAccountType } from "../lib/accountType";

const LS_KEY = "corvo_saved_portfolios";
const HISTORY_KEY_PREFIX = "corvo_history_";
const C = { amber: "var(--accent)", amber2: "rgba(184,134,11,0.1)", border: "var(--border)", cream: "var(--text)", cream2: "var(--text2)", cream3: "var(--text3)" };

// Tax bucket classification - used for the cross-account Net Worth panel
type TaxBucket = "free" | "deferred" | "taxable";
const TAX_BUCKET: Record<AccountTypeId, TaxBucket> = {
  roth_ira: "free",
  roth_401k: "free",
  hsa: "free",
  "529": "free",
  traditional_ira: "deferred",
  traditional_401k: "deferred",
  taxable_brokerage: "taxable",
  custodial: "taxable",
};
const BUCKET_META: Record<TaxBucket, { label: string; color: string }> = {
  free:     { label: "Tax-Free",     color: "#4caf7d" },
  deferred: { label: "Tax-Deferred", color: "var(--accent)" },
  taxable:  { label: "Taxable",      color: "var(--text3)" },
};

function fmtDollar(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000)    return `$${Math.round(n).toLocaleString()}`;
  return `$${n.toFixed(2)}`;
}
interface Asset { ticker: string; weight: number; accountType?: AccountTypeId; }
interface Portfolio { id: string; name: string; assets: Asset[]; period?: string; accountType: AccountTypeId; updatedAt?: string; portfolioValue?: number | null; reinvestDividends?: boolean; anchorPrices?: Record<string, number> | null; anchorDate?: string | null; }

/** Map a Supabase portfolios row → local Portfolio */
function fromDb(row: any): Portfolio {
  const tickers: string[] = row.tickers ?? [];
  const weights: number[] = row.weights ?? [];
  const holdingAccountTypes: string[] = row.holding_account_types ?? [];
  const accountType: AccountTypeId =
    isAccountTypeId(row.account_type) ? row.account_type : DEFAULT_ACCOUNT_TYPE;
  // portfolio_value is per-saved-portfolio (added in
  // 20260527000000_portfolios_portfolio_value.sql). Rows that pre-date the
  // migration have NULL here; the caller falls back to the localStorage
  // seed (corvo_portfolio_value) in that case so old portfolios don't snap
  // to $0 when re-loaded.
  const rawValue = row.portfolio_value;
  const portfolioValue: number | null =
    rawValue == null || rawValue === "" ? null
      : Number.isFinite(Number(rawValue)) ? Number(rawValue) : null;
  // reinvest_dividends defaults to true at the DB level (migration
  // 20260527010000) so legacy rows automatically pick up the historical
  // implicit default. Treat any non-false value (null, undefined,
  // missing column on a pre-deploy backend) as true so the toggle never
  // silently flips off after a portfolio load.
  const reinvestDividends: boolean = row.reinvest_dividends === false ? false : true;
  return {
    id: row.id,
    name: row.name,
    assets: tickers.map((t, i) => {
      const tag = holdingAccountTypes[i];
      return {
        ticker: t,
        weight: weights[i] ?? 0,
        accountType: tag && isAccountTypeId(tag) ? tag : undefined,
      };
    }),
    accountType,
    updatedAt: row.updated_at || row.created_at,
    portfolioValue,
    reinvestDividends,
    anchorPrices: (row.value_anchor_prices && typeof row.value_anchor_prices === "object") ? row.value_anchor_prices : null,
    anchorDate: row.portfolio_value_date ?? null,
  };
}

/** Map local Portfolio → Supabase row shape */
function toDb(p: Portfolio, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    tickers: p.assets.map(a => a.ticker),
    weights: p.assets.map(a => a.weight),
    // Empty string in the array = "use portfolio default". Always-write the
    // full array (even when all entries are empty) so updates wipe stale
    // tags rather than silently preserving them.
    holding_account_types: p.assets.map(a => a.accountType ?? ""),
    account_type: p.accountType,
    // null is intentional - leaves the column unset so we can tell "user
    // hasn't picked a value yet" apart from "user picked $0" downstream
    // (the seed fallback only fires on null, not on 0).
    portfolio_value: p.portfolioValue == null ? null : Number(p.portfolioValue),
    // Same default-true semantics as fromDb. Always write an explicit
    // boolean so the column never goes null and we don't rely on the
    // DB default after the first write.
    reinvest_dividends: p.reinvestDividends === false ? false : true,
    updated_at: new Date().toISOString(),
  };
}

// "Analyzed 3 days ago", "Analyzed today", "Analyzed yesterday" - short
// relative timestamp shown on each Saved chip so the user knows how stale
// the analysis is without having to click in.
function relativeAnalyzed(iso: string | undefined): string {
  if (!iso) return "Never analyzed";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "Never analyzed";
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) return "Analyzed just now";
  if (diffMin < 60) return `Analyzed ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Analyzed ${diffHr}h ago`;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Analyzed today";
  if (diffDays === 1) return "Analyzed yesterday";
  if (diffDays < 7) return `Analyzed ${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Analyzed ${weeks}w ago`;
  }
  const months = Math.floor(diffDays / 30);
  return `Analyzed ${months}mo ago`;
}

function computeHealth(data: any): number {
  const ret = data.portfolio_return ?? 0;
  const vol = data.portfolio_volatility ?? 0.2;
  const sharpe = vol > 0 ? (ret - 0.04) / vol : 0;
  const rS = Math.min(Math.max(((ret + 0.3) / 0.6) * 100, 0), 100);
  const shS = Math.min(Math.max((sharpe / 3) * 100, 0), 100);
  const vS = Math.min(Math.max((1 - vol / 0.6) * 100, 0), 100);
  const dS = Math.min(Math.max((1 + (data.max_drawdown ?? 0) / 0.5) * 100, 0), 100);
  return Math.round(rS * 0.3 + shS * 0.3 + vS * 0.25 + dS * 0.15);
}

export function saveHistorySnapshot(portfolioId: string, data: any) {
  try {
    if (typeof window === "undefined") return;
    const key = HISTORY_KEY_PREFIX + portfolioId;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const snapshot = {
      date: new Date().toISOString(),
      return: data.portfolio_return ?? 0,
      volatility: data.portfolio_volatility ?? 0,
      sharpe: data.sharpe_ratio ?? (data.portfolio_volatility > 0 ? ((data.annualized_return ?? data.portfolio_return) - 0.04) / data.portfolio_volatility : 0),
      health: computeHealth(data),
    };
    const today = snapshot.date.slice(0, 10);
    const filtered = existing.filter((s: any) => s.date?.slice(0, 10) !== today);
    localStorage.setItem(key, JSON.stringify([...filtered, snapshot].slice(-30)));
  } catch {}
}

export function loadHistory(portfolioId: string): any[] {
  try { if (typeof window === "undefined") return []; return JSON.parse(localStorage.getItem(HISTORY_KEY_PREFIX + portfolioId) || "[]"); } catch { return []; }
}

function loadLocal(): Portfolio[] {
  try { if (typeof window === "undefined") return []; const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveLocal(portfolios: Portfolio[]) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_KEY, JSON.stringify(portfolios));
    // Notify PositionsTab (same page) that portfolios changed
    window.dispatchEvent(new CustomEvent("corvo:portfolio-saved"));
  } catch {}
}

export default function SavedPortfolios({ assets, data, accountType, currentPortfolioValue, currentReinvestDividends, onLoad }: {
  assets: Asset[];
  data: any;
  accountType: AccountTypeId;
  // The live portfolio value the user has entered for the currently active
  // portfolio. Captured into the new portfolio row on save() so each saved
  // portfolio carries its own value, instead of every account sharing the
  // single localStorage seed. Optional - when omitted, save() writes null
  // and the loader falls back to the seed on re-open.
  currentPortfolioValue?: number | null;
  // The live reinvest-dividends toggle state for the currently active
  // portfolio. Same pattern as currentPortfolioValue: snapshotted into the
  // new portfolio row on save() so each saved portfolio carries its own
  // preference instead of every account sharing the single localStorage
  // toggle.
  currentReinvestDividends?: boolean;
  // Pass the saved portfolio's id + name + value + reinvest back so the
  // dashboard can apply per-portfolio settings synchronously on click.
  // savedPortfolioId is critical for perfHistory to refetch and the live
  // value to ratchet day-over-day from the right snapshot. Without it,
  // savedPortfolioId only updates via an async auto-detect useEffect on
  // assets changes, which races against the polling fetch and can leave
  // the live value pinned to the previously-loaded portfolio.
  // portfolioValue arrives as null for portfolios saved before the column
  // migration; the dashboard keeps the existing seed in that case.
  // reinvestDividends defaults to true (matching the historical implicit
  // default + DB column default) so it's always a real boolean.
  onLoad: (a: Asset[], accountType: AccountTypeId, portfolioId: string, portfolioName: string, portfolioValue: number | null, reinvestDividends: boolean, anchorPrices?: Record<string, number> | null, anchorDate?: string | null) => void;
}) {
  // Match the active assets against saved portfolios so the matching chip
  // can be visually highlighted as "you're viewing this one right now".
  // Ticker-set match (sorted, ignoring weights) - if user has tweaked
  // weights on a saved portfolio, the chip still reads as active since the
  // portfolio identity is the holdings, not the exact weights.
  const activeTickersKey = assets.map(a => a.ticker).filter(Boolean).sort().join(",");
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [name, setName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [focused, setFocused] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // Live prices for every ticker across saved portfolios, so the Portfolio
  // Total sums each account's LIVE value (anchor x weighted growth) and keeps
  // updating intraday instead of summing the frozen entered values.
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data: authData }) => {
      const u = authData.user ?? null;
      setUser(u);
      fetchPortfolios(u);
    }).catch(() => fetchPortfolios(null));
  }, []);

  // Auto-save history snapshot when analysis data arrives
  useEffect(() => {
    if (!data || !portfolios.length) return;
    const currentTickers = assets.map(a => a.ticker).sort().join(",");
    const match = portfolios.find(p =>
      p.assets.map((a: Asset) => a.ticker).sort().join(",") === currentTickers
    );
    if (match) saveHistorySnapshot(match.id, data);
  }, [data]);

  // The dashboard persists per-portfolio value / account-type edits to Supabase
  // on a debounce, then fires `corvo:portfolio-row-updated`. This component is
  // always mounted (the Saved tab is a display toggle), so without this its
  // `portfolios` cache stays frozen at the values fetched on mount and the
  // Portfolio Total aggregate + tax-bucket breakdown never move when the user
  // changes a saved portfolio's value. Patch the matching row in place so the
  // derived totals recompute on the next render.
  useEffect(() => {
    const onRowUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        { id?: string; portfolio_value?: number | null; account_type?: string; updated_at?: string; anchor_prices?: Record<string, number> | null; anchor_date?: string | null } | undefined;
      if (!detail?.id) return;
      setPortfolios(prev => prev.map(p => {
        if (p.id !== detail.id) return p;
        const next: Portfolio = { ...p };
        if ("anchor_prices" in detail) {
          next.anchorPrices = (detail.anchor_prices && typeof detail.anchor_prices === "object") ? detail.anchor_prices : null;
          next.anchorDate = detail.anchor_date ?? next.anchorDate ?? null;
        }
        if ("portfolio_value" in detail) {
          const raw = detail.portfolio_value;
          next.portfolioValue =
            raw == null || !Number.isFinite(Number(raw)) ? null : Number(raw);
        }
        if (detail.account_type && isAccountTypeId(detail.account_type)) {
          next.accountType = detail.account_type;
        }
        if (detail.updated_at) {
          next.updatedAt = detail.updated_at;
        }
        return next;
      }));
    };
    window.addEventListener("corvo:portfolio-row-updated", onRowUpdated);
    return () => window.removeEventListener("corvo:portfolio-row-updated", onRowUpdated);
  }, []);

  // Poll live prices for the union of tickers across portfolios that have a
  // value set, so the Portfolio Total reflects each account's LIVE value and
  // keeps ticking intraday (instead of summing the frozen entered values).
  const pricedTickersKey = portfolios
    .filter(p => (p.portfolioValue ?? 0) > 0)
    .flatMap(p => p.assets.map(a => a.ticker).filter(Boolean))
    .sort().join(",");
  useEffect(() => {
    const tickers = pricedTickersKey ? Array.from(new Set(pricedTickersKey.split(","))) : [];
    if (tickers.length < 1) return;
    let cancelled = false;
    const ctrl = new AbortController();
    const load = async () => {
      try {
        const r = await fetch(`${RESOLVED_API_URL}/watchlist-data?tickers=${tickers.join(",")}`, { signal: ctrl.signal });
        const d = await r.json();
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const s of (d.results || [])) {
          const p = Number(s.price);
          if (s.ticker && Number.isFinite(p) && p > 0) next[String(s.ticker).toUpperCase()] = p;
        }
        setLivePrices(next);
      } catch { /* AbortError on cleanup, or transient - keep last prices */ }
    };
    load();
    const id = setInterval(load, 60000);
    return () => { cancelled = true; ctrl.abort(); clearInterval(id); };
  }, [pricedTickersKey]);

  const fetchPortfolios = async (u?: any) => {
    const activeUser = u ?? user;
    if (activeUser) {
      try {
        const { data: remote, error } = await supabase
          .from("portfolios")
          .select("*")
          .eq("user_id", activeUser.id)
          .order("created_at", { ascending: false });
        if (!error && remote) {
          setPortfolios(remote.map(fromDb));
          return;
        }
      } catch {}
    }
    // Logged-out or Supabase unavailable, use localStorage
    setPortfolios(loadLocal());
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const newPortfolio: Portfolio = {
      id: crypto.randomUUID(),
      name: name.trim(),
      assets,
      accountType,
      // Snapshot whatever the user currently has in the sidebar Portfolio
      // Value input. If the prop is omitted (older callsite), pass null so
      // the column stays unset and the seed fallback takes over.
      portfolioValue: currentPortfolioValue == null ? null : Number(currentPortfolioValue),
      // Snapshot reinvest-dividends. If omitted, default true matches the
      // historical implicit default + the DB column default.
      reinvestDividends: currentReinvestDividends === false ? false : true,
    };

    if (user) {
      try {
        const { error } = await supabase
          .from("portfolios")
          .upsert(toDb(newPortfolio, user.id), { onConflict: "id" });
        if (!error) {
          await fetchPortfolios();
          setSavedOk(true);
          window.dispatchEvent(new CustomEvent("corvo:portfolio-saved"));
          setTimeout(() => { setSavedOk(false); setName(""); setShowSave(false); setSaving(false); }, 1000);
          return;
        }
      } catch {}
    }

    // Fallback: localStorage (saveLocal already dispatches the event)
    const local = loadLocal();
    const updated = [newPortfolio, ...local];
    saveLocal(updated);
    setPortfolios(updated);
    setSavedOk(true);
    setTimeout(() => { setSavedOk(false); setName(""); setShowSave(false); setSaving(false); }, 1000);
  };

  const remove = async (id: string) => {
    if (user) {
      try { await supabase.from("portfolios").delete().eq("id", id).eq("user_id", user.id); } catch {}
      await fetchPortfolios();
    } else {
      const updated = loadLocal().filter(p => p.id !== id);
      saveLocal(updated);
      setPortfolios(updated);
    }
  };

  // Load a saved portfolio into the dashboard. For logged-in users we read
  // this row's CURRENT value/settings straight from Supabase at click time,
  // NOT the cached `portfolios` array. That array is fetched once on mount and
  // goes stale the moment the dashboard persists a new portfolio_value - so
  // clicking back to a portfolio you just edited would hand over the old
  // mount-time value and the display would "reset". Reading fresh here means
  // each account always loads exactly the value last saved to its row.
  const loadPortfolio = async (p: Portfolio) => {
    let pv: number | null = p.portfolioValue ?? null;
    let reinvest: boolean = p.reinvestDividends === false ? false : true;
    let at: AccountTypeId = p.accountType;
    let anchorPrices: Record<string, number> | null = p.anchorPrices ?? null;
    let anchorDate: string | null = p.anchorDate ?? null;
    if (user) {
      try {
        const { data: row } = await supabase
          .from("portfolios")
          .select("portfolio_value, reinvest_dividends, account_type, value_anchor_prices, portfolio_value_date")
          .eq("id", p.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (row) {
          const raw = row.portfolio_value;
          pv = raw == null || raw === "" || !Number.isFinite(Number(raw)) ? null : Number(raw);
          reinvest = row.reinvest_dividends === false ? false : true;
          at = isAccountTypeId(row.account_type) ? row.account_type : p.accountType;
          anchorPrices = (row.value_anchor_prices && typeof row.value_anchor_prices === "object") ? row.value_anchor_prices : null;
          anchorDate = row.portfolio_value_date ?? null;
        }
      } catch { /* fall back to cached values below */ }
    }
    onLoad(p.assets, at, p.id, p.name, pv, reinvest, anchorPrices, anchorDate);
  };

  // Cross-account Net Worth panel - shows when 2+ portfolios have a value set.
  // Each account's contribution is its LIVE value (anchor x weighted growth),
  // so the Total tracks the market and updates intraday with the price poll.
  const portfoliosWithValues = portfolios.filter(p => (p.portfolioValue ?? 0) > 0);
  const showNetWorth = portfoliosWithValues.length >= 2;
  const liveValueOf = (p: Portfolio): number =>
    liveValueFromAnchor(p.portfolioValue ?? 0, p.assets, p.anchorPrices, livePrices).value;
  const netWorthTotal = portfoliosWithValues.reduce((s, p) => s + liveValueOf(p), 0);
  const bucketTotals: Record<TaxBucket, number> = { free: 0, deferred: 0, taxable: 0 };
  portfoliosWithValues.forEach(p => { bucketTotals[TAX_BUCKET[p.accountType] ?? "taxable"] += liveValueOf(p); });

  return (
    <div>
      {/* Net Worth aggregate panel */}
      {showNetWorth && (
        <div style={{ marginBottom: 14, padding: "12px 13px", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 10 }}>
          <div style={{ fontSize: 9.5, letterSpacing: 2, color: C.amber, textTransform: "uppercase", fontWeight: 700, fontFamily: "Space Mono, monospace", marginBottom: 6 }}>Portfolio Total</div>
          <div style={{ fontSize: 19, fontWeight: 700, fontFamily: "Space Mono, monospace", color: C.cream, letterSpacing: -0.5, marginBottom: 10 }}>
            {fmtDollar(netWorthTotal)}
          </div>
          {/* Stacked tax-bucket bar */}
          <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", gap: 1.5, marginBottom: 8 }}>
            {(["free", "deferred", "taxable"] as TaxBucket[]).map(bucket => {
              const pct = netWorthTotal > 0 ? (bucketTotals[bucket] / netWorthTotal) * 100 : 0;
              if (pct < 0.5) return null;
              return (
                <div key={bucket} style={{ flex: pct, background: BUCKET_META[bucket].color, borderRadius: 3, minWidth: 4, opacity: bucket === "taxable" ? 0.55 : 0.85 }} />
              );
            })}
          </div>
          {/* Legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {(["free", "deferred", "taxable"] as TaxBucket[]).map(bucket => {
              if (bucketTotals[bucket] <= 0) return null;
              const pct = Math.round((bucketTotals[bucket] / netWorthTotal) * 100);
              return (
                <div key={bucket} style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: BUCKET_META[bucket].color, flexShrink: 0, opacity: bucket === "taxable" ? 0.55 : 0.85 }} />
                    <span style={{ fontSize: 9.5, color: C.cream3, fontFamily: "Space Mono, monospace", letterSpacing: 0.2 }}>{BUCKET_META[bucket].label}</span>
                  </div>
                  <span style={{ fontSize: 9.5, color: C.cream2, fontFamily: "Space Mono, monospace", letterSpacing: 0.2 }}>{fmtDollar(bucketTotals[bucket])} <span style={{ color: C.cream3 }}>({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 10, letterSpacing: 2.5, color: C.amber, textTransform: "uppercase", fontWeight: 700, fontFamily: "Space Mono, monospace" }}>Saved</span>
        <button id="tour-save-btn" data-save-trigger onClick={() => setShowSave(s => !s)}
          style={{ fontSize: 10.5, letterSpacing: 1.2, color: C.amber, background: "rgba(201,168,76,0.07)", border: "0.5px solid rgba(201,168,76,0.25)", borderRadius: 6, cursor: "pointer", padding: "3px 9px", fontWeight: 700, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.14)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.07)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)"; }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Save
        </button>
      </div>
      <AnimatePresence initial={false}>
        {showSave && (
          <motion.div
            initial={false} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 5 }}>
              <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && save()}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="Portfolio name..."
                autoFocus
                style={{ flex: 1, padding: "6px 9px", background: "rgba(255,255,255,0.04)", border: `1px solid ${focused ? "rgba(201,168,76,0.4)" : C.border}`, borderRadius: 7, color: C.cream, fontSize: 11, fontFamily: "Inter,sans-serif", outline: "none", transition: "border-color 0.15s" }} />
              <button onClick={save} disabled={saving || savedOk}
                style={{ padding: "6px 10px", background: savedOk ? "rgba(92,184,138,0.15)" : C.amber2, border: `1px solid ${savedOk ? "rgba(92,184,138,0.4)" : "rgba(201,168,76,0.3)"}`, borderRadius: 7, color: savedOk ? "#5cb88a" : C.amber, fontSize: 10, cursor: "pointer", fontWeight: 700, transition: "all 0.2s", minWidth: 32 }}>
                {saving ? "..." : savedOk ? "OK" : "OK"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {portfolios.length === 0 ? (
        <p style={{ fontSize: 11, color: C.cream3, textAlign: "center", padding: "10px 0", letterSpacing: 0.1 }}>No saved portfolios</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {portfolios.map(p => {
            const pKey = p.assets.map(a => a.ticker).filter(Boolean).sort().join(",");
            const isActive = !!pKey && pKey === activeTickersKey;
            return (
              <motion.div key={p.id} initial={false} animate={{ opacity: 1 }}
                role="button"
                tabIndex={0}
                aria-label={`Load portfolio: ${p.name}`}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); loadPortfolio(p); } }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "10px 11px",
                  background: isActive ? "rgba(201,168,76,0.06)" : "var(--bg2)",
                  borderRadius: 10,
                  border: `0.5px solid ${isActive ? "rgba(201,168,76,0.45)" : C.border}`,
                  borderLeft: `2px solid ${isActive ? "var(--accent)" : "transparent"}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  position: "relative",
                  boxShadow: isActive ? "0 0 12px rgba(201,168,76,0.14)" : "none",
                }}
                onClick={() => loadPortfolio(p)}
                onMouseEnter={e => {
                  if (isActive) return;
                  e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)";
                  e.currentTarget.style.borderLeftColor = "var(--accent)";
                  e.currentTarget.style.background = "rgba(201,168,76,0.05)";
                  e.currentTarget.style.transform = "translateX(1px)";
                }}
                onMouseLeave={e => {
                  if (isActive) return;
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.borderLeftColor = "transparent";
                  e.currentTarget.style.background = "var(--bg2)";
                  e.currentTarget.style.transform = "translateX(0)";
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: isActive ? C.amber : C.cream2, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: -0.1, flex: 1, minWidth: 0 }}>{p.name}</p>
                    {p.accountType !== DEFAULT_ACCOUNT_TYPE && (
                      <span title={getAccountType(p.accountType).label}
                        style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 0.8, color: C.amber, background: "rgba(201,168,76,0.1)", border: "0.5px solid rgba(201,168,76,0.25)", borderRadius: 4, padding: "1px 5px", fontFamily: "Space Mono, monospace", flexShrink: 0, textTransform: "uppercase" }}>
                        {getAccountType(p.accountType).short}
                      </span>
                    )}
                    {isActive && (
                      <span title="Active portfolio"
                        style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 0.8, color: "#4caf7d", background: "rgba(76,175,125,0.1)", border: "0.5px solid rgba(76,175,125,0.3)", borderRadius: 4, padding: "1px 5px", fontFamily: "Space Mono, monospace", flexShrink: 0, textTransform: "uppercase" }}>
                        Active
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 10, color: C.cream3, margin: 0, fontFamily: "Space Mono, monospace", letterSpacing: 0.2 }}>
                    {p.assets.slice(0, 3).map((a: Asset) => a.ticker).join(" · ")}
                    {p.assets.length > 3 ? ` +${p.assets.length - 3}` : ""}
                  </p>
                  <p style={{ fontSize: 9.5, color: "var(--text-muted)", margin: "5px 0 0", letterSpacing: 0.1 }}>
                    {relativeAnalyzed(p.updatedAt)}
                  </p>
                </div>
                <button onClick={e => { e.stopPropagation(); setDeleteConfirm(p.id); }}
                  style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: "3px 5px", lineHeight: 1, flexShrink: 0, transition: "all 0.12s", borderRadius: 4, display: "flex" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "rgba(224,92,92,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.background = "transparent"; }}
                  title="Delete portfolio">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal - Corvo-styled */}
      <AnimatePresence initial={false}>
        {deleteConfirm && (
          <motion.div
            initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            onClick={() => setDeleteConfirm(null)}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-confirm-title"
              initial={false} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "var(--card-bg)",
                border: "0.5px solid var(--border2)",
                borderTop: "2px solid var(--red)",
                borderRadius: 14,
                padding: "24px 24px 20px",
                maxWidth: 320, width: "100%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(224,92,92,0.12)", border: "0.5px solid rgba(224,92,92,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </div>
                <div>
                  <p id="delete-confirm-title" style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: -0.2 }}>Delete portfolio?</p>
                  <p style={{ fontSize: 10, color: "var(--text3)", margin: 0, letterSpacing: 0.5 }}>This cannot be undone</p>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, marginBottom: 20 }}>
                This permanently deletes the portfolio and all its tracked history from Corvo.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setDeleteConfirm(null)}
                  style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text3)", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}>
                  Cancel
                </button>
                <button onClick={() => { remove(deleteConfirm); setDeleteConfirm(null); }}
                  style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "var(--red)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: 0.2, transition: "opacity 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
