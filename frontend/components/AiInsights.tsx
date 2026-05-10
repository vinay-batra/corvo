"use client";

import { motion } from "framer-motion";

const C = { amber: "var(--accent)" };

function sanitize(text: string): string {
  return text.replace(/\*+/g, "").replace(/—/g, "-").replace(/_{1,2}([^_]+)_{1,2}/g, "$1").replace(/`([^`]+)`/g, "$1").trim();
}

function InsightRow({ text, delay, tag }: { text: string; delay: number; tag?: string }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: "0.5px solid var(--border)" }}
    >
      {tag && (
        <span style={{
          fontSize: 7, letterSpacing: 1.8, textTransform: "uppercase" as const,
          color: "var(--accent)", fontWeight: 700, flexShrink: 0, marginTop: 2,
          background: "rgba(201,168,76,0.08)", border: "0.5px solid rgba(201,168,76,0.2)",
          borderRadius: 4, padding: "2px 5px", whiteSpace: "nowrap" as const,
        }}>
          {tag}
        </span>
      )}
      <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.65, margin: 0, fontWeight: 400 }}>{text}</p>
    </motion.div>
  );
}

export default function AiInsights({ data, assets, period, onAskAi }: { data: any; assets: any[]; period?: string; onAskAi: () => void }) {
  const maxWeight = assets.length > 0 ? Math.max(...assets.map(a => a.weight)) : 0;
  const topAssets = assets.filter(a => Math.abs(a.weight - maxWeight) < 0.001);
  const top = topAssets[0] || { weight: 0 };

  const insights: { tag: string; text: string }[] = [];

  // Concentration
  if (topAssets.length > 1) {
    if (topAssets.length === assets.length) {
      insights.push({ tag: "Balance", text: sanitize(`All ${assets.length} holdings are equally weighted at ${(maxWeight * 100).toFixed(0)}% — your portfolio is evenly balanced.`) });
    } else {
      const tiedTickers = topAssets.map(a => a.ticker).join(" and ");
      insights.push({ tag: "Concentration", text: sanitize(`${tiedTickers} are tied as your largest holdings at ${(maxWeight * 100).toFixed(0)}% each — concentration is shared and looks reasonable.`) });
    }
  } else if (top && top.weight > 0.4) {
    insights.push({ tag: "Risk", text: sanitize(`${top.ticker} makes up ${(top.weight * 100).toFixed(0)}% of your portfolio. High single-asset concentration amplifies volatility — consider trimming to under 30%.`) });
  } else if (top && top.ticker) {
    insights.push({ tag: "Concentration", text: sanitize(`${top.ticker} is your largest position at ${(top.weight * 100).toFixed(0)}% — concentration looks manageable.`) });
  }

  // Volatility
  if (data.portfolio_volatility != null) {
    const vol = data.portfolio_volatility;
    const baseline = 0.15;
    if (vol > baseline * 1.5) {
      insights.push({ tag: "Volatility", text: sanitize(`Your portfolio volatility is ${(vol * 100).toFixed(1)}% — significantly above a typical balanced portfolio (15%). Expect larger day-to-day swings.`) });
    } else if (vol > baseline) {
      insights.push({ tag: "Volatility", text: sanitize(`Volatility sits at ${(vol * 100).toFixed(1)}% — slightly elevated versus a typical balanced portfolio (15%), but within a normal range for equity-heavy portfolios.`) });
    } else {
      insights.push({ tag: "Volatility", text: sanitize(`Your portfolio volatility is ${(vol * 100).toFixed(1)}% — lower than a typical balanced portfolio (15%). You are taking on less risk than average.`) });
    }
  }

  // Diversification
  if (assets.length <= 2) {
    insights.push({ tag: "Diversification", text: sanitize(`Only ${assets.length} holding${assets.length === 1 ? "" : "s"} — this is heavily concentrated. Consider adding broad ETFs to reduce single-name risk.`) });
  } else if (assets.length >= 4 && data.sector_concentration != null && data.sector_concentration > 0.7) {
    insights.push({ tag: "Sectors", text: sanitize(`High sector concentration at ${(data.sector_concentration * 100).toFixed(0)}% in one sector. A market rotation could disproportionately impact your portfolio.`) });
  } else if (assets.length >= 4) {
    insights.push({ tag: "Diversification", text: sanitize(`${assets.length} holdings across multiple positions. Review sector overlap to confirm you are not over-exposed to a single industry.`) });
  }

  // Rebalancing suggestions
  const equalW = 1 / assets.length;
  const totalW = assets.reduce((s, a) => s + a.weight, 0);
  const rebalanceSuggestions = assets
    .map(a => ({ ...a, normW: a.weight / totalW }))
    .filter(a => Math.abs(a.normW - equalW) > 0.05)
    .map(a => {
      const diff = a.normW - equalW;
      const action = diff > 0 ? "Trim" : "Add to";
      return sanitize(`${action} ${a.ticker} — currently ${(a.normW * 100).toFixed(0)}%, target ${(equalW * 100).toFixed(0)}%`);
    });

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* Insights */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {insights.map((ins, i) => (
          <InsightRow key={i} text={ins.text} tag={ins.tag} delay={i * 0.07} />
        ))}
      </div>

      {/* Rebalancing */}
      {rebalanceSuggestions.length > 0 && (
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{ marginTop: 14 }}
        >
          <span style={{ fontSize: 8, letterSpacing: 2, textTransform: "uppercase" as const, color: C.amber, fontWeight: 700, display: "block", marginBottom: 10 }}>
            Rebalancing
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rebalanceSuggestions.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8,
                background: i === 0 ? "rgba(201,168,76,0.07)" : "transparent",
                border: i === 0 ? "0.5px solid rgba(201,168,76,0.2)" : "0.5px solid var(--border)",
              }}>
                {i === 0 && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
                  </svg>
                )}
                <p style={{ fontSize: i === 0 ? 12.5 : 12, color: i === 0 ? "var(--text)" : "var(--text3)", fontWeight: i === 0 ? 500 : 400, margin: 0, lineHeight: 1.4 }}>{s}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={e => { e.preventDefault(); onAskAi(); }}
        style={{
          marginTop: 16, padding: "10px 14px",
          background: C.amber, border: "none", borderRadius: 8,
          color: "#0a0e14", fontSize: 12, fontWeight: 700,
          cursor: "pointer", letterSpacing: 0.3,
          transition: "opacity 0.15s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Ask AI for deeper analysis
      </button>
    </div>
  );
}
