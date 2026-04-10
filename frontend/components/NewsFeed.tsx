"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props {
  tickers?: string[];
  assets?: { ticker: string; weight?: number }[];
}

export default function NewsFeed({ tickers: tickersProp, assets: assetsProp }: Props) {
  const allTickers: string[] = tickersProp?.length
    ? tickersProp
    : (assetsProp || []).map(a => a.ticker);

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [articlesByTicker, setArticlesByTicker] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);

  const palette = ["#c9a84c", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#10b981"];
  const tickerColor = (t: string) => palette[allTickers.indexOf(t) % palette.length];

  const BULLISH_WORDS = ["gains", "rises", "beats", "surges", "strong", "growth", "up", "high", "record", "rally", "jumps", "soars", "outperforms", "upgrade", "buy"];
  const BEARISH_WORDS = ["falls", "drops", "misses", "weak", "loss", "down", "crash", "cut", "risk", "concern", "decline", "tumbles", "warns", "downgrade", "sell", "slump"];

  const getSentiment = (title: string): "BULLISH" | "BEARISH" | "NEUTRAL" => {
    const lower = title.toLowerCase();
    const b = BULLISH_WORDS.filter(w => lower.includes(w)).length;
    const bear = BEARISH_WORDS.filter(w => lower.includes(w)).length;
    if (b > bear) return "BULLISH";
    if (bear > b) return "BEARISH";
    return "NEUTRAL";
  };

  useEffect(() => {
    if (!allTickers.length) return;
    setLoading(true);
    fetch(`${API_URL}/news?tickers=${allTickers.join(",")}`)
      .then(r => r.json())
      .then(d => {
        const byTicker: Record<string, any[]> = { ALL: d.articles || [] };
        for (const t of allTickers) {
          byTicker[t] = (d.articles || []).filter((a: any) => a.ticker === t);
        }
        setArticlesByTicker(byTicker);
      })
      .catch(() => setArticlesByTicker({ ALL: [] }))
      .finally(() => setLoading(false));
  }, [allTickers.join(",")]);

  const tabs = ["ALL", ...allTickers];
  const articles = articlesByTicker[activeTab] || [];

  return (
    <div>
      {/* Ticker tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flexShrink: 0,
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 500,
              borderRadius: 6,
              border: "0.5px solid",
              borderColor: activeTab === tab
                ? (tab === "ALL" ? "var(--border2)" : tickerColor(tab))
                : "var(--border)",
              background: activeTab === tab
                ? (tab === "ALL" ? "var(--text)" : `${tickerColor(tab)}18`)
                : "transparent",
              color: activeTab === tab
                ? (tab === "ALL" ? "var(--bg)" : tickerColor(tab))
                : "var(--text2)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {tab}
            {tab !== "ALL" && articlesByTicker[tab]?.length > 0 && (
              <span style={{
                marginLeft: 5,
                fontSize: 9,
                background: activeTab === tab ? "rgba(255,255,255,0.15)" : "var(--bg3)",
                color: activeTab === tab ? (tab === "ALL" ? "var(--bg)" : tickerColor(tab)) : "var(--text3)",
                padding: "1px 5px",
                borderRadius: 10,
              }}>
                {articlesByTicker[tab].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sentiment summary bar for the active tab */}
      {!loading && articles.length > 0 && (() => {
        const bulls = articles.filter(a => getSentiment(a.title || "") === "BULLISH").length;
        const bears = articles.filter(a => getSentiment(a.title || "") === "BEARISH").length;
        const neutrals = articles.length - bulls - bears;
        const bullPct = Math.round((bulls / articles.length) * 100);
        const bearPct = Math.round((bears / articles.length) * 100);
        const isBullish = bulls > bears;
        const barColor = isBullish ? "#5cb88a" : bulls < bears ? "#e05c5c" : "var(--text3)";
        return (
          <div style={{ marginBottom: 14, padding: "10px 14px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: "var(--text3)" }}>
                <span style={{ color: barColor, fontWeight: 600 }}>{activeTab} sentiment</span>
                {" · "}{bulls} bullish · {bears} bearish · {neutrals} neutral
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>{bullPct}% bullish</span>
            </div>
            <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${bullPct}%`, background: "#5cb88a", transition: "width 0.4s ease" }} />
              <div style={{ width: `${bearPct}%`, background: "#e05c5c", transition: "width 0.4s ease" }} />
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ padding: "12px 14px", border: "0.5px solid var(--border)", borderRadius: 10, display: "flex", gap: 10 }}>
              <div style={{ width: 40, height: 16, borderRadius: 4, background: "var(--bg3)", animation: "nfPulse 1.5s ease-in-out infinite", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ height: 13, width: "80%", borderRadius: 4, background: "var(--bg3)", animation: "nfPulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: 11, width: "60%", borderRadius: 4, background: "var(--bg3)", animation: "nfPulse 1.5s ease-in-out infinite", animationDelay: "0.1s" }} />
              </div>
            </div>
          ))}
          <style>{`@keyframes nfPulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
        </div>
      ) : articles.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text3)", padding: "32px 0", textAlign: "center" }}>
          No recent news found{activeTab !== "ALL" ? ` for ${activeTab}` : ""}.
        </p>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {articles.map((article, i) => (
              <motion.a
                key={i}
                href={article.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  display: "block",
                  padding: "12px 14px",
                  background: "var(--card-bg)",
                  border: "0.5px solid var(--border)",
                  borderRadius: 10,
                  textDecoration: "none",
                  cursor: article.url ? "pointer" : "default",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={e => {
                  if (article.url) {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)";
                    (e.currentTarget as HTMLElement).style.background = "var(--bg3)";
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLElement).style.background = "var(--card-bg)";
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{
                    flexShrink: 0,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    color: tickerColor(article.ticker),
                    background: `${tickerColor(article.ticker)}14`,
                    border: `0.5px solid ${tickerColor(article.ticker)}40`,
                    padding: "3px 7px",
                    borderRadius: 4,
                    marginTop: 1,
                  }}>
                    {article.ticker}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", lineHeight: 1.45, marginBottom: 3 }}>
                      {article.title}
                    </p>
                    {article.summary && (
                      <p style={{ fontSize: 11.5, color: "var(--text2)", lineHeight: 1.55, marginBottom: 5 }}>
                        {article.summary}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 10, fontSize: 10, color: "var(--text3)", alignItems: "center", flexWrap: "wrap" }}>
                      {(() => {
                        const s = getSentiment(article.title || "");
                        const sc = s === "BULLISH" ? { bg: "rgba(92,184,138,0.12)", color: "#5cb88a", border: "rgba(92,184,138,0.3)" }
                          : s === "BEARISH" ? { bg: "rgba(224,92,92,0.12)", color: "#e05c5c", border: "rgba(224,92,92,0.3)" }
                          : { bg: "var(--bg3)", color: "var(--text3)", border: "var(--border)" };
                        return (
                          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, padding: "2px 6px", borderRadius: 4, background: sc.bg, color: sc.color, border: `0.5px solid ${sc.border}` }}>
                            {s}
                          </span>
                        );
                      })()}
                      {article.publisher && <span>{article.publisher}</span>}
                      {article.published && (
                        <span>
                          {(() => {
                            try {
                              const d = new Date(article.published);
                              if (!isNaN(d.getTime())) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                              const n = Number(article.published);
                              if (n > 1e9) return new Date(n * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                            } catch {}
                            return "";
                          })()}
                        </span>
                      )}
                      {article.url && (
                        <span style={{ color: "var(--text)", fontWeight: 500 }}>↗ Read</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.a>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
