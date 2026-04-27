"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPortfolio } from "../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const COLORS = { current: "#b8860b", whatif: "#5cb88a" };

interface Asset { ticker: string; weight: number; }

interface Props {
  open: boolean;
  onClose: () => void;
  assets: Asset[];
  period: string;
  benchmark: string;
  currentData: any;
  onApply: (a: Asset[]) => void;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const W = 120, H = 36;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function WhatIfDrawer({ open, onClose, assets, period, benchmark, currentData, onApply }: Props) {
  const [whatIfAssets, setWhatIfAssets]   = useState<Asset[]>([]);
  const [whatIfData, setWhatIfData]       = useState<any>(null);
  const [loading, setLoading]             = useState(false);
  const [analyzed, setAnalyzed]           = useState(false);
  const [dark, setDark]                   = useState(true);
  const [isMobile, setIsMobile]           = useState(false);
  const analyzeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const check = () => setDark(document.documentElement.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setWhatIfAssets(assets.map(a => ({ ...a })));
      setWhatIfData(null);
      setAnalyzed(false);
    }
  }, [open, assets]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const runAnalysis = async (assetList: Asset[]) => {
    const valid = assetList.filter(a => a.ticker && a.weight > 0);
    if (!valid.length) return;
    setLoading(true);
    try {
      const d = await fetchPortfolio(valid, period, benchmark);
      setWhatIfData(d);
      setAnalyzed(true);
    } catch {}
    setLoading(false);
  };

  analyzeRef.current = () => runAnalysis(whatIfAssets);

  const updateWeight = (i: number, v: number) => {
    setWhatIfAssets(prev => {
      const n = [...prev];
      n[i] = { ...n[i], weight: v };
      return n;
    });
    setAnalyzed(false);
  };

  const addAsset = () => setWhatIfAssets(prev => [...prev, { ticker: "", weight: 0.05 }]);
  const removeAsset = (i: number) => setWhatIfAssets(prev => prev.filter((_, idx) => idx !== i));
  const updateTicker = (i: number, v: string) => {
    setWhatIfAssets(prev => {
      const n = [...prev];
      n[i] = { ...n[i], ticker: v.toUpperCase() };
      return n;
    });
    setAnalyzed(false);
  };

  const reset = () => {
    setWhatIfAssets(assets.map(a => ({ ...a })));
    setWhatIfData(null);
    setAnalyzed(false);
  };

  const metrics = [
    { key: "portfolio_return",    label: "Period Return", fmt: (v: number) => `${(v * 100).toFixed(1)}%`, positive: true },
    { key: "portfolio_volatility",label: "Volatility",    fmt: (v: number) => `${(v * 100).toFixed(1)}%`, positive: false },
    { key: "sharpe_ratio",        label: "Sharpe",        fmt: (v: number) => v.toFixed(2),                positive: true },
    { key: "max_drawdown",        label: "Max Drawdown",  fmt: (v: number) => `${(v * 100).toFixed(1)}%`,  positive: false },
  ];

  const totalW = whatIfAssets.reduce((s, a) => s + a.weight, 0);
  const normalizedPct = (i: number) =>
    totalW > 0 ? (whatIfAssets[i].weight / totalW) * 100 : 0;

  const isBalanced = whatIfAssets.length === 0 || Math.abs(totalW - 1) < 0.015;
  const hasValidAssets = whatIfAssets.some(a => a.ticker && a.weight > 0);
  const canRunAnalysis = hasValidAssets && isBalanced;

