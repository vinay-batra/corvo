"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { fetchPortfolio } from "../../lib/api";

type Stage = "pick" | "loading" | "reveal";

interface PresetAsset { ticker: string; weight: number; }
interface Preset {
  id: string;
  name: string;
  tagline: string;
  risk: string;
  riskColor: string;
  assets: PresetAsset[];
  icon: React.ReactNode;
}

const PRESETS: Preset[] = [
  {
    id: "tech-growth",
    name: "Tech Growth",
    tagline: "High-conviction bets on the AI era",
    risk: "Aggressive",
    riskColor: "#e05c5c",
    assets: [
      { ticker: "NVDA", weight: 0.25 },
      { ticker: "AAPL", weight: 0.20 },
      { ticker: "MSFT", weight: 0.20 },
      { ticker: "GOOGL", weight: 0.20 },
      { ticker: "META", weight: 0.15 },
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2L13.5 8H20L14.5 12L16.5 18.5L11 14.5L5.5 18.5L7.5 12L2 8H8.5L11 2Z"
          stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round" fill="rgba(201,168,76,0.12)" />
      </svg>
    ),
  },
  {
    id: "index-core",
    name: "Index Core",
    tagline: "Own the entire market, low cost",
    risk: "Moderate",
    riskColor: "#5c8ee0",
    assets: [
      { ticker: "VTI", weight: 0.60 },
      { ticker: "VXUS", weight: 0.30 },
      { ticker: "BND", weight: 0.10 },
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="9" stroke="var(--accent)" strokeWidth="1.4" fill="rgba(201,168,76,0.08)" />
        <path d="M11 5v12M5 11h12" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="11" cy="11" r="3" fill="rgba(201,168,76,0.25)" />
      </svg>
    ),
  },
  {
    id: "dividend-income",
    name: "Dividend Income",
    tagline: "Steady income from quality holdings",
    risk: "Conservative",
    riskColor: "#5cb87a",
    assets: [
      { ticker: "VIG", weight: 0.40 },
      { ticker: "SCHD", weight: 0.40 },
      { ticker: "O", weight: 0.20 },
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="8" width="16" height="11" rx="2" stroke="var(--accent)" strokeWidth="1.4" fill="rgba(201,168,76,0.08)" />
        <path d="M7 8V6a4 4 0 0 1 8 0v2" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="11" cy="13" r="2" fill="var(--accent)" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: "balanced",
    name: "Balanced",
    tagline: "Growth with a safety net underneath",
    risk: "Moderate",
    riskColor: "#5c8ee0",
    assets: [
      { ticker: "SPY", weight: 0.50 },
      { ticker: "AGG", weight: 0.30 },
      { ticker: "GLD", weight: 0.20 },
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 15L8 9l4 4 4-5 3 3" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M3 15L8 9l4 4 4-5 3 3V18H3V15Z" fill="rgba(201,168,76,0.10)" />
      </svg>
    ),
  },
];

interface Verdict {
  observation: string;
  meaning: string;
  action: string;
}

function generateVerdict(data: any, presetName: string): Verdict {
  const sharpe = data?.sharpe_ratio ?? 0;
  const cagr = (data?.annualized_return ?? 0) * 100;
  const maxDD = Math.abs((data?.max_drawdown ?? 0) * 100);
  const volatility = (data?.portfolio_volatility ?? 0) * 100;

  // Top holding detection
  const holdings: any[] = data?.holdings ?? data?.individual_metrics ?? [];
  const topHolding = holdings.length > 0
    ? holdings.reduce((a: any, b: any) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a))
    : null;
  const topTicker: string = topHolding?.ticker ?? "";
  const topWeight: number = (topHolding?.weight ?? 0) * 100;

  // Top sector detection
  const sectors: Record<string, number> = data?.sector_weights ?? {};
  const sectorEntries = Object.entries(sectors).sort((a, b) => b[1] - a[1]);
  const topSector = sectorEntries[0];
  const topSectorName: string = topSector ? topSector[0] : "";
  const topSectorWeight: number = topSector ? topSector[1] * 100 : 0;

  let observation: string;
  let meaning: string;
  let action: string;

  if (sharpe > 1.5) {
    observation = `This ${presetName} portfolio has delivered exceptional risk-adjusted returns. A Sharpe ratio of ${sharpe.toFixed(2)} means you are getting a lot of return for the risk you are taking, and the ${cagr.toFixed(1)}% annualized return has significantly outpaced most benchmarks.`;
  } else if (sharpe > 0.8) {
    observation = `This ${presetName} portfolio has earned ${cagr.toFixed(1)}% annually with a Sharpe ratio of ${sharpe.toFixed(2)}. That puts it in solid territory for long-term investors who want real growth without excessive risk.`;
  } else {
    observation = `This ${presetName} portfolio has returned ${cagr.toFixed(1)}% annually. The Sharpe ratio of ${sharpe.toFixed(2)} tells me the returns come with notable volatility, which is worth understanding before you hold it.`;
  }

  if (topWeight > 35 && topTicker) {
    meaning = `Your biggest risk right now is concentration. ${topTicker} makes up ${topWeight.toFixed(0)}% of the portfolio. A 20% drop in ${topTicker} alone would pull your entire portfolio down ${(topWeight * 0.2).toFixed(0)}%. That is a lot of exposure to a single name.`;
  } else if (topSectorWeight > 60 && topSectorName) {
    meaning = `With ${topSectorWeight.toFixed(0)}% in ${topSectorName}, this portfolio is heavily tied to one sector. When that sector rotates out of favor, the hit to your returns is amplified compared to a more diversified mix.`;
  } else if (maxDD > 30) {
    meaning = `At its worst, this portfolio has pulled back ${maxDD.toFixed(0)}% from its peak. That is the real cost of strong long-term returns. You need to be mentally prepared to hold through drawdowns like that, or they will shake you out at the worst time.`;
  } else {
    meaning = `With ${volatility.toFixed(1)}% annualized volatility and a max drawdown of ${maxDD.toFixed(0)}%, this portfolio manages risk well relative to the returns it generates. That balance is hard to find.`;
  }

  if (topWeight > 40 && topTicker) {
    action = `Consider trimming ${topTicker} toward a 20 to 25% target and rotating the freed capital into something uncorrelated. I will show you exactly how to model this rebalance in the dashboard.`;
  } else if (maxDD > 35) {
    action = `A 10 to 15% allocation to bonds or gold would meaningfully cut your drawdown risk with minimal impact on long-term returns. I can model the exact tradeoff for you inside the dashboard.`;
  } else {
    action = `This is a well-structured starting point. Once you are inside, I will track it daily and surface an alert the moment something needs your attention, whether that is an earnings surprise, a rebalance trigger, or a tax opportunity.`;
  }

  return { observation, meaning, action };
}

