"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchEarningsTranscript } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type CalEntry = {
  ticker: string;
  company: string;
  date: string;
  eps_estimate: number | null;
  revenue_estimate: number | null;
};

type PreviewExtra = {
  days_until: number;
  implied_move_pct: number | null;
  implied_move_source: string | null;
  weight: number;
  ai_commentary: string;
};

type Row = CalEntry & {
  days: number;
  weight: number;
  preview: PreviewExtra | null;
};

type TranscriptSummary = {
  key_points: string[];
  forward_guidance: string;
  risks: string;
  tone: { label: string; reason: string };
};

type TranscriptData = {
  has_transcript: boolean;
  has_ai_summary: boolean;
  ai_pending: boolean;
  summary: TranscriptSummary | null;
  transcript_excerpt: string | null;
  filing_date: string | null;
  error: string | null;
  message: string | null;
};

type TranscriptState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: TranscriptData };

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr + "T00:00:00").getTime() - today.getTime()) / 86400000);
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtRev(r: number): string {
  if (r >= 1e9) return `$${(r / 1e9).toFixed(2)}B`;
  if (r >= 1e6) return `$${(r / 1e6).toFixed(0)}M`;
  return `$${r.toFixed(0)}`;
}

function fmtDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--text3)", fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontFamily: "Space Mono, monospace", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}

