const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchPortfolio(assets: any[], period: string, benchmark = "^GSPC", userId = "", referralCode = "") {
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
  ].filter(Boolean).join("&");
  const res = await fetch(
    `${API_URL}/portfolio?tickers=${tickers}&weights=${weights}&period=${period}&benchmark=${encodeURIComponent(benchmark)}${extras ? "&" + extras : ""}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchDrawdown(assets: any[], period: string) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const res = await fetch(`${API_URL}/drawdown?tickers=${tickers}&weights=${weights}&period=${period}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCorrelation(assets: any[], period: string) {
  const tickers = assets.map(a => a.ticker).join(",");
  const res = await fetch(`${API_URL}/correlation?tickers=${tickers}&period=${period}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchMonteCarlo(assets: any[], period: string, years: number = 5) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const res = await fetch(
    `${API_URL}/montecarlo?tickers=${tickers}&weights=${weights}&period=${period}&simulations=8500&years=${years}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchNews(assets: any[]) {
  const tickers = assets.map(a => a.ticker).join(",");
  const res = await fetch(`${API_URL}/news?tickers=${tickers}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchMarketBrief(force = false) {
  const res = await fetch(`${API_URL}/market-brief${force ? "?force=true" : ""}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchMarketDriver() {
  const res = await fetch(`${API_URL}/market-driver`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchEarningsCalendar(assets: any[]) {
  const tickers = assets.map((a: any) => a.ticker).join(",");
  const res = await fetch(`${API_URL}/earnings-calendar?tickers=${tickers}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchEventsCalendar() {
  const res = await fetch(`${API_URL}/events-calendar`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchSectors(assets: any[]) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const res = await fetch(`${API_URL}/portfolio/sectors?tickers=${tickers}&weights=${weights}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function importPortfolioCsv(file: File): Promise<{ tickers: string[]; weights: number[]; detected_format: string; error?: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/portfolio/import-csv`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchDividends(assets: any[], portfolioValue = 10000) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const res = await fetch(
    `${API_URL}/portfolio/dividends?tickers=${tickers}&weights=${weights}&portfolio_value=${portfolioValue}`
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
    `${API_URL}/portfolio/tax-loss?tickers=${tickers}&weights=${weights}&purchase_prices=${purchasePrices}&portfolio_value=${portfolioValue}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAnalystTargets(ticker: string) {
  const res = await fetch(`${API_URL}/analyst-targets/${encodeURIComponent(ticker)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchEarningsPreview(assets: { ticker: string; weight: number }[]) {
  const total = assets.reduce((s, a) => s + a.weight, 0) || 1;
  const tickers = assets.map(a => a.ticker).join(",");
  const weights = assets.map(a => a.weight / total).join(",");
  const res = await fetch(`${API_URL}/earnings-preview?tickers=${tickers}&weights=${weights}`);
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
  const res = await fetch(`${API_URL}/portfolio/natural-language-edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, portfolio }),
  });
  return res.json();
}
