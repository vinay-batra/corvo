"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const COLORS = ["#111", "#555", "#888", "#bbb", "#333", "#666", "#999", "#444", "#777", "#222"];
const TYPE_LABELS: Record<string, string> = { EQUITY: "Stock", ETF: "ETF", CRYPTOCURRENCY: "Crypto", MUTUALFUND: "Fund", INDEX: "Index" };

interface Asset { ticker: string; weight: number; }
interface SearchResult { ticker: string; name: string; exchange: string; type: string; }
interface Props {
  assets: Asset[];
  onAssetsChange?: (a: Asset[]) => void;
  setAssets?: (a: Asset[]) => void;
  onAnalyze?: () => void;
  loading?: boolean;
}

export default function PortfolioBuilder({ assets, onAssetsChange, setAssets, onAnalyze, loading }: Props) {
  const update = onAssetsChange || setAssets || (() => {});
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [query, setQuery] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, SearchResult[]>>({});
  const [searching, setSearching] = useState<Record<number, boolean>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const blurTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const searchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (i: number, q: string) => {
    if (!q || q.length < 1) { setResults(p => ({ ...p, [i]: [] })); return; }
    clearTimeout(searchTimers.current[i]);
    searchTimers.current[i] = setTimeout(async () => {
      setSearching(p => ({ ...p, [i]: true }));
      try {
        const res = await fetch(`${API_URL}/search-ticker?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(p => ({ ...p, [i]: data.results || [] }));
        const n: Record<string, string> = {};
        (data.results || []).forEach((r: SearchResult) => { n[r.ticker] = r.name; });
        setNames(p => ({ ...p, ...n }));
      } catch { setResults(p => ({ ...p, [i]: [] })); }
      setSearching(p => ({ ...p, [i]: false }));
    }, 300);
  }, []);

  const updateWeight = (i: number, val: number) => {
    const next = [...assets]; next[i] = { ...next[i], weight: val }; update(next);
  };
  const updateTicker = (i: number, val: string) => {
    setQuery(p => ({ ...p, [i]: val }));
    const next = [...assets]; next[i] = { ...next[i], ticker: val.toUpperCase() }; update(next);
    search(i, val);
  };
  const selectTicker = (i: number, r: SearchResult) => {
    setQuery(p => ({ ...p, [i]: r.ticker }));
    setResults(p => ({ ...p, [i]: [] }));
    const next = [...assets]; next[i] = { ...next[i], ticker: r.ticker }; update(next);
    setNames(p => ({ ...p, [r.ticker]: r.name }));
    setActiveIndex(null);
  };
  const remove = (i: number) => update(assets.filter((_, idx) => idx !== i));
  const add = () => update([...assets, { ticker: "", weight: 0.05 }]);
  const equalize = () => {
    if (!assets.length) return;
    const w = parseFloat((1 / assets.length).toFixed(4));
    update(assets.map(a => ({ ...a, weight: w })));
  };

  const handleImport = async (file: File) => {
    setImportLoading(true); setImportError("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${API_URL}/parse-portfolio-image`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64, media_type: file.type || "image/jpeg" }),
      });
      const data = await res.json();
      if (data.assets?.length > 0) update(data.assets.slice(0, 20));
      else setImportError("No holdings found — try a clearer screenshot.");
    } catch { setImportError("Import failed."); }
    setImportLoading(false);
  };

  const total = assets.reduce((s, a) => s + a.weight, 0);
  const balanced = Math.abs(total - 1) < 0.01;

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 9, letterSpacing: 2, color: "#9b9b98", textTransform: "uppercase" }}>Assets</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={() => fileRef.current?.click()} disabled={importLoading}
            style={{ padding: "3px 8px", fontSize: 9, letterSpacing: 1, background: "#f0efed", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 5, cursor: "pointer", color: "#6b6b68" }}>
            {importLoading ? "..." : "📷 Import"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { if (e.target.files?.[0]) handleImport(e.target.files[0]); e.target.value = ""; }} />
          <span onClick={!balanced ? equalize : undefined}
            style={{ fontSize: 9, padding: "2px 7px", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 4, cursor: balanced ? "default" : "pointer", color: "#6b6b68", background: "#f0efed" }}>
            {(total * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {importError && <p style={{ fontSize: 10, color: "#c0392b", marginBottom: 8 }}>{importError}</p>}

      {/* Asset rows */}
      <AnimatePresence>
        {assets.map((a, i) => {
          const color = COLORS[i % COLORS.length];
          const res = results[i] || [];
          const name = names[a.ticker] || "";
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.15 }}
              style={{ marginBottom: 10, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <div style={{ position: "relative", flex: 1, zIndex: activeIndex === i ? 50 : 1 }}>
                  <input
                    value={query[i] ?? a.ticker}
                    onFocus={() => setActiveIndex(i)}
                    onBlur={() => { blurTimers.current[i] = setTimeout(() => { setActiveIndex(p => p === i ? null : p); setResults(p => ({ ...p, [i]: [] })); }, 200); }}
                    onChange={e => updateTicker(i, e.target.value)}
                    placeholder="Search ticker..."
                    style={{ width: "100%", padding: "5px 8px", background: "#fff", border: `0.5px solid ${activeIndex === i ? "#111" : "rgba(0,0,0,0.1)"}`, borderRadius: 7, color: "#111", fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1, outline: "none" }}
                  />
                  {searching[i] && (
                    <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, border: "1.5px solid rgba(0,0,0,0.1)", borderTopColor: "#111", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  )}
                  <AnimatePresence>
                    {activeIndex === i && res.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10, zIndex: 100, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
                        {res.map((r, idx) => (
                          <div key={idx}
                            onMouseDown={e => { e.preventDefault(); clearTimeout(blurTimers.current[i]); selectTicker(i, r); }}
                            style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: idx < res.length - 1 ? "0.5px solid rgba(0,0,0,0.06)" : "none" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f8f8f7"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <div>
                              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#111", fontWeight: 700 }}>{r.ticker}</div>
                              <div style={{ fontSize: 10, color: "#9b9b98", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                            </div>
                            <div style={{ fontSize: 8, background: "#f0efed", color: "#6b6b68", padding: "2px 6px", borderRadius: 4 }}>{TYPE_LABELS[r.type] || r.type}</div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <input type="number" min="0" max="100" step="1"
                  value={Math.round(a.weight * 100)}
                  onChange={e => updateWeight(i, Math.max(0, Math.min(100, Number(e.target.value))) / 100)}
                  style={{ width: 38, padding: "5px 4px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 5, color: "#111", fontSize: 11, fontFamily: "'Space Mono', monospace", outline: "none", textAlign: "center" }} />
                <span style={{ fontSize: 9, color: "#9b9b98", flexShrink: 0 }}>%</span>
                <button onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.2)", fontSize: 12, padding: "0 2px", lineHeight: 1 }}
                  onMouseEnter={e => e.currentTarget.style.color = "#c0392b"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(0,0,0,0.2)"}>✕</button>
              </div>
              {name && <div style={{ paddingLeft: 10, marginTop: 2, fontSize: 9, color: "#9b9b98", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>}
              <div style={{ paddingLeft: 10, marginTop: 4 }}>
                <input type="range" min="0" max="1" step="0.01" value={a.weight}
                  onChange={e => updateWeight(i, parseFloat(e.target.value))}
                  style={{ width: "100%", height: 2, appearance: "none" as any, background: `linear-gradient(90deg, #111 ${a.weight * 100}%, rgba(0,0,0,0.08) ${a.weight * 100}%)`, borderRadius: 1, outline: "none", cursor: "pointer" }} />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Add + Equalize */}
      <div style={{ display: "flex", gap: 6, marginTop: 4, marginBottom: 10 }}>
        <button onClick={add} disabled={assets.length >= 20}
          style={{ flex: 1, padding: "7px", background: "transparent", border: "0.5px dashed rgba(0,0,0,0.15)", borderRadius: 8, color: "#9b9b98", fontSize: 10, letterSpacing: 1, cursor: assets.length >= 20 ? "not-allowed" : "pointer" }}
          onMouseEnter={e => { if (assets.length < 20) { e.currentTarget.style.borderColor = "#111"; e.currentTarget.style.color = "#111"; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.15)"; e.currentTarget.style.color = "#9b9b98"; }}>
          + Add Asset
        </button>
        {!balanced && assets.length > 0 && (
          <button onClick={equalize}
            style={{ padding: "7px 10px", background: "#f0efed", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 8, color: "#6b6b68", fontSize: 9, letterSpacing: 1, cursor: "pointer" }}>
            Equal
          </button>
        )}
      </div>

      {/* Analyze button */}
      {onAnalyze && (
        <button onClick={onAnalyze} disabled={loading}
          style={{ width: "100%", padding: "9px", background: loading ? "#f0efed" : "#111", border: "none", borderRadius: 8, color: loading ? "#9b9b98" : "#fff", fontSize: 11, fontWeight: 500, letterSpacing: 2, cursor: loading ? "default" : "pointer", transition: "all 0.2s", textTransform: "uppercase" as any }}>
          {loading ? "Analyzing..." : "Analyze →"}
        </button>
      )}
    </div>
  );
}
