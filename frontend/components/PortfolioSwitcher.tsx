"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  type AccountTypeId,
  getAccountType,
  DEFAULT_ACCOUNT_TYPE,
  isAccountTypeId,
} from "../lib/accountType";

interface Asset { ticker: string; weight: number; }
interface Portfolio {
  id: string;
  name: string;
  assets: Asset[];
  accountType: AccountTypeId;
}

const LS_KEY = "corvo_saved_portfolios";

function fromDb(row: any): Portfolio {
  const tickers: string[] = row.tickers ?? [];
  const weights: number[] = row.weights ?? [];
  return {
    id: row.id,
    name: row.name,
    assets: tickers.map((t, i) => ({ ticker: t, weight: weights[i] ?? 0 })),
    accountType: isAccountTypeId(row.account_type) ? row.account_type : DEFAULT_ACCOUNT_TYPE,
  };
}

function loadLocal(): Portfolio[] {
  try {
    if (typeof window === "undefined") return [];
    const r = localStorage.getItem(LS_KEY);
    if (!r) return [];
    const parsed = JSON.parse(r);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p: any) => ({
      id: p.id,
      name: p.name,
      assets: p.assets ?? [],
      accountType: isAccountTypeId(p.accountType) ? p.accountType : DEFAULT_ACCOUNT_TYPE,
    }));
  } catch { return []; }
}

// Inline horizontal chip row that lets multi-account users flip between
// their saved portfolios without going through the sidebar SavedPortfolios
// list. Each chip surfaces the portfolio name + a small account-type badge
// (ROTH IRA / HSA / 529 / etc), so the user always knows which tax wrapper
// the current view + AI advice are scoped to. Hidden entirely when the user
// has 0 or 1 saved portfolios - the switcher is only valuable for the
// multi-account case.
export default function PortfolioSwitcher({
  activeAssets,
  onLoad,
}: {
  activeAssets: Asset[];
  onLoad: (assets: Asset[], accountType: AccountTypeId) => void;
}) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchPortfolios = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const u = authData.user ?? null;
        if (cancelled) return;
        if (u) {
          const { data: remote, error } = await supabase
            .from("portfolios")
            .select("*")
            .eq("user_id", u.id)
            .order("created_at", { ascending: false });
          if (!error && remote && !cancelled) {
            setPortfolios(remote.map(fromDb));
            return;
          }
        }
        if (!cancelled) setPortfolios(loadLocal());
      } catch {
        if (!cancelled) setPortfolios(loadLocal());
      }
    };
    fetchPortfolios();
    const onSaved = () => fetchPortfolios();
    window.addEventListener("corvo:portfolio-saved", onSaved);
    return () => {
      cancelled = true;
      window.removeEventListener("corvo:portfolio-saved", onSaved);
    };
  }, []);

  if (portfolios.length <= 1) return null;

  // Identify which saved portfolio (if any) matches the active assets, so we
  // can highlight it as the current view. Match on ticker set only - weights
  // may have drifted from a user edit but it's still "the same portfolio".
  const activeKey = activeAssets.map(a => a.ticker).sort().join(",");
  const activeId = portfolios.find(p =>
    p.assets.map(a => a.ticker).sort().join(",") === activeKey
  )?.id;

  return (
    <div
      className="corvo-portfolio-switcher"
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        overflowY: "hidden",
        paddingBottom: 4,
        marginBottom: 18,
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}
    >
      <style>{`.corvo-portfolio-switcher::-webkit-scrollbar { display: none; }`}</style>
      <span style={{
        fontSize: 9,
        letterSpacing: 1.8,
        color: "var(--text3)",
        textTransform: "uppercase",
        fontWeight: 700,
        fontFamily: "Space Mono, monospace",
        alignSelf: "center",
        flexShrink: 0,
        paddingRight: 4,
      }}>Account</span>
      {portfolios.map(p => {
        const isActive = p.id === activeId;
        const meta = getAccountType(p.accountType);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onLoad(p.assets, p.accountType)}
            title={`${p.name} - ${meta.label}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 13px",
              borderRadius: 9,
              border: isActive ? "1px solid rgba(201,168,76,0.6)" : "0.5px solid var(--border)",
              background: isActive ? "rgba(201,168,76,0.08)" : "var(--bg2)",
              color: "var(--text)",
              cursor: "pointer",
              flexShrink: 0,
              transition: "border-color 0.15s, background 0.15s, transform 0.15s",
              boxShadow: isActive ? "0 0 12px rgba(201,168,76,0.18)" : "none",
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.background = "var(--bg3)";
                e.currentTarget.style.borderColor = "rgba(184,134,11,0.3)";
              }
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.background = "var(--bg2)";
                e.currentTarget.style.borderColor = "var(--border)";
              }
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: isActive ? "var(--accent)" : "var(--text)",
              letterSpacing: -0.1,
              whiteSpace: "nowrap",
            }}>{p.name}</span>
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: "var(--accent)",
              background: "rgba(201,168,76,0.1)",
              border: "0.5px solid rgba(201,168,76,0.25)",
              borderRadius: 4,
              padding: "1px 5px",
              flexShrink: 0,
            }}>{meta.short}</span>
          </button>
        );
      })}
    </div>
  );
}
