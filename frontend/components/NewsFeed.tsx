"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Accepts either tickers (string[]) or assets (object[]) for backwards compat
interface Props {
  tickers?: string[];
  assets?: { ticker: string; weight?: number }[];
}

export default function NewsFeed({ tickers: tickersProp, assets: assetsProp }: Props) {
  // Normalise to a simple string array
  const allTickers: string[] = tickersProp?.length
    ? tickersProp
    : (assetsProp || []).map(a => a.ticker);

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [articlesByTicker, setArticlesByTicker] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);

  const palette = ["#111110", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#10b981"];
  const tickerColor = (t: string) => palette[allTickers.indexOf(t) % palette.length];

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
                ? (tab === "ALL" ? "#111" : tickerColor(tab))
                : "rgba(0,0,0,0.1)",
              background: activeTab === tab
                ? (tab === "ALL" ? "#111" : `${tickerColor(tab)}15`)
                : "transparent",
              color: activeTab === tab
                ? (tab === "ALL" ? "#fff" : tickerColor(tab))
                : "#6b6b68",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {tab}
            {tab !== "ALL" && articlesByTicker[tab]?.length > 0 && (
              <span style={{
                marginLeft: 5,
                fontSize: 9,
                background: activeTab === tab ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)",
                color: activeTab === tab ? (tab === "ALL" ? "#fff" : tickerColor(tab)) : "#9b9b98",
                padding: "1px 5px",
                borderRadius: 10,
              }}>
                {articlesByTicker[tab].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "24px 0" }}>
          <div style={{ width: 18, height: 18, border: "1.5px solid rgba(0,0,0,0.1)", borderTopColor: "#111", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 12, color: "#9b9b98" }}>Fetching latest news...</span>
        </div>
      ) : articles.length === 0 ? (
        <p style={{ fontSize: 12, color: "#9b9b98", padding: "32px 0", textAlign: "center" }}>
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
                  background: "#fff",
                  border: "0.5px solid rgba(0,0,0,0.09)",
                  borderRadius: 10,
                  textDecoration: "none",
                  cursor: article.url ? "pointer" : "default",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={e => {
                  if (article.url) {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.2)";
                    (e.currentTarget as HTMLElement).style.background = "#f8f8f7";
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.09)";
                  (e.currentTarget as HTMLElement).style.background = "#fff";
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  {/* Ticker badge */}
                  <span style={{
                    flexShrink: 0,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    color: tickerColor(article.ticker),
                    background: `${tickerColor(article.ticker)}12`,
                    border: `0.5px solid ${tickerColor(article.ticker)}35`,
                    padding: "3px 7px",
                    borderRadius: 4,
                    marginTop: 1,
                  }}>
                    {article.ticker}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#111", lineHeight: 1.45, marginBottom: 3 }}>
                      {article.title}
                    </p>
                    {article.summary && (
                      <p style={{ fontSize: 11.5, color: "#6b6b68", lineHeight: 1.55, marginBottom: 5 }}>
                        {article.summary}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 10, fontSize: 10, color: "#9b9b98" }}>
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
                        <span style={{ color: "#111", fontWeight: 500 }}>↗ Read</span>
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