  const equalize = () => {
    if (!totalW) return;
    setWhatIfAssets(prev => prev.map(a => ({ ...a, weight: a.weight / totalW })));
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            // initial={false} is required — do not remove
            initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 500 }}
          />

          {/* Drawer — right-side panel on desktop, bottom sheet on mobile */}
          <motion.div
            // initial={false} is required — do not remove
            initial={false}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            style={isMobile ? {
              position: "fixed", left: 0, right: 0, bottom: 0,
              height: "90vh",
              background: "var(--bg2)",
              borderTop: dark ? "0.5px solid var(--border2)" : "1px solid #d4cfc8",
              borderRadius: "12px 12px 0 0",
              zIndex: 501, display: "flex", flexDirection: "column", overflow: "hidden",
            } : {
              position: "fixed", top: 0, right: 0, bottom: 0,
              width: "min(900px, 95vw)",
              background: "var(--bg2)",
              borderLeft: dark ? "0.5px solid var(--border2)" : "1px solid #d4cfc8",
              zIndex: 501, display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* Drag handle (mobile only) */}
            {isMobile && (
              <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
              </div>
            )}

            {/* Header */}
            <div style={{ padding: isMobile ? "10px 16px" : "14px 20px", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: 9, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>What-If Analysis</p>
                <p style={{ fontSize: 13, color: "var(--text2)" }}>Compare your current portfolio against a scenario</p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={reset}
                  style={{ padding: "7px 12px", fontSize: 11, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text3)", cursor: "pointer" }}>
                  Reset
                </button>
                <button onClick={() => { onApply(whatIfAssets); onClose(); }}
                  disabled={!analyzed}
                  style={{ padding: "7px 12px", fontSize: 11, borderRadius: 8, border: "none", background: analyzed ? "var(--accent)" : "var(--bg3)", color: analyzed ? "#0a0e14" : "var(--text3)", fontWeight: 600, cursor: analyzed ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
                  Apply
                </button>
                <button onClick={onClose}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "none", padding: isMobile ? "12px 14px" : "16px 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>

                {/* LEFT / TOP: Current (read-only) */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.current }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>Current Portfolio</span>
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>(locked)</span>
                  </div>
                  <div style={{ border: "0.5px solid rgba(201,168,76,0.3)", borderRadius: 10, padding: "12px 14px", background: "rgba(201,168,76,0.03)", marginBottom: 12 }}>
                    {assets.map((a, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < assets.length - 1 ? "0.5px solid var(--border)" : "none" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{a.ticker}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: COLORS.current }}>{(a.weight * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                  {currentData && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {metrics.map(m => (
                        <div key={m.key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "var(--bg3)", borderRadius: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--text3)" }}>{m.label}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: COLORS.current }}>{m.fmt(currentData[m.key] ?? 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {currentData?.cumulative_returns && (
                    <div style={{ marginTop: 12 }}>
                      <MiniSparkline data={currentData.cumulative_returns} color={COLORS.current} />
                    </div>
                  )}
                </div>

                {/* RIGHT / BOTTOM: Editable what-if */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.whatif }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>What-If Scenario</span>
                    <span style={{ fontSize: 10, color: isBalanced ? "var(--text3)" : "#e05c5c", fontFamily: "var(--font-mono)" }}>
                      {Math.round(totalW * 100)}%
                    </span>
                  </div>
                  <div style={{ border: "0.5px solid rgba(91,156,246,0.3)", borderRadius: 10, padding: "12px 14px", background: "rgba(91,156,246,0.03)", marginBottom: 8 }}>
                    {whatIfAssets.map((a, i) => (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <input
                            value={a.ticker}
                            onChange={e => updateTicker(i, e.target.value)}
                            placeholder="TICKER"
                            style={{ width: 70, padding: "4px 6px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 5, color: "var(--text)", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, outline: "none" }}
                          />
                          <input type="number" min="0" max="100" value={Math.round(a.weight * 100)}
                            onChange={e => updateWeight(i, Math.max(0, Math.min(100, Number(e.target.value))) / 100)}
                            style={{ width: 44, padding: "4px 4px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 5, color: "var(--text)", fontSize: 11, fontFamily: "var(--font-mono)", outline: "none", textAlign: "center" }}
                          />
                          <span style={{ fontSize: 10, color: "var(--text3)" }}>%</span>
                          <span style={{ fontSize: 10, color: COLORS.whatif, fontFamily: "var(--font-mono)", minWidth: 34, textAlign: "right" }}>
                            →{normalizedPct(i).toFixed(0)}%
                          </span>
                          <button onClick={() => removeAsset(i)}
                            style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", display: "flex", alignItems: "center" }}
                            onMouseEnter={e => e.currentTarget.style.color = "#e05c5c"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        </div>
                        <input type="range" min="0" max="1" step="0.01" value={a.weight}
                          onChange={e => updateWeight(i, parseFloat(e.target.value))}
                          onInput={e => updateWeight(i, parseFloat((e.target as HTMLInputElement).value))}
                          style={{ width: "100%", accentColor: COLORS.whatif }} />
                      </div>
                    ))}
                    <button onClick={addAsset}
                      style={{ width: "100%", padding: "6px", background: "transparent", border: "0.5px dashed rgba(91,156,246,0.3)", borderRadius: 6, color: "var(--text3)", fontSize: 10, cursor: "pointer", marginTop: 4 }}>
                      + Add Ticker
                    </button>
                  </div>

                  {/* Validation error */}
                  {!isBalanced && hasValidAssets && (
                    <p style={{ fontSize: 11, color: "#e05c5c", marginBottom: 8, lineHeight: 1.4 }}>
                      Weights must total 100% before running What-If analysis.{" "}
                      <span
                        onClick={equalize}
                        style={{ color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}>
                        Equalize
                      </span>
                    </p>
                  )}

                  <button
                    onClick={() => { if (canRunAnalysis) analyzeRef.current(); }}
                    disabled={loading || !canRunAnalysis}
                    style={{ width: "100%", padding: "10px", background: (loading || !canRunAnalysis) ? "var(--bg3)" : COLORS.whatif, border: "none", borderRadius: 8, color: (loading || !canRunAnalysis) ? "var(--text3)" : "#fff", fontWeight: 600, fontSize: 12, cursor: (loading || !canRunAnalysis) ? "not-allowed" : "pointer", marginBottom: 12, letterSpacing: 1, transition: "all 0.15s" }}>
                    {loading ? "Analyzing…" : "Run What-If Analysis"}
                  </button>

                  {whatIfData && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {metrics.map(m => {
                        const curr = currentData?.[m.key] ?? 0;
                        const wi = whatIfData[m.key] ?? 0;
                        const better = m.positive ? wi > curr : wi < curr;
                        const diff = wi - curr;
                        return (
                          <div key={m.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--bg3)", borderRadius: 6 }}>
                            <span style={{ fontSize: 11, color: "var(--text3)" }}>{m.label}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: COLORS.whatif }}>{m.fmt(wi)}</span>
                              {currentData && (
                                <span style={{ fontSize: 10, color: better ? "#5cb88a" : "#e05c5c", fontFamily: "var(--font-mono)" }}>
                                  {better ? "▲" : "▼"} {m.fmt(Math.abs(diff))}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {whatIfData?.cumulative_returns && (
                    <div style={{ marginTop: 12 }}>
                      <MiniSparkline data={whatIfData.cumulative_returns} color={COLORS.whatif} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