function TranscriptSection({ state }: { state: TranscriptState }) {
  if (state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <div style={{
        borderTop: "0.5px solid var(--border)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--text3)", fontWeight: 600 }}>
          Earnings Transcript
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: 12,
            borderRadius: 4,
            background: "var(--bg3)",
            width: i === 3 ? "60%" : "100%",
            animation: "ec-pulse 1.5s ease-in-out infinite",
          }} />
        ))}
      </div>
    );
  }

  const { data } = state;

  if (!data.has_transcript) {
    return (
      <div style={{
        borderTop: "0.5px solid var(--border)",
        padding: "14px 16px",
      }}>
        <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--text3)", fontWeight: 600, marginBottom: 6 }}>
          Earnings Transcript
        </div>
        <p style={{ fontSize: 11, color: "var(--text3)", margin: 0, lineHeight: 1.6 }}>
          {data.message || "No transcript available for this ticker. SEC filings may not include call transcripts for all companies."}
        </p>
      </div>
    );
  }

  if (data.has_ai_summary && data.summary) {
    const { summary } = data;
    const toneColor =
      summary.tone.label === "confident" ? "var(--green)"
      : summary.tone.label === "cautious" ? "var(--red)"
      : "var(--accent)";

    return (
      <div style={{
        borderTop: "0.5px solid var(--border)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}>
        <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--text3)", fontWeight: 600 }}>
          Earnings Transcript Summary
        </div>

        {/* Key Points */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--accent)", fontWeight: 600 }}>
            Key Points
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            {summary.key_points.map((pt, i) => (
              <li key={i} style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>
                {pt}
              </li>
            ))}
          </ul>
        </div>

        {/* Forward Guidance */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--accent)", fontWeight: 600 }}>
            Forward Guidance
          </div>
          <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55, margin: 0 }}>
            {summary.forward_guidance}
          </p>
        </div>

        {/* Risks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--accent)", fontWeight: 600 }}>
            Risks Mentioned
          </div>
          <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55, margin: 0 }}>
            {summary.risks}
          </p>
        </div>

        {/* Tone */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--accent)", fontWeight: 600 }}>
            Management Tone
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
            <span style={{
              fontFamily: "Space Mono, monospace",
              fontSize: 10, fontWeight: 700,
              padding: "2px 8px", borderRadius: 8,
              background: "rgba(0,0,0,0.08)",
              color: toneColor,
              textTransform: "capitalize" as const,
            }}>
              {summary.tone.label}
            </span>
            <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>
              {summary.tone.reason}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Transcript found but no AI summary yet
  return (
    <div style={{
      borderTop: "0.5px solid var(--border)",
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--text3)", fontWeight: 600 }}>
        Earnings Transcript
      </div>
      {data.transcript_excerpt && (
        <p style={{
          fontSize: 11.5,
          color: "var(--text2)",
          lineHeight: 1.6,
          margin: 0,
          maxHeight: 120,
          overflow: "hidden",
          WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
        }}>
          {data.transcript_excerpt.slice(0, 600)}
        </p>
      )}
      <p style={{ fontSize: 11, color: "var(--text3)", margin: 0, fontStyle: "italic" }}>
        {data.ai_pending
          ? "Full AI analysis available Monday when credits are restored."
          : "AI summary not available for this filing."}
      </p>
    </div>
  );
}

function EarningsRow({
  row,
  previewLoading,
  portfolioValue,
  transcriptState,
  onTranscriptLoad,
}: {
  row: Row;
  previewLoading: boolean;
  portfolioValue: number;
  transcriptState: TranscriptState;
  onTranscriptLoad: (ticker: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const triggeredRef = useRef(false);
  const { days, preview } = row;

  const borderColor =
    days <= 7 ? "rgba(224,92,92,0.45)"
    : days <= 14 ? "rgba(184,134,11,0.4)"
    : "var(--border)";

  const urgencyColor =
    days <= 7 ? "var(--red)"
    : days <= 14 ? "var(--accent)"
    : "var(--text3)";

  const exposure = portfolioValue > 0 && row.weight > 0
    ? row.weight * portfolioValue
    : null;

  const moveAmt = exposure != null && preview?.implied_move_pct != null
    ? exposure * (preview.implied_move_pct / 100)
    : null;

  const hasExpanded = row.eps_estimate != null || row.revenue_estimate != null ||
    row.weight > 0 || preview != null || days <= 14;

  const transcriptFound =
    transcriptState.status === "done" && transcriptState.data.has_transcript;

  const handleExpand = () => {
    if (!hasExpanded) return;
    const next = !expanded;
    setExpanded(next);
    if (next && !triggeredRef.current) {
      triggeredRef.current = true;
      onTranscriptLoad(row.ticker);
    }
  };

  return (
    <div
      style={{
        border: `0.5px solid ${borderColor}`,
        borderRadius: 10,
        background: "var(--card-bg)",
        overflow: "clip",
        transition: "border-color 0.15s",
      }}
    >
      {/* Clickable header */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleExpand}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleExpand(); }}
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 16px",
          cursor: hasExpanded ? "pointer" : "default",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
            <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
              {row.ticker}
            </span>
            {row.weight > 0 && (
              <span style={{
                fontFamily: "Space Mono, monospace",
                fontSize: 9, fontWeight: 700,
                padding: "1px 6px", borderRadius: 8,
                background: "rgba(201,168,76,0.10)", border: "0.5px solid rgba(201,168,76,0.25)",
                color: "var(--accent)", whiteSpace: "nowrap" as const,
              }}>
                {(row.weight * 100).toFixed(1)}%
              </span>
            )}
            {preview?.implied_move_pct != null && (
              <span style={{
                fontFamily: "Space Mono, monospace",
                fontSize: 9, fontWeight: 700,
                padding: "1px 6px", borderRadius: 8,
                background: "rgba(76,175,125,0.10)", border: "0.5px solid rgba(76,175,125,0.25)",
                color: "var(--green)", whiteSpace: "nowrap" as const,
              }}>
                +/-{preview.implied_move_pct.toFixed(1)}%
              </span>
            )}
            {transcriptFound && (
              <span style={{
                fontSize: 9, fontWeight: 700,
                padding: "1px 6px", borderRadius: 8,
                background: "rgba(120,120,200,0.10)", border: "0.5px solid rgba(120,120,200,0.25)",
                color: "var(--text2)", whiteSpace: "nowrap" as const,
                letterSpacing: 0.3,
              }}>
                Transcript
              </span>
            )}
          </div>
          <span style={{ fontSize: 11.5, color: "var(--text2)", marginTop: 2, display: "block" }}>
            {row.company}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontSize: 11, color: "var(--text2)" }}>{fmtDate(row.date)}</div>
            <div style={{ fontSize: 10, color: urgencyColor, fontWeight: 600, marginTop: 1 }}>
              {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
            </div>
          </div>
          {hasExpanded && (
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="var(--text3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s ease", flexShrink: 0 }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            // initial={false} required -- do not remove
            initial={false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{ overflow: "clip" }}
          >
            <div style={{
              borderTop: "0.5px solid var(--border)",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}>
              {/* Stat pills */}
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" as const }}>
                {exposure != null && (
                  <StatPill label="Your exposure" value={fmtDollars(exposure)} />
                )}
                {row.eps_estimate != null && (
                  <StatPill label="EPS Estimate" value={`$${row.eps_estimate.toFixed(2)}`} />
                )}
                {row.revenue_estimate != null && (
                  <StatPill label="Revenue Est." value={fmtRev(row.revenue_estimate)} />
                )}
                {preview?.implied_move_pct != null && (
                  <StatPill
                    label={preview.implied_move_source === "options" ? "Implied move (straddle)" : "Expected move (IV)"}
                    value={`+/-${preview.implied_move_pct.toFixed(1)}%${moveAmt != null ? ` (~${fmtDollars(moveAmt)})` : ""}`}
                  />
                )}
              </div>

              {/* Loading state */}
              {previewLoading && days <= 14 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%",
                    border: "1.5px solid var(--accent)", borderTopColor: "transparent",
                    animation: "ec-spin 0.7s linear infinite", flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 11, color: "var(--text3)" }}>Loading AI analysis...</span>
                  <style>{`@keyframes ec-spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {/* AI commentary */}
              {!previewLoading && preview?.ai_commentary && (
                <div style={{
                  padding: "10px 12px",
                  background: "rgba(201,168,76,0.06)",
                  border: "0.5px solid rgba(201,168,76,0.18)",
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--accent)", fontWeight: 600, marginBottom: 6 }}>
                    Impact on your portfolio
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>
                    {preview.ai_commentary}
                  </p>
                </div>
              )}

              {/* Earnings today -- AI not yet available */}
              {!previewLoading && days === 0 && !preview?.ai_commentary && (
                <p style={{ fontSize: 11, color: "var(--text3)", margin: 0 }}>
                  Earnings are today. Check back after market close for AI analysis.
                </p>
              )}

              {/* No preview for non-today upcoming */}
              {!previewLoading && days > 0 && days <= 14 && !preview && (
                <p style={{ fontSize: 11, color: "var(--text3)", margin: 0 }}>
                  AI analysis not available for this ticker.
                </p>
              )}

              {days > 14 && (
                <p style={{ fontSize: 11, color: "var(--text3)", margin: 0 }}>
                  AI analysis and implied move available within 14 days of earnings.
                </p>
              )}
            </div>

            {/* Transcript section */}
            <TranscriptSection state={transcriptState} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Asset {
  ticker: string;
  weight: number;
}

export default function EarningsCalendar({
  assets,
  portfolioValue = 0,
}: {
  assets: Asset[];
  portfolioValue?: number;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [calLoading, setCalLoading] = useState(true);
  const [transcriptMap, setTranscriptMap] = useState<Record<string, TranscriptState>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  const loadTranscript = useCallback((ticker: string) => {
    if (fetchingRef.current.has(ticker)) return;
    fetchingRef.current.add(ticker);

    setTranscriptMap(prev => ({ ...prev, [ticker]: { status: "loading" } }));

    fetchEarningsTranscript(ticker)
      .then((data: TranscriptData) => {
        setTranscriptMap(prev => ({ ...prev, [ticker]: { status: "done", data } }));
      })
      .catch(() => {
        setTranscriptMap(prev => ({
          ...prev,
          [ticker]: {
            status: "done",
            data: {
              has_transcript: false,
              has_ai_summary: false,
              ai_pending: false,
              summary: null,
              transcript_excerpt: null,
              filing_date: null,
              error: "fetch_error",
              message: "Could not load transcript. Please try again.",
            },
          },
        }));
      });
  }, []);

  const load = useCallback(() => {
    if (!assets.length) { setCalLoading(false); setPreviewLoading(false); return; }

    const tickers = assets.map(a => a.ticker).join(",");
    const total = assets.reduce((s, a) => s + a.weight, 0) || 1;
    const weights = assets.map(a => a.weight / total).join(",");
    const weightMap: Record<string, number> = Object.fromEntries(
      assets.map(a => [a.ticker, a.weight / total])
    );

    // Fetch calendar (fast) first -- populates base rows
    fetch(`${API_URL}/earnings-calendar?tickers=${tickers}`)
      .then(r => r.json())
      .then((cal: CalEntry[]) => {
        if (!Array.isArray(cal)) return;
        setRows(cal.map(e => ({
          ...e,
          days: daysUntil(e.date),
          weight: weightMap[e.ticker] ?? 0,
          preview: null,
        })));
      })
      .catch(() => {})
      .finally(() => setCalLoading(false));

    // Fetch preview (slower, has AI) -- enriches rows when ready
    fetch(`${API_URL}/earnings-preview?tickers=${tickers}&weights=${weights}`)
      .then(r => r.json())
      .then((preview: (CalEntry & PreviewExtra)[]) => {
        if (!Array.isArray(preview)) return;
        const pMap: Record<string, PreviewExtra> = {};
        for (const p of preview) {
          pMap[p.ticker] = {
            days_until: p.days_until,
            implied_move_pct: p.implied_move_pct,
            implied_move_source: p.implied_move_source,
            weight: p.weight,
            ai_commentary: p.ai_commentary,
          };
        }
        setRows(prev => prev.map(r => ({
          ...r,
          weight: pMap[r.ticker]?.weight ?? r.weight,
          preview: pMap[r.ticker] ?? null,
        })));
      })
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  }, [assets]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  if (calLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 72, borderRadius: 10, background: "var(--bg3)", animation: "ec-pulse 1.5s ease-in-out infinite" }} />
        ))}
        <style>{`@keyframes ec-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center" as const }}>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
          {assets.length === 0
            ? "Add holdings to track upcoming earnings."
            : "No earnings scheduled in the next 60 days for your holdings."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <style>{`@keyframes ec-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
      {rows.map(row => (
        <EarningsRow
          key={row.ticker}
          row={row}
          previewLoading={previewLoading}
          portfolioValue={portfolioValue}
          transcriptState={transcriptMap[row.ticker] ?? { status: "idle" }}
          onTranscriptLoad={loadTranscript}
        />
      ))}
    </div>
  );
}
