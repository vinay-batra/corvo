"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import PortfolioBuilder from "../../components/PortfolioBuilder";

const TOTAL = 8;

const INVESTOR_TYPES = [
  { id: "beginner",      label: "Beginner investor",     desc: "New to investing" },
  { id: "active",        label: "Active trader",          desc: "Frequent buying and selling" },
  { id: "longterm",      label: "Long-term investor",     desc: "Buy and hold for years" },
  { id: "professional",  label: "Finance professional",   desc: "Work in finance" },
];

const GOALS = [
  { id: "track",       label: "Track my performance" },
  { id: "risk",        label: "Reduce portfolio risk" },
  { id: "learn",       label: "Learn investing" },
  { id: "taxes",       label: "Optimize for taxes" },
  { id: "wealth",      label: "Build long-term wealth" },
  { id: "retirement",  label: "Save for retirement" },
];

const AGE_RANGES = [
  { id: "under18", label: "Under 18" },
  { id: "18-24",   label: "18 to 24" },
  { id: "25-34",   label: "25 to 34" },
  { id: "35-44",   label: "35 to 44" },
  { id: "45-54",   label: "45 to 54" },
  { id: "55-64",   label: "55 to 64" },
  { id: "65+",     label: "65 or older" },
];

const INCOME_RANGES = [
  { id: "under30k",   label: "Under $30k" },
  { id: "30-60k",     label: "$30k to $60k" },
  { id: "60-100k",    label: "$60k to $100k" },
  { id: "100-200k",   label: "$100k to $200k" },
  { id: "200k+",      label: "$200k or more" },
  { id: "prefer_not", label: "Prefer not to say" },
];

const RISK_LEVELS = [
  { id: "conservative",   label: "Conservative",   desc: "Preserve capital, minimize losses" },
  { id: "moderate",       label: "Moderate",        desc: "Balance growth and stability" },
  { id: "aggressive",     label: "Aggressive",      desc: "Maximize growth, accept volatility" },
  { id: "very_aggressive", label: "Very Aggressive", desc: "High risk, high reward" },
];

const HORIZONS = [
  { id: "under1y", label: "Less than 1 year" },
  { id: "1-3y",    label: "1 to 3 years" },
  { id: "3-5y",    label: "3 to 5 years" },
  { id: "5-10y",   label: "5 to 10 years" },
  { id: "10y+",    label: "10 or more years" },
];

const REFERRAL_SOURCES = [
  { id: "twitter",  label: "Twitter / X" },
  { id: "friend",   label: "Friend or family" },
  { id: "google",   label: "Google search" },
  { id: "reddit",   label: "Reddit" },
  { id: "other",    label: "Other" },
];

const STEP_TITLES = [
  "What best describes you?",
  "What are your main goals?",
  "How old are you?",
  "What is your annual income?",
  "Build your first portfolio",
  "What is your risk tolerance?",
  "What is your investment horizon?",
  "How did you hear about Corvo?",
];