function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals);
}

function LoadingOrb() {
  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 24,
    }}>
      <style>{`
        @keyframes ob2-pulse { 0%,100%{transform:scale(1);opacity:0.7} 50%{transform:scale(1.18);opacity:1} }
        @keyframes ob2-ring { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes ob2-fade-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ob2-dot { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }
      `}</style>
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "rgba(201,168,76,0.12)",
          animation: "ob2-pulse 2s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", inset: 4, borderRadius: "50%",
          border: "1.5px solid transparent",
          borderTopColor: "var(--accent)",
          borderRightColor: "rgba(201,168,76,0.3)",
          animation: "ob2-ring 1.1s linear infinite",
        }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
            <path d="M1 17C1 17 3.5 9 11 9C18.5 9 21 17 21 17" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="11" cy="5" r="4" stroke="var(--accent)" strokeWidth="1.6" fill="rgba(201,168,76,0.15)" />
          </svg>
        </div>
      </div>
      <div style={{ textAlign: "center", animation: "ob2-fade-in 0.5s ease both" }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>
          Corvo is analyzing your portfolio
        </p>
        <p style={{ fontSize: 12, color: "var(--text3)", margin: 0 }}>
          Running risk models, sector analysis, and AI evaluation
        </p>
        <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 16 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "var(--accent)",
              animation: `ob2-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricChip({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? "rgba(201,168,76,0.08)" : "var(--bg2)",
      border: `1px solid ${highlight ? "rgba(201,168,76,0.3)" : "var(--border)"}`,
      borderRadius: "var(--radius)",
      padding: "12px 14px",
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5, fontFamily: "var(--font-mono)" }}>
        {label}
      </div>
      <div style={{
        fontSize: 18, fontWeight: 700, color: highlight ? "var(--accent)" : "var(--text)",
        fontFamily: "Space Mono, monospace", lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReplay = searchParams.get("replay") === "true";

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [stage, setStage] = useState<Stage>("pick");
  const [selected, setSelected] = useState<string | null>(null);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadStartRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth"); return; }
      setUserId(user.id);

      if (isReplay) { setAuthLoading(false); return; }

      if (user.user_metadata?.onboarding_complete === true) {
        router.replace("/app"); return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();
      if (profile?.onboarding_completed === true) {
        router.replace("/app"); return;
      }
      if (!profile) {
        await supabase.from("profiles").upsert({
          id: user.id,
          onboarding_completed: false,
          updated_at: new Date().toISOString(),
        });
        if (user.app_metadata?.provider && user.app_metadata.provider !== "email") {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || null;
          fetch(`${apiUrl}/send-welcome-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email, display_name: displayName, user_id: user.id }),
          }).catch(() => {});
        }
      }
      setAuthLoading(false);
    })();
  }, [router, isReplay]);

  const handleAnalyze = async () => {
    if (!selected) return;
    const preset = PRESETS.find(p => p.id === selected);
    if (!preset) return;

    setStage("loading");
    setError(null);
    loadStartRef.current = Date.now();

    try {
      const data = await fetchPortfolio(preset.assets, "1y", "^GSPC", userId);
      // Enforce a minimum 1.8s loading time so the animation feels real
      const elapsed = Date.now() - loadStartRef.current;
      if (elapsed < 1800) {
        await new Promise(r => setTimeout(r, 1800 - elapsed));
      }
      setPortfolioData(data);
      setVerdict(generateVerdict(data, preset.name));
      setStage("reveal");
    } catch {
      // Show reveal with partial data on error
      setPortfolioData(null);
      setVerdict(generateVerdict({}, preset.name));
      setStage("reveal");
    }
  };

  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);

    const preset = PRESETS.find(p => p.id === selected);
    const assets = preset?.assets ?? [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth"); return; }

    await supabase.auth.updateUser({
      data: { onboarding_complete: true },
    });

    await supabase.from("profiles").upsert({
      id: user.id,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    });

    try {
      const { data: xpRow } = await supabase.from("profiles").select("xp").eq("id", user.id).single();
      await supabase.from("profiles").upsert({
        id: user.id,
        xp: (xpRow?.xp || 0) + 100,
        updated_at: new Date().toISOString(),
      });
    } catch {}

    if (assets.length > 0) {
      localStorage.setItem("corvo_onboarding_assets", JSON.stringify(assets));
    }
    if (!isReplay) {
      localStorage.setItem("corvo_just_onboarded", "true");
    }

    router.push("/app?tour=true");
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes ob2-ring-sm { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          border: "2px solid rgba(var(--accent-rgb), 0.2)",
          borderTopColor: "var(--accent)",
          animation: "ob2-ring-sm 0.8s linear infinite",
        }} />
      </div>
    );
  }

  if (stage === "loading") return <LoadingOrb />;

  // ── PICK SCREEN ──────────────────────────────────────────────────────────────
  if (stage === "pick") {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        display: "flex", flexDirection: "column",
        fontFamily: "var(--font-body)", color: "var(--text)",
      }}>
        <style>{`
          @keyframes ob2-fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
          .ob2-preset-card { transition: border-color 150ms, background 150ms, transform 120ms; cursor: pointer; }
          .ob2-preset-card:hover { transform: translateY(-2px); }
          .ob2-cta-btn { transition: opacity 150ms, transform 100ms; }
          .ob2-cta-btn:hover:not(:disabled) { opacity: 0.88; transform: scale(0.98); }
          @media (max-width: 768px) {
            .ob2-preset-grid { grid-template-columns: 1fr 1fr !important; }
            .ob2-main { padding: 20px 16px 32px !important; }
            .ob2-header-title { font-size: 22px !important; }
            .ob2-header-sub { font-size: 13px !important; }
          }
          @media (max-width: 480px) {
            .ob2-preset-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {/* Header bar */}
        <header style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <img src="/corvo-logo.svg" width={22} height={18} alt="Corvo" style={{ opacity: 0.85 }} />
            <span style={{ fontFamily: "Space Mono,monospace", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "var(--text)" }}>CORVO</span>
          </Link>
        </header>

        <main className="ob2-main" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 48px" }}>
          {/* Headline */}
          <div style={{ textAlign: "center", maxWidth: 520, marginBottom: 40, animation: "ob2-fade-up 0.4s ease both" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)",
              borderRadius: 20, padding: "4px 12px", marginBottom: 18,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="var(--accent)" strokeWidth="1.2" fill="rgba(201,168,76,0.2)" />
                <path d="M6 3v3l2 1.5" stroke="var(--accent)" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 11, color: "var(--accent)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
                60-SECOND SETUP
              </span>
            </div>
            <h1 className="ob2-header-title" style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", margin: "0 0 12px", lineHeight: 1.25, letterSpacing: "-0.5px" }}>
              Pick a portfolio and Corvo will analyze it instantly
            </h1>
            <p className="ob2-header-sub" style={{ fontSize: 14, color: "var(--text2)", margin: 0, lineHeight: 1.6 }}>
              Corvo's AI will tell you your risk level, your biggest opportunity, and exactly what to watch out for.
            </p>
          </div>

          {/* Preset grid */}
          <div
            className="ob2-preset-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              width: "100%",
              maxWidth: 780,
              marginBottom: 28,
            }}
          >
            {PRESETS.map((preset, i) => {
              const isSelected = selected === preset.id;
              return (
                <button
                  key={preset.id}
                  className="ob2-preset-card"
                  onClick={() => setSelected(preset.id)}
                  style={{
                    background: isSelected ? "rgba(201,168,76,0.07)" : "var(--card-bg)",
                    border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "var(--radius-lg)",
                    padding: "18px 16px",
                    textAlign: "left",
                    position: "relative",
                    outline: "none",
                    animation: `ob2-fade-up 0.4s ease ${0.1 + i * 0.07}s both`,
                  }}
                >
                  {isSelected && (
                    <div style={{
                      position: "absolute", top: 10, right: 10,
                      width: 16, height: 16, borderRadius: "50%",
                      background: "var(--accent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4l2 2 3-3" stroke="var(--bg)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}

                  {/* Icon */}
                  <div style={{ marginBottom: 12 }}>{preset.icon}</div>

                  {/* Name */}
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: "var(--text)",
                    marginBottom: 5, letterSpacing: "-0.2px",
                  }}>
                    {preset.name}
                  </div>

                  {/* Tagline */}
                  <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.45, marginBottom: 12 }}>
                    {preset.tagline}
                  </div>

                  {/* Tickers */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    {preset.assets.map(a => (
                      <span key={a.ticker} style={{
                        fontSize: 10, fontFamily: "Space Mono, monospace",
                        color: "var(--text2)", background: "var(--bg3)",
                        border: "1px solid var(--border)", borderRadius: 4,
                        padding: "2px 6px",
                      }}>
                        {a.ticker}
                      </span>
                    ))}
                  </div>

                  {/* Risk badge */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 10, fontFamily: "var(--font-mono)",
                    color: preset.riskColor,
                    background: `${preset.riskColor}18`,
                    border: `1px solid ${preset.riskColor}40`,
                    borderRadius: 10, padding: "2px 8px",
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: preset.riskColor, display: "inline-block" }} />
                    {preset.risk}
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, animation: "ob2-fade-up 0.4s ease 0.35s both" }}>
            <button
              className="ob2-cta-btn"
              onClick={handleAnalyze}
              disabled={!selected}
              style={{
                padding: "13px 36px",
                background: selected ? "var(--accent)" : "rgba(var(--accent-rgb),0.12)",
                border: "none", borderRadius: "var(--radius)",
                color: selected ? "var(--bg)" : "var(--text3)",
                fontSize: 14, fontWeight: 700,
                cursor: selected ? "pointer" : "not-allowed",
                letterSpacing: 0.3,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              Analyze with Corvo
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <Link
              href="/app"
              style={{ fontSize: 12, color: "var(--text3)", textDecoration: "none" }}
              onClick={() => localStorage.setItem("corvo_just_onboarded", "true")}
            >
              Skip and build my own portfolio in the app
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── REVEAL SCREEN ────────────────────────────────────────────────────────────
  const preset = PRESETS.find(p => p.id === selected);
  const data = portfolioData;
  const sharpe = data?.sharpe_ratio ?? 0;
  const cagr = (data?.annualized_return ?? 0) * 100;
  const maxDD = Math.abs((data?.max_drawdown ?? 0) * 100);
  const healthScore = data?.health_score ?? null;
  const healthGrade = data?.health_grade ?? null;
  const volatility = (data?.portfolio_volatility ?? 0) * 100;

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-body)", color: "var(--text)",
    }}>
      <style>{`
        @keyframes ob2-fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ob2-scale-in { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        @keyframes ob2-verdict-in { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .ob2-cta-btn { transition: opacity 150ms, transform 100ms; }
        .ob2-cta-btn:hover:not(:disabled) { opacity: 0.88; transform: scale(0.98); }
        @media (max-width: 768px) {
          .ob2-metrics-row { flex-wrap: wrap !important; }
          .ob2-metrics-row > * { min-width: calc(50% - 5px) !important; flex: none !important; }
          .ob2-reveal-main { padding: 20px 16px 40px !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <img src="/corvo-logo.svg" width={22} height={18} alt="Corvo" style={{ opacity: 0.85 }} />
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "var(--text)" }}>CORVO</span>
        </Link>
        {preset && (
          <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
            {preset.name.toUpperCase()}
          </span>
        )}
      </header>

      <main className="ob2-reveal-main" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 24px 48px" }}>
        <div style={{ width: "100%", maxWidth: 640 }}>

          {/* Headline */}
          <div style={{ marginBottom: 28, animation: "ob2-fade-up 0.4s ease both" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12,
              background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)",
              borderRadius: 20, padding: "3px 10px",
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="4.5" fill="var(--accent)" />
              </svg>
              <span style={{ fontSize: 10, color: "var(--accent)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
                ANALYSIS COMPLETE
              </span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", margin: "0 0 8px", lineHeight: 1.3, letterSpacing: "-0.4px" }}>
              Here is what Corvo found
            </h2>
            <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>
              Based on the last 12 months of real market data
            </p>
          </div>

          {/* Metrics row */}
          {data && (
            <div className="ob2-metrics-row" style={{
              display: "flex", gap: 10, marginBottom: 20,
              animation: "ob2-scale-in 0.4s ease 0.1s both",
            }}>
              {healthScore !== null && (
                <MetricChip
                  label="Health Score"
                  value={healthGrade ? `${healthGrade}` : `${Math.round(healthScore)}`}
                  sub={healthGrade ? `${Math.round(healthScore)} / 100` : "out of 100"}
                  highlight
                />
              )}
              <MetricChip
                label="Sharpe Ratio"
                value={fmt(sharpe)}
                sub="risk-adjusted return"
              />
              <MetricChip
                label="Annual Return"
                value={`${cagr >= 0 ? "+" : ""}${fmt(cagr, 1)}%`}
                sub="last 12 months"
              />
              <MetricChip
                label="Max Drawdown"
                value={`-${fmt(maxDD, 1)}%`}
                sub="worst peak-to-trough"
              />
            </div>
          )}

          {/* Corvo Verdict — the star of the show */}
          {verdict && (
            <div style={{
              background: "var(--card-bg)",
              border: "1px solid rgba(201,168,76,0.25)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              marginBottom: 24,
              animation: "ob2-verdict-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both",
            }}>
              {/* Corvo header bar */}
              <div style={{
                padding: "14px 20px",
                background: "rgba(201,168,76,0.06)",
                borderBottom: "1px solid rgba(201,168,76,0.15)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: "rgba(201,168,76,0.12)",
                  border: "1px solid rgba(201,168,76,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <img src="/corvo-logo.svg" width={14} height={12} alt="" style={{ opacity: 0.9 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>Corvo</div>
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>AI Portfolio Advisor</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5cb87a" }} />
                  <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>LIVE ANALYSIS</span>
                </div>
              </div>

              {/* Verdict body */}
              <div style={{ padding: "20px" }}>
                {/* What I see */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: "var(--accent)",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    fontFamily: "var(--font-mono)", marginBottom: 8,
                  }}>
                    What I see
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, margin: 0 }}>
                    {verdict.observation}
                  </p>
                </div>

                <div style={{ height: 1, background: "var(--border)", marginBottom: 18 }} />

                {/* Why it matters */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: "var(--accent)",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    fontFamily: "var(--font-mono)", marginBottom: 8,
                  }}>
                    Why it matters
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, margin: 0 }}>
                    {verdict.meaning}
                  </p>
                </div>

                <div style={{ height: 1, background: "var(--border)", marginBottom: 18 }} />

                {/* What to consider */}
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: "var(--accent)",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    fontFamily: "var(--font-mono)", marginBottom: 8,
                  }}>
                    What to consider
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, margin: 0 }}>
                    {verdict.action}
                  </p>
                </div>

                {/* AI disclaimer */}
                <div style={{
                  marginTop: 16, padding: "10px 12px",
                  background: "var(--bg2)", borderRadius: "var(--radius)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="6" cy="6" r="5.5" stroke="var(--text3)" strokeWidth="1" />
                    <path d="M6 5.5v3M6 3.5v.5" stroke="var(--text3)" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.4 }}>
                    This analysis uses real market data and Corvo's AI models. It is educational, not financial advice.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
            animation: "ob2-fade-up 0.4s ease 0.35s both",
          }}>
            <button
              className="ob2-cta-btn"
              onClick={handleComplete}
              disabled={completing}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "var(--accent)",
                border: "none", borderRadius: "var(--radius)",
                color: "var(--bg)", fontSize: 14, fontWeight: 700,
                cursor: completing ? "not-allowed" : "pointer",
                opacity: completing ? 0.7 : 1,
                letterSpacing: 0.3,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {completing ? "Opening your dashboard..." : "Open my dashboard"}
              {!completing && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <button
              onClick={() => { setStage("pick"); setPortfolioData(null); setVerdict(null); }}
              style={{
                background: "none", border: "none",
                fontSize: 12, color: "var(--text3)", cursor: "pointer", padding: 0,
              }}
            >
              Choose a different portfolio
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes ob2-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          border: "2px solid rgba(var(--accent-rgb), 0.2)",
          borderTopColor: "var(--accent)",
          animation: "ob2-spin 0.8s linear infinite",
        }} />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
