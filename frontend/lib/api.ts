const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchPortfolio(assets: any[], period: string, benchmark = "^GSPC") {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const res = await fetch(
    `${API_URL}/portfolio?tickers=${tickers}&weights=${weights}&period=${period}&benchmark=${encodeURIComponent(benchmark)}`
  );
  return res.json();
}

export async function fetchDrawdown(assets: any[], period: string) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const res = await fetch(`${API_URL}/drawdown?tickers=${tickers}&weights=${weights}&period=${period}`);
  return res.json();
}

export async function fetchCorrelation(assets: any[], period: string) {
  const tickers = assets.map(a => a.ticker).join(",");
  const res = await fetch(`${API_URL}/correlation?tickers=${tickers}&period=${period}`);
  return res.json();
}

export async function fetchMonteCarlo(assets: any[], period: string) {
  const total = assets.reduce((sum, a) => sum + a.weight, 0);
  const normalized = assets.map(a => ({ ...a, weight: a.weight / total }));
  const tickers = normalized.map(a => a.ticker).join(",");
  const weights = normalized.map(a => a.weight).join(",");
  const res = await fetch(
    `${API_URL}/montecarlo?tickers=${tickers}&weights=${weights}&period=${period}&simulations=300&horizon=252`
  );
  return res.json();
}

export async function fetchNews(assets: any[]) {
  const tickers = assets.map(a => a.ticker).join(",");
  const res = await fetch(`${API_URL}/news?tickers=${tickers}`);
  return res.json();
}
