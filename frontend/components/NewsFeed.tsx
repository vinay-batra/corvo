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

  // Vibrant palette for ticker badges (intentionally colorful)
  const palette = ["#c9a84c", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#10b981"];
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

      {loading ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "24px 0" }}>
          <div style={{ width: 18, height: 18, border: "1.5px solid var(--border)", borderTopColor: "var(--text)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 12, color: "var(--text3)" }}>Fetching latest news...</span>
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
                    <div style={{ display: "flex", gap: 10, fontSize: 10, color: "var(--text3)" }}>
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
