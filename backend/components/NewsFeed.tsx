"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchNews } from "../lib/api";

export default function NewsFeed({ assets }: { assets: any[] }) {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assets.length) return;
    setLoading(true);
    fetchNews(assets)
      .then(d => setArticles(d.articles || []))
      .finally(() => setLoading(false));
  }, [assets]);

  const tickerColors: Record<string, string> = {};
  const palette = ["var(--green)", "var(--cyan)", "var(--purple)", "#ffaa00", "#ff4060"];
  assets.forEach((a, i) => { tickerColors[a.ticker] = palette[i % palette.length]; });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "22px 24px", position: "relative", overflow: "hidden", gridColumn: "span 2" }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--cyan), transparent)", opacity: 0.4 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase" }}>Market Intelligence · News Feed</p>
        <div style={{ display: "flex", gap: 6 }}>
          {assets.map(a => (
            <span key={a.ticker} style={{ fontSize: 9, fontFamily: "var(--font-display)", letterSpacing: 1, color: tickerColors[a.ticker], background: `${tickerColors[a.ticker]}18`, border: `1px solid ${tickerColors[a.ticker]}40`, padding: "2px 8px", borderRadius: 4 }}>
              {a.ticker}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center", height: 80 }}>
          <div style={{ width: 24, height: 24, border: "2px solid var(--border-mid)", borderTopColor: "var(--cyan)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2, textTransform: "uppercase" }}>Fetching latest news...</span>
        </div>
      ) : articles.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "32px 0" }}>No recent news found for selected tickers.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {articles.map((article, i) => (
            <motion.a
              key={i}
              href={article.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                display: "block",
                padding: "14px 16px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-dim)",
                borderRadius: 10,
                textDecoration: "none",
                cursor: article.url ? "pointer" : "default",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = `${tickerColors[article.ticker]}40`;
                (e.currentTarget as HTMLElement).style.background = `${tickerColors[article.ticker]}08`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-dim)";
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{
                  flexShrink: 0, fontSize: 8, fontFamily: "var(--font-display)", letterSpacing: 1,
                  color: tickerColors[article.ticker],
                  background: `${tickerColors[article.ticker]}18`,
                  border: `1px solid ${tickerColors[article.ticker]}40`,
                  padding: "3px 7px", borderRadius: 4, marginTop: 1,
                }}>
                  {article.ticker}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.5, marginBottom: 4 }}>{article.title}</p>
                  {article.summary && (
                    <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 6, opacity: 0.8 }}>{article.summary}</p>
                  )}
                  <div style={{ display: "flex", gap: 12, fontSize: 9, color: "var(--text-muted)", letterSpacing: 1 }}>
                    {article.publisher && <span>{article.publisher}</span>}
                    {article.published && (
                      <span>
                        {(() => {
                          try {
                            const d = new Date(article.published);
                            if (!isNaN(d.getTime())) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                            // unix timestamp
                            const n = Number(article.published);
                            if (n > 1e9) return new Date(n * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                          } catch {}
                          return "";
                        })()}
                      </span>
                    )}
                    {article.url && <span style={{ color: "var(--cyan-dim)" }}>↗ Read more</span>}
                  </div>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      )}
    </motion.div>
  );
}
