import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) {
  if (process.env.NODE_ENV === "production") {
    // In production we should never silently fall back to localhost; surface
    // the misconfig immediately so deploys fail loud instead of hitting a
    // dead localhost from the user's browser.
    throw new Error("NEXT_PUBLIC_API_URL must be set in production");
  } else {
    console.warn("NEXT_PUBLIC_API_URL not set, falling back to http://localhost:8000");
  }
}
export const RESOLVED_API_URL = API_URL || "http://localhost:8000";

// Read the current Supabase session's access token (if any). Returns "" when
// unauthenticated so callers can skip the Authorization header.
export async function getAuthToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? "";
  } catch {
    return "";
  }
}

// Build standard headers with optional bearer token.
export async function authHeaders(extra: Record<string, string> = {}): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: Record<string, string> = { ...extra };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function fetchPortfolio(assets: any[], period: string, benchmark = "^GSPC", userId = "", referralCode = "", reinvestDividends = true) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  // Collect manual returns for cash/money market tickers
  const manualReturns = normalized.map(a => a.manualReturn != null ? a.manualReturn : "").join(",");
  const hasManual = normalized.some(a => a.manualReturn != null);
  const extras = [
    userId ? `user_id=${encodeURIComponent(userId)}` : "",
    referralCode ? `referral_code=${encodeURIComponent(referralCode)}` : "",
    hasManual ? `manual_returns=${encodeURIComponent(manualReturns)}` : "",
    !reinvestDividends ? `reinvest_dividends=false` : "",
  ].filter(Boolean).join("&");
  const res = await fetch(
    `${RESOLVED_API_URL}/portfolio?tickers=${tickers}&weights=${weights}&period=${period}&benchmark=${encodeURIComponent(benchmark)}${extras ? "&" + extras : ""}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchDrawdown(assets: any[], period: string) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const res = await fetch(`${RESOLVED_API_URL}/drawdown?tickers=${tickers}&weights=${weights}&period=${period}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCorrelation(assets: any[], period: string) {
  const tickers = assets.map(a => a.ticker).join(",");
  const res = await fetch(`${RESOLVED_API_URL}/correlation?tickers=${tickers}&period=${period}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchMonteCarlo(assets: any[], period: string, years: number = 5) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const res = await fetch(
    `${RESOLVED_API_URL}/montecarlo?tickers=${tickers}&weights=${weights}&period=${period}&simulations=8500&years=${years}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchNews(assets: any[]) {
  const tickers = assets.map(a => a.ticker).join(",");
  const res = await fetch(`${RESOLVED_API_URL}/news?tickers=${tickers}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchMarketBrief(force = false) {
  const res = await fetch(`${RESOLVED_API_URL}/market-brief${force ? "?force=true" : ""}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchMarketDriver() {
  const res = await fetch(`${RESOLVED_API_URL}/market-driver`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchEarningsCalendar(assets: any[]) {
  const tickers = assets.map((a: any) => a.ticker).join(",");
  const res = await fetch(`${RESOLVED_API_URL}/earnings-calendar?tickers=${tickers}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchEventsCalendar() {
  const res = await fetch(`${RESOLVED_API_URL}/events-calendar`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchSectors(assets: any[]) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const res = await fetch(`${RESOLVED_API_URL}/portfolio/sectors?tickers=${tickers}&weights=${weights}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function importPortfolioCsv(file: File): Promise<{ tickers: string[]; weights: number[]; detected_format: string; error?: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${RESOLVED_API_URL}/portfolio/import-csv`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchDividends(assets: any[], portfolioValue = 10000) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const res = await fetch(
    `${RESOLVED_API_URL}/portfolio/dividends?tickers=${tickers}&weights=${weights}&portfolio_value=${portfolioValue}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchTaxLoss(assets: any[], portfolioValue = 10000) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const purchasePrices = normalized.map(a => a.purchasePrice != null ? a.purchasePrice : "").join(",");
  const res = await fetch(
    `${RESOLVED_API_URL}/portfolio/tax-loss?tickers=${tickers}&weights=${weights}&purchase_prices=${purchasePrices}&portfolio_value=${portfolioValue}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCapitalGains(assets: any[], portfolioValue = 10000, ltcgRate = 15, stcgRate = 22) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const costBasis = normalized.map(a => a.purchasePrice != null ? a.purchasePrice : "").join(",");
  const purchaseDates = normalized.map(a => a.purchaseDate ?? "").join(",");
  const params = new URLSearchParams({
    tickers,
    weights,
    cost_basis: costBasis,
    purchase_dates: purchaseDates,
    portfolio_value: String(portfolioValue),
    ltcg_rate: String(ltcgRate),
    stcg_rate: String(stcgRate),
  });
  const res = await fetch(`${RESOLVED_API_URL}/portfolio/capital-gains?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchDividendCalendar(assets: any[], portfolioValue = 10000) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const params = new URLSearchParams({ tickers, weights, portfolio_value: String(portfolioValue) });
  const res = await fetch(`${RESOLVED_API_URL}/portfolio/dividend-calendar?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAnalystTargets(ticker: string) {
  const res = await fetch(`${RESOLVED_API_URL}/analyst-targets/${encodeURIComponent(ticker)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchEarningsTranscript(ticker: string) {
  const res = await fetch(`${RESOLVED_API_URL}/earnings/transcript/${encodeURIComponent(ticker)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchEarningsPreview(assets: { ticker: string; weight: number }[]) {
  const total = assets.reduce((s, a) => s + a.weight, 0) || 1;
  const tickers = assets.map(a => a.ticker).join(",");
  const weights = assets.map(a => a.weight / total).join(",");
  const res = await fetch(`${RESOLVED_API_URL}/earnings-preview?tickers=${tickers}&weights=${weights}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface NLEditResult {
  mode: "apply" | "preview";
  tickers: string[];
  weights: number[];
  before_tickers: string[];
  before_weights: number[];
  explanation: string;
  impact_summary: string;
  impact: {
    concentration_before: number;
    concentration_after: number;
    holdings_before: number;
    holdings_after: number;
  };
}

export async function fetchNaturalLanguageEdit(
  command: string,
  portfolio: { ticker: string; weight: number }[]
): Promise<NLEditResult | { error: string }> {
  const res = await fetch(`${RESOLVED_API_URL}/portfolio/natural-language-edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, portfolio }),
  });
  return res.json();
}

// Daily Signal

export interface DailySignalImpact {
  primary: string;
  secondary: string;
  freed_capital: string | null;
}

export interface DailySignal {
  category: "Risk Alert" | "Rebalance" | "Tax Opportunity" | "Earnings Watch" | "Benchmark Lag" | "Protect Gains" | "Diversify" | "Strong Hold";
  headline: string;
  rationale: string;
  impact: DailySignalImpact;
  confidence: "High" | "Medium" | "Low";
  confidence_reason: string;
  action_steps: string[];
  urgency: "Today" | "This Week" | "This Month";
  generated_at: string;
}

export async function fetchDailySignal(params: {
  tickers: string[];
  weights: number[];
  portfolio_value: number;
  annualized_return: number;
  portfolio_volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
  health_score: number;
  period?: string;
  user_id?: string;
}): Promise<DailySignal> {
  const res = await fetch(`${RESOLVED_API_URL}/portfolio/daily-signal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || `HTTP ${res.status}`);
  }
  return res.json();
}
