"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchNews } from "../lib/api";

const C = {
  amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", amber3: "rgba(201,168,76,0.06)",
  border: "rgba(255,255,255,0.06)",
  cream: "#e8e0cc", cream2: "rgba(232,224,204,0.6)", cream3: "rgba(232,224,204,0.25)",
};

const TICKER_COLORS = [
  { text: "#c9a84c", bg: "rgba(201,168,76,0.1)",  border: "rgba(201,168,76,0.25)" },
  { text: "#e8c87a", bg: "rgba(232,200,122,0.1)", border: "rgba(232,200,122,0.25)" },
  { text: "#d4956a", bg: "rgba(212,149,106,0.1)", border: "rgba(212,149,106,0.25)" },
  { text: "#8ecfa8", bg: "rgba(142,207,168,0.1)", border: "rgba(142,207,168,0.25)" },
  { text: "#a0c4e8", bg: "rgba(160,196,232,0.1)", border: "rgba(160,196,232,0.25)" },
  { text: "#d4a8e0", bg: "rgba(212,168,224,0.1)", border: "rgba(212,168,224,0.25)" },
  { text: "#f0d090", bg: "rgba(240,208,144,0.1)", border: "rgba(240,208,144,0.25)" },
  { text: "#e08888", bg: "rgba(224,136,136,0.1)", border: "rgba(224,136,136,0.25)" },
];

function timeAgo(published: any): string {
  try {
    let ms: number;
    const n = Number(published);
    if (n > 1e9) ms = Date.now() - n * 1000;
    else ms = Date.now() - new Date(published).getTime();
    if (isNaN(ms)) return "";
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ""; }
}

function ArticleCard({ article, color, delay }: { article: any; color: typeof TICKER_COLORS[0]; delay: number }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.a
      href={article.url || "#"} target="_blank" rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "block", padding: "16px 18px", background: hov ? color.bg : "rgba(255,255,255,0.02)", border: `1px solid ${hov ? color.border : C.border}`, borderRadius: 12, textDecoration: "none", cursor: article.url ? "pointer" : "default", transition: "all 0.2s" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {article.ticker !== "MARKET" && (
          <span style={{ flexShrink: 0, fontSize: 9, fontFamily: "Space Mono,monospace", letterSpacing: 1.5, color: color.text, background: color.bg, border: `1px solid ${color.border}`, padding: "4px 8px", borderRadius: 5, marginTop: 2, fontWeight: 700 }}>
            {article.ticker}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: hov ? C.cream : C.cream2, fontWeight: 500, lineHeight: 1.55, marginBottom: 6, transition: "color 0.2s" }}>
            {article.title}
          </p>
          {article.summary && (
            <p style={{ fontSize: 12, color: C.cream3, lineHeight: 1.65, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>
              {article.summary}
            </p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {article.publisher && <span style={{ fontSize: 10, color: C.amber, fontWeight: 500 }}>{article.publisher}</span>}
            {article.published && <span style={{ fontSize: 10, color: C.cream3 }}>{timeAgo(article.published)}</span>}
            {article.url && (
              <span style={{ fontSize: 10, color: hov ? color.text : C.cream3, marginLeft: "auto", transition: "color 0.2s" }}>
                Read article ↗
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.a>
  );
}

function SectionHeader({ label, count, color, icon }: { label: string; count: number; color: string; icon?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 3, height: 18, background: color, borderRadius: 2, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, letterSpacing: 2, color: C.cream }}>{label}</h3>
          <span style={{ fontSize: 9, letterSpacing: 1, color, background: `${color}18`, border: `1px solid ${color}40`, padding: "2px 7px", borderRadius: 4 }}>
            {count} articles
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NewsFeed({ assets }: { assets: any[] }) {
  const [marketNews, setMarketNews] = useState<any[]>([]);
  const [sections, setSections] = useState<{ ticker: string; articles: any[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("market");

  const colorMap: Record<string, typeof TICKER_COLORS[0]> = {};
  assets.forEach((a, i) => { colorMap[a.ticker] = TICKER_COLORS[i % TICKER_COLORS.length]; });
  const marketColor = { text: C.amber, bg: C.amber3, border: "rgba(201,168,76,0.2)" };

  useEffect(() => {
    if (!assets.length) return;
    setLoading(true);
    fetchNews(assets).then((d: any) => {
      setMarketNews(d.market || []);
      setSections(d.sections || []);
    }).finally(() => setLoading(false));
  }, [assets]);

  const tabs = [
    { id: "market", label: "Market News", color: C.amber },
    ...assets.map(a => ({ id: a.ticker, label: a.ticker, color: colorMap[a.ticker]?.text ?? C.amber })),
  ];

  const currentSection = activeTab === "market"
    ? marketNews
    : sections.find(s => s.ticker === activeTab)?.articles ?? [];

  const currentColor = activeTab === "market" ? marketColor : (colorMap[activeTab] ?? TICKER_COLORS[0]);

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${active ? tab.color : C.border}`, background: active ? `${tab.color}15` : "transparent", color: active ? tab.color : C.cream3, fontSize: tab.id === "market" ? 12 : 11, fontFamily: tab.id === "market" ? "Inter,sans-serif" : "Space Mono,monospace", fontWeight: active ? 600 : 400, cursor: "pointer", letterSpacing: tab.id === "market" ? 0 : 1, transition: "all 0.15s" }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = `${tab.color}50`; e.currentTarget.style.color = tab.color; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.cream3; } }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "48px 0" }}>
          <div style={{ width: 20, height: 20, border: "1.5px solid rgba(201,168,76,0.2)", borderTopColor: C.amber, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 11, color: C.cream3, letterSpacing: 2, textTransform: "uppercase" }}>Fetching latest news...</span>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {/* Section header */}
            <SectionHeader
              label={activeTab === "market" ? "Today's Market News" : activeTab}
              count={currentSection.length}
              color={currentColor.text}
            />

            {/* Description */}
            <p style={{ fontSize: 12, color: C.cream3, lineHeight: 1.7, marginBottom: 16 }}>
              {activeTab === "market"
                ? "General market news from major indices and ETFs — what's moving the market today."
                : `Latest news and analysis specifically about ${activeTab}.`}
            </p>

            {/* Articles */}
            {currentSection.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <p style={{ fontSize: 14, color: C.cream3, marginBottom: 6 }}>No recent news found</p>
                <p style={{ fontSize: 12, color: "rgba(232,224,204,0.2)" }}>Check back later for updates</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {currentSection.map((article, i) => (
                  <ArticleCard key={i} article={article} color={currentColor} delay={i * 0.03} />
                ))}
              </div>
            )}

            {currentSection.length > 0 && (
              <p style={{ fontSize: 10, color: "rgba(232,224,204,0.15)", textAlign: "center", marginTop: 20 }}>
                News sourced from Yahoo Finance · Click any article to read in full
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}