function SelectCard({
  label, desc, selected, onClick,
}: {
  label: string; desc?: string; selected: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected
          ? "rgba(var(--accent-rgb), 0.1)"
          : hovered ? "var(--bg3)" : "var(--bg2)",
        border: `1px solid ${selected ? "var(--accent)" : hovered ? "var(--border2)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: desc ? "14px 16px" : "12px 16px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 150ms",
      }}
    >
      <div style={{
        fontSize: 13, fontWeight: 500,
        color: selected ? "var(--accent)" : hovered ? "var(--text)" : "var(--text2)",
      }}>
        {label}
      </div>
      {desc && (
        <div style={{
          fontSize: 11, marginTop: 4,
          color: selected ? "var(--accent-text)" : "var(--text3)",
        }}>
          {desc}
        </div>
      )}
    </button>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReplay = searchParams.get("replay") === "true";

  const [authLoading, setAuthLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [completing, setCompleting] = useState(false);

  const [answers, setAnswers] = useState({
    investor_type: "",
    primary_goals: [] as string[],
    age_range: "",
    income_range: "",
    risk_tolerance: "",
    investment_horizon: "",
    referral_source: "",
  });

  const [assets, setAssets] = useState<{ ticker: string; weight: number; purchasePrice?: number }[]>([
    { ticker: "", weight: 0.05 },
  ]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth"); return; }

      // Replay mode: skip ALL redirect checks unconditionally, just pre-fill answers.
      if (isReplay) {
        const m = user.user_metadata || {};
        setAnswers({
          investor_type: m.investor_type || "",
          primary_goals: Array.isArray(m.primary_goals) ? m.primary_goals : [],
          age_range: m.age_range || "",
          income_range: m.income_range || "",
          risk_tolerance: m.risk_tolerance || "",
          investment_horizon: m.investment_horizon || "",
          referral_source: m.referral_source || "",
        });
        setAuthLoading(false);
        return;
      }

      // Fresh onboarding: redirect away if already completed.
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

  const canProceed = () => {
    if (step === 0) return answers.investor_type !== "";
    if (step === 1) return answers.primary_goals.length > 0;
    if (step === 2) return answers.age_range !== "";
    if (step === 3) return answers.income_range !== "";
    if (step === 4) return true;
    if (step === 5) return answers.risk_tolerance !== "";
    if (step === 6) return answers.investment_horizon !== "";
    if (step === 7) return answers.referral_source !== "";
    return false;
  };

  const navigate = (dir: "forward" | "back") => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setStep(s => s + (dir === "forward" ? 1 : -1));
    setTimeout(() => setAnimating(false), 260);
  };

  const handleNext = () => {
    if (animating) return;
    if (!canProceed() && step !== 4) return;
    if (step < TOTAL - 1) navigate("forward");
    else handleComplete();
  };

  const handleBack = () => {
    if (step > 0) navigate("back");
  };

  const toggleGoal = (id: string) => {
    setAnswers(prev => {
      const g = prev.primary_goals;
      return g.includes(id)
        ? { ...prev, primary_goals: g.filter(x => x !== id) }
        : g.length < 3 ? { ...prev, primary_goals: [...g, id] } : prev;
    });
  };

  const handleComplete = async () => {
    setCompleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth"); return; }

    await supabase.auth.updateUser({
      data: {
        investor_type: answers.investor_type,
        primary_goals: answers.primary_goals,
        age_range: answers.age_range,
        income_range: answers.income_range,
        risk_tolerance: answers.risk_tolerance,
        investment_horizon: answers.investment_horizon,
        referral_source: answers.referral_source,
        onboarding_complete: true,
      },
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

    const validAssets = assets.filter(a => a.ticker && a.weight > 0);
    if (validAssets.length > 0) {
      localStorage.setItem("corvo_onboarding_assets", JSON.stringify(validAssets));
    }
    if (!isReplay) {
      localStorage.setItem("corvo_just_onboarded", "true");
    }

    router.push("/app");
  };

  const renderSingleSelect = (
    field: keyof typeof answers,
    options: { id: string; label: string; desc?: string }[],
  ) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
      {options.map(opt => (
        <SelectCard
          key={opt.id}
          label={opt.label}
          desc={opt.desc}
          selected={(answers[field] as string) === opt.id}
          onClick={() => setAnswers(prev => ({ ...prev, [field]: opt.id }))}
        />
      ))}
    </div>
  );

  const renderMultiSelect = () => (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {GOALS.map(g => {
          const selected = answers.primary_goals.includes(g.id);
          const maxed = answers.primary_goals.length >= 3 && !selected;
          return (
            <SelectCard
              key={g.id}
              label={g.label}
              selected={selected}
              onClick={() => { if (!maxed) toggleGoal(g.id); }}
            />
          );
        })}
      </div>
      {answers.primary_goals.length > 0 && (
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 10, textAlign: "center" }}>
          {3 - answers.primary_goals.length} more selection{3 - answers.primary_goals.length !== 1 ? "s" : ""} allowed
        </p>
      )}
    </div>
  );

  const renderPortfolioBuilder = () => (
    <div>
      <div style={{ maxHeight: 340, overflowY: "auto", marginBottom: 16 }}>
        <PortfolioBuilder assets={assets} onAssetsChange={setAssets} loading={false} />
      </div>
      <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center" }}>
        You can add or edit holdings anytime from the dashboard.
      </p>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 0: return renderSingleSelect("investor_type", INVESTOR_TYPES);
      case 1: return renderMultiSelect();
      case 2: return renderSingleSelect("age_range", AGE_RANGES);
      case 3: return renderSingleSelect("income_range", INCOME_RANGES);
      case 4: return renderPortfolioBuilder();
      case 5: return renderSingleSelect("risk_tolerance", RISK_LEVELS);
      case 6: return renderSingleSelect("investment_horizon", HORIZONS);
      case 7: return renderSingleSelect("referral_source", REFERRAL_SOURCES);
      default: return null;
    }
  };

  const progress = ((step + 1) / TOTAL) * 100;
  const isLast = step === TOTAL - 1;
  const canGoNext = canProceed() || step === 4;

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes ob-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          border: "2px solid rgba(var(--accent-rgb), 0.2)",
          borderTopColor: "var(--accent)",
          animation: "ob-spin 0.8s linear infinite",
        }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", fontFamily: "var(--font-body)", color: "var(--text)" }}>
      <style>{`
        @keyframes ob-spin { to { transform: rotate(360deg); } }
        @keyframes ob-card-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ob-slide-fwd { from { opacity: 0; transform: translateX(36px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes ob-slide-back { from { opacity: 0; transform: translateX(-36px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes ob-fade-out { to { opacity: 0; pointer-events: none; } }
        .ob-step { animation: ob-card-in 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .ob-step-fwd { animation: ob-slide-fwd 0.28s ease both; }
        .ob-step-back { animation: ob-slide-back 0.28s ease both; }
        .ob-completing { animation: ob-fade-out 0.3s ease forwards; }
        @media (max-width: 600px) {
          .ob-main { padding: 16px !important; }
          .ob-card { padding: 24px 20px 22px !important; }
        }
      `}</style>

      {/* Progress bar — full width at top */}
      <div style={{ height: 3, background: "var(--bg3)", flexShrink: 0 }}>
        <div style={{
          height: "100%",
          background: "var(--accent)",
          width: `${progress}%`,
          transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)",
          borderRadius: "0 2px 2px 0",
        }} />
      </div>

      {/* Header */}
      <header style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <img src="/corvo-logo.svg" width={22} height={18} alt="Corvo" style={{ opacity: 0.85 }} />
        <span style={{ fontSize: 11, color: "var(--text3)", letterSpacing: 0.5, fontFamily: "var(--font-mono)" }}>
          {step + 1} / {TOTAL}
        </span>
      </header>

      {/* Main content */}
      <main
        className="ob-main"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "32px 24px 40px",
          overflowY: "auto",
        }}
      >
        <div
          className={`ob-card${completing ? " ob-completing" : ""}`}
          style={{
            width: "100%",
            maxWidth: 540,
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "30px 30px 28px",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {/* Step label */}
          <div style={{
            fontSize: 10, letterSpacing: "0.15em", color: "var(--accent)",
            textTransform: "uppercase", marginBottom: 10,
            fontFamily: "var(--font-mono)",
          }}>
            Step {step + 1} of {TOTAL}
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: 22, fontWeight: 600, color: "var(--text)",
            margin: "0 0 24px", lineHeight: 1.3, letterSpacing: "-0.3px",
          }}>
            {STEP_TITLES[step]}
          </h2>

          {/* Step content */}
          <div
            key={step}
            className={animating ? (direction === "forward" ? "ob-step-fwd" : "ob-step-back") : "ob-step"}
            style={{ marginBottom: 24 }}
          >
            {renderStepContent()}
          </div>

          {/* Footer: back / skip / next */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={handleBack}
              style={{
                fontSize: 12,
                color: step > 0 ? "var(--text3)" : "transparent",
                background: "none", border: "none",
                cursor: step > 0 ? "pointer" : "default",
                padding: 0, transition: "color 150ms",
                pointerEvents: step > 0 ? "auto" : "none",
              }}
              onMouseEnter={e => { if (step > 0) e.currentTarget.style.color = "var(--text2)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = step > 0 ? "var(--text3)" : "transparent"; }}
            >
              Back
            </button>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {step === 4 && (
                <button
                  onClick={handleNext}
                  style={{ fontSize: 12, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Skip this step
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canGoNext || completing}
                style={{
                  padding: "11px 26px",
                  background: canGoNext ? "var(--accent)" : "rgba(var(--accent-rgb), 0.12)",
                  border: "none",
                  borderRadius: "var(--radius)",
                  color: canGoNext ? "var(--bg)" : "var(--text3)",
                  fontSize: 13, fontWeight: 600,
                  cursor: canGoNext ? "pointer" : "not-allowed",
                  transition: "all 0.18s",
                  opacity: completing ? 0.6 : 1,
                  letterSpacing: 0.2,
                }}
              >
                {completing ? "..." : isLast ? "Finish" : "Next"}
              </button>
            </div>
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
        <style>{`@keyframes ob-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          border: "2px solid rgba(var(--accent-rgb), 0.2)",
          borderTopColor: "var(--accent)",
          animation: "ob-spin 0.8s linear infinite",
        }} />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
