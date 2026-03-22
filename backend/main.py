from fastapi import FastAPI
import math

def sanitize(obj):
    """Recursively replace NaN/Inf with None for JSON compliance."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    return obj


from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import yfinance as yf

from data import get_data
from portfolio import (
    calculate_returns,
    portfolio_performance,
    cumulative_returns,
    max_drawdown,
)
from optimizer import optimize_portfolio
from chat import chat_with_claude, parse_portfolio_from_image

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PERIOD_MAP = {"6mo": "6mo", "1y": "1y", "2y": "2y", "5y": "5y"}

@app.get("/portfolio")
def portfolio(tickers: str = "AAPL,MSFT", weights: str = "", period: str = "1y", benchmark: str = "^GSPC"):
    tickers_list = [t.strip() for t in tickers.split(",")]
    yf_period = PERIOD_MAP.get(period, "1y")

    data = get_data(tickers_list, period=yf_period)
    returns = calculate_returns(data)

    if weights:
        raw = [float(w) for w in weights.split(",")]
        total = sum(raw)
        user_weights = np.array([w / total for w in raw])
    else:
        user_weights = None

    optimal_weights = optimize_portfolio(returns)
    active_weights = user_weights if user_weights is not None else optimal_weights

    portfolio_returns = portfolio_performance(returns, active_weights)
    growth = cumulative_returns(portfolio_returns)

    bench_ticker = benchmark if benchmark else "^GSPC"
    benchmark_data = get_data([bench_ticker], period=yf_period)
    benchmark_returns = calculate_returns(benchmark_data)
    benchmark_returns = benchmark_returns.reindex(portfolio_returns.index).dropna()
    benchmark_growth = cumulative_returns(benchmark_returns)

    _, max_dd = max_drawdown(growth)

    mean_returns = returns.mean()
    cov_matrix = returns.cov()
    frontier = []
    for _ in range(1000):
        w = np.random.random(len(tickers_list))
        w /= w.sum()
        ret = float(np.sum(mean_returns * w) * 252)
        vol = float(np.sqrt(np.dot(w.T, np.dot(cov_matrix * 252, w))))
        frontier.append({"return": ret, "volatility": vol})

    port_return = float(np.sum(mean_returns * active_weights) * 252)
    port_vol = float(np.sqrt(np.dot(active_weights.T, np.dot(cov_matrix * 252, active_weights))))

    n = 300
    return sanitize({
        "tickers": tickers_list,
        "weights": [float(w) for w in optimal_weights],
        "max_drawdown": float(max_dd),
        "growth": [float(x) for x in growth.tail(n).values],
        "benchmark": [float(x) for x in benchmark_growth.tail(n).values],
        "dates": [str(d) for d in growth.tail(n).index],
        "efficient_frontier": frontier,
        "portfolio_return": port_return,
        "portfolio_volatility": port_vol,
        "period": period,
        "benchmark_ticker": bench_ticker,
    })


class ChatRequest(BaseModel):
    message: str
    history: list = []
    portfolio_context: dict = {}

@app.post("/chat")
def chat(req: ChatRequest):
    reply = chat_with_claude(req.message, req.history, req.portfolio_context)
    return {"reply": reply}


@app.get("/validate-ticker")
def validate_ticker(ticker: str):
    """Check if a ticker is valid and return its name."""
    try:
        t = yf.Ticker(ticker.upper().strip())
        hist = t.history(period="5d")
        if hist.empty:
            return {"valid": False, "name": "", "ticker": ticker.upper()}
        info = t.fast_info
        name = getattr(info, 'company_name', None) or ""
        if not name:
            # Fallback: use longName from info dict
            try:
                name = t.info.get("longName", "") or t.info.get("shortName", "") or ticker.upper()
            except Exception:
                name = ticker.upper()
        return {"valid": True, "name": name, "ticker": ticker.upper()}
    except Exception:
        return {"valid": False, "name": "", "ticker": ticker.upper()}


class ImageRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"

@app.post("/parse-portfolio-image")
def parse_portfolio_image_endpoint(req: ImageRequest):
    """Parse a brokerage screenshot and return tickers + weights."""
    try:
        assets = parse_portfolio_from_image(req.image_base64, req.media_type)
        return {"assets": assets}
    except Exception as e:
        return {"assets": [], "error": str(e)}


@app.get("/drawdown")
def drawdown_series(tickers: str = "AAPL,MSFT", weights: str = "", period: str = "1y"):
    tickers_list = [t.strip() for t in tickers.split(",")]
    yf_period = PERIOD_MAP.get(period, "1y")
    data = get_data(tickers_list, period=yf_period)
    returns = calculate_returns(data)

    if weights:
        raw = [float(w) for w in weights.split(",")]
        total = sum(raw)
        active_weights = np.array([w / total for w in raw])
    else:
        active_weights = optimize_portfolio(returns)

    port_returns = portfolio_performance(returns, active_weights)
    growth = cumulative_returns(port_returns)
    drawdown, _ = max_drawdown(growth)

    n = 300
    return sanitize({
        "dates": [str(d) for d in drawdown.tail(n).index],
        "drawdown": [float(x) for x in drawdown.tail(n).values],
    }


@app.get("/correlation")
def correlation(tickers: str = "AAPL,MSFT", period: str = "1y"):
    tickers_list = [t.strip() for t in tickers.split(",")]
    yf_period = PERIOD_MAP.get(period, "1y")
    data = get_data(tickers_list, period=yf_period)
    returns = calculate_returns(data)
    corr = returns.corr()
    return {
        "tickers": tickers_list,
        "matrix": corr.values.tolist(),
    }


@app.get("/montecarlo")
def monte_carlo(tickers: str = "AAPL,MSFT", weights: str = "", period: str = "1y", simulations: int = 200, horizon: int = 252):
    tickers_list = [t.strip() for t in tickers.split(",")]
    yf_period = PERIOD_MAP.get(period, "1y")
    data = get_data(tickers_list, period=yf_period)
    returns = calculate_returns(data)

    if weights:
        raw = [float(w) for w in weights.split(",")]
        total = sum(raw)
        active_weights = np.array([w / total for w in raw])
    else:
        active_weights = optimize_portfolio(returns)

    port_returns = portfolio_performance(returns, active_weights)
    mu = float(port_returns.mean())
    sigma = float(port_returns.std())

    paths = []
    for _ in range(simulations):
        daily = np.random.normal(mu, sigma, horizon)
        path = list(np.cumprod(1 + daily))
        paths.append(path)

    paths_arr = np.array(paths)
    p5  = np.percentile(paths_arr, 5,  axis=0).tolist()
    p25 = np.percentile(paths_arr, 25, axis=0).tolist()
    p50 = np.percentile(paths_arr, 50, axis=0).tolist()
    p75 = np.percentile(paths_arr, 75, axis=0).tolist()
    p95 = np.percentile(paths_arr, 95, axis=0).tolist()

    sample_indices = np.random.choice(simulations, min(20, simulations), replace=False)
    sample_paths = paths_arr[sample_indices].tolist()

    return {
        "horizon": horizon,
        "simulations": simulations,
        "p5": p5, "p25": p25, "p50": p50, "p75": p75, "p95": p95,
        "sample_paths": sample_paths,
        "final_p5":  float(paths_arr[:, -1].min()),
        "final_p50": float(np.median(paths_arr[:, -1])),
        "final_p95": float(paths_arr[:, -1].max()),
    }


@app.get("/news")
def news(tickers: str = "AAPL"):
    tickers_list = [t.strip() for t in tickers.split(",")][:6]
    results = []
    for ticker in tickers_list:
        try:
            t = yf.Ticker(ticker)
            raw_news = t.news or []
            for item in raw_news[:3]:
                content = item.get("content", {})
                title = content.get("title", "") or item.get("title", "")
                summary = content.get("summary", "") or item.get("summary", "")
                provider = (content.get("provider", {}) or {}).get("displayName", "") or item.get("publisher", "")
                pub_date = content.get("pubDate", "") or str(item.get("providerPublishTime", ""))
                url = ""
                click_through = content.get("clickThroughUrl", {}) or {}
                if isinstance(click_through, dict):
                    url = click_through.get("url", "")
                if not url:
                    canonical = content.get("canonicalUrl", {}) or {}
                    if isinstance(canonical, dict):
                        url = canonical.get("url", "")
                if title:
                    results.append({
                        "ticker": ticker,
                        "title": title,
                        "summary": summary[:200] if summary else "",
                        "publisher": provider,
                        "url": url,
                        "published": pub_date,
                    })
        except Exception:
            pass
    return {"articles": results}


@app.get("/search-ticker")
async def search_ticker(q: str):
    """Live search across all Yahoo Finance tickers."""
    from search import search_tickers
    results = await search_tickers(q)
    return {"results": results}
