"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type SortKey = "ticker" | "weight" | "value" | "change1d" | "change7d" | "sector";
type SortDir = "asc" | "desc";

interface Position {
  ticker: string;
  company: string;
  weight: number;
  value: number | null;
  change1d: number | null;
  change7d: number | null;
  sector: string;
}

interface LiveData {
  ticker: string;
  price: number;
  change_pct: number;
  name?: string;
  sector?: string;
}

function Pill({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value === null) return <span style={{ color: "var(--text3)", fontSize: 11 }}>—</span>;
  const pos = value >= 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 600,
      background: pos ? "rgba(76,175,125,0.1)" : "rgba(224,92,92,0.1)",
      color: pos ? "#4caf7d" : "#e05c5c",
    }}>
      {pos ? "+" : ""}{value.toFixed(2)}{suffix}
    </span>
  );
}

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown size={11} style={{ color: "var(--text3)", opacity: 0.5 }} />;
  return dir === "asc"
    ? <ArrowUp size={11} style={{ color: "#c9a84c" }} />
    : <ArrowDown size={11} style={{ color: "#c9a84c" }} />;
}

export default function PositionsTab({
  assets,
  portfolioValue,
  onSelectTicker,
}: {
  assets: { ticker: string; weight: number; purchasePrice?: number }[];
  portfolioValue?: number;
  onSelectTicker: (t: string) => void;
}) {
  const [liveData, setLiveData] = useState<Record<string, LiveData>>({});
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("weight");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [flashSet, setFlashSet] = useState<Set<string>>(new Set());
  const prevPrices = useRef<Record<string, number>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const valid = assets.filter(a => a.ticker && a.weight > 0);
  const total = valid.reduce((s, a) => s + a.weight, 0) || 1;

  const fetchLiveData = useCallback(async () => {
    if (!valid.length) return;
    try {
      const tickers = valid.map(a => a.ticker).join(",");
      const r = await fetch(`${API_URL}/watchlist-data?tickers=${tickers}`);
      const d = await r.json();
      const map: Record<string, LiveData> = {};
      (d.results || []).forEach((s: any) => {
        if (s?.ticker) map[s.ticker] = {
          ticker: s.ticker,
          price: s.price ?? 0,
          change_pct: s.change_pct ?? null,
          name: s.name ?? s.ticker,
          sector: s.sector ?? "—",
        };
      });

      // Flash changed prices
      const flashed = new Set<string>();
      Object.keys(map).forEach(t => {
        const prev = prevPrices.current[t];
        if (prev !== undefined && Math.abs(prev - map[t].price) > 0.001) {
          flashed.add(t);
        }
        prevPrices.current[t] = map[t].price;
      });
      if (flashed.size > 0) {
        setFlashSet(flashed);
        setTimeout(() => setFlashSet(new Set()), 800);
      }

      setLiveData(map);
    } catch {}
  }, [valid.map(a => a.ticker).join(",")]);

  useEffect(() => {
    setLoading(true);
    fetchLiveData().finally(() => setLoading(false));
    intervalRef.current = setInterval(fetchLiveData, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchLiveData]);

  const positions: Position[] = valid.map(a => {
    const live = liveData[a.ticker];
    const weightFrac = a.weight / total;
    const val = (portfolioValue && live?.price) ? portfolioValue * weightFrac : null;
    return {
      ticker: a.ticker,
      company: live?.name ?? a.ticker,
      weight: weightFrac * 100,
      value: val,
      change1d: live?.change_pct ?? null,
      change7d: null, // would need separate 7-day endpoint
      sector: live?.sector ?? "—",
    };
  });

  const sorted = [...positions].sort((x, y) => {
    let a: any = x[sortKey];
    let b: any = y[sortKey];
    if (a === null) a = sortDir === "asc" ? Infinity : -Infinity;
    if (b === null) b = sortDir === "asc" ? Infinity : -Infinity;
    if (typeof a === "string") return sortDir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
    return sortDir === "asc" ? a - b : b - a;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const colStyle: React.CSSProperties = {
    padding: "8px 12px", fontSize: 10, letterSpacing: 1.5, color: "var(--text3)",
    textTransform: "uppercase", textAlign: "left", background: "var(--bg2)",
    position: "sticky", top: 0, cursor: "pointer", userSelect: "none",
    borderBottom: "0.5px solid var(--border)", fontWeight: 600,
    whiteSpace: "nowrap",
  };

  const bestIdx = sorted.reduce((bi, r, i) => (r.change1d ?? -Infinity) > (sorted[bi]?.change1d ?? -Infinity) ? i : bi, 0);
  const worstIdx = sorted.reduce((bi, r, i) => (r.change1d ?? Infinity) < (sorted[bi]?.change1d ?? Infinity) ? i : bi, 0);

  return (
    <div>
      <style>{`
        @keyframes flashGreen{0%,100%{background:transparent}40%{background:rgba(76,175,125,0.12)}}
        @keyframes flashRed{0%,100%{background:transparent}40%{background:rgba(224,92,92,0.12)}}
        .pos-row-flash-up{animation:flashGreen 0.8s ease-out}
        .pos-row-flash-down{animation:flashRed 0.8s ease-out}
        .pos-row:hover td{background:var(--bg3)!important}
      `}</style>

      {/* Best / worst performer pills */}
      {!loading && sorted.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          {sorted[bestIdx]?.change1d !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 12px", background: "rgba(76,175,125,0.07)", border: "0.5px solid rgba(76,175,125,0.22)", borderRadius: 20 }}>
              <span style={{ fontSize: 9, letterSpacing: 1.5, color: "rgba(76,175,125,0.7)", textTransform: "uppercase" }}>Best today</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#4caf7d", fontFamily: "Space Mono, monospace" }}>{sorted[bestIdx].ticker}</span>
              <Pill value={sorted[bestIdx].change1d} />
            </div>
          )}
          {sorted[worstIdx]?.change1d !== null && worstIdx !== bestIdx && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 12px", background: "rgba(224,92,92,0.07)", border: "0.5px solid rgba(224,92,92,0.22)", borderRadius: 20 }}>
              <span style={{ fontSize: 9, letterSpacing: 1.5, color: "rgba(224,92,92,0.7)", textTransform: "uppercase" }}>Worst today</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#e05c5c", fontFamily: "Space Mono, monospace" }}>{sorted[worstIdx].ticker}</span>
              <Pill value={sorted[worstIdx].change1d} />
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 20, marginLeft: "auto" }}>
            <span style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase" }}>Live</span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4caf7d", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 10, color: "var(--text3)" }}>Updates every 10s</span>
          </div>
        </div>
      )}

      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {loading && !positions.length ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 20, height: 20, border: "1.5px solid var(--border2)", borderTopColor: "var(--text)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 12, color: "var(--text3)" }}>Loading positions…</p>
          </div>
        ) : positions.length === 0 ? (
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>No positions yet</p>
            <p style={{ fontSize: 12, color: "var(--text3)" }}>Add tickers in the sidebar to see your holdings here.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {([
                    { key: "ticker", label: "Ticker" },
                    { key: "company", label: "Company" },
                    { key: "weight", label: "Weight" },
                    { key: "value", label: "Value" },
                    { key: "change1d", label: "1D Change" },
                    { key: "sector", label: "Sector" },
                  ] as { key: SortKey; label: string }[]).map(col => (
                    <th key={col.key} onClick={() => toggleSort(col.key)} style={colStyle}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {col.label}
                        <SortIcon col={col.key} active={sortKey === col.key} dir={sortDir} />
                      </span>
                    </th>
                  ))}
                  <th style={{ ...colStyle, cursor: "default" }} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((pos, i) => {
                  const flashing = flashSet.has(pos.ticker);
                  const flashClass = flashing && pos.change1d !== null
                    ? (pos.change1d >= 0 ? "pos-row-flash-up" : "pos-row-flash-down")
                    : "";
                  return (
                    <motion.tr
                      key={pos.ticker}
                      className={`pos-row ${flashClass}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => onSelectTicker(pos.ticker)}
                      style={{ cursor: "pointer", borderBottom: "0.5px solid var(--border)" }}
                    >
                      <td style={{ padding: "11px 12px" }}>
                        <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: "#c9a84c" }}>
                          {pos.ticker}
                        </span>
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <span style={{ fontSize: 12, color: "var(--text2)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                          {pos.company}
                        </span>
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 40, height: 3, background: "var(--bg3)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(pos.weight, 100)}%`, background: "#c9a84c", borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 12, color: "var(--text)", fontFamily: "Space Mono, monospace" }}>
                            {pos.weight.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <span style={{ fontSize: 12, color: pos.value ? "var(--text)" : "var(--text3)", fontFamily: pos.value ? "Space Mono, monospace" : undefined }}>
                          {pos.value ? `$${pos.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
                        </span>
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <Pill value={pos.change1d} />
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <span style={{ fontSize: 11, color: "var(--text3)", background: "var(--bg3)", padding: "2px 8px", borderRadius: 4 }}>
                          {pos.sector}
                        </span>
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <ExternalLink size={12} style={{ color: "var(--text3)" }} />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 10, textAlign: "right" }}>
        Click any row to open detailed stock view · 1D change is real-time
      </p>
    </div>
  );
}
